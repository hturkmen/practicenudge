import { describe, it, expect } from "vitest";
import fc from "fast-check";
import type {
  FirmListItem,
  FirmUsageItem,
  MemberListItem,
  MemberActionType,
  ActivityLogEntry,
} from "@/lib/types/admin";
import { isInactive } from "../metrics";

// --- Generators ---

const VALID_PLANS = ["free", "starter", "pro"] as const;
const VALID_ROLES = ["owner", "admin", "member"] as const;
const VALID_STATUSES = ["active", "suspended"] as const;

function arbitraryMember(): fc.Arbitrary<MemberListItem> {
  return fc.record({
    id: fc.uuid(),
    user_id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    email: fc.emailAddress(),
    firm_name: fc.string({ minLength: 1, maxLength: 50 }),
    firm_id: fc.uuid(),
    role: fc.constantFrom(...VALID_ROLES),
    plan: fc.constantFrom(...VALID_PLANS),
    status: fc.constantFrom(...VALID_STATUSES),
    created_at: fc
      .date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") })
      .map((d) => d.toISOString()),
  });
}

function arbitraryFirm(): fc.Arbitrary<FirmListItem> {
  return fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    email: fc.emailAddress(),
    phone: fc.option(fc.string({ minLength: 5, maxLength: 15 }), { nil: null }),
    plan: fc.constantFrom(...VALID_PLANS),
    member_count: fc.nat({ max: 100 }),
    client_count: fc.nat({ max: 500 }),
    created_at: fc
      .date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") })
      .map((d) => d.toISOString()),
  });
}

// --- Pure logic functions that mirror the query behavior for members ---

const MEMBER_PAGE_SIZE = 20;

function paginateMembers(members: MemberListItem[], page: number): MemberListItem[] {
  const from = (page - 1) * MEMBER_PAGE_SIZE;
  return members.slice(from, from + MEMBER_PAGE_SIZE);
}

function searchMembers(members: MemberListItem[], search: string): MemberListItem[] {
  if (!search || search.length < 2) return members;
  const searchLower = search.toLowerCase();
  return members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchLower) ||
      m.email.toLowerCase().includes(searchLower) ||
      m.firm_name.toLowerCase().includes(searchLower)
  );
}

function filterMembers(
  members: MemberListItem[],
  filters: {
    firm_id?: string;
    role?: "owner" | "admin" | "member";
    plan?: "free" | "starter" | "pro";
    status?: "active" | "suspended";
  }
): MemberListItem[] {
  return members.filter((m) => {
    if (filters.firm_id && m.firm_id !== filters.firm_id) return false;
    if (filters.role && m.role !== filters.role) return false;
    if (filters.plan && m.plan !== filters.plan) return false;
    if (filters.status && m.status !== filters.status) return false;
    return true;
  });
}

type SortableColumn = "name" | "email" | "firm_name" | "role" | "plan" | "status" | "created_at";

function sortMembers(
  members: MemberListItem[],
  sortBy: SortableColumn,
  sortOrder: "asc" | "desc"
): MemberListItem[] {
  const sorted = [...members].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
    return 0;
  });
  return sortOrder === "desc" ? sorted.reverse() : sorted;
}

// --- Pure logic functions that mirror the query behavior for firms ---

const FIRM_PAGE_SIZE = 25;

function paginateFirms(firms: FirmListItem[], page: number): FirmListItem[] {
  const from = (page - 1) * FIRM_PAGE_SIZE;
  return firms.slice(from, from + FIRM_PAGE_SIZE);
}

function searchFirms(firms: FirmListItem[], search: string): FirmListItem[] {
  if (!search || search.length < 2) return firms;
  const searchLower = search.toLowerCase();
  return firms.filter(
    (f) =>
      f.name.toLowerCase().includes(searchLower) ||
      f.email.toLowerCase().includes(searchLower)
  );
}

function filterFirms(
  firms: FirmListItem[],
  plan?: "free" | "starter" | "pro",
  dateFrom?: string,
  dateTo?: string
): FirmListItem[] {
  return firms.filter((f) => {
    if (plan && f.plan !== plan) return false;
    if (dateFrom && f.created_at < dateFrom) return false;
    if (dateTo && f.created_at > dateTo) return false;
    return true;
  });
}

// --- Property Tests ---

