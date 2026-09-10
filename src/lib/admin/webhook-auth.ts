import { timingSafeEqual } from "node:crypto";

export function hasBearerSecret(request: Request, secret: string | undefined): boolean {
  if (!secret) return false;
  const actual = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from("Bearer " + secret);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
