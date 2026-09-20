// apps/api/src/routes/wallets/schemas.ts
import * as z from "zod";

export const AgentWalletSelectSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    agentAddress: { type: "string" },
    label: { type: ["string", "null"] },
    isActive: { type: "boolean" },
    createdAt: { type: "string", format: "date-time" },
  },
  required: ["id", "agentAddress", "isActive", "createdAt"],
} as const;

export const CreateAgentWalletJSONSchema = {
  type: "object",
  properties: {
    agentAddress: {
      type: "string",
      pattern: "^0x[a-fA-F0-9]{40}$",
    },
    privateKey: {
      type: "string",
      pattern: "^(0x)?[a-fA-F0-9]{64}$",
    },
    label: {
      type: "string",
      maxLength: 100,
      pattern: "^[a-zA-Z0-9\\s\\-_]*$",
    },
  },
  required: ["agentAddress", "privateKey"],
} as const;

export const AgentWalletParamsJSONSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
  },
  required: ["id"],
} as const;

export const CreateAgentWalletSchema = z.object({
  agentAddress: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^0x[a-f0-9]{40}$/i, "Invalid Ethereum address"),
  privateKey: z
    .string()
    .trim()
    .regex(/^(0x)?[a-fA-F0-9]{64}$/, "Invalid private key format")
    .transform((key) => (key.toLowerCase().startsWith("0x") ? key : `0x${key}`)),
  label: z
    .string()
    .max(100)
    .regex(/^[a-zA-Z0-9\s\-_]*$/, "Label contains invalid characters")
    .optional(),
});

export const AgentWalletParamsSchema = z.object({
  id: z.string().uuid(),
});

export const WalletAddressSelectSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    address: { type: "string" },
    chainId: { type: "integer" },
    isPrimary: { type: ["boolean", "null"] },
    createdAt: { type: "string", format: "date-time" },
  },
  required: ["id", "address", "chainId", "createdAt"],
} as const;

export type CreateAgentWalletInput = z.infer<typeof CreateAgentWalletSchema>;
export type AgentWalletParams = z.infer<typeof AgentWalletParamsSchema>;
