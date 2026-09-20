// apps/app/src/app/(restricted)/profile/@wallet/ApproveBuilderFeeButton.tsx
"use client";

import { useTranslations } from "next-intl";
import LoadingButton from "@/components/LoadingButton";
import { useApproveBuilderFeeMutation } from "@/lib/hyperliquid/useApproveBuilderFeeMutation";
import { useBuilderFeeQuery } from "@/lib/hyperliquid/useBuilderFeeQuery";

export function ApproveBuilderFeeButton() {
  const t = useTranslations("generateAgent");
  const { mutateAsync, isPending } = useApproveBuilderFeeMutation();
  const { hasBuilderFee, isBuilderFeeConfigured, refetch } = useBuilderFeeQuery();

  const handleClick = async (): Promise<void> => {
    await mutateAsync({});
    await refetch();
  };

  if (!isBuilderFeeConfigured || hasBuilderFee) {
    return null;
  }

  return (
    <LoadingButton onClick={handleClick} loading={isPending}>
      {t("approveBuilderFee")}
    </LoadingButton>
  );
}
