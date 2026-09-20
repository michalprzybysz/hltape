// apps/app/src/lib/hyperliquid/useAllMidsQuery.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const useAllMidsQuery = () => {
  return useQuery({
    queryKey: ["all-mids"],
    queryFn: () => api.hyperliquid.allMids(),
    refetchInterval: 10_000,
  });
};
