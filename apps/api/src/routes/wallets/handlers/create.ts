// apps/api/src/routes/wallets/handlers/create.ts
import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { privateKeyToAccount } from "viem/accounts";
import { encrypt } from "../../../lib/crypto";
import { CreateAgentWalletSchema } from "../schemas";

const MAX_AGENTS_PER_USER = 10;

export async function createAgentWallet(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { user, wallet } = request;
  const { agentWallet } = this.schema;

  if (!wallet || wallet.userId !== user.id) {
    return reply.forbidden("Invalid wallet context");
  }

  const body = CreateAgentWalletSchema.parse(request.body);

  try {
    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(agentWallet)
      .where(eq(agentWallet.userId, user.id));

    if (countResult.count >= MAX_AGENTS_PER_USER) {
      this.log.warn(
        { userId: user.id, count: countResult.count },
        "Security: Max agents limit reached",
      );
      return reply.tooManyRequests(`Maximum ${MAX_AGENTS_PER_USER} agents allowed`);
    }

    const account = privateKeyToAccount(body.privateKey as `0x${string}`);

    if (account.address.toLowerCase() !== body.agentAddress) {
      this.log.warn(
        {
          userId: user.id,
          claimed: body.agentAddress,
          derived: account.address,
        },
        "Security: Key-address mismatch",
      );
      return reply.badRequest("Private key does not match agent address");
    }

    const existing = await this.db.query.agentWallet.findFirst({
      where: and(eq(agentWallet.userId, user.id), eq(agentWallet.agentAddress, body.agentAddress)),
    });

    if (existing) {
      return reply.conflict("Agent wallet already exists");
    }

    const encryptedPrivateKey = encrypt(body.privateKey);

    const [created] = await this.db
      .insert(agentWallet)
      .values({
        userId: user.id,
        masterWalletId: wallet.id,
        agentAddress: body.agentAddress,
        encryptedPrivateKey,
        label: body.label,
        isActive: true,
      })
      .returning({
        id: agentWallet.id,
        agentAddress: agentWallet.agentAddress,
        label: agentWallet.label,
        isActive: agentWallet.isActive,
        createdAt: agentWallet.createdAt,
      });

    this.log.info(
      {
        userId: user.id,
        agentId: created.id,
        masterWalletId: wallet.id,
        ip: request.ip,
      },
      "Agent wallet created",
    );

    return reply.code(201).send(created);
  } catch (err) {
    // Never log the error object itself: privateKeyToAccount() above is called with
    // the submitted private key, and viem errors echo their input. Only the error
    // name is safe to record.
    this.log.error(
      { userId: user.id, errorName: (err as Error).name },
      "Failed to create agent wallet",
    );
    return reply.internalServerError("Failed to create wallet");
  }
}
