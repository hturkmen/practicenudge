import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import {
  createNotificationLog,
  updateNotificationStatus,
  getNotificationLog,
} from "./logger";
import {
  checkFrequencyAllowance,
  addToQueue,
  getNextDeliveryWindow,
} from "./scheduler";
import type {
  SendNotificationParams,
  NotificationLog,
  TriggerParams,
  EditUpdates,
  NotificationFrequency,
} from "./types";

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
 * Creates a Supabase client with service-role privileges.
 */
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Sends an email via Resend.
 * Returns the Resend message ID on success, or throws on failure.
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
 * Sends a notification through the appropriate channel.
 *
 * Flow:
 * 1. Creates a notification log with status 'queued'
 * 2. Checks frequency allowance via scheduler
 * 3. If allowed: sends the notification (email via Resend), updates status to 'sent'
 * 4. If not allowed: adds to queue with next delivery window, keeps status 'queued'
 * 5. On send failure: updates status to 'failed' with reason
 *
 * @param params - The notification parameters
 * @returns The notification log entry
 */
export async function sendNotification(
  params: SendNotificationParams
): Promise<NotificationLog> {
  // 1. Create notification log with status 'queued'
  const log = await createNotificationLog({
    firm_id: params.firm_id,
    client_id: params.client_id,
    notification_type_id: params.notification_type_id,
    channel: params.channel,
    recipient_address: params.recipient_address,
    subject: params.subject,
    content_preview: params.content
      ? params.content.substring(0, 200)
      : undefined,
    full_content: params.content,
    triggered_by: params.triggered_by,
    status: "queued",
    metadata: params.metadata ?? {},
  });

  // 2. Check frequency allowance
  const isAllowed = await checkFrequencyAllowance(
    params.client_id,
    params.notification_type_id,
    params.firm_id
  );

  if (!isAllowed) {
    // Get subscription info for next delivery window calculation
    const supabase = getServiceClient();
    const { data: subscription } = await supabase
      .from("client_notification_subscriptions")
      .select("frequency, last_delivered_at")
      .eq("client_id", params.client_id)
      .eq("notification_type_id", params.notification_type_id)
      .eq("firm_id", params.firm_id)
      .single();

    const frequency = (subscription?.frequency ?? "daily") as NotificationFrequency;
    const lastDelivered = subscription?.last_delivered_at
      ? new Date(subscription.last_delivered_at)
      : null;

    const nextWindow = getNextDeliveryWindow(frequency, lastDelivered);

    // Add to queue with next delivery window
    await addToQueue({
      notification_log_id: log.id,
      client_id: params.client_id,
      firm_id: params.firm_id,
      notification_type_id: params.notification_type_id,
      scheduled_for: nextWindow.toISOString(),
    });

    // Status remains 'queued'
    return log;
  }

  // 3. Frequency allows sending — attempt to send
  try {
    if (params.channel === "email") {
      await sendEmail({
        to: params.recipient_address,
        subject: params.subject ?? "Notification from PracticeNudge",
        content: params.content ?? "",
      });

      // Update status to 'sent'
      await updateNotificationStatus(log.id, "sent", {
        sent_at: new Date().toISOString(),
      });

      // Return updated log
      const updatedLog = await getNotificationLog(log.id);
      return updatedLog ?? { ...log, status: "sent", sent_at: new Date().toISOString() };
    }

    // SMS channel placeholder — for now, mark as failed with unsupported reason
    await updateNotificationStatus(log.id, "failed", {
      failure_reason: "SMS channel is not yet supported",
    });

    const failedLog = await getNotificationLog(log.id);
    return failedLog ?? { ...log, status: "failed", failure_reason: "SMS channel is not yet supported" };
  } catch (error) {
    // On send failure: update status to 'failed' with reason
    const reason = error instanceof Error ? error.message : "Unknown send error";
    await updateNotificationStatus(log.id, "failed", {
      failure_reason: reason,
    });

    const failedLog = await getNotificationLog(log.id);
    return failedLog ?? { ...log, status: "failed", failure_reason: reason };
  }
}

