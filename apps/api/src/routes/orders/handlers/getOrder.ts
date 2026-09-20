// apps/api/src/routes/orders/handlers/getOrder.ts
import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";

interface GetOrderParams {
  id: string;
}

export async function getOrder(
  request: FastifyRequest<{ Params: GetOrderParams }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { order } = request.server.schema;
    const { user } = request;
    const { id } = request.params;

    const existingOrder = await request.server.db.query.order.findFirst({
      where: and(eq(order.userId, user.id), eq(order.id, id)),
    });

    if (!existingOrder) {
      return reply.notFound("Order not found");
    }

    return reply.code(200).send(existingOrder);
  } catch (err) {
    request.server.log.error({ err }, "Failed to get order");
    return reply.internalServerError();
  }
}
