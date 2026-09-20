// apps/app/src/components/TrailingHealthBar.tsx
"use client";

import type { AllMidsResponse, Order } from "@furious-abacus/sdk";
import { cn } from "@furious-abacus/ui/lib/utils";
import { useTranslations } from "next-intl";
import { useAllMidsQuery } from "@/lib/hyperliquid/useAllMidsQuery";
import useFormatter from "@/lib/useFormatter";

function getTrailingColor(percent: number): "green" | "yellow" | "red" {
  const p = Math.round(percent);
  if (p <= 15) return "red";
  if (p <= 40) return "yellow";
  return "green";
}

export function calculateTrailingHealth(order: Order, prices: AllMidsResponse = {}): number {
  const currentPriceRaw = prices[order.instrument];
  if (currentPriceRaw === undefined || currentPriceRaw === null) return 0;

  const currentPrice = Number(currentPriceRaw);
  const trigger = Number(order.triggerPrice);
  const configuredDistancePercent = Number(order.trailingDistance);

  if (currentPrice === 0 || configuredDistancePercent === 0) return 0;

  let currentDistPercent = 0;

  if (order.side === "long") {
    if (currentPrice <= trigger) {
      currentDistPercent = 0;
    } else {
      currentDistPercent = (currentPrice - trigger) / currentPrice;
    }
  } else {
    if (currentPrice >= trigger) {
      currentDistPercent = 0;
    } else {
      currentDistPercent = (trigger - currentPrice) / currentPrice;
    }
  }

  const healthPercent = (currentDistPercent / configuredDistancePercent) * 100;
  return Math.min(Math.max(healthPercent, 0), 100);
}

export function TrailingHealthBar({ order }: { order: Order }) {
  const t = useTranslations("orders");
  const { crypto, percent } = useFormatter();
  const allMids = useAllMidsQuery();

  const trailingHealth = calculateTrailingHealth(order, allMids.data);
  const healthColor = getTrailingColor(trailingHealth);

  if (order.status !== "open") {
    return (
      <span className="font-mono text-gray-500">
        {crypto(order.triggerPrice ? Number(order.triggerPrice) : 0)}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex justify-between text-xs mb-0.5">
        <span className="font-mono font-bold">
          {crypto(order.triggerPrice ? Number(order.triggerPrice) : 0)}
        </span>
        <span
          className={cn(
            "font-medium",
            healthColor === "red" && "text-red-500 animate-pulse",
            healthColor === "yellow" && "text-yellow-500",
            healthColor === "green" && "text-green-500",
          )}
        >
          {percent(trailingHealth / 100)} {t("safe")}
        </span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted border border-gray-100 dark:border-gray-600">
        <div
          className={cn(
            "h-full transition-all",
            healthColor === "red" && "bg-red-500",
            healthColor === "yellow" && "bg-yellow-500",
            healthColor === "green" && "bg-green-500",
          )}
          style={{ width: `${trailingHealth}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
        <span>{t("trigger")}</span>
        <span>{t("currentPrice")}</span>
      </div>
    </div>
  );
}
