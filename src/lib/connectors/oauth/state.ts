import { createHmac, randomBytes } from "crypto";

const ENCRYPTION_KEY = process.env.OAUTH_ENCRYPTION_KEY ?? "";
const STATE_TTL_MS = 10 * 60 * 1000;

interface StatePayload {
  platform: string;
  workspaceId: string;
  userId: string;
  nonce: string;
  timestamp: number;
}

function sign(payload: string): string {
  return createHmac("sha256", ENCRYPTION_KEY).update(payload).digest("hex");
}

export function createOAuthState(
  platform: string,
  workspaceId: string,
  userId: string,
): string {
  const payload: StatePayload = {
    platform,
    workspaceId,
    userId,
    nonce: randomBytes(16).toString("hex"),
    timestamp: Date.now(),
  };

  const json = JSON.stringify(payload);
  const signature = sign(json);
  const combined = `${Buffer.from(json).toString("base64url")}.${signature}`;

  return combined;
}

export function verifyOAuthState(
  state: string,
): StatePayload | null {
  const [encodedPayload, signature] = state.split(".");
  if (!encodedPayload || !signature) return null;

  const json = Buffer.from(encodedPayload, "base64url").toString("utf-8");
  const expectedSig = sign(json);

  if (signature !== expectedSig) return null;

  const payload: StatePayload = JSON.parse(json);

  if (Date.now() - payload.timestamp > STATE_TTL_MS) return null;

  return payload;
}
