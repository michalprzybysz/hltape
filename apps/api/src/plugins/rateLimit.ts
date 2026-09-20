// apps/api/src/plugins/rateLimit.ts
import rateLimit from "@fastify/rate-limit";
import type { FastifyRequest } from "fastify";
import fp from "fastify-plugin";

// IPv4 ranges a reverse proxy or a PaaS edge plausibly talks to us from: loopback, the three
// private blocks and link-local. Anything outside them is treated as a direct client.
const PRIVATE_IPV4 = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
];

/**
 * Whether a connection from this address may set X-Forwarded-For.
 *
 * This is the "known proxy list" bound: only loopback, unique-local and link-local addresses are
 * believed. A request arriving straight off the internet is never allowed to describe itself.
 */
function isTrustedProxyAddress(address: string): boolean {
  // Node reports an IPv4 peer on a dual-stack socket as "::ffff:10.0.0.1".
  const lower = address.toLowerCase();
  const addr = lower.startsWith("::ffff:") ? lower.slice(7) : lower;

  if (PRIVATE_IPV4.some((range) => range.test(addr))) {
    return true;
  }

  // ::1 loopback, fc00::/7 unique-local, fe80::/10 link-local.
  return addr === "::1" || /^(f[cd]|fe[89ab])/.test(addr);
}

/**
 * The address the limiter buckets on.
 *
 * @fastify/rate-limit keys on `request.ip`, which is the socket peer unless Fastify itself was
 * built with `trustProxy` — and fastify-cli only honours the `options` export from app.ts when
 * it is started with `--options`, which none of the shipped commands do. Behind a proxy, that
 * puts every caller in one bucket, so a single client can exhaust the limit for everyone else on
 * a service whose job is firing stop-losses on time.
 *
 * So resolve the address here, and bound it. X-Forwarded-For is believed only when the
 * connection itself came from loopback or a private range, and only its last entry is used — the
 * one the nearest proxy appended. A client that sends its own X-Forwarded-For only prepends to
 * that list, so it cannot pick its own bucket, and a directly exposed instance ignores the header
 * outright. If you run more than one proxy in front of the API, take more than one hop here.
 */
function clientAddress(request: FastifyRequest): string {
  const socketAddress = request.socket.remoteAddress;
  if (!socketAddress || !isTrustedProxyAddress(socketAddress)) {
    return request.ip;
  }

  const forwarded = request.headers["x-forwarded-for"];
  const chain = Array.isArray(forwarded) ? forwarded.join(",") : (forwarded ?? "");
  const hops = chain.split(",");
  const nearest = hops[hops.length - 1]?.trim();

  return nearest || request.ip;
}

export default fp(async (fastify) => {
  fastify.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    keyGenerator: clientAddress,
    // No allowList. The previous ["127.0.0.1", "::1"] was a total bypass under the ordinary
    // `docker run -p 127.0.0.1:8080:8080` plus host reverse proxy layout, where every request
    // does arrive from loopback.
  });
});
