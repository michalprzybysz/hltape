# @hltape/api

Execution engine for trailing stop-loss orders on Hyperliquid. One Fastify process that spawns six
worker threads and serves the HTTP API the dashboard talks to.

Take-profit is not implemented. Despite the "SL/TP" naming carried over from earlier iterations,
the executor only ever submits `tpsl: "sl"` triggers.

## Architecture

The main thread spawns each worker and hands out `MessageChannel` port pairs, then steps out of the
way: the tick-to-order path runs worker-to-worker and never re-enters the event loop that is
serving HTTP.

```
Hyperliquid WS ──▶ Feeder ──▶ Brain ──▶ Dispatcher ──▶ Executor ──▶ Hyperliquid
                                                                        │
  Fastify main thread ◀── "this order is gone" ── Janitor ◀─────────────┘
        │
        └── HTTP: /orders /positions /wallets /log /auth   (Postgres via Drizzle)

  Every worker also holds a one-way port to the Logger worker.
```

| Worker | File | Job |
| --- | --- | --- |
| Feeder | `src/lib/feeder/worker.ts` | Subscribes to `allMids` over WebSocket, drops ticks that move the price by 0.001% or less, computes a rolling volatility estimate per symbol. |
| Brain | `src/lib/brain/worker.ts` | Holds every active order in memory and decides, per tick, whether the theoretical stop has moved far enough to be worth an exchange round-trip. Emits a decision with a priority score. |
| Dispatcher | `src/lib/dispatcher/worker.ts` | Sliding-window rate limit of 10 requests/second, last-win conflation per order, and ageing so low-priority orders do not starve. |
| Executor | `src/lib/executor/worker.ts` | Signs and submits with the user's agent key, retries with backoff, recovers a stale OID by looking it up, attaches the builder tag and the referral link. |
| Janitor | `src/lib/janitor/worker.ts` | Every 30 seconds, reconciles the database against the exchange and reports orders that no longer exist there. |
| Logger | `src/lib/logger/worker.ts` | Receives log and metric messages from every source over its own port and writes them to stdout, or ships them to BetterStack in production. |

The port wiring lives in `src/plugins/` — one plugin per worker, each spawning its worker and
transferring the ports the others need.

## Tech stack

- **Runtime**: Node.js >= 22, TypeScript strict
- **Framework**: Fastify 5 + worker threads via the `threads` library
- **Database**: PostgreSQL + Drizzle ORM (migrations in `drizzle/`)
- **Validation**: Zod, plus `drizzle-zod` for schema-derived types
- **Auth**: Better Auth with a SIWE plugin
- **Math**: `decimal.js` throughout, no floats. Prices go through `roundToHlPrice()` in
  `src/lib/utils/math.ts` — 5 significant digits, Hyperliquid's tick rule. Order sizes are rounded
  down to the asset's `szDecimals` from the exchange metadata when a position is opened
  (`src/routes/positions/index.ts`).
- **Monitoring**: Sentry and BetterStack (Logtail), both optional and off unless configured

## Setup

From the repository root:

```bash
cp apps/api/.env.example apps/api/.env
# Fill in DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, APP_ORIGIN, MASTER_KEY_HEX
pnpm install
pnpm db:migrate          # root script; apps/api itself has only db:migrate:prod
pnpm --filter @hltape/api dev
```

The server refuses to boot if a required variable is missing and prints every problem at once, by
name. That check is in [`src/lib/config.ts`](src/lib/config.ts).

## Scripts

```bash
pnpm dev              # build once, then tsc -w alongside fastify start -w
pnpm start            # build, then run for production
pnpm build:ts         # tsc
pnpm lint             # biome check
pnpm check-types      # tsc --noEmit
pnpm test             # node --test under c8; needs no database and no env vars
pnpm db:migrate:prod  # run migrations from the compiled output (node dist/db/migrate.js)
pnpm auth:generate    # regenerate the Better Auth Drizzle schema
```

There is no `build` script here, only `build:ts`, so `turbo run build` skips this workspace; the
API is covered by `check-types` instead.

## Key concepts

### Identity and state

- **UUID** — the order's database primary key, the single source of truth.
- **CLOID** — the same UUID as a Hyperliquid client order id (`0x` + the UUID without dashes). It
  is stable across modifies, which is what makes cancel-and-replace atomic.
- **OID** — Hyperliquid's own order id. It changes on every modify, so it is cached and refreshed,
  never trusted.

### Execution strategy

- **Modify = cancel + replace**, atomic because the CLOID does not change.
- **Last-win conflation** — the Dispatcher keeps at most one pending task per order.
- **Re-entrancy guard** — a `processingOrders` set in the Executor stops two decisions for the same
  order being in flight at once.

### Logging

- Main thread: `import { logger } from "../lib/logger"` and call `logger.info` / `warn` / `error`.
  There is no `fastify.telemetry` decorator.
- Worker threads: `createWorkerLogger("<Name>")` from `src/lib/logger/workerLogger.ts`; the
  matching plugin transfers a port into the worker at startup.
- Never `console.log` in production code.
- Log the *class* of an error, not the error object — a viem or Hyperliquid exception can echo the
  arguments it was given, and on the order paths those include a decrypted agent key.

See [`TELEMETRY_SYSTEM.md`](TELEMETRY_SYSTEM.md) for the whole logging path, the
`DEBUG_WORKERS` switch, and two rough edges in the BetterStack transport worth knowing about
before you rely on it.

## Environment variables

See [`.env.example`](.env.example); every variable is parsed and validated by
[`src/lib/config.ts`](src/lib/config.ts).

The builder fee and the referral code are **not** environment variables. They are compiled-in
constants in [`src/lib/revenue.ts`](src/lib/revenue.ts), they ship pointing at the project author,
and they are active on testnet as well as mainnet. See
[Builder fee and referral code](../../README.md#builder-fee-and-referral-code) in the root README.
