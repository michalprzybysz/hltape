"use client";

import { Button } from "@hltape/ui/components/button";
import { useTranslations } from "next-intl";
import type { Control, UseFormTrigger } from "react-hook-form";
import { LeverageField } from "./LeverageField";
import { ResponsiveSheet } from "./ResponsiveSheet";
import type { OpenPositionFormData } from "./schema";

interface LeverageSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  control: Control<OpenPositionFormData>;
  trigger: UseFormTrigger<OpenPositionFormData>;
  maxLeverage: number;
}

export function LeverageSheet({
  open,
  onOpenChange,
  control,
  trigger,
  maxLeverage,
}: LeverageSheetProps) {
  const t = useTranslations("openPosition");
  const tCommon = useTranslations("common");

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("leverageLabel")}
      nested
      footer={
        <Button type="button" className="w-full" onClick={() => onOpenChange(false)}>
          {tCommon("done")}
        </Button>
      }
    >
      <div className="px-4">
        <LeverageField control={control} maxLeverage={maxLeverage} trigger={trigger} />
      </div>
    </ResponsiveSheet>
  );
}
