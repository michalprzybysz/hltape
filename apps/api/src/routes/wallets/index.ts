// apps/api/src/routes/wallets/index.ts
import type { FastifyPluginAsync } from "fastify";
import {
  createAgentWallet,
  deleteAgentWallet,
  listAgentWallets,
  listWalletAddresses,
} from "./handlers";
import {
  AgentWalletParamsJSONSchema,
  AgentWalletSelectSchema,
  CreateAgentWalletJSONSchema,
  WalletAddressSelectSchema,
} from "./schemas";

const wallets: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.addHook("preHandler", fastify.verifySession);

  fastify.get(
    "/",
    {
      schema: {
        response: {
          200: {
            type: "array",
            items: WalletAddressSelectSchema,
          },
        },
      },
    },
    listWalletAddresses,
  );

  fastify.get(
    "/agent",
    {
      schema: {
        response: {
          200: {
            type: "array",
            items: AgentWalletSelectSchema,
          },
        },
      },
    },
    listAgentWallets,
  );

  fastify.post(
    "/agent",
    {
      config: {
        rateLimit: { max: 5, timeWindow: "1 minute" },
      },
      schema: {
        body: CreateAgentWalletJSONSchema,
        response: {
          201: AgentWalletSelectSchema,
        },
      },
      logLevel: "warn",
    },
    createAgentWallet,
  );

  fastify.delete(
    "/agent/:id",
    {
      schema: {
        params: AgentWalletParamsJSONSchema,
        response: {
          204: { type: "null" },
        },
      },
    },
    deleteAgentWallet,
  );
};

export default wallets;
