// apps/api/src/lib/types.ts
import type { Decimal } from "decimal.js";

export type Side = "long" | "short";

export type WalletAddress = `0x${string}`;

export interface BaseOrder {
  id: string;
  userId: string;
  instrument: string;
  side: Side;
  assetIndex: number;
}

export type SmallOrder = BaseOrder & {
  size: string;
};

export type ActiveOrder = BaseOrder & {
  size: Decimal;
  triggerPrice: Decimal;
  trailingDistance: Decimal | null;
  leverage: Decimal;
};

export type SerializedOrder = BaseOrder & {
  size: string;
  triggerPrice: string;
  trailingDistance?: string | null;
  leverage?: string | number | null;
};

export type ZombieOrder = Pick<BaseOrder, "id" | "userId">;

export type ExecutionDecision = SmallOrder & {
  triggerPrice: string;
  priorityScore: number;
};

export interface PriceUpdateMessage {
  type: "price";
  symbol: string;
  price: string;
  volatility: string;
}

export interface DecisionMessage {
  type: "decision";
  data: ExecutionDecision;
}

export interface ExecutionTask {
  id: string;
  order: SmallOrder;
  triggerPrice: string;
  priority: number;
  createdAt: number;
  _effectivePriority: number;
}

export interface SubscriptionHandle {
  unsubscribe: () => Promise<void>;
  failureSignal: AbortSignal;
}

export interface ModifyResult {
  success: boolean;
  error?: string;
  orderGone?: boolean;
}

export interface PlaceOrderParams {
  requestId: string;
  userId: string;
  orderId: string;
  assetIndex: number;
  isBuy: boolean;
  triggerPrice: string;
  size: string;
}

export interface PlaceOrderResult {
  requestId: string;
  success: boolean;
  error?: string;
}

export interface HotAgent {
  masterWalletAddress: string;
  agentAddress: string;
  account: { address: string; privateKey: string };
  lastUsed: number;
}

export interface ColdAgent {
  masterWalletAddress: string;
  agentAddress: string;
  encryptedPrivateKey: string;
}

export interface ExecuteMessage {
  type: "execute";
  data: {
    orderId: string;
    order: SmallOrder;
    triggerPrice: string;
  };
}

export interface PlaceOrderMessage {
  type: "placeOrder";
  data: PlaceOrderParams;
}

export interface ExecutionResult {
  success: boolean;
  orderId: string;
  executedPrice?: string;
  error?: string;
  executionTimeMs: number;
  timestamp: number;
  orderGone?: boolean;
}

export type ExecutionCallback = (result: ExecutionResult) => void;

export interface ExecutorStats {
  coldAgents: number;
  hotAgents: number;
  processingOrders: number;
}

export interface ReferralResponse {
  referredBy?: string | null;
}

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface LogMessage {
  type: "log";
  source: string;
  level: string;
  message: string;
  timestamp: number;
  context?: object;
}

export interface MetricMessage {
  type: "metric";
  source: string;
  name: string;
  value: number;
  timestamp: number;
  tags?: object;
}

export interface WorkerLoggerOptions {
  name: string;
  debugEnabled?: boolean;
}
