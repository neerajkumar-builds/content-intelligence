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

  return {
    ciphertext: `${salt.toString("base64")}:${encrypted}`,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decryptToken(
  ciphertext: string,
  iv: string,
  tag: string,
): string {
  const [saltB64, encrypted] = ciphertext.split(":");
  const salt = Buffer.from(saltB64, "base64");
  const key = deriveKey(salt);
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));

  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
