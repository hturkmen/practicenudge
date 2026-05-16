import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  // 2. Determine if user is a super_admin or firm user
  const { data: adminRecord } = await supabase
    .from("super_admins")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const isSuperAdmin = !!adminRecord;

  let firmId: string | null = null;

  if (!isSuperAdmin) {
    // 3. If firm user: get their firm_id
    const { data: firmUser } = await supabase
      .from("firm_users")
      .select("firm_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!firmUser) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "No firm association found" },
        { status: 403 }
      );
    }

    firmId = firmUser.firm_id;
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("client_id");
  const notificationTypeId = searchParams.get("notification_type_id");
  const channel = searchParams.get("channel");
  const status = searchParams.get("status");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const filterFirmId = searchParams.get("firm_id");
  const triggeredBy = searchParams.get("triggered_by");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get("page_size") || "25", 10)));

  // 5. Build the query with all applicable filters
  let query = supabase
    .from("notification_logs")
    .select(
      "*, clients(name), notification_types(display_name)",
      { count: "exact" }
    );

  // Firm scoping
  if (isSuperAdmin) {
    // 4. If super_admin: allow filtering by any firm_id
    if (filterFirmId) {
      query = query.eq("firm_id", filterFirmId);
    }
    // Master admin only: filter by triggering user
    if (triggeredBy) {
      query = query.eq("triggered_by", triggeredBy);
    }
  } else {
    // Firm user: automatically scope to their firm_id
    query = query.eq("firm_id", firmId!);
  }

  // Apply common filters
  if (clientId) {
    query = query.eq("client_id", clientId);
  }
  if (notificationTypeId) {
    query = query.eq("notification_type_id", notificationTypeId);
  }
  if (channel) {
    query = query.eq("channel", channel);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (dateFrom) {
    query = query.gte("created_at", dateFrom);
  }
  if (dateTo) {
    query = query.lte("created_at", dateTo);
  }

  // 6. Order by created_at DESC (reverse chronological)
  query = query.order("created_at", { ascending: false });

  // 7. Apply pagination (range)
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  // Execute query
  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { error: "QUERY_ERROR", message: error.message },
      { status: 500 }
    );
  }

  // 9. Return paginated response with total count
  const total = count ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return NextResponse.json({
    data: data ?? [],
    pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages: totalPages,
    },
  });
}
