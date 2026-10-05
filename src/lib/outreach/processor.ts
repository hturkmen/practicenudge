import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getLifecycle } from "@/lib/admin/queries";
import type { LifecycleRow } from "@/lib/admin/lifecycle";
import { getOutreachMode, type OutreachMode } from "./config";
import { buildOutreachEmail, type OutreachEmail } from "./message";
import { planOutreach } from "./planner";
import { findStep, stepContext } from "./templates";
import { createUnsubscribeToken, getTokenSecret } from "./tokens";

type Job = {
  id: string;
  contact_id: string;
  sequence_key: string;
  step_key: string;
  attempts: number;
  lock_token: string;
  message: OutreachEmail | null;
};

export type OutreachRun = { mode: OutreachMode; scheduled: number; sent: number; failed: number; configured: boolean };

/** Queues every step that is due now. Duplicates are ignored by the (contact, sequence, step) key. */
export async function scheduleDueSteps(db: SupabaseClient, now = Date.now()): Promise<number> {
  const { people } = await getLifecycle(db);
  const planned = planOutreach(people, now);
  if (!planned.length) return 0;
  const { data, error } = await db.from("outreach_messages")
    .upsert(planned, { onConflict: "contact_id,sequence_key,step_key", ignoreDuplicates: true })
    .select("id");
  if (error) throw new Error("Outreach steps could not be scheduled");
  return data?.length ?? 0;
}

/**
 * off: does nothing. dry_run: schedules (visible as "next step" in the admin) but never sends.
 * live: schedules, then sends whatever the database releases after its send-time checks.
 */
export async function processOutreach(db: SupabaseClient, options: { schedule?: boolean } = {}): Promise<OutreachRun> {
  const mode = getOutreachMode();
  const run: OutreachRun = { mode, scheduled: 0, sent: 0, failed: 0, configured: true };
  if (mode === "off") return run;
  if (options.schedule !== false) run.scheduled = await scheduleDueSteps(db);
  if (mode !== "live") return run;

  const apiKey = process.env.RESEND_API_KEY;
  const secret = getTokenSecret();
  // Without a working unsubscribe link nothing may be sent, so nothing is claimed.
  if (!apiKey || !secret) return { ...run, configured: false };
  const resend = new Resend(apiKey);
  const { data: jobs, error } = await db.rpc("claim_outreach_messages", { p_limit: 10 });
  if (error) throw new Error("Unable to claim outreach messages");

  for (const job of (jobs || []) as Job[]) {
    try {
      let message = job.message;
      if (!message) {
        const step = findStep(job.sequence_key, job.step_key);
        if (!step) throw new Error("Unknown sequence step");
        // Looked up by contact ID, so no address appears in a request URL.
        const { data: person, error: lookupError } = await db.from("admin_lifecycle_overview")
          .select("*").eq("contact_id", job.contact_id).maybeSingle();
        if (lookupError || !person) throw new Error("Contact could not be loaded");
        const rendered = step.render(stepContext(person as LifecycleRow));
        message = buildOutreachEmail({
          to: (person as LifecycleRow).email_key, subject: rendered.subject, body: rendered.body,
          unsubscribeToken: createUnsubscribeToken(job.contact_id, secret),
        });
        const { data: saved, error: saveError } = await db.from("outreach_messages")
          .update({ message, updated_at: new Date().toISOString() })
          .eq("id", job.id).eq("lock_token", job.lock_token).select("id").maybeSingle();
        if (saveError || !saved) throw new Error("Claim expired before send");
      }
      const { data, error: sendError } = await resend.emails.send(message, { idempotencyKey: "outreach/" + job.id });
      // Only the provider's error type is kept: its message can quote the recipient's address.
      if (sendError || !data?.id) throw new Error(sendError ? "Provider error: " + sendError.name : "Email provider returned no message ID");
      const { data: saved, error: saveError } = await db.from("outreach_messages")
        .update({ status: "sent", sent_at: new Date().toISOString(), provider_message_id: data.id,
          last_error: null, locked_until: null, updated_at: new Date().toISOString() })
        .eq("id", job.id).eq("lock_token", job.lock_token).select("id").maybeSingle();
      if (saveError || !saved) throw new Error("Provider accepted message but delivery record could not be saved");
      run.sent++;
    } catch (failure) {
      run.failed++;
      const { error: saveError } = await db.from("outreach_messages")
        .update({ status: job.attempts >= 8 ? "review_required" : "failed", locked_until: null,
          last_error: (failure instanceof Error ? failure.message : "Send failed").slice(0, 200),
          scheduled_for: new Date(Date.now() + Math.min(60, 2 ** job.attempts) * 60000).toISOString(),
          updated_at: new Date().toISOString() })
        .eq("id", job.id).eq("lock_token", job.lock_token);
      if (saveError) console.error("[outreach] Unable to save job outcome", job.id);
    }
  }
  return run;
}
