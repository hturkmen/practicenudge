import { SupabaseClient } from "@supabase/supabase-js";
import type { AdminActionType } from "@/lib/types/admin";

/**
 * Logs an administrative action to the admin_audit_logs table.
 */
export async function logAdminAction(
  supabase: SupabaseClient,
  adminUserId: string,
  targetId: string,
  targetEntityType: "member" | "firm",
  actionType: AdminActionType,
  details?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from("admin_audit_logs").insert({
    admin_user_id: adminUserId,
    target_entity_id: targetId,
    target_entity_type: targetEntityType,
    action_type: actionType,
    details: details ?? {},
  });

  if (error) {
    throw new Error(`Failed to log admin action: ${error.message}`);
  }
}

/**
 * Updates a member's role in the firm_users table and logs an audit entry.
 */
export async function updateMemberRole(
  supabase: SupabaseClient,
  memberId: string,
  newRole: string,
  adminUserId: string
): Promise<void> {
  // Get the current role for audit logging
  const { data: currentMember, error: fetchError } = await supabase
    .from("firm_users")
    .select("role")
    .eq("id", memberId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch member: ${fetchError.message}`);
  }

  const previousRole = currentMember.role;

  // Update the role
  const { error: updateError } = await supabase
    .from("firm_users")
    .update({ role: newRole })
    .eq("id", memberId);

  if (updateError) {
    throw new Error(`Failed to update member role: ${updateError.message}`);
  }

  // Log the audit entry
  await logAdminAction(supabase, adminUserId, memberId, "member", "role_change", {
    previous_role: previousRole,
    new_role: newRole,
  });
}

/**
 * Updates a firm's plan, creates a subscription_history entry, and logs an audit entry.
 */
export async function updateFirmPlan(
  supabase: SupabaseClient,
  firmId: string,
  newPlan: string,
  adminUserId: string
): Promise<void> {
  // Get the current plan for history tracking
  const { data: currentFirm, error: fetchError } = await supabase
    .from("firms")
    .select("plan")
    .eq("id", firmId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch firm: ${fetchError.message}`);
  }

  const previousPlan = currentFirm.plan;

  // Update the firm's plan
  const { error: updateError } = await supabase
    .from("firms")
    .update({ plan: newPlan })
    .eq("id", firmId);

  if (updateError) {
    throw new Error(`Failed to update firm plan: ${updateError.message}`);
  }

  // Create subscription history entry
  const { error: historyError } = await supabase
    .from("subscription_history")
    .insert({
      firm_id: firmId,
      previous_plan: previousPlan,
      new_plan: newPlan,
      changed_by: adminUserId,
    });

  if (historyError) {
    throw new Error(
      `Failed to create subscription history: ${historyError.message}`
    );
  }

  // Log the audit entry
  await logAdminAction(supabase, adminUserId, firmId, "firm", "plan_change", {
    previous_plan: previousPlan,
    new_plan: newPlan,
  });
}

/**
 * Suspends a member by setting their firm_users status to 'suspended'.
 * Returns a warning string if the member is the last owner of their firm.
 */
