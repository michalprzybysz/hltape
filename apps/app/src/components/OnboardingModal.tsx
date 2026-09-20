"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { useDisconnect } from "wagmi";
import { authClient } from "@/lib/auth";
import { getHLLink } from "@/lib/hl";
import { useAgentWalletsQuery } from "@/lib/useAgentWalletsQuery";
import { ConnectAgentDialog } from "./ConnectAgentDialog";

export function OnboardingModal() {
  const t = useTranslations("onboarding");
  const tAction = useTranslations("action");
  const { agentWallets, isLoading } = useAgentWalletsQuery();
  const router = useRouter();
  const { disconnectAsync } = useDisconnect();
  const shouldShow = !isLoading && agentWallets !== undefined && agentWallets.length === 0;

  const handleLogout = useCallback(async () => {
    await Promise.all([authClient.signOut(), disconnectAsync()]);
    router.replace("/login");
  }, [router, disconnectAsync]);

  if (!shouldShow) {
    return null;
  }

  return (
    <ConnectAgentDialog
      open
      showCloseButton={false}
      title={t("title")}
      description={t.rich("description", {
        link: (chunks) => (
          <a href={`${getHLLink()}API`} target="_blank" rel="noopener noreferrer">
            {chunks}
          </a>
        ),
      })}
      footer={
        <button
          type="button"
          onClick={handleLogout}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {tAction("logOut")}
        </button>
      }
    />
  );
}
