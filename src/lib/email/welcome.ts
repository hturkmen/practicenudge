import { Resend } from "resend";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

/**
 * Sends a welcome email to a newly registered user explaining how to use PracticeNudge.
 */
export async function sendWelcomeEmail(to: string, firmName: string) {
  const resend = getResend();
  if (!resend) {
    console.warn("[welcome-email] RESEND_API_KEY not set, skipping");
    return;
  }

  const subject = `Welcome to PracticeNudge, ${firmName}!`;

  const body = `Hi ${firmName},

Welcome to PracticeNudge! Your account is ready.

Here's how to get started in 3 simple steps:

1. ADD YOUR CLIENTS
   Go to Clients > Add Client (or import via CSV).
   Each client needs a name and email address.

2. CREATE A DOCUMENT REQUEST
   Go to Requests > New Request.
   Select a client, add a title, set a deadline, and list the documents you need.

3. SEND REMINDERS
   Your client gets a secure upload link via email.
   Track progress, approve documents, and send follow-up reminders as needed.

That's it! No complex setup, no integrations required.

QUICK LINKS:
- Dashboard: https://www.practicenudge.com/dashboard
- Add clients: https://www.practicenudge.com/clients
- Create request: https://www.practicenudge.com/requests/new
- Templates: https://www.practicenudge.com/templates

NEED HELP?
Reply to this email or contact us at support@practicenudge.com.

Best,
The PracticeNudge Team

---
PracticeNudge is a client document tracking tool for UK accountants.
It does not file taxes or submit anything to HMRC.`;

  try {
    await resend.emails.send({
      from: "PracticeNudge <noreply@practicenudge.com>",
      to: [to],
      subject,
      text: body,
    });
  } catch (error) {
    console.error("[welcome-email] Failed to send:", error);
  }
}
