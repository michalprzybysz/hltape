// apps/app/src/app/login/layout.tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Layout from "@/components/Layout";

import RainbowKitProvider from "@/components/providers/rainbowkit";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("loginTitle"),
    description: t("loginDescription"),
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Layout>
      <RainbowKitProvider>{children}</RainbowKitProvider>
    </Layout>
  );
}
