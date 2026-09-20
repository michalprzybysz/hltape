// apps/api/src/routes/orders/handlers/updateOrder.ts
import { Decimal } from "decimal.js";
import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";

interface UpdateOrderParams {
  id: string;
}

interface UpdateOrderBody {
  triggerPrice?: string | number;
  size?: string | number;
  leverage?: string | number;
  trailingDistance?: string | number;
  [key: string]: unknown;
}

export async function updateOrder(
  request: FastifyRequest<{ Params: UpdateOrderParams; Body: UpdateOrderBody }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { user } = request;
    const { order } = request.server.schema;
    const { id } = request.params;
    const updateData = request.body;

    const existingOrder = await request.server.db.query.order.findFirst({
      where: and(eq(order.userId, user.id), eq(order.id, id), eq(order.status, "open")),
    });

    if (!existingOrder) {
      return reply.notFound("Order not found or already closed");
    }

    const changed: Record<string, Decimal> = {};

    if (updateData.triggerPrice) {
      changed.triggerPrice = new Decimal(String(updateData.triggerPrice));
    }
    if (updateData.size) {
      changed.size = new Decimal(String(updateData.size));
    }
    if (updateData.leverage) {
      changed.leverage = new Decimal(String(updateData.leverage));
    }
    if (updateData.trailingDistance) {
      changed.trailingDistance = new Decimal(String(updateData.trailingDistance));
    }

    const updatedOrders = await request.server.db
      .update(order)
      .set(changed)
      .where(and(eq(order.id, id), eq(order.userId, user.id)))
      .returning();

    const updatedOrder = updatedOrders[0];

    if (updatedOrder?.trailing) {
      request.server.engine.stopOrder(updatedOrder);
      request.server.engine.startOrder(updatedOrder);
    } else {
      request.server.engine.stopOrder(updatedOrder);
    }

    return reply.code(200).send(updatedOrder);
  } catch (err) {
    request.server.log.error({ err }, "Failed to patch order");
    return reply.internalServerError();
  }
}
