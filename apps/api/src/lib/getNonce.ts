// apps/api/src/lib/getNonce.ts
import { generateRandomString } from "better-auth/crypto";

export default async function getNonce(): Promise<string> {
  return generateRandomString(64, "0-9", "A-Z", "a-z");
}
