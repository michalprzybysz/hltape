// apps/api/src/routes/orders/handlers/getOrderLogs.ts
import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";

interface GetOrderLogsParams {
  id: string;
}

export async function getOrderLogs(
  request: FastifyRequest<{ Params: GetOrderLogsParams }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { executionLog } = request.server.schema;
    const { user } = request;
    const { id } = request.params;

    const logs = await request.server.db.query.executionLog.findMany({
      where: and(eq(executionLog.userId, user.id), eq(executionLog.id, id)),
    });

    if (logs.length === 0) {
      return reply.notFound("Order not found");
    }

    return reply.code(200).send(logs);
  } catch (err) {
    request.server.log.error({ err }, "Failed to get order logs");
    return reply.internalServerError();
  }
}
