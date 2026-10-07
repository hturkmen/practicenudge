/** Standard-quarter submission deadlines for the 2026 to 2027 tax year (end of day, UTC). */
export const MTD_DEADLINES = [
  { label: "Q1", date: new Date("2026-08-07T23:59:59Z") },
  { label: "Q2", date: new Date("2026-11-07T23:59:59Z") },
  { label: "Q3", date: new Date("2027-02-07T23:59:59Z") },
  { label: "Q4", date: new Date("2027-05-07T23:59:59Z") },
];

export type MtdDeadline = (typeof MTD_DEADLINES)[number];

export function nextDeadline(now: Date): MtdDeadline | null {
  return MTD_DEADLINES.find((d) => d.date.getTime() > now.getTime()) ?? null;
}

/** "7 November 2026" */
export function formatDeadlineDate(d: Date, locale = "en-GB"): string {
  return d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** "7 November" */
export function formatDeadlineDay(d: Date, locale = "en-GB"): string {
  return d.toLocaleDateString(locale, { day: "numeric", month: "long", timeZone: "UTC" });
}

/**
 * The desk photo shows the date on a sticky note, so it may only be shown while that date is
 * the next deadline. Other windows have no picture.
 */
const DEADLINE_IMAGES: Record<string, { src: string; width: number; height: number }> = {
  Q2: { src: "/images/mtd-deadline-nov-2026.jpg", width: 1672, height: 941 },
  Q3: { src: "/images/mtd-deadline-feb-2027.jpg", width: 1672, height: 941 },
};

export function deadlineImage(deadline: MtdDeadline | null) {
  return deadline ? DEADLINE_IMAGES[deadline.label] ?? null : null;
}
