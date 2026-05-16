import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUsageMetrics } from "@/lib/admin/queries";

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

  const dateFrom = searchParams.get("date_from") || undefined;
  const dateTo = searchParams.get("date_to") || undefined;
  const pageParam = searchParams.get("page");
  const pageSizeParam = searchParams.get("page_size");

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
  if (pageSizeParam && (isNaN(pageSize!) || pageSize! < 1 || pageSize! > 50)) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "page_size must be between 1 and 50" },
      { status: 400 }
    );
  }

  // Validate date range doesn't exceed 365 days
  if (dateFrom && dateTo) {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);

    if (isNaN(from.getTime())) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "date_from must be a valid ISO date" },
        { status: 400 }
      );
    }

    if (isNaN(to.getTime())) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "date_to must be a valid ISO date" },
        { status: 400 }
      );
    }

    const diffMs = to.getTime() - from.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays > 365) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Date range must not exceed 365 days" },
        { status: 400 }
      );
    }

    if (diffDays < 0) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "date_from must be before date_to" },
        { status: 400 }
      );
    }
  }

  // Validate individual dates if only one is provided
  if (dateFrom && !dateTo) {
    const from = new Date(dateFrom);
    if (isNaN(from.getTime())) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "date_from must be a valid ISO date" },
        { status: 400 }
      );
    }
  }

  if (dateTo && !dateFrom) {
    const to = new Date(dateTo);
    if (isNaN(to.getTime())) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "date_to must be a valid ISO date" },
        { status: 400 }
      );
    }
  }

  // 4. Call getUsageMetrics and return response
  try {
    const result = await getUsageMetrics(supabase, {
      date_from: dateFrom,
      date_to: dateTo,
      page,
      page_size: pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch usage metrics";
    return NextResponse.json(
      { error: "QUERY_ERROR", message },
      { status: 500 }
    );
  }
}
