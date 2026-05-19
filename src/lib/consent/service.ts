import { createClient } from "@supabase/supabase-js";
import type {
  ClientConsent,
  ConsentChannel,
  ConsentPageData,
  ConsentStatus,
} from "./types";

/**
 * Creates a Supabase client with service-role privileges for consent operations.
 */
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Supported channels */
const CHANNELS: ConsentChannel[] = ["email", "sms"];

/** Channel descriptions for the consent page */
const CHANNEL_DESCRIPTIONS: Record<ConsentChannel, string> = {
  email:
    "E-posta kanalı, vergi hatırlatmaları, belge talepleri ve önemli bildirimler göndermek için kullanılır. Onayınızı istediğiniz zaman geri çekebilirsiniz.",
  sms:
    "SMS kanalı, acil hatırlatmalar ve kısa bildirimler göndermek için kullanılır. Onayınızı istediğiniz zaman geri çekebilirsiniz.",
};

/**
 * Creates consent records for a client (email + sms) with pending status
 * and a shared consent_token UUID.
 *
 * Handles duplicate creation attempts idempotently via ON CONFLICT DO NOTHING.
 *
 * @param clientId - The client ID to create consent records for
 * @returns The created (or existing) consent records
 */
export async function createConsentsForClient(
  clientId: string
): Promise<ClientConsent[]> {
  const supabase = getServiceClient();

  // Generate a shared consent token for all channels of this client
  const consentToken = crypto.randomUUID();

  // Build records for each channel
  const records = CHANNELS.map((channel) => ({
    client_id: clientId,
    channel,
    status: "pending" as ConsentStatus,
    consent_token: consentToken,
  }));

  // Insert with ON CONFLICT DO NOTHING for idempotency
  const { error } = await supabase
    .from("client_consents")
    .upsert(records, { onConflict: "client_id,channel", ignoreDuplicates: true });

  if (error) {
    throw new Error(`Failed to create consents for client: ${error.message}`);
  }

  // Return all consent records for this client (including pre-existing ones)
  return getClientConsents(clientId);
}

/**
 * Retrieves consent page data by consent token.
 * Returns client name, firm name, channels with statuses, hasContactInfo flags, and descriptions.
 *
 * @param token - The consent token UUID
 * @returns ConsentPageData or null if token not found
 */
export async function getConsentsByToken(
  token: string
): Promise<ConsentPageData | null> {
  const supabase = getServiceClient();

  // Get consent records by token
  const { data: consents, error: consentError } = await supabase
    .from("client_consents")
    .select("*")
    .eq("consent_token", token);

  if (consentError) {
    throw new Error(`Failed to fetch consents by token: ${consentError.message}`);
  }

  if (!consents || consents.length === 0) {
    return null;
  }

  // Get client info (all records share the same client_id)
  const clientId = consents[0].client_id;
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("name, email, phone, firm_id")
    .eq("id", clientId)
    .single();

  if (clientError || !client) {
    return null;
  }

  // Get firm info
  const { data: firm, error: firmError } = await supabase
    .from("firms")
    .select("name")
    .eq("id", client.firm_id)
    .single();

  if (firmError || !firm) {
    return null;
  }

  // Build channel data
  const channels = consents.map((consent) => ({
    channel: consent.channel as ConsentChannel,
    status: consent.status as ConsentStatus,
    hasContactInfo: consent.channel === "email"
      ? Boolean(client.email && client.email.trim() !== "")
      : Boolean(client.phone && client.phone.trim() !== ""),
    description: CHANNEL_DESCRIPTIONS[consent.channel as ConsentChannel],
  }));

  return {
    clientName: client.name,
    firmName: firm.name,
    channels,
  };
}

/**
 * Updates a channel's consent status (accepted/rejected) by token.
 * Sets updated_at to current timestamp.
 *
 * @param token - The consent token UUID
 * @param channel - The channel to update
 * @param action - "accept" or "reject"
 * @returns The updated consent record
 */
export async function updateChannelConsent(
  token: string,
  channel: ConsentChannel,
  action: "accept" | "reject"
): Promise<ClientConsent> {
  const supabase = getServiceClient();

  const newStatus: ConsentStatus = action === "accept" ? "accepted" : "rejected";

  const { data, error } = await supabase
    .from("client_consents")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("consent_token", token)
    .eq("channel", channel)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update channel consent: ${error.message}`);
  }

  if (!data) {
    throw new Error("Consent record not found for the given token and channel");
  }

  return data as ClientConsent;
}

/**
 * Returns all consent records for a client.
 *
 * @param clientId - The client ID
 * @returns Array of consent records
 */
export async function getClientConsents(
  clientId: string
): Promise<ClientConsent[]> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("client_consents")
    .select("*")
    .eq("client_id", clientId)
    .order("channel", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch client consents: ${error.message}`);
  }

  return (data ?? []) as ClientConsent[];
}

/**
 * Checks if a client has accepted consent for a specific channel.
 * Returns true only if the status is "accepted".
 *
 * @param clientId - The client ID
 * @param channel - The channel to check
 * @returns true if consent is accepted, false otherwise
 */
export async function checkChannelConsent(
  clientId: string,
  channel: ConsentChannel
): Promise<boolean> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("client_consents")
    .select("status")
    .eq("client_id", clientId)
    .eq("channel", channel)
    .single();

  if (error || !data) {
    return false;
  }

  return data.status === "accepted";
}
