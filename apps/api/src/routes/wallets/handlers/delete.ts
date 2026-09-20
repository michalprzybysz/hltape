// apps/api/src/routes/wallets/handlers/delete.ts
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AgentWalletParams } from "../schemas";

export async function deleteAgentWallet(
  this: FastifyInstance,
  request: FastifyRequest<{ Params: AgentWalletParams }>,
  reply: FastifyReply,
) {
  const { user, wallet } = request;
  const { id } = request.params;
  const { agentWallet } = this.schema;

  if (!wallet || wallet.userId !== user.id) {
    return reply.forbidden("Invalid wallet context");
  }

  try {
    const result = await this.db
      .delete(agentWallet)
      .where(and(eq(agentWallet.id, id), eq(agentWallet.userId, user.id)))
      .returning({
        id: agentWallet.id,
        agentAddress: agentWallet.agentAddress,
      });

    if (result.length === 0) {
      return reply.notFound("Agent wallet not found");
    }

    this.log.info(
      {
        userId: user.id,
        agentId: id,
        agentAddress: result[0].agentAddress,
        ip: request.ip,
      },
      "Agent wallet deleted",
    );

    return reply.code(204).send();
  } catch (err) {
    this.log.error(
      { userId: user.id, agentId: id, errorName: (err as Error).name },
      "Failed to delete agent wallet",
    );
    return reply.internalServerError("Failed to delete wallet");
  }
}
