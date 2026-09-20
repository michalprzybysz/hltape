// apps/app/src/lib/api.ts
import { createSdk } from "@hltape/sdk";

export type { Order } from "@hltape/sdk";

export const api = createSdk({
  url: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api",
  hyperliquid: {
    isTestnet: process.env.NEXT_PUBLIC_TESTNET === "true",
  },
});
