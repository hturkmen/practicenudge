import { describe, it, expect } from "vitest";
import { domainAcceptsMail } from "../mx";

const fail = (code: string) => () => Promise.reject(Object.assign(new Error(code), { code }));

describe("mail domain check", () => {
  it("accepts a domain with MX records", async () => {
    expect(await domainAcceptsMail("a@practice.co.uk", { resolveMx: async () => [{ exchange: "mx" }] })).toBe(true);
  });
  it("rejects a domain that does not exist", async () => {
    expect(await domainAcceptsMail("a@no-such-domain.test", { resolveMx: fail("ENOTFOUND") })).toBe(false);
  });
  it("falls back to the A record when there is no MX record", async () => {
    expect(await domainAcceptsMail("a@x.test", { resolveMx: fail("ENODATA"), resolve4: async () => ["1.2.3.4"] })).toBe(true);
    expect(await domainAcceptsMail("a@x.test", { resolveMx: fail("ENODATA"), resolve4: fail("ENODATA") })).toBe(false);
  });
  it("gives the benefit of the doubt when DNS is unavailable or slow", async () => {
    expect(await domainAcceptsMail("a@x.test", { resolveMx: fail("ETIMEOUT") })).toBeNull();
    expect(await domainAcceptsMail("a@x.test", { resolveMx: () => new Promise(() => {}), timeoutMs: 10 })).toBeNull();
  });
});
