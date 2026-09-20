// packages/sdk/src/index.ts
import type { KyInstance, Options } from "ky";
import { createHttpClient } from "./httpClient";
import {
  createHyperliquidModule,
  type HyperliquidConfig,
  type HyperliquidModule,
} from "./hyperliquid";
import { createLogsModule } from "./logging";
import { createOrdersModule } from "./orders";
import { createPositionsModule } from "./positions";
import { createWalletsModule } from "./wallets";

export interface SdkConfig {
  url: string;
  hooks?: Options["hooks"];
  hyperliquid?: HyperliquidConfig;
}

export interface SdkInstance {
  hyperliquid: HyperliquidModule;
  logs: ReturnType<typeof createLogsModule>;
  orders: ReturnType<typeof createOrdersModule>;
  positions: ReturnType<typeof createPositionsModule>;
  wallets: ReturnType<typeof createWalletsModule>;
  getHttpClient: () => KyInstance;
}

export const createSdk = ({ url, hooks, hyperliquid }: SdkConfig): SdkInstance => {
  if (!url) {
    throw new Error("The API URL is required to create the SDK instance.");
  }

  const { getClient } = createHttpClient({
    baseUrl: url,
    hooks,
  });

  const logs = createLogsModule(getClient);
  const orders = createOrdersModule(getClient);
  const positions = createPositionsModule(getClient);
  const wallets = createWalletsModule(getClient);
  const hl = createHyperliquidModule(hyperliquid ?? { isTestnet: false });

  return {
    hyperliquid: hl,
    logs,
    orders,
    positions,
    wallets,
    getHttpClient: getClient,
  };
};

export type { HttpClientFactory } from "./httpClient";
export { createHttpClient } from "./httpClient";
export type {
  AllMidsResponse,
  ApproveAgentPayload,
  ApproveBuilderFeeParams,
  HyperliquidConfig,
  HyperliquidModule,
  MaxBuilderFeeParams,
  MetaResponse,
} from "./hyperliquid";
export { createHyperliquidModule } from "./hyperliquid";
export type { ExecutionLog, ExecutionStatus, GetLogsParams } from "./logging";
export type { CreateOrderInput, Order } from "./orders";
export type {
  AccountSummary,
  MarginMode,
  OpenPositionRequest,
  OpenPositionResponse,
  Position,
  PositionsResponse,
  Side,
} from "./positions";
export { SIDES } from "./positions";
export type { AgentWallet, WalletAddress } from "./wallets";
