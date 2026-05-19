import { Resend } from "resend";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

/**
 * Sends a GDPR consent request email to a client.
 */
export async function sendGdprConsentEmail(params: {
  to: string;
  clientName: string;
  firmName: string;
  consentToken: string;
}) {
  const resend = getResend();
  if (!resend) {
    console.warn("[gdpr-consent] RESEND_API_KEY not set, skipping");
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.practicenudge.com";
  const consentLink = `${appUrl}/consent/${params.consentToken}`;

  const subject = `${params.firmName} would like to send you documents via PracticeNudge`;

  const body = `Hi ${params.clientName},

${params.firmName} uses PracticeNudge to securely collect documents from their clients.

Before they can send you any document requests or reminders, we need your consent to process your email address for this purpose.

WHAT THIS MEANS:
- ${params.firmName} will be able to send you secure document upload links
- You'll receive email reminders about pending documents
- Your email is only used for communication between you and ${params.firmName}
- You can withdraw consent at any time

To give your consent, please click the link below:
${consentLink}

If you did not expect this email or do not wish to receive communications, simply ignore it. No further emails will be sent without your consent.

This email was sent by PracticeNudge on behalf of ${params.firmName}.
PracticeNudge is a document collection tool for UK accountants. We do not share your data with third parties.`;

  try {
    await resend.emails.send({
      from: `${params.firmName} via PracticeNudge <noreply@practicenudge.com>`,
      to: [params.to],
      subject,
      text: body,
    });
  } catch (error) {
    console.error("[gdpr-consent] Failed to send:", error);
  }
}
