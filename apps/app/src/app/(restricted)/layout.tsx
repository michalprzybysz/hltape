// apps/app/src/app/(restricted)/layout.tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Layout from "@/components/Layout";
import Navbar from "@/components/Navbar";
import { OnboardingModal } from "@/components/OnboardingModal";
import { BRAND_NAME } from "@/lib/brand";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    // Absolute: the title already carries the brand, so the root layout's
    // "%s — {brand}" template must not append it a second time.
    title: { absolute: t("appTitle", { brand: BRAND_NAME }) },
    description: t("appDescription"),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Layout className="flex flex-col min-h-screen">
      <Navbar />
      <OnboardingModal />
      <main className="flex flex-1 flex-col">{children}</main>
    </Layout>
  );
}
