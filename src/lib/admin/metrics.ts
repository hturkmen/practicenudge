import { MemberActionType } from "@/lib/types/admin";

/**
 * Computes the completion rate as an integer percentage.
 * Returns Math.floor(completed / total * 100) when total > 0, else 0.
 */
export function computeCompletionRate(total: number, completed: number): number {
  if (total <= 0) return 0;
  return Math.floor((completed / total) * 100);
}

/**
 * Computes month-over-month growth percentage.
 * Returns Math.round((current - previous) / previous * 100) when previous > 0, else 0.
 */
export function computeMonthOverMonth(current: number, previous: number): number {
  if (previous <= 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Determines if an entity is inactive based on its last activity date and a threshold in days.
 * Returns true if lastActivityDate is null or older than thresholdDays from now.
 */
export function isInactive(
  lastActivityDate: string | null,
  thresholdDays: number
): boolean {
  if (lastActivityDate === null) return true;

  const lastActivity = new Date(lastActivityDate);
  const now = new Date();
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
  const elapsed = now.getTime() - lastActivity.getTime();

  return elapsed > thresholdMs;
}

/**
 * Formats an ISO timestamp to "DD MMM YYYY, HH:mm" format.
 */
export function formatActivityTimestamp(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);

  const day = String(date.getDate()).padStart(2, "0");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

/**
 * Returns the related entity string for an activity log entry.
 * - For client_added / client_updated: returns the client name from metadata
 * - For document_request_sent / document_request_completed: returns the request ID from metadata
 * - For login / settings_changed: returns null
 */
export function getRelatedEntity(
  actionType: MemberActionType,
  metadata: Record<string, unknown>
): string | null {
  switch (actionType) {
    case "client_added":
    case "client_updated":
      return (metadata.client_name as string) ?? null;
    case "document_request_sent":
    case "document_request_completed":
      return (metadata.request_id as string) ?? null;
    case "login":
    case "settings_changed":
      return null;
    default:
      return null;
  }
}
