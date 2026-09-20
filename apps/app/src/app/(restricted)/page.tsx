// apps/app/src/app/(restricted)/page.tsx
"use client";

import type { Order } from "@furious-abacus/sdk";
import { Badge } from "@furious-abacus/ui/components/badge";
import { buttonVariants } from "@furious-abacus/ui/components/button";
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
import { Spinner } from "@furious-abacus/ui/components/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@furious-abacus/ui/components/table";
import { cn } from "@furious-abacus/ui/lib/utils";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  HiArrowRight,
  HiCurrencyDollar,
  HiOutlineChartBar,
  HiOutlineClipboardList,
  HiOutlineShieldCheck,
  HiTrendingDown,
  HiTrendingUp,
} from "react-icons/hi";
import { OpenPositionButton } from "@/components/OpenPositionButton";
import { PositionInstrument } from "@/components/PositionInstrument";
import { PositionSide } from "@/components/PositionSide";
import useFormatter from "@/lib/useFormatter";
import { useOrdersQuery } from "@/lib/useOrdersQuery";
import { usePositionsQuery } from "@/lib/usePositionsQuery";

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <Card className="flex-1">
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            {trend && (
              <div
                className={`flex items-center gap-1 text-xs ${trend.positive ? "text-green-500" : "text-red-500"}`}
              >
                {trend.positive ? <HiTrendingUp /> : <HiTrendingDown />}
                <span>{Math.abs(trend.value).toFixed(2)}%</span>
              </div>
            )}
          </div>
          <div className="rounded-full bg-primary-100 p-3 dark:bg-primary-900/30">
            <Icon className="size-6 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OrdersPreview({
  orders,
  isLoading,
  withdrawable,
}: {
  orders?: Order[];
  isLoading: boolean;
  withdrawable: number;
}) {
  const { crypto } = useFormatter();
  const t = useTranslations("dashboard");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!orders?.length) {
    return (
      <Empty>
        <EmptyMedia>
          <HiOutlineShieldCheck className="size-10 text-muted-foreground" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{t("noActiveOrders")}</EmptyTitle>
          <EmptyDescription>{t("noActiveOrdersDescription")}</EmptyDescription>
        </EmptyHeader>
        <OpenPositionButton withdrawable={withdrawable} />
      </Empty>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("asset")}</TableHead>
          <TableHead>{t("side")}</TableHead>
          <TableHead>{t("trigger")}</TableHead>
          <TableHead>{t("status")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.slice(0, 5).map((order) => (
          <TableRow key={order.id}>
            <TableCell>
              <PositionInstrument instrument={order.instrument} size={24} />
            </TableCell>
            <TableCell>
              <PositionSide side={order.side} />
            </TableCell>
            <TableCell className="font-mono">{crypto(Number(order.triggerPrice))}</TableCell>
            <TableCell>
              <Badge
                className={
                  order.trailing
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                }
              >
                {order.trailing ? t("trailing") : t("paused")}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function DashboardPage() {
  const { orders, isLoading: ordersLoading } = useOrdersQuery();
  const { positions, marginSummary, isLoading: positionsLoading } = usePositionsQuery();
  const { crypto, percent } = useFormatter();
  const t = useTranslations("dashboard");

  const isLoading = ordersLoading || positionsLoading;

  // Filter only open orders for dashboard
  const openOrders = orders?.filter((o) => o.status === "open");

  const accountValue = marginSummary ? Number(marginSummary.accountValue) : 0;
  const totalPosition = marginSummary ? Number(marginSummary.totalNtlPos) : 0;
  const marginUsed = marginSummary ? Number(marginSummary.totalMarginUsed) : 0;
  const activeOrdersCount = openOrders?.filter((o) => o.trailing)?.length ?? 0;

  // Calculate trailing savings from ALL orders (including closed)
  const trailingSavings =
    orders?.reduce((sum, order) => {
      if (!order.initialTriggerPrice || !order.triggerPrice || !order.size) return sum;
      const initial = Number(order.initialTriggerPrice);
      const current = Number(order.triggerPrice);
      const size = Number(order.size);
      const priceDiff = order.side === "long" ? current - initial : initial - current;
      return sum + priceDiff * size;
    }, 0) ?? 0;

  const marginRatio = accountValue > 0 ? marginUsed / accountValue : 0;
  const marginPercent = marginRatio * 100;
  const progressColorClass =
    marginRatio > 0.8 ? "bg-red-500" : marginRatio > 0.5 ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className="flex flex-1 flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("subtitle")}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="size-10" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title={t("accountValue")}
              value={crypto(accountValue)}
              icon={HiCurrencyDollar}
            />
            <StatCard
              title={t("totalPosition")}
              value={crypto(totalPosition)}
              icon={HiOutlineChartBar}
            />
            <StatCard
              title={t("trailingSavings")}
              value={crypto(trailingSavings)}
              icon={HiOutlineShieldCheck}
            />
            <StatCard
              title={t("activeOrders")}
              value={String(activeOrdersCount)}
              icon={HiOutlineClipboardList}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="pb-0">
              <CardHeader>
                <CardTitle>{t("recentOrders")}</CardTitle>
                <CardAction>
                  <Link
                    href="/orders"
                    className={buttonVariants({ size: "xs", variant: "outline" })}
                  >
                    {t("viewAll")} <HiArrowRight className="ml-1 size-3" />
                  </Link>
                </CardAction>
              </CardHeader>
              <CardContent className="px-0">
                <OrdersPreview
                  orders={openOrders}
                  isLoading={ordersLoading}
                  withdrawable={accountValue}
                />
              </CardContent>
            </Card>

            <Card className="pb-0">
              <CardHeader>
                <CardTitle>{t("openPositions")}</CardTitle>
                <CardAction>
                  <Link
                    href="/positions"
                    className={buttonVariants({ size: "xs", variant: "outline" })}
                  >
                    {t("viewAll")} <HiArrowRight className="ml-1 size-3" />
                  </Link>
                </CardAction>
              </CardHeader>
              <CardContent className="px-0">
                {positionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner className="size-8" />
                  </div>
                ) : !positions?.length ? (
                  <Empty>
                    <EmptyMedia>
                      <HiOutlineChartBar className="size-10 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyHeader>
                      <EmptyTitle>{t("noOpenPositions")}</EmptyTitle>
                      <EmptyDescription>{t("noOpenPositionsDescription")}</EmptyDescription>
                    </EmptyHeader>
                    <OpenPositionButton withdrawable={accountValue} />
                  </Empty>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("asset")}</TableHead>
                        <TableHead>{t("size")}</TableHead>
                        <TableHead>{t("pnl")}</TableHead>
                        <TableHead>{t("roe")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {positions.slice(0, 5).map((position) => {
                        const pnl = Number(position.unrealizedPnl);
                        const roe = Number(position.returnOnEquity);
                        const isLong = Number(position.szi) > 0;

                        return (
                          <TableRow key={position.coin}>
                            <TableCell>
                              <PositionInstrument instrument={position.coin} size={24} />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <PositionSide side={isLong ? "long" : "short"} />
                                <span className="font-mono text-sm">
                                  {crypto(Number(position.positionValue))}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell
                              className={`font-mono ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}
                            >
                              {pnl >= 0 ? "+" : ""}
                              {crypto(pnl)}
                            </TableCell>
                            <TableCell
                              className={`font-mono ${roe >= 0 ? "text-green-500" : "text-red-500"}`}
                            >
                              {roe >= 0 ? "+" : ""}
                              {percent(roe)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {marginSummary && (
            <Card>
              <CardHeader>
                <CardTitle>{t("marginUtilization")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{t("marginUsed")}</span>
                    <span className="font-mono text-gray-900 dark:text-white">
                      {crypto(marginUsed)} / {crypto(accountValue)}
                    </span>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full transition-all", progressColorClass)}
                      style={{ width: `${marginPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>0%</span>
                    <span>
                      {percent(marginRatio)} {t("used")}
                    </span>
                    <span>100%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
