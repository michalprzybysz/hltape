// apps/api/src/plugins/dispatcher.ts

import { MessageChannel, type MessagePort } from "node:worker_threads";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { spawn, Thread, Transfer, Worker } from "threads";
import { logger } from "../lib/logger";
import type { ExecutionResult } from "../lib/types";

export type { ExecutionResult };

export interface DispatcherPlugin {
  cancel(orderId: string): Promise<boolean>;
  getStats(): Promise<{
    queueSize: number;
    pendingRequests: number;
    rateLimitUsage: { current: number; max: number; percentage: number };
    oldestTaskAge: number | null;
  }>;
  setBrainPort(port: MessagePort): Promise<void>;
  getExecutorPort(): MessagePort;
}

declare module "fastify" {
  interface FastifyInstance {
    dispatcher: DispatcherPlugin;
    dispatcherLoggerPort?: MessagePort;
  }
}

const dispatcherPlugin: FastifyPluginAsync = async (fastify) => {
  logger.info("[Dispatcher] Spawning worker...");

  const dispatcherWorker = await spawn(new Worker("../lib/dispatcher/worker"));

  const executorChannel = new MessageChannel();

  if (fastify.dispatcherLoggerPort) {
    await dispatcherWorker.setLoggerPort(Transfer(fastify.dispatcherLoggerPort));
  }

  logger.info("[Dispatcher] Worker spawned successfully");

  const dispatcher: DispatcherPlugin = {
    async cancel(orderId: string) {
      return dispatcherWorker.cancel(orderId);
    },

    async getStats() {
      return dispatcherWorker.getStats();
    },

    async setBrainPort(port: MessagePort) {
      await dispatcherWorker.setPorts(Transfer(port), Transfer(executorChannel.port1));
    },

    getExecutorPort() {
      return executorChannel.port2;
    },
  };

  fastify.decorate("dispatcher", dispatcher);

  fastify.addHook("onClose", async () => {
    logger.info("[Dispatcher] Shutting down worker...");
    executorChannel.port2.close();
    await dispatcherWorker.shutdown();
    await Thread.terminate(dispatcherWorker);
  });
};

export default fp(dispatcherPlugin, {
  name: "dispatcher",
  dependencies: ["logger"],
});
