import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { hasBearerSecret } from "@/lib/admin/webhook-auth";
import { processOutreach } from "@/lib/outreach/processor";

export const dynamic = "force-dynamic";

/** Daily, weekdays. Does nothing unless OUTREACH_MODE is dry_run or live. */
export async function GET(request: Request) {
  if (!hasBearerSecret(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const run = await processOutreach(createServiceClient());
    return NextResponse.json(run, { status: run.failed || !run.configured ? 503 : 200 });
  } catch {
    return NextResponse.json({ error: "Outreach run failed" }, { status: 503 });
  }
}
