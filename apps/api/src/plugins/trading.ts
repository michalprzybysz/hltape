// apps/api/src/plugins/trading.ts
import { and, eq } from "drizzle-orm";
import fp from "fastify-plugin";
import { logger } from "../lib/logger";
import type { Order } from "./brain";
import type { ExecutionResult } from "./dispatcher";

export interface TradingEngine {
  startOrder(order: Order): void;
  stopOrder(order: Order): void;
}

declare module "fastify" {
  interface FastifyInstance {
    engine: TradingEngine;
  }
}

export default fp(
  async (fastify) => {
    await fastify.feeder.setBrainPort(fastify.brain.getFeederPort());
    logger.info("[Trading] Feeder -> Brain connected");

    await fastify.dispatcher.setBrainPort(fastify.brain.getDispatcherPort());
    logger.info("[Trading] Brain -> Dispatcher connected");

    await fastify.executor.setDispatcherPort(fastify.dispatcher.getExecutorPort());
    logger.info("[Trading] Dispatcher -> Executor connected");

    /**
     * Cleanup routine for orders that are gone from the exchange.
     * Called when Executor detects orderGone=true (real-time Janitor).
     * Note: DB status update is already done in Executor, this just cleans up memory.
     */
    async function cleanupGoneOrder(orderId: string): Promise<void> {
      try {
        const deadOrder = await fastify.db.query.order.findFirst({
          where: eq(fastify.schema.order.id, orderId),
        });

        // Remove from Brain memory
        fastify.brain.removeOrder(orderId);

        // Cancel in Dispatcher queue
        fastify.dispatcher.cancel(orderId);

        // Unsubscribe from Feeder if we have instrument info
        if (deadOrder?.instrument) {
          fastify.feeder.unsubscribe(deadOrder.instrument);
        }

        logger.info("[Trading] Order cleanup completed", {
          orderId,
          instrument: deadOrder?.instrument,
        });
      } catch (err) {
        logger.error("[Trading] Failed to cleanup gone order", {
          orderId,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }

    fastify.executor.onResult((result: ExecutionResult) => {
      if (result.success) {
        logger.info("[Trading] Order executed successfully", {
          orderId: result.orderId,
          executedPrice: result.executedPrice,
        });
        return;
      }

      // Handle orderGone: Executor acts as real-time Janitor
      if (result.orderGone) {
        logger.warn("[Trading] Order gone from exchange, triggering cleanup", {
          orderId: result.orderId,
          error: result.error,
        });

        // Fire-and-forget cleanup (DB already updated in Executor)
        cleanupGoneOrder(result.orderId);
        return;
      }

      // Regular execution failure (not orderGone)
      logger.error("[Trading] Order execution failed", {
        orderId: result.orderId,
        error: result.error,
      });
    });

    const engine: TradingEngine = {
      startOrder(order) {
        logger.info("[Trading] startOrder", {
          orderId: order.id,
          instrument: order.instrument,
          trailing: order.trailing,
        });
        fastify.brain.addOrder(order);
        fastify.feeder.subscribe(order.instrument);
      },

      stopOrder(order) {
        logger.info("[Trading] stopOrder", {
          orderId: order.id,
          instrument: order.instrument,
        });
        fastify.brain.removeOrder(order.id);
        fastify.dispatcher.cancel(order.id);
        fastify.feeder.unsubscribe(order.instrument);
      },
    };

    fastify.decorate("engine", engine);

    fastify.ready(async () => {
      const orders = await fastify.db.query.order.findMany({
        where: and(
          eq(fastify.schema.order.status, "open"),
          eq(fastify.schema.order.trailing, true),
        ),
      });

      logger.info("[Trading] Restoring active orders", { count: orders.length });

      for (const order of orders) {
        fastify.engine.startOrder(order);
      }
    });
  },
  {
    name: "trading",
    dependencies: ["feeder", "brain", "dispatcher", "executor", "db"],
  },
);
