// apps/api/src/lib/executor/worker.ts
import type { MessagePort } from "node:worker_threads";
import { HttpTransport, InfoClient } from "@nktkas/hyperliquid";
import { Decimal } from "decimal.js";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { expose } from "threads/worker";
import * as schema from "../../db/schema";
import { config, getBuilderTag } from "../config";
import { EXECUTOR_BASE_RETRY_DELAY_MS, EXECUTOR_MAX_RETRIES } from "../enums";
import { createWorkerLogger } from "../logger/workerLogger";
import { captureError, initWorkerSentry } from "../sentry";
import type {
  ExecuteMessage,
  ExecutionResult,
  PlaceOrderMessage,
  PlaceOrderParams,
  SmallOrder,
} from "../types";
import { AgentCache } from "./agentCache";
import { ReferralService } from "./referral";
import { TradingService } from "./trading";

// Revenue features are optional: an operator can run the engine earning nothing.
const builderTag = getBuilderTag();
const referralCode = config.referralCode;

const pool = new Pool({ connectionString: config.databaseUrl, max: 5 });
const db = drizzle(pool, { schema });

const transport = new HttpTransport({ isTestnet: config.testnet });
const infoClient = new InfoClient({ transport });

initWorkerSentry("Executor");

const logger = createWorkerLogger("Executor");

logger.info(
  builderTag
    ? `Builder fee enabled (f=${builderTag.feeTenthsBps}, b=${builderTag.address})`
    : "Builder fee disabled (BUILDER_ADDRESS unset)",
);
logger.info(
  referralCode
    ? `Referral linking enabled (code=${referralCode})`
    : "Referral linking disabled (REFERRAL_CODE unset)",
);

const agentCache = new AgentCache(logger, config.masterKeyHex, db, schema);
const tradingService = new TradingService(transport, builderTag, logger, config.testnet);
const referralService = new ReferralService(
  transport,
  infoClient,
  referralCode,
  logger,
  config.testnet,
);

let dispatcherPort: MessagePort | null = null;
let mainPort: MessagePort | null = null;
const processingOrders = new Set<string>();

/**
 * Fire-and-forget execution log writer
 */
async function saveExecutionLog(
  order: SmallOrder,
  triggerPrice: string,
  status: "success" | "failed",
  error: string | null,
  durationMs: number,
): Promise<void> {
  try {
    await db.insert(schema.executionLog).values({
      orderId: order.id,
      userId: order.userId,
      assetIndex: order.assetIndex,
      instrument: order.instrument,
      newTriggerPrice: new Decimal(triggerPrice),
      status,
      errorMessage: error,
      executionTimeMs: durationMs,
    });
  } catch (err) {
    captureError(err, { orderId: order.id, context: "saveExecutionLog" });
    logger.error("Failed to save execution log", { orderId: order.id, err: String(err) });
  }
}

