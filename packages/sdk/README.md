# @hltape/sdk

Typed client for the `@hltape/api` HTTP surface, plus a thin wrapper over the Hyperliquid
public SDK. Consumed by `apps/app`; it ships as TypeScript source (`main` and `types` both point at
`src/index.ts`), so there is no build step to run before importing it inside the workspace.

## Structure

```
src/
├── httpClient.ts     ky instance: prefixUrl, credentials: "include", error-message unwrapping
├── index.ts          createSdk() and the public types
├── hyperliquid/      Direct-to-Hyperliquid calls (no API round-trip)
├── logging/          GET /log
├── orders/           /orders
├── positions/        /positions
└── wallets/          /wallets and /wallets/agent
```

## Usage

One `createSdk()` call returns every module. There is no per-resource constructor.

```typescript
import { createSdk } from "@hltape/sdk";

const api = createSdk({
  url: "http://localhost:4000",
  hyperliquid: { isTestnet: true },
});

const { positions } = await api.positions.getAll();
const order = await api.orders.create({ ... });
```

`url` is required. `hyperliquid` defaults to `{ isTestnet: false }`, and `hooks` is passed straight
through to ky if you need to add your own.

The client sends `credentials: "include"`, so the Better Auth session cookie travels with every
request. That means the API's `APP_ORIGIN` must match the page's origin or CORS rejects the call.

## Modules

| Module | Methods | Talks to |
| --- | --- | --- |
| `api.orders` | `getAll()`, `getById(id)`, `create(input)`, `update(id, patch)` | `/orders` |
| `api.positions` | `getAll()`, `open(request)` | `/positions` |
| `api.wallets` | `getAll()`, and `api.wallets.agent` with `getAll()`, `create(data)`, `delete(id)` | `/wallets`, `/wallets/agent` |
| `api.logs` | `getAll(params?)`, `getById(id)` | `/log` |
| `api.hyperliquid` | `allMids()`, `meta()`, `maxBuilderFee(params)`, `approveBuilderFee(params)`, `approveAgent(payload)` | Hyperliquid directly |
| `api.getHttpClient()` | the underlying ky instance, for anything not covered above | — |

### Orders cannot be cancelled

There is no cancel and no delete for orders, in this SDK or in the API behind it: `/orders` exposes
create, read and update only. Nothing in `apps/api` ever writes the `canceled` order status.

An open order leaves the `open` state in exactly two ways, both server-side:

- the trailing stop triggers and the executor fills it, or
- the janitor finds the trigger order gone from Hyperliquid and reconciles the row to `closed`.

So the way out of a live order is to cancel its trigger order on Hyperliquid directly, with the same
wallet. The janitor picks that up on its next pass and closes the row here. Do not build a UI
control that claims to cancel an order until a cancel route actually exists.

`api.hyperliquid` does **not** go through `@hltape/api`. It picks its endpoint from
`isTestnet` and calls `api.hyperliquid.xyz` or `api.hyperliquid-testnet.xyz` itself, which is why
the dashboard has to be told the network independently of the server.

Nothing here polls or subscribes. Every method is a single request; the dashboard layers React
Query on top for refresh intervals.

## Scripts

```bash
pnpm build            # tsc -p tsconfig.json
pnpm lint             # biome check
pnpm check-types      # tsc --noEmit
```
