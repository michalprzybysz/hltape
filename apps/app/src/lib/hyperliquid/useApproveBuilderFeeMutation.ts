// apps/app/src/lib/hyperliquid/useApproveBuilderFeeMutation.ts
import { useMutation } from "@tanstack/react-query";
import { useWalletClient } from "wagmi";
import { api } from "@/lib/api";
import { BUILDER_ADDRESS, MAX_BUILDER_FEE } from "@/lib/revenue";

export function useApproveBuilderFeeMutation() {
  const { data: walletClient } = useWalletClient();

  return useMutation({
    mutationFn: async ({ builderAddress = BUILDER_ADDRESS }: { builderAddress?: string } = {}) => {
      if (!walletClient) {
        throw new Error("Main wallet not connected.");
      }
      if (!builderAddress) {
        throw new Error("Builder address is not configured.");
      }

      return await api.hyperliquid.approveBuilderFee({
        walletClient,
        builder: builderAddress,
        maxFeeRate: MAX_BUILDER_FEE,
      });
    },
  });
}
