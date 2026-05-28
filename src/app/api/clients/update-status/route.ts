import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * Updates a client's status with cascade logic:
 * - When client goes to on_hold/inactive/archived: all active requests go on_hold
 * - When client goes to active: on_hold requests are restored to pending
 */
export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clientId, newStatus } = await request.json();

  if (!clientId || !newStatus) {
    return NextResponse.json({ error: "clientId and newStatus required" }, { status: 400 });
  }

  const validStatuses = ["active", "inactive", "archived", "on_hold"];
  if (!validStatuses.includes(newStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Check if user is super admin
  const { data: adminRecord } = await supabase
    .from("super_admins")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const isSuperAdmin = !!adminRecord;

  // For non-admin users, verify firm ownership
  if (!isSuperAdmin) {
    const { data: firmUser, error: firmUserError } = await supabase
      .from("firm_users")
      .select("firm_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!firmUser) {
      console.error("[update-status] No firm_user found for user:", user.id, firmUserError);
      return NextResponse.json({ error: "No firm found" }, { status: 403 });
    }

    // Verify client belongs to user's firm
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, firm_id, status")
      .eq("id", clientId)
      .maybeSingle();

    if (clientError) {
      console.error("[update-status] DB error fetching client:", clientError);
      return NextResponse.json({ error: "Failed to fetch client" }, { status: 500 });
    }

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (client.firm_id !== firmUser.firm_id) {
      return NextResponse.json({ error: "Client does not belong to your firm" }, { status: 403 });
    }
  }

  // Use service role client for super admin (bypasses RLS), regular client for firm users
  const dbClient = isSuperAdmin
    ? createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    : supabase;

  // Update client status
  const { error: updateError } = await dbClient
    .from("clients")
    .update({ status: newStatus })
    .eq("id", clientId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Cascade logic
  if (newStatus === "on_hold" || newStatus === "inactive" || newStatus === "archived") {
    // Put all active/pending/in_progress/overdue requests on hold
    const { error: cascadeError } = await dbClient
      .from("document_requests")
      .update({ status: "on_hold" })
      .eq("client_id", clientId)
      .in("status", ["pending", "in_progress", "overdue"]);

    if (cascadeError) {
      console.error("Cascade update failed (requests → on_hold):", cascadeError);
      return NextResponse.json(
        { error: "Client status updated but failed to update related requests: " + cascadeError.message },
        { status: 500 }
      );
    }
  } else if (newStatus === "active") {
    // Restore on_hold requests to pending (only if they were put on hold by client status change)
    const { error: cascadeError } = await dbClient
      .from("document_requests")
      .update({ status: "pending" })
      .eq("client_id", clientId)
      .eq("status", "on_hold");

    if (cascadeError) {
      console.error("Cascade update failed (requests → pending):", cascadeError);
      return NextResponse.json(
        { error: "Client status updated but failed to restore related requests: " + cascadeError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true, status: newStatus });
}
