import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActivityLog } from "@/lib/admin/queries";

const VALID_ACTION_TYPES = [
  "login",
  "registered",
  "document_request_created",
  "document_request_updated",
  "template_saved",
  "client_added",
  "client_updated",
  "document_request_sent",
  "document_request_completed",
  "settings_changed",
];

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
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

  // 3. Parse and validate query parameters
  const { searchParams } = new URL(request.url);

  const actionType = searchParams.get("action_type") || undefined;
  const dateFrom = searchParams.get("date_from") || undefined;
  const dateTo = searchParams.get("date_to") || undefined;
  const limitParam = searchParams.get("limit");

  for (const date of [dateFrom, dateTo]) {
    if (date && !Number.isFinite(Date.parse(date))) {
      return NextResponse.json({ message: "Invalid activity date" }, { status: 400 });
    }
  }
  if (dateFrom && dateTo && Date.parse(dateFrom) > Date.parse(dateTo)) {
    return NextResponse.json({ message: "From date must precede To date" }, { status: 400 });
  }

  // Validate action_type
  if (actionType && !VALID_ACTION_TYPES.includes(actionType)) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: `action_type must be one of: ${VALID_ACTION_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate limit
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;
  if (limitParam && (isNaN(limit!) || limit! < 1 || limit! > 100)) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "limit must be between 1 and 100" },
      { status: 400 }
    );
  }

  // 4. Call getActivityLog and return filtered entries
  try {
    const entries = await getActivityLog(supabase, params.userId, {
      action_type: actionType,
      date_from: dateFrom,
      date_to: dateTo,
      limit,
      firm_id: searchParams.get("firm_id") || undefined,
    });

    return NextResponse.json({ data: entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch activity logs";
    return NextResponse.json(
      { error: "QUERY_ERROR", message },
      { status: 500 }
    );
  }
}
