import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * Deletes a suspended firm and all its associated data (clients, requests, members).
 * Only suspended firms can be deleted.
 */
export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify super admin
  const { data: adminRecord } = await supabase
    .from("super_admins")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRecord) {
    return NextResponse.json({ error: "Super admin access required" }, { status: 403 });
  }

  const { firmId } = await request.json();

  if (!firmId) {
    return NextResponse.json({ error: "firmId required" }, { status: 400 });
  }

  // Use service role client for delete (bypasses RLS)
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify firm has suspended members (i.e. firm is suspended)
  const { data: suspendedMembers } = await serviceSupabase
    .from("firm_users")
    .select("id, user_id, status")
    .eq("firm_id", firmId)
    .eq("status", "suspended");

  if (!suspendedMembers || suspendedMembers.length === 0) {
    return NextResponse.json(
      { error: "Only suspended firms can be deleted. Suspend the firm first." },
      { status: 400 }
    );
  }

  // Get all user IDs for this firm (to delete auth users)
  const { data: allFirmUsers } = await serviceSupabase
    .from("firm_users")
    .select("user_id")
    .eq("firm_id", firmId);

  const userIds = (allFirmUsers || []).map((u: any) => u.user_id);

  // Delete firm (CASCADE will handle clients, requests, firm_users, etc.)
  const { error } = await serviceSupabase
    .from("firms")
    .delete()
    .eq("id", firmId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Delete auth users completely (so they can register again with same email)
  for (const userId of userIds) {
    // Don't delete the super admin's own account
    if (userId === user.id) continue;
    await serviceSupabase.auth.admin.deleteUser(userId, false);
  }

  return NextResponse.json({ success: true, message: "Firm and all associated data deleted." });
}
