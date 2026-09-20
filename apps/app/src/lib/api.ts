// apps/app/src/lib/api.ts
import { createSdk } from "@furious-abacus/sdk";

export type { Order } from "@furious-abacus/sdk";

export const api = createSdk({
  url: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api",
  hyperliquid: {
    isTestnet: process.env.NEXT_PUBLIC_TESTNET === "true",
  },
});
