import { describe, expect, it } from "vitest";
import { buildDemoData, demoPdf, summarise, uuidFrom, DEMO_EMAIL_DOMAIN, CLIENT_EMAIL_DOMAIN } from "./demo-data.mjs";

const NOW = new Date("2026-10-07T10:00:00Z");
const build = (now = NOW) => buildDemoData({ firmId: uuidFrom("test-firm"), ownerUserId: uuidFrom("owner"), notificationTypeId: uuidFrom("type"), now, fileUrl: "http://127.0.0.1/sample.pdf" });

const CLIENT_STATUS = ["active", "inactive", "archived", "on_hold"];
const CLIENT_TYPE = ["sole_trader", "landlord", "limited_company", "partnership"];
const REQUEST_STATUS = ["pending", "in_progress", "completed", "overdue", "on_hold", "cancelled"];
const ITEM_STATUS = ["pending", "uploaded", "approved", "rejected"];
const REMINDER_STATUS = ["sent", "delivered", "failed", "bounced"];
const NOTIFICATION_STATUS = ["queued", "sent", "delivered", "failed", "stopped"];

describe("demo data", () => {
  const data = build();

  it("is deterministic", () => {
    expect(JSON.stringify(build())).toBe(JSON.stringify(data));
    expect(JSON.stringify(build(new Date("2026-10-08T10:00:00Z")))).not.toBe(JSON.stringify(data));
  });

  it("respects the database constraints", () => {
    for (const c of data.clients) {
      expect(CLIENT_STATUS).toContain(c.status);
      expect(CLIENT_TYPE).toContain(c.client_type);
      expect([null, "50k", "30k", "20k", "below"]).toContain(c.mtd_threshold);
      expect(c.tax_reference).toMatch(/^\d{10}$/);
    }
    for (const r of data.requests) expect(REQUEST_STATUS).toContain(r.status);
    for (const i of data.items) expect(ITEM_STATUS).toContain(i.status);
    for (const r of data.reminderLogs) {
      expect(REMINDER_STATUS).toContain(r.status);
      expect(["email", "sms"]).toContain(r.channel);
    }
    for (const n of data.notificationLogs) expect(NOTIFICATION_STATUS).toContain(n.status);
    for (const c of data.consents) expect(["pending", "accepted", "rejected"]).toContain(c.status);
  });

  it("has unique ids, emails and tokens, and consistent references", () => {
    const ids = [...data.clients, ...data.requests, ...data.items, ...data.reminderLogs, ...data.notificationLogs, ...data.activityLogs, ...data.consents, ...data.templates].map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(data.clients.map((c) => c.email)).size).toBe(data.clients.length);
    expect(new Set(data.requests.map((r) => r.magic_token)).size).toBe(data.requests.length);
    const clientIds = new Set(data.clients.map((c) => c.id));
    const requestIds = new Set(data.requests.map((r) => r.id));
    for (const r of data.requests) expect(clientIds.has(r.client_id)).toBe(true);
    for (const i of data.items) expect(requestIds.has(i.request_id)).toBe(true);
    for (const r of data.reminderLogs) expect(requestIds.has(r.request_id)).toBe(true);
    for (const a of data.activityLogs) {
      expect(clientIds.has(a.client_id)).toBe(true);
      if (a.request_id) expect(requestIds.has(a.request_id)).toBe(true);
    }
  });

  it("can never reach a real person", () => {
    for (const c of data.clients) {
      expect(c.email.endsWith(".test")).toBe(true);
      expect(c.phone).toMatch(/^\+44 7700 900\d{3}$/);
    }
    expect(CLIENT_EMAIL_DOMAIN.endsWith(".test")).toBe(true);
    expect(DEMO_EMAIL_DOMAIN.endsWith(".test")).toBe(true);
    for (const n of data.notificationLogs) if (n.channel === "email") expect(n.recipient_address.endsWith(".test")).toBe(true);
  });

  it("shows a believable week on the dashboard", () => {
    const s = summarise(data);
    expect(s.clients).toBe(42);
    expect(s.requestStatus.overdue).toBe(6);
    expect(s.requestStatus.completed).toBeGreaterThanOrEqual(9);
    expect(s.requestStatus.pending + s.requestStatus.in_progress).toBeGreaterThanOrEqual(20);
    const today = NOW.toISOString().slice(0, 10);
    const week = new Date(NOW.getTime() + 7 * 86_400_000).toISOString().slice(0, 10);
    const dueThisWeek = data.requests.filter((r) => ["pending", "in_progress"].includes(r.status) && r.deadline >= today && r.deadline <= week);
    expect(dueThisWeek.length).toBeGreaterThanOrEqual(4);
    for (const r of data.requests.filter((x) => x.status === "overdue")) expect(r.deadline < today).toBe(true);
    const lastDay = data.activityLogs.filter((a) => Date.parse(a.created_at) > NOW.getTime() - 86_400_000);
    expect(lastDay.length).toBeGreaterThan(0);
    expect(data.activityLogs.every((a) => Date.parse(a.created_at) <= NOW.getTime())).toBe(true);
  });

  it("keeps request and item states consistent", () => {
    for (const r of data.requests) {
      const rows = data.items.filter((i) => i.request_id === r.id);
      expect(rows.length).toBeGreaterThanOrEqual(4);
      if (r.status === "completed") {
        expect(rows.every((i) => i.status === "approved")).toBe(true);
        expect(r.completed_at).not.toBeNull();
      } else {
        expect(r.completed_at).toBeNull();
        expect(rows.some((i) => i.status === "pending")).toBe(true);
      }
      if (r.status === "pending") expect(rows.every((i) => i.status === "pending")).toBe(true);
      expect(r.reminder_count).toBe(data.reminderLogs.filter((l) => l.request_id === r.id).length);
      for (const i of rows) {
        expect(Boolean(i.uploaded_at)).toBe(i.status !== "pending");
        if (i.uploaded_at) expect(Date.parse(i.uploaded_at)).toBeGreaterThanOrEqual(Date.parse(r.created_at));
        if (i.reviewed_at) expect(Date.parse(i.reviewed_at)).toBeGreaterThanOrEqual(Date.parse(i.uploaded_at));
      }
    }
  });

  it("titles the work after the next quarterly deadline", () => {
    expect(data.requests.some((r) => r.title === "MTD update Q2 (Jul–Sep) 2026/27")).toBe(true);
    const later = build(new Date("2026-11-20T10:00:00Z"));
    expect(later.requests.some((r) => r.title === "MTD update Q3 (Oct–Dec) 2026/27")).toBe(true);
  });
});

describe("sample file", () => {
  it("is a well-formed PDF", () => {
    const text = demoPdf().toString("latin1");
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
    const startxref = Number(text.match(/startxref\n(\d+)/)[1]);
    expect(text.slice(startxref, startxref + 4)).toBe("xref");
  });
});
