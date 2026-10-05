import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyResendWebhook } from "@/lib/outreach/webhook-signature";

export const runtime = "nodejs";

// Resend's "bounced" is a permanent rejection; temporary failures arrive as "delivery_delayed".
const KINDS: Record<string, string> = {
  "email.delivered": "delivered",
  "email.delivery_delayed": "delivery_delayed",
  "email.bounced": "bounced",
  "email.complained": "complained",
};

/** Delivery events for outreach email. Bounces and complaints suppress the address immediately. */
export async function POST(request: Request) {
  const payload = await request.text();
  if (payload.length > 100_000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  if (!verifyResendWebhook(payload, request.headers, process.env.RESEND_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let event: { type?: unknown; created_at?: unknown; data?: { email_id?: unknown; bounce?: { type?: unknown } } };
  try { event = JSON.parse(payload); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const kind = typeof event.type === "string" ? KINDS[event.type] : undefined;
  const emailId = event.data?.email_id;
  if (!kind || typeof emailId !== "string") return NextResponse.json({ result: "ignored" });

  const occurredAt = typeof event.created_at === "string" && !Number.isNaN(Date.parse(event.created_at))
    ? event.created_at : null;
  // Only the event type is kept: provider payloads quote addresses and bounce messages.
  const { data, error } = await createServiceClient().rpc("outreach_record_event", {
    p_provider_event_id: request.headers.get("svix-id"),
    p_provider_message_id: emailId,
    p_kind: kind,
    p_detail: { type: event.type, bounce_type: typeof event.data?.bounce?.type === "string" ? event.data.bounce.type : null },
    p_occurred_at: occurredAt,
  });
  if (error) {
    console.error("[resend-webhook] Event could not be recorded", error.code);
    // A non-2xx response makes the provider retry; the event ID keeps the retry idempotent.
    return NextResponse.json({ error: "Event not recorded" }, { status: 503 });
  }
  return NextResponse.json({ result: data });
}
