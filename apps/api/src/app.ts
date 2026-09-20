// apps/api/src/app.ts
import { join } from "node:path";
import AutoLoad, { type AutoloadPluginOptions } from "@fastify/autoload";
import type { FastifyPluginAsync, FastifyServerOptions } from "fastify";

export interface AppOptions extends FastifyServerOptions, Partial<AutoloadPluginOptions> {}

// Which upstream addresses may set X-Forwarded-For, and therefore decide `request.ip`.
//
// This is a proxy list rather than `true`: `true` trusts the whole X-Forwarded-For chain, so a
// client can prepend an address of its choosing and claim any IP it likes. Trusting only
// loopback, link-local and the private ranges means a proxy on the same host or the same private
// network is believed, while an instance exposed straight to the internet ignores the header.
//
// Note that fastify-cli only reads this export when the server is started with `-o`/`--options`,
// which the Dockerfile and the package.json scripts do not pass. `src/plugins/rateLimit.ts`
// therefore resolves the client address itself rather than depending on this; leave that in
// place even if you do start with `--options`. The remaining consumer of `request.ip` is the
// agent-wallet audit logging in `src/routes/wallets/handlers`.
const options: AppOptions = {
  trustProxy: "loopback, linklocal, uniquelocal",
};

const app: FastifyPluginAsync<AppOptions> = async (fastify, opts): Promise<void> => {
  void fastify.register(AutoLoad, {
    dir: join(__dirname, "plugins"),
    options: opts,
  });

  void fastify.register(AutoLoad, {
    dir: join(__dirname, "routes"),
    options: opts,
  });
};

export default app;
export { app, options };
