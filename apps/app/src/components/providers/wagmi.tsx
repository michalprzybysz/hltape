// apps/app/src/components/providers/wagmi.tsx
"use client";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { arbitrum, arbitrumSepolia, mainnet } from "wagmi/chains";
import { BRAND_NAME } from "@/lib/brand";

const isTestnet = process.env.NEXT_PUBLIC_TESTNET === "true";

export const config = getDefaultConfig({
  appName: BRAND_NAME,
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID || "",
  chains: isTestnet ? [mainnet, arbitrumSepolia] : [mainnet, arbitrum],
  ssr: false,
});

export default function Provider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <WagmiProvider config={config}>{children}</WagmiProvider>;
}
