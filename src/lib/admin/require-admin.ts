import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Server-side super-admin gate for API routes; AdminGuard in the browser is only a convenience. */
export async function requireSuperAdmin(): Promise<{ userId: string } | { response: NextResponse }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { response: NextResponse.json({ error: "UNAUTHORIZED", message: "Authentication required" }, { status: 401 }) };
  }
  const { data: adminRecord, error } = await supabase
    .from("super_admins").select("id").eq("user_id", user.id).maybeSingle();
  if (error || !adminRecord) {
    return { response: NextResponse.json({ error: "FORBIDDEN", message: "Super admin access required" }, { status: 403 }) };
  }
  return { userId: user.id };
}
