import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { PROMPT_CONSENT_VERSION } from "@/lib/outreach/consent";

/** Asked once: firm owners with no recorded choice who are not part of the PracticeNudge team. */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ show: false }, { status: 401 });
  if (user.user_metadata?.marketing_prompt_answered_at || user.user_metadata?.marketing_consent === true) {
    return NextResponse.json({ show: false });
  }
  const db = createServiceClient();
  const [owner, admin] = await Promise.all([
    // Same ordering as the lifecycle view, which keys each person on their earliest owner membership.
    db.from("firm_users").select("id").eq("user_id", user.id).eq("role", "owner").eq("status", "active")
      .order("created_at", { ascending: true }).limit(1),
    db.from("super_admins").select("id").eq("user_id", user.id).maybeSingle(),
  ]);
  if (owner.error || admin.error || !owner.data?.length || admin.data) return NextResponse.json({ show: false });
  // Looked up by membership ID so the address never appears in a request URL.
  const { data: person, error } = await db.from("admin_lifecycle_overview")
    .select("marketing_basis").eq("member_id", owner.data[0].id).maybeSingle();
  if (error) return NextResponse.json({ show: false });
  const decided = person?.marketing_basis === "consent" || person?.marketing_basis === "corporate";
  return NextResponse.json({ show: !decided }, { headers: { "Cache-Control": "no-store" } });
}

/** Records the signed-in user's own answer; nobody can answer for another person. */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let choice: unknown;
  try { choice = (await request.json())?.choice; } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (choice !== "yes" && choice !== "no") return NextResponse.json({ error: "choice must be yes or no" }, { status: 400 });

  const answeredAt = new Date().toISOString();
  if (choice === "yes") {
    const { error } = await createServiceClient().rpc("outreach_record_basis", {
      p_email: user.email,
      p_basis: "consent",
      p_evidence: { source: "dashboard_prompt", wording_version: PROMPT_CONSENT_VERSION, user_id: user.id, given_at: answeredAt },
    });
    if (error) {
      console.error("[marketing-consent] Consent not recorded", error.code);
      return NextResponse.json({ error: "Please try again" }, { status: 503 });
    }
  }
  // Only stops the question being asked again; "no" records no basis, so nothing is ever sent.
  const { error } = await supabase.auth.updateUser({ data: { marketing_prompt_answered_at: answeredAt } });
  if (error) console.error("[marketing-consent] Answer flag not saved", error.status);
  return NextResponse.json({ success: true });
}
