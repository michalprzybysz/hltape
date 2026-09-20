import { ExchangeClient, type HttpTransport, InfoClient } from "@nktkas/hyperliquid";
import type { Decimal } from "decimal.js";
import type { ActiveBuilderConfig } from "../config";
import type { WorkerLogger } from "../logger/workerLogger";
import { captureError } from "../sentry";
import type {
  HotAgent,
  ModifyResult,
  PlaceOrderParams,
  PlaceOrderResult,
  SmallOrder,
} from "../types";
import { uuidToCloid } from "../utils/uuid";
import { isOrderGoneError } from "../utils/validation";

export class TradingService {
  private readonly transport: HttpTransport;
  /** Builder-fee tag, or null when the self-hoster runs without a builder fee. */
  private readonly builder: ActiveBuilderConfig | null;
  private readonly logger: WorkerLogger;
  private readonly isTestnet: boolean;
  private readonly infoClient: InfoClient;

  /** OID Cache: internalOrderId (UUID) -> hlNumericOid */
  private readonly oidCache = new Map<string, number>();

  constructor(
    transport: HttpTransport,
    builder: ActiveBuilderConfig | null,
    logger: WorkerLogger,
    isTestnet: boolean,
  ) {
    this.transport = transport;
    this.builder = builder;
    this.logger = logger;
    this.isTestnet = isTestnet;
    this.infoClient = new InfoClient({ transport });
  }

  /** Get cached OID for an order */
  getCachedOid(orderId: string): number | undefined {
    return this.oidCache.get(orderId);
  }

  /** Update OID cache */
  setCachedOid(orderId: string, oid: number): void {
    this.oidCache.set(orderId, oid);
  }

  /** Remove from OID cache */
  clearCachedOid(orderId: string): void {
    this.oidCache.delete(orderId);
  }

  async tryModify(
    agent: HotAgent,
    order: SmallOrder,
    triggerPrice: Decimal,
  ): Promise<ModifyResult> {
    const { privateKeyToAccount } = await import("viem/accounts");
    const account = privateKeyToAccount(agent.account.privateKey as `0x${string}`);

    const client = new ExchangeClient({
      transport: this.transport,
      wallet: account,
      isTestnet: this.isTestnet,
    });

    const priceStr = triggerPrice.toSignificantDigits(5).toString();
    const sizeStr = order.size;
    const cloid = uuidToCloid(order.id);

    // Step 1: Check cache for OID
    const cachedOid = this.oidCache.get(order.id);

    if (cachedOid !== undefined) {
      // Step 2a: Cache Hit - try modify with cached OID
      const result = await this.executeModify(client, cachedOid, order, priceStr, sizeStr, cloid);

      if (result.success) {
        // Update cache with new OID if returned
        if (result.newOid !== undefined) {
          this.oidCache.set(order.id, result.newOid);
        }
        return { success: true };
      }

      // If "order not found" error, cache is stale - proceed to recovery
      if (!result.cacheStale) {
        // Other error, not recoverable via lookup
        return { success: false, error: result.error, orderGone: result.orderGone };
      }

      this.logger.debug("Cache stale, falling back to lookup", { orderId: order.id, cachedOid });
    } else {
      // Step 2b: Cache Miss - try modify with CLOID
      const result = await this.executeModify(
        client,
        cloid as unknown as number,
        order,
        priceStr,
        sizeStr,
        cloid,
      );

      if (result.success) {
        if (result.newOid !== undefined) {
          this.oidCache.set(order.id, result.newOid);
        }
        return { success: true };
      }

      // If not a stale cache error, return failure
      if (!result.cacheStale) {
        return { success: false, error: result.error, orderGone: result.orderGone };
      }

      this.logger.debug("CLOID modify failed, falling back to lookup", { orderId: order.id });
    }

    // Step 3: Recovery/Lookup
    return this.recoverAndRetry(client, agent, order, priceStr, sizeStr, cloid);
  }

