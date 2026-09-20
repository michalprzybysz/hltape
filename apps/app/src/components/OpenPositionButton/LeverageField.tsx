"use client";

import { Field, FieldError } from "@furious-abacus/ui/components/field";
import { Slider } from "@furious-abacus/ui/components/slider";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { type Control, Controller } from "react-hook-form";
import { PresetToggle } from "./PresetToggle";
import { clampLeverage, computeLeveragePresets, type OpenPositionFormData } from "./types";

interface LeverageFieldProps {
  control: Control<OpenPositionFormData>;
  maxLeverage: number;
  trigger: (name: "trailingSL.distance") => void;
}

export function LeverageField({ control, maxLeverage, trigger }: LeverageFieldProps) {
  const t = useTranslations("openPosition");
  const leveragePresets = useMemo(() => computeLeveragePresets(maxLeverage), [maxLeverage]);
  if (maxLeverage <= 1) return null;

  return (
    <Field>
      <Controller
        name="leverage"
        control={control}
        render={({ field, fieldState }) => (
          <>
            <div className="flex flex-col items-center gap-1 pb-2">
              <span className="font-mono text-4xl font-semibold leading-none text-white tabular-nums">
                {field.value}x
              </span>
              <span className="text-xs text-muted-foreground">
                {t("maxLeverage", { max: maxLeverage })}
              </span>
            </div>
            <Slider
              min={1}
              max={maxLeverage}
              step={1}
              className="cursor-pointer"
              value={field.value}
              onValueChange={(val) => {
                field.onChange(clampLeverage(val as number, maxLeverage));
                trigger("trailingSL.distance");
              }}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            <PresetToggle
              presets={leveragePresets}
              selected={field.value}
              onSelect={(v) => {
                field.onChange(v);
                trigger("trailingSL.distance");
              }}
              formatLabel={(v) => `${v}x`}
              className="mt-2"
            />
          </>
        )}
      />
    </Field>
  );
}
