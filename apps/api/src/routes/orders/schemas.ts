// apps/api/src/routes/orders/schemas.ts
import * as z from "zod";

export const CreateOrderJSONSchema = {
  type: "object",
  properties: {
    instrument: {
      type: "string",
      description: "Trading pair symbol (e.g., ETH, BTC)",
    },
    side: {
      type: "string",
      enum: ["long", "short"],
      description: "Position side",
    },
    size: {
      type: "string",
      pattern: "^[0-9]+(\\.[0-9]+)?$",
      description: "Position size",
    },
    triggerPrice: {
      type: "string",
      pattern: "^[0-9]+(\\.[0-9]+)?$",
      description: "Stop-loss trigger price",
    },
    leverage: {
      type: "number",
      minimum: 1,
      maximum: 500,
      description: "Position leverage",
    },
    trailingDistance: {
      type: "string",
      pattern: "^[0-9]+(\\.[0-9]+)?$",
      description: "Trailing distance as decimal (e.g., 0.01 for 1%)",
    },
  },
  required: ["instrument", "side", "size", "triggerPrice", "leverage"],
} as const;

// Body of PATCH /orders/:id. Only these five fields are read by the handler; everything else on
// an order row (id, userId, status, raw, timestamps) is not client-writable, so the schema is
// written out by hand rather than derived from the table, and `additionalProperties: false`
// drops anything else before it reaches the handler.
export const UpdateOrderJSONSchema = {
  type: "object",
  properties: {
    triggerPrice: {
      type: "string",
      pattern: "^[0-9]+(\\.[0-9]+)?$",
      description: "Stop-loss trigger price",
    },
    size: {
      type: "string",
      pattern: "^[0-9]+(\\.[0-9]+)?$",
      description: "Position size",
    },
    leverage: {
      type: "number",
      minimum: 1,
      maximum: 500,
      description: "Position leverage",
    },
    trailingDistance: {
      type: "string",
      pattern: "^[0-9]+(\\.[0-9]+)?$",
      description: "Trailing distance as decimal (e.g., 0.01 for 1%)",
    },
    trailing: {
      type: "boolean",
      description: "Whether the trailing engine follows this order; false pauses it",
    },
  },
  additionalProperties: false,
} as const;

export const CreateOrderSchema = z.object({
  instrument: z.string().trim().toUpperCase(),
  side: z.enum(["long", "short"]),
  size: z.string().regex(/^[0-9]+(\.[0-9]+)?$/, "Invalid size format"),
  triggerPrice: z.string().regex(/^[0-9]+(\.[0-9]+)?$/, "Invalid price format"),
  leverage: z.number().min(1).max(500),
  trailingDistance: z
    .string()
    .regex(/^[0-9]+(\.[0-9]+)?$/, "Invalid trailing distance")
    .optional(),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
