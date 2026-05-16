import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { createNotificationLog } from "@/lib/notifications/logger";
import { getNextDeliveryWindow } from "@/lib/notifications/scheduler";
import type { NotificationFrequency } from "@/lib/notifications/types";

export const dynamic = "force-dynamic";

const MAX_RETRY_ATTEMPTS = 3;

/**
 * Creates a Supabase client with service-role privileges.
 */
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Creates a Resend client for sending emails.
 */
function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  return new Resend(apiKey);
}

/**
 * Sends an email via Resend.
 */
async function sendEmail(params: {
  to: string;
  subject: string;
  content: string;
}): Promise<string> {
  const resend = getResend();

  const { data, error } = await resend.emails.send({
    from: "PracticeNudge <noreply@practicenudge.com>",
    to: [params.to],
    subject: params.subject,
    text: params.content,
  });

  if (error) {
    throw new Error(error.message || "Failed to send email");
  }

  return data?.id ?? "";
}

/**
 * GET /api/cron/notifications
 *
 * Cron endpoint for processing the notification queue.
 * 1. Verifies cron secret
 * 2. Fetches pending queue items where scheduled_for <= now() and status = 'pending'
 * 3. Updates their status to 'processing'
 * 4. Groups items by client_id
 * 5. For each group: fetches client email/phone, sends notifications, creates logs
 * 6. Updates subscription last_delivered_at after successful delivery
 * 7. Handles errors with retry logic (max 3 attempts)
 */
