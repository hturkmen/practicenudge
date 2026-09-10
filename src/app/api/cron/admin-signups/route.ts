import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { processSignupNotifications } from "@/lib/email/signup-notifications";
import { hasBearerSecret } from "@/lib/admin/webhook-auth";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!hasBearerSecret(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await processSignupNotifications(createServiceClient());
    return NextResponse.json(result, { status: result.configured && !result.failed ? 200 : 503 });
  } catch {
    return NextResponse.json({ error: "Notification queue unavailable" }, { status: 503 });
  }
}
