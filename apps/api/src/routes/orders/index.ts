// apps/api/src/routes/orders/index.ts
import { createSelectSchema } from "drizzle-zod";
import type { FastifyPluginAsync } from "fastify";
import * as z from "zod";
import { createOrder, getAllOrders, getOrder, getOrderLogs, updateOrder } from "./handlers";
import { CreateOrderJSONSchema, UpdateOrderJSONSchema } from "./schemas";

const orders: FastifyPluginAsync = async (fastify): Promise<void> => {
  const OrderSelectSchema = z.toJSONSchema(createSelectSchema(fastify.schema.order)) as Record<
    string,
    unknown
  >;

  if (OrderSelectSchema.properties && typeof OrderSelectSchema.properties === "object") {
    delete (OrderSelectSchema.properties as Record<string, unknown>).raw;
  }

  fastify.addHook("preHandler", fastify.verifySession);

  fastify.post(
    "/",
    {
      config: {
        rateLimit: { max: 10, timeWindow: "1 minute" },
      },
      schema: {
        body: CreateOrderJSONSchema,
        response: {
          201: OrderSelectSchema,
        },
      },
    },
    createOrder,
  );

  fastify.get(
    "/:id",
    {
      schema: {
        response: {
          200: OrderSelectSchema,
        },
      },
    },
    getOrder,
  );
  fastify.get(
    "/",
    {
      schema: {
        response: {
          200: {
            type: "array",
            items: OrderSelectSchema,
          },
        },
      },
    },
    getAllOrders,
  );
  fastify.patch(
    "/:id",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
      schema: {
        body: UpdateOrderJSONSchema,
        response: {
          200: OrderSelectSchema,
        },
      },
    },
    updateOrder,
  );
  fastify.get(
    "/:id/log",
    {
      schema: {
        response: {
          200: OrderSelectSchema,
        },
      },
    },
    getOrderLogs,
  );
};

export default orders;
