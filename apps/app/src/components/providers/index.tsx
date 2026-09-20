// apps/app/src/components/providers/index.tsx
"use client";

import dynamic from "next/dynamic";
import QueryProvider from "./query";

const WagmiProvider = dynamic(() => import("./wagmi"), { ssr: false });

export default function Providers({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <WagmiProvider>
      <QueryProvider>{children}</QueryProvider>
    </WagmiProvider>
  );
}
