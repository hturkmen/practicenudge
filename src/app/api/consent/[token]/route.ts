import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getConsentsByToken, updateChannelConsent } from "@/lib/consent/service";
import type { ConsentChannel } from "@/lib/consent/types";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const VALID_CHANNELS: ConsentChannel[] = ["email", "sms"];
const VALID_ACTIONS = ["accept", "reject"] as const;

/**
 * GET: Fetch channel-based consent info by token (public, no auth)
 * Returns ConsentPageData with client name, firm name, and per-channel statuses.
 */
export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  const token = params.token;

  try {
    const consentData = await getConsentsByToken(token);

    if (!consentData) {
      return NextResponse.json(
        { error: "Invalid or expired link" },
        { status: 404 }
      );
    }

    return NextResponse.json(consentData);
  } catch {
    return NextResponse.json(
      { error: "Failed to load consent data" },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Update a specific channel's consent status (public, no auth)
 * Body: { channel: "email" | "sms", action: "accept" | "reject" }
 */
export async function PATCH(
  request: Request,
  { params }: { params: { token: string } }
) {
  const token = params.token;

  let body: { channel?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { channel, action } = body;

  // Validate channel
  if (!channel || !VALID_CHANNELS.includes(channel as ConsentChannel)) {
    return NextResponse.json(
      { error: "Invalid channel. Must be 'email' or 'sms'." },
      { status: 400 }
    );
  }

  // Validate action
  if (!action || !VALID_ACTIONS.includes(action as typeof VALID_ACTIONS[number])) {
    return NextResponse.json(
      { error: "Invalid action. Must be 'accept' or 'reject'." },
      { status: 400 }
    );
  }

  try {
    const updatedConsent = await updateChannelConsent(
      token,
      channel as ConsentChannel,
      action as "accept" | "reject"
    );
    return NextResponse.json(updatedConsent);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update consent";
    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST: Give consent (public, no auth) - Legacy endpoint for backward compatibility
 */
export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  const supabase = getServiceClient();
  const token = params.token;

  const { data, error } = await supabase
    .from("clients")
    .update({
      gdpr_consent: true,
      gdpr_consented_at: new Date().toISOString(),
    })
    .eq("gdpr_consent_token", token)
    .select("id")
    .single();

  if (error) {
    // PGRST116 = no rows matched (invalid token)
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Invalid or expired consent token" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Invalid or expired consent token" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
