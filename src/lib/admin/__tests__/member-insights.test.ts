import { describe, it, expect } from "vitest";
import { getMemberInsights } from "../member-insights";
import { hasBearerSecret } from "../webhook-auth";
import type { MemberListItem, MemberUsage } from "@/lib/types/admin";

const now = Date.parse("2026-09-10T12:00:00Z");
const member: MemberListItem = {
  id: "membership", user_id: "user", name: "Example", email: "owner@example.test",
  firm_id: "firm", firm_name: "Example", role: "owner", status: "active", plan: "free",
  created_at: "2026-08-01T10:00:00Z", account_created_at: "2026-08-01T10:00:00Z",
  email_confirmed_at: "2026-08-01T11:00:00Z", last_sign_in_at: null, last_activity_at: null,
  firm_client_count: 0, firm_request_count: 0,
};

describe("member investigation signals", () => {
  it("does not call an old empty account spam", () => {
    const result = getMemberInsights(member, undefined, now);
    expect(result.engagement).toBe("Inactive for 14+ days");
    expect(result.signals).toEqual([]);
  });
  it("distinguishes a recent action from the older last sign-in", () => {
    expect(getMemberInsights({ ...member, last_activity_at: "2026-09-10T10:00:00Z", firm_client_count: 5 }, undefined, now).engagement)
      .toBe("Firm adding clients");
  });
  it("gives a new account time to verify before flagging", () => {
    expect(getMemberInsights({ ...member, account_created_at: "2026-09-10T10:00:00Z", email_confirmed_at: null }, undefined, now).signals).toEqual([]);
    expect(getMemberInsights({ ...member, email_confirmed_at: null }, undefined, now).signals).toHaveLength(1);
  });
  it("does not interpret missing verification data as unverified", () => {
    expect(getMemberInsights({ ...member, email_confirmed_at: undefined }, undefined, now).signals).toEqual([]);
  });
  it("requires meaningful volume before flagging delivery failures", () => {
    const usage = { notifications: [{ channel: "email", status: "failed", total: 2 }] } as MemberUsage;
    expect(getMemberInsights(member, usage, now).signals).toEqual([]);
    usage.notifications[0].total = 12;
    expect(getMemberInsights(member, usage, now).signals[0]).toContain("consent settings");
  });
  it("rejects an unset webhook secret, including Bearer undefined", () => {
    const request = new Request("https://example.test", { headers: { authorization: "Bearer undefined" } });
    expect(hasBearerSecret(request, undefined)).toBe(false);
    expect(hasBearerSecret(request, "secret")).toBe(false);
    expect(hasBearerSecret(new Request("https://example.test", { headers: { authorization: "Bearer secret" } }), "secret")).toBe(true);
  });
});