/**
 * Retries a failed notification by creating a NEW notification log with the same params.
 * The original log is not modified.
 *
 * @param logId - The ID of the original notification log
 * @param userId - The user performing the retry
 * @returns The new notification log entry
 */
export async function retryNotification(
  logId: string,
  userId: string
): Promise<NotificationLog> {
  // Fetch the original notification log
  const originalLog = await getNotificationLog(logId);
  if (!originalLog) {
    throw new Error(`Notification log not found: ${logId}`);
  }

  // Create a NEW notification log with the same params
  const newLog = await createNotificationLog({
    firm_id: originalLog.firm_id,
    client_id: originalLog.client_id,
    notification_type_id: originalLog.notification_type_id,
    channel: originalLog.channel,
    recipient_address: originalLog.recipient_address,
    subject: originalLog.subject ?? undefined,
    content_preview: originalLog.content_preview ?? undefined,
    full_content: originalLog.full_content ?? undefined,
    triggered_by: userId,
    status: "queued",
    metadata: {
      ...(originalLog.metadata as Record<string, unknown>),
      retry_of: logId,
    },
  });

  // Attempt to send
  try {
    if (originalLog.channel === "email") {
      await sendEmail({
        to: originalLog.recipient_address,
        subject: originalLog.subject ?? "Notification from PracticeNudge",
        content: originalLog.full_content ?? "",
      });

      await updateNotificationStatus(newLog.id, "sent", {
        sent_at: new Date().toISOString(),
      });

      const updatedLog = await getNotificationLog(newLog.id);
      return updatedLog ?? { ...newLog, status: "sent", sent_at: new Date().toISOString() };
    }

    // SMS not supported
    await updateNotificationStatus(newLog.id, "failed", {
      failure_reason: "SMS channel is not yet supported",
    });

    const failedLog = await getNotificationLog(newLog.id);
    return failedLog ?? { ...newLog, status: "failed", failure_reason: "SMS channel is not yet supported" };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown send error";
    await updateNotificationStatus(newLog.id, "failed", {
      failure_reason: reason,
    });

    const failedLog = await getNotificationLog(newLog.id);
    return failedLog ?? { ...newLog, status: "failed", failure_reason: reason };
  }
}

/**
 * Deletes a notification log record from the database.
 *
 * @param logId - The ID of the notification log to delete
 */
export async function deleteNotificationLog(logId: string): Promise<void> {
  const supabase = getServiceClient();

  const { error } = await supabase
    .from("notification_logs")
    .delete()
    .eq("id", logId);

  if (error) {
    throw new Error(`Failed to delete notification log: ${error.message}`);
  }
}

/**
 * Stops a queued/scheduled notification.
 * Updates the notification log status to 'stopped' and cancels any corresponding queue item.
 *
 * @param logId - The ID of the notification log to stop
 */
export async function stopNotification(logId: string): Promise<void> {
  const supabase = getServiceClient();

  // Update the notification log status to 'stopped'
  await updateNotificationStatus(logId, "stopped");

  // Cancel any corresponding queue item
  const { error } = await supabase
    .from("notification_queue")
    .update({ status: "cancelled" })
    .eq("notification_log_id", logId)
    .eq("status", "pending");

  if (error) {
    // Log but don't throw — the main status update succeeded
    console.error(`Failed to cancel queue item for log ${logId}: ${error.message}`);
  }
}

/**
 * Triggers a notification immediately, bypassing frequency checks.
 * Creates a log entry and sends the notification.
 *
 * @param params - The trigger parameters
 * @param firmId - The firm ID
 * @param userId - The user triggering the notification
 * @returns The notification log entry
 */
