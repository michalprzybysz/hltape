// apps/app/src/lib/hl.ts
export const getHLLink = () => {
  if (process.env.NEXT_PUBLIC_TESTNET === "true") {
    return "https://app.hyperliquid-testnet.xyz/";
  }
  return "https://app.hyperliquid.xyz/";
};
