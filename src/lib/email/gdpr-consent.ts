import { Resend } from "resend";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export interface GdprConsentEmailParams {
  to: string;
  clientName: string;
  firmName: string;
  consentToken: string;
}

/**
 * Builds the consent page link from a token.
 * Format: {baseUrl}/consent/{token}
 */
export function buildConsentLink(token: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.practicenudge.com";
  return `${appUrl}/consent/${token}`;
}

/**
 * Generates the plain-text email body for the GDPR channel consent request.
 * Includes firm name, client name, and consent page link with token.
 */
export function buildConsentEmailBody(params: {
  clientName: string;
  firmName: string;
  consentLink: string;
}): string {
  return `Hi ${params.clientName},

${params.firmName} uses PracticeNudge to securely communicate with their clients.

Before they can send you any notifications or reminders, we need your consent for each communication channel you'd like to use.

On the consent page you can choose which channels (email, SMS) you'd like to allow ${params.firmName} to contact you through. You can accept or reject each channel independently.

YOUR RIGHTS:
- You can accept or reject each communication channel separately
- You can change your preferences at any time using the same link
- Your contact information is only used for communication between you and ${params.firmName}
- No messages will be sent through channels you have not approved

To manage your communication preferences, please visit:
${params.consentLink}

If you did not expect this email or do not wish to receive communications, simply ignore it. No messages will be sent without your explicit consent.

This email was sent by PracticeNudge on behalf of ${params.firmName}.
PracticeNudge is a document collection tool for UK accountants. We do not share your data with third parties.`;
}

/**
 * Generates the email subject line for the GDPR consent request.
 */
export function buildConsentEmailSubject(firmName: string): string {
  return `${firmName} would like to communicate with you via PracticeNudge`;
}

/**
 * Sends a GDPR channel consent request email to a client.
 * The email includes the firm name, client name, and a consent page link
 * where the client can manage per-channel (email/sms) consent preferences.
 */
export async function sendGdprConsentEmail(params: GdprConsentEmailParams) {
  const resend = getResend();
  if (!resend) {
    console.warn("[gdpr-consent] RESEND_API_KEY not set, skipping");
    return;
  }

  const consentLink = buildConsentLink(params.consentToken);
  const subject = buildConsentEmailSubject(params.firmName);
  const body = buildConsentEmailBody({
    clientName: params.clientName,
    firmName: params.firmName,
    consentLink,
  });

  try {
    await resend.emails.send({
      from: `${params.firmName} via PracticeNudge <noreply@practicenudge.com>`,
      to: [params.to],
      subject,
      text: body,
    });
  } catch (error) {
    console.error("[gdpr-consent] Failed to send:", error);
    throw error;
  }
}
