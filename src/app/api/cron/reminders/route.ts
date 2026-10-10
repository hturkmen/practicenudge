import { processSignupNotifications } from "@/lib/email/signup-notifications";
import { hasBearerSecret } from "@/lib/admin/webhook-auth";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendReminderEmail } from "@/lib/email/resend";
import { createNotificationLog } from "@/lib/notifications/logger";
import { notifyCronError } from "@/lib/email/admin-notify";
import { runMtdUpdatesJob } from "@/lib/mtd-updates/job";

export const dynamic = "force-dynamic";
// The MTD Updates drafting step runs after the reminders and is time-boxed; this leaves it room.
export const maxDuration = 60;

export async function GET(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify cron secret (Vercel Cron)
  if (!hasBearerSecret(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Daily safety net; immediate signup delivery is driven by the database webhook.
  let signupNotifications;
  try { signupNotifications = await processSignupNotifications(supabase); }
  catch { signupNotifications = { error: "Signup queue unavailable" }; }

  const now = new Date();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.practicenudge.com";

  // Fetch all active requests with deadlines
  const { data: requests, error } = await supabase
    .from("document_requests")
    .select("*, clients(id, name, email, phone, status, gdpr_consent), firms(id, name, email)")
    .in("status", ["pending", "in_progress", "overdue"])
    .not("deadline", "is", null);

  if (error || !requests) {
    await notifyCronError(error?.message || "No data returned", "Fetching document requests");
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }

  // Look up the 'document_reminder' notification type ID for dual-write
  let documentReminderTypeId: string | null = null;
  try {
    const { data: notificationType } = await supabase
      .from("notification_types")
      .select("id")
      .eq("name", "document_reminder")
      .single();
    documentReminderTypeId = notificationType?.id ?? null;
  } catch {
    // If lookup fails, we'll skip notification_logs writes but continue with reminders
    console.warn("Failed to look up document_reminder notification type");
  }

  let emailsSent = 0;
  let smsSent = 0;
  let statusUpdated = 0;

  for (const req of requests) {
    // Skip clients that are on hold
    if (req.clients?.status === "on_hold") {
      continue;
    }

    // Skip clients without GDPR consent
    if (!req.clients?.gdpr_consent) {
      continue;
    }

    const deadline = new Date(req.deadline);
    const daysUntilDeadline = Math.ceil(
      (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const lastReminder = req.last_reminder_at
      ? new Date(req.last_reminder_at)
      : null;
    const daysSinceLastReminder = lastReminder
      ? Math.ceil(
          (now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60 * 24)
        )
      : Infinity;

    let shouldSendEmail = false;
    let shouldSendSms = false;
    let isOverdue = false;

    if (daysUntilDeadline < 0) {
      isOverdue = true;
      if (daysSinceLastReminder >= 3) {
        shouldSendEmail = true;
        shouldSendSms = true;
      }
    } else if (daysUntilDeadline <= 1) {
      shouldSendEmail = true;
      shouldSendSms = true;
    } else if (daysUntilDeadline <= 3 && daysSinceLastReminder >= 3) {
      shouldSendEmail = true;
    } else if (daysUntilDeadline <= 7 && req.reminder_count === 0) {
      shouldSendEmail = true;
    }

    // Update status to overdue
    if (isOverdue && req.status !== "overdue") {
      await supabase
        .from("document_requests")
        .update({ status: "overdue" })
        .eq("id", req.id);
      statusUpdated++;
    }

    // Send email reminder via Resend
    if (shouldSendEmail && req.clients?.email) {
      try {
        // Fetch pending items
        const { data: items } = await supabase
          .from("request_items")
          .select("label, status")
          .eq("request_id", req.id)
          .in("status", ["pending", "rejected"]);

        const pendingItems = (items || []).map((item: any) => item.label);
        const uploadLink = `${appUrl}/upload/${req.magic_token}`;

        if (process.env.RESEND_API_KEY) {
          await sendReminderEmail({
            to: req.clients.email,
            clientName: req.clients.name,
            firmName: req.firms?.name || "Your Accountant",
            requestTitle: req.title,
            deadline: new Date(req.deadline).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
            uploadLink,
            pendingItems,
            isOverdue,
          });
        }

        await supabase.from("reminder_logs").insert({
          request_id: req.id,
          client_id: req.clients.id,
          channel: "email",
          status: "sent",
          message_preview: isOverdue
            ? `OVERDUE: Documents needed for ${req.title}`
            : `Reminder: Documents needed for ${req.title}`,
        });

        // Dual-write to notification_logs
        if (documentReminderTypeId && req.firms?.id) {
          const emailSubject = isOverdue
            ? `OVERDUE: Documents needed for ${req.title}`
            : `Reminder: Documents needed for ${req.title}`;
          try {
            await createNotificationLog({
              firm_id: req.firms.id,
              client_id: req.clients.id,
              notification_type_id: documentReminderTypeId,
              channel: "email",
              recipient_address: req.clients.email,
              subject: emailSubject,
              content_preview: emailSubject.substring(0, 200),
              status: "sent",
              triggered_by: undefined, // automated
              metadata: { request_id: req.id, is_overdue: isOverdue },
            });
          } catch (notifError) {
            // Don't break existing reminder functionality if notification log fails
            console.error("Failed to write notification log:", notifError);
          }
        }

        emailsSent++;
      } catch (e) {
        console.error("Failed to send email:", e);
        notifyCronError((e as Error).message, `Sending reminder for "${req.title}" to ${req.clients.email}`).catch(() => {});
        await supabase.from("reminder_logs").insert({
          request_id: req.id,
          client_id: req.clients.id,
          channel: "email",
          status: "failed",
          message_preview: `Failed: ${(e as Error).message}`,
        });

        // Dual-write to notification_logs for failed sends
        if (documentReminderTypeId && req.firms?.id) {
          const emailSubject = isOverdue
            ? `OVERDUE: Documents needed for ${req.title}`
            : `Reminder: Documents needed for ${req.title}`;
          try {
            await createNotificationLog({
              firm_id: req.firms.id,
              client_id: req.clients.id,
              notification_type_id: documentReminderTypeId,
              channel: "email",
              recipient_address: req.clients.email,
              subject: emailSubject,
              content_preview: `Failed: ${(e as Error).message}`.substring(0, 200),
              status: "failed",
              triggered_by: undefined, // automated
              metadata: {
                request_id: req.id,
                is_overdue: isOverdue,
                failure_reason: (e as Error).message,
              },
            });
          } catch (notifError) {
            // Don't break existing reminder functionality if notification log fails
            console.error("Failed to write notification log:", notifError);
          }
        }
      }
    }

    // Update reminder count
    if (shouldSendEmail || shouldSendSms) {
      await supabase
        .from("document_requests")
        .update({
          reminder_count: (req.reminder_count || 0) + 1,
          last_reminder_at: now.toISOString(),
        })
        .eq("id", req.id);

      await supabase.from("activity_logs").insert({
        firm_id: req.firms?.id,
        client_id: req.clients?.id,
        request_id: req.id,
        action: "reminder_sent",
        details: {
          channels: [
            ...(shouldSendEmail ? ["email"] : []),
            ...(shouldSendSms ? ["sms"] : []),
          ],
          is_overdue: isOverdue,
        },
      });
    }
  }

  // Vercel Hobby allows two cron jobs, so the daily MTD Updates check rides on this one. It runs last,
  // never throws, and stops calling the AI model after its time budget.
  const mtdUpdates = await runMtdUpdatesJob(supabase);

  return NextResponse.json({
    success: true,
    signupNotifications,
    mtdUpdates,
    processed: requests.length,
    emailsSent,
    smsSent,
    statusUpdated,
    timestamp: now.toISOString(),
  });
}
