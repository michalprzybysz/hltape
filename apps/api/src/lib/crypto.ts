// apps/api/src/lib/crypto.ts
import * as crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

let _cachedKey: Buffer | null = null;

function getMasterKey(): Buffer {
  if (_cachedKey) return _cachedKey;

  const keyHex = process.env.MASTER_KEY_HEX;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error("MASTER_KEY_HEX must be 64 hex characters (32 bytes)");
  }

  _cachedKey = Buffer.from(keyHex, "hex");
  return _cachedKey;
}

export function encrypt(text: string): string {
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);

  const tag = cipher.getAuthTag();

  const result = Buffer.concat([iv, tag, encrypted]);

  return result.toString("hex");
}

export function decrypt(encrypted: Buffer | string): string {
  const key = getMasterKey();

  const buf = Buffer.isBuffer(encrypted) ? encrypted : Buffer.from(encrypted, "hex");

  if (buf.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error("Invalid encrypted data: too short");
  }

  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8");
}

export function generateMasterKey(): string {
  return crypto.randomBytes(32).toString("hex");
}
