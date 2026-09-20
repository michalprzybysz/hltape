// apps/app/src/app/(restricted)/orders/[id]/page.tsx
"use client";

import { Badge } from "@hltape/ui/components/badge";
import { Card, CardContent } from "@hltape/ui/components/card";
import { Spinner } from "@hltape/ui/components/spinner";
import { cn } from "@hltape/ui/lib/utils";
import { useTranslations } from "next-intl";
import { use } from "react";
import { HiArrowNarrowRight, HiCheck, HiX } from "react-icons/hi";
import { InstrumentLogo } from "@/components/InstrumentLogo";
import { PositionSide } from "@/components/PositionSide";
import { TrailingHealthBar } from "@/components/TrailingHealthBar";
import useFormatter from "@/lib/useFormatter";
import { useLogsQuery } from "@/lib/useLogsQuery";
import { useOrderQuery } from "@/lib/useOrdersQuery";

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("orderDetail");
  const tCommon = useTranslations("common");
  const { order, isLoading } = useOrderQuery(id);
  const { crypto, percent } = useFormatter();
  const { logs } = useLogsQuery({ orderId: id });

  if (isLoading || !order) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="size-8" aria-label="Loading order details" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl p-4 md:p-6">
      {/* HEADER */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <InstrumentLogo instrument={order.instrument} size={48} />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {order.instrument} {t("trailing")}
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>{t("id", { id })}</span>
            </div>
          </div>
        </div>
        <Badge
          className={cn(
            "self-start sm:self-center px-3 py-1",
            order.status === "open"
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : undefined,
          )}
          variant={order.status === "open" ? undefined : "destructive"}
        >
          {order.status.toUpperCase()}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* --- LEFT COLUMN: DETAILS (Sticky) --- */}
        <div className="lg:col-span-4 lg:sticky lg:top-4">
          <Card>
            <CardContent>
              <h5 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                {t("orderDetails")}
              </h5>
              <dl className="flex flex-col gap-4">
                <div>
                  <dt className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {tCommon("side")}
                  </dt>
                  <dd className="text-gray-900 dark:text-white font-semibold">
                    <PositionSide side={order.side} />
                  </dd>
                </div>

                <div>
                  <dt className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t("currentTriggerPrice")}
                  </dt>
                  <dd className="text-xl font-bold text-gray-900 dark:text-white">
                    {crypto(order?.triggerPrice)}
                  </dd>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                      {tCommon("size")}
                    </dt>
                    <dd className="font-semibold text-gray-900 dark:text-white">{order.size}</dd>
                  </div>
                  <div>
                    <dt className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                      {tCommon("leverage")}
                    </dt>
                    <dd className="font-semibold text-gray-900 dark:text-white">
                      {order.leverage}x
                    </dd>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                      {tCommon("trailing")}
                    </dt>
                    <dd className="font-semibold text-gray-900 dark:text-white">
                      {order.trailing ? tCommon("yes") : tCommon("no")}
                    </dd>
                  </div>
                  <div>
                    <dt className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                      {t("distance")}
                    </dt>
                    <dd className="font-semibold text-gray-900 dark:text-white">
                      {percent(Number(order.trailingDistance))}
                    </dd>
                  </div>
                </div>

                <div>
                  <dt className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t("initialTriggerPrice")}
                  </dt>
                  <dd className="font-mono text-gray-700 dark:text-gray-300">
                    {crypto(order.initialTriggerPrice)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          <div className="mt-6">
            <TrailingHealthBar order={order} />
          </div>
        </div>

        <div className="lg:col-span-8">
          <h5 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            {t("activityLog")}
          </h5>

          {/* Timeline */}
          <div className="relative space-y-4 border-l border-border pl-6 [&>*:last-child]:before:absolute [&>*:last-child]:before:left-[calc(-1.5rem-1px)] [&>*:last-child]:before:top-3 [&>*:last-child]:before:bottom-0 [&>*:last-child]:before:w-[2px] [&>*:last-child]:before:bg-background">
            {logs?.map((log, index) => (
              <div key={log.id} className="relative">
                {/* Timeline point */}
                <div
                  className={cn(
                    "absolute -left-[calc(0.75rem+1.5rem)] flex size-6 items-center justify-center rounded-full",
                    log.status === "success"
                      ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300"
                      : "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300",
                  )}
                >
                  {log.status === "success" ? (
                    <HiCheck className="size-3.5" />
                  ) : (
                    <HiX className="size-3.5" />
                  )}
                </div>
                {/* Content */}
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-foreground">
                      {crypto(
                        log.oldTriggerPrice ??
                          logs[index + 1]?.newTriggerPrice ??
                          order.initialTriggerPrice,
                      )}
                      <HiArrowNarrowRight className="inline mx-1.5 w-3.5 h-3.5 text-muted-foreground" />
                      {crypto(log.newTriggerPrice)}
                    </h4>
                    {log.status !== "success" && (
                      <Badge variant="destructive" className="text-xs">
                        {t("updateFailed")}
                      </Badge>
                    )}
                  </div>
                  <time className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </time>
                  {log.errorMessage && (
                    <p className="mt-1 text-red-600 dark:text-red-400 text-xs">
                      {log.errorMessage}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {(!logs || logs.length === 0) && (
            <p className="text-gray-500 italic">{t("noActivity")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