async function executeModify(order: SmallOrder, triggerPrice: string): Promise<ExecutionResult> {
  const startTime = Date.now();
  const price = new Decimal(triggerPrice);

  const agent = await agentCache.getAgent(order.userId);
  if (!agent) {
    const duration = Date.now() - startTime;
    await saveExecutionLog(order, triggerPrice, "failed", "No agent found", duration);

    return {
      success: false,
      orderId: order.id,
      error: "No agent found",
      executionTimeMs: duration,
      timestamp: Date.now(),
    };
  }

  let lastError: string | undefined;

  for (let attempt = 0; attempt <= EXECUTOR_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = EXECUTOR_BASE_RETRY_DELAY_MS * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }

    const result = await tradingService.tryModify(agent, order, price);
    const duration = Date.now() - startTime;

    if (result.success) {
      // Parallel: update order + save log
      await Promise.all([
        db
          .update(schema.order)
          .set({ triggerPrice: price, updatedAt: new Date().toISOString() })
          .where(eq(schema.order.id, order.id))
          .catch((err) => {
            captureError(err, { orderId: order.id, context: "DB update" });
            logger.error("DB update failed", { orderId: order.id, err: String(err) });
          }),
        saveExecutionLog(order, triggerPrice, "success", null, duration),
      ]);

      return {
        success: true,
        orderId: order.id,
        executedPrice: triggerPrice,
        executionTimeMs: duration,
        timestamp: Date.now(),
      };
    }

    if (result.orderGone) {
      tradingService.clearCachedOid(order.id);

      // Parallel: close order + save log
      await Promise.all([
        db
          .update(schema.order)
          .set({ status: "closed", trailing: false, updatedAt: new Date().toISOString() })
          .where(eq(schema.order.id, order.id))
          .catch((err) => {
            captureError(err, { orderId: order.id, context: "DB close" });
            logger.error("DB close failed", { orderId: order.id, err: String(err) });
          }),
        saveExecutionLog(order, triggerPrice, "failed", result.error ?? "Order gone", duration),
      ]);

      return {
        success: false,
        orderId: order.id,
        error: result.error,
        orderGone: true,
        executionTimeMs: duration,
        timestamp: Date.now(),
      };
    }

    lastError = result.error;
  }

  const duration = Date.now() - startTime;
  await saveExecutionLog(
    order,
    triggerPrice,
    "failed",
    lastError ?? "Max retries exceeded",
    duration,
  );

  return {
    success: false,
    orderId: order.id,
    error: lastError ?? "Unknown error",
    executionTimeMs: duration,
    timestamp: Date.now(),
  };
}

async function handleExecuteMessage(msg: ExecuteMessage): Promise<void> {
  const { orderId, order, triggerPrice } = msg.data;

  if (processingOrders.has(orderId)) {
    logger.debug("Order already processing", { orderId });
    return;
  }

  processingOrders.add(orderId);

  try {
    const result = await executeModify(order, triggerPrice);

    dispatcherPort?.postMessage({
      type: "result",
      orderId: result.orderId,
      success: result.success,
    });

    mainPort?.postMessage({
      type: "executionResult",
      data: result,
    });
  } finally {
    processingOrders.delete(orderId);
  }
}

async function handlePlaceOrder(data: PlaceOrderParams): Promise<void> {
  const agent = await agentCache.getAgent(data.userId);

  if (!agent) {
    mainPort?.postMessage({
      type: "placeOrderResult",
      data: { requestId: data.requestId, success: false, error: "No agent found" },
    });
    return;
  }

  const result = await tradingService.placeOrder(agent, data);

  if (result.success) {
    referralService.ensureReferral(data.userId, agent).catch(() => {});
  }

  mainPort?.postMessage({ type: "placeOrderResult", data: result });
}

const executorApi = {
  async initialize() {
    await agentCache.loadAll();
    logger.info("Executor Worker initialized");
  },

  setPorts(dispatcherP: MessagePort, mainP: MessagePort) {
    dispatcherPort = dispatcherP;
    mainPort = mainP;

    dispatcherPort.on("message", async (msg: ExecuteMessage) => {
      if (msg.type === "execute") {
        await handleExecuteMessage(msg);
      }
    });

    mainPort.on("message", async (msg: PlaceOrderMessage) => {
      if (msg.type === "placeOrder") {
        await handlePlaceOrder(msg.data);
      }
    });

    dispatcherPort.start();
    mainPort.start();

    logger.info("Connected to Dispatcher and Main via MessagePorts");
  },

  setLoggerPort(port: MessagePort) {
    logger.setPort(port);
    port.start();
  },

  async refreshAgent(userId: string) {
    await agentCache.refresh(userId);
  },

  invalidateAgent(userId: string) {
    agentCache.invalidate(userId);
  },

  getStats() {
    return {
      coldAgents: agentCache.coldSize,
      hotAgents: agentCache.hotSize,
      processingOrders: processingOrders.size,
    };
  },

  async shutdown() {
    await pool.end();
    agentCache.clear();
    processingOrders.clear();
  },
};

expose(executorApi);
