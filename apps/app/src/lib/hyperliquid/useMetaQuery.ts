// apps/app/src/lib/hyperliquid/useMetaQuery.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const useMetaQuery = () => {
  return useQuery({
    queryKey: ["meta"],
    queryFn: () => api.hyperliquid.meta(),
    staleTime: 60_000,
  });
};
