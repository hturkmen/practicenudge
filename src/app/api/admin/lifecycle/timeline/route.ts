import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireSuperAdmin } from "@/lib/admin/require-admin";
import { getContactTimeline } from "@/lib/admin/queries";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) return auth.response;
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("member_id") || undefined;
  const leadId = searchParams.get("lead_id") || undefined;
  if ((!memberId && !leadId) || (memberId && !UUID.test(memberId)) || (leadId && !UUID.test(leadId))) {
    return NextResponse.json({ error: "VALIDATION_ERROR", message: "A valid member_id or lead_id is required" }, { status: 400 });
  }
  try {
    const result = await getContactTimeline(createServiceClient(), { member_id: memberId, lead_id: leadId });
    if (!result) return NextResponse.json({ error: "NOT_FOUND", message: "Contact not found" }, { status: 404 });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: "QUERY_ERROR", message: error instanceof Error ? error.message : "Failed to load timeline" },
      { status: 500 }
    );
  }
}
