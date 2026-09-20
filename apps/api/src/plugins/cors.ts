// apps/api/src/plugins/cors.ts
import fastifyCors, { type FastifyCorsOptions } from "@fastify/cors";
import fp from "fastify-plugin";

export default fp<FastifyCorsOptions>(async (fastify) => {
  fastify.register(fastifyCors, {
    origin: process.env.APP_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
    maxAge: 86400,
  });
});
