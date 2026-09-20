// apps/api/src/lib/feeder/worker.ts

import type { MessagePort } from "node:worker_threads";
import { SubscriptionClient, WebSocketTransport } from "@nktkas/hyperliquid";
import type { AllMidsEvent } from "@nktkas/hyperliquid/api/subscription";
import { Decimal } from "decimal.js";
import { expose } from "threads/worker";
import { FEEDER_FALLBACK_VOL } from "../enums";
import { createWorkerLogger } from "../logger/workerLogger";
import { captureError, initWorkerSentry } from "../sentry";
import type { SubscriptionHandle } from "../types";
import {
  calculateVolatility,
  clearAllVolatilityData,
  clearVolatilityData,
  getVolatilityData,
} from "../utils/math";

const TESTNET = process.env.TESTNET === "true";

initWorkerSentry("Feeder");

const logger = createWorkerLogger("Feeder");

let brainPort: MessagePort | null = null;

let client: SubscriptionClient | null = null;
let activeSubscription: SubscriptionHandle | null = null;
let isConnected = false;
let isConnecting = false;

const RECONNECT_DELAY_MS = 5_000;

const activeSymbols = new Set<string>();
const priceCache = new Map<string, Decimal>();

function shouldUpdatePrice(symbol: string, newPrice: Decimal): boolean {
  const cached = priceCache.get(symbol);
  if (!cached) {
    priceCache.set(symbol, newPrice);
    return true;
  }

  const diff = newPrice.minus(cached).abs().div(cached);
  if (diff.gt(0.00001)) {
    priceCache.set(symbol, newPrice);
    return true;
  }

  return false;
}

function processIncomingData(data: AllMidsEvent): void {
  if (!brainPort || !data?.mids) return;

  for (const symbol of activeSymbols) {
    try {
      const rawPrice = data.mids[symbol];
      if (!rawPrice) continue;

      const price = new Decimal(rawPrice);
      const volatility = calculateVolatility(symbol, price);

      if (shouldUpdatePrice(symbol, price)) {
        brainPort.postMessage({
          type: "price",
          symbol,
          price: price.toString(),
          volatility: volatility.toString(),
        });
      }
    } catch (err) {
      logger.debug(`Tick error for ${symbol}`, { err: String(err) });
    }
  }
}

async function connect(): Promise<void> {
  if (isConnected || isConnecting) return;

  isConnecting = true;
  logger.info("Starting WebSocket connection");

  try {
    const transport = new WebSocketTransport({
      isTestnet: TESTNET,
      reconnect: { maxRetries: Number.POSITIVE_INFINITY },
    });

    transport.socket.addEventListener("close", () => {
      logger.error("WebSocket disconnected, attempting reconnect");
    });

    transport.socket.addEventListener("open", () => {
      logger.info("WebSocket reconnected successfully");
    });

    client = new SubscriptionClient({ transport });

    activeSubscription = await client.allMids((event) => {
      processIncomingData(event);
    });

    activeSubscription.failureSignal.addEventListener("abort", () => {
      const reason = String(activeSubscription?.failureSignal.reason);
      const err = new Error(`Feeder WebSocket terminated: ${reason}`);

      logger.error("WebSocket subscription failed permanently, reconnecting", { reason });
      captureError(err, {
        worker: "Feeder",
        activeSymbols: Array.from(activeSymbols),
      });

      isConnected = false;
      isConnecting = false;
      client = null;
      activeSubscription = null;

      if (activeSymbols.size > 0) {
        setTimeout(() => {
          connect().catch((reconnectErr) => {
            logger.error("Reconnection attempt failed", { error: String(reconnectErr) });
            captureError(reconnectErr, { worker: "Feeder", phase: "reconnect" });
          });
        }, RECONNECT_DELAY_MS);
      }
    });

    isConnected = true;
    logger.info("Connected to Hyperliquid WebSocket");
  } catch (e) {
    client = null;
    isConnected = false;
    logger.error("Failed to connect", { error: String(e) });
    throw e;
  } finally {
    isConnecting = false;
  }
}

async function disconnect(): Promise<void> {
  logger.info("Disconnecting WebSocket");
  try {
    if (activeSubscription) {
      await activeSubscription.unsubscribe();
    }
  } catch (e) {
    logger.debug("Error during unsubscribe", { error: String(e) });
  }
  client = null;
  activeSubscription = null;
  isConnected = false;
  isConnecting = false;
}

const feederApi = {
  setBrainPort(port: MessagePort) {
    brainPort = port;
    brainPort.start();
    logger.info("Connected to Brain via MessagePort");
  },

  setLoggerPort(port: MessagePort) {
    logger.setPort(port);
    port.start();
  },

  async subscribe(symbol: string) {
    const normalizedSymbol = symbol.toUpperCase();
    const wasEmpty = activeSymbols.size === 0;
    activeSymbols.add(normalizedSymbol);

    logger.info(`Subscribing to ${normalizedSymbol}`, {
      totalSymbols: activeSymbols.size,
    });

    if (wasEmpty) {
      await connect();
    } else {
      const cachedPrice = priceCache.get(normalizedSymbol);
      if (cachedPrice && brainPort) {
        const vol = getVolatilityData(normalizedSymbol)?.lastVol ?? FEEDER_FALLBACK_VOL;
        brainPort.postMessage({
          type: "price",
          symbol: normalizedSymbol,
          price: cachedPrice.toString(),
          volatility: vol.toString(),
        });
      }
    }
  },

  async unsubscribe(symbol: string) {
    const normalizedSymbol = symbol.toUpperCase();
    activeSymbols.delete(normalizedSymbol);

    logger.info(`Unsubscribed from ${normalizedSymbol}`, {
      totalSymbols: activeSymbols.size,
    });

    priceCache.delete(normalizedSymbol);
    clearVolatilityData(normalizedSymbol);

    if (activeSymbols.size === 0) {
      await disconnect();
    }
  },

  getActiveSymbols(): string[] {
    return Array.from(activeSymbols);
  },

  async shutdown() {
    await disconnect();
    activeSymbols.clear();
    priceCache.clear();
    clearAllVolatilityData();
  },
};

expose(feederApi);
