// packages/sdk/src/orders/types.ts
export interface Order {
  id: string;
  hlOrderId: string;
  userId: string;
  instrument: string;
  assetIndex: number;
  side: "long" | "short";
  triggerPrice: string | null;
  initialTriggerPrice: string | null;
  size: string | null;
  status: string;
  trailing: boolean;
  trailingDistance: string | null;
  leverage: string | null;
  createdAt: string;
  updatedAt: string;
  raw: Record<string, unknown> | null;
}

export interface CreateOrderInput {
  instrument: string;
  side: "long" | "short";
  size: string;
  triggerPrice: string;
  leverage: number;
  trailingDistance?: string;
}
