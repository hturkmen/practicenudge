import { Resend } from "resend";

const ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "halil.turkmen@gmail.com";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

/**
 * Sends a notification email to the super admin.
 * Fails silently if RESEND_API_KEY is not set.
 */
export async function notifyAdmin(subject: string, body: string) {
  const resend = getResend();
  if (!resend) {
    console.warn("[admin-notify] RESEND_API_KEY not set, skipping notification");
    return;
  }

  try {
    await resend.emails.send({
      from: "PracticeNudge System <noreply@practicenudge.com>",
      to: [ADMIN_EMAIL],
      subject: `[PracticeNudge] ${subject}`,
      text: body,
    });
  } catch (error) {
    console.error("[admin-notify] Failed to send admin notification:", error);
  }
}

/**
 * Notify admin when a new firm registers.
 */
export async function notifyNewFirmRegistered(firmName: string, email: string) {
  await notifyAdmin(
    `New firm registered: ${firmName}`,
    `A new firm has registered on PracticeNudge.\n\nFirm: ${firmName}\nEmail: ${email}\nTime: ${new Date().toISOString()}\n\nLog in to the admin panel to review: https://www.practicenudge.com/admin/firms`
  );
}

/**
 * Notify admin when a reminder email fails to send.
 */
export async function notifyReminderFailed(
  requestTitle: string,
  clientEmail: string,
  errorMessage: string
) {
  await notifyAdmin(
    `Reminder failed: ${requestTitle}`,
    `A reminder email failed to send.\n\nRequest: ${requestTitle}\nClient email: ${clientEmail}\nError: ${errorMessage}\nTime: ${new Date().toISOString()}`
  );
}

/**
 * Notify admin when the cron job encounters errors.
 */
export async function notifyCronError(errorMessage: string, context?: string) {
  await notifyAdmin(
    "Cron job error",
    `The reminder cron job encountered an error.\n\n${context ? `Context: ${context}\n` : ""}Error: ${errorMessage}\nTime: ${new Date().toISOString()}`
  );
}
