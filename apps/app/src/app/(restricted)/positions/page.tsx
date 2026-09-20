// apps/app/src/app/(restricted)/positions/page.tsx
"use client";

import type { Position } from "@furious-abacus/sdk";
import { Button } from "@furious-abacus/ui/components/button";
import { Spinner } from "@furious-abacus/ui/components/spinner";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { HiOutlineRefresh } from "react-icons/hi";
import { OpenPositionButton } from "@/components/OpenPositionButton";
import { PositionsTable } from "@/components/PositionsTable";
import useFormatter from "@/lib/useFormatter";
import { useOrdersQuery } from "@/lib/useOrdersQuery";
import { usePositionsQuery } from "@/lib/usePositionsQuery";
import { CreateOrderModal } from "./CreateOrderModal";

export default function PositionsPage() {
  const t = useTranslations("positions");
  const { crypto } = useFormatter();

  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [openPositionOpen, setOpenPositionOpen] = useState(false);

  const { positions, marginSummary, isLoading, isRefetching, refetch } = usePositionsQuery();
  const { orders } = useOrdersQuery();
  const withdrawable = marginSummary ? Number(marginSummary.accountValue) : 0;

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("subtitle")}</p>
          </div>
          {marginSummary && (
            <div className="hidden sm:flex items-center gap-6 ml-6 pl-6 border-l border-gray-200 dark:border-gray-700">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t("accountValue")}</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {crypto(Number(marginSummary.accountValue))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t("totalPosition")}</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {crypto(Number(marginSummary.totalNtlPos))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t("marginUsed")}</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {crypto(Number(marginSummary.totalMarginUsed))}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <OpenPositionButton
            withdrawable={withdrawable}
            open={openPositionOpen}
            onOpenChange={setOpenPositionOpen}
          />
          <Button variant="outline" onClick={() => refetch()} disabled={isRefetching}>
            {isRefetching ? (
              <Spinner className="size-5" />
            ) : (
              <HiOutlineRefresh className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Positions Table */}
      <div className="flex flex-1 flex-col px-4 pb-4">
        <PositionsTable
          positions={positions}
          orders={orders}
          isLoading={isLoading}
          onAddSL={setSelectedPosition}
          onOpenPosition={() => setOpenPositionOpen(true)}
        />
      </div>

      {/* Create Order Modal */}
      <CreateOrderModal position={selectedPosition} onClose={() => setSelectedPosition(null)} />
    </div>
  );
}
