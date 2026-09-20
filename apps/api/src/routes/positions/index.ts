// apps/api/src/routes/positions/index.ts
import { randomUUID } from "node:crypto";
import { ExchangeClient } from "@nktkas/hyperliquid";
import { Decimal } from "decimal.js";
import { and, eq } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { privateKeyToAccount } from "viem/accounts";
import { agentWallet, order } from "../../db/schema";
import { config } from "../../lib/config";
import { decrypt } from "../../lib/crypto";
import { infoClient, isTestnet, sharedTransport } from "../../lib/hl";
import { logger } from "../../lib/logger";

const PositionSchema = {
  type: "object",
  properties: {
    coin: { type: "string" },
    szi: { type: "string" },
    entryPx: { type: "string" },
    positionValue: { type: "string" },
    unrealizedPnl: { type: "string" },
    returnOnEquity: { type: "string" },
    liquidationPx: { type: ["string", "null"] },
    marginUsed: { type: "string" },
    maxLeverage: { type: "number" },
    leverage: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["isolated", "cross"] },
        value: { type: "number" },
        rawUsd: { type: "string" },
      },
      required: ["type", "value"],
    },
  },
  required: [
    "coin",
    "szi",
    "entryPx",
    "positionValue",
    "unrealizedPnl",
    "returnOnEquity",
    "marginUsed",
    "maxLeverage",
    "leverage",
  ],
} as const;

const AccountSummarySchema = {
  type: "object",
  properties: {
    accountValue: { type: "string" },
    totalNtlPos: { type: "string" },
    totalRawUsd: { type: "string" },
    totalMarginUsed: { type: "string" },
  },
  required: ["accountValue", "totalNtlPos", "totalRawUsd", "totalMarginUsed"],
} as const;

const PositionsResponseSchema = {
  type: "object",
  properties: {
    marginSummary: AccountSummarySchema,
    crossMarginSummary: AccountSummarySchema,
    crossMaintenanceMarginUsed: { type: "string" },
    withdrawable: { type: "string" },
    positions: {
      type: "array",
      items: PositionSchema,
    },
    time: { type: "number" },
  },
  required: [
    "marginSummary",
    "crossMarginSummary",
    "crossMaintenanceMarginUsed",
    "withdrawable",
    "positions",
    "time",
  ],
} as const;

