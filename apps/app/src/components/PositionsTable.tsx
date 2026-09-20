// apps/app/src/components/PositionsTable.tsx
"use client";

import type { Order, Position } from "@furious-abacus/sdk";
import { Button } from "@furious-abacus/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@furious-abacus/ui/components/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@furious-abacus/ui/components/table";
import { useTranslations } from "next-intl";
import { HiOutlinePlus } from "react-icons/hi";
import { PositionRow } from "./PositionRow";

const SKELETON_ROWS = Array.from({ length: 5 }, (_, idx) => `position-skeleton-${idx}`);

function PositionSkeleton() {
  return (
    <TableRow className="animate-pulse">
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full dark:bg-gray-700" />
          <div className="h-4 w-16 bg-gray-200 rounded dark:bg-gray-700" />
        </div>
      </TableCell>
      <TableCell>
        <div className="h-4 w-12 bg-gray-200 rounded dark:bg-gray-700" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-20 bg-gray-200 rounded dark:bg-gray-700" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-20 bg-gray-200 rounded dark:bg-gray-700" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-20 bg-gray-200 rounded dark:bg-gray-700" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-20 bg-gray-200 rounded dark:bg-gray-700" />
      </TableCell>
      <TableCell>
        <div className="h-8 w-20 bg-gray-200 rounded dark:bg-gray-700" />
      </TableCell>
    </TableRow>
  );
}

interface PositionsTableProps {
  positions: Position[] | undefined;
  orders: Order[] | undefined;
  isLoading: boolean;
  onAddSL: (position: Position) => void;
  onOpenPosition: () => void;
}

export function PositionsTable({
  positions,
  orders,
  isLoading,
  onAddSL,
  onOpenPosition,
}: PositionsTableProps) {
  const t = useTranslations("positions");
  const tCommon = useTranslations("common");
  const isEmpty = !isLoading && positions && positions.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Empty>
          <EmptyMedia variant="icon">
            <HiOutlinePlus />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>{t("noOpenPositions")}</EmptyTitle>
            <EmptyDescription>{t("noOpenPositionsDescription")}</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" size="sm" onClick={onOpenPosition}>
            <HiOutlinePlus className="size-4" />
            {tCommon("openPosition")}
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{tCommon("asset")}</TableHead>
            <TableHead>{tCommon("side")}</TableHead>
            <TableHead>{tCommon("size")}</TableHead>
            <TableHead>{tCommon("entryPrice")}</TableHead>
            <TableHead>{tCommon("positionValue")}</TableHead>
            <TableHead>{t("liquidation")}</TableHead>
            <TableHead className="text-right">{tCommon("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y">
          {isLoading && SKELETON_ROWS.map((key) => <PositionSkeleton key={key} />)}

          {positions?.map((position: Position) => (
            <PositionRow
              key={position.coin}
              position={position}
              order={orders?.find((o) => o.instrument === position.coin && o.status === "open")}
              onAddSL={onAddSL}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
