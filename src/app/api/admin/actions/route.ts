import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  updateMemberRole,
  updateFirmPlan,
  suspendMember,
  reactivateMember,
} from "@/lib/admin/actions";
import type { AdminActionRequest, AdminActionResponse } from "@/lib/types/admin";

export async function POST(request: Request) {
  const supabase = createClient();

  // 1. Authenticate the user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Authentication required" },
      { status: 401 }
    );
  }

  // 2. Verify super admin status
  const { data: adminRecord } = await supabase
    .from("super_admins")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRecord) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Super admin access required" },
      { status: 403 }
    );
  }

  // 3. Parse and validate request body
  let body: AdminActionRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const validActions = ["update_role", "update_plan", "suspend_member", "reactivate_member"];

  if (!body.action || !validActions.includes(body.action)) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Invalid action. Must be one of: update_role, update_plan, suspend_member, reactivate_member" },
      { status: 400 }
    );
  }

  if (!body.target_id) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "target_id is required" },
      { status: 400 }
    );
  }

  if ((body.action === "update_role" || body.action === "update_plan") && !body.value) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "value is required for update_role and update_plan actions" },
      { status: 400 }
    );
  }

  // 4. Route to appropriate action function
  try {
    let response: AdminActionResponse;

    switch (body.action) {
      case "update_role": {
        const validRoles = ["owner", "admin", "member"];
        if (!validRoles.includes(body.value!)) {
          return NextResponse.json(
            { error: "VALIDATION_ERROR", message: "Invalid role. Must be one of: owner, admin, member" },
            { status: 400 }
          );
        }
        await updateMemberRole(supabase, body.target_id, body.value!, user.id);
        response = { success: true, message: "Member role updated successfully" };
        break;
      }

      case "update_plan": {
        const validPlans = ["free", "starter", "pro"];
        if (!validPlans.includes(body.value!)) {
          return NextResponse.json(
            { error: "VALIDATION_ERROR", message: "Invalid plan. Must be one of: free, starter, pro" },
            { status: 400 }
          );
        }
        await updateFirmPlan(supabase, body.target_id, body.value!, user.id);
        response = { success: true, message: "Firm plan updated successfully" };
        break;
      }

      case "suspend_member": {
        const result = await suspendMember(supabase, body.target_id, user.id);
        response = {
          success: true,
          message: "Member suspended successfully",
          ...(result.warning && { warning: result.warning }),
        };
        break;
      }

      case "reactivate_member": {
        await reactivateMember(supabase, body.target_id, user.id);
        response = { success: true, message: "Member reactivated successfully" };
        break;
      }

      default:
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: "Unknown action" },
          { status: 400 }
        );
    }

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      { error: "UPDATE_FAILED", message },
      { status: 500 }
    );
  }
}
