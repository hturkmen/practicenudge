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

  const { clientId } = await request.json();

  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  // Fetch client with firm info
  const { data: client, error } = await supabase
    .from("clients")
    .select("id, name, email, gdpr_consent, gdpr_consent_token, firm_id, firms(name)")
    .eq("id", clientId)
    .single();

  if (error || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  if (!client.email) {
    return NextResponse.json({ error: "Client has no email" }, { status: 400 });
  }

  if (client.gdpr_consent) {
    return NextResponse.json({ error: "Client already consented" }, { status: 400 });
  }

  await sendGdprConsentEmail({
    to: client.email,
    clientName: client.name,
    firmName: (client.firms as any)?.name || "Your accountant",
    consentToken: client.gdpr_consent_token,
  });

  return NextResponse.json({ success: true });
}
