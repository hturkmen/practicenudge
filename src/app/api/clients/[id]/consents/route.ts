import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = params.id;

  if (!clientId) {
    return NextResponse.json({ error: "Client ID required" }, { status: 400 });
  }

  // Verify user has access to this client via firm membership
  const { data: firmUser } = await supabase
    .from("firm_users")
    .select("firm_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!firmUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Use service role to bypass RLS for client_consents
  const serviceSupabase = getServiceSupabase();

  // Verify client belongs to user's firm
  const { data: client } = await serviceSupabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("firm_id", firmUser.firm_id)
    .single();

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  try {
    const { data, error } = await serviceSupabase
      .from("client_consents")
      .select("*")
      .eq("client_id", clientId)
      .order("channel", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json(
      { error: "Failed to load consent data" },
      { status: 500 }
    );
  }
}
