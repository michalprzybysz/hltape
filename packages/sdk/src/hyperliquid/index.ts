// packages/sdk/src/hyperliquid/index.ts
import { ExchangeClient, HttpTransport, InfoClient } from "@nktkas/hyperliquid";
import type {
  ApproveAgentPayload,
  ApproveBuilderFeeParams,
  HyperliquidConfig,
  HyperliquidModule,
  MaxBuilderFeeParams,
} from "./types";

const EXCHANGE_URL = {
  mainnet: "https://api.hyperliquid.xyz/exchange",
  testnet: "https://api.hyperliquid-testnet.xyz/exchange",
} as const;

export const createHyperliquidModule = ({ isTestnet }: HyperliquidConfig): HyperliquidModule => {
  const transport = new HttpTransport({ isTestnet });
  const infoClient = new InfoClient({ transport });

  return {
    allMids: () => infoClient.allMids(),

    meta: () => infoClient.meta(),

    maxBuilderFee: (params: MaxBuilderFeeParams) =>
      infoClient.maxBuilderFee({ user: params.user, builder: params.builder }),

    approveBuilderFee: (params: ApproveBuilderFeeParams) => {
      const exchangeClient = new ExchangeClient({
        wallet: params.walletClient,
        transport,
      });

      return exchangeClient.approveBuilderFee({
        maxFeeRate: params.maxFeeRate,
        builder: params.builder,
      });
    },

    approveAgent: async (payload: ApproveAgentPayload) => {
      const url = isTestnet ? EXCHANGE_URL.testnet : EXCHANGE_URL.mainnet;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.status !== "ok") {
        throw new Error(`Hyperliquid error: ${JSON.stringify(result.response || result)}`);
      }

      return result;
    },
  };
};

export type {
  AllMidsResponse,
  ApproveAgentPayload,
  ApproveBuilderFeeParams,
  HyperliquidConfig,
  HyperliquidModule,
  MaxBuilderFeeParams,
  MetaResponse,
} from "./types";
