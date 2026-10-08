import { describe, expect, it } from "vitest";
import { ctaForHref } from "../analytics";

describe("ctaForHref", () => {
  it("recognises the pilot, tracker and explainer links", () => {
    expect(ctaForHref("/register")).toBe("join_pilot");
    expect(ctaForHref("/register?invite=abc")).toBe("join_pilot");
    expect(ctaForHref("#get-tracker")).toBe("get_tracker");
    expect(ctaForHref("/mtd")).toBe("get_tracker");
    expect(ctaForHref("/what-is-mtd")).toBe("read_explainer");
  });

  it("ignores every other link", () => {
    expect(ctaForHref("/")).toBeNull();
    expect(ctaForHref("/blog")).toBeNull();
    expect(ctaForHref("#options")).toBeNull();
    expect(ctaForHref("https://www.gov.uk/mtd")).toBeNull();
    expect(ctaForHref(null)).toBeNull();
  });
});
