# @hltape/messages

The i18n message catalogue and its types. English only today; the shape exists so a second locale
is an additive change rather than a refactor.

## Structure

```
src/
├── index.ts    messages, getMessages(locale), and the Locale / Messages types
└── en.ts       the catalogue, one nested object per screen or concern
```

## Usage

```typescript
import { getMessages, messages } from "@hltape/messages";

messages.en.positions.title;
getMessages("en");
```

`apps/app` wires this into `next-intl` in `src/lib/i18n.ts` and reads keys with `useTranslations()`
in components.

## Deployment-specific values

The catalogue hardcodes no brand name, no domain and no fee rate. Anything that differs per
deployment arrives as an ICU parameter, supplied by the call site:

| Key | Parameter | Supplied from |
| --- | --- | --- |
| `metadata.appTitle` | `{brand}` | `BRAND_NAME` in `apps/app/src/lib/brand.ts` |
| `connectAgent.oneTimeSetupDescription` | `{maxFee}` | `MAX_BUILDER_FEE` in `apps/app/src/lib/revenue.ts`, passed by `apps/app/src/components/ConnectAgentDialog.tsx` |

`connectAgent.oneTimeSetupDescription` must not assert a concrete fee percentage. `MAX_BUILDER_FEE`
is the *ceiling* the user approves on-chain; the rate actually charged per order is a separate
compiled-in constant, `BUILDER_FEE_TENTHS_BPS` in `apps/api/src/lib/revenue.ts`. The two are not
the same number and the string must not imply that they are. Background:
[Builder fee and referral code](../../README.md#builder-fee-and-referral-code).

There is no in-app builder-fee disclosure beyond this one dialog string — the standing `footer`
notices (`builderFeeNotice`, `noBuilderFeeNotice`) were removed along with the app footer, so do
not write a key that assumes they still exist.

## Adding a locale

1. Add `src/<locale>.ts` with a default export mirroring `en.ts`.
2. Register it in the `messages` map in `src/index.ts`. `Locale` widens from that map
   automatically.
3. `apps/app/src/lib/i18n.ts` hardcodes `"en"` today; add the locale negotiation there.

One thing to fix while you are at it: nothing currently forces a second locale to match the first.
`en.ts` ends in `as const`, so `typeof en` is a wall of literal string types and cannot be used to
type a translation directly, and `Messages` in `index.ts` is derived from the map, so it would
simply widen to a union of two differently shaped objects. Add a widened catalogue type and
annotate every locale with it, or the first missing key will surface at runtime as a rendered key
name rather than at build time.

## Scripts

```bash
pnpm build            # tsc -p tsconfig.json
pnpm lint             # biome check
pnpm check-types      # tsc --noEmit
```
