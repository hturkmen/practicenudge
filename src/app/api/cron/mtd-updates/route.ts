import { NextResponse } from "next/server";
import { hasBearerSecret } from "@/lib/admin/webhook-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { runMtdUpdatesJob } from "@/lib/mtd-updates/job";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Runs the MTD Updates check on demand (curl with the cron bearer secret). The daily run is part
 * of /api/cron/reminders, because the Hobby plan allows only two cron jobs.
 */
export async function GET(request: Request) {
  if (!hasBearerSecret(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runMtdUpdatesJob(createServiceClient());
  return NextResponse.json(result, { status: "error" in result ? 500 : 200 });
}
