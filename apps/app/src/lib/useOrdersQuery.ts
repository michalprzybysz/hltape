// apps/app/src/lib/useOrdersQuery.ts
"use client";

import type { CreateOrderInput, Order } from "@hltape/sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const ordersQueryKey = ["orders"] as const;

export const useOrdersQuery = () => {
  const query = useQuery<Order[]>({
    queryKey: ordersQueryKey,
    queryFn: () => api.orders.getAll(),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  return {
    ...query,
    orders: query.data,
  } as const;
};

export const useOrderQuery = (id: Order["id"]) => {
  const client = useQueryClient();
  const queryKey = [...ordersQueryKey, id];
  const query = useQuery({
    queryKey,
    queryFn: () => api.orders.getById(id),
    initialData: () => client.getQueryData<Order[]>(["orders"])?.find((d) => d.id === id),
    initialDataUpdatedAt: () => client.getQueryState(["orders"])?.dataUpdatedAt,
  });

  return {
    ...query,
    order: query.data,
  } as const;
};

export const useOrderMutation = (id: Order["id"]) => {
  const client = useQueryClient();
  const mutationKey = [...ordersQueryKey, id];
  const mutation = useMutation({
    mutationKey: mutationKey,
    mutationFn: (data: Partial<Order>) => api.orders.update(id, data),
    onSuccess: (data) => {
      client.setQueryData(mutationKey, data);
      client.setQueryData<Order[]>(ordersQueryKey, (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((order) => (order.id === data.id ? data : order));
      });
    },
  });

  return mutation;
};

/**
 * Update mutation that takes orderId dynamically (useful for lists)
 */
export const useUpdateOrderMutation = () => {
  const client = useQueryClient();

  return useMutation({
    mutationKey: [...ordersQueryKey, "update"],
    mutationFn: ({ id, data }: { id: string; data: Partial<Order> }) => api.orders.update(id, data),
    onSuccess: (updatedOrder) => {
      client.setQueryData<Order[]>(ordersQueryKey, (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((order) => (order.id === updatedOrder.id ? updatedOrder : order));
      });
    },
  });
};

export const useCreateOrderMutation = () => {
  const client = useQueryClient();

  return useMutation({
    mutationKey: [...ordersQueryKey, "create"],
    mutationFn: (data: CreateOrderInput) => api.orders.create(data),
    onSuccess: (newOrder) => {
      client.setQueryData<Order[]>(ordersQueryKey, (oldData) => {
        if (!oldData) return [newOrder];
        return [newOrder, ...oldData];
      });
    },
  });
};
