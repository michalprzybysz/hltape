// apps/api/src/plugins/logger.ts

import type { MessagePort } from "node:worker_threads";
import fp from "fastify-plugin";
import { initLogger, logger, shutdownLogger, workerPorts } from "../lib/logger";

declare module "fastify" {
  interface FastifyInstance {
    brainLoggerPort?: MessagePort;
    feederLoggerPort?: MessagePort;
    dispatcherLoggerPort?: MessagePort;
    executorLoggerPort?: MessagePort;
    janitorLoggerPort?: MessagePort;
  }
}

export default fp(
  async (fastify) => {
    logger.info("[Logger] Initializing telemetry system...");

    await initLogger();

    // Decorate with worker ports for other plugins
    fastify.decorate("brainLoggerPort", workerPorts.brain);
    fastify.decorate("feederLoggerPort", workerPorts.feeder);
    fastify.decorate("dispatcherLoggerPort", workerPorts.dispatcher);
    fastify.decorate("executorLoggerPort", workerPorts.executor);
    fastify.decorate("janitorLoggerPort", workerPorts.janitor);

    logger.info("[Logger] Telemetry system ready with all worker channels");

    fastify.addHook("onClose", async () => {
      logger.info("[Logger] Shutting down telemetry...");
      await shutdownLogger();
    });
  },
  { name: "logger" },
);
