import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMembers } from "@/lib/admin/queries";

const VALID_ROLES = ["owner", "admin", "member"];
const VALID_PLANS = ["free", "starter", "pro"];
const VALID_STATUSES = ["active", "suspended"];
const VALID_SORT_ORDERS = ["asc", "desc"];
const VALID_SORT_COLUMNS = [
  "created_at",
  "last_sign_in_at",
  "firm_client_count",
  "name",
  "email",
  "firm_name",
  "role",
  "plan",
  "status",
];

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

  // 3. Parse and validate query parameters
  const { searchParams } = new URL(request.url);

  const pageParam = searchParams.get("page");
  const pageSizeParam = searchParams.get("page_size");
  const search = searchParams.get("search") || undefined;
  const firmId = searchParams.get("firm_id") || undefined;
  const role = searchParams.get("role") || undefined;
  const plan = searchParams.get("plan") || undefined;
  const status = searchParams.get("status") || undefined;
  const sortBy = searchParams.get("sort_by") || undefined;
  const sortOrder = searchParams.get("sort_order") || undefined;

  // Validate page
  const page = pageParam ? parseInt(pageParam, 10) : undefined;
  if (pageParam && (isNaN(page!) || page! < 1)) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "page must be a positive integer" },
      { status: 400 }
    );
  }

  // Validate page_size
  const pageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : undefined;
  if (pageSizeParam && (isNaN(pageSize!) || pageSize! < 1 || pageSize! > 100)) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "page_size must be between 1 and 100" },
      { status: 400 }
    );
  }

  // Validate role
  if (role && !VALID_ROLES.includes(role)) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: `role must be one of: ${VALID_ROLES.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate plan
  if (plan && !VALID_PLANS.includes(plan)) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: `plan must be one of: ${VALID_PLANS.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate status
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate sort_by
  if (sortBy && !VALID_SORT_COLUMNS.includes(sortBy)) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: `sort_by must be one of: ${VALID_SORT_COLUMNS.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate sort_order
  if (sortOrder && !VALID_SORT_ORDERS.includes(sortOrder)) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: `sort_order must be one of: ${VALID_SORT_ORDERS.join(", ")}` },
      { status: 400 }
    );
  }

  // 4. Call getMembers and return paginated response
  try {
    const result = await getMembers(createServiceClient(), {
      page,
      page_size: pageSize,
      search,
      firm_id: firmId,
      role: role as "owner" | "admin" | "member" | undefined,
      plan: plan as "free" | "starter" | "pro" | undefined,
      status: status as "active" | "suspended" | undefined,
      sort_by: sortBy,
      sort_order: sortOrder as "asc" | "desc" | undefined,
    });

    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch members";
    return NextResponse.json(
      { error: "QUERY_ERROR", message },
      { status: 500 }
    );
  }
}
