// packages/sdk/src/wallets/index.ts
import type { HttpRequester } from "../httpClient";
import { createAgentWalletModule } from "./agent";

const DEFAULT_RESOURCE_PATH = "wallets" as const;

export interface WalletsModuleOptions {
  resourcePath?: string;
}

export type WalletAddress = {
  id: string;
  address: string;
  chainId: number;
  isPrimary: boolean | null;
  createdAt: string;
};

export interface WalletsModule {
  getAll: () => Promise<WalletAddress[]>;
  agent: ReturnType<typeof createAgentWalletModule>;
}

export const createWalletsModule = (
  request: HttpRequester,
  options: WalletsModuleOptions = {},
): WalletsModule => {
  const { resourcePath = DEFAULT_RESOURCE_PATH } = options;

  const agent = createAgentWalletModule(request);

  return {
    getAll: () => request().get(resourcePath).json<WalletAddress[]>(),
    agent,
  };
};

export type { AgentWallet } from "./agent";
