import { describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { getMembers } from "../queries";

describe("member query pagination and search", () => {
  it("sends identity search, firm/plan filters and pagination to the same server query", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: "match-on-page-two", name: "Jane", email: "jane@example.test" }]), {
      status: 200, headers: { "content-type": "application/json", "content-range": "20-20/21" },
    }));
    const db = createClient("https://example.supabase.co", "test", { global: { fetch: fetcher }, auth: { persistSession: false } });
    const result = await getMembers(db, { page: 2, search: "Jane", firm_id: "firm", plan: "pro", sort_by: "name" });
    const url = new URL(String(fetcher.mock.calls[0][0]));
    expect(url.pathname).toBe("/rest/v1/admin_member_overview");
    expect(url.searchParams.get("or")).toContain("email.ilike.%Jane%");
    expect(url.searchParams.get("firm_id")).toBe("eq.firm");
    expect(url.searchParams.get("plan")).toBe("eq.pro");
    expect(url.searchParams.get("offset")).toBe("20");
    expect(url.searchParams.get("order")).toBe("name.desc.nullslast,id.asc");
    expect(result.pagination.total).toBe(21);
    expect(result.pagination.total_pages).toBe(2);
    expect(result.data[0].email).toBe("jane@example.test");
  });
  it("reports data failures instead of an empty membership list", async () => {
    const db = createClient("https://example.supabase.co", "test", { global: { fetch: async () => new Response('{"message":"view missing"}', { status: 400 }) }, auth: { persistSession: false } });
    await expect(getMembers(db, {})).rejects.toThrow("view missing");
  });
});
