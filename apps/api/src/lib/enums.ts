// apps/api/src/lib/enums.ts
import { Decimal } from "decimal.js";

export const EXECUTOR_MAX_RETRIES = 3;
export const EXECUTOR_BASE_RETRY_DELAY_MS = 100;

export const ORDER_GONE_PATTERNS = [
  "order not found",
  "order does not exist",
  "unknown oid",
  "could not find order",
  "no order",
  "cannot modify canceled or filled",
] as const;

export const DISPATCHER_CONFIG = {
  maxRequestsPerSecond: 10,
  windowSizeMs: 1000,
  agingFactorPerMs: 0.0001,
  maxAgingMultiplier: 3,
} as const;

export const BRAIN_CONFIG = {
  minThreshold: new Decimal(0.0002),
  volatilityMultiplier: new Decimal(5.0),
  riskScale: new Decimal(100000),
  panicGap: new Decimal(0.015),
  panicMultiplier: new Decimal(1000),
} as const;

export const FEEDER_FALLBACK_VOL = new Decimal(0.0005);
