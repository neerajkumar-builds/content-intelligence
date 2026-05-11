import { createHmac, createHash, timingSafeEqual } from "crypto";

export function verifyHmac(
  secret: string,
  rawBody: string,
  signature: string,
): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const normalized = signature.startsWith("sha256=")
    ? signature.slice(7)
    : signature;
  if (normalized.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(normalized), Buffer.from(expected));
}

export function payloadHash(rawBody: string): string {
  return createHash("sha256").update(rawBody).digest("hex");
}
