import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendReminderEmail } from "@/lib/email/resend";

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
    .select("*, clients(id, name, email, phone), firms(id, name, email)")
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

  // Fetch pending items
  const { data: items } = await supabase
    .from("request_items")
    .select("label, status")
    .eq("request_id", requestId)
    .in("status", ["pending", "rejected"]);

  const pendingItems = (items || []).map((item: any) => item.label);
  const isOverdue = docRequest.status === "overdue";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mtd-client-chaser.vercel.app";
  const uploadLink = `${appUrl}/upload/${docRequest.magic_token}`;

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
      message_preview: isOverdue
        ? `OVERDUE: Documents needed for ${docRequest.title}`
        : `Reminder for ${docRequest.title}`,
    });

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
    return NextResponse.json(
      { error: "Failed to send email: " + error.message },
      { status: 500 }
    );
  }
}
