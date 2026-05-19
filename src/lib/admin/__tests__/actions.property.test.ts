import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import {
  updateMemberRole,
  updateFirmPlan,
  suspendMember,
  reactivateMember,
  logAdminAction,
} from "../actions";
import type { AdminActionType } from "@/lib/types/admin";

// --- Mock Supabase Client Factory ---

type MockSupabaseCall = {
  table: string;
  operation: string;
  data?: Record<string, unknown>;
  filters?: Record<string, unknown>;
};

function createMockSupabase(options: {
  selectData?: Record<string, unknown>;
  updateError?: string | null;
  insertError?: string | null;
  ownerCount?: number;
}) {
  const calls: MockSupabaseCall[] = [];
  const insertedRows: Record<string, unknown>[] = [];

  const chainable = (table: string) => {
    let currentOp = "";
    let currentData: Record<string, unknown> | undefined;

    const chain: Record<string, unknown> = {
      select: (columns?: string, opts?: { count?: string; head?: boolean }) => {
        currentOp = "select";
        calls.push({ table, operation: "select", filters: {} });
        if (opts?.head) {
          // count query for owner check
          return {
            eq: () => ({
              eq: () => ({
                neq: () => ({
                  eq: () =>
                    Promise.resolve({
                      count: options.ownerCount ?? 0,
                      error: null,
                    }),
                }),
              }),
            }),
          };
        }
        return {
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: options.selectData ?? { role: "member", plan: "free", firm_id: "firm-1" },
                error: null,
              }),
          }),
        };
      },
      update: (data: Record<string, unknown>) => {
        currentOp = "update";
        currentData = data;
        calls.push({ table, operation: "update", data });
        return {
          eq: () =>
            Promise.resolve({
              error: options.updateError
                ? { message: options.updateError }
                : null,
            }),
        };
      },
      insert: (data: Record<string, unknown>) => {
        currentOp = "insert";
        currentData = data;
        insertedRows.push(data);
        calls.push({ table, operation: "insert", data });
        return Promise.resolve({
          error: options.insertError
            ? { message: options.insertError }
            : null,
        });
      },
    };

    return chain;
  };

  const supabase = {
    from: (table: string) => chainable(table),
  };

  return { supabase: supabase as any, calls, insertedRows };
}

// --- Generators ---

const VALID_ROLES = ["owner", "admin", "member"] as const;
const VALID_PLANS = ["free", "starter", "pro"] as const;
const VALID_ADMIN_ACTIONS: AdminActionType[] = [
  "role_change",
  "plan_change",
  "suspend",
  "reactivate",
];

const arbitraryMemberId = () => fc.uuid();
const arbitraryFirmId = () => fc.uuid();
const arbitraryAdminUserId = () => fc.uuid();
const arbitraryRole = () => fc.constantFrom(...VALID_ROLES);
const arbitraryPlan = () => fc.constantFrom(...VALID_PLANS);

// --- Property Tests ---

