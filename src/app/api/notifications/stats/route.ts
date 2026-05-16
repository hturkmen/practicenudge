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
  const notificationTypeId = searchParams.get("notification_type_id");
  const filterFirmId = searchParams.get("firm_id");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");

  // 4. Build the query to fetch logs with notification type info
  let query = supabase
    .from("notification_logs")
    .select("notification_type_id, status, notification_types(display_name)");

  // Firm scoping
  if (isSuperAdmin) {
    if (filterFirmId) {
      query = query.eq("firm_id", filterFirmId);
    }
  } else {
    query = query.eq("firm_id", firmId!);
  }

  // Apply filters
  if (notificationTypeId) {
    query = query.eq("notification_type_id", notificationTypeId);
  }
  if (dateFrom) {
    query = query.gte("created_at", dateFrom);
  }
  if (dateTo) {
    query = query.lte("created_at", dateTo);
  }

  // Execute query
  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "QUERY_ERROR", message: error.message },
      { status: 500 }
    );
  }

  // 5. Aggregate counts by notification_type_id and status in JS
  const typeMap = new Map<
    string,
    {
      notification_type_id: string;
      type_name: string;
      total: number;
      sent: number;
      delivered: number;
      failed: number;
      queued: number;
      stopped: number;
    }
  >();

  const totals = { total: 0, sent: 0, delivered: 0, failed: 0, queued: 0, stopped: 0 };

  for (const log of data ?? []) {
    const typeId = log.notification_type_id;
    const status = log.status as string;

    // Get or create type entry
    if (!typeMap.has(typeId)) {
      const notificationTypes = log.notification_types as
        | { display_name: string }
        | { display_name: string }[]
        | null;
      const typeName = Array.isArray(notificationTypes)
        ? notificationTypes[0]?.display_name ?? "Unknown"
        : notificationTypes?.display_name ?? "Unknown";
      typeMap.set(typeId, {
        notification_type_id: typeId,
        type_name: typeName,
        total: 0,
        sent: 0,
        delivered: 0,
        failed: 0,
        queued: 0,
        stopped: 0,
      });
    }

    const entry = typeMap.get(typeId)!;
    entry.total++;
    totals.total++;

    if (status === "sent") {
      entry.sent++;
      totals.sent++;
    } else if (status === "delivered") {
      entry.delivered++;
      totals.delivered++;
    } else if (status === "failed") {
      entry.failed++;
      totals.failed++;
    } else if (status === "queued") {
      entry.queued++;
      totals.queued++;
    } else if (status === "stopped") {
      entry.stopped++;
      totals.stopped++;
    }
  }

  // 6. Return aggregated response
  const byType = Array.from(typeMap.values());

  return NextResponse.json({
    by_type: byType,
    totals,
  });
}
