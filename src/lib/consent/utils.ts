import type { ConsentChannel, ConsentStatus } from "./types";

/**
 * Returns the Turkish display label for a consent status.
 * - pending → "Onay Bekleniyor"
 * - accepted → "Onaylandı"
 * - rejected → "Reddedildi"
 */
export function getConsentStatusLabel(status: ConsentStatus): string {
  const labels: Record<ConsentStatus, string> = {
    pending: "Onay Bekleniyor",
    accepted: "Onaylandı",
    rejected: "Reddedildi",
  };
  return labels[status];
}

/**
 * Formats a date string to dd/MM/yyyy format.
 * Accepts ISO date strings or any valid Date-parseable string.
 */
export function formatConsentDate(date: string): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Returns a description text for a consent channel explaining its purpose
 * and the client's right to withdraw consent.
 */
export function getChannelDescription(channel: ConsentChannel): string {
  const descriptions: Record<ConsentChannel, string> = {
    email:
      "E-posta kanalı, vergi hatırlatmaları, belge talepleri ve önemli bilgilendirmeler için kullanılır. Onayınızı istediğiniz zaman geri çekebilirsiniz.",
    sms:
      "SMS kanalı, acil hatırlatmalar ve kısa bilgilendirmeler için kullanılır. Onayınızı istediğiniz zaman geri çekebilirsiniz.",
  };
  return descriptions[channel];
}
