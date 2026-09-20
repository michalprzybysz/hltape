// apps/app/src/lib/useWalletsQuery.ts
import type { WalletAddress } from "@furious-abacus/sdk";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const walletsQueryKey = ["wallets"] as const;

export const useWalletsQuery = () => {
  const query = useQuery<WalletAddress[]>({
    queryKey: walletsQueryKey,
    queryFn: () => api.wallets.getAll(),
    staleTime: 60_000, // Master wallets don't change often
  });

  return {
    ...query,
    wallets: query.data,
  } as const;
};
