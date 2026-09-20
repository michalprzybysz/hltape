// apps/api/src/lib/hl.ts
import { HttpTransport, InfoClient } from "@nktkas/hyperliquid";

export const isTestnet = process.env.TESTNET === "true";

export const sharedTransport = new HttpTransport({ isTestnet });

export const infoClient = new InfoClient({
  transport: sharedTransport,
});
