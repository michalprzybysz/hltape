// apps/app/src/lib/useAgentWalletsQuery.ts
import type { AgentWallet } from "@furious-abacus/sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const agentWalletsQueryKey = ["wallets", "agent"] as const;

export const useAgentWalletsQuery = () => {
  const query = useQuery<AgentWallet[]>({
    queryKey: agentWalletsQueryKey,
    queryFn: () => api.wallets.agent.getAll(),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  return {
    ...query,
    agentWallets: query.data,
  } as const;
};

export const useAgentWalletsCreateMutation = () => {
  const client = useQueryClient();
  const mutation = useMutation<AgentWallet, Error, Partial<AgentWallet>, AgentWallet>({
    mutationKey: [...agentWalletsQueryKey, "create"],
    mutationFn: (data) => api.wallets.agent.create(data),
    onSuccess: (data) => {
      client.setQueryData<AgentWallet[]>(agentWalletsQueryKey, (oldData) => {
        return [data, ...(oldData ?? [])];
      });
    },
  });
  return mutation;
};

export const useAgentWalletsDeleteMutation = () => {
  const client = useQueryClient();
  const mutation = useMutation<
    void,
    Error,
    AgentWallet["id"],
    { previousData: AgentWallet[] | undefined }
  >({
    mutationKey: [...agentWalletsQueryKey, "delete"],
    mutationFn: (id) => api.wallets.agent.delete(id),
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: agentWalletsQueryKey });
      const previousData = client.getQueryData<AgentWallet[]>(agentWalletsQueryKey);
      client.setQueryData<AgentWallet[]>(agentWalletsQueryKey, (oldData) => {
        return oldData?.filter((wallet) => wallet.id !== id) ?? [];
      });
      return { previousData };
    },
    onError: (_err, _id, context) => {
      if (context?.previousData) {
        client.setQueryData(agentWalletsQueryKey, context.previousData);
      }
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: agentWalletsQueryKey });
    },
  });
  return mutation;
};