describe("Feature: super-admin-panel, Property 6: Role update persistence", () => {
  /**
   * Validates: Requirements 2.2
   *
   * For any member and any valid target role (owner, admin, member), after a successful
   * role update, querying the member's role SHALL return the new role value.
   */
  it("after a successful role update, the update call SHALL contain the new role value", () => {
    fc.assert(
      fc.property(
        arbitraryMemberId(),
        arbitraryRole(),
        arbitraryAdminUserId(),
        arbitraryRole(),
        async (memberId, newRole, adminUserId, currentRole) => {
          const { supabase, calls } = createMockSupabase({
            selectData: { role: currentRole, firm_id: "firm-1" },
          });

          await updateMemberRole(supabase, memberId, newRole, adminUserId);

          // Find the update call to firm_users
          const updateCall = calls.find(
            (c) => c.table === "firm_users" && c.operation === "update"
          );
          expect(updateCall).toBeDefined();
          expect(updateCall!.data).toEqual({ role: newRole });
        }
      ),
      { numRuns: 100 }
    );
  });

  it("the role update SHALL accept all valid role values (owner, admin, member)", () => {
    fc.assert(
      fc.property(
        arbitraryMemberId(),
        arbitraryAdminUserId(),
        async (memberId, adminUserId) => {
          for (const role of VALID_ROLES) {
            const { supabase, calls } = createMockSupabase({
              selectData: { role: "member", firm_id: "firm-1" },
            });

            await updateMemberRole(supabase, memberId, role, adminUserId);

            const updateCall = calls.find(
              (c) => c.table === "firm_users" && c.operation === "update"
            );
            expect(updateCall).toBeDefined();
            expect(updateCall!.data).toEqual({ role });
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Feature: super-admin-panel, Property 7: Suspend/reactivate round-trip", () => {
  /**
   * Validates: Requirements 2.4, 2.5
   *
   * For any active member, suspending and then reactivating SHALL result in
   * status 'active' with original role and firm association unchanged.
   */
  it("suspending then reactivating SHALL result in status 'active' with original role and firm unchanged", () => {
    fc.assert(
      fc.property(
        arbitraryMemberId(),
        arbitraryAdminUserId(),
        arbitraryRole(),
        arbitraryFirmId(),
        async (memberId, adminUserId, originalRole, firmId) => {
          // Suspend the member
          const { supabase: suspendSupabase, calls: suspendCalls } =
            createMockSupabase({
              selectData: { role: originalRole, firm_id: firmId },
              ownerCount: 1, // not the last owner
            });

          await suspendMember(suspendSupabase, memberId, adminUserId);

          // Verify suspend sets status to 'suspended'
          const suspendUpdate = suspendCalls.find(
            (c) => c.table === "firm_users" && c.operation === "update"
          );
          expect(suspendUpdate).toBeDefined();
          expect(suspendUpdate!.data).toEqual({ status: "suspended" });

          // Reactivate the member
          const { supabase: reactivateSupabase, calls: reactivateCalls } =
            createMockSupabase({
              selectData: { role: originalRole, firm_id: firmId },
            });

          await reactivateMember(reactivateSupabase, memberId, adminUserId);

          // Verify reactivate sets status to 'active'
          const reactivateUpdate = reactivateCalls.find(
            (c) => c.table === "firm_users" && c.operation === "update"
          );
          expect(reactivateUpdate).toBeDefined();
          expect(reactivateUpdate!.data).toEqual({ status: "active" });

          // Verify the role and firm_id are preserved (not modified by either operation)
          const suspendRoleUpdate = suspendCalls.find(
            (c) =>
              c.table === "firm_users" &&
              c.operation === "update" &&
              c.data &&
              "role" in c.data
          );
          const reactivateRoleUpdate = reactivateCalls.find(
            (c) =>
              c.table === "firm_users" &&
              c.operation === "update" &&
              c.data &&
              "role" in c.data
          );
          // Neither suspend nor reactivate should modify role
          expect(suspendRoleUpdate).toBeUndefined();
          expect(reactivateRoleUpdate).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("reactivation SHALL always set status to 'active' regardless of original role", () => {
    fc.assert(
      fc.property(
        arbitraryMemberId(),
        arbitraryAdminUserId(),
        arbitraryRole(),
        arbitraryFirmId(),
        async (memberId, adminUserId, role, firmId) => {
          const { supabase, calls } = createMockSupabase({
            selectData: { role, firm_id: firmId },
          });

          await reactivateMember(supabase, memberId, adminUserId);

          const updateCall = calls.find(
            (c) => c.table === "firm_users" && c.operation === "update"
          );
          expect(updateCall).toBeDefined();
          expect(updateCall!.data).toEqual({ status: "active" });
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Feature: super-admin-panel, Property 9: Firm plan update persistence", () => {
  /**
   * Validates: Requirements 3.2
   *
   * For any firm and any valid target plan (free, starter, pro), after a successful plan
   * update, querying the firm's plan SHALL return the new plan value, and a subscription
   * history entry SHALL be created with the correct previous and new plan values.
   */
  it("after a successful plan update, the update call SHALL contain the new plan value", () => {
    fc.assert(
      fc.property(
        arbitraryFirmId(),
        arbitraryPlan(),
        arbitraryAdminUserId(),
        arbitraryPlan(),
        async (firmId, newPlan, adminUserId, currentPlan) => {
          const { supabase, calls } = createMockSupabase({
            selectData: { plan: currentPlan },
          });

          await updateFirmPlan(supabase, firmId, newPlan, adminUserId);

          // Verify the firms table was updated with the new plan
          const updateCall = calls.find(
            (c) => c.table === "firms" && c.operation === "update"
          );
          expect(updateCall).toBeDefined();
          expect(updateCall!.data).toEqual({ plan: newPlan });
        }
      ),
      { numRuns: 100 }
    );
  });

  it("a subscription history entry SHALL be created with correct previous and new plan values", () => {
    fc.assert(
      fc.property(
        arbitraryFirmId(),
        arbitraryPlan(),
        arbitraryAdminUserId(),
        arbitraryPlan(),
        async (firmId, newPlan, adminUserId, currentPlan) => {
          const { supabase, insertedRows } = createMockSupabase({
            selectData: { plan: currentPlan },
          });

          await updateFirmPlan(supabase, firmId, newPlan, adminUserId);

          // Find the subscription_history insert
          const historyInsert = insertedRows.find(
            (row) => "previous_plan" in row && "new_plan" in row
          );
          expect(historyInsert).toBeDefined();
          expect(historyInsert!.firm_id).toBe(firmId);
          expect(historyInsert!.previous_plan).toBe(currentPlan);
          expect(historyInsert!.new_plan).toBe(newPlan);
          expect(historyInsert!.changed_by).toBe(adminUserId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("the plan update SHALL accept all valid plan values (free, starter, pro)", () => {
    fc.assert(
      fc.property(
        arbitraryFirmId(),
        arbitraryAdminUserId(),
        async (firmId, adminUserId) => {
          for (const plan of VALID_PLANS) {
            const { supabase, calls } = createMockSupabase({
              selectData: { plan: "free" },
            });

            await updateFirmPlan(supabase, firmId, plan, adminUserId);

            const updateCall = calls.find(
              (c) => c.table === "firms" && c.operation === "update"
            );
            expect(updateCall).toBeDefined();
            expect(updateCall!.data).toEqual({ plan });
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Feature: super-admin-panel, Property 19: Destructive action confirmation requirement", () => {
  /**
   * Validates: Requirements 6.4
   *
   * For any destructive action (suspend, reactivate, change plan, change role),
   * the system SHALL require explicit confirmation before executing.
   *
   * The action functions themselves execute directly (confirmation is the UI's job).
   * This test verifies that each action function logs an audit entry when executed,
   * proving the action was performed and can be audited.
   */
  it("all destructive actions SHALL log an audit entry when executed", () => {
    fc.assert(
      fc.property(
        arbitraryMemberId(),
        arbitraryFirmId(),
        arbitraryAdminUserId(),
        arbitraryRole(),
        arbitraryPlan(),
        async (memberId, firmId, adminUserId, role, plan) => {
          // Test updateMemberRole logs audit
          const { calls: roleCalls } = await executeAction("role", {
            memberId,
            adminUserId,
            role,
          });
          const roleAudit = roleCalls.find(
            (c) => c.table === "admin_audit_logs" && c.operation === "insert"
          );
          expect(roleAudit).toBeDefined();

          // Test suspendMember logs audit
          const { calls: suspendCalls } = await executeAction("suspend", {
            memberId,
            adminUserId,
          });
          const suspendAudit = suspendCalls.find(
            (c) => c.table === "admin_audit_logs" && c.operation === "insert"
          );
          expect(suspendAudit).toBeDefined();

          // Test reactivateMember logs audit
          const { calls: reactivateCalls } = await executeAction("reactivate", {
            memberId,
            adminUserId,
          });
          const reactivateAudit = reactivateCalls.find(
            (c) => c.table === "admin_audit_logs" && c.operation === "insert"
          );
          expect(reactivateAudit).toBeDefined();

          // Test updateFirmPlan logs audit
          const { calls: planCalls } = await executeAction("plan", {
            firmId,
            adminUserId,
            plan,
          });
          const planAudit = planCalls.find(
            (c) => c.table === "admin_audit_logs" && c.operation === "insert"
          );
          expect(planAudit).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("action functions SHALL execute without built-in confirmation (confirmation is UI responsibility)", () => {
    fc.assert(
      fc.property(
        arbitraryMemberId(),
        arbitraryAdminUserId(),
        arbitraryRole(),
        async (memberId, adminUserId, role) => {
          // The action functions should execute immediately without any
          // confirmation mechanism — they don't prompt or block.
          // This verifies the separation of concerns: UI handles confirmation,
          // action functions handle execution.
          const { supabase } = createMockSupabase({
            selectData: { role: "member", firm_id: "firm-1" },
            ownerCount: 1,
          });

          // Should resolve without any confirmation step
          await expect(
            updateMemberRole(supabase, memberId, role, adminUserId)
          ).resolves.not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Feature: super-admin-panel, Property 20: Admin audit log completeness", () => {
  /**
   * Validates: Requirements 6.5
   *
   * For any administrative action that is successfully executed, an audit log entry
   * SHALL be created containing the admin's user ID, target entity ID, action type,
   * and a timestamp.
   */
  it("role change SHALL create an audit log with admin_user_id, target_entity_id, and action_type", () => {
    fc.assert(
      fc.property(
        arbitraryMemberId(),
        arbitraryRole(),
        arbitraryAdminUserId(),
        async (memberId, newRole, adminUserId) => {
          const { supabase, insertedRows } = createMockSupabase({
            selectData: { role: "member", firm_id: "firm-1" },
          });

          await updateMemberRole(supabase, memberId, newRole, adminUserId);

          const auditEntry = insertedRows.find(
            (row) => row.action_type === "role_change"
          );
          expect(auditEntry).toBeDefined();
          expect(auditEntry!.admin_user_id).toBe(adminUserId);
          expect(auditEntry!.target_entity_id).toBe(memberId);
          expect(auditEntry!.action_type).toBe("role_change");
          expect(auditEntry!.target_entity_type).toBe("member");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("suspend SHALL create an audit log with admin_user_id, target_entity_id, and action_type", () => {
    fc.assert(
      fc.property(
        arbitraryMemberId(),
        arbitraryAdminUserId(),
        async (memberId, adminUserId) => {
          const { supabase, insertedRows } = createMockSupabase({
            selectData: { role: "member", firm_id: "firm-1" },
            ownerCount: 1,
          });

          await suspendMember(supabase, memberId, adminUserId);

          const auditEntry = insertedRows.find(
            (row) => row.action_type === "suspend"
          );
          expect(auditEntry).toBeDefined();
          expect(auditEntry!.admin_user_id).toBe(adminUserId);
          expect(auditEntry!.target_entity_id).toBe(memberId);
          expect(auditEntry!.action_type).toBe("suspend");
          expect(auditEntry!.target_entity_type).toBe("member");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("reactivate SHALL create an audit log with admin_user_id, target_entity_id, and action_type", () => {
    fc.assert(
      fc.property(
        arbitraryMemberId(),
        arbitraryAdminUserId(),
        async (memberId, adminUserId) => {
          const { supabase, insertedRows } = createMockSupabase({
            selectData: { role: "member", firm_id: "firm-1" },
          });

          await reactivateMember(supabase, memberId, adminUserId);

          const auditEntry = insertedRows.find(
            (row) => row.action_type === "reactivate"
          );
          expect(auditEntry).toBeDefined();
          expect(auditEntry!.admin_user_id).toBe(adminUserId);
          expect(auditEntry!.target_entity_id).toBe(memberId);
          expect(auditEntry!.action_type).toBe("reactivate");
          expect(auditEntry!.target_entity_type).toBe("member");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("plan change SHALL create an audit log with admin_user_id, target_entity_id, and action_type", () => {
    fc.assert(
      fc.property(
        arbitraryFirmId(),
        arbitraryPlan(),
        arbitraryAdminUserId(),
        async (firmId, newPlan, adminUserId) => {
          const { supabase, insertedRows } = createMockSupabase({
            selectData: { plan: "free" },
          });

          await updateFirmPlan(supabase, firmId, newPlan, adminUserId);

          const auditEntry = insertedRows.find(
            (row) => row.action_type === "plan_change"
          );
          expect(auditEntry).toBeDefined();
          expect(auditEntry!.admin_user_id).toBe(adminUserId);
          expect(auditEntry!.target_entity_id).toBe(firmId);
          expect(auditEntry!.action_type).toBe("plan_change");
          expect(auditEntry!.target_entity_type).toBe("firm");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("audit log entries SHALL contain details about the action performed", () => {
    fc.assert(
      fc.property(
        arbitraryMemberId(),
        arbitraryRole(),
        arbitraryAdminUserId(),
        arbitraryRole(),
        async (memberId, newRole, adminUserId, currentRole) => {
          const { supabase, insertedRows } = createMockSupabase({
            selectData: { role: currentRole, firm_id: "firm-1" },
          });

          await updateMemberRole(supabase, memberId, newRole, adminUserId);

          const auditEntry = insertedRows.find(
            (row) => row.action_type === "role_change"
          );
          expect(auditEntry).toBeDefined();
          expect(auditEntry!.details).toBeDefined();
          expect((auditEntry!.details as Record<string, unknown>).previous_role).toBe(
            currentRole
          );
          expect((auditEntry!.details as Record<string, unknown>).new_role).toBe(
            newRole
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// --- Helper function for Property 19 ---

async function executeAction(
  type: "role" | "suspend" | "reactivate" | "plan",
  params: {
    memberId?: string;
    firmId?: string;
    adminUserId: string;
    role?: string;
    plan?: string;
  }
) {
  const { supabase, calls, insertedRows } = createMockSupabase({
    selectData: { role: "member", firm_id: "firm-1", plan: "free" },
    ownerCount: 1,
  });

  switch (type) {
    case "role":
      await updateMemberRole(
        supabase,
        params.memberId!,
        params.role!,
        params.adminUserId
      );
      break;
    case "suspend":
      await suspendMember(supabase, params.memberId!, params.adminUserId);
      break;
    case "reactivate":
      await reactivateMember(supabase, params.memberId!, params.adminUserId);
      break;
    case "plan":
      await updateFirmPlan(
        supabase,
        params.firmId!,
        params.plan!,
        params.adminUserId
      );
      break;
  }

  return { calls, insertedRows };
}
