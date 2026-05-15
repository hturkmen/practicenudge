import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendReminderEmail } from "@/lib/email/resend";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify cron secret (Vercel Cron)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mtd-client-chaser.vercel.app";

  // Fetch all active requests with deadlines
  const { data: requests, error } = await supabase
    .from("document_requests")
    .select("*, clients(id, name, email, phone), firms(id, name, email)")
    .in("status", ["pending", "in_progress", "overdue"])
    .not("deadline", "is", null);

  if (error || !requests) {
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }

  let emailsSent = 0;
  let smsSent = 0;
  let statusUpdated = 0;

  for (const req of requests) {
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

        emailsSent++;
      } catch (e) {
        console.error("Failed to send email:", e);
        await supabase.from("reminder_logs").insert({
          request_id: req.id,
          client_id: req.clients.id,
          channel: "email",
          status: "failed",
          message_preview: `Failed: ${(e as Error).message}`,
        });
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

  return NextResponse.json({
    success: true,
    processed: requests.length,
    emailsSent,
    smsSent,
    statusUpdated,
    timestamp: now.toISOString(),
  });
}
