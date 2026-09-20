# @hltape/coin-names

Cryptocurrency display-name mapping for Hyperliquid assets: turns the exchange's ticker into
something readable in the UI.

## Usage

The map itself is module-private. The package exports one function:

```typescript
import { getCoinName } from "@hltape/coin-names";

getCoinName("BTC"); // "Bitcoin"
getCoinName("eth"); // "Ethereum"  — the lookup retries uppercased
getCoinName("XYZZY"); // undefined — fall back to the raw symbol at the call site
```

`apps/app` re-exports it from `src/lib/coinNames.ts`.

## Adding a symbol

Add the entry to the object in `src/index.ts`, grouped with the comment block it belongs to. The
list is hand-maintained and does not need to be exhaustive: an unknown symbol returns `undefined`,
and the dashboard shows the ticker instead.

## Scripts

```bash
pnpm build            # tsc -p tsconfig.json
pnpm lint             # biome check
pnpm check-types      # tsc --noEmit
```
