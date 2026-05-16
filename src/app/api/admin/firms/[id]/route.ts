import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFirmDetail } from "@/lib/admin/queries";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  // 3. Fetch firm detail
  const firmId = params.id;

  try {
    const firmDetail = await getFirmDetail(supabase, firmId);
    return NextResponse.json(firmDetail);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch firm detail";
    return NextResponse.json(
      { error: "QUERY_ERROR", message },
      { status: 500 }
    );
  }
}
