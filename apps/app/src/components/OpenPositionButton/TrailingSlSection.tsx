"use client";

import { Field, FieldError, FieldLabel } from "@furious-abacus/ui/components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@furious-abacus/ui/components/input-group";
import { useTranslations } from "next-intl";
import { type Control, Controller } from "react-hook-form";
import { FiPercent } from "react-icons/fi";
import useFormatter from "@/lib/useFormatter";
import { PresetToggle } from "./PresetToggle";
import { type OpenPositionFormData, SL_PRESETS } from "./types";

interface TrailingSlSectionProps {
  control: Control<OpenPositionFormData>;
  trigger: (name: "trailingSL.distance") => void;
}

export function TrailingSlSection({ control, trigger }: TrailingSlSectionProps) {
  const t = useTranslations("openPosition");
  const fmt = useFormatter();

  return (
    <Controller
      name="trailingSL.distance"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor="trailingSL.distance">{t("distanceFromEntry")}</FieldLabel>
          <InputGroup aria-invalid={fieldState.invalid}>
            <InputGroupInput
              id={field.name}
              type="number"
              step="1"
              min="1"
              max="99"
              name={field.name}
              aria-invalid={fieldState.invalid}
              value={Math.round((field.value ?? 0.01) * 100)}
              onChange={(e) => {
                const pct = Number(e.target.value);
                field.onChange(pct / 100);
                trigger("trailingSL.distance");
              }}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupText>
                <FiPercent />
              </InputGroupText>
            </InputGroupAddon>
          </InputGroup>
          <PresetToggle
            presets={SL_PRESETS}
            selected={field.value as (typeof SL_PRESETS)[number]}
            onSelect={(d) => {
              field.onChange(d);
              trigger("trailingSL.distance");
            }}
            formatLabel={(d) => fmt.percent(d)}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
