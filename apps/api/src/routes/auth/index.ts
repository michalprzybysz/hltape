// apps/api/src/routes/auth/index.ts
import type { FastifyPluginAsync } from "fastify";
import { auth } from "../../lib/auth";
import { logger } from "../../lib/logger";

const authRoutes: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.all("/*", async (request, reply) => {
    logger.debug("Auth request", { method: request.method, url: request.url });
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) headers.append(key, value.toString());
      });
      const req = new Request(url.toString(), {
        method: request.method,
        headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
      });
      const response = await auth.handler(req);

      reply.status(response.status);
      response.headers.forEach((value, key) => {
        reply.header(key, value);
      });
      reply.send(response.body ? await response.text() : null);
    } catch (error) {
      logger.error("Authentication Error", { error: String(error) });
      reply.status(500).send({
        error: "Internal authentication error",
        code: "AUTH_FAILURE",
      });
    }
  });
};

export default authRoutes;
