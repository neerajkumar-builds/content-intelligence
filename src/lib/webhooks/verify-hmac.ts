import { createHmac, createHash } from "crypto";

export function verifyHmac(
  secret: string,
  rawBody: string,
  signature: string,
): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return `sha256=${expected}` === signature || expected === signature;
}

export function payloadHash(rawBody: string): string {
  return createHash("sha256").update(rawBody).digest("hex");
}
