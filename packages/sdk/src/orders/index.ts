// packages/sdk/src/orders/index.ts
import type { HttpRequester } from "../httpClient";
import type { CreateOrderInput, Order } from "./types";

const DEFAULT_RESOURCE_PATH = "orders" as const;

export interface OrdersModuleOptions {
  resourcePath?: string;
}

export interface OrdersModule {
  getAll: () => Promise<Order[]>;
  getById: (id: string) => Promise<Order>;
  create: (data: CreateOrderInput) => Promise<Order>;
  update: (id: string, data: Partial<Order>) => Promise<Order>;
}

export const createOrdersModule = (
  request: HttpRequester,
  options: OrdersModuleOptions = {},
): OrdersModule => {
  const { resourcePath = DEFAULT_RESOURCE_PATH } = options;

  return {
    getAll: () => request().get(resourcePath).json<Order[]>(),
    getById: (id: string) => request().get(`${resourcePath}/${id}`).json<Order>(),
    create: (data: CreateOrderInput) => request().post(resourcePath, { json: data }).json<Order>(),
    update: (id: string, data: Partial<Order>) =>
      request().patch(`${resourcePath}/${id}`, { json: data }).json<Order>(),
  };
};

export type { CreateOrderInput, Order } from "./types";
