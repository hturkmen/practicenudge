import { createClient } from "@supabase/supabase-js";
import type {
  NotificationLog,
  NotificationStatus,
  CreateLogParams,
} from "./types";

/**
 * Creates a Supabase client with service role key for server-side operations.
 * This bypasses RLS to allow the notification service to write logs directly.
 */
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Creates a new notification log entry in the database.
 *
 * @param params - The parameters for the log entry
 * @returns The created NotificationLog record
 * @throws Error if the insert fails
 */
export async function createNotificationLog(
  params: CreateLogParams
): Promise<NotificationLog> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("notification_logs")
    .insert({
      firm_id: params.firm_id,
      client_id: params.client_id,
      notification_type_id: params.notification_type_id,
      channel: params.channel,
      recipient_address: params.recipient_address,
      subject: params.subject ?? null,
      content_preview: params.content_preview ?? null,
      full_content: params.full_content ?? null,
      triggered_by: params.triggered_by ?? null,
      status: params.status,
      metadata: params.metadata ?? {},
      scheduled_at: params.scheduled_at ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create notification log: ${error.message}`);
  }

  return data as NotificationLog;
}

/**
 * Updates the status of an existing notification log.
 *
 * - If status is 'delivered', sets delivered_at to now()
 * - If status is 'sent', sets sent_at to now()
 * - If status is 'failed', sets failure_reason from metadata
 *
 * @param logId - The ID of the notification log to update
 * @param status - The new status
 * @param metadata - Optional metadata (failure_reason, delivered_at, sent_at)
 * @throws Error if the update fails
 */
export async function updateNotificationStatus(
  logId: string,
  status: NotificationStatus,
  metadata?: {
    failure_reason?: string;
    delivered_at?: string;
    sent_at?: string;
  }
): Promise<void> {
  const supabase = getServiceClient();

  const updateData: Record<string, unknown> = { status };

  if (status === "delivered") {
    updateData.delivered_at = metadata?.delivered_at ?? new Date().toISOString();
  }

  if (status === "sent") {
    updateData.sent_at = metadata?.sent_at ?? new Date().toISOString();
  }

  if (status === "failed" && metadata?.failure_reason) {
    updateData.failure_reason = metadata.failure_reason;
  }

  const { error } = await supabase
    .from("notification_logs")
    .update(updateData)
    .eq("id", logId);

  if (error) {
    throw new Error(
      `Failed to update notification log status: ${error.message}`
    );
  }
}

/**
 * Fetches a single notification log by ID.
 *
 * @param logId - The ID of the notification log to fetch
 * @returns The NotificationLog record, or null if not found
 */
export async function getNotificationLog(
  logId: string
): Promise<NotificationLog | null> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("notification_logs")
    .select()
    .eq("id", logId)
    .single();

  if (error) {
    // PGRST116 = "No rows found" — treat as not found
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to fetch notification log: ${error.message}`);
  }

  return data as NotificationLog;
}
