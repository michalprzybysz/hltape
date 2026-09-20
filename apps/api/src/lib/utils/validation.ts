// apps/api/src/lib/utils/validation.ts

import { ORDER_GONE_PATTERNS } from "../enums";

export function isOrderGoneError(error: string): boolean {
  const lowerError = error.toLowerCase();
  return ORDER_GONE_PATTERNS.some((p) => lowerError.includes(p));
}
