import { describe, expect, it } from "vitest";
import { deadlineImage, formatDeadlineDate, formatDeadlineDay, nextDeadline } from "../mtd-deadlines";

const imageOn = (iso: string) => deadlineImage(nextDeadline(new Date(iso)))?.src ?? null;

describe("next MTD deadline", () => {
  it("picks the first deadline that has not passed", () => {
    expect(nextDeadline(new Date("2026-10-07T10:00:00Z"))?.label).toBe("Q2");
    expect(nextDeadline(new Date("2026-11-07T20:00:00Z"))?.label).toBe("Q2");
    expect(nextDeadline(new Date("2026-11-08T00:30:00Z"))?.label).toBe("Q3");
    expect(nextDeadline(new Date("2027-05-08T00:30:00Z"))).toBeNull();
  });

  it("formats the date without drifting a day", () => {
    const q2 = nextDeadline(new Date("2026-10-07T10:00:00Z"))!;
    expect(formatDeadlineDate(q2.date)).toBe("7 November 2026");
    expect(formatDeadlineDay(q2.date)).toBe("7 November");
  });
});

describe("deadline photo", () => {
  it("shows the photo whose sticky note matches the next deadline", () => {
    expect(imageOn("2026-10-07T10:00:00Z")).toBe("/images/mtd-deadline-nov-2026.jpg");
    expect(imageOn("2026-11-08T09:00:00Z")).toBe("/images/mtd-deadline-feb-2027.jpg");
    expect(imageOn("2027-02-07T12:00:00Z")).toBe("/images/mtd-deadline-feb-2027.jpg");
  });

  it("shows no photo when there is no matching picture", () => {
    expect(imageOn("2026-08-01T10:00:00Z")).toBeNull(); // Q1 is next, no picture for it
    expect(imageOn("2027-02-08T09:00:00Z")).toBeNull(); // Q4 is next
    expect(imageOn("2027-06-01T09:00:00Z")).toBeNull(); // nothing is next
  });
});
