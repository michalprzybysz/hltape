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
