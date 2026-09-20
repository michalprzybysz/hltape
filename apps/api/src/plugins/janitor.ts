// apps/api/src/plugins/janitor.ts

import fp from "fastify-plugin";
import { spawn, Thread, Transfer, Worker } from "threads";
import { logger } from "../lib/logger";

export interface JanitorPlugin {
  runCleanup(): Promise<{ checked: number; closed: number }>;

  getInterval(): number;
}

declare module "fastify" {
  interface FastifyInstance {
    janitor: JanitorPlugin;
  }
}

export interface JanitorPluginOptions {
  interval?: number;
}

export default fp(
  async (fastify, options: JanitorPluginOptions) => {
    const interval = options.interval || 30_000;

    logger.info("[Janitor] Spawning worker...");

    const janitorWorker = await spawn(new Worker("../lib/janitor/worker"));

    if (fastify.janitorLoggerPort) {
      await janitorWorker.setLoggerPort(Transfer(fastify.janitorLoggerPort));
    }

    logger.info("[Janitor] Worker spawned successfully");

    janitorWorker.events().subscribe(async (notification) => {
      const { orderId, userId } = notification;

      logger.info("[Janitor] 🧟‍♂️ Zombie order detected", {
        orderId,
        userId,
      });

      if (fastify.brain) {
        try {
          fastify.brain.removeOrder(orderId);
          logger.debug("[Janitor] Removed order from Brain", {
            orderId,
          });
        } catch (err) {
          logger.error("[Janitor] Error removing order from Brain", {
            orderId,
            err: String(err),
          });
        }
      }

      if (fastify.dispatcher) {
        try {
          const removed = await fastify.dispatcher.cancel(orderId);
          if (removed) {
            logger.debug("[Janitor] Cancelled order in Dispatcher", {
              orderId,
            });
          }
        } catch (err) {
          logger.error("[Janitor] Error cancelling order in Dispatcher", {
            orderId,
            err: String(err),
          });
        }
      }
    });

    const cleanupInterval = setInterval(() => {
      janitorWorker
        .runCleanup()
        .then((result) => {
          if (result.closed > 0) {
            logger.info("[Janitor] Cleanup cycle stats", {
              checked: result.checked,
              closed: result.closed,
            });
          } else {
            logger.debug("[Janitor] Cleanup cycle completed", {
              checked: result.checked,
              closed: result.closed,
            });
          }
        })
        .catch((err) => {
          logger.error("[Janitor] Cleanup cycle failed", { err: String(err) });
        });
    }, interval);

    setTimeout(() => {
      janitorWorker.runCleanup().catch((err) => {
        logger.error("[Janitor] Initial cleanup failed", { err: String(err) });
      });
    }, 5000);

    const janitor: JanitorPlugin = {
      async runCleanup() {
        return janitorWorker.runCleanup();
      },

      getInterval() {
        return interval;
      },
    };

    fastify.decorate("janitor", janitor);

    fastify.addHook("onClose", async () => {
      logger.info("[Janitor] Shutting down...");
      clearInterval(cleanupInterval);
      await Thread.terminate(janitorWorker);
      logger.info("[Janitor] Shutdown complete");
    });
  },
  {
    name: "janitor",
    dependencies: ["brain", "dispatcher", "logger"],
  },
);
