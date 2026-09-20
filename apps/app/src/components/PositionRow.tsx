// apps/app/src/components/PositionRow.tsx
"use client";

import type { Order, Position } from "@furious-abacus/sdk";
import { Badge } from "@furious-abacus/ui/components/badge";
import { Button, buttonVariants } from "@furious-abacus/ui/components/button";
import { TableCell, TableRow } from "@furious-abacus/ui/components/table";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { HiShieldCheck } from "react-icons/hi";
import { PositionInstrument } from "@/components/PositionInstrument";
import { PositionSide } from "@/components/PositionSide";
import useFormatter from "@/lib/useFormatter";

interface PositionRowProps {
  position: Position;
  order: Order | undefined;
  onAddSL: (position: Position) => void;
}

export function PositionRow({ position, order, onAddSL }: PositionRowProps) {
  const t = useTranslations("positions");
  const { crypto } = useFormatter();
  const side = Number(position.szi) > 0 ? "long" : "short";

  return (
    <TableRow className="bg-white dark:border-gray-700 dark:bg-gray-800">
      <TableCell>
        <div className="flex items-center gap-3">
          <PositionInstrument instrument={position.coin} />
          <Badge variant="secondary">{position.leverage.value}x</Badge>
        </div>
      </TableCell>
      <TableCell>
        <PositionSide side={side} />
      </TableCell>
      <TableCell className="font-mono">{position.szi}</TableCell>
      <TableCell className="font-mono">{crypto(Number(position.entryPx))}</TableCell>
      <TableCell className="font-mono">{crypto(Number(position.positionValue))}</TableCell>
      <TableCell className="font-mono text-gray-500 dark:text-gray-400">
        {position.liquidationPx ? crypto(Number(position.liquidationPx)) : "—"}
      </TableCell>
      <TableCell className="text-right">
        {order ? (
          <Link
            href={`/orders/${order.id}`}
            className={buttonVariants({ variant: "link", size: "xs" })}
          >
            <HiShieldCheck className="mr-1 size-3" />
            {t("viewOrder")}
          </Link>
        ) : (
          <Button size="xs" variant="outline" onClick={() => onAddSL(position)}>
            <HiShieldCheck className="mr-1 size-3" />
            {t("addSl")}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
