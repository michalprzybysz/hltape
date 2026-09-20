// apps/api/src/routes/orders/handlers/getAllOrders.ts
import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";

export async function getAllOrders(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { order } = request.server.schema;
  const { user } = request;

  try {
    const orders = await request.server.db.query.order.findMany({
      where: eq(order.userId, user.id),
      orderBy: (order, { desc }) => [desc(order.createdAt)],
    });

    return reply.code(200).send(orders);
  } catch (err) {
    request.server.log.error({ err }, "Failed to fetch orders");
    return reply.internalServerError();
  }
}
