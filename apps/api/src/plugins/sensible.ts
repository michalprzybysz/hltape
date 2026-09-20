// apps/api/src/plugins/sensible.ts

import sensible, { type FastifySensibleOptions } from "@fastify/sensible";
import fp from "fastify-plugin";

/**
 * This plugins adds some utilities to handle http errors
 *
 * @see https://github.com/fastify/fastify-sensible
 */
export default fp<FastifySensibleOptions>(async (fastify) => {
  fastify.register(sensible);

  fastify.setErrorHandler((error, request, reply) => {
    // Fastify's FastifyError does not declare `details`, and plugins such as
    // @fastify/sensible attach it. Narrow once instead of casting three times.
    const err = error as Error & { statusCode?: number; details?: unknown };
    const status = err.statusCode ?? 500;

    const STATUS_CODE_MAP = {
      400: "BAD_REQUEST",
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      409: "CONFLICT",
      422: "UNPROCESSABLE_ENTITY",
      429: "RATE_LIMITED",
      500: "INTERNAL_ERROR",
    } as const;

    const DEFAULT_MESSAGES: Record<string, string> = {
      BAD_REQUEST: "Bad request.",
      UNAUTHORIZED: "Authentication required.",
      FORBIDDEN: "You are not allowed to perform this action.",
      NOT_FOUND: "Resource not found.",
      CONFLICT: "Request conflicts with current state.",
      UNPROCESSABLE_ENTITY: "Request data is invalid.",
      RATE_LIMITED: "Too many requests. Try again later.",
      INTERNAL_ERROR: "Internal server error.",
    };

    const GENERIC_FASTIFY_MESSAGES = new Set([
      "Bad Request",
      "Unauthorized",
      "Forbidden",
      "Not Found",
      "Too Many Requests",
      "Internal Server Error",
    ]);

    const code = STATUS_CODE_MAP[status as keyof typeof STATUS_CODE_MAP] ?? "INTERNAL_ERROR";

    const rawMessage = err.message;
    const hasCustomMessage = rawMessage && !GENERIC_FASTIFY_MESSAGES.has(rawMessage.trim());

    const defaultMessage = DEFAULT_MESSAGES[code] ?? "Unexpected error.";

    const message = hasCustomMessage ? rawMessage : defaultMessage;

    reply.status(status).send({
      status,
      code,
      message,
      requestId: request.id,
      details: err.details ?? null,
    });
  });
});
