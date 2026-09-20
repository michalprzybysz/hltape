// apps/app/src/app/(restricted)/profile/@wallets/page.tsx
"use client";

import { Badge } from "@hltape/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@hltape/ui/components/card";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@hltape/ui/components/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@hltape/ui/components/item";
import { useTranslations } from "next-intl";
import { HiOutlineWallet } from "react-icons/hi2";
import { useChains } from "wagmi";
import { useWalletsQuery } from "@/lib/useWalletsQuery";

function WalletSkeleton() {
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
        <div className="h-5 w-16 rounded bg-muted" />
      </ItemActions>
    </Item>
  );
}

export default function ProfileWalletsPage() {
  const t = useTranslations("profile");
  const { wallets = [], isLoading } = useWalletsQuery();
  const chains = useChains();

  return (
    <Card>
      <CardHeader className="min-h-8 items-center">
        <CardTitle>{t("connectedWallets")}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ItemGroup>
            <WalletSkeleton />
            <WalletSkeleton />
          </ItemGroup>
        ) : wallets.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HiOutlineWallet />
              </EmptyMedia>
              <EmptyTitle>{t("noWalletsConnected")}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <ItemGroup>
            {wallets.map((wallet) => (
              <Item key={wallet.id} variant="outline">
                <ItemMedia variant="icon">
                  <HiOutlineWallet />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>
                    {chains.find((c) => c.id === wallet.chainId)?.name || `Chain ${wallet.chainId}`}
                  </ItemTitle>
                  <ItemDescription className="font-mono">
                    {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                  </ItemDescription>
                </ItemContent>
                {wallet.isPrimary && (
                  <ItemActions>
                    <Badge variant="secondary">{t("primary")}</Badge>
                  </ItemActions>
                )}
              </Item>
            ))}
          </ItemGroup>
        )}
      </CardContent>
    </Card>
  );
}
