import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendGdprConsentEmail } from "@/lib/email/gdpr-consent";

export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { clientId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { clientId } = body;

  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  // Fetch client with firm info
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, name, email, firm_id, firms(name)")
    .eq("id", clientId)
    .single();

  if (clientError || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Validate client has email address (Requirement 3.5)
  if (!client.email) {
    return NextResponse.json(
      { error: "Client has no email address" },
      { status: 400 }
    );
  }

  // Retrieve existing consent_token from client_consents (Requirement 3.7)
  const { data: consentRecord, error: consentError } = await supabase
    .from("client_consents")
    .select("consent_token")
    .eq("client_id", clientId)
    .limit(1)
    .single();

  if (consentError || !consentRecord) {
    return NextResponse.json(
      { error: "Consent record not found for client" },
      { status: 404 }
    );
  }

  const firmName = (client.firms as any)?.name || "Your accountant";

  // Send consent email via Resend (Requirements 3.1, 3.2)
  try {
    await sendGdprConsentEmail({
      to: client.email,
      clientName: client.name,
      firmName,
      consentToken: consentRecord.consent_token,
    });
  } catch (error) {
    // Requirement 3.6: Return error if email send fails
    return NextResponse.json(
      { error: "Failed to send consent email" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
