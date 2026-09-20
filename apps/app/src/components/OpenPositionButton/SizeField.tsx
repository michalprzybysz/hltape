"use client";

import { Field } from "@hltape/ui/components/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@hltape/ui/components/input-group";
import { Slider } from "@hltape/ui/components/slider";
import { type Control, Controller, useWatch } from "react-hook-form";
import useFormatter from "@/lib/useFormatter";
import { PresetToggle } from "./PresetToggle";
import { type OpenPositionFormData, SIZE_PRESETS } from "./types";

interface SizeFieldProps {
  control: Control<OpenPositionFormData>;
  withdrawable: number;
}

export function SizeField({ control, withdrawable }: SizeFieldProps) {
  const fmt = useFormatter();
  const leverage = useWatch({ control, name: "leverage" }) ?? 1;
  const maxSize = withdrawable * leverage;
  return (
    <Field>
      <Controller
        name="sizeUsd"
        control={control}
        render={({ field }) => {
          const clamped = Math.min(field.value, maxSize);
          const pct = maxSize > 0 ? Math.round((clamped / maxSize) * 100) : 0;
          return (
            <>
              <InputGroup>
                <InputGroupInput
                  type="number"
                  min={1}
                  max={maxSize}
                  step={0.01}
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  name={field.name}
                />
                <InputGroupAddon align="inline-end">
                  <span className="text-sm text-muted-foreground">USDC</span>
                </InputGroupAddon>
              </InputGroup>
              <Slider
                min={1}
                max={maxSize}
                step={1}
                className="mt-2 cursor-pointer"
                value={clamped}
                onValueChange={(v) => field.onChange(v)}
              />
              <PresetToggle
                presets={SIZE_PRESETS}
                selected={
                  (SIZE_PRESETS as readonly number[]).includes(pct)
                    ? (pct as (typeof SIZE_PRESETS)[number])
                    : null
                }
                onSelect={(p) => field.onChange(Math.round((maxSize * p) / 100))}
                formatLabel={(p) => fmt.percent(p / 100)}
                className="mt-2"
              />
            </>
          );
        }}
      />
    </Field>
  );
}
