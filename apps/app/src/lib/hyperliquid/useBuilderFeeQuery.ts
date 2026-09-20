// apps/app/src/lib/hyperliquid/useBuilderFeeQuery.ts
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { api } from "@/lib/api";
import { BUILDER_ADDRESS } from "@/lib/revenue";

export function useBuilderFeeQuery() {
  const { address } = useAccount();

  const query = useQuery({
    queryKey: ["hyperliquid", "maxBuilderFee", { user: address, builder: BUILDER_ADDRESS }],
    queryFn: async () => {
      if (!address) {
        throw new Error("No address");
      }
      if (!BUILDER_ADDRESS) {
        throw new Error("No builder address");
      }

      return await api.hyperliquid.maxBuilderFee({
        user: address,
        builder: BUILDER_ADDRESS,
      });
    },
    enabled: !!address && !!BUILDER_ADDRESS,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  return {
    builderFee: query.data,
    hasBuilderFee: (query.data || 0) > 0,
    // When no builder address is configured this deployment charges no builder fee at all,
    // so every builder-fee approval step must be skipped rather than shown as pending.
    isBuilderFeeConfigured: !!BUILDER_ADDRESS,
    ...query,
  };
}
