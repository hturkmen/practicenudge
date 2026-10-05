import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
const mocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("resend", () => ({ Resend: class { emails = { send: mocks.send }; } }));
import { withQuality, type LifecycleRow } from "@/lib/admin/lifecycle";
import { STEPS, safeFirstName, stepContext } from "../templates";
import { buildOutreachEmail } from "../message";
import { planOutreach } from "../planner";
import { processOutreach } from "../processor";

const now = Date.parse("2026-10-07T09:00:00Z");
const owner: LifecycleRow = {
  email_key: "jane@smithaccounts.co.uk", member_id: "m1", user_id: "u1", firm_id: "f1", role: "owner",
  member_status: "active", member_name: "Jane Smith", firm_name: "Smith Accounts", plan: "free",
  signed_up_at: "2026-10-05T08:00:00Z", email_confirmed_at: "2026-10-05T08:30:00Z", last_sign_in_at: null,
  lead_id: null, lead_name: null, lead_practice: null, lead_client_range: null, lead_source: null,
  lead_status: null, lead_at: null, lead_count: null, client_count: 0, first_client_at: null,
  request_count: 0, first_request_at: null, last_request_at: null, first_upload_at: null,
  last_activity_at: null, last_seen_at: null, contact_id: "c1", verdict: "unknown", verdict_reason: null,
  stage_override: null, stage_override_reason: null, derived_stage: "no_clients", stage: "no_clients",
  is_internal: false, marketing_basis: "consent", paused: false, suppression_reason: null,
  last_outreach_at: null, next_outreach_at: null, next_outreach_step: null,
};
const lead: LifecycleRow = {
  ...owner, email_key: "sam@hollowayco.co.uk", member_id: null, user_id: null, firm_id: null, role: null,
  member_status: null, member_name: null, firm_name: null, email_confirmed_at: null, signed_up_at: null,
  lead_id: "l1", lead_name: "Sam Holloway", lead_practice: "Holloway & Co", lead_at: "2026-10-04T08:00:00Z",
  contact_id: "c2", marketing_basis: "lead_form", derived_stage: "new_lead", stage: "new_lead",
};
const plan = (rows: LifecycleRow[]) => planOutreach(rows.map((r) => withQuality(r, now)), now)
  .map((p) => p.sequence_key + "/" + p.step_key);

