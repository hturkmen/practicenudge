import { appUrl, OUTREACH_FROM, OUTREACH_REPLY_TO } from "./config";

export type OutreachEmail = {
  from: string;
  to: string[];
  replyTo: string;
  subject: string;
  text: string;
  headers?: Record<string, string>;
};

/** Header values must never carry line breaks (header injection). */
export function cleanHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, 150);
}

/**
 * Plain-text email with the footer every follow-up carries: who sent it, that it is automated,
 * that replies reach a person, and a working unsubscribe link (plus RFC 8058 one-click headers).
 */
export function buildOutreachEmail({ to, subject, body, unsubscribeToken }: {
  to: string; subject: string; body: string; unsubscribeToken: string | null;
}): OutreachEmail {
  const base = appUrl();
  const query = unsubscribeToken ? "?token=" + encodeURIComponent(unsubscribeToken) : "";
  const footer = [
    "--",
    "PracticeNudge · practicenudge.com",
    "This is an automated email. Reply to it and a person will read your message.",
    `Don't want these emails? Unsubscribe: ${base}/unsubscribe${query}`,
  ].join("\n");
  return {
    from: OUTREACH_FROM,
    to: [to],
    replyTo: OUTREACH_REPLY_TO,
    subject: cleanHeader(subject),
    text: body.trim() + "\n\n" + footer,
    ...(unsubscribeToken && {
      headers: {
        "List-Unsubscribe": `<${base}/api/outreach/unsubscribe${query}>, <mailto:${OUTREACH_REPLY_TO}?subject=unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  };
}
