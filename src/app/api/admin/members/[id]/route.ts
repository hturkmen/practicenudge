import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMemberDetail } from "@/lib/admin/queries";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id)) {
    return NextResponse.json({ message: "Invalid member ID" }, { status: 400 });
  }
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

  // 3. Fetch member detail and activity log
  try {
    const result = await getMemberDetail(createServiceClient(), params.id);
    if (!result) return NextResponse.json({ message: "Member not found" }, { status: 404 });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err: any) {
    return NextResponse.json(
      { error: "QUERY_ERROR", message: err.message || "Failed to fetch member detail" },
      { status: 500 }
    );
  }
}
