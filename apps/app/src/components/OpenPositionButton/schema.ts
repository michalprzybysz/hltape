import { SIDES } from "@hltape/sdk";
import { z } from "zod";

export const MARGIN_MODE = { CROSS: "cross", ISOLATED: "isolated" } as const;
export type MarginMode = (typeof MARGIN_MODE)[keyof typeof MARGIN_MODE];

export const openPositionSchema = z
  .object({
    coin: z.string().min(1, "Select a perpetual"),
    side: z.enum([SIDES.LONG, SIDES.SHORT]),
    sizeUsd: z.number().min(1, "Minimum size is 1 USDC"),
    leverage: z.number().int("Must be a whole number").min(1, "Minimum leverage is 1x"),
    marginMode: z.enum([MARGIN_MODE.CROSS, MARGIN_MODE.ISOLATED]),
    trailingSL: z
      .object({
        distance: z.number().min(0.01, "Min 1%").max(0.99, "Max 99%"),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.trailingSL?.distance && data.leverage > 1) {
      if (data.trailingSL.distance >= 1 / data.leverage) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "SL distance exceeds liquidation threshold. Position will be liquidated before SL triggers.",
          path: ["trailingSL", "distance"],
        });
      }
    }
  });

export type OpenPositionFormData = z.infer<typeof openPositionSchema>;
