// apps/app/src/components/PositionSide.tsx
"use client";

import { cn } from "@furious-abacus/ui/lib/utils";
import { useTranslations } from "next-intl";
import { HiTrendingDown, HiTrendingUp } from "react-icons/hi";

interface PositionSideProps {
  side: "long" | "short";
  className?: string;
}

export const PositionSide = ({ side, className }: PositionSideProps) => {
  const t = useTranslations("common");
  const isLong = side === "long";

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 font-medium text-xs",
        isLong ? "text-green-500" : "text-red-500",
        className,
      )}
    >
      {isLong ? <HiTrendingUp className="size-4" /> : <HiTrendingDown className="size-4" />}
      <span className="uppercase tracking-wide">{isLong ? t("long") : t("short")}</span>
    </div>
  );
};
