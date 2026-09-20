// packages/sdk/src/positions/types.ts
export const SIDES = {
  LONG: "long",
  SHORT: "short",
} as const;

export type Side = (typeof SIDES)[keyof typeof SIDES];

export type Leverage =
  | { type: "isolated"; value: number; rawUsd: string }
  | { type: "cross"; value: number };

export type Position = {
  coin: string;
  szi: string;
  entryPx: string;
  positionValue: string;
  unrealizedPnl: string;
  returnOnEquity: string;
  liquidationPx: string | null;
  marginUsed: string;
  maxLeverage: number;
  leverage: Leverage;
};

export type AccountSummary = {
  accountValue: string;
  totalNtlPos: string;
  totalRawUsd: string;
  totalMarginUsed: string;
};

export type PositionsResponse = {
  marginSummary: AccountSummary;
  crossMarginSummary: AccountSummary;
  crossMaintenanceMarginUsed: string;
  withdrawable: string;
  positions: Position[];
  time: number;
};

export type MarginMode = "cross" | "isolated";

export type OpenPositionRequest = {
  coin: string;
  side: Side;
  sizeUsd: number;
  leverage?: number;
  marginMode?: MarginMode;
  trailingSL?: {
    distance: number;
  };
};

export type OpenPositionResponse = {
  status: "ok";
  response: unknown;
};
