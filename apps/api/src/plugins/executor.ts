// apps/api/src/plugins/executor.ts
import { randomUUID } from "node:crypto";
import { MessageChannel, type MessagePort } from "node:worker_threads";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { spawn, Thread, Transfer, Worker } from "threads";
import { logger } from "../lib/logger";
import type { ExecutionResult } from "../lib/types";

export interface ExecutorPlugin {
  placeOrder(params: {
    userId: string;
    orderId: string;
    assetIndex: number;
    isBuy: boolean;
    triggerPrice: string;
    size: string;
  }): Promise<{ success: boolean; error?: string }>;
  refreshAgent(userId: string): Promise<void>;
  invalidateAgent(userId: string): void;
  getStats(): Promise<{
    coldAgents: number;
    hotAgents: number;
    processingOrders: number;
  }>;
  setDispatcherPort(port: MessagePort): Promise<void>;
  onResult(callback: (result: ExecutionResult) => void): void;
}

declare module "fastify" {
  interface FastifyInstance {
    executor: ExecutorPlugin;
    executorLoggerPort?: MessagePort;
  }
}

interface PlaceOrderResult {
  type: "placeOrderResult";
  data: {
    requestId: string;
    success: boolean;
    error?: string;
  };
}

interface ExecutionResultMessage {
  type: "executionResult";
  data: ExecutionResult;
}

const executorPlugin: FastifyPluginAsync = async (fastify) => {
  logger.info("[Executor] Spawning worker...");

  const executorWorker = await spawn(new Worker("../lib/executor/worker"));

  const mainChannel = new MessageChannel();

  await executorWorker.initialize();

  if (fastify.executorLoggerPort) {
    await executorWorker.setLoggerPort(Transfer(fastify.executorLoggerPort));
  }

  logger.info("[Executor] Worker spawned and initialized");

  const pendingRequests = new Map<
    string,
    { resolve: (result: { success: boolean; error?: string }) => void }
  >();

  let resultCallback: ((result: ExecutionResult) => void) | null = null;

  mainChannel.port2.on("message", (msg: PlaceOrderResult | ExecutionResultMessage) => {
    if (msg.type === "placeOrderResult") {
      const pending = pendingRequests.get(msg.data.requestId);
      if (pending) {
        pendingRequests.delete(msg.data.requestId);
        pending.resolve({ success: msg.data.success, error: msg.data.error });
      }
    } else if (msg.type === "executionResult") {
      if (resultCallback) {
        resultCallback(msg.data);
      }
    }
  });
  mainChannel.port2.start();

  const executor: ExecutorPlugin = {
    async placeOrder(params) {
      const requestId = randomUUID();

      return new Promise((resolve) => {
        pendingRequests.set(requestId, { resolve });

        mainChannel.port2.postMessage({
          type: "placeOrder",
          data: {
            requestId,
            ...params,
          },
        });

        setTimeout(() => {
          if (pendingRequests.has(requestId)) {
            pendingRequests.delete(requestId);
            resolve({ success: false, error: "Request timeout" });
          }
        }, 30000);
      });
    },

    async refreshAgent(userId: string) {
      await executorWorker.refreshAgent(userId);
    },

    invalidateAgent(userId: string) {
      executorWorker.invalidateAgent(userId);
    },

    async getStats() {
      return executorWorker.getStats();
    },

    async setDispatcherPort(port: MessagePort) {
      await executorWorker.setPorts(Transfer(port), Transfer(mainChannel.port1));
    },

    onResult(callback) {
      resultCallback = callback;
    },
  };

  fastify.decorate("executor", executor);

  fastify.addHook("onClose", async () => {
    logger.info("[Executor] Shutting down worker...");
    mainChannel.port2.close();
    await executorWorker.shutdown();
    await Thread.terminate(executorWorker);
  });
};

export default fp(executorPlugin, {
  name: "executor",
  dependencies: ["logger"],
});
