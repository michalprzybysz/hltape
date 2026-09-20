// apps/api/src/plugins/drizzle.ts
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { db, pool, schema } from "../db/index";
import { logger } from "../lib/logger";

declare module "fastify" {
  interface FastifyInstance {
    db: typeof db;
    schema: typeof schema;
  }
}

export default fp(
  async function drizzlePlugin(fastify: FastifyInstance) {
    fastify.decorate("db", db);
    fastify.decorate("schema", schema);
    fastify.addHook("onClose", async () => {
      await pool.end();
      logger.info("Database pool has been closed.");
    });
  },
  { name: "db", dependencies: ["logger"] },
);
