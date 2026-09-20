// packages/sdk/src/wallets/agent.ts
import type { HttpRequester } from "../httpClient";

const DEFAULT_RESOURCE_PATH = "wallets/agent" as const;

export interface AgentWalletModuleOptions {
  resourcePath?: string;
}

export type AgentWallet = {
  id: string;
  label: string;
  agentAddress: string;
  isActive: boolean;
  createdAt: string;
  privateKey?: string;
};

export interface AgentWalletModule {
  getAll: () => Promise<AgentWallet[]>;
  create: (data: Partial<AgentWallet>) => Promise<AgentWallet>;
  delete: (id: string) => Promise<void>;
}

export const createAgentWalletModule = (
  request: HttpRequester,
  options: AgentWalletModuleOptions = {},
): AgentWalletModule => {
  const { resourcePath = DEFAULT_RESOURCE_PATH } = options;
  return {
    getAll: () => request().get(resourcePath).json<AgentWallet[]>(),
    create: (data: Partial<AgentWallet>) =>
      request().post(resourcePath, { json: data }).json<AgentWallet>(),
    delete: (id: string) =>
      request()
        .delete(`${resourcePath}/${id}`)
        .then(() => undefined),
  };
};
