import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireSuperAdmin } from "@/lib/admin/require-admin";
import { getOutreachMode } from "@/lib/outreach/config";
import { getTokenSecret } from "@/lib/outreach/tokens";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Sending status (secrets are reported only as set or not set) and the suppression list. */
export async function GET() {
  const auth = await requireSuperAdmin();
  if ("response" in auth) return auth.response;
  const { data, error } = await createServiceClient().from("outreach_suppressions")
    .select("id, email, reason, source, note, created_at").order("created_at", { ascending: false }).limit(500);
  if (error) {
    return NextResponse.json({ error: "QUERY_ERROR", message: "Suppression list could not be loaded. Check migration 017." }, { status: 500 });
  }
  return NextResponse.json({
    status: {
      mode: getOutreachMode(),
      token_secret_set: !!getTokenSecret(),
      webhook_secret_set: !!process.env.RESEND_WEBHOOK_SECRET?.startsWith("whsec_"),
    },
    suppressions: data || [],
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) return auth.response;
  let body: { email?: unknown; note?: unknown };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "VALIDATION_ERROR", message: "Invalid JSON body" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const note = typeof body.note === "string" ? body.note.slice(0, 500) : null;
  if (!EMAIL.test(email) || email.length > 254) {
    return NextResponse.json({ error: "VALIDATION_ERROR", message: "Enter a valid email address" }, { status: 400 });
  }
  const { error } = await createServiceClient().rpc("outreach_add_suppression", {
    p_email: email, p_reason: "manual", p_source: "admin", p_note: note, p_admin: auth.userId,
  });
  if (error) {
    console.error("[outreach] Manual suppression failed", error.code);
    return NextResponse.json({ error: "UPDATE_FAILED", message: "Address could not be suppressed" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

/** Only manual entries and bounces can be lifted; a person's own unsubscribe or complaint cannot. */
export async function DELETE(request: Request) {
  const auth = await requireSuperAdmin();
  if ("response" in auth) return auth.response;
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!UUID.test(id)) return NextResponse.json({ error: "VALIDATION_ERROR", message: "Invalid id" }, { status: 400 });
  const { error } = await createServiceClient().rpc("outreach_remove_suppression", { p_admin: auth.userId, p_suppression_id: id });
  if (error) {
    if (error.code === "P0002") {
      return NextResponse.json({ error: "NOT_ALLOWED", message: "Unsubscribes and complaints cannot be removed" }, { status: 409 });
    }
    console.error("[outreach] Suppression removal failed", error.code);
    return NextResponse.json({ error: "UPDATE_FAILED", message: "Suppression could not be removed" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
