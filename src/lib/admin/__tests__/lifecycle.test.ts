import { describe, it, expect } from "vitest";
import { getContactQuality, getFunnel, withQuality, type LifecycleRow } from "../lifecycle";

const now = Date.parse("2026-10-05T12:00:00Z");
const member: LifecycleRow = {
  email_key: "jane@smithaccounts.co.uk", member_id: "m1", user_id: "u1", firm_id: "f1", role: "owner",
  member_status: "active", member_name: null, firm_name: "Smith Accounts", plan: "free",
  signed_up_at: "2026-10-04T09:00:00Z", email_confirmed_at: "2026-10-04T09:05:00Z", last_sign_in_at: null,
  lead_id: null, lead_name: null, lead_practice: null, lead_client_range: null, lead_source: null,
  lead_status: null, lead_at: null, lead_count: null, client_count: 0, first_client_at: null,
  request_count: 0, first_request_at: null, last_request_at: null, first_upload_at: null,
  last_activity_at: null, last_seen_at: null, contact_id: null, verdict: "unknown", verdict_reason: null,
  stage_override: null, stage_override_reason: null, derived_stage: "no_clients", stage: "no_clients",
};
const lead: LifecycleRow = {
  ...member, email_key: "sam@hollowayco.co.uk", member_id: null, user_id: null, firm_id: null, role: null,
  member_status: null, firm_name: null, plan: null, signed_up_at: null, email_confirmed_at: null,
  lead_id: "l1", lead_name: "Sam Holloway", lead_practice: "Holloway & Co", lead_at: "2026-06-01T10:00:00Z",
  lead_count: 1, derived_stage: "new_lead", stage: "new_lead",
};

describe("contact quality", () => {
  it("lets a new member on a practice domain through", () => {
    expect(getContactQuality(member, now)).toEqual({ tier: "ok", signals: [] });
  });
  it("does not flag a fresh gmail sign-up on that alone", () => {
    const result = getContactQuality({ ...member, email_key: "jane.smith@gmail.com" }, now);
    expect(result.tier).toBe("ok");
    expect(result.signals).toHaveLength(1);
  });
  it("sends a quiet gmail sign-up with no clients after a week to review", () => {
    const quiet = { ...member, email_key: "toon@gmail.com", signed_up_at: "2026-09-20T09:00:00Z" };
    expect(getContactQuality(quiet, now).tier).toBe("review");
  });
  it("treats a disposable domain as junk and unverified email as review", () => {
    expect(getContactQuality({ ...member, email_key: "x@mailinator.com" }, now).tier).toBe("junk");
    expect(getContactQuality({ ...member, email_confirmed_at: null, signed_up_at: "2026-10-01T09:00:00Z" }, now).tier)
      .toBe("review");
  });
  it("only weakly flags the default firm name given to Google sign-ups", () => {
    const result = getContactQuality({ ...member, firm_name: "Jane's Firm" }, now);
    expect(result.tier).toBe("ok");
    expect(result.signals[0].strength).toBe("weak");
  });
  it("lets an admin verdict win over the signals", () => {
    const flagged = { ...member, email_key: "x@mailinator.com" };
    expect(getContactQuality({ ...flagged, verdict: "real" }, now).tier).toBe("ok");
    expect(getContactQuality({ ...member, verdict: "junk" }, now).tier).toBe("junk");
  });
  it("checks leads on their practice name", () => {
    expect(getContactQuality(lead, now).tier).toBe("ok");
    expect(getContactQuality({ ...lead, lead_practice: "", email_key: "s@gmail.com" }, now).tier).toBe("review");
  });
});

describe("activation funnel", () => {
  it("counts one owner per firm and leaves junk out", () => {
    const people = [
      withQuality({ ...member, client_count: 3, first_request_at: "2026-10-04T10:00:00Z" }, now),
      withQuality({ ...member, email_key: "colleague@smithaccounts.co.uk", member_id: "m2", role: "member" }, now),
      withQuality({ ...member, email_key: "x@mailinator.com", member_id: "m3" }, now),
      withQuality(lead, now),
    ];
    expect(Object.fromEntries(getFunnel(people).map((s) => [s.key, s.value]))).toEqual({
      leads: 1, signed_up: 1, first_client: 1, first_request: 1, first_upload: 0,
    });
  });
});
