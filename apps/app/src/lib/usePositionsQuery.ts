// apps/app/src/lib/usePositionsQuery.ts
"use client";

import type { OpenPositionRequest, PositionsResponse } from "@furious-abacus/sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const positionsQueryKey = ["positions"] as const;

export const usePositionsQuery = () => {
  const query = useQuery<PositionsResponse>({
    queryKey: positionsQueryKey,
    queryFn: () => api.positions.getAll(),
    refetchInterval: 10_000,
    staleTime: 5_000,
  });

  return {
    ...query,
    positions: query.data?.positions,
    marginSummary: query.data?.marginSummary,
    crossMarginSummary: query.data?.crossMarginSummary,
    withdrawable: query.data?.withdrawable,
  } as const;
};

export const useOpenPositionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: OpenPositionRequest) => api.positions.open(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: positionsQueryKey });
    },
  });
};
