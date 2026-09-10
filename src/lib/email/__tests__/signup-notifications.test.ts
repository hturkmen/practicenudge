import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
const mocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("resend", () => ({ Resend: class { emails = { send: mocks.send }; } }));
import { processSignupNotifications } from "../signup-notifications";
const message = { from: "system@example.test", to: ["admin@example.test"], subject: "Signup", text: "Review member" };
function database() {
  const updates: Record<string, unknown>[] = [];
  const rpc = vi.fn().mockResolvedValue({ data: [{ id: "event", member_id: "member", kind: "admin_registration", attempts: 1, lock_token: "lock", message }], error: null });
  const query = { eq: () => query, select: () => query,
    maybeSingle: async () => ({ data: { id: "event" }, error: null }),
    then: (resolve: (value: unknown) => void) => Promise.resolve({ error: null }).then(resolve) };
  return { updates, rpc, db: { rpc, from: () => ({ update: (value: Record<string, unknown>) => { updates.push(value); return query; } }) } as unknown as SupabaseClient };
}
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("RESEND_API_KEY", "test-only"); });
describe("durable admin email delivery", () => {
  it("does not consume attempts when email credentials are absent", async () => {
    vi.stubEnv("RESEND_API_KEY", ""); const { db, rpc } = database();
    expect((await processSignupNotifications(db)).configured).toBe(false);
    expect(rpc).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
  });
  it("records provider error responses as failures even when send does not throw", async () => {
    mocks.send.mockResolvedValue({ data: null, error: { message: "Rate limited" } });
    const { db, updates } = database();
    expect((await processSignupNotifications(db)).sent).toBe(0);
    expect(updates.some(u => u.status === "sent")).toBe(false);
    expect(updates[0].status).toBe("failed");
  });
  it("keeps the same payload and idempotency key across delivery attempts", async () => {
    mocks.send.mockResolvedValue({ data: { id: "provider-id" }, error: null });
    const { db, updates } = database();
    expect((await processSignupNotifications(db)).sent).toBe(1);
    await processSignupNotifications(db);
    for (const call of mocks.send.mock.calls) expect(call).toEqual([message, { idempotencyKey: "admin-signup/event" }]);
    expect(updates[0].provider_message_id).toBe("provider-id");
  });
  it("does not claim success for an empty provider response", async () => {
    mocks.send.mockResolvedValue({ data: null, error: null });
    const { db, updates } = database();
    expect((await processSignupNotifications(db)).failed).toBe(1);
    expect(updates[0].status).toBe("failed");
  });
});