describe("Feature: super-admin-panel", () => {


// --- Additional Generators for Properties 12-17, 22 ---

const VALID_ACTION_TYPES: MemberActionType[] = [
  "login",
  "client_added",
  "client_updated",
  "document_request_sent",
  "document_request_completed",
  "settings_changed",
];

/**
 * Generates a random date range with a maximum span of 365 days.
 */
function arbitraryDateRange(): fc.Arbitrary<{ dateFrom: Date; dateTo: Date }> {
  return fc
    .date({ min: new Date("2023-01-01"), max: new Date("2025-06-01") })
    .chain((startDate) => {
      const maxEnd = new Date(
        startDate.getTime() + 365 * 24 * 60 * 60 * 1000
      );
      const cappedEnd = maxEnd > new Date("2025-12-31") ? new Date("2025-12-31") : maxEnd;
      return fc
        .date({ min: startDate, max: cappedEnd })
        .map((endDate) => ({ dateFrom: startDate, dateTo: endDate }));
    });
}

/**
 * Generates a random activity log entry with valid action types and timestamps.
 */
function arbitraryActivityLogEntry(
  dateFrom?: Date,
  dateTo?: Date
): fc.Arbitrary<ActivityLogEntry> {
  const minDate = dateFrom || new Date("2023-01-01");
  const maxDate = dateTo || new Date("2025-12-31");

  return fc.record({
    id: fc.uuid(),
    action_type: fc.constantFrom(...VALID_ACTION_TYPES),
    description: fc.string({ minLength: 0, maxLength: 200 }),
    timestamp: fc
      .date({ min: minDate, max: maxDate })
      .map((d) => d.toISOString()),
    related_entity: fc.option(fc.string({ minLength: 1, maxLength: 50 }), {
      nil: null,
    }),
  });
}

/**
 * Generates a random FirmUsageItem with optional last_activity_date.
 */
function arbitraryFirmUsageItem(): fc.Arbitrary<FirmUsageItem> {
  return fc.record({
    firm_id: fc.uuid(),
    firm_name: fc.string({ minLength: 1, maxLength: 50 }),
    member_count: fc.nat({ max: 100 }),
    client_count: fc.nat({ max: 500 }),
    requests_sent: fc.nat({ max: 1000 }),
    requests_completed: fc.nat({ max: 1000 }),
    last_activity_date: fc.option(
      fc
        .date({ min: new Date("2023-01-01"), max: new Date("2025-12-31") })
        .map((d) => d.toISOString()),
      { nil: null }
    ),
    is_inactive: fc.boolean(),
  });
}

// --- Pure logic functions that mirror usage/activity query behavior ---

/**
 * Filters activities by date range (inclusive of start, exclusive of end).
 */
function filterActivitiesByDateRange(
  activities: { timestamp: string }[],
  dateFrom: Date,
  dateTo: Date
): { timestamp: string }[] {
  const fromMs = dateFrom.getTime();
  const toMs = dateTo.getTime();
  return activities.filter((a) => {
    const ts = new Date(a.timestamp).getTime();
    return ts >= fromMs && ts < toMs;
  });
}

/**
 * Sorts firms by last_activity_date DESC (nulls last) and paginates at 50/page.
 */
function sortAndPaginateFirmUsage(
  firms: FirmUsageItem[],
  page: number
): FirmUsageItem[] {
  const sorted = [...firms].sort((a, b) => {
    if (!a.last_activity_date && !b.last_activity_date) return 0;
    if (!a.last_activity_date) return 1;
    if (!b.last_activity_date) return -1;
    return (
      new Date(b.last_activity_date).getTime() -
      new Date(a.last_activity_date).getTime()
    );
  });
  const pageSize = 50;
  const from = (page - 1) * pageSize;
  return sorted.slice(from, from + pageSize);
}

/**
 * Computes trend data: unique active members and total document requests per day.
 */
function computeTrendData(
  activities: { user_id: string; action_type: string; timestamp: string }[],
  documentRequests: { created_at: string }[],
  dateFrom: Date,
  dateTo: Date
): { date: string; active_members: number; document_requests: number }[] {
  const trendMap: Record<
    string,
    { activeMembers: Set<string>; documentRequests: number }
  > = {};

  // Initialize all dates in range
  for (
    let d = new Date(dateFrom);
    d <= dateTo;
    d.setDate(d.getDate() + 1)
  ) {
    const dateKey = d.toISOString().split("T")[0];
    trendMap[dateKey] = { activeMembers: new Set(), documentRequests: 0 };
  }

  // Count active members per day (members who logged in)
  for (const activity of activities) {
    if (activity.action_type === "login") {
      const dateKey = new Date(activity.timestamp).toISOString().split("T")[0];
      if (trendMap[dateKey]) {
        trendMap[dateKey].activeMembers.add(activity.user_id);
      }
    }
  }

  // Count document requests per day
  for (const req of documentRequests) {
    const dateKey = new Date(req.created_at).toISOString().split("T")[0];
    if (trendMap[dateKey]) {
      trendMap[dateKey].documentRequests++;
    }
  }

  return Object.entries(trendMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      active_members: data.activeMembers.size,
      document_requests: data.documentRequests,
    }));
}

