import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendReminderEmail } from "@/lib/email/resend";
import { createNotificationLog } from "@/lib/notifications/logger";
import { notifyReminderFailed } from "@/lib/email/admin-notify";

export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId } = await request.json();

  if (!requestId) {
    return NextResponse.json(
      { error: "requestId is required" },
      { status: 400 }
    );
  }

  // Fetch request with client and firm info — verify ownership
  const { data: firmUser } = await supabase
    .from("firm_users")
    .select("firm_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!firmUser) {
    return NextResponse.json({ error: "No firm found" }, { status: 403 });
  }

  const { data: docRequest, error: reqError } = await supabase
    .from("document_requests")
    .select("*, clients(id, name, email, phone, status), firms(id, name, email)")
    .eq("id", requestId)
    .eq("firm_id", firmUser.firm_id)
    .single();

  if (reqError || !docRequest) {
    return NextResponse.json(
      { error: "Request not found" },
      { status: 404 }
    );
  }

  if (!docRequest.clients?.email) {
    return NextResponse.json(
      { error: "Client has no email address" },
      { status: 400 }
    );
  }

  // Block reminders for on_hold clients
  if (docRequest.clients?.status === "on_hold") {
    return NextResponse.json(
      { error: "Client is on hold. No reminders can be sent." },
      { status: 400 }
    );
  }

  // Block reminders for cancelled/on_hold requests
  if (docRequest.status === "on_hold" || docRequest.status === "cancelled") {
    return NextResponse.json(
      { error: "Request is " + docRequest.status.replace("_", " ") + ". No reminders can be sent." },
      { status: 400 }
    );
  }

  // Fetch pending items
  const { data: items } = await supabase
    .from("request_items")
    .select("label, status")
    .eq("request_id", requestId)
    .in("status", ["pending", "rejected"]);

  const pendingItems = (items || []).map((item: any) => item.label);
  const isOverdue = docRequest.status === "overdue";
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://www.practicenudge.com";
  const uploadLink = `${appUrl}/upload/${docRequest.magic_token}`;

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
    // If lookup fails, skip notification_logs write but continue with reminder
    console.warn("Failed to look up document_reminder notification type");
  }

  const emailSubject = isOverdue
    ? `OVERDUE: Documents needed for ${docRequest.title}`
    : `Reminder for ${docRequest.title}`;

  try {
    await sendReminderEmail({
      to: docRequest.clients.email,
      clientName: docRequest.clients.name,
      firmName: docRequest.firms?.name || "Your Accountant",
      requestTitle: docRequest.title,
      deadline: docRequest.deadline
        ? new Date(docRequest.deadline).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "No deadline set",
      uploadLink,
      pendingItems,
      isOverdue,
    });

    // Log the reminder
    await supabase.from("reminder_logs").insert({
      request_id: docRequest.id,
      client_id: docRequest.clients.id,
      channel: "email",
      status: "sent",
      message_preview: emailSubject,
    });

    // Dual-write to notification_logs
    if (documentReminderTypeId && docRequest.firms?.id) {
      try {
        await createNotificationLog({
          firm_id: docRequest.firms.id,
          client_id: docRequest.clients.id,
          notification_type_id: documentReminderTypeId,
          channel: "email",
          recipient_address: docRequest.clients.email,
          subject: emailSubject,
          content_preview: emailSubject.substring(0, 200),
          status: "sent",
          triggered_by: user.id,
          metadata: { request_id: docRequest.id, is_overdue: isOverdue },
        });
      } catch (notifError) {
        // Don't break existing reminder functionality if notification log fails
        console.error("Failed to write notification log:", notifError);
      }
    }

    // Update request
    await supabase
      .from("document_requests")
      .update({
        reminder_count: (docRequest.reminder_count || 0) + 1,
        last_reminder_at: new Date().toISOString(),
      })
      .eq("id", docRequest.id);

    // Activity log
    await supabase.from("activity_logs").insert({
      firm_id: docRequest.firms?.id,
      client_id: docRequest.clients.id,
      request_id: docRequest.id,
      action: "reminder_sent",
      details: { channel: "email", is_overdue: isOverdue },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Notify super admin about the failure
    notifyReminderFailed(
      docRequest.title,
      docRequest.clients.email,
      error.message
    ).catch(() => {});

    // Dual-write failure to notification_logs
    if (documentReminderTypeId && docRequest.firms?.id) {
      try {
        await createNotificationLog({
          firm_id: docRequest.firms.id,
          client_id: docRequest.clients.id,
          notification_type_id: documentReminderTypeId,
          channel: "email",
          recipient_address: docRequest.clients.email,
          subject: emailSubject,
          content_preview: `Failed: ${error.message}`.substring(0, 200),
          status: "failed",
          triggered_by: user.id,
          metadata: {
            request_id: docRequest.id,
            is_overdue: isOverdue,
            failure_reason: error.message,
          },
        });
      } catch (notifError) {
        console.error("Failed to write notification log for failure:", notifError);
      }
    }

    return NextResponse.json(
      { error: "Failed to send email: " + error.message },
      { status: 500 }
    );
  }
}
