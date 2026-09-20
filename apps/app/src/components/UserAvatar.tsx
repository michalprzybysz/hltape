// apps/app/src/components/UserAvatar.tsx
"use client";

import { Avatar } from "@base-ui/react/avatar";
import { cn } from "@hltape/ui/lib/utils";
import makeBlockie from "ethereum-blockies-base64";
import { useTranslations } from "next-intl";
import type { Address } from "viem";
import { useEnsAvatar, useEnsName } from "wagmi";

const useAvatar = ({
  address,
  chainId = 1,
}: Readonly<{
  address: Address;
  chainId?: number;
}>) => {
  const { data: name } = useEnsName({
    address,
    chainId,
  });
  const { data: ensAvatar } = useEnsAvatar({
    name: name ?? undefined,
    chainId,
  });
  return ensAvatar || makeBlockie(address);
};

export default function UserAvatar({
  address,
  size = "default",
  className,
}: Readonly<{
  address: Address;
  size?: "default" | "sm" | "lg";
  className?: string;
}>) {
  const t = useTranslations("avatar");
  const avatar = useAvatar({ address });
  return (
    <Avatar.Root
      data-size={size}
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full select-none data-[size=lg]:size-10 data-[size=sm]:size-6",
        className,
      )}
    >
      <Avatar.Image src={avatar} alt={t("alt")} className="aspect-square size-full" />
      <Avatar.Fallback className="flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground">
        {t("fallback")}
      </Avatar.Fallback>
    </Avatar.Root>
  );
}
