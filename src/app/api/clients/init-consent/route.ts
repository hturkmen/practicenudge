import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createConsentsForClient } from "@/lib/consent/service";
import { sendGdprConsentEmail } from "@/lib/email/gdpr-consent";

/**
 * POST /api/clients/init-consent
 *
 * Called after a client is created to:
 * 1. Create consent records (email + sms channels in pending state)
 * 2. If the client has an email address, send the GDPR consent email
 *
 * Requirements: 1.3, 3.3, 3.5
 */
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

  // Verify client exists and belongs to user's firm
  const { data: firmUser } = await supabase
    .from("firm_users")
    .select("firm_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!firmUser) {
    return NextResponse.json({ error: "Firm not found" }, { status: 403 });
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, name, email, firm_id, firms(name)")
    .eq("id", clientId)
    .eq("firm_id", firmUser.firm_id)
    .single();

  if (clientError || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Step 1: Create consent records for the client (Requirement 1.3)
  let consents;
  try {
    consents = await createConsentsForClient(clientId);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create consent records" },
      { status: 500 }
    );
  }

  // Step 2: Send consent email if client has email (Requirements 3.3, 3.5)
  if (client.email) {
    const consentToken = consents[0]?.consent_token;
    if (consentToken) {
      const firmName = (client.firms as any)?.name || "Your accountant";
      try {
        await sendGdprConsentEmail({
          to: client.email,
          clientName: client.name,
          firmName,
          consentToken,
        });
      } catch (error) {
        // Email send failure is non-fatal for consent creation
        // The consent records are already created, email can be resent later
        console.error("[init-consent] Failed to send consent email:", error);
        return NextResponse.json({
          success: true,
          consentsCreated: true,
          emailSent: false,
          error: "Consent records created but email send failed",
        });
      }
    }

    return NextResponse.json({
      success: true,
      consentsCreated: true,
      emailSent: true,
    });
  }

  // No email address - consent records created but no email sent (Requirement 3.5)
  return NextResponse.json({
    success: true,
    consentsCreated: true,
    emailSent: false,
  });
}
