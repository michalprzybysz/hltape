"use client";

import { SIDES } from "@furious-abacus/sdk";
import { Button } from "@furious-abacus/ui/components/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { HiOutlinePlus } from "react-icons/hi";
import { getCoinName } from "@/lib/coinNames";
import { useAllMidsQuery } from "@/lib/hyperliquid/useAllMidsQuery";
import { useMetaQuery } from "@/lib/hyperliquid/useMetaQuery";
import { useOpenPositionMutation } from "@/lib/usePositionsQuery";
import { LeverageSheet } from "./LeverageSheet";
import { MarginModeSheet } from "./MarginModeSheet";
import { OpenPositionSearchSheet } from "./OpenPositionSearchSheet";
import { OpenPositionSheet, type Pill } from "./OpenPositionSheet";
import { PerpSelectSheet } from "./PerpSelectSheet";
import { MARGIN_MODE, type OpenPositionFormData, openPositionSchema } from "./schema";

type Stage = "search" | "form";

interface OpenPositionButtonProps {
  withdrawable: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function OpenPositionButton({
  withdrawable,
  open: controlledOpen,
  onOpenChange,
}: OpenPositionButtonProps) {
  const t = useTranslations("openPosition");
  const tCommon = useTranslations("common");

  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [stage, setStage] = useState<Stage>("search");
  const [pill, setPill] = useState<Pill | null>(null);

  const { mutate: openPosition, isPending, error } = useOpenPositionMutation();
  const { data: meta, isLoading: isLoadingMeta } = useMetaQuery();
  const { data: allMids } = useAllMidsQuery();

  const { control, watch, handleSubmit, reset, setValue, trigger } = useForm<OpenPositionFormData>({
    resolver: zodResolver(openPositionSchema),
    defaultValues: {
      coin: "",
      side: SIDES.LONG,
      sizeUsd: withdrawable * 0.1,
      leverage: 1,
      marginMode: MARGIN_MODE.CROSS,
      trailingSL: { distance: 0.01 },
    },
  });

  const coin = watch("coin");
  const sizeUsd = watch("sizeUsd");
  const leverage = watch("leverage");
  const marginMode = watch("marginMode");

  const selectedAsset = meta?.universe.find((a) => a.name === coin);
  const currentPrice = allMids?.[coin];
  const maxLeverage = selectedAsset?.maxLeverage ?? 50;

  useEffect(() => {
    if (coin) setValue("leverage", 1);
  }, [coin, setValue]);

  const coins = useMemo(() => {
    if (!meta?.universe) return [];
    return meta.universe
      .filter((a) => !a.isDelisted)
      .map((a) => ({
        name: a.name,
        maxLeverage: a.maxLeverage,
        price: allMids?.[a.name],
      }))
      .sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0));
  }, [meta, allMids]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset();
      setStage("search");
      setPill(null);
    }
    setOpen(next);
  };

  const handleSelectCoin = (next: string) => {
    setValue("coin", next);
    setStage("form");
    setPill(null);
  };

  const closePill = () => setPill(null);

  const onSubmit: SubmitHandler<OpenPositionFormData> = (data) => {
    openPosition(
      {
        coin: data.coin,
        side: data.side,
        sizeUsd: data.sizeUsd,
        leverage: data.leverage,
        marginMode: data.marginMode,
        trailingSL: data.trailingSL,
      },
      {
        onSuccess: () => {
          handleOpenChange(false);
        },
      },
    );
  };

  const isValid = !!coin && coins.some((c) => c.name === coin) && sizeUsd > 0;
  const coinLabel = coin ? (getCoinName(coin) ?? coin) : "";
  const errorMessage = error
    ? error instanceof Error
      ? error.message
      : t("failedToOpen")
    : undefined;

  return (
    <>
      <Button
        onClick={() => {
          setStage("search");
          setOpen(true);
        }}
      >
        <HiOutlinePlus className="size-4" />
        {tCommon("openPosition")}
      </Button>

      <OpenPositionSearchSheet
        open={open && stage === "search"}
        onOpenChange={handleOpenChange}
        items={coins}
        isLoading={isLoadingMeta}
        onSelect={handleSelectCoin}
      />

      <OpenPositionSheet
        open={open && stage === "form"}
        onOpenChange={handleOpenChange}
        control={control}
        trigger={trigger}
        withdrawable={withdrawable}
        currentPrice={currentPrice}
        coinLabel={coinLabel}
        leverage={leverage}
        marginMode={marginMode}
        isPending={isPending}
        isValid={isValid}
        errorMessage={errorMessage}
        onOpenPill={setPill}
        onSubmit={handleSubmit(onSubmit)}
      />

      <PerpSelectSheet
        open={pill === "perp"}
        onOpenChange={(o) => !o && closePill()}
        items={coins}
        isLoading={isLoadingMeta}
        onSelect={handleSelectCoin}
      />

      <LeverageSheet
        open={pill === "leverage"}
        onOpenChange={(o) => !o && closePill()}
        control={control}
        trigger={trigger}
        maxLeverage={maxLeverage}
      />

      <MarginModeSheet
        open={pill === "margin"}
        onOpenChange={(o) => !o && closePill()}
        control={control}
      />
    </>
  );
}
