// apps/api/src/plugins/auth.ts
import fastifyAuth from "@fastify/auth";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { auth } from "../lib/auth";
import { logger } from "../lib/logger";

declare module "fastify" {
  interface FastifyInstance {
    verifySession(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    verifyAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
  interface FastifyRequest {
    user: { id: string; role?: string | null };
    wallet: {
      id: string;
      address: string;
      userId: string;
      isPrimary: boolean | null;
    };
  }
}

export default fp(
  async function authPlugin(fastify: FastifyInstance) {
    fastify.register(fastifyAuth);

    fastify.decorate("verifySession", async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await auth.api.getSession({
        headers: request.headers as Record<string, string>,
      });

      if (!session) {
        return reply.unauthorized();
      }

      const { user } = session;
      const { user: userTable, walletAddress } = fastify.schema;

      const [dbUser, wallet] = await Promise.all([
        fastify.db.query.user.findFirst({
          where: eq(userTable.id, user.id),
          columns: { role: true, banned: true, banExpires: true },
        }),
        fastify.db.query.walletAddress.findFirst({
          where: and(eq(walletAddress.userId, user.id), eq(walletAddress.isPrimary, true)),
        }),
      ]);

      if (dbUser?.banned) {
        if (dbUser.banExpires && new Date(dbUser.banExpires) < new Date()) {
          fastify.db
            .update(userTable)
            .set({ banned: false, banReason: null, banExpires: null })
            .where(eq(userTable.id, user.id))
            .catch((err) => logger.error("Failed to auto-unban user", { err: String(err) }));
        } else {
          return reply.forbidden("Your account has been banned");
        }
      }

      request.user = { ...user, role: dbUser?.role };

      if (!wallet) {
        logger.warn("No primary wallet found for user", { userId: user.id });
        return reply.notFound("Wallet not found");
      }
      request.wallet = wallet;
    });

    fastify.decorate("verifyAdmin", async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.user) {
        return reply.unauthorized();
      }
      if (request.user.role !== "admin") {
        return reply.forbidden("Admin access required");
      }
    });
  },
  { name: "auth-plugin", dependencies: ["logger"] },
);
