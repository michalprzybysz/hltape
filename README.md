# Furious Abacus

Self-hostable trailing stop-loss automation for [Hyperliquid](https://hyperliquid.xyz) perpetuals.

[![Licence: AGPL v3](https://img.shields.io/badge/licence-AGPL--3.0--only-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org/)
[![CI](https://github.com/michalprzybysz/furious-abacus/actions/workflows/ci.yml/badge.svg)](https://github.com/michalprzybysz/furious-abacus/actions/workflows/ci.yml)

> [!WARNING]
> This software places real orders with real money on a live exchange. A bug, a misconfiguration
> or a dropped WebSocket can cost you a position. It is provided **as is, without warranty of any
> kind**, under the AGPL-3.0 — see [LICENSE](LICENSE), sections 15 and 16.
>
> Run it on Hyperliquid **testnet** (`TESTNET=true`) until you have watched it manage orders end to
> end. If you operate an instance for other people, their money is at stake too, and your legal,
> regulatory and tax position is entirely your own problem.

## What it does

You have a position open on Hyperliquid and you want a stop that follows the price up but never
back down. Furious Abacus does that: you attach a trailing distance to a position, and a background
engine watches the mid price and rewrites the stop order whenever the price moves in your favour by
enough to matter. The order it places is a reduce-only trigger market order, submitted under a
client order id derived from the database row, so a modify is an atomic cancel-and-replace rather
than a hope.

It is **non-custodial**. It never sees your wallet's private key. You authorise a Hyperliquid
**agent wallet** (also called an API wallet) — a key that can sign trades on your account but
**cannot withdraw or transfer funds**. Only that agent key is stored by the server, encrypted at
rest. The worst case if the server is compromised is unwanted trading on your account, not drained
funds. You can revoke the agent on Hyperliquid at any time.

The dashboard also lets you open a position directly — market entry (an IOC order with 2% slippage
room), with leverage and cross/isolated margin mode — and attach the trailing stop in the same
flow, list your positions and orders, and read the engine's log for each order.

Take-profit is not implemented: despite the "SL/TP" naming carried over from earlier iterations,
the executor only ever submits `tpsl: "sl"` triggers today.

## Builder fee and referral code

> [!IMPORTANT]
> **This project ships with revenue collection switched on, pointing at its author.** Out of the
> box, every order this software places is tagged with the author's Hyperliquid builder address,
> and every new user who has no referrer is linked to the author's referral code. If you run your
> own instance and change nothing, the author earns from your users' trades, not you.
>
> This is deliberate and it is trivially removable. Both values are plain constants in two files.

Hyperliquid has two mechanisms an operator can earn from:

- **Builder fee.** An order may carry a "builder tag" — an address plus a rate. The exchange
  collects that fee as part of the trading fee it already charges and credits it to the builder
  address. It is not an extra charge layered on top by this software.
- **Referral code.** A user who is not already referred by someone can be linked to a referral
  code on their first order.

Neither is configured through the environment. Both are compiled in, so that changing them is a
deliberate edit to source you can see in a diff rather than a variable someone forgets to set:

| File | Constants |
| --- | --- |
| [`apps/api/src/lib/revenue.ts`](apps/api/src/lib/revenue.ts) | `BUILDER_ADDRESS`, `BUILDER_FEE_TENTHS_BPS`, `REFERRAL_CODE` |
| [`apps/app/src/lib/revenue.ts`](apps/app/src/lib/revenue.ts) | `BUILDER_ADDRESS`, `MAX_BUILDER_FEE` |

**To earn it yourself**, put your own Hyperliquid address in `BUILDER_ADDRESS` in *both* files —
they must match, because the user approves a fee for one specific address on-chain and Hyperliquid
rejects an order tagged with a builder they have not approved — and your own code in
`REFERRAL_CODE`.

**To collect nothing**, set `BUILDER_ADDRESS` to `""` in both files and `REFERRAL_CODE` to `""`.
This is a fully supported path, not a degraded one: the server then omits the `builder` key from
every order payload, the dashboard skips the on-chain fee approval step in onboarding, and the
referral lookup never runs. Nothing else changes.

`BUILDER_FEE_TENTHS_BPS` is Hyperliquid's `f` field, in **tenths of a basis point**: `1` = 0.001%,
`10` = 0.01%. It **cannot exceed what each user approved on-chain** — that ceiling is
`MAX_BUILDER_FEE` on the dashboard side, which is what the user actually signs. Raise the rate past
someone's approved maximum and Hyperliquid rejects their orders outright, so the two files have to
move together.

If you run an instance for other people and leave either mechanism on, **tell them.** The agent
onboarding dialog states that a referral link may happen and shows the fee ceiling before the user
signs, but there is no automatic disclosure anywhere else — the in-app fee notice was removed and
this README is now where it lives. If you run an instance for other people, disclosing both is on
you. Taking an undisclosed cut of someone's trades is, at best, a consumer-protection problem.

## How it works

The API is one Fastify process that spawns six worker threads and wires them together with
`MessageChannel` pairs, so the hot path never goes through the main thread.

| Worker | File | Job |
| --- | --- | --- |
| Feeder | `apps/api/src/lib/feeder/worker.ts` | Subscribes to Hyperliquid `allMids` over WebSocket, filters out noise below 0.001%, and computes a rolling volatility estimate per symbol. |
| Brain | `apps/api/src/lib/brain/worker.ts` | Holds every active order in memory and decides, per price tick, whether the theoretical trailing stop has moved far enough to be worth an exchange round-trip. Emits a decision with a priority score. |
| Dispatcher | `apps/api/src/lib/dispatcher/worker.ts` | Rate-limits to 10 requests/second in a sliding window and conflates: if three new decisions arrive for one order while it is queued, only the newest survives. Ageing stops low-priority orders from starving. |
| Executor | `apps/api/src/lib/executor/worker.ts` | Signs and submits to Hyperliquid with the user's agent key, retries with backoff, recovers a stale order id by looking it up, and attaches the builder tag and the referral link — both on by default, see [Builder fee and referral code](#builder-fee-and-referral-code). |
| Janitor | `apps/api/src/lib/janitor/worker.ts` | Every 30 seconds, reconciles the database against the exchange and reports orders that no longer exist there so the main thread can evict them from Brain and Dispatcher. |
| Logger | `apps/api/src/lib/logger/worker.ts` | Receives structured log and metric messages from every other worker over its own port and ships them to stdout, or to BetterStack in production. |

```
                    Hyperliquid WebSocket
                             |
                             v
                        +---------+
                        | Feeder  |  price + volatility
                        +---------+
                             |  MessageChannel
                             v
                        +---------+
                        |  Brain  |  "should the stop move?"
                        +---------+
                             |  decision + priority score
                             v
                        +------------+
                        | Dispatcher |  rate limit, conflate, age
                        +------------+
                             |  at most 10 tasks/second
                             v
                        +----------+                 +-------------+
                        | Executor | --------------> | Hyperliquid |
                        +----------+   signed order  +-------------+
                             ^                              ^
   +----------+   routes     |                              | reconcile
   |  Fastify | -------------+                        +---------+
   | main     | <----------------------------------- | Janitor |
   | thread   |   "this order is gone"                +---------+
   +----------+
        |
        +-- HTTP: /orders /positions /wallets /log /auth   (Postgres via Drizzle)

   Every worker also holds a one-way port to the Logger worker (not drawn).
```

Why the split: the price feed and the order path have incompatible failure modes. A Hyperliquid
order round-trip takes tens to hundreds of milliseconds and can hang; `allMids` delivers ticks for
every symbol continuously. If both ran on one event loop, a slow exchange call would stall price
ingestion, and a burst of ticks would delay the order that was supposed to protect the position.
Splitting them means the Feeder keeps consuming ticks while the Executor is blocked, the Brain's
in-memory decision loop never touches the network or the database, and the Dispatcher can drop
intermediate decisions that the exchange would only have overwritten anyway. The main thread serves
HTTP and owns Postgres; it is not in the tick-to-order path at all.

Supporting concepts, if you go reading the code:

- **CLOID** — the order's database UUID rendered as a Hyperliquid client order id (`0x` + the UUID
  without dashes). It is stable across modifies, which is what makes cancel-and-replace atomic.
- **OID** — Hyperliquid's own order id. It changes on every modify, so it is cached and refreshed,
  never trusted.
- **Last-win conflation** — the Dispatcher queues at most one pending task per order.
- All price and size arithmetic uses `decimal.js`. No floats.

More detail lives in [`apps/api/README.md`](apps/api/README.md), and the logging path — which every
one of those workers sits on — in
[`apps/api/TELEMETRY_SYSTEM.md`](apps/api/TELEMETRY_SYSTEM.md).

## Repository layout

```
apps/
├── api/          Fastify orchestrator + worker threads (the execution engine)
└── app/          Next.js 16 trading dashboard

packages/
├── sdk/          Typed API client and Hyperliquid SDK wrapper
├── ui/           Shared UI components (shadcn/ui + Tailwind v4)
├── messages/     i18n message catalogue and types
└── coin-names/   Cryptocurrency display-name mapping
```

Turborepo + pnpm workspaces. TypeScript strict everywhere, Biome for lint and format.

## Getting started

### Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | >= 22 | Enforced by `engines` in every manifest |
| pnpm | 10.0.0 | Pinned via `packageManager`; `corepack enable` picks it up |
| PostgreSQL | 14+ | Local, Docker, or hosted (Neon, Supabase, RDS) |

You also need a [WalletConnect](https://cloud.walletconnect.com/) project id for the dashboard's
wallet connector. It is free.

### Steps

```bash
# 1. Clone
git clone https://github.com/michalprzybysz/furious-abacus.git
cd furious-abacus

# 2. Install
pnpm install

# 3. Install the git hooks (Biome, secretlint, commitlint). Not automatic.
pnpm lefthook install

# 4. Environment. Both targets are gitignored; the .env.example files are the documentation.
cp apps/api/.env.example apps/api/.env
cp apps/app/.env.example apps/app/.env.local

# 5. Generate the two server secrets and paste them into apps/api/.env
openssl rand -base64 32   # -> BETTER_AUTH_SECRET
openssl rand -hex 32      # -> MASTER_KEY_HEX  (exactly 64 hex characters)

# 6. Create an empty database and point DATABASE_URL at it, e.g.
createdb furious_abacus
# DATABASE_URL=postgresql://localhost:5432/furious_abacus

# 7. Apply the schema
pnpm db:migrate

# 8. Run everything
pnpm dev
```

The API comes up on **http://localhost:4000**, but only because `apps/api/.env.example` sets
`PORT=4000` and `fastify-cli` loads that file itself. `fastify-cli`'s own fallback is 3000, which
collides with the dashboard — so if you write your own `.env`, keep `PORT` in it. The dashboard comes up on **http://localhost:3000**
(`next dev`'s default). `APP_ORIGIN` and `NEXT_PUBLIC_API_URL` must agree with those two, or CORS
and SIWE verification will refuse each other.

Leave `TESTNET=true` and `NEXT_PUBLIC_TESTNET=true`. Both have to be set, on both sides — the API
and the dashboard choose their Hyperliquid endpoints independently, and a mismatch means the UI
shows you one network while your orders go to the other.

If a required variable is missing, the API refuses to boot and prints **every** problem at once,
by name, rather than failing on the first one. That check lives in `apps/api/src/lib/config.ts`.

## Configuration

### API — `apps/api/.env`

| Variable | Required | Default | What it does |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | — | PostgreSQL connection string. |
| `BETTER_AUTH_SECRET` | yes | — | Signs Better Auth sessions. `openssl rand -base64 32`. |
| `BETTER_AUTH_URL` | yes | — | Public base URL of this server's auth endpoints, e.g. `http://localhost:4000/auth`. |
| `APP_ORIGIN` | yes | — | Origin of the dashboard allowed to call this API. Used for CORS and SIWE verification. |
| `MASTER_KEY_HEX` | yes | — | 64 hex characters (32 bytes). Encrypts agent-wallet private keys at rest. **Back it up** — lose it and every stored agent wallet is unreadable. |
| `PORT` | no | `4000` | TCP port the API listens on. |
| `NODE_ENV` | no | `development` | Sentry and the BetterStack log transport only activate on `production`. |
| `TESTNET` | no | `true` | `"true"` uses Hyperliquid testnet; anything else is mainnet. |
| `LOGTAIL_SOURCE_TOKEN` | no | unset | BetterStack (Logtail) source token. Unset logs to stdout only. |
| `LOGTAIL_ENDPOINT` | no | unset | Ingest host for that source. |
| `SENTRY_DSN` | no | unset | Server-side error reporting. Unset disables Sentry. |
| `DEBUG_WORKERS` | no | unset | Comma-separated workers to debug-log: `brain`, `feeder`, `dispatcher`, `executor`, `janitor`, `api`, `*`. |
| `DEBUG_METRICS` | no | `false` | `"true"` logs worker metrics to the console. |

### Dashboard — `apps/app/.env.local`

Everything prefixed `NEXT_PUBLIC_` is **inlined into the browser bundle at build time**. It is
public. Never put a secret there, and remember that changing one requires a rebuild, not a restart.

| Variable | Required | Default | What it does |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | yes | — | Base URL of the API. |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | yes | — | Must match `BETTER_AUTH_URL` on the API. |
| `NEXT_PUBLIC_WALLETCONNECT_ID` | yes | — | WalletConnect project id. |
| `NEXT_PUBLIC_TESTNET` | no | `true` | `"false"` for mainnet. Keep in sync with `TESTNET`. |
| `NEXT_PUBLIC_BRAND_NAME` | no | `Furious Abacus` | Name in page titles, the wallet modal and the SIWE message. |
| `NEXT_PUBLIC_LOGOKIT_TOKEN` | no | unset | Publishable [LogoKit](https://logokit.com) token for instrument icons. Unset renders a letter placeholder instead of calling the service. |
| `NEXT_PUBLIC_CSP_EXTRA_ORIGINS` | no | `""` | Space-separated origins appended to the `script-src` and `connect-src` CSP directives. |
| `NEXT_PUBLIC_SENTRY_DSN` | no | unset | Browser error reporting. |
| `SENTRY_ORG` | no | unset | Build time only. Source-map upload is skipped unless all three Sentry build variables are set. |
| `SENTRY_PROJECT` | no | unset | Build time only. |
| `SENTRY_AUTH_TOKEN` | no | unset | Build time only. |

## Branding a fork

No operator *branding* is compiled in — but the revenue settings are, so read
[Builder fee and referral code](#builder-fee-and-referral-code) as well as this section. To run
this as your own thing, set in `apps/app/.env.local`:

| Variable | Effect |
| --- | --- |
| `NEXT_PUBLIC_BRAND_NAME` | Page titles, the header wordmark, the WalletConnect modal, the SIWE sign-in message. |
| `NEXT_PUBLIC_LOGOKIT_TOKEN` | Your own LogoKit token for instrument icons. Unset renders a letter placeholder. |
| `NEXT_PUBLIC_CSP_EXTRA_ORIGINS` | Extra origins for your own CDN or telemetry subdomains. |

All of these are read through [`apps/app/src/lib/brand.ts`](apps/app/src/lib/brand.ts), which is the
single place to add another one.

**This project ships no terms of service, privacy policy or cookie notice, and no consent banner.**
It never did anything for you that you could rely on, so it is gone rather than misleading. If you
run an instance for other people you are the data controller and the operator: write those
documents yourself, for your own jurisdiction, and add the routes you need.

## Development

### Root scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Runs the dev task of every workspace that has one (the API and the dashboard). |
| `pnpm build` | Production build. Note that `apps/api` has no `build` script — only `build:ts` — so Turborepo skips it here; the API is covered by `check-types`. |
| `pnpm lint` | `biome check` across every workspace. |
| `pnpm check-types` | `tsc --noEmit` across every workspace. |
| `pnpm db:generate` | Generate a Drizzle migration from the schema. |
| `pnpm db:migrate` | Apply migrations. |
| `pnpm db:push` | Push the schema without a migration file (development only). |
| `pnpm db:studio` | Open Drizzle Studio. |

### Per workspace

| Command | What it does |
| --- | --- |
| `pnpm --filter @furious-abacus/api dev` | API only: `tsc -w` plus `fastify start -w`. |
| `pnpm --filter @furious-abacus/api start` | Compile and run the API for production. |
| `pnpm --filter @furious-abacus/api test` | `node --test` with c8 coverage. |
| `pnpm --filter @furious-abacus/api db:migrate:prod` | Run migrations from the compiled output. |
| `pnpm --filter @furious-abacus/api auth:generate` | Regenerate the Better Auth Drizzle schema. |
| `pnpm --filter @furious-abacus/app dev` | Dashboard only. |
| `pnpm --filter @furious-abacus/app build` | Production build of the dashboard. |

The API test suite needs no environment variables and no database — tests register the units they
exercise on their own Fastify instance rather than booting the whole app. Coverage is thin today;
widening it is welcome.

Formatting and linting are Biome (2-space indent, LF, double quotes, 100 columns), configured in
`biome.json`. The lefthook `pre-commit` hook formats staged files and runs secretlint on them; the
`commit-msg` hook runs commitlint, which **rejects** anything that is not a
[Conventional Commit](https://www.conventionalcommits.org/).

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request — it has the allowed commit
types, the where-to-change-what table and a trading-safety section that is not optional reading.

## Deployment

What is actually in this repository:

- **[`Dockerfile`](Dockerfile)** (repo root) — a multi-stage production image for **the API only**.
  It installs the workspace with a frozen lockfile, compiles `apps/api` with `tsc`, then reinstalls
  production dependencies into a clean layer and copies in `dist/`, `drizzle/` and the built
  `packages/`. It exposes **8080** and its `CMD` is
  `pnpm exec fastify start -l info -a 0.0.0.0 -p 8080 dist/app.js`. Build it from the repo root,
  not from `apps/api`; the build context needs the whole workspace. (`apps/api/Dockerfile` is a
  byte-identical copy of it — build either, from the root.)
- **[`apps/app/vercel.json`](apps/app/vercel.json)** — four settings telling Vercel this is a
  Next.js project, to install with pnpm and to build with
  `pnpm turbo build --filter=@furious-abacus/app`. Nothing in it is deployment-specific, so it
  works for any account.

That is the whole list. There is no platform configuration in the repository — no fly.toml, no
Compose file, no Kubernetes manifest, no Terraform. Where and how you run the image is yours to
decide; anything that takes a Dockerfile and a set of environment variables will do.

Migrations are not run by the image's entrypoint. Apply them yourself against the compiled output
before the new revision serves traffic — `pnpm run db:migrate:prod` from the image, which resolves
because the final `WORKDIR` is `/app/apps/api`. Most platforms have a hook for exactly this (a
release command, a pre-deploy job, an init container); wire it there rather than into `CMD`, so a
restart does not re-run migrations.

The dashboard is a stock Next.js 16 application: `pnpm --filter @furious-abacus/app build` then
`next start`, on Vercel or anywhere else that runs Next.js. The only thing to remember is that
`NEXT_PUBLIC_*` variables are baked in at build time, so a branding or builder-address change means
a rebuild, not a restart.

Neither the API nor the dashboard is deployed by CI.
[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs lint, type check and build;
[`.github/workflows/security.yml`](.github/workflows/security.yml) runs a dependency audit and a
secretlint scan. The audit prints everything but only fails the build on a **new critical**
advisory — the reasoning and the current counts are in comments in that file. Wiring up your own
deploy is left to you.

## Security

Agent-wallet private keys are encrypted at rest with **AES-256-GCM** — a 12-byte random IV per
record, the 16-byte authentication tag stored alongside the ciphertext, and the key derived from
nothing more than the raw 32 bytes of `MASTER_KEY_HEX`. See
[`apps/api/src/lib/crypto.ts`](apps/api/src/lib/crypto.ts). Treat `MASTER_KEY_HEX` as the most
sensitive value in your deployment: it decrypts every stored agent key, and losing it makes every
stored agent wallet permanently unreadable.

Authentication is **SIWE** (Sign-In with Ethereum) over Better Auth: users prove control of a wallet
by signing a nonce-bearing message, and the server keeps a session. No passwords exist.

**Rate limiting and your reverse proxy.** The API is limited to 100 requests per minute per client,
with tighter per-route limits on the four endpoints that spend money or create credentials:
`POST /orders` at 10/min, `PATCH /orders/:id` at 30/min, `POST /positions` at 5/min and
`POST /wallets/agent` at 5/min. The bucket key is the client address, and that address is resolved
in
[`apps/api/src/plugins/rateLimit.ts`](apps/api/src/plugins/rateLimit.ts) rather than taken from
`request.ip`, because a Fastify server that has not been told to trust a proxy reports the proxy's
address for every caller — which would put the whole deployment in one bucket. `X-Forwarded-For` is
believed only when the connection itself arrives from loopback, a link-local or a private address,
and only its last entry is used, so a client cannot choose its own bucket and an instance exposed
directly to the internet ignores the header entirely. Two deployment consequences: if your proxy
reaches the API from a **public** address (a CDN in front of a public origin), or if you run **more
than one** proxy in front of it, adjust that resolver — otherwise everything behind that proxy
shares a bucket. There is deliberately no allow-list: the obvious one, loopback, is exactly where
requests come from under `docker run -p 127.0.0.1:8080:8080` behind a host nginx.

**Error reporting.** Sentry is optional and initialises only when `NODE_ENV=production` **and** a
DSN is set — in development it is inert whatever you configure. When it does run it is configured
not to forward credentials: `maxIncomingRequestBodySize: "none"` stops the body being read at all,
and a `beforeSend` / `beforeSendTransaction` scrubber deletes `data`, `cookies` and the
`authorization`, `cookie`, `proxy-authorization`, `set-cookie` and `x-api-key` headers from every
event and transaction. That matters because the body of `POST /wallets/agent` is a plaintext agent
private key and the session cookie is a live bearer credential. The trace sample rate is a
compiled-in `0.1`, not an environment variable, so turning Sentry on cannot surprise you with a
bill for one event per request.

Route handlers log the *class* of an error rather than the error object, for the same reason — a
viem or Hyperliquid exception can echo the arguments it was given, and on the order paths those
arguments include a decrypted agent key. Keep both habits if you add routes.

Found a vulnerability? Do not open a public issue. Follow [SECURITY.md](SECURITY.md).

## Licence

**GNU Affero General Public License v3.0 only.** Full text in [LICENSE](LICENSE).

In practice, the clause that matters here is section 13. If you modify this software and run it as
a network service — a hosted instance other people can use — you must offer those users the
corresponding source of **your modified version**. Running a private fork you never expose to
anyone else does not trigger that; running a public instance does. Plan for it before you deploy,
not after someone asks.

Copyright holder: Michał Kamil Przybysz (the `author` field in `package.json`), and each
contributor for their own contributions. There is no CLA; contributions are licensed under the same
terms.

## Contributing

Bug reports, fixes and tests are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md) — it covers
the first run, where each kind of change belongs, the commit-message rules and the testnet
requirement for changes to the executor, dispatcher or brain.

Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).

Security issues go through [SECURITY.md](SECURITY.md), never through a public issue.
