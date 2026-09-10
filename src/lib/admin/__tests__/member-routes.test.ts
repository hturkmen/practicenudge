import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), adminRecord: vi.fn(), service: vi.fn(), detail: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: () => ({ auth: { getUser: mocks.getUser },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.adminRecord }) }) }) }) }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: mocks.service }));
vi.mock("@/lib/admin/queries", () => ({ getMemberDetail: mocks.detail }));
import { GET } from "@/app/api/admin/members/[id]/route";
const params = { params: { id: "00000000-0000-4000-a000-000000000001" } };
const request = new Request("https://example.test/api/admin/members/" + params.params.id);
beforeEach(() => vi.resetAllMocks());
describe("member detail authorisation", () => {
  it("rejects signed-out requests before creating privileged credentials", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    expect((await GET(request, params)).status).toBe(401);
    expect(mocks.service).not.toHaveBeenCalled();
  });
  it("rejects ordinary users before creating privileged credentials", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "ordinary" } } });
    mocks.adminRecord.mockResolvedValue({ data: null });
    expect((await GET(request, params)).status).toBe(403);
    expect(mocks.service).not.toHaveBeenCalled();
  });
  it("returns 404 for a missing member after checking admin access", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "admin" } } });
    mocks.adminRecord.mockResolvedValue({ data: { id: "admin-row" } });
    mocks.detail.mockResolvedValue(null);
    expect((await GET(request, params)).status).toBe(404);
  });
});
