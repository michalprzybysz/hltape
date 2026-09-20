// apps/api/src/plugins/feeder.ts

import type { MessagePort } from "node:worker_threads";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { spawn, Thread, Transfer, Worker } from "threads";
import { logger } from "../lib/logger";

export interface FeederPlugin {
  subscribe(symbol: string): Promise<void>;
  unsubscribe(symbol: string): Promise<void>;
  getActiveSymbols(): Promise<string[]>;
  setBrainPort(port: MessagePort): Promise<void>;
}

declare module "fastify" {
  interface FastifyInstance {
    feeder: FeederPlugin;
    feederLoggerPort?: MessagePort;
  }
}

const feederPlugin: FastifyPluginAsync = async (fastify) => {
  logger.info("[Feeder] Spawning worker...");

  const feederWorker = await spawn(new Worker("../lib/feeder/worker"));

  if (fastify.feederLoggerPort) {
    await feederWorker.setLoggerPort(Transfer(fastify.feederLoggerPort));
  }

  logger.info("[Feeder] Worker spawned successfully");

  const feeder: FeederPlugin = {
    async subscribe(symbol: string) {
      await feederWorker.subscribe(symbol);
    },

    async unsubscribe(symbol: string) {
      await feederWorker.unsubscribe(symbol);
    },

    async getActiveSymbols() {
      return feederWorker.getActiveSymbols();
    },

    async setBrainPort(port: MessagePort) {
      await feederWorker.setBrainPort(Transfer(port));
    },
  };

  fastify.decorate("feeder", feeder);

  fastify.addHook("onClose", async () => {
    logger.info("[Feeder] Shutting down worker...");
    await feederWorker.shutdown();
    await Thread.terminate(feederWorker);
  });
};

export default fp(feederPlugin, { name: "feeder", dependencies: ["logger"] });
