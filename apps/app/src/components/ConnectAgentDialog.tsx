"use client";

import { Alert, AlertDescription, AlertTitle } from "@furious-abacus/ui/components/alert";
import { Button } from "@furious-abacus/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@furious-abacus/ui/components/dialog";
import { SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import { HiInformationCircle, HiRefresh } from "react-icons/hi";
import { adjectives, animals, uniqueNamesGenerator } from "unique-names-generator";
import { useApproveBuilderFeeMutation } from "@/lib/hyperliquid/useApproveBuilderFeeMutation";
import { useBuilderFeeQuery } from "@/lib/hyperliquid/useBuilderFeeQuery";
import { MAX_BUILDER_FEE, REQUIRED_FEE_APPROVAL } from "@/lib/revenue";
import { useAgentWalletsCreateMutation } from "@/lib/useAgentWalletsQuery";

const INPUT_CLASS =
  "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40";

enum InputsEnum {
  Label = "label",
  AgentAddress = "agentAddress",
  PrivateKey = "privateKey",
}

type Inputs = {
  [InputsEnum.Label]: string;
  [InputsEnum.AgentAddress]: string;
  [InputsEnum.PrivateKey]: string;
};

interface ConnectAgentDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  showCloseButton?: boolean;
  title: string;
  description: ReactNode;
  onSuccess?: () => void;
  footer?: ReactNode;
}

export function ConnectAgentDialog({
  open,
  onOpenChange,
  showCloseButton = true,
  title,
  description,
  onSuccess,
  footer,
}: ConnectAgentDialogProps) {
  const t = useTranslations("connectAgent");
  const { data: approvedFeeRate, isBuilderFeeConfigured } = useBuilderFeeQuery();
  const createMutation = useAgentWalletsCreateMutation();
  const { mutateAsync: approveBuilderFee, isPending: isApprovingFee } =
    useApproveBuilderFeeMutation();

  // Without a configured builder address this deployment takes no builder fee, so the
  // approval step is skipped entirely and the flow goes straight to agent generation.
  const needsFeeApproval = isBuilderFeeConfigured && (approvedFeeRate || 0) < REQUIRED_FEE_APPROVAL;

  const {
    handleSubmit,
    register,
    formState: { errors },
    setError,
    reset,
    setValue,
  } = useForm<Inputs>();

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    if (needsFeeApproval) {
      try {
        await approveBuilderFee({});
      } catch (err: unknown) {
        const error = err as Error;
        const isRejected = error.message?.includes("User rejected");
        const errorMessage = isRejected ? t("userRejected") : error.message || t("unknownError");
        setError("root.server", { message: errorMessage });
        return;
      }
    }

    createMutation.mutate(data, {
      onError(error) {
        setError("root.server", { message: error.message });
      },
      onSuccess() {
        reset();
        onSuccess?.();
      },
    });
  };

  const isProcessing = isApprovingFee || createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={showCloseButton} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          id="connect-agent-form"
          autoComplete="off"
          data-form-type="other"
          className="flex flex-col gap-4"
        >
          <div className="flex-1">
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="agent-label"
                className="flex items-center gap-2 text-sm leading-none font-medium select-none"
              >
                {t("label")}
              </label>
              <button
                type="button"
                onClick={() =>
                  setValue(
                    InputsEnum.Label,
                    uniqueNamesGenerator({
                      dictionaries: [adjectives, animals],
                      separator: " ",
                      style: "capital",
                    }),
                  )
                }
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                <HiRefresh className="h-3 w-3" />
                {t("random")}
              </button>
            </div>
            <input
              id="agent-label"
              placeholder={t("labelPlaceholder")}
              aria-invalid={errors.label ? "true" : "false"}
              autoComplete="one-time-code"
              disabled={isProcessing}
              className={INPUT_CLASS}
              {...register("label", { required: true })}
            />
          </div>

          <div className="flex-1">
            <label
              htmlFor="agent-address"
              className="mb-2 block flex items-center gap-2 text-sm leading-none font-medium select-none"
            >
              {t("agentAddress")}
            </label>
            <input
              id="agent-address"
              placeholder={t("addressPlaceholder")}
              aria-invalid={errors.agentAddress ? "true" : "false"}
              autoComplete="one-time-code"
              spellCheck={false}
              disabled={isProcessing}
              className={INPUT_CLASS}
              {...register("agentAddress", { required: true })}
            />
          </div>

          <div className="flex-1">
            <label
              htmlFor="agent-private-key"
              className="mb-2 block flex items-center gap-2 text-sm leading-none font-medium select-none"
            >
              {t("privateKey")}
            </label>
            <input
              id="agent-private-key"
              type="text"
              placeholder={t("privateKeyPlaceholder")}
              aria-invalid={errors.privateKey ? "true" : "false"}
              autoComplete="one-time-code"
              data-lpignore="true"
              data-1p-ignore="true"
              data-form-type="other"
              className={`${INPUT_CLASS} [-webkit-text-security:disc]`}
              disabled={isProcessing}
              {...register("privateKey", { required: true })}
            />
          </div>

          {needsFeeApproval && (
            <Alert>
              <SparklesIcon />
              <AlertTitle>{t("oneTimeSetup")}</AlertTitle>
              <AlertDescription>
                {t("oneTimeSetupDescription", { maxFee: MAX_BUILDER_FEE })}
              </AlertDescription>
            </Alert>
          )}
        </form>

        {errors.root?.server && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-destructive text-sm">
            <HiInformationCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>{errors.root?.server.message}</div>
          </div>
        )}

        <DialogFooter className="flex-col items-stretch sm:flex-col">
          <Button type="submit" disabled={isProcessing} form="connect-agent-form">
            {needsFeeApproval ? t("approveFeeConnect") : t("connectWallet")}
          </Button>
          <p className="text-center text-xs text-muted-foreground text-balance">
            {t("referralDisclaimer")}
          </p>
          {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