describe("email copy", () => {
  it("renders every step plainly, with one link, the team sign-off and no injected header", () => {
    for (const step of STEPS) {
      for (const person of [owner, { ...owner, member_name: null }]) {
        const { subject, body } = step.render(stepContext(person));
        expect(subject).not.toMatch(/[\r\n]/);
        expect(body.trim().endsWith("The PracticeNudge team")).toBe(true);
        expect(body).not.toMatch(/noticed|urgent|last chance|only \d+ left/i);
      }
    }
  });
  it("keeps only a clean first name and never repeats a default firm name", () => {
    expect(safeFirstName("Alex Logan")).toBe("Alex");
    expect(safeFirstName("O'Neil-Smith Jr")).toBe("O'Neil-Smith");
    expect(safeFirstName("<script>alert(1)</script>")).not.toMatch(/[<>()\/\d]/);
    expect(safeFirstName("Şükrü Özdemir")).toBe("Şükrü");
    expect(safeFirstName("J")).toBeNull();
    expect(stepContext({ ...owner, firm_name: "jane's Firm" }).firmName).toBeNull();
  });
  it("adds a footer and one-click unsubscribe headers only with a real token", () => {
    const email = buildOutreachEmail({ to: "a@b.co.uk", subject: "Hi\r\nBcc: x@y.z", body: "Body", unsubscribeToken: "tok" });
    expect(email.subject).toBe("Hi Bcc: x@y.z");
    expect(email.text).toContain("This is an automated email. Reply to it and a person will read your message.");
    expect(email.text).toContain("/unsubscribe?token=tok");
    expect(email.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(buildOutreachEmail({ to: "a@b.co.uk", subject: "s", body: "b", unsubscribeToken: null }).headers).toBeUndefined();
  });
});

describe("planning", () => {
  it("schedules the first owner step two days after verification", () => {
    expect(plan([owner])).toEqual(["onboarding/add_first_client"]);
  });
  it("sends the lead its single follow-up, and the lead form never covers owner emails", () => {
    expect(plan([lead])).toEqual(["lead_follow_up/follow_up"]);
    expect(plan([{ ...owner, marketing_basis: "lead_form" }])).toEqual([]);
  });
  it("skips anyone without a basis, under review, internal, paused or suppressed", () => {
    expect(plan([{ ...owner, marketing_basis: "none" }])).toEqual([]);
    expect(plan([{ ...owner, email_key: "x@mailinator.com" }])).toEqual([]);
    expect(plan([{ ...owner, is_internal: true }])).toEqual([]);
    expect(plan([{ ...owner, paused: true }])).toEqual([]);
    expect(plan([{ ...owner, suppression_reason: "unsubscribe" }])).toEqual([]);
    expect(plan([{ ...owner, role: "member" }])).toEqual([]);
  });
  it("does not catch up on steps that fell due long ago", () => {
    expect(plan([{ ...owner, email_confirmed_at: "2026-09-01T08:00:00Z" }])).toEqual([]);
  });
});

describe("sending", () => {
  const job = { id: "job1", contact_id: "c1", sequence_key: "onboarding", step_key: "add_first_client", attempts: 1, lock_token: "lock", message: null };
  function database() {
    const updates: Record<string, unknown>[] = [];
    const rpc = vi.fn().mockResolvedValue({ data: [job], error: null });
    const chain: Record<string, unknown> = {};
    Object.assign(chain, {
      select: () => chain, eq: () => chain,
      maybeSingle: async () => ({ data: updates.length ? { id: "job1" } : owner, error: null }),
      then: (resolve: (value: unknown) => void) => Promise.resolve({ error: null }).then(resolve),
    });
    const db = { rpc, from: () => ({ ...chain, update: (value: Record<string, unknown>) => { updates.push(value); return chain; } }) };
    return { rpc, updates, db: db as unknown as SupabaseClient };
  }
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("RESEND_API_KEY", "test-only");
    vi.stubEnv("OUTREACH_TOKEN_SECRET", "test-only-secret-that-is-long-enough-1234");
  });

  it("does nothing while the kill switch is off", async () => {
    vi.stubEnv("OUTREACH_MODE", "");
    const { db, rpc } = database();
    expect((await processOutreach(db, { schedule: false })).mode).toBe("off");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("never claims in dry run, or in live mode without an unsubscribe secret", async () => {
    vi.stubEnv("OUTREACH_MODE", "dry_run");
    const first = database();
    await processOutreach(first.db, { schedule: false });
    expect(first.rpc).not.toHaveBeenCalled();
    vi.stubEnv("OUTREACH_MODE", "live");
    vi.stubEnv("OUTREACH_TOKEN_SECRET", "");
    const second = database();
    expect((await processOutreach(second.db, { schedule: false })).configured).toBe(false);
    expect(second.rpc).not.toHaveBeenCalled();
  });
  it("sends with a stable idempotency key and records the provider ID", async () => {
    vi.stubEnv("OUTREACH_MODE", "live");
    mocks.send.mockResolvedValue({ data: { id: "provider-1" }, error: null });
    const { db, updates } = database();
    expect((await processOutreach(db, { schedule: false })).sent).toBe(1);
    const [message, options] = mocks.send.mock.calls[0];
    expect(options).toEqual({ idempotencyKey: "outreach/job1" });
    expect(message.to).toEqual(["jane@smithaccounts.co.uk"]);
    expect(message.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(updates.at(-1)).toMatchObject({ status: "sent", provider_message_id: "provider-1" });
  });
  it("records a provider rejection as a failure without quoting the provider message", async () => {
    vi.stubEnv("OUTREACH_MODE", "live");
    mocks.send.mockResolvedValue({ data: null, error: { name: "validation_error", message: "jane@smithaccounts.co.uk is invalid" } });
    const { db, updates } = database();
    expect((await processOutreach(db, { schedule: false })).failed).toBe(1);
    expect(updates.at(-1)).toMatchObject({ status: "failed", last_error: "Provider error: validation_error" });
  });
});
