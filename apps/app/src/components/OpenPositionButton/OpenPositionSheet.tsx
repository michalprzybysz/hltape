"use client";

import { SIDES } from "@furious-abacus/sdk";
import { Button } from "@furious-abacus/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@furious-abacus/ui/components/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@furious-abacus/ui/components/drawer";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldTitle,
} from "@furious-abacus/ui/components/field";
import { RadioGroup, RadioGroupItem } from "@furious-abacus/ui/components/radio-group";
import { Spinner } from "@furious-abacus/ui/components/spinner";
import { useMediaQuery } from "@furious-abacus/ui/hooks/use-media-query";
import { useTranslations } from "next-intl";
import type { FormEvent } from "react";
import { type Control, Controller, type UseFormTrigger } from "react-hook-form";
import { OrderSummary } from "./OrderSummary";
import { SizeField } from "./SizeField";
import { MARGIN_MODE, type MarginMode, type OpenPositionFormData } from "./schema";
import { TrailingSlSection } from "./TrailingSlSection";

export type Pill = "perp" | "leverage" | "margin";

const FORM_ID = "open-position-form";

interface OpenPositionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  control: Control<OpenPositionFormData>;
  trigger: UseFormTrigger<OpenPositionFormData>;
  withdrawable: number;
  currentPrice: string | undefined;
  coinLabel: string;
  leverage: number;
  marginMode: MarginMode;
  isPending: boolean;
  isValid: boolean;
  errorMessage?: string;
  onOpenPill: (pill: Pill) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function OpenPositionSheet({
  open,
  onOpenChange,
  control,
  trigger,
  withdrawable,
  currentPrice,
  coinLabel,
  leverage,
  marginMode,
  isPending,
  isValid,
  errorMessage,
  onOpenPill,
  onSubmit,
}: OpenPositionSheetProps) {
  const t = useTranslations("openPosition");
  const tCommon = useTranslations("common");
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const body = (
    <form id={FORM_ID} onSubmit={onSubmit} noValidate className="no-scrollbar overflow-y-auto px-4">
      <div className="grid grid-cols-3 gap-2 mb-5">
        <Button type="button" variant="outline" onClick={() => onOpenPill("perp")}>
          {coinLabel}
        </Button>
        <Button type="button" variant="outline" onClick={() => onOpenPill("leverage")}>
          {leverage}x
        </Button>
        <Button type="button" variant="outline" onClick={() => onOpenPill("margin")}>
          {marginMode === MARGIN_MODE.CROSS ? t("crossTitle") : t("isolatedTitle")}
        </Button>
      </div>

      <FieldGroup>
        <FieldSeparator />
        <Controller
          name="side"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="grid-cols-2"
              >
                <FieldLabel htmlFor="side-long">
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldTitle>{tCommon("long")}</FieldTitle>
                    </FieldContent>
                    <RadioGroupItem value={SIDES.LONG} id="side-long" />
                  </Field>
                </FieldLabel>
                <FieldLabel htmlFor="side-short">
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldTitle>{tCommon("short")}</FieldTitle>
                    </FieldContent>
                    <RadioGroupItem value={SIDES.SHORT} id="side-short" />
                  </Field>
                </FieldLabel>
              </RadioGroup>
            </Field>
          )}
        />

        <FieldSeparator />
        <SizeField control={control} withdrawable={withdrawable} />

        <FieldSeparator />
        <TrailingSlSection control={control} trigger={trigger} />
        <FieldSeparator />
      </FieldGroup>

      <OrderSummary control={control} currentPrice={currentPrice} />

      {errorMessage && <FieldError errors={[{ message: errorMessage }]} />}
    </form>
  );

  const submitButton = (
    <Button
      type="submit"
      form={FORM_ID}
      size="lg"
      className="h-12 w-full text-base"
      disabled={isPending || !isValid}
    >
      {isPending ? (
        <>
          <Spinner data-icon="inline-start" />
          {t("opening")}
        </>
      ) : (
        tCommon("openPosition")
      )}
    </Button>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-4 p-0 sm:max-w-2xl">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>{tCommon("openPosition")}</DialogTitle>
          </DialogHeader>
          {body}
          <DialogFooter className="mx-0 mb-0">{submitButton}</DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader>
          <DrawerTitle>{tCommon("openPosition")}</DrawerTitle>
        </DrawerHeader>
        {body}
        <DrawerFooter>{submitButton}</DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
