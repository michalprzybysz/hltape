"use client";

import { useTranslations } from "next-intl";
import { type Control, Controller } from "react-hook-form";
import { MarginModePanel } from "./MarginModePanel";
import { ResponsiveSheet } from "./ResponsiveSheet";
import type { OpenPositionFormData } from "./schema";

interface MarginModeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  control: Control<OpenPositionFormData>;
}

export function MarginModeSheet({ open, onOpenChange, control }: MarginModeSheetProps) {
  const t = useTranslations("openPosition");

  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title={t("marginModeLabel")} nested>
      <div className="px-4 pb-4">
        <Controller
          name="marginMode"
          control={control}
          render={({ field }) => (
            <MarginModePanel
              value={field.value}
              onChange={(v) => {
                field.onChange(v);
                onOpenChange(false);
              }}
            />
          )}
        />
      </div>
    </ResponsiveSheet>
  );
}
