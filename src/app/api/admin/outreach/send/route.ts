import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/service";
import { requireSuperAdmin } from "@/lib/admin/require-admin";
import { getContactTimeline } from "@/lib/admin/queries";
import { getOutreachMode } from "@/lib/outreach/config";
import { buildOutreachEmail } from "@/lib/outreach/message";
import { processOutreach } from "@/lib/outreach/processor";
import { basisCovers, findStep, stepContext, stepsFor } from "@/lib/outreach/templates";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TEST_SENDS_PER_HOUR = 20;
const bad = (message: string, status = 400) => NextResponse.json({ error: "REJECTED", message }, { status });

/**
 * test: renders a step with this person's details and sends it to the admin inbox only.
 * send_now: queues the step for the person; it goes out immediately when sending is live.
 */
export async function POST(request: Request) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) return auth.response;
  let body: { action?: unknown; member_id?: unknown; lead_id?: unknown; sequence?: unknown; step?: unknown };
  try { body = await request.json(); } catch { return bad("Invalid JSON body"); }

  const memberId = typeof body.member_id === "string" && UUID.test(body.member_id) ? body.member_id : undefined;
  const leadId = typeof body.lead_id === "string" && UUID.test(body.lead_id) ? body.lead_id : undefined;
  const step = typeof body.sequence === "string" && typeof body.step === "string" ? findStep(body.sequence, body.step) : undefined;
  if ((!memberId && !leadId) || !step || (body.action !== "test" && body.action !== "send_now")) return bad("Invalid request");

  const db = createServiceClient();
  const timeline = await getContactTimeline(db, { member_id: memberId, lead_id: leadId }).catch(() => null);
  if (!timeline) return bad("Contact not found", 404);
  const person = timeline.person;
  if (!stepsFor(person).some((s) => s.sequence === step.sequence && s.step === step.step)) {
    return bad("This email is not meant for this kind of contact");
  }

  if (body.action === "test") {
    const since = new Date(Date.now() - 3600000).toISOString();
    const { count } = await db.from("admin_audit_logs").select("id", { count: "exact", head: true })
      .eq("admin_user_id", auth.userId).eq("action_type", "test_send").gte("created_at", since);
    if ((count ?? 0) >= TEST_SENDS_PER_HOUR) return bad("Too many test emails this hour", 429);
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return bad("Email sending is not configured", 503);
    // The recipient is fixed on the server: a test can only ever reach the admin inbox.
    const recipient = process.env.SUPER_ADMIN_EMAIL || "halil.turkmen@gmail.com";
    const rendered = step.render(stepContext(person));
    const message = buildOutreachEmail({ to: recipient, subject: "[Test] " + rendered.subject, body: rendered.body, unsubscribeToken: null });
    const { error } = await new Resend(apiKey).emails.send(message);
    if (error) {
      console.error("[outreach] Test send failed", error.name);
      return bad("The test email could not be sent", 502);
    }
    await db.from("admin_audit_logs").insert({
      admin_user_id: auth.userId,
      target_entity_id: person.contact_id ?? person.member_id ?? person.lead_id,
      target_entity_type: "contact",
      action_type: "test_send",
      details: { sequence: step.sequence, step: step.step },
    });
    return NextResponse.json({ success: true });
  }

  if (person.is_internal) return bad("Team accounts are never emailed");
  if (person.suppression_reason) return bad("This address is on the suppression list");
  if (!basisCovers(person.marketing_basis, step)) {
    return bad(person.marketing_basis === "lead_form"
      ? "The lead form only covers the one tracker follow-up"
      : "No lawful basis recorded for this contact");
  }
  const { error } = await db.rpc("outreach_send_now", {
    p_admin: auth.userId, p_member_id: memberId ?? null, p_lead_id: leadId ?? null,
    p_sequence: step.sequence, p_step: step.step,
  });
  if (error) {
    if (error.code === "23505") return bad("This email was already queued or sent to this contact", 409);
    if (error.code === "22023") return bad("No lawful basis recorded for this contact");
    console.error("[outreach] Send now failed", error.code);
    return bad("The email could not be queued", 500);
  }
  const mode = getOutreachMode();
  const run = mode === "live" ? await processOutreach(db, { schedule: false }).catch(() => null) : null;
  return NextResponse.json({ queued: true, mode, sent: run?.sent ?? 0 });
}