  private async executeModify(
    client: ExchangeClient,
    oid: number | string,
    order: SmallOrder,
    priceStr: string,
    sizeStr: string,
    cloid: string,
  ): Promise<{
    success: boolean;
    newOid?: number;
    error?: string;
    orderGone?: boolean;
    cacheStale?: boolean;
  }> {
    try {
      const modifyRequest = {
        oid: oid as number,
        order: {
          a: order.assetIndex,
          b: order.side !== "long",
          p: priceStr,
          s: sizeStr,
          r: true,
          t: {
            trigger: {
              triggerPx: priceStr,
              isMarket: true,
              tpsl: "sl" as const,
            },
          },
          c: cloid,
        },
      };

      this.logger.debug("Sending modify request", {
        orderId: order.id,
        oid,
        cloid,
        triggerPrice: priceStr,
      });

      const response = await client.modify(modifyRequest);

      if (response.status !== "ok") {
        throw new Error(JSON.stringify(response));
      }

      if ("data" in response.response) {
        const data = response.response.data as {
          statuses: Array<{ error?: string; resting?: { oid: number } }>;
        };
        const status = data.statuses[0];

        if (status?.error) {
          throw new Error(status.error);
        }

        // Extract new OID from response
        const newOid = status?.resting?.oid;
        return { success: true, newOid };
      }

      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const gone = isOrderGoneError(errorMsg);

      // If order not found, might be stale cache - allow recovery
      if (gone) {
        return { success: false, error: errorMsg, cacheStale: true };
      }

      captureError(error, { orderId: order.id, context: "executeModify" });
      this.logger.warn("Modify failed", { orderId: order.id, error: errorMsg });
      return { success: false, error: errorMsg, orderGone: false };
    }
  }

  private async recoverAndRetry(
    client: ExchangeClient,
    agent: HotAgent,
    order: SmallOrder,
    priceStr: string,
    sizeStr: string,
    cloid: string,
  ): Promise<ModifyResult> {
    try {
      this.logger.info("Fetching open orders for recovery", {
        orderId: order.id,
        masterWallet: agent.masterWalletAddress,
      });

      const openOrders = await this.infoClient.openOrders({
        user: agent.masterWalletAddress,
      });

      // Find order matching our CLOID
      const targetCloid = cloid.toLowerCase();
      const matchingOrder = openOrders.find((o) => o.cloid?.toLowerCase() === targetCloid);

      if (!matchingOrder) {
        // Order truly gone from exchange
        this.logger.info("Order not found on exchange after lookup", { orderId: order.id, cloid });
        this.oidCache.delete(order.id);
        return { success: false, error: "Order not found on exchange", orderGone: true };
      }

      // Found it! Update cache and retry
      const freshOid = matchingOrder.oid;
      this.oidCache.set(order.id, freshOid);

      this.logger.debug("Found order via lookup, retrying modify", {
        orderId: order.id,
        freshOid,
      });

      const retryResult = await this.executeModify(
        client,
        freshOid,
        order,
        priceStr,
        sizeStr,
        cloid,
      );

      if (retryResult.success) {
        if (retryResult.newOid !== undefined) {
          this.oidCache.set(order.id, retryResult.newOid);
        }
        return { success: true };
      }

      // Still failed after lookup - order might have been filled/cancelled
      if (retryResult.cacheStale || retryResult.orderGone) {
        this.oidCache.delete(order.id);
        return { success: false, error: retryResult.error, orderGone: true };
      }

      return { success: false, error: retryResult.error };
    } catch (error) {
      captureError(error, { orderId: order.id, context: "recoverAndRetry" });
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error("Recovery lookup failed", { orderId: order.id, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }

  async placeOrder(agent: HotAgent, params: PlaceOrderParams): Promise<PlaceOrderResult> {
    try {
      const { privateKeyToAccount } = await import("viem/accounts");
      const account = privateKeyToAccount(agent.account.privateKey as `0x${string}`);

      const client = new ExchangeClient({
        transport: this.transport,
        wallet: account,
        isTestnet: this.isTestnet,
      });

      const cloid = uuidToCloid(params.orderId);

      const response = await client.order({
        orders: [
          {
            a: params.assetIndex,
            b: params.isBuy,
            p: params.triggerPrice,
            s: params.size,
            r: true,
            t: {
              trigger: {
                triggerPx: params.triggerPrice,
                isMarket: true,
                tpsl: "sl",
              },
            },
            c: cloid,
          },
        ],
        grouping: "na",
        ...(this.builder && {
          builder: { b: this.builder.address as `0x${string}`, f: this.builder.feeTenthsBps },
        }),
      });

      if (response.status !== "ok") {
        return { requestId: params.requestId, success: false, error: JSON.stringify(response) };
      }

      const status = response.response.data.statuses[0];
      if (typeof status === "object" && status !== null && "error" in status) {
        return { requestId: params.requestId, success: false, error: status.error as string };
      }

      return { requestId: params.requestId, success: true };
    } catch (err) {
      captureError(err, { requestId: params.requestId, context: "placeOrder" });
      return {
        requestId: params.requestId,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }
}