export async function suspendMember(
  supabase: SupabaseClient,
  memberId: string,
  adminUserId: string
): Promise<{ warning?: string }> {
  // Get the member's firm_id and role
  const { data: member, error: fetchError } = await supabase
    .from("firm_users")
    .select("firm_id, role")
    .eq("id", memberId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch member: ${fetchError.message}`);
  }

  let warning: string | undefined;

  // Check if this is the last owner of the firm
  if (member.role === "owner") {
    const { count, error: countError } = await supabase
      .from("firm_users")
      .select("id", { count: "exact", head: true })
      .eq("firm_id", member.firm_id)
      .eq("role", "owner")
      .neq("id", memberId)
      .eq("status", "active");

    if (countError) {
      throw new Error(
        `Failed to check owner count: ${countError.message}`
      );
    }

    if (count === 0) {
      warning = "This is the last owner of the firm";
    }
  }

  // Suspend the member
  const { error: updateError } = await supabase
    .from("firm_users")
    .update({ status: "suspended" })
    .eq("id", memberId);

  if (updateError) {
    throw new Error(`Failed to suspend member: ${updateError.message}`);
  }

  // Log the audit entry
  await logAdminAction(supabase, adminUserId, memberId, "member", "suspend", {
    firm_id: member.firm_id,
    role: member.role,
  });

  return { warning };
}

/**
 * Reactivates a suspended member by setting their firm_users status to 'active'.
 */
export async function reactivateMember(
  supabase: SupabaseClient,
  memberId: string,
  adminUserId: string
): Promise<void> {
  // Get the member's firm_id for audit details
  const { data: member, error: fetchError } = await supabase
    .from("firm_users")
    .select("firm_id, role")
    .eq("id", memberId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch member: ${fetchError.message}`);
  }

  // Reactivate the member
  const { error: updateError } = await supabase
    .from("firm_users")
    .update({ status: "active" })
    .eq("id", memberId);

  if (updateError) {
    throw new Error(`Failed to reactivate member: ${updateError.message}`);
  }

  // Log the audit entry
  await logAdminAction(
    supabase,
    adminUserId,
    memberId,
    "member",
    "reactivate",
    {
      firm_id: member.firm_id,
      role: member.role,
    }
  );
}


/**
 * Suspends a firm by setting its status to 'suspended' and puts all active
 * document requests on hold.
 */
export async function suspendFirm(
  supabase: SupabaseClient,
  firmId: string,
  adminUserId: string
): Promise<void> {
  // Suspend all firm members
  const { error: membersError } = await supabase
    .from("firm_users")
    .update({ status: "suspended" })
    .eq("firm_id", firmId)
    .eq("status", "active");

  if (membersError) {
    throw new Error(`Failed to suspend firm members: ${membersError.message}`);
  }

  // Put all active document requests on hold
  const { error: requestsError } = await supabase
    .from("document_requests")
    .update({ status: "on_hold" })
    .eq("firm_id", firmId)
    .in("status", ["pending", "in_progress", "overdue"]);

  if (requestsError) {
    throw new Error(`Failed to hold firm requests: ${requestsError.message}`);
  }

  // Put all active clients on hold
  const { error: clientsError } = await supabase
    .from("clients")
    .update({ status: "on_hold" })
    .eq("firm_id", firmId)
    .eq("status", "active");

  if (clientsError) {
    throw new Error(`Failed to hold firm clients: ${clientsError.message}`);
  }

  // Log the audit entry
  await logAdminAction(supabase, adminUserId, firmId, "firm", "suspend", {
    action: "firm_suspended",
  });
}

/**
 * Reactivates a suspended firm by restoring clients and requests.
 */
export async function reactivateFirm(
  supabase: SupabaseClient,
  firmId: string,
  adminUserId: string
): Promise<void> {
  // Reactivate suspended firm members
  const { error: membersError } = await supabase
    .from("firm_users")
    .update({ status: "active" })
    .eq("firm_id", firmId)
    .eq("status", "suspended");

  if (membersError) {
    throw new Error(`Failed to reactivate firm members: ${membersError.message}`);
  }

  // Reactivate on_hold clients
  const { error: clientsError } = await supabase
    .from("clients")
    .update({ status: "active" })
    .eq("firm_id", firmId)
    .eq("status", "on_hold");

  if (clientsError) {
    throw new Error(`Failed to reactivate firm clients: ${clientsError.message}`);
  }

  // Restore on_hold requests to pending
  const { error: requestsError } = await supabase
    .from("document_requests")
    .update({ status: "pending" })
    .eq("firm_id", firmId)
    .eq("status", "on_hold");

  if (requestsError) {
    throw new Error(`Failed to reactivate firm requests: ${requestsError.message}`);
  }

  // Log the audit entry
  await logAdminAction(supabase, adminUserId, firmId, "firm", "reactivate", {
    action: "firm_reactivated",
  });
}