export async function GET(request: Request) {
  // 1. Verify cron secret (same pattern as reminders cron)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const now = new Date();

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  try {
    // 2. Fetch all pending queue items where scheduled_for <= now()
    const { data: pendingItems, error: fetchError } = await supabase
      .from("notification_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", now.toISOString());

    if (fetchError) {
      console.error("Failed to fetch pending queue items:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch queue items" },
        { status: 500 }
      );
    }

    if (!pendingItems || pendingItems.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        succeeded: 0,
        failed: 0,
        timestamp: now.toISOString(),
      });
    }

    processed = pendingItems.length;

    // 3. Update their status to 'processing'
    const itemIds = pendingItems.map((item) => item.id);
    await supabase
      .from("notification_queue")
      .update({ status: "processing" })
      .in("id", itemIds);

    // 4. Group items by client_id
    const groupedByClient: Record<string, typeof pendingItems> = {};
    for (const item of pendingItems) {
      if (!groupedByClient[item.client_id]) {
        groupedByClient[item.client_id] = [];
      }
      groupedByClient[item.client_id].push(item);
    }

    // 5. For each group of items
    for (const [clientId, clientItems] of Object.entries(groupedByClient)) {
      // 5a. Fetch the client's email/phone from the clients table
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id, name, email, phone")
        .eq("id", clientId)
        .single();

      if (clientError || !client) {
        // If client not found, mark all items for this client as cancelled
        console.error(`Client not found: ${clientId}`, clientError);
        for (const item of clientItems) {
          await supabase
            .from("notification_queue")
            .update({ status: "cancelled" })
            .eq("id", item.id);
          failed++;
        }
        continue;
      }

      // Track which notification_type_ids had successful deliveries
      const succeededTypeIds: Set<string> = new Set();

      // 5b. For each queue item in the group
      for (const item of clientItems) {
        try {
          // Fetch the associated notification_log (if notification_log_id exists)
          let existingLog = null;
          if (item.notification_log_id) {
            const { data: logData } = await supabase
              .from("notification_logs")
              .select("*")
              .eq("id", item.notification_log_id)
              .single();
            existingLog = logData;
          }

          // Determine recipient address and content
          const recipientAddress =
            existingLog?.recipient_address || client.email || "";
          const subject =
            existingLog?.subject || "Notification from PracticeNudge";
          const content = existingLog?.full_content || "";

          if (!recipientAddress) {
            throw new Error(
              `No recipient address available for client ${clientId}`
            );
          }

          // Send the notification (email via Resend)
          await sendEmail({
            to: recipientAddress,
            subject,
            content,
          });

          // Create a new notification_log entry with status 'sent'
          await createNotificationLog({
            firm_id: item.firm_id,
            client_id: item.client_id,
            notification_type_id: item.notification_type_id,
            channel: "email",
            recipient_address: recipientAddress,
            subject,
            content_preview: content.substring(0, 200) || undefined,
            full_content: content || undefined,
            status: "sent",
            metadata: {
              queue_item_id: item.id,
              batch_processed_at: now.toISOString(),
            },
          });

          // If there was an existing log in 'queued' status, update it to 'sent'
          if (existingLog && existingLog.status === "queued") {
            await supabase
              .from("notification_logs")
              .update({
                status: "sent",
                sent_at: now.toISOString(),
              })
              .eq("id", existingLog.id);
          }

          // Mark the queue item as 'completed'
          await supabase
            .from("notification_queue")
            .update({ status: "completed" })
            .eq("id", item.id);

          succeededTypeIds.add(item.notification_type_id);
          succeeded++;
        } catch (err) {
          // 6. Error handling
          const errorMessage =
            err instanceof Error ? err.message : "Unknown error";
          console.error(
            `Failed to process queue item ${item.id}:`,
            errorMessage
          );

          // Track retry count in metadata
          const currentMetadata = (item.metadata as Record<string, unknown>) || {};
          const retryCount =
            typeof currentMetadata.retry_count === "number"
              ? currentMetadata.retry_count
              : 0;

          if (retryCount + 1 >= MAX_RETRY_ATTEMPTS) {
            // After 3 attempts, mark as 'cancelled'
            await supabase
              .from("notification_queue")
              .update({
                status: "cancelled",
                metadata: {
                  ...currentMetadata,
                  retry_count: retryCount + 1,
                  last_failure: errorMessage,
                  cancelled_at: now.toISOString(),
                },
              })
              .eq("id", item.id);

            // Create a notification_log entry with status 'failed'
            await createNotificationLog({
              firm_id: item.firm_id,
              client_id: item.client_id,
              notification_type_id: item.notification_type_id,
              channel: "email",
              recipient_address: client.email || "",
              status: "failed",
              metadata: {
                queue_item_id: item.id,
                failure_reason: errorMessage,
                retry_count: retryCount + 1,
              },
            });
          } else {
            // Re-queue for retry: calculate next delivery window
            const { data: subscription } = await supabase
              .from("client_notification_subscriptions")
              .select("frequency, last_delivered_at")
              .eq("client_id", item.client_id)
              .eq("notification_type_id", item.notification_type_id)
              .eq("firm_id", item.firm_id)
              .single();

            const frequency = (subscription?.frequency ||
              "daily") as NotificationFrequency;
            const lastDelivered = subscription?.last_delivered_at
              ? new Date(subscription.last_delivered_at)
              : null;

            const nextWindow = getNextDeliveryWindow(frequency, lastDelivered);

            // Mark as 'pending' again with updated retry count and new scheduled_for
            await supabase
              .from("notification_queue")
              .update({
                status: "pending",
                scheduled_for: nextWindow.toISOString(),
                metadata: {
                  ...currentMetadata,
                  retry_count: retryCount + 1,
                  last_failure: errorMessage,
                  last_failed_at: now.toISOString(),
                },
              })
              .eq("id", item.id);
          }

          failed++;
          // Continue processing remaining items (don't stop the batch)
        }
      }

      // 5c. After successful delivery, update the client's subscription last_delivered_at
      // Only update for notification types that had at least one successful delivery
      for (const typeId of Array.from(succeededTypeIds)) {
        await supabase
          .from("client_notification_subscriptions")
          .update({ last_delivered_at: now.toISOString() })
          .eq("client_id", clientId)
          .eq("notification_type_id", typeId);
      }
    }
  } catch (err) {
    console.error("Unexpected error in notification cron:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        timestamp: now.toISOString(),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    processed,
    succeeded,
    failed,
    timestamp: now.toISOString(),
  });
}
