// apps/api/src/routes/log/index.ts
import { and, desc, eq } from "drizzle-orm";
import { createSelectSchema } from "drizzle-zod";
import type { FastifyPluginAsync } from "fastify";
import * as z from "zod";
import { logger } from "../../lib/logger";

const log: FastifyPluginAsync = async (fastify): Promise<void> => {
  const ExecutionLogSelectSchema = z.toJSONSchema(
    createSelectSchema(fastify.schema.executionLog),
  ) as Record<string, unknown>;

  if (
    ExecutionLogSelectSchema.properties &&
    typeof ExecutionLogSelectSchema.properties === "object"
  ) {
    (ExecutionLogSelectSchema.properties as Record<string, unknown>).apiResponse = {};
  }

  const QueryStringSchema = {
    type: "object",
    properties: {
      orderId: { type: "string", format: "uuid" },
      status: {
        type: "string",
        enum: ["success", "failed", "pending"],
      },
      limit: { type: "number", minimum: 1, maximum: 100, default: 50 },
    },
  };

  fastify.addHook("preHandler", fastify.verifySession);

  fastify.get(
    "/",
    {
      schema: {
        querystring: QueryStringSchema,
        response: {
          200: {
            type: "array",
            items: ExecutionLogSelectSchema,
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { executionLog } = fastify.schema;
        const { user } = request;
        const query = request.query as {
          orderId?: string;
          status?: "success" | "failed" | "pending";
          limit?: number;
        };

        let whereCondition: ReturnType<typeof eq> | ReturnType<typeof and>;

        if (query.orderId && query.status) {
          whereCondition = and(
            eq(executionLog.userId, user.id),
            eq(executionLog.orderId, query.orderId),
            eq(executionLog.status, query.status),
          );
        } else if (query.orderId) {
          whereCondition = and(
            eq(executionLog.userId, user.id),
            eq(executionLog.orderId, query.orderId),
          );
        } else if (query.status) {
          whereCondition = and(
            eq(executionLog.userId, user.id),
            eq(executionLog.status, query.status),
          );
        } else {
          whereCondition = eq(executionLog.userId, user.id);
        }

        const logs = await fastify.db.query.executionLog.findMany({
          where: whereCondition,
          orderBy: desc(executionLog.createdAt),
          limit: query.limit || 50,
        });

        return reply.code(200).send(logs);
      } catch (err) {
        logger.error("Failed to fetch execution logs", { err: String(err) });
        return reply.internalServerError();
      }
    },
  );

  fastify.get(
    "/:id",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
          },
          required: ["id"],
        },
        response: {
          200: ExecutionLogSelectSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { executionLog } = fastify.schema;
        const { user } = request;
        const { id } = request.params as { id: string };

        const log = await fastify.db.query.executionLog.findFirst({
          where: and(eq(executionLog.userId, user.id), eq(executionLog.id, id)),
        });

        if (!log) {
          return reply.notFound("Execution log not found");
        }

        return reply.code(200).send(log);
      } catch (err) {
        logger.error("Failed to get execution log", { err: String(err) });
        return reply.internalServerError();
      }
    },
  );
};

export default log;
