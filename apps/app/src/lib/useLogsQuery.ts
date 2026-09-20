// apps/app/src/lib/useLogsQuery.ts
"use client";

import type { ExecutionLog, GetLogsParams } from "@furious-abacus/sdk";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const logsQueryKey = ["logs"] as const;

export const useLogsQuery = (params?: GetLogsParams) => {
  const query = useQuery<ExecutionLog[]>({
    queryKey: params ? [...logsQueryKey, params] : logsQueryKey,
    queryFn: () => api.logs.getAll(params),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  return {
    ...query,
    logs: query.data,
  } as const;
};

export const useLogQuery = (id: ExecutionLog["id"]) => {
  const queryKey = [...logsQueryKey, id];
  const query = useQuery({
    queryKey,
    queryFn: () => api.logs.getById(id),
  });

  return {
    ...query,
    log: query.data,
  } as const;
};
