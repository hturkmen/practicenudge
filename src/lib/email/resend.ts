import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendReminderEmailParams {
  to: string;
  clientName: string;
  firmName: string;
  requestTitle: string;
  deadline: string;
  uploadLink: string;
  pendingItems: string[];
  isOverdue: boolean;
}

export async function sendReminderEmail({
  to,
  clientName,
  firmName,
  requestTitle,
  deadline,
  uploadLink,
  pendingItems,
  isOverdue,
}: SendReminderEmailParams) {
  const pendingItemsList = pendingItems.map((item) => `  • ${item}`).join("\n");

  const subject = isOverdue
    ? `OVERDUE: ${firmName} still needs your documents`
    : `${firmName}: Documents needed for ${requestTitle}`;

  const body = isOverdue
    ? `Hi ${clientName},

This is a reminder that your documents for ${requestTitle} were due on ${deadline}.

We're still waiting for:
${pendingItemsList}

Please upload them as soon as possible:
${uploadLink}

Delays may affect your tax filing deadlines. If you're having trouble, please let us know.

Thanks,
${firmName}`
    : `Hi ${clientName},

We need a few documents from you for ${requestTitle}. The deadline is ${deadline}.

Please upload your documents using this secure link:
${uploadLink}

Here's what we still need:
${pendingItemsList}

This should only take a few minutes. If you have any questions, just reply to this email.

Thanks,
${firmName}`;

  const { data, error } = await resend.emails.send({
    from: `${firmName} <onboarding@resend.dev>`,
    to: [to],
    subject,
    text: body,
  });

  if (error) {
    console.error("Failed to send email:", error);
    throw error;
  }

  return data;
}
