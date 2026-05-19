import { describe, it, expect } from "vitest";
import {
  getConsentStatusLabel,
  formatConsentDate,
  getChannelDescription,
} from "../utils";

describe("getConsentStatusLabel", () => {
  it('returns "Onay Bekleniyor" for pending status', () => {
    expect(getConsentStatusLabel("pending")).toBe("Onay Bekleniyor");
  });

  it('returns "Onaylandı" for accepted status', () => {
    expect(getConsentStatusLabel("accepted")).toBe("Onaylandı");
  });

  it('returns "Reddedildi" for rejected status', () => {
    expect(getConsentStatusLabel("rejected")).toBe("Reddedildi");
  });
});

describe("formatConsentDate", () => {
  it("formats ISO date string to dd/MM/yyyy", () => {
    expect(formatConsentDate("2024-03-15T10:30:00Z")).toBe("15/03/2024");
  });

  it("zero-pads single digit day and month", () => {
    expect(formatConsentDate("2024-01-05T00:00:00Z")).toBe("05/01/2024");
  });

  it("handles date-only string", () => {
    expect(formatConsentDate("2023-12-25")).toBe("25/12/2023");
  });

  it("handles end of year date", () => {
    expect(formatConsentDate("2024-12-31T23:59:59Z")).toBe("31/12/2024");
  });
});

describe("getChannelDescription", () => {
  it("returns description for email channel", () => {
    const desc = getChannelDescription("email");
    expect(desc).toContain("E-posta");
    expect(desc).toContain("geri çekebilirsiniz");
  });

  it("returns description for sms channel", () => {
    const desc = getChannelDescription("sms");
    expect(desc).toContain("SMS");
    expect(desc).toContain("geri çekebilirsiniz");
  });

  it("email description mentions communication types", () => {
    const desc = getChannelDescription("email");
    expect(desc).toContain("hatırlatma");
    expect(desc).toContain("belge talep");
  });

  it("sms description mentions communication types", () => {
    const desc = getChannelDescription("sms");
    expect(desc).toContain("hatırlatma");
  });
});
