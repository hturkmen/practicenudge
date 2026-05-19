import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET: Fetch consent info by token (public, no auth)
 */
export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  const supabase = getServiceClient();
  const token = params.token;

  const { data, error } = await supabase
    .from("clients")
    .select("name, gdpr_consent, firm_id, firms(name)")
    .eq("gdpr_consent_token", token)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    clientName: data.name,
    firmName: (data.firms as any)?.name || "Your accountant",
    alreadyConsented: data.gdpr_consent,
  });
}

/**
 * POST: Give consent (public, no auth)
 */
export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  const supabase = getServiceClient();
  const token = params.token;

  const { error } = await supabase
    .from("clients")
    .update({
      gdpr_consent: true,
      gdpr_consented_at: new Date().toISOString(),
    })
    .eq("gdpr_consent_token", token);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
