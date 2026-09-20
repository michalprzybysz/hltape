// apps/app/src/app/(restricted)/orders/page.tsx
"use client";

import type { Order } from "@hltape/sdk";
import { Badge } from "@hltape/ui/components/badge";
import { Button, buttonVariants } from "@hltape/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@hltape/ui/components/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hltape/ui/components/select";
import { Spinner } from "@hltape/ui/components/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hltape/ui/components/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hltape/ui/components/tooltip";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useMemo, useState } from "react";
import { HiOutlineRefresh, HiOutlineShieldCheck, HiPause, HiPlay } from "react-icons/hi";
import { PositionInstrument } from "@/components/PositionInstrument";
import { PositionSide } from "@/components/PositionSide";
import { TrailingHealthBar } from "@/components/TrailingHealthBar";
import useFormatter from "@/lib/useFormatter";
import { useOrdersQuery, useUpdateOrderMutation } from "@/lib/useOrdersQuery";

type OrderStatus = "all" | "open" | "closed";

const SKELETON_ROWS = Array.from({ length: 5 }, (_, idx) => `order-skeleton-${idx}`);

// --- COMPONENTS ---

function OrderSkeleton() {
  return (
    <TableRow className="animate-pulse">
      <TableCell>
        <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-12 rounded bg-gray-200 dark:bg-gray-700" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
      </TableCell>
      <TableCell>
        <div className="h-8 w-20 rounded bg-gray-200 dark:bg-gray-700" />
      </TableCell>
    </TableRow>
  );
}

function OrdersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = (searchParams.get("status") as OrderStatus) || "open";

  const t = useTranslations("orders");
  const tCommon = useTranslations("common");
  const { orders, isLoading, isRefetching, refetch } = useOrdersQuery();
  const { crypto, number } = useFormatter();

  const [processingId, setProcessingId] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (statusFilter === "all") return orders;
    return orders.filter((order) => order.status === statusFilter);
  }, [orders, statusFilter]);

  const handleStatusChange = (newStatus: string | null) => {
    if (!newStatus) return;
    const params = new URLSearchParams(searchParams.toString());
    if (newStatus === "open") {
      params.delete("status");
    } else {
      params.set("status", newStatus);
    }
    router.push(`/orders?${params.toString()}`);
  };

  const toggleMutation = useUpdateOrderMutation();

  const handleToggleTrailing = async (order: Order) => {
    setProcessingId(order.id);
    try {
      await toggleMutation.mutateAsync({ id: order.id, data: { trailing: !order.trailing } });
    } catch (err) {
      console.error("Failed to toggle trailing", err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex justify-between items-center px-4 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">{t("filterOpen")}</SelectItem>
              <SelectItem value="closed">{t("filterClosed")}</SelectItem>
              <SelectItem value="all">{t("filterAll")}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            {isRefetching ? (
              <Spinner className="size-3" />
            ) : (
              <HiOutlineRefresh className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="flex flex-1 flex-col overflow-x-auto px-4 pb-4">
        {!isLoading && filteredOrders.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <Empty>
              <EmptyMedia variant="icon">
                <HiOutlineShieldCheck />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>
                  {statusFilter === "open"
                    ? t("noActiveStops")
                    : statusFilter === "closed"
                      ? t("noClosedOrders")
                      : t("noOrdersFound")}
                </EmptyTitle>
                <EmptyDescription>
                  {statusFilter === "open"
                    ? t("emptyOpenDescription")
                    : statusFilter === "closed"
                      ? t("emptyClosedDescription")
                      : t("emptyAllDescription")}
                </EmptyDescription>
              </EmptyHeader>
              {statusFilter === "open" && (
                <Link
                  href="/positions"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {t("goToPositions")}
                </Link>
              )}
            </Empty>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tCommon("asset")}</TableHead>
                  <TableHead>{tCommon("side")}</TableHead>
                  <TableHead>{tCommon("status")}</TableHead>
                  <TableHead>{t("positionSize")}</TableHead>
                  <TableHead>{t("triggerHealth")}</TableHead>
                  <TableHead className="text-right">{tCommon("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y">
                {isLoading && SKELETON_ROWS.map((key) => <OrderSkeleton key={key} />)}

                {filteredOrders.map((order: Order) => {
                  const isProcessing = processingId === order.id;

                  return (
                    <TableRow
                      key={order.id}
                      className={`bg-white dark:border-gray-700 dark:bg-gray-800 ${order.status === "closed" ? "opacity-60" : ""}`}
                    >
                      {/* ASSET */}
                      <TableCell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">
                        <Link href={`/orders/${order.id}`}>
                          <PositionInstrument instrument={order.instrument} />
                        </Link>
                      </TableCell>

                      {/* SIDE */}
                      <TableCell>
                        <PositionSide side={order.side} />
                      </TableCell>

                      {/* STATUS */}
                      <TableCell>
                        {order.status === "open" ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            {order.status}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">{order.status}</Badge>
                        )}
                      </TableCell>

                      {/* SIZE */}
                      <TableCell className="font-mono">
                        <div className="text-base">
                          {number(order.size ? Number(order.size) : 0)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {t("using", {
                            amount: crypto(
                              (order.size ? Number(order.size) : 0) *
                                (order.triggerPrice ? Number(order.triggerPrice) : 0),
                            ),
                          })}
                        </div>
                      </TableCell>

                      {/* TRIGGER & HEALTH BAR (Merged) */}
                      <TableCell>
                        <TrailingHealthBar order={order} />
                      </TableCell>

                      {/* ACTIONS */}
                      <TableCell className="text-right">
                        {order.status === "open" ? (
                          /* Play / Pause Button */
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  size="xs"
                                  className={
                                    order.trailing
                                      ? "bg-yellow-600 text-white hover:bg-yellow-700 border-yellow-600"
                                      : "bg-green-600 text-white hover:bg-green-700 border-green-600"
                                  }
                                  onClick={() => handleToggleTrailing(order)}
                                  disabled={isProcessing}
                                />
                              }
                            >
                              {order.trailing ? (
                                <HiPause className="h-4 w-4" />
                              ) : (
                                <HiPlay className="h-4 w-4" />
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              {order.trailing ? t("pauseTrailing") : t("resumeTrailing")}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-xs text-gray-400">&mdash;</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense>
      <OrdersPageContent />
    </Suspense>
  );
}
