// apps/api/src/plugins/brain.ts

import { MessageChannel, type MessagePort } from "node:worker_threads";
import type { InferSelectModel } from "drizzle-orm";
import fp from "fastify-plugin";
import { spawn, Thread, Transfer, Worker } from "threads";
import type { order } from "../db/schema";
import { logger } from "../lib/logger";

export type Order = InferSelectModel<typeof order>;

export interface BrainPlugin {
  addOrder(order: Order): Promise<void>;
  removeOrder(orderId: Order["id"]): void;
  getFeederPort(): MessagePort;
  getDispatcherPort(): MessagePort;
}

declare module "fastify" {
  interface FastifyInstance {
    brain: BrainPlugin;
    brainLoggerPort?: MessagePort;
  }
}

export default fp(
  async (fastify) => {
    logger.info("[Brain] Spawning worker...");

    const brainWorker = await spawn(new Worker("../lib/brain/worker"));

    const feederChannel = new MessageChannel();
    const dispatcherChannel = new MessageChannel();

    await brainWorker.setPorts(Transfer(feederChannel.port1), Transfer(dispatcherChannel.port1));

    if (fastify.brainLoggerPort) {
      await brainWorker.setLoggerPort(Transfer(fastify.brainLoggerPort));
    }

    logger.info("[Brain] Worker initialized with direct communication channels");

    const brain: BrainPlugin = {
      async addOrder(order: Order) {
        await brainWorker.addOrder({
          ...order,
          size: order.size.toString(),
          triggerPrice: order.triggerPrice.toString(),
          initialTriggerPrice: order.initialTriggerPrice.toString(),
          trailingDistance: order.trailingDistance?.toString(),
          leverage: order.leverage?.toString(),
        });
      },

      removeOrder(orderId) {
        brainWorker.removeOrder(orderId).catch((err) => {
          logger.error("[Brain] Failed to remove order", { orderId, err: String(err) });
        });
      },

      getFeederPort() {
        return feederChannel.port2;
      },

      getDispatcherPort() {
        return dispatcherChannel.port2;
      },
    };

    fastify.decorate("brain", brain);

    fastify.addHook("onClose", async () => {
      logger.info("[Brain] Terminating worker...");
      feederChannel.port2.close();
      dispatcherChannel.port2.close();
      await Thread.terminate(brainWorker);
    });
  },
  { name: "brain", dependencies: ["logger"] },
);
