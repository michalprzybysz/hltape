// apps/api/src/routes/orders/handlers/create.ts
import { randomUUID } from "node:crypto";
import { Decimal } from "decimal.js";
import type { InferSelectModel } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { order } from "../../../db/schema";
import { CreateOrderSchema } from "../schemas";

type Order = InferSelectModel<typeof order>;

export async function createOrder(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { user } = request;
  const { order } = this.schema;
  const body = CreateOrderSchema.parse(request.body);

  try {
    if (!this.assets.hasSymbol(body.instrument)) {
      return reply.badRequest(`Unknown instrument: ${body.instrument}`);
    }
    const assetIndex = this.assets.getIndex(body.instrument);

    const isClosingLong = body.side === "long";
    const isBuyOrder = !isClosingLong;

    const orderId = randomUUID();
    const triggerPrice = new Decimal(body.triggerPrice).toSignificantDigits(5).toString();
    const size = new Decimal(body.size).toString();

    const result = await this.executor.placeOrder({
      userId: user.id,
      orderId,
      assetIndex,
      isBuy: isBuyOrder,
      triggerPrice,
      size,
    });

    if (!result.success) {
      this.log.warn(
        { userId: user.id, error: result.error, instrument: body.instrument },
        "Failed to place HL order",
      );
      return reply.badRequest(result.error || "Failed to place order on exchange");
    }

    let created: Order;
    try {
      [created] = await this.db
        .insert(order)
        .values({
          id: orderId,
          userId: user.id,
          instrument: body.instrument,
          assetIndex,
          side: body.side,
          triggerPrice: new Decimal(body.triggerPrice),
          initialTriggerPrice: new Decimal(body.triggerPrice),
          size: new Decimal(body.size),
          status: "open",
          trailing: true,
          trailingDistance: body.trailingDistance
            ? new Decimal(body.trailingDistance)
            : new Decimal("0.01"),
          leverage: new Decimal(body.leverage),
        })
        .returning();
    } catch (dbErr) {
      this.log.fatal(
        { err: dbErr, orderId, userId: user.id },
        "DATA INTEGRITY RISK: Order placed on HL but DB insert failed",
      );
      throw dbErr;
    }

    this.engine.startOrder(created);

    this.log.info(
      { orderId: created.id, symbol: created.instrument },
      "Order created & tracking started",
    );

    return reply.code(201).send(created);
  } catch (err) {
    // Log the class of the failure, not the error. Anything thrown out of the executor or of
    // viem can carry the arguments it was called with, and those reach stdout and Sentry.
    this.log.error(
      { userId: user.id, errorName: (err as Error).name },
      "Create order handler failed",
    );
    return reply.internalServerError("Internal System Error");
  }
}
