import { SIDES } from "@furious-abacus/sdk";
import { useTranslations } from "next-intl";
import { type Control, useWatch } from "react-hook-form";
import useFormatter from "@/lib/useFormatter";
import type { OpenPositionFormData } from "./types";

function roundToHlPrice(price: number): number {
  if (price === 0) return 0;
  return Number.parseFloat(price.toPrecision(5));
}

interface OrderSummaryProps {
  control: Control<OpenPositionFormData>;
  currentPrice: string | undefined;
}

export function OrderSummary({ control, currentPrice }: OrderSummaryProps) {
  const t = useTranslations("openPosition");
  const fmt = useFormatter();
  const sizeUsd = useWatch({ control, name: "sizeUsd" });
  const leverage = useWatch({ control, name: "leverage" });
  const side = useWatch({ control, name: "side" });
  const trailingSL = useWatch({ control, name: "trailingSL" });

  const entryPrice = currentPrice ? Number(currentPrice) : null;
  const margin = leverage > 0 ? sizeUsd / leverage : sizeUsd;
  const isLong = side === SIDES.LONG;
  const distance = trailingSL?.distance;

  const liqPrice =
    entryPrice && leverage > 0
      ? isLong
        ? entryPrice * (1 - 1 / leverage)
        : entryPrice * (1 + 1 / leverage)
      : null;

  const hlTrigger =
    entryPrice && distance
      ? roundToHlPrice(isLong ? entryPrice * (1 - distance) : entryPrice * (1 + distance))
      : null;

  const slLossUsd = distance ? sizeUsd * distance : null;

  return (
    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
      {entryPrice !== null && (
        <>
          <dt className="text-muted-foreground">{t("entryPrice")}</dt>
          <dd className="text-right font-mono tabular-nums">{fmt.crypto(entryPrice)}</dd>
        </>
      )}

      <dt className="text-muted-foreground">{t("requiredMargin")}</dt>
      <dd className="text-right font-mono tabular-nums">{fmt.crypto(margin)}</dd>

      {liqPrice !== null && liqPrice > 0 && (
        <>
          <dt className="text-red-400/80">{t("estLiquidation")}</dt>
          <dd className="text-right font-mono tabular-nums text-red-400">{fmt.crypto(liqPrice)}</dd>
        </>
      )}

      {hlTrigger !== null && (
        <>
          <dt className="text-muted-foreground">{t("slTriggerPrice")}</dt>
          <dd className="text-right font-mono tabular-nums">
            {fmt.crypto(hlTrigger)}
            {slLossUsd !== null && (
              <span className="ml-1.5 text-red-400">−{fmt.crypto(slLossUsd)}</span>
            )}
          </dd>
        </>
      )}
    </dl>
  );
}
