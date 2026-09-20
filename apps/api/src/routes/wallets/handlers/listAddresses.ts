// apps/api/src/routes/wallets/handlers/listAddresses.ts
import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export async function listWalletAddresses(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { user } = request;
  const { walletAddress } = this.schema;

  try {
    const wallets = await this.db
      .select({
        id: walletAddress.id,
        address: walletAddress.address,
        chainId: walletAddress.chainId,
        isPrimary: walletAddress.isPrimary,
        createdAt: walletAddress.createdAt,
      })
      .from(walletAddress)
      .where(eq(walletAddress.userId, user.id));

    return reply.send(wallets);
  } catch (err) {
    this.log.error({ err, userId: user.id }, "Failed to fetch wallet addresses");
    return reply.internalServerError("Failed to fetch wallets");
  }
}
