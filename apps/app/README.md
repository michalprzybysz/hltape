# @hltape/app

Trading dashboard for Hyperliquid: open a position, attach a trailing stop, watch what the
execution engine does with it. Talks to [`@hltape/api`](../api/README.md) over HTTP through
[`@hltape/sdk`](../../packages/sdk/README.md).

## Architecture

Next.js 16 App Router. Server components render the shell; the live data is fetched client-side by
React Query and kept fresh by polling — there is no WebSocket and no SSE subscription in this app.
The intervals are set per hook in `src/lib/`:

| Data | Hook | Interval |
| --- | --- | --- |
| Positions | `usePositionsQuery` | 10s |
| Hyperliquid mid prices | `useAllMidsQuery` | 10s |
| Orders | `useOrdersQuery` | 30s |
| Execution log | `useLogsQuery` | 30s |
| Agent wallets | `useAgentWalletsQuery` | 30s |

(The API does carry an SSE plugin, `apps/api/src/plugins/sse.ts`, but nothing in the dashboard
consumes it yet.)

## Tech stack

- **Framework**: Next.js 16 (App Router), React 19, React Compiler
- **Styling**: Tailwind v4 and shadcn/ui via `@hltape/ui`
- **Data and forms**: TanStack React Query, React Hook Form with Zod resolvers
- **Wallet and auth**: wagmi + viem, RainbowKit, SIWE over Better Auth
- **i18n**: next-intl, catalogue in `@hltape/messages`
- **Monitoring**: Sentry, optional and off unless `NEXT_PUBLIC_SENTRY_DSN` is set

## Design

Dark theme only — `<html>` is rendered with a hard-coded `dark` class in `src/app/layout.tsx`;
there is no theme switcher. Long is `green-500`, short is `red-500`
(`src/components/PositionSide.tsx`).

## Setup

From the repository root:

```bash
cp apps/app/.env.example apps/app/.env.local
# NEXT_PUBLIC_API_URL, NEXT_PUBLIC_BETTER_AUTH_URL and NEXT_PUBLIC_WALLETCONNECT_ID are required
pnpm install
pnpm --filter @hltape/app dev
```

Open [http://localhost:3000](http://localhost:3000). The API has to be running too — see the
[root README](../../README.md#getting-started) for the full first run.

## Scripts

```bash
pnpm dev              # next dev
pnpm build            # next build
pnpm start            # next start
pnpm lint             # biome check
pnpm check-types      # tsc --noEmit
```

There is no test script in this workspace.

## Configuration

See [`.env.example`](.env.example). Everything prefixed `NEXT_PUBLIC_` is inlined into the browser
bundle at build time: it is public, it must never hold a secret, and changing one needs a rebuild
rather than a restart.

- **Branding** — `NEXT_PUBLIC_BRAND_NAME`, `NEXT_PUBLIC_LOGOKIT_TOKEN` and
  `NEXT_PUBLIC_CSP_EXTRA_ORIGINS` are read through [`src/lib/brand.ts`](src/lib/brand.ts), which is
  the single place to add another one.
- **Builder fee** — not an environment variable. `BUILDER_ADDRESS` and `MAX_BUILDER_FEE` are
  compiled-in constants in [`src/lib/revenue.ts`](src/lib/revenue.ts), they ship pointing at the
  project author, and `BUILDER_ADDRESS` must match the one in `apps/api/src/lib/revenue.ts`. See
  [Builder fee and referral code](../../README.md#builder-fee-and-referral-code) in the root README.
