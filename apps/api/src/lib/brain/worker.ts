// apps/api/src/lib/brain/worker.ts
import type { MessagePort } from "node:worker_threads";
import { Decimal } from "decimal.js";
import { expose } from "threads/worker";
import { createWorkerLogger } from "../logger/workerLogger";
import { initWorkerSentry } from "../sentry";
import type { ActiveOrder, ExecutionDecision, PriceUpdateMessage, SerializedOrder } from "../types";
import {
  calculateGapPercent,
  calculatePureRiskScore,
  calculateTheoreticalSl,
  calculateThreshold,
  isPriceDifferent,
  roundToHlPrice,
} from "../utils/math";

initWorkerSentry("Brain");

const orders = new Map<string, ActiveOrder>();
const ordersBySymbol = new Map<string, Set<string>>();

const logger = createWorkerLogger("Brain");

let feederPort: MessagePort | null = null;
let dispatcherPort: MessagePort | null = null;

function processPriceUpdate(symbol: string, rawPrice: string, rawVol: string): void {
  const group = ordersBySymbol.get(symbol);
  if (!group || group.size === 0) {
    return;
  }

  const price = new Decimal(rawPrice);
  const volatility = new Decimal(rawVol);

  logger.debug(`${symbol} Processing price update`, {
    price: rawPrice,
    volatility: rawVol,
    orderCount: group.size,
  });

  for (const id of group) {
    const order = orders.get(id);
    if (!order) {
      group.delete(id);
      continue;
    }

    if (!order.trailingDistance) {
      continue;
    }

    const theoreticalSl = calculateTheoreticalSl(
      price,
      order.triggerPrice,
      order.trailingDistance,
      order.side,
    );

    if (!theoreticalSl) {
      logger.debug(`${symbol} ${order.side.toUpperCase()} ${id} No SL update needed`, {
        price: price.toString(),
        triggerPrice: order.triggerPrice.toString(),
      });
      continue;
    }

    const hlRoundedSl = roundToHlPrice(theoreticalSl);
    if (!isPriceDifferent(hlRoundedSl, order.triggerPrice)) {
      continue;
    }

    const positionSizeUsd = order.size.abs().mul(price);
    const gapPercent = calculateGapPercent(hlRoundedSl, order.triggerPrice, price);

    const threshold = calculateThreshold(
      volatility,
      order.leverage,
      positionSizeUsd,
      order.trailingDistance,
    );

    if (gapPercent.lt(threshold) && gapPercent.lt(0.0015)) {
      logger.debug(`${symbol} ${order.side.toUpperCase()} ${id} Gap too small`, {
        gapPercent: gapPercent.toString(),
        threshold: threshold.toString(),
      });
      continue;
    }

    const score = calculatePureRiskScore(gapPercent, order.leverage, positionSizeUsd);

    const decision: ExecutionDecision = {
      id: order.id,
      userId: order.userId,
      instrument: order.instrument,
      assetIndex: order.assetIndex,
      side: order.side,
      size: order.size.abs().toString(),
      triggerPrice: hlRoundedSl.toString(),
      priorityScore: score.toNumber(),
    };

    logger.info(`${symbol} ${order.side.toUpperCase()} ${id} DECISION EMITTED`, {
      orderId: id,
      instrument: symbol,
      side: order.side,
      marketPrice: rawPrice,
      oldTrigger: order.triggerPrice.toString(),
      newTrigger: hlRoundedSl.toString(),
      gapPercent: gapPercent.toString(),
      priorityScore: score.toNumber(),
    });

    order.triggerPrice = hlRoundedSl;

    if (dispatcherPort) {
      dispatcherPort.postMessage({ type: "decision", data: decision });
    }
  }
}

const workerApi = {
  setPorts(feederP: MessagePort, dispatcherP: MessagePort) {
    feederPort = feederP;
    dispatcherPort = dispatcherP;

    feederPort.on("message", (msg: PriceUpdateMessage) => {
      if (msg.type === "price") {
        processPriceUpdate(msg.symbol, msg.price, msg.volatility);
      }
    });

    feederPort.start();
    dispatcherPort.start();

    logger.info("Direct communication ports connected");
  },

  setLoggerPort(port: MessagePort) {
    logger.setPort(port);
    port.start();
  },

  addOrder(rawOrder: SerializedOrder) {
    const sym = rawOrder.instrument.toUpperCase();

    const activeOrder: ActiveOrder = {
      id: rawOrder.id,
      userId: rawOrder.userId,
      instrument: rawOrder.instrument,
      side: rawOrder.side,
      assetIndex: rawOrder.assetIndex,
      size: new Decimal(rawOrder.size),
      triggerPrice: new Decimal(rawOrder.triggerPrice),
      trailingDistance: rawOrder.trailingDistance ? new Decimal(rawOrder.trailingDistance) : null,
      leverage: new Decimal(rawOrder.leverage || 1),
    };

    orders.set(activeOrder.id, activeOrder);

    if (!ordersBySymbol.has(sym)) ordersBySymbol.set(sym, new Set());
    ordersBySymbol.get(sym)?.add(activeOrder.id);

    logger.debug(`Order added: ${activeOrder.id}`, {
      symbol: sym,
      side: activeOrder.side,
      size: activeOrder.size.toString(),
      totalOrders: orders.size,
    });
  },

  removeOrder(id: string) {
    const order = orders.get(id);
    if (!order) {
      logger.debug(`Remove order: ${id} not found`);
      return;
    }
    orders.delete(id);

    const group = ordersBySymbol.get(order.instrument);
    if (group) {
      group.delete(id);
      if (group.size === 0) {
        ordersBySymbol.delete(order.instrument);
      }
    }

    logger.debug(`Order removed: ${id}`, { symbol: order.instrument });
  },

  getActiveSymbols(): string[] {
    return Array.from(ordersBySymbol.keys());
  },

  hasOrdersForSymbol(symbol: string): boolean {
    const group = ordersBySymbol.get(symbol);
    return !!group && group.size > 0;
  },
};

expose(workerApi);
