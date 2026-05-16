import { createClient } from "@supabase/supabase-js";
import type {
  NotificationFrequency,
  NotificationQueueItem,
  EnqueueParams,
  ProcessResult,
} from "./types";

/**
 * Creates a Supabase client with service-role privileges for queue operations.
 */
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Checks if a notification can be sent now based on the client's subscription
 * frequency settings. Returns true if the notification is allowed, false if it
 * should be queued for the next delivery window.
 */
export async function checkFrequencyAllowance(
  clientId: string,
  notificationTypeId: string,
  firmId: string
): Promise<boolean> {
  const supabase = getServiceClient();

  // Look up the client's subscription for this notification type
  const { data: subscription, error } = await supabase
    .from("client_notification_subscriptions")
    .select("frequency, last_delivered_at, is_active")
    .eq("client_id", clientId)
    .eq("notification_type_id", notificationTypeId)
    .eq("firm_id", firmId)
    .single();

  // If no subscription exists or it's inactive, don't allow
  if (error || !subscription || !subscription.is_active) {
    return false;
  }

  const { frequency, last_delivered_at } = subscription;

  // If never delivered before, allow immediately
  if (!last_delivered_at) {
    return true;
  }

  const lastDelivered = new Date(last_delivered_at);
  const now = new Date();

  switch (frequency as NotificationFrequency) {
    case "daily": {
      // Allow if last_delivered_at is before today (UTC)
      const todayStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      );
      return lastDelivered < todayStart;
    }
    case "weekly": {
      // Allow if last_delivered_at is before this week's Monday (UTC)
      const dayOfWeek = now.getUTCDay();
      // Monday = 1, so days since Monday: (dayOfWeek + 6) % 7
      const daysSinceMonday = (dayOfWeek + 6) % 7;
      const mondayStart = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - daysSinceMonday
        )
      );
      return lastDelivered < mondayStart;
    }
    case "monthly": {
      // Allow if last_delivered_at is before this month's start (UTC)
      const monthStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
      );
      return lastDelivered < monthStart;
    }
    default:
      return false;
  }
}

/**
 * Adds a notification to the queue with status 'pending'.
 * Returns the created queue item.
 */
export async function addToQueue(
  params: EnqueueParams
): Promise<NotificationQueueItem> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("notification_queue")
    .insert({
      notification_log_id: params.notification_log_id || null,
      client_id: params.client_id,
      firm_id: params.firm_id,
      notification_type_id: params.notification_type_id,
      scheduled_for: params.scheduled_for,
      status: "pending",
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to add to queue: ${error?.message ?? "Unknown error"}`);
  }

  return data as NotificationQueueItem;
}

/**
 * Pure function that calculates the next delivery window based on frequency.
 * - daily: next day at 9:00 AM UTC
 * - weekly: next Monday at 9:00 AM UTC
 * - monthly: 1st of next month at 9:00 AM UTC
 * If lastDelivered is null, returns now (immediate delivery).
 */
export function getNextDeliveryWindow(
  frequency: NotificationFrequency,
  lastDelivered: Date | null
): Date {
  if (!lastDelivered) {
    return new Date();
  }

  const now = new Date();

  switch (frequency) {
    case "daily": {
      // Next day at 9:00 AM UTC
      const nextDay = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 9, 0, 0)
      );
      return nextDay;
    }
    case "weekly": {
      // Next Monday at 9:00 AM UTC
      const dayOfWeek = now.getUTCDay();
      // Days until next Monday: if today is Monday (1), next Monday is 7 days away
      const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
      const nextMonday = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() + daysUntilMonday,
          9,
          0,
          0
        )
      );
      return nextMonday;
    }
    case "monthly": {
      // 1st of next month at 9:00 AM UTC
      const nextMonth = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 9, 0, 0)
      );
      return nextMonth;
    }
    default:
      return new Date();
  }
}

/**
 * Processes all pending queue items where scheduled_for <= now().
 * Updates their status to 'processing', groups by client_id,
 * marks items as 'completed', and returns a ProcessResult with counts.
 * Handles errors gracefully: if one item fails, continues with others.
 */
export async function processQueueBatch(): Promise<ProcessResult> {
  const supabase = getServiceClient();
  const now = new Date().toISOString();

  const result: ProcessResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  // Fetch all pending queue items where scheduled_for <= now
  const { data: pendingItems, error: fetchError } = await supabase
    .from("notification_queue")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", now);

  if (fetchError || !pendingItems || pendingItems.length === 0) {
    return result;
  }

  result.processed = pendingItems.length;

  // Update all fetched items to 'processing'
  const itemIds = pendingItems.map((item) => item.id);
  await supabase
    .from("notification_queue")
    .update({ status: "processing" })
    .in("id", itemIds);

  // Group by client_id
  const groupedByClient: Record<string, typeof pendingItems> = {};
  for (const item of pendingItems) {
    if (!groupedByClient[item.client_id]) {
      groupedByClient[item.client_id] = [];
    }
    groupedByClient[item.client_id].push(item);
  }

  // Process each group
  for (const [, clientItems] of Object.entries(groupedByClient)) {
    for (const item of clientItems) {
      try {
        // Mark item as completed (actual sending is done by the service layer)
        const { error: updateError } = await supabase
          .from("notification_queue")
          .update({ status: "completed" })
          .eq("id", item.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        result.succeeded++;
      } catch (err) {
        result.failed++;
        result.errors.push({
          queue_item_id: item.id,
          error: err instanceof Error ? err.message : "Unknown error",
        });

        // Mark the failed item back or as cancelled so it doesn't block
        await supabase
          .from("notification_queue")
          .update({ status: "pending" })
          .eq("id", item.id);
      }
    }
  }

  return result;
}