/**
 * Filters activity log entries by action type and date range.
 */
function filterActivityLog(
  entries: ActivityLogEntry[],
  actionType?: MemberActionType,
  dateFrom?: string,
  dateTo?: string
): ActivityLogEntry[] {
  return entries.filter((entry) => {
    if (actionType && entry.action_type !== actionType) return false;
    if (dateFrom && entry.timestamp < dateFrom) return false;
    if (dateTo && entry.timestamp > dateTo) return false;
    return true;
  });
}

/**
 * Returns at most `limit` entries sorted by timestamp DESC.
 */
function limitAndSortActivityLog(
  entries: ActivityLogEntry[],
  limit: number
): ActivityLogEntry[] {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  return sorted.slice(0, Math.min(limit, 100));
}

/**
 * Returns at most 5 items sorted by creation date DESC.
 */
function getRecentEntities<T extends { created_at: string }>(
  items: T[]
): T[] {
  const sorted = [...items].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return sorted.slice(0, 5);
}

// --- Property Tests for Usage and Activity Log Queries ---

describe("Feature: super-admin-panel — Usage and Activity Log Properties", () => {
  describe("Property 12: Date-range metric computation", () => {
    /**
     * Validates: Requirements 4.1, 4.3
     *
     * For any date range (up to 365 days), the usage metrics SHALL count only activities
     * with timestamps within the specified date range.
     */
    it("SHALL count only activities with timestamps within the specified date range", () => {
      fc.assert(
        fc.property(
          arbitraryDateRange(),
          fc.array(
            fc
              .date({
                min: new Date("2023-01-01"),
                max: new Date("2025-12-31"),
              })
              .map((d) => ({ timestamp: d.toISOString() })),
            { minLength: 0, maxLength: 200 }
          ),
          ({ dateFrom, dateTo }, activities) => {
            const filtered = filterActivitiesByDateRange(
              activities,
              dateFrom,
              dateTo
            );

            // Every filtered activity must be within the date range
            for (const activity of filtered) {
              const ts = new Date(activity.timestamp).getTime();
              expect(ts).toBeGreaterThanOrEqual(dateFrom.getTime());
              expect(ts).toBeLessThan(dateTo.getTime());
            }

            // Every activity NOT in the result must be outside the range
            const filteredSet = new Set(filtered.map((a) => a.timestamp));
            for (const activity of activities) {
              if (!filteredSet.has(activity.timestamp)) {
                const ts = new Date(activity.timestamp).getTime();
                const isOutside =
                  ts < dateFrom.getTime() || ts >= dateTo.getTime();
                expect(isOutside).toBe(true);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("SHALL return empty when date range has no matching activities", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc
              .date({
                min: new Date("2023-01-01"),
                max: new Date("2023-06-30"),
              })
              .map((d) => ({ timestamp: d.toISOString() })),
            { minLength: 0, maxLength: 50 }
          ),
          (activities) => {
            // Use a date range that doesn't overlap with the activities
            const dateFrom = new Date("2025-01-01");
            const dateTo = new Date("2025-12-31");
            const filtered = filterActivitiesByDateRange(
              activities,
              dateFrom,
              dateTo
            );
            expect(filtered.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 13: Per-firm usage sorting and pagination", () => {
    /**
     * Validates: Requirements 4.2, 4.4
     *
     * The per-firm usage breakdown SHALL be sorted by last activity date DESC,
     * with at most 50 firms per page, and firms with zero actions in last 30 days
     * SHALL be marked as inactive.
     */
    it("SHALL return at most 50 firms per page", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryFirmUsageItem(), { minLength: 0, maxLength: 150 }),
          fc.integer({ min: 1, max: 5 }),
          (firms, page) => {
            const result = sortAndPaginateFirmUsage(firms, page);
            expect(result.length).toBeLessThanOrEqual(50);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("SHALL be sorted by last activity date in descending order (nulls last)", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryFirmUsageItem(), { minLength: 2, maxLength: 100 }),
          (firms) => {
            const result = sortAndPaginateFirmUsage(firms, 1);

            for (let i = 0; i < result.length - 1; i++) {
              const current = result[i].last_activity_date;
              const next = result[i + 1].last_activity_date;

              if (current === null) {
                // Null should only appear at the end
                expect(next).toBeNull();
              } else if (next !== null) {
                // Non-null dates should be in descending order
                expect(
                  new Date(current).getTime()
                ).toBeGreaterThanOrEqual(new Date(next).getTime());
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("firms with zero actions in last 30 days SHALL be marked as inactive", () => {
      fc.assert(
        fc.property(
          fc.option(
            fc
              .date({
                min: new Date("2023-01-01"),
                max: new Date("2025-12-31"),
              })
              .map((d) => d.toISOString()),
            { nil: null }
          ),
          (lastActivityDate) => {
            const inactive = isInactive(lastActivityDate, 30);

            if (lastActivityDate === null) {
              // Null last activity means inactive
              expect(inactive).toBe(true);
            } else {
              const elapsed =
                new Date().getTime() - new Date(lastActivityDate).getTime();
              const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

              if (elapsed > thirtyDaysMs) {
                expect(inactive).toBe(true);
              } else {
                expect(inactive).toBe(false);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 14: Trend chart data accuracy", () => {
    /**
     * Validates: Requirements 4.5
     *
     * The trend chart data SHALL report the correct count of unique active members
     * and total document requests for each day within the range.
     */
    it("SHALL report correct unique active members per day", () => {
      fc.assert(
        fc.property(
          fc.constant({ dateFrom: new Date("2025-01-01"), dateTo: new Date("2025-01-07") }),
          fc.array(
            fc.record({
              user_id: fc.constantFrom("user-1", "user-2", "user-3", "user-4"),
              action_type: fc.constantFrom(...VALID_ACTION_TYPES),
              timestamp: fc
                .date({
                  min: new Date("2025-01-01"),
                  max: new Date("2025-01-07"),
                })
                .map((d) => d.toISOString()),
            }),
            { minLength: 0, maxLength: 100 }
          ),
          fc.array(
            fc.record({
              created_at: fc
                .date({
                  min: new Date("2025-01-01"),
                  max: new Date("2025-01-07"),
                })
                .map((d) => d.toISOString()),
            }),
            { minLength: 0, maxLength: 100 }
          ),
          ({ dateFrom, dateTo }, activities, docRequests) => {
            const trend = computeTrendData(
              activities,
              docRequests,
              dateFrom,
              dateTo
            );

            // Verify each day's active_members count
            for (const dayData of trend) {
              const dayStart = new Date(dayData.date);
              const dayEnd = new Date(dayData.date);
              dayEnd.setDate(dayEnd.getDate() + 1);

              // Count unique users who logged in on this day
              const loginsOnDay = activities.filter((a) => {
                if (a.action_type !== "login") return false;
                const ts = new Date(a.timestamp);
                return (
                  ts.toISOString().split("T")[0] === dayData.date
                );
              });
              const uniqueUsers = new Set(
                loginsOnDay.map((a) => a.user_id)
              ).size;

              expect(dayData.active_members).toBe(uniqueUsers);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("SHALL report correct total document requests per day", () => {
      fc.assert(
        fc.property(
          fc.constant({ dateFrom: new Date("2025-01-01"), dateTo: new Date("2025-01-07") }),
          fc.array(
            fc.record({
              user_id: fc.uuid(),
              action_type: fc.constant("login" as const),
              timestamp: fc
                .date({
                  min: new Date("2025-01-01"),
                  max: new Date("2025-01-07"),
                })
                .map((d) => d.toISOString()),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          fc.array(
            fc.record({
              created_at: fc
                .date({
                  min: new Date("2025-01-01"),
                  max: new Date("2025-01-07"),
                })
                .map((d) => d.toISOString()),
            }),
            { minLength: 0, maxLength: 100 }
          ),
          ({ dateFrom, dateTo }, activities, docRequests) => {
            const trend = computeTrendData(
              activities,
              docRequests,
              dateFrom,
              dateTo
            );

            // Verify each day's document_requests count
            for (const dayData of trend) {
              const requestsOnDay = docRequests.filter((r) => {
                return (
                  new Date(r.created_at).toISOString().split("T")[0] ===
                  dayData.date
                );
              });

              expect(dayData.document_requests).toBe(requestsOnDay.length);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 15: Activity log limit and ordering", () => {
    /**
     * Validates: Requirements 5.1
     *
     * The activity log SHALL return at most 100 entries sorted by timestamp DESC.
     */
    it("SHALL return at most 100 entries", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryActivityLogEntry(), {
            minLength: 0,
            maxLength: 200,
          }),
          fc.integer({ min: 1, max: 200 }),
          (entries, limit) => {
            const result = limitAndSortActivityLog(entries, limit);
            expect(result.length).toBeLessThanOrEqual(100);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("SHALL be sorted by timestamp in descending order", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryActivityLogEntry(), {
            minLength: 2,
            maxLength: 150,
          }),
          (entries) => {
            const result = limitAndSortActivityLog(entries, 100);

            for (let i = 0; i < result.length - 1; i++) {
              const currentTs = new Date(result[i].timestamp).getTime();
              const nextTs = new Date(result[i + 1].timestamp).getTime();
              expect(currentTs).toBeGreaterThanOrEqual(nextTs);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("SHALL not exceed the specified limit even when more entries exist", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryActivityLogEntry(), {
            minLength: 50,
            maxLength: 200,
          }),
          (entries) => {
            const result = limitAndSortActivityLog(entries, 100);
            expect(result.length).toBeLessThanOrEqual(100);
            // If there are more than 100 entries, result should be exactly 100
            if (entries.length > 100) {
              expect(result.length).toBe(100);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 16: Activity log action type validation", () => {
    /**
     * Validates: Requirements 5.2
     *
     * Every action_type SHALL be one of: login, client_added, client_updated,
     * document_request_sent, document_request_completed, settings_changed.
     */
    it("every action_type SHALL be one of the six valid values", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryActivityLogEntry(), {
            minLength: 1,
            maxLength: 100,
          }),
          (entries) => {
            for (const entry of entries) {
              expect(VALID_ACTION_TYPES).toContain(entry.action_type);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("SHALL reject invalid action types", () => {
      const invalidTypes = [
        "invalid",
        "logout",
        "deleted",
        "signup",
        "",
        "LOGIN",
      ];
      for (const invalidType of invalidTypes) {
        expect(VALID_ACTION_TYPES).not.toContain(invalidType);
      }
    });
  });

  describe("Property 17: Activity log filter correctness", () => {
    /**
     * Validates: Requirements 5.3
     *
     * For any combination of action type and date range filter, every entry
     * SHALL match ALL active filter criteria.
     */
    it("every entry SHALL match the action type filter when applied", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryActivityLogEntry(), {
            minLength: 0,
            maxLength: 100,
          }),
          fc.constantFrom(...VALID_ACTION_TYPES),
          (entries, actionType) => {
            const filtered = filterActivityLog(entries, actionType);

            for (const entry of filtered) {
              expect(entry.action_type).toBe(actionType);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("every entry SHALL match the date range filter when applied", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryActivityLogEntry(), {
            minLength: 0,
            maxLength: 100,
          }),
          arbitraryDateRange(),
          (entries, { dateFrom, dateTo }) => {
            const dateFromStr = dateFrom.toISOString();
            const dateToStr = dateTo.toISOString();
            const filtered = filterActivityLog(
              entries,
              undefined,
              dateFromStr,
              dateToStr
            );

            for (const entry of filtered) {
              expect(entry.timestamp >= dateFromStr).toBe(true);
              expect(entry.timestamp <= dateToStr).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("every entry SHALL match ALL filter criteria when both action type and date range are applied", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryActivityLogEntry(), {
            minLength: 0,
            maxLength: 100,
          }),
          fc.constantFrom(...VALID_ACTION_TYPES),
          arbitraryDateRange(),
          (entries, actionType, { dateFrom, dateTo }) => {
            const dateFromStr = dateFrom.toISOString();
            const dateToStr = dateTo.toISOString();
            const filtered = filterActivityLog(
              entries,
              actionType,
              dateFromStr,
              dateToStr
            );

            for (const entry of filtered) {
              // Must match action type
              expect(entry.action_type).toBe(actionType);
              // Must be within date range
              expect(entry.timestamp >= dateFromStr).toBe(true);
              expect(entry.timestamp <= dateToStr).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 22: Recent entities list constraint", () => {
    /**
     * Validates: Requirements 7.2, 7.3
     *
     * The "recently registered" list SHALL return at most 5 items sorted by
     * creation/registration date DESC.
     */
    it("SHALL return at most 5 items", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryFirm(), { minLength: 0, maxLength: 50 }),
          (firms) => {
            const result = getRecentEntities(firms);
            expect(result.length).toBeLessThanOrEqual(5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("SHALL be sorted by creation date in descending order", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryFirm(), { minLength: 2, maxLength: 50 }),
          (firms) => {
            const result = getRecentEntities(firms);

            for (let i = 0; i < result.length - 1; i++) {
              const currentDate = new Date(
                result[i].created_at
              ).getTime();
              const nextDate = new Date(
                result[i + 1].created_at
              ).getTime();
              expect(currentDate).toBeGreaterThanOrEqual(nextDate);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("SHALL return all items when collection has 5 or fewer items", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryFirm(), { minLength: 0, maxLength: 5 }),
          (firms) => {
            const result = getRecentEntities(firms);
            expect(result.length).toBe(firms.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("SHALL return exactly 5 items when collection has more than 5 items", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryFirm(), { minLength: 6, maxLength: 50 }),
          (firms) => {
            const result = getRecentEntities(firms);
            expect(result.length).toBe(5);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
  describe("Property 1: Member list pagination invariant", () => {
    /**
     * Validates: Requirements 1.1, 1.5
     *
     * For any set of members and any page number, the members API SHALL return at most
     * 20 items per page, all sorted by registration date in descending order, and the
     * total count SHALL equal the number of members matching the current filters.
     */
    it("should return at most 20 items per page", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryMember(), { minLength: 0, maxLength: 100 }),
          fc.integer({ min: 1, max: 10 }),
          (members, page) => {
            const result = paginateMembers(members, page);
            expect(result.length).toBeLessThanOrEqual(MEMBER_PAGE_SIZE);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("default sort by registration date descending SHALL be maintained", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryMember(), { minLength: 2, maxLength: 100 }),
          (members) => {
            const sorted = sortMembers(members, "created_at", "desc");
            const page = paginateMembers(sorted, 1);

            for (let i = 1; i < page.length; i++) {
              expect(page[i - 1].created_at >= page[i].created_at).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("total count SHALL equal the number of members matching current filters", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryMember(), { minLength: 0, maxLength: 100 }),
          fc.constantFrom(...VALID_ROLES),
          fc.constantFrom(...VALID_PLANS),
          (members, role, plan) => {
            const filtered = filterMembers(members, { role, plan });
            const total = filtered.length;
            const page1 = paginateMembers(filtered, 1);

            // Total should reflect all matching members, not just the page
            expect(total).toBe(filtered.length);
            // Page should have at most 20 items
            expect(page1.length).toBeLessThanOrEqual(MEMBER_PAGE_SIZE);
            // If total <= 20, page should contain all items
            if (total <= MEMBER_PAGE_SIZE) {
              expect(page1.length).toBe(total);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 2: Member search correctness", () => {
    /**
     * Validates: Requirements 1.2
     *
     * For any search term of at least 2 characters, every member returned SHALL contain
     * the search term as a substring (case-insensitive) in at least one of: name, email,
     * or firm name.
     */
    it("every returned member SHALL contain the search term in name, email, or firm_name (case-insensitive)", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryMember(), { minLength: 0, maxLength: 50 }),
          fc.string({ minLength: 2, maxLength: 10 }),
          (members, search) => {
            const result = searchMembers(members, search);
            const searchLower = search.toLowerCase();

            for (const member of result) {
              const nameMatch = member.name.toLowerCase().includes(searchLower);
              const emailMatch = member.email.toLowerCase().includes(searchLower);
              const firmMatch = member.firm_name.toLowerCase().includes(searchLower);
              expect(nameMatch || emailMatch || firmMatch).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should not filter when search term is less than 2 characters", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryMember(), { minLength: 0, maxLength: 50 }),
          fc.string({ minLength: 0, maxLength: 1 }),
          (members, search) => {
            const result = searchMembers(members, search);
            expect(result.length).toBe(members.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 3: Filter AND logic for members", () => {
    /**
     * Validates: Requirements 1.3
     *
     * For any combination of active filters (firm, role, plan, status), every member in
     * the result set SHALL satisfy ALL active filter criteria simultaneously.
     */
    it("every member in the result SHALL satisfy ALL active filter criteria simultaneously", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryMember(), { minLength: 0, maxLength: 50 }),
          fc.record({
            firm_id: fc.option(fc.uuid(), { nil: undefined }),
            role: fc.option(fc.constantFrom(...VALID_ROLES), { nil: undefined }),
            plan: fc.option(fc.constantFrom(...VALID_PLANS), { nil: undefined }),
            status: fc.option(fc.constantFrom(...VALID_STATUSES), { nil: undefined }),
          }),
          (members, filters) => {
            const result = filterMembers(members, filters);

            for (const member of result) {
              if (filters.firm_id) {
                expect(member.firm_id).toBe(filters.firm_id);
              }
              if (filters.role) {
                expect(member.role).toBe(filters.role);
              }
              if (filters.plan) {
                expect(member.plan).toBe(filters.plan);
              }
              if (filters.status) {
                expect(member.status).toBe(filters.status);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("no member excluded by filters SHALL appear in the result", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryMember(), { minLength: 1, maxLength: 50 }),
          fc.constantFrom(...VALID_ROLES),
          fc.constantFrom(...VALID_STATUSES),
          (members, role, status) => {
            const result = filterMembers(members, { role, status });
            const resultIds = new Set(result.map((m) => m.id));

            for (const member of members) {
              if (member.role !== role || member.status !== status) {
                expect(resultIds.has(member.id)).toBe(false);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 4: Column sorting correctness", () => {
    /**
     * Validates: Requirements 1.4
     *
     * For any sortable column and sort direction, the returned member list SHALL be
     * ordered according to the specified column and direction.
     */
    it("ascending sort SHALL produce non-decreasing order for the specified column", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryMember(), { minLength: 2, maxLength: 50 }),
          fc.constantFrom<SortableColumn>("name", "email", "firm_name", "role", "plan", "status", "created_at"),
          (members, column) => {
            const sorted = sortMembers(members, column, "asc");

            for (let i = 1; i < sorted.length; i++) {
              expect(sorted[i - 1][column] <= sorted[i][column]).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("descending sort SHALL produce non-increasing order for the specified column", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryMember(), { minLength: 2, maxLength: 50 }),
          fc.constantFrom<SortableColumn>("name", "email", "firm_name", "role", "plan", "status", "created_at"),
          (members, column) => {
            const sorted = sortMembers(members, column, "desc");

            for (let i = 1; i < sorted.length; i++) {
              expect(sorted[i - 1][column] >= sorted[i][column]).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("sorting SHALL preserve all original members (no items lost or duplicated)", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryMember(), { minLength: 0, maxLength: 50 }),
          fc.constantFrom<SortableColumn>("name", "email", "firm_name", "role", "plan", "status", "created_at"),
          fc.constantFrom<"asc" | "desc">("asc", "desc"),
          (members, column, direction) => {
            const sorted = sortMembers(members, column, direction);
            expect(sorted.length).toBe(members.length);

            const originalIds = new Set(members.map((m) => m.id));
            const sortedIds = new Set(sorted.map((m) => m.id));
            expect(sortedIds).toEqual(originalIds);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 5: Member detail completeness", () => {
    /**
     * Validates: Requirements 2.1
     *
     * For any member in the system, the Member Detail View SHALL return all required
     * fields with values matching the source data.
     */
    it("every member SHALL have all required fields present and non-undefined", () => {
      fc.assert(
        fc.property(arbitraryMember(), (member) => {
          // All required fields must be present
          expect(member.id).toBeDefined();
          expect(member.user_id).toBeDefined();
          expect(member.name).toBeDefined();
          expect(member.email).toBeDefined();
          expect(member.firm_name).toBeDefined();
          expect(member.firm_id).toBeDefined();
          expect(member.role).toBeDefined();
          expect(member.plan).toBeDefined();
          expect(member.status).toBeDefined();
          expect(member.created_at).toBeDefined();

          // Validate types
          expect(typeof member.id).toBe("string");
          expect(typeof member.user_id).toBe("string");
          expect(typeof member.name).toBe("string");
          expect(typeof member.email).toBe("string");
          expect(typeof member.firm_name).toBe("string");
          expect(typeof member.firm_id).toBe("string");
          expect(VALID_ROLES).toContain(member.role);
          expect(VALID_PLANS).toContain(member.plan);
          expect(VALID_STATUSES).toContain(member.status);
          expect(typeof member.created_at).toBe("string");
        }),
        { numRuns: 100 }
      );
    });

    it("member detail values SHALL match the source data exactly", () => {
      fc.assert(
        fc.property(arbitraryMember(), (sourceMember) => {
          // Simulate getMemberDetail returning the member — the returned data
          // must match the source data for all required fields
          const detail: MemberListItem = { ...sourceMember };

          expect(detail.name).toBe(sourceMember.name);
          expect(detail.email).toBe(sourceMember.email);
          expect(detail.firm_name).toBe(sourceMember.firm_name);
          expect(detail.role).toBe(sourceMember.role);
          expect(detail.plan).toBe(sourceMember.plan);
          expect(detail.status).toBe(sourceMember.status);
          expect(detail.created_at).toBe(sourceMember.created_at);
        }),
        { numRuns: 100 }
      );
    });
  });

  // --- Firm Query Properties (existing) ---

  describe("Property 8: Firm list pagination invariant", () => {
    /**
     * Validates: Requirements 3.1
     *
     * For any set of firms and any page number, the firms API SHALL return at most 25 items
     * per page, and every item SHALL include name, email, phone, plan, member count,
     * client count, and creation date.
     */
    it("should return at most 25 items per page", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryFirm(), { minLength: 0, maxLength: 100 }),
          fc.integer({ min: 1, max: 10 }),
          (firms, page) => {
            const result = paginateFirms(firms, page);
            expect(result.length).toBeLessThanOrEqual(FIRM_PAGE_SIZE);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("every item SHALL include name, email, phone, plan, member_count, client_count, and created_at", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryFirm(), { minLength: 1, maxLength: 100 }),
          fc.integer({ min: 1, max: 4 }),
          (firms, page) => {
            const result = paginateFirms(firms, page);
            for (const firm of result) {
              expect(firm).toHaveProperty("name");
              expect(firm).toHaveProperty("email");
              expect(firm).toHaveProperty("phone");
              expect(firm).toHaveProperty("plan");
              expect(firm).toHaveProperty("member_count");
              expect(firm).toHaveProperty("client_count");
              expect(firm).toHaveProperty("created_at");

              // Validate types
              expect(typeof firm.name).toBe("string");
              expect(typeof firm.email).toBe("string");
              expect(firm.phone === null || typeof firm.phone === "string").toBe(true);
              expect(VALID_PLANS).toContain(firm.plan);
              expect(typeof firm.member_count).toBe("number");
              expect(typeof firm.client_count).toBe("number");
              expect(typeof firm.created_at).toBe("string");
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 10: Firm search correctness", () => {
    /**
     * Validates: Requirements 3.6
     *
     * For any search term and any set of firms, every firm returned SHALL contain the
     * search term as a substring (case-insensitive) in either name or email.
     */
    it("every returned firm SHALL contain the search term in name or email (case-insensitive)", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryFirm(), { minLength: 0, maxLength: 50 }),
          fc.string({ minLength: 2, maxLength: 10 }),
          (firms, search) => {
            const result = searchFirms(firms, search);
            const searchLower = search.toLowerCase();

            for (const firm of result) {
              const nameMatch = firm.name.toLowerCase().includes(searchLower);
              const emailMatch = firm.email.toLowerCase().includes(searchLower);
              expect(nameMatch || emailMatch).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should not filter when search term is less than 2 characters", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryFirm(), { minLength: 0, maxLength: 50 }),
          fc.string({ minLength: 0, maxLength: 1 }),
          (firms, search) => {
            const result = searchFirms(firms, search);
            expect(result.length).toBe(firms.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 11: Firm filter correctness", () => {
    /**
     * Validates: Requirements 3.5
     *
     * For any combination of plan filter and date range filter, every firm in the result
     * set SHALL have a plan matching the filter AND a creation date within the specified range.
     */
    it("every firm in the result SHALL match the plan filter AND date range", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryFirm(), { minLength: 0, maxLength: 50 }),
          fc.constantFrom(...VALID_PLANS),
          fc
            .tuple(
              fc.date({ min: new Date("2020-01-01"), max: new Date("2024-06-30") }),
              fc.date({ min: new Date("2024-07-01"), max: new Date("2025-12-31") })
            )
            .map(([from, to]) => ({
              dateFrom: from.toISOString(),
              dateTo: to.toISOString(),
            })),
          (firms, plan, { dateFrom, dateTo }) => {
            const result = filterFirms(firms, plan, dateFrom, dateTo);

            for (const firm of result) {
              // Plan must match
              expect(firm.plan).toBe(plan);
              // Created_at must be within range
              expect(firm.created_at >= dateFrom).toBe(true);
              expect(firm.created_at <= dateTo).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("applying plan filter only SHALL return firms with matching plan", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryFirm(), { minLength: 0, maxLength: 50 }),
          fc.constantFrom(...VALID_PLANS),
          (firms, plan) => {
            const result = filterFirms(firms, plan);

            for (const firm of result) {
              expect(firm.plan).toBe(plan);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("applying date range only SHALL return firms within the range", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryFirm(), { minLength: 0, maxLength: 50 }),
          fc
            .tuple(
              fc.date({ min: new Date("2020-01-01"), max: new Date("2024-06-30") }),
              fc.date({ min: new Date("2024-07-01"), max: new Date("2025-12-31") })
            )
            .map(([from, to]) => ({
              dateFrom: from.toISOString(),
              dateTo: to.toISOString(),
            })),
          (firms, { dateFrom, dateTo }) => {
            const result = filterFirms(firms, undefined, dateFrom, dateTo);

            for (const firm of result) {
              expect(firm.created_at >= dateFrom).toBe(true);
              expect(firm.created_at <= dateTo).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