export async function triggerNotification(
  params: TriggerParams,
  firmId: string,
  userId: string
): Promise<NotificationLog> {
  // Resolve recipient address if not provided
  let recipientAddress = params.recipient_address;
  if (!recipientAddress) {
    const supabase = getServiceClient();
    const { data: client } = await supabase
      .from("clients")
      .select("email, phone")
      .eq("id", params.client_id)
      .single();

    if (!client) {
      throw new Error(`Client not found: ${params.client_id}`);
    }

    recipientAddress =
      params.channel === "email"
        ? client.email
        : client.phone;

    if (!recipientAddress) {
      throw new Error(
        `Client has no ${params.channel === "email" ? "email" : "phone"} address`
      );
    }
  }

  // Create log entry
  const log = await createNotificationLog({
    firm_id: firmId,
    client_id: params.client_id,
    notification_type_id: params.notification_type_id,
    channel: params.channel,
    recipient_address: recipientAddress,
    triggered_by: userId,
    status: "queued",
    metadata: { triggered_manually: true },
  });

  // Send immediately (bypass frequency check)
  try {
    if (params.channel === "email") {
      await sendEmail({
        to: recipientAddress,
        subject: "Notification from PracticeNudge",
        content: "",
      });

      await updateNotificationStatus(log.id, "sent", {
        sent_at: new Date().toISOString(),
      });

      const updatedLog = await getNotificationLog(log.id);
      return updatedLog ?? { ...log, status: "sent", sent_at: new Date().toISOString() };
    }

    // SMS not supported
    await updateNotificationStatus(log.id, "failed", {
      failure_reason: "SMS channel is not yet supported",
    });

    const failedLog = await getNotificationLog(log.id);
    return failedLog ?? { ...log, status: "failed", failure_reason: "SMS channel is not yet supported" };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown send error";
    await updateNotificationStatus(log.id, "failed", {
      failure_reason: reason,
    });

    const failedLog = await getNotificationLog(log.id);
    return failedLog ?? { ...log, status: "failed", failure_reason: reason };
  }
}

/**
 * Edits a notification and re-sends it with updated content/recipient/channel.
 * Creates a NEW log entry — the original is not modified.
 *
 * @param logId - The ID of the original notification log
 * @param updates - The fields to update (content, recipient_address, channel, subject)
 * @param userId - The user performing the edit
 * @returns The new notification log entry
 */
export async function editAndResend(
  logId: string,
  updates: EditUpdates,
  userId: string
): Promise<NotificationLog> {
  // Fetch the original log
  const originalLog = await getNotificationLog(logId);
  if (!originalLog) {
    throw new Error(`Notification log not found: ${logId}`);
  }

  // Determine updated values
  const channel = updates.channel ?? originalLog.channel;
  const recipientAddress = updates.recipient_address ?? originalLog.recipient_address;
  const subject = updates.subject ?? originalLog.subject;
  const content = updates.content ?? originalLog.full_content;

  // Create a NEW log with updated params
  const newLog = await createNotificationLog({
    firm_id: originalLog.firm_id,
    client_id: originalLog.client_id,
    notification_type_id: originalLog.notification_type_id,
    channel,
    recipient_address: recipientAddress,
    subject: subject ?? undefined,
    content_preview: content ? content.substring(0, 200) : undefined,
    full_content: content ?? undefined,
    triggered_by: userId,
    status: "queued",
    metadata: {
      ...(originalLog.metadata as Record<string, unknown>),
      edited_from: logId,
    },
  });

  // Send the notification with updated params
  try {
    if (channel === "email") {
      await sendEmail({
        to: recipientAddress,
        subject: subject ?? "Notification from PracticeNudge",
        content: content ?? "",
      });

      await updateNotificationStatus(newLog.id, "sent", {
        sent_at: new Date().toISOString(),
      });

      const updatedLog = await getNotificationLog(newLog.id);
      return updatedLog ?? { ...newLog, status: "sent", sent_at: new Date().toISOString() };
    }

    // SMS not supported
    await updateNotificationStatus(newLog.id, "failed", {
      failure_reason: "SMS channel is not yet supported",
    });

    const failedLog = await getNotificationLog(newLog.id);
    return failedLog ?? { ...newLog, status: "failed", failure_reason: "SMS channel is not yet supported" };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown send error";
    await updateNotificationStatus(newLog.id, "failed", {
      failure_reason: reason,
    });

    const failedLog = await getNotificationLog(newLog.id);
    return failedLog ?? { ...newLog, status: "failed", failure_reason: reason };
  }
}
