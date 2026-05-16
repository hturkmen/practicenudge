import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_FREQUENCIES = ["daily", "weekly", "monthly"] as const;

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

  // 2. Parse query parameters
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("client_id");

  if (!clientId) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "client_id is required" },
      { status: 400 }
    );
  }

  // 3. Determine if user is a super_admin or firm user
  const { data: adminRecord } = await supabase
    .from("super_admins")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const isSuperAdmin = !!adminRecord;

  let firmId: string | null = null;

  if (!isSuperAdmin) {
    // Get the user's firm
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

  // 4. Verify the client belongs to the user's firm (unless super_admin)
  if (!isSuperAdmin) {
    const { data: client } = await supabase
      .from("clients")
      .select("id, firm_id")
      .eq("id", clientId)
      .eq("firm_id", firmId!)
      .maybeSingle();

    if (!client) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Client does not belong to your firm" },
        { status: 403 }
      );
    }
  }

  // 5. Fetch all subscriptions for the client, joined with notification_types
  const { data, error } = await supabase
    .from("client_notification_subscriptions")
    .select("*, notification_types(id, name, display_name, description, category, is_subscribable)")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "QUERY_ERROR", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
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

  // 2. Parse and validate request body
  const body = await request.json();
  const { client_id, notification_type_id, frequency } = body;

  if (!client_id || !notification_type_id || !frequency) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "client_id, notification_type_id, and frequency are required",
      },
      { status: 400 }
    );
  }

  // Validate frequency
  if (!VALID_FREQUENCIES.includes(frequency)) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: `Invalid frequency. Must be one of: ${VALID_FREQUENCIES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  // 3. Determine if user is a super_admin or firm user
  const { data: adminRecord } = await supabase
    .from("super_admins")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const isSuperAdmin = !!adminRecord;

  let firmId: string | null = null;

  if (!isSuperAdmin) {
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

  // 4. Verify the client belongs to the user's firm (unless super_admin)
  const { data: client } = await supabase
    .from("clients")
    .select("id, firm_id")
    .eq("id", client_id)
    .maybeSingle();

  if (!client) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Client not found" },
      { status: 400 }
    );
  }

  if (!isSuperAdmin && client.firm_id !== firmId) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Client does not belong to your firm" },
      { status: 403 }
    );
  }

  // Use the client's firm_id for the subscription (handles super_admin case too)
  const subscriptionFirmId = client.firm_id;

  // 5. Validate notification_type exists and is_subscribable
  const { data: notificationType } = await supabase
    .from("notification_types")
    .select("id, is_subscribable")
    .eq("id", notification_type_id)
    .maybeSingle();

  if (!notificationType) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Notification type not found" },
      { status: 400 }
    );
  }

  if (!notificationType.is_subscribable) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "This notification type is not subscribable",
      },
      { status: 400 }
    );
  }

  // 6. Check for existing subscription (upsert behavior)
  const { data: existingSubscription } = await supabase
    .from("client_notification_subscriptions")
    .select("id")
    .eq("client_id", client_id)
    .eq("firm_id", subscriptionFirmId)
    .eq("notification_type_id", notification_type_id)
    .maybeSingle();

  if (existingSubscription) {
    // Update existing subscription frequency
    const { data: updated, error: updateError } = await supabase
      .from("client_notification_subscriptions")
      .update({
        frequency,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingSubscription.id)
      .select("*, notification_types(id, name, display_name, description, category, is_subscribable)")
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "QUERY_ERROR", message: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updated });
  }

  // 7. Create new subscription
  const { data: newSubscription, error: insertError } = await supabase
    .from("client_notification_subscriptions")
    .insert({
      client_id,
      firm_id: subscriptionFirmId,
      notification_type_id,
      frequency,
      is_active: true,
    })
    .select("*, notification_types(id, name, display_name, description, category, is_subscribable)")
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: "QUERY_ERROR", message: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: newSubscription }, { status: 201 });
}
