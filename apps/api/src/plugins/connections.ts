// apps/api/src/plugins/connections.ts

import type { FastifyPluginAsync, FastifyReply } from "fastify";
import fp from "fastify-plugin";

type SSEConnection = FastifyReply["sse"];

export interface SSEManager {
  add(userId: string, conn: SSEConnection): void;
  remove(userId: string, conn: SSEConnection): void;
  sendToUser(userId: string, event: string, data: unknown): Promise<boolean>;
  broadcast(event: string, data: unknown): Promise<void>;
  hasUser(userId: string): boolean;
}

declare module "fastify" {
  interface FastifyInstance {
    sseManager: SSEManager;
  }
}

const sseManagerPlugin: FastifyPluginAsync = fp(async (fastify) => {
  const clients = new Map<string, Set<SSEConnection>>();

  const manager: SSEManager = {
    add(userId, conn) {
      let set = clients.get(userId);
      if (!set) {
        set = new Set();
        clients.set(userId, set);
      }
      set.add(conn);
    },

    remove(userId, conn) {
      const set = clients.get(userId);
      if (!set) return;
      set.delete(conn);
      if (set.size === 0) {
        clients.delete(userId);
      }
    },

    hasUser(userId) {
      const set = clients.get(userId);
      return !!set && set.size > 0;
    },

    async sendToUser(userId, event, data) {
      const set = clients.get(userId);
      if (!set || set.size === 0) return false;

      for (const conn of set) {
        try {
          await conn.send({ event, data });
        } catch {}
      }
      return true;
    },

    async broadcast(event, data) {
      const entries = [...clients.entries()];
      for (const [, set] of entries) {
        for (const conn of set) {
          try {
            await conn.send({ event, data });
          } catch {}
        }
      }
    },
  };

  fastify.decorate("sseManager", manager);
});

export default sseManagerPlugin;
