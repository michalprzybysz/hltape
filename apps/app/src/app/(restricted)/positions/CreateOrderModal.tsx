// apps/app/src/app/(restricted)/positions/CreateOrderModal.tsx
"use client";

import { Dialog } from "@base-ui/react/dialog";
import type { Position } from "@hltape/sdk";
import { Button } from "@hltape/ui/components/button";
import { Field, FieldError, FieldLabel } from "@hltape/ui/components/field";
import { InputGroup, InputGroupAddon, InputGroupText } from "@hltape/ui/components/input-group";
import { NumericInputGroupInput } from "@hltape/ui/components/numeric-input";
import { Spinner } from "@hltape/ui/components/spinner";
import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { FiPercent } from "react-icons/fi";
import { HiShieldCheck } from "react-icons/hi";
import useFormatter from "@/lib/useFormatter";
import { useCreateOrderMutation } from "@/lib/useOrdersQuery";

interface CreateOrderFormValues {
  trailingDistance: number;
}

interface CreateOrderModalProps {
  position: Position | null;
  onClose: () => void;
}

function calculateTriggerPrice(entryPx: number, trailingDistance: number, isLong: boolean): number {
  return isLong ? entryPx * (1 - trailingDistance) : entryPx * (1 + trailingDistance);
}

export function CreateOrderModal({ position, onClose }: CreateOrderModalProps) {
  const t = useTranslations("createOrder");
  const tCommon = useTranslations("common");
  const createOrder = useCreateOrderMutation();
  const { crypto, percent } = useFormatter();

  const isLong = position ? Number(position.szi) > 0 : true;
  const size = position ? Math.abs(Number(position.szi)).toString() : "0";
  const leverage = position?.leverage.value ?? 1;
  const entryPx = position ? Number(position.entryPx) : 0;

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
    watch,
  } = useForm<CreateOrderFormValues>({
    defaultValues: {
      trailingDistance: 0.1,
    },
  });

  const trailingDistance = watch("trailingDistance");

  const calculatedTriggerPrice =
    position && trailingDistance != null
      ? calculateTriggerPrice(entryPx, trailingDistance, isLong)
      : 0;

  const onSubmit = async (data: CreateOrderFormValues) => {
    if (!position) return;

    const triggerPrice = calculateTriggerPrice(entryPx, data.trailingDistance, isLong);

    await createOrder.mutateAsync({
      instrument: position.coin,
      side: isLong ? "long" : "short",
      size,
      triggerPrice: triggerPrice.toString(),
      leverage,
      trailingDistance: trailingDistance.toString(),
    });

    onClose();
  };

  return (
    <Dialog.Root
      open={!!position}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-background p-6 shadow-lg sm:max-w-md">
          <Dialog.Title className="text-lg leading-none font-semibold">
            <div className="flex items-center gap-2">
              <HiShieldCheck className="size-5 text-cyan-500" />
              {t("title")}
            </div>
          </Dialog.Title>
          <Dialog.Close className="absolute top-4 right-4 rounded-xs opacity-70 hover:opacity-100">
            <XIcon className="size-4" />
          </Dialog.Close>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Position Info */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t("instrument")}
                  </dt>
                  <dd className="mt-1 text-sm font-mono font-medium text-gray-900 dark:text-white">
                    {position?.coin ?? ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {tCommon("side")}
                  </dt>
                  <dd
                    className={`mt-1 text-sm font-medium font-mono ${
                      isLong
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {isLong ? tCommon("long") : tCommon("short")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {tCommon("size")}
                  </dt>
                  <dd className="mt-1 font-mono text-sm font-mono font-medium text-gray-900 dark:text-white">
                    {size}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {tCommon("leverage")}
                  </dt>
                  <dd className="mt-1 text-sm font-mono font-medium text-gray-900 dark:text-white">
                    {leverage}x
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {tCommon("entryPrice")}
                  </dt>
                  <dd className="mt-1 font-mono text-sm font-medium text-gray-900 dark:text-white">
                    {position ? crypto(Number(position.entryPx)) : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {tCommon("positionValue")}
                  </dt>
                  <dd className="mt-1 font-mono text-sm font-medium text-gray-900 dark:text-white">
                    {position ? crypto(Number(position.positionValue)) : ""}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Editable Fields */}
            <div className="space-y-4">
              <Controller
                name="trailingDistance"
                control={control}
                rules={{
                  required: t("required"),
                  min: {
                    value: 0.01,
                    message: t("minimum", { value: percent(0.01) }),
                  },
                  max: {
                    value: 0.9999,
                    message: t("maximum", { value: percent(0.9999) }),
                  },
                }}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="trailingDistance">{t("trailingDistance")}</FieldLabel>
                    <InputGroup aria-invalid={fieldState.invalid}>
                      <NumericInputGroupInput
                        id="trailingDistance"
                        className="font-mono"
                        aria-invalid={fieldState.invalid}
                        allowNegative={false}
                        decimalScale={2}
                        isAllowed={({ floatValue }) =>
                          floatValue === undefined || floatValue <= 99.99
                        }
                        defaultValue={parseFloat((field.value * 100).toFixed(2))}
                        onValueChange={({ floatValue }, { source }) => {
                          if (source === "event") {
                            field.onChange(floatValue != null ? floatValue / 100 : undefined);
                          }
                        }}
                        placeholder="0.00"
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupText>
                          <FiPercent />
                        </InputGroupText>
                      </InputGroupAddon>
                    </InputGroup>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <div className="rounded-lg border border-gray-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {t("calculatedTriggerPrice")}
                </div>
                <div className="mt-1 font-mono text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {crypto(calculatedTriggerPrice)}
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {tCommon("entryPrice")} (
                  <span className="font-mono">
                    {crypto(entryPx)} {isLong ? "-" : "+"} {percent(Number(trailingDistance ?? 0))}
                  </span>
                  )
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  onClose();
                }}
                disabled={isSubmitting}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Spinner className="mr-2" />
                    {t("creating")}
                  </>
                ) : (
                  <>
                    <HiShieldCheck className="mr-2 size-4" />
                    {t("createStopLoss")}
                  </>
                )}
              </Button>
            </div>

            {createOrder.error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {createOrder.error instanceof Error
                  ? createOrder.error.message
                  : t("failedToCreate")}
              </div>
            )}
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
