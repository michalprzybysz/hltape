"use client";

import { useTranslations } from "next-intl";
import { MARGIN_MODE, type MarginMode } from "./schema";

interface MarginModePanelProps {
  value: MarginMode;
  onChange: (mode: MarginMode) => void;
}

export function MarginModePanel({ value, onChange }: MarginModePanelProps) {
  const t = useTranslations("openPosition");
  const options: Array<{ value: MarginMode; title: string; description: string }> = [
    {
      value: MARGIN_MODE.CROSS,
      title: t("crossTitle"),
      description: t("crossDescription"),
    },
    {
      value: MARGIN_MODE.ISOLATED,
      title: t("isolatedTitle"),
      description: t("isolatedDescription"),
    },
  ];

  return (
    <div className="flex flex-col gap-2 md:flex-row">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className="flex flex-col gap-1 rounded-lg border border-border bg-background p-4 text-left transition hover:bg-muted/40 aria-pressed:border-primary aria-pressed:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 md:flex-1"
          >
            <span className="text-sm font-medium">{opt.title}</span>
            <span className="text-xs text-muted-foreground">{opt.description}</span>
          </button>
        );
      })}
    </div>
  );
}