const positions: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.addHook("preHandler", fastify.verifySession);

  fastify.get(
    "/",
    {
      schema: {
        response: {
          200: PositionsResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { wallet } = request;

        const clearinghouseState = await infoClient.clearinghouseState({
          user: wallet.address,
        });

        const positions = clearinghouseState.assetPositions
          .filter((p) => p.position.szi !== "0")
          .map((p) => p.position);

        return reply.code(200).send({
          marginSummary: clearinghouseState.marginSummary,
          crossMarginSummary: clearinghouseState.crossMarginSummary,
          crossMaintenanceMarginUsed: clearinghouseState.crossMaintenanceMarginUsed,
          withdrawable: clearinghouseState.withdrawable,
          positions,
          time: clearinghouseState.time,
        });
      } catch (err) {
        logger.error("Failed to fetch positions", { err: String(err) });
        return reply.internalServerError();
      }
    },
  );

  fastify.post<{
    Body: {
      coin: string;
      side: "long" | "short";
      sizeUsd: number;
      leverage?: number;
      marginMode?: "cross" | "isolated";
      trailingSL?: {
        distance: number;
      };
    };
  }>(
    "/",
    {
      config: {
        rateLimit: { max: 5, timeWindow: "1 minute" },
      },
      schema: {
        body: {
          type: "object",
          properties: {
            coin: { type: "string" },
            side: { type: "string", enum: ["long", "short"] },
            sizeUsd: { type: "number" },
            leverage: { type: "number", minimum: 1 },
            marginMode: { type: "string", enum: ["cross", "isolated"] },
            trailingSL: {
              type: "object",
              properties: {
                distance: { type: "number", minimum: 0.01, maximum: 99.99 },
              },
              required: ["distance"],
            },
          },
          required: ["coin", "side", "sizeUsd"],
        },
      },
    },
    async (request, reply) => {
      const { wallet, user } = request;

      try {
        const { coin, side, sizeUsd, leverage, marginMode = "cross", trailingSL } = request.body;
        const isCross = marginMode === "cross";

        const [agent] = await fastify.db
          .select()
          .from(agentWallet)
          .where(and(eq(agentWallet.userId, user.id), eq(agentWallet.masterWalletId, wallet.id)))
          .limit(1);

        if (!agent) {
          return reply.badRequest("No agent wallet found");
        }

        const privateKey = decrypt(agent.encryptedPrivateKey) as `0x${string}`;
        const account = privateKeyToAccount(privateKey);

        const [meta, assetCtxs] = await infoClient.metaAndAssetCtxs();
        const asset = meta.universe.find((a) => a.name.toUpperCase() === coin.toUpperCase());
        if (!asset) {
          return reply.badRequest(`Unknown coin: ${coin}`);
        }
        const assetIndex = meta.universe.indexOf(asset);
        const szDecimals = asset.szDecimals;

        const assetCtx = assetCtxs[assetIndex];
        const currentPrice = assetCtx?.oraclePx;
        if (!currentPrice) {
          return reply.badRequest(`No price data for ${coin}`);
        }

        const size = new Decimal(sizeUsd)
          .div(currentPrice)
          .toDecimalPlaces(szDecimals, Decimal.ROUND_DOWN)
          .toString();

        if (parseFloat(size) === 0) {
          return reply.badRequest("Calculated size is too small (rounds to 0)");
        }

        const client = new ExchangeClient({
          transport: sharedTransport,
          wallet: account,
          isTestnet,
        });

        const isBuy = side === "long";

        if (!isCross || (leverage && leverage > 1)) {
          await client.updateLeverage({
            asset: assetIndex,
            isCross,
            leverage: leverage ?? 1,
          });
        }

        // Optional: when no builder address is configured, the order carries no builder tag.
        const builderAddress = config.builder.address as `0x${string}` | null;

        const response = await client.order({
          orders: [
            {
              a: assetIndex,
              b: isBuy,
              p: new Decimal(currentPrice)
                .mul(isBuy ? 1.02 : 0.98)
                .toSignificantDigits(5)
                .toString(),
              s: size,
              r: false,
              t: { limit: { tif: "Ioc" } },
            },
          ],
          grouping: "na",
          ...(builderAddress && {
            builder: { b: builderAddress, f: config.builder.feeTenthsBps },
          }),
        });

        if (response.status !== "ok") {
          return reply.internalServerError(JSON.stringify(response));
        }

        const status = response.response.data.statuses[0];
        if (typeof status === "object" && status !== null && "error" in status) {
          const raw = status.error as string;
          if (raw.includes("Price too far from oracle")) {
            return reply.badRequest("The market price moved too quickly. Please try again.");
          }
          return reply.badRequest(raw);
        }

        if (trailingSL) {
          const entryPx = new Decimal(currentPrice);
          const distance = new Decimal(trailingSL.distance);
          const triggerPrice = isBuy
            ? entryPx.mul(new Decimal(1).minus(distance))
            : entryPx.mul(new Decimal(1).plus(distance));

          const orderId = randomUUID();
          const triggerPriceStr = triggerPrice.toSignificantDigits(5).toString();

          const slResult = await fastify.executor.placeOrder({
            userId: user.id,
            orderId,
            assetIndex,
            isBuy: !isBuy,
            triggerPrice: triggerPriceStr,
            size,
          });

          if (slResult.success) {
            const [created] = await fastify.db
              .insert(order)
              .values({
                id: orderId,
                userId: user.id,
                instrument: coin,
                assetIndex,
                side,
                triggerPrice: new Decimal(triggerPriceStr),
                initialTriggerPrice: new Decimal(triggerPriceStr),
                size: new Decimal(size),
                status: "open",
                trailing: true,
                trailingDistance: distance,
                leverage: new Decimal(leverage ?? 1),
              })
              .returning();

            fastify.engine.startOrder(created);
            logger.info(`Trailing SL created with position: ${orderId} ${coin}`);
          } else {
            logger.warn(`Failed to place trailing SL order: ${orderId} ${coin} ${slResult.error}`);
          }
        }

        return reply.code(201).send({ status: "ok", response: status });
      } catch (err) {
        // `privateKeyToAccount` and every viem/Hyperliquid call below it are given a decrypted
        // agent private key. viem errors are verbose and can echo their input, so nothing from
        // here is allowed to reach Fastify's error handler verbatim: that would put it on stdout
        // and, when Sentry is configured, in a third party's issue tracker. Log the class of the
        // error only, and never the error itself.
        logger.error("Failed to open position", {
          userId: user.id,
          errorName: err instanceof Error ? err.name : "UnknownError",
        });
        return reply.internalServerError("Failed to open position");
      }
    },
  );
};

export default positions;
