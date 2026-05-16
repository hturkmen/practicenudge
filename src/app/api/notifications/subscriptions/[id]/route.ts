import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_FREQUENCIES = ["daily", "weekly", "monthly"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient();
  const { id } = await params;

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
  const { frequency, is_active } = body;

  // Validate that at least one field is provided
  if (frequency === undefined && is_active === undefined) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "At least one of frequency or is_active must be provided",
      },
      { status: 400 }
    );
  }

  // Validate frequency if provided
  if (frequency !== undefined && !VALID_FREQUENCIES.includes(frequency)) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: `Invalid frequency. Must be one of: ${VALID_FREQUENCIES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  // 3. Fetch the subscription by ID
  const { data: subscription, error: fetchError } = await supabase
    .from("client_notification_subscriptions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json(
      { error: "QUERY_ERROR", message: fetchError.message },
      { status: 500 }
    );
  }

  if (!subscription) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Subscription not found" },
      { status: 404 }
    );
  }

  // 4. Determine if user is a super_admin or firm user
  const { data: adminRecord } = await supabase
    .from("super_admins")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const isSuperAdmin = !!adminRecord;

  // 5. Verify firm ownership (unless super_admin)
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

    if (subscription.firm_id !== firmUser.firm_id) {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "Subscription does not belong to your firm",
        },
        { status: 403 }
      );
    }
  }

  // 6. Build update payload
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (frequency !== undefined) {
    updatePayload.frequency = frequency;
  }

  if (is_active !== undefined) {
    updatePayload.is_active = is_active;
  }

  // 7. Update the subscription
  const { data: updated, error: updateError } = await supabase
    .from("client_notification_subscriptions")
    .update(updatePayload)
    .eq("id", id)
    .select(
      "*, notification_types(id, name, display_name, description, category, is_subscribable)"
    )
    .single();

  if (updateError) {
    return NextResponse.json(
      { error: "QUERY_ERROR", message: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient();
  const { id } = await params;

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

  // 2. Fetch the subscription by ID
  const { data: subscription, error: fetchError } = await supabase
    .from("client_notification_subscriptions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json(
      { error: "QUERY_ERROR", message: fetchError.message },
      { status: 500 }
    );
  }

  if (!subscription) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Subscription not found" },
      { status: 404 }
    );
  }

  // 3. Determine if user is a super_admin or firm user
  const { data: adminRecord } = await supabase
    .from("super_admins")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const isSuperAdmin = !!adminRecord;

  // 4. Verify firm ownership (unless super_admin)
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

    if (subscription.firm_id !== firmUser.firm_id) {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "Subscription does not belong to your firm",
        },
        { status: 403 }
      );
    }
  }

  // 5. Delete the subscription
  const { error: deleteError } = await supabase
    .from("client_notification_subscriptions")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json(
      { error: "QUERY_ERROR", message: deleteError.message },
      { status: 500 }
    );
  }

  return new NextResponse(null, { status: 204 });
}
