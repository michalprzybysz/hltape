// apps/app/src/app/(restricted)/profile/@wallet/page.tsx
"use client";

import { Button } from "@furious-abacus/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@furious-abacus/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@furious-abacus/ui/components/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@furious-abacus/ui/components/item";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { HiOutlineKey, HiTrash } from "react-icons/hi";
import { ConnectAgentDialog } from "@/components/ConnectAgentDialog";
import { useAgentWalletsDeleteMutation, useAgentWalletsQuery } from "@/lib/useAgentWalletsQuery";
import { ApproveBuilderFeeButton } from "./ApproveBuilderFeeButton";
import { GenerateAgentButton } from "./GenerateAgentButton";

function AgentWalletSkeleton() {
  return (
    <Item variant="outline" className="animate-pulse">
      <ItemMedia variant="icon">
        <div className="size-4 rounded bg-muted" />
      </ItemMedia>
      <ItemContent>
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-3 w-40 rounded bg-muted" />
      </ItemContent>
      <ItemActions>
        <div className="size-8 rounded bg-muted" />
      </ItemActions>
    </Item>
  );
}

export default function ProfileWalletPage() {
  const t = useTranslations("profile");
  const tConnect = useTranslations("connectAgent");
  const [open, setOpen] = useState(false);

  const { agentWallets = [], isLoading } = useAgentWalletsQuery();
  const deleteMutation = useAgentWalletsDeleteMutation();

  return (
    <Card>
      <CardHeader className="min-h-8 items-center">
        <CardTitle>{t("apiWallet")}</CardTitle>
        <CardAction>
          <div className="flex gap-2">
            <ApproveBuilderFeeButton />
            <GenerateAgentButton />
            <Button onClick={() => setOpen(true)}>{t("addWallet")}</Button>
          </div>
        </CardAction>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <ItemGroup>
            <AgentWalletSkeleton />
            <AgentWalletSkeleton />
          </ItemGroup>
        ) : agentWallets?.length > 0 ? (
          <ItemGroup>
            {agentWallets.map((wallet) => (
              <Item key={wallet.id} variant="outline">
                <ItemMedia variant="icon">
                  <HiOutlineKey />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{wallet.label}</ItemTitle>
                  <ItemDescription className="font-mono">{wallet.agentAddress}</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button
                    variant="destructive"
                    size="icon-sm"
                    onClick={() => deleteMutation.mutate(wallet.id)}
                  >
                    <HiTrash />
                  </Button>
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HiOutlineKey />
              </EmptyMedia>
              <EmptyTitle>{t("noAgentConnected")}</EmptyTitle>
              <EmptyDescription>{t("fillFormBelow")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>

      <ConnectAgentDialog
        open={open}
        onOpenChange={setOpen}
        title={tConnect("title")}
        description={tConnect("description")}
        onSuccess={() => setOpen(false)}
      />
    </Card>
  );
}
