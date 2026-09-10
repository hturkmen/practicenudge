import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { processSignupNotifications } from "@/lib/email/signup-notifications";

/** Compatibility nudge from the dashboard; all input is derived from the authenticated member. */
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = createServiceClient();
    const { data: memberships, error } = await db.from("firm_users").select("id")
      .eq("user_id", user.id).eq("status", "active");
    if (error) throw new Error("Membership lookup failed");
    if (!memberships?.length) return NextResponse.json({ error: "No active membership" }, { status: 403 });
    const results = [];
    for (const member of memberships) results.push(await processSignupNotifications(db, member.id));
    if (results.some(result => !result.configured || result.failed > 0)) {
      return NextResponse.json({ error: "Registration notification remains queued" }, { status: 503 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Registration notification remains queued" }, { status: 503 });
  }
}
