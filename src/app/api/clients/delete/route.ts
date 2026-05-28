import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * POST /api/clients/delete
 *
 * Deletes a client and all associated data (requests, items, logs, consents).
 * Super admins can delete any client. Firm users can only delete their own.
 */
export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clientId } = await request.json();

  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  // Check if super admin
  const { data: adminRecord } = await supabase
    .from("super_admins")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const isSuperAdmin = !!adminRecord;

  // Use service role to bypass RLS for cascade delete
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch client to verify ownership
  const { data: client, error: clientError } = await serviceSupabase
    .from("clients")
    .select("id, firm_id, name")
    .eq("id", clientId)
    .maybeSingle();

  if (clientError || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Non-admin users must own the client
  if (!isSuperAdmin) {
    const { data: firmUser } = await supabase
      .from("firm_users")
      .select("firm_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!firmUser || firmUser.firm_id !== client.firm_id) {
      return NextResponse.json(
        { error: "Client does not belong to your firm" },
        { status: 403 }
      );
    }
  }

  // Delete in correct order to avoid foreign key violations:
  // 1. request_items (depends on document_requests)
  const { data: requests } = await serviceSupabase
    .from("document_requests")
    .select("id")
    .eq("client_id", clientId);

  const requestIds = (requests || []).map((r: any) => r.id);

  if (requestIds.length > 0) {
    // Delete request_items for all requests
    await serviceSupabase
      .from("request_items")
      .delete()
      .in("request_id", requestIds);

    // Delete reminder_logs for all requests
    await serviceSupabase
      .from("reminder_logs")
      .delete()
      .in("request_id", requestIds);
  }

  // 2. Delete document_requests
  await serviceSupabase
    .from("document_requests")
    .delete()
    .eq("client_id", clientId);

  // 3. Delete activity_logs referencing this client
  await serviceSupabase
    .from("activity_logs")
    .delete()
    .eq("client_id", clientId);

  // 4. Delete notification_logs referencing this client
  await serviceSupabase
    .from("notification_logs")
    .delete()
    .eq("client_id", clientId);

  // 5. Delete notification_queue referencing this client
  await serviceSupabase
    .from("notification_queue")
    .delete()
    .eq("client_id", clientId);

  // 6. Delete client_notification_subscriptions
  await serviceSupabase
    .from("client_notification_subscriptions")
    .delete()
    .eq("client_id", clientId);

  // 7. Delete client_consents
  await serviceSupabase
    .from("client_consents")
    .delete()
    .eq("client_id", clientId);

  // 8. Finally delete the client itself
  const { error: deleteError } = await serviceSupabase
    .from("clients")
    .delete()
    .eq("id", clientId);

  if (deleteError) {
    console.error("[delete-client] Failed to delete client:", deleteError);
    return NextResponse.json(
      { error: "Failed to delete client: " + deleteError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Client "${client.name}" and all associated data deleted.`,
  });
}
