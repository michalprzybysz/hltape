// apps/api/src/plugins/sse.ts

import sse, { type SSEPluginOptions } from "@fastify/sse";
import fp from "fastify-plugin";

export default fp<SSEPluginOptions>(async (fastify) => {
  fastify.register(sse);
});
