// apps/api/src/routes/wallets/handlers/list.ts
import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export async function listAgentWallets(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { user } = request;
  const { agentWallet } = this.schema;

  try {
    const wallets = await this.db
      .select({
        id: agentWallet.id,
        agentAddress: agentWallet.agentAddress,
        label: agentWallet.label,
        isActive: agentWallet.isActive,
        createdAt: agentWallet.createdAt,
      })
      .from(agentWallet)
      .where(eq(agentWallet.userId, user.id));

    return reply.send(wallets);
  } catch (err) {
    this.log.error({ err, userId: user.id }, "Failed to fetch agent wallets");
    return reply.internalServerError("Failed to fetch wallets");
  }
}
