import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { processSignupNotifications } from "@/lib/email/signup-notifications";
import { hasBearerSecret } from "@/lib/admin/webhook-auth";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!hasBearerSecret(request, process.env.ADMIN_SIGNUP_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let event;
  try { event = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (event?.type !== "INSERT" || event?.schema !== "public" || event?.table !== "admin_signup_notifications"
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(event?.record?.member_id || "")) {
    return NextResponse.json({ error: "Invalid signup event" }, { status: 400 });
  }
  try {
    const result = await processSignupNotifications(createServiceClient(), event.record.member_id);
    return NextResponse.json(result, { status: result.configured && !result.failed ? 200 : 503 });
  } catch {
    return NextResponse.json({ error: "Notification remains queued" }, { status: 503 });
  }
}
