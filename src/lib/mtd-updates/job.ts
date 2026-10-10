import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyAdmin } from "@/lib/email/admin-notify";
import { ingestMtdUpdates, type IngestSummary } from "./ingest";

/**
 * The MTD Updates check as the cron and the admin button run it. Never throws: a GOV.UK or database
 * problem must not break the reminders cron it rides on.
 */
export async function runMtdUpdatesJob(
  supabase: SupabaseClient,
  options: { notify?: boolean } = {}
): Promise<IngestSummary | { error: string }> {
  try {
    return await ingestMtdUpdates(supabase, {
      geminiKey: process.env.GEMINI_API_KEY || undefined,
      notify: options.notify === false ? undefined : notifyAdmin,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[mtd-updates] job failed:", message);
    return { error: message };
  }
}
