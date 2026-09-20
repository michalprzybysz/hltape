// packages/sdk/src/logs/types.ts
export type ExecutionStatus = "success" | "failed" | "pending";

export interface ExecutionLog {
  id: string;
  orderId: string;
  userId: string;
  assetIndex: number | null;
  instrument: string | null;
  hlOrderId: string;
  oldHlOrderId: string | null;
  newHlOrderId: string | null;
  oldTriggerPrice: string | null;
  newTriggerPrice: string;
  status: ExecutionStatus;
  errorMessage: string | null;
  apiResponse: Record<string, unknown> | null;
  executionTimeMs: number | null;
  createdAt: string;
}

export interface GetLogsParams {
  orderId?: string;
  status?: ExecutionStatus;
  limit?: number;
}
