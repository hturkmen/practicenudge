import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireSuperAdmin } from "@/lib/admin/require-admin";
import { getLifecycle } from "@/lib/admin/queries";
import { MARKETING_BASES, OVERRIDABLE_STAGES, VERDICTS } from "@/lib/admin/lifecycle";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET() {
  const auth = await requireSuperAdmin();
  if ("response" in auth) return auth.response;
  try {
    return NextResponse.json(await getLifecycle(createServiceClient()), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: "QUERY_ERROR", message: error instanceof Error ? error.message : "Failed to load lifecycle" },
      { status: 500 }
    );
  }
}

const VALUE_RULES: Record<string, (value: unknown) => boolean> = {
  verdict: (v) => (VERDICTS as readonly unknown[]).includes(v),
  stage_override: (v) => v === null || (OVERRIDABLE_STAGES as readonly unknown[]).includes(v),
  pause: (v) => v === "true" || v === "false",
  basis: (v) => (MARKETING_BASES as readonly unknown[]).includes(v),
  replied: (v) => v === null,
};

/** Records an admin decision about a contact; the database writes the audit entry in the same transaction. */
export async function PATCH(request: Request) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) return auth.response;

  let body: { member_id?: unknown; lead_id?: unknown; action?: unknown; value?: unknown; reason?: unknown };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "VALIDATION_ERROR", message: "Invalid JSON body" }, { status: 400 });
  }
  const memberId = typeof body.member_id === "string" && UUID.test(body.member_id) ? body.member_id : null;
  const leadId = typeof body.lead_id === "string" && UUID.test(body.lead_id) ? body.lead_id : null;
  if (!memberId && !leadId) {
    return NextResponse.json({ error: "VALIDATION_ERROR", message: "member_id or lead_id is required" }, { status: 400 });
  }
  const reason = body.reason === undefined || body.reason === null ? null
    : typeof body.reason === "string" && body.reason.length <= 500 ? body.reason : undefined;
  if (reason === undefined) {
    return NextResponse.json({ error: "VALIDATION_ERROR", message: "reason must be text of at most 500 characters" }, { status: 400 });
  }
  const rule = typeof body.action === "string" ? VALUE_RULES[body.action] : undefined;
  if (!rule || !rule(body.value)) {
    return NextResponse.json({ error: "VALIDATION_ERROR", message: "Invalid action or value" }, { status: 400 });
  }
  if (body.action === "basis" && body.value !== "none" && !reason?.trim()) {
    return NextResponse.json({ error: "VALIDATION_ERROR", message: "Add a note saying where this basis comes from" }, { status: 400 });
  }

  const { data, error } = await createServiceClient().rpc("admin_update_contact", {
    p_admin: auth.userId, p_member_id: memberId, p_lead_id: leadId,
    p_action: body.action, p_value: body.value, p_reason: reason,
  });
  if (error) {
    if (error.code === "P0002") return NextResponse.json({ error: "NOT_FOUND", message: "Contact not found" }, { status: 404 });
    if (error.code === "22023" || error.code === "23514") {
      return NextResponse.json({ error: "VALIDATION_ERROR", message: "The database rejected this value" }, { status: 400 });
    }
    console.error("[lifecycle] Contact update failed", error.code);
    return NextResponse.json({ error: "UPDATE_FAILED", message: "Contact could not be updated" }, { status: 500 });
  }
  return NextResponse.json({ success: true, contact: data });
}
