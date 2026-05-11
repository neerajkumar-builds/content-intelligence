import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ENCRYPTION_KEY = process.env.OAUTH_ENCRYPTION_KEY ?? "";

function deriveKey(salt: Buffer): Buffer {
  return scryptSync(ENCRYPTION_KEY, salt, 32);
}

export function encryptToken(plaintext: string): {
  ciphertext: string;
  iv: string;
  tag: string;
} {
  const salt = randomBytes(16);
  const key = deriveKey(salt);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  const tag = cipher.getAuthTag();

  const ivB64 = iv.toString("base64");
  const tagB64 = tag.toString("base64");
  const saltB64 = salt.toString("base64");

  return {
    ciphertext: `${saltB64}:${ivB64}:${tagB64}:${encrypted}`,
    iv: ivB64,
    tag: tagB64,
  };
}

export function decryptToken(ciphertext: string): string {
  const parts = ciphertext.split(":");

  let saltB64: string, ivB64: string, tagB64: string, encrypted: string;

  if (parts.length === 4) {
    [saltB64, ivB64, tagB64, encrypted] = parts;
  } else if (parts.length === 2) {
    throw new Error("Legacy 2-part ciphertext format requires separate IV and tag");
  } else {
    throw new Error(`Invalid ciphertext format: expected 4 parts, got ${parts.length}`);
  }

  const salt = Buffer.from(saltB64, "base64");
  const key = deriveKey(salt);
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));

  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
