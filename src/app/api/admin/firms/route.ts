import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFirms } from "@/lib/admin/queries";
import type { FirmsListRequest } from "@/lib/types/admin";

export async function GET(request: Request) {
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

  // 3. Parse query parameters
  const { searchParams } = new URL(request.url);

  const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : undefined;
  const pageSize = searchParams.get("page_size")
    ? parseInt(searchParams.get("page_size")!, 10)
    : undefined;
  const search = searchParams.get("search") || undefined;
  const plan = searchParams.get("plan") as FirmsListRequest["plan"] | undefined;
  const dateFrom = searchParams.get("date_from") || undefined;
  const dateTo = searchParams.get("date_to") || undefined;

  // Validate numeric params
  if (page !== undefined && (isNaN(page) || page < 1)) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Invalid page parameter" },
      { status: 400 }
    );
  }
  if (pageSize !== undefined && (isNaN(pageSize) || pageSize < 1)) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Invalid page_size parameter" },
      { status: 400 }
    );
  }

  // Validate plan filter
  if (plan && !["free", "starter", "pro"].includes(plan)) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Invalid plan filter value" },
      { status: 400 }
    );
  }

  // 4. Call getFirms and return paginated response
  const params: FirmsListRequest = {
    page,
    page_size: pageSize,
    search,
    plan: plan || undefined,
    date_from: dateFrom,
    date_to: dateTo,
  };

  try {
    const result = await getFirms(supabase, params);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch firms";
    return NextResponse.json(
      { error: "QUERY_ERROR", message },
      { status: 500 }
    );
  }
}
