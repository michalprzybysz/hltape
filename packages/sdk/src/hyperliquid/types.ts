// packages/sdk/src/hyperliquid/types.ts
import type { AllMidsResponse, MetaResponse } from "@nktkas/hyperliquid";
import type { AbstractWallet } from "@nktkas/hyperliquid/signing";

export type { AllMidsResponse, MetaResponse };

export interface HyperliquidConfig {
  isTestnet: boolean;
}

export interface MaxBuilderFeeParams {
  user: string;
  builder: string;
}

export interface ApproveBuilderFeeParams {
  walletClient: AbstractWallet;
  builder: string;
  maxFeeRate: string;
}

export interface ApproveAgentPayload {
  action: {
    type: "approveAgent";
    hyperliquidChain: "Testnet" | "Mainnet";
    signatureChainId: string;
    agentAddress: string;
    agentName: string;
    nonce: number;
  };
  nonce: number;
  signature: { r: string; s: string; v: number };
}

export interface HyperliquidModule {
  allMids: () => Promise<AllMidsResponse>;
  meta: () => Promise<MetaResponse>;
  maxBuilderFee: (params: MaxBuilderFeeParams) => Promise<number>;
  approveBuilderFee: (params: ApproveBuilderFeeParams) => Promise<unknown>;
  approveAgent: (payload: ApproveAgentPayload) => Promise<unknown>;
}
