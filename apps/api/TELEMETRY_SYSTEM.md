# Logging and telemetry

How `apps/api` logs. The goal is that no thread doing time-sensitive work ever blocks on
serialisation or network I/O: every component hands a plain object to a `MessagePort` and forgets
about it, and one dedicated worker does the formatting, the console write and the upload.

Paths in this document are relative to `apps/api/`.

## The three files

| File | Runs in | What it is |
| --- | --- | --- |
| `src/lib/logger/index.ts` | main thread | The `logger` object the Fastify side imports — `debug`, `info`, `warn`, `error`, `fatal`, `metric`. Also owns `initLogger()` / `shutdownLogger()` and the `workerPorts` map. |
| `src/lib/logger/workerLogger.ts` | worker threads | `createWorkerLogger(name)` returns a `WorkerLogger` with `debug`, `info`, `warn`, `error`. It starts portless and logs to the console until `setPort()` is called. |
| `src/lib/logger/worker.ts` | its own thread | The sink. Receives every source's messages and writes them to stdout — or, in production with a token, ships them to BetterStack (Logtail) instead. |

`src/plugins/logger.ts` wires them together. It runs `initLogger()`, which spawns the sink worker
and opens one `MessageChannel` per source — `API`, `Brain`, `Feeder`, `Dispatcher`, `Executor`,
`Janitor` — then decorates the Fastify instance with `brainLoggerPort`, `feederLoggerPort`,
`dispatcherLoggerPort`, `executorLoggerPort` and `janitorLoggerPort`. Each worker's own plugin
transfers its port into the worker with `setLoggerPort()`. On `onClose` the plugin flushes and
terminates the sink.

There is no `fastify.telemetry` decorator. Main-thread code imports `logger` directly:

```ts
// anywhere on the main thread
import { logger } from "../lib/logger";

logger.info("[Assets] Loaded assets", { count: symbolToIndex.size });
logger.error("[Brain] Failed to remove order", { orderId, err: String(err) });
```

Worker code creates its logger at module scope and lets the plugin hand it a port later:

```ts
// src/lib/executor/worker.ts
import { createWorkerLogger } from "../logger/workerLogger";

const logger = createWorkerLogger("Executor");
```

Never use `console.log` in production code. The one place it is correct is the fallback inside the
logger itself, for messages emitted before a port exists.

## Where the logs actually go

`src/lib/logger/worker.ts` decides this once, at module load, from two flags:

```ts
const hasValidToken = isProduction && LOGTAIL_SOURCE_TOKEN.length > 0;
const FORCE_CONSOLE = !isProduction || !hasValidToken;
```

They are exact opposites, so exactly one destination is ever live:

| `NODE_ENV` | `LOGTAIL_SOURCE_TOKEN` | Destination |
| --- | --- | --- |
| anything but `production` | anything | stdout, coloured by level. The token is ignored. |
| `production` | empty | stdout. Nothing is lost, nothing is uploaded. |
| `production` | set | BetterStack. **Console output is off.** |

`LOGTAIL_ENDPOINT` sets a custom ingest host and is optional; leave it empty for the default.

### Two rough edges in that path

Both live in `safeLog()` and its caller, and both only bite in the production-with-token column.

- **`error` is uploaded by neither route.** `safeLog()` skips the upload for `level === "error"`
  (`logtail && !isDead && level !== "error"`), and the console branch is behind `FORCE_CONSOLE`,
  which is false in exactly that configuration. There are 27 `logger.error` call sites in
  `src/`; in production with a token they reach nothing. Fastify's own request logging is
  unaffected — this is only the worker telemetry path.
- **A `401` from Logtail stops logging altogether** rather than falling back. The worker prints
  `CRITICAL: Invalid Token. Disabling cloud.` once, sets `isDead`, and from then on
  `registerSource`'s `if (isDead && !FORCE_CONSOLE) return;` drops every incoming message.

`logger.fatal()` has the same shape of problem — `@logtail/core` exposes `debug`, `info`, `warn`
and `error` only, so `logtail["fatal"]` throws and surfaces as `[Logger Worker] Panic`. Nothing
calls it today (the `this.log.fatal` in `src/routes/orders/handlers/create.ts` is Fastify's pino
logger, not this one), so it is latent rather than live.

If you are deploying this for real, fix the first two before you rely on BetterStack for
incident response.

## Metrics

`logger.metric(name, value, tags)` exists on the main-thread logger and produces a `MetricMessage`
the sink understands. It is **not implemented on `WorkerLogger`**, and nothing in the tree calls it
today — the plumbing is there, the callers are not. `DEBUG_METRICS=true` prints metric messages to
the console when console output is on; it does nothing until something emits one.

Note that `logger.metric()` silently drops the message when the logger has not been initialised,
where `logger.info()` and friends fall back to `console.log`.

## Debug logging

Debug messages are dropped unless the source is named in `DEBUG_WORKERS`, which is read from
`process.env` independently in `index.ts` and in `workerLogger.ts` (worker threads inherit
`process.env`, not the parsed config).

```env
# comma-separated, case-insensitive
DEBUG_WORKERS=brain,executor

# everything
DEBUG_WORKERS=*
# or
DEBUG_WORKERS=all

# off — the default, just leave it unset
DEBUG_WORKERS=
```

Recognised names:

| Name | Source |
| --- | --- |
| `api` | main thread (Fastify, plugins, routes) |
| `brain` | trailing-stop decision loop |
| `feeder` | Hyperliquid WebSocket price feed |
| `dispatcher` | rate-limited task queue |
| `executor` | order submission |
| `janitor` | reconciliation of orphaned orders |

`DEBUG_WORKERS` only gates the `debug` level. `info`, `warn` and `error` are always emitted by the
call site — see the rough edges above for what happens to them afterwards.

## BetterStack setup

1. Create an account at [BetterStack](https://betterstack.com/) and add a Source of type Node.js.
2. Copy the source token into `LOGTAIL_SOURCE_TOKEN` in `apps/api/.env`, and the ingest host into
   `LOGTAIL_ENDPOINT` if the source shows one.
3. Run with `NODE_ENV=production`. Anything else keeps logs on stdout regardless of the token.

Never commit the token. `.env` is gitignored and the secretlint hook scans staged files, but both
are conveniences, not guarantees.

Every log record carries `src` (the source name, as registered: `API`, `Brain`, `Feeder`,
`Dispatcher`, `Executor`, `Janitor`) and `ts` (the emitting timestamp in milliseconds) alongside
whatever context object the call site passed, so a BetterStack query can filter on `src = "Brain"`
or on any field a call site adds. There is no shared schema beyond those two — the rest of the
field names are entirely up to the call sites.

## What this does not do

- No disk logs, no rotation, no local log files.
- No sampling, no rate limiting on the log path itself. A hot loop logging at `info` will send
  every line.
- No redaction. The logger writes what it is given, which is why route handlers log the *class* of
  an error rather than the error object — a viem or Hyperliquid exception can echo the arguments it
  was given, and on the order paths those include a decrypted agent key. Keep that habit.
