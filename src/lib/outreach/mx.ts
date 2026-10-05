import { promises as dns } from "node:dns";

type Lookup = (domain: string) => Promise<unknown[]>;
type Options = { resolveMx?: Lookup; resolve4?: Lookup; timeoutMs?: number };

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("timeout")), ms); }),
  ]).finally(() => { if (timer) clearTimeout(timer); });
}

/**
 * true: the domain accepts mail. false: it definitely does not (no such domain, or no MX/A record).
 * null: the lookup failed or timed out, so the address is given the benefit of the doubt.
 */
export async function domainAcceptsMail(email: string, options: Options = {}): Promise<boolean | null> {
  const { resolveMx = dns.resolveMx, resolve4 = dns.resolve4, timeoutMs = 3000 } = options;
  const domain = email.split("@").pop()?.toLowerCase();
  if (!domain) return false;
  try {
    return (await withTimeout(resolveMx(domain), timeoutMs)).length > 0;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "ENOTFOUND") return false;
    // No MX record: mail can still be delivered to the domain's A record (RFC 5321).
    if (code === "ENODATA") {
      try {
        return (await withTimeout(resolve4(domain), timeoutMs)).length > 0;
      } catch (fallbackError) {
        const fallbackCode = (fallbackError as { code?: string }).code;
        return fallbackCode === "ENODATA" || fallbackCode === "ENOTFOUND" ? false : null;
      }
    }
    return null;
  }
}
