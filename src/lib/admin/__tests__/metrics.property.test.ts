import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { computeCompletionRate, computeMonthOverMonth } from "../metrics";

describe("Feature: super-admin-panel, Property 21: Completion rate computation", () => {
  /**
   * Validates: Requirements 7.1
   *
   * For any non-negative integers `total` and `completed` where `completed <= total`,
   * the completion rate SHALL equal Math.floor(completed / total * 100) when total > 0,
   * and 0 when total === 0.
   */
  it("should return Math.floor(completed / total * 100) when total > 0", () => {
    fc.assert(
      fc.property(
        fc.nat().filter((n) => n > 0),
        fc.nat(),
        (total, rawCompleted) => {
          const completed = rawCompleted % (total + 1); // ensure completed <= total
          const result = computeCompletionRate(total, completed);
          const expected = Math.floor((completed / total) * 100);
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should return 0 when total === 0", () => {
    fc.assert(
      fc.property(fc.nat(), (completed) => {
        const result = computeCompletionRate(0, completed);
        expect(result).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it("should always return a value between 0 and 100 inclusive", () => {
    fc.assert(
      fc.property(
        fc.nat().filter((n) => n > 0),
        fc.nat(),
        (total, rawCompleted) => {
          const completed = rawCompleted % (total + 1); // ensure completed <= total
          const result = computeCompletionRate(total, completed);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Feature: super-admin-panel, Property 23: Month-over-month growth calculation", () => {
  /**
   * Validates: Requirements 7.5
   *
   * For any current month count and previous month count, the MoM percentage
   * SHALL equal Math.round((current - previous) / previous * 100) when previous > 0,
   * and 0 when previous === 0.
   */
  it("should return Math.round((current - previous) / previous * 100) when previous > 0", () => {
    fc.assert(
      fc.property(
        fc.nat(),
        fc.nat().filter((n) => n > 0),
        (current, previous) => {
          const result = computeMonthOverMonth(current, previous);
          const expected = Math.round(((current - previous) / previous) * 100);
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should return 0 when previous === 0", () => {
    fc.assert(
      fc.property(fc.nat(), (current) => {
        const result = computeMonthOverMonth(current, 0);
        expect(result).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it("should return 0 when current equals previous (no growth)", () => {
    fc.assert(
      fc.property(
        fc.nat().filter((n) => n > 0),
        (value) => {
          const result = computeMonthOverMonth(value, value);
          expect(result).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
