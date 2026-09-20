# Contributing to Furious Abacus

Thanks for taking the time to contribute. This document is the short version of everything you
need to get a working checkout, land a change, and not lose money doing it.

Furious Abacus is software that moves real funds on a live exchange. Read
[Trading safety](#trading-safety) before you run anything against mainnet, and
[Read this before your first order](#read-this-before-your-first-order) before you place an order
on *either* network — the shipped defaults pay the project author, on testnet too.

## Prerequisites

| Tool       | Version                | Notes                                                    |
| ---------- | ---------------------- | -------------------------------------------------------- |
| Node.js    | >= 22                  | Enforced by `engines` in every manifest                   |
| pnpm       | 10.0.0                 | Pinned via `packageManager`; `corepack enable` picks it up |
| PostgreSQL | 14+                    | Local instance, Docker container or a hosted database      |

The repo is a Turborepo monorepo. Do not use npm or yarn in it — the lockfile is pnpm's and CI
installs with `--frozen-lockfile`.

## First run

> [!WARNING]
> Do not skip [Read this before your first order](#read-this-before-your-first-order), below. The
> steps here get you a running checkout; that section is the one that decides whether your first
> testnet order pays somebody else.

```bash
git clone https://github.com/michalprzybysz/furious-abacus.git
cd furious-abacus
pnpm install

# Install the git hooks (Biome, secretlint, commitlint). Not automatic.
pnpm lefthook install

# Environment. Both files are gitignored; the .env.example files are the documentation.
cp apps/api/.env.example apps/api/.env
cp apps/app/.env.example apps/app/.env.local

# apps/api/.env needs, at minimum:
#   DATABASE_URL        a reachable Postgres
#   BETTER_AUTH_SECRET  any long random string
#   BETTER_AUTH_URL     http://localhost:4000/auth
#   APP_ORIGIN          http://localhost:3000
#   MASTER_KEY_HEX      exactly 64 hex chars, generate with: openssl rand -hex 32
#   TESTNET             true
#
# apps/app/.env.local needs:
#   NEXT_PUBLIC_API_URL           http://localhost:4000
#   NEXT_PUBLIC_BETTER_AUTH_URL   http://localhost:4000/auth
#   NEXT_PUBLIC_WALLETCONNECT_ID  a project id from https://cloud.walletconnect.com/
#   NEXT_PUBLIC_TESTNET           true

# Create the schema
pnpm db:migrate

# Run everything (API on :4000, dashboard on :3000)
pnpm dev
```

## Read this before your first order

> [!IMPORTANT]
> **A checkout you change nothing in earns money for the project author, including on testnet.**
> Every order it places — yours, on testnet, while you are debugging — is tagged with the author's
> Hyperliquid builder address, and the first order that succeeds for a wallet with no referrer
> links that wallet to the author's referral code. Nothing in this repository ever unlinks a
> wallet, so emptying the constant after the fact does not undo a link that already happened.

There used to be `BUILDER_ADDRESS` / `NEXT_PUBLIC_BUILDER_ADDRESS` and `REFERRAL_CODE` environment
variables, and older instructions told you to leave them unset while developing. **Those variables
no longer exist.** Nothing in `.env` turns revenue collection off, and leaving a field blank in
`.env` does not either. The values are compiled-in constants in two files.

To opt out, make exactly this edit before you run anything:

```ts
// apps/api/src/lib/revenue.ts
export const BUILDER_ADDRESS = "";
export const REFERRAL_CODE = "";
```

```ts
// apps/app/src/lib/revenue.ts
export const BUILDER_ADDRESS = "";
```

That is the whole opt-out, and it is a fully supported configuration rather than a degraded one:
the server omits the `builder` key from every order payload, the dashboard skips the on-chain fee
approval step during onboarding, and the referral lookup never runs.

Do **not** commit that edit back. The constants pointing at the author are the project's shipped
default and a pull request that empties them will be rejected as an unrelated change — keep it as a
local modification, or set the two addresses to your own instead.

The full explanation of both mechanisms, what they cost a user and what you owe the users of an
instance you operate, is in [Builder fee and referral code](README.md#builder-fee-and-referral-code)
in the README. Read it once; it is the authoritative version and this section is only the
contributor's summary of it.

## Repository layout

```
apps/
├── api/          Fastify orchestrator + worker threads (the execution engine)
└── app/          Next.js 16 trading dashboard

packages/
├── sdk/          Typed API client and Hyperliquid SDK wrapper
├── ui/           Shared UI components (shadcn/ui + Tailwind v4)
├── messages/     i18n message types and translations
└── coin-names/   Cryptocurrency display-name mapping
```

Where to make a change:

| You want to change                                   | Workspace / path                        |
| ---------------------------------------------------- | --------------------------------------- |
| Trailing stop decision logic                          | `apps/api/src/lib/brain/`               |
| Price and volatility streaming                        | `apps/api/src/lib/feeder/`              |
| Order queueing and rate limiting                      | `apps/api/src/lib/dispatcher/`          |
| Order submission, builder fee, referral               | `apps/api/src/lib/executor/`            |
| Cleanup and reconciliation                            | `apps/api/src/lib/janitor/`             |
| Agent-wallet key encryption                           | `apps/api/src/lib/crypto.ts`            |
| SIWE / session handling                               | `apps/api/src/lib/auth.ts`, `siwe.ts`   |
| HTTP routes and validation                            | `apps/api/src/routes/`                  |
| Database schema and migrations                        | `apps/api/src/db/schema/`, `drizzle/`   |
| Dashboard screens                                     | `apps/app/src/app/`                     |
| A component used by more than one screen              | `packages/ui/src/components/`           |
| API request/response types shared by app and API      | `packages/sdk/src/`                     |
| User-visible strings                                  | `packages/messages/src/en.ts`           |
| The builder fee and the referral code                 | `apps/api/src/lib/revenue.ts`, `apps/app/src/lib/revenue.ts` |

Server env vars are read through `apps/api/src/lib/config.ts` and browser-visible branding through
`apps/app/src/lib/brand.ts`. Add new configuration there rather than scattering `process.env`
reads through the codebase. The revenue settings are not configuration: they are compiled-in
constants in the two `revenue.ts` files.

Schema changes: edit `apps/api/src/db/schema/`, then run `pnpm db:generate` and commit the
generated SQL in `apps/api/drizzle/` together with the schema change.

## Formatting and linting

Biome does both. The configuration lives in `biome.json`: 2-space indent, LF line endings, double
quotes, 100-column line width.

```bash
pnpm lint            # biome check across every workspace
pnpm check-types     # tsc --noEmit across every workspace
pnpm build           # production build of every workspace that has a build script
```

`apps/api` has no `build` script — only `build:ts` — so `pnpm build` skips it. The API is covered
by `pnpm check-types` and by `pnpm --filter @furious-abacus/api test`, which compiles it.

The lefthook pre-commit hook runs `biome check --write` on staged files and re-stages the result,
so committed code is formatted whether or not you remember. It also runs secretlint on staged
files. Its glob is `*.{js,ts,jsx,tsx,json,css}`, so Markdown is neither formatted nor checked —
match the surrounding style by hand. If you skipped `pnpm lefthook install`, CI will catch the
code — but later and more publicly.

## Commit messages

commitlint is wired to the `commit-msg` hook and **will reject** a message that does not parse as
a [Conventional Commit](https://www.conventionalcommits.org/). The format is:

```
<type>(<optional scope>): <subject>
```

Allowed types, from `@commitlint/config-conventional` (see `commitlint.config.js`):

`build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`

Also enforced:

- the type must be lower case and non-empty
- the subject must be non-empty, must not end with a period, and must not be Sentence case,
  Start Case, PascalCase or UPPER CASE — write it like `fix(api): retry cancel on nonce conflict`
- the header is limited to 100 characters, as are body and footer lines
- a breaking change is `feat!:` / `fix!:` or a `BREAKING CHANGE:` footer

## Tests

The API has a test suite (`node --test` with c8 coverage):

```bash
pnpm --filter @furious-abacus/api test
```

It compiles the API and the tests first, so it is also a type check. It needs no environment
variables and no database: tests register the units they exercise on their own Fastify instance
instead of booting the whole app. Keep it that way — a test that needs a live Postgres is a test
nobody runs. If you do point something at a database, point it at a throwaway one, never at one
holding real data.

Coverage is thin today — `apps/api/test/routes/root.test.ts` is the whole suite. Widening it is
welcome. Route tests belong in `apps/api/test/routes/`; there is no `test/plugins/` directory yet,
so create one when you write the first plugin test. If you change execution or trailing logic, add
a test — that code path spends money when it is wrong.

## Trading safety

This is the part that matters. Read it.

- **Develop against Hyperliquid testnet.** Set `TESTNET=true` in `apps/api/.env` and
  `NEXT_PUBLIC_TESTNET=true` in `apps/app/.env.local`. Both must be `true`; the API and the
  dashboard pick their endpoints independently, and a mismatch means the UI shows you one network
  while orders go to the other.
- **A pull request touching the executor, dispatcher or brain must state in its description that
  it was exercised on testnet**, and how.
- **Testnet does not switch revenue collection off.** `TESTNET=true` changes which Hyperliquid
  endpoints are used and nothing else: the builder tag and the referral link go out with your
  testnet orders exactly as they would on mainnet. See
  [Read this before your first order](#read-this-before-your-first-order).
- **Never commit a `.env` file.** `.env` and its variants are gitignored and secretlint guards the
  rest. If you disabled the hooks, you have removed your own safety net.
- **Never paste a private key, an agent-wallet key, a `MASTER_KEY_HEX`, a session cookie or an API
  credential into an issue, a pull request, a screenshot or a log excerpt.** Redact them. Assume
  anything posted to GitHub is public forever and gets scraped within minutes. A key that touched
  a public surface is burned — rotate it, do not argue with it.
- **Use a throwaway wallet for development**, funded with testnet USDC only. Do not point a
  development checkout at a wallet holding real funds.
- Found a vulnerability instead of a bug? Do not open an issue. Follow [SECURITY.md](SECURITY.md).

## Dependencies

Two pins in this repo are load-bearing. Both are there for a reason that is not obvious from the
version number, so read this before you "just update" them.

**`@coinbase/cdp-sdk` is pinned to `1.52.0`** via `pnpm.overrides` in the root `package.json`. From
`1.53.0` onward the package imports `@x402/core`, `@x402/evm` and `@x402/svm`. Those are declared as
*optional* peer dependencies, so they are correctly not installed — but Turbopack resolves dynamic
`import()` statically and `next build` fails with eight `Module not found` errors. `1.52.0` is the
newest release with no `@x402` imports. The package reaches us transitively, through
`@rainbow-me/rainbowkit -> wagmi -> @wagmi/connectors -> @base-org/account`. It also accounts for 10
of the repo's remaining dependency advisories. Drop the override once upstream either ships those
modules as real dependencies or guards the imports.

**`wagmi` is held at `2.19.5`** — the last 2.x release. `wagmi` 3 is not adoptable here: no published
RainbowKit accepts it (`@rainbow-me/rainbowkit@2.2.11` declares `"wagmi": "^2.9.0"`, and there is no
RainbowKit 3.x), and `wagmi` 3 pins `@wagmi/connectors@8.2.0`, which removed the `gemini` and `porto`
exports that RainbowKit imports. Upgrading would silently drop two supported wallets.

Two more, smaller: `typescript` stays on 5.9 because `ts-node@10.9.2` crashes under TypeScript 7, and
`ky` stays on 1.x because `ky` 2 renamed `prefixUrl` to `prefix` and changed its leading-slash
semantics.

`pnpm audit --prod` currently reports 19 findings, none critical. CI fails only on a *new* critical —
see the comment in `.github/workflows/security.yml`, which explains what is left and why.

## Pull requests

1. Branch from `main`.
2. Keep the change focused; unrelated reformatting makes review harder.
3. Run `pnpm lint`, `pnpm check-types` and `pnpm build` — these are the three gates CI runs.
   For API changes, also run `pnpm --filter @furious-abacus/api test`.
4. Give the PR a Conventional Commit title — it ends up in the history.
5. Fill in the PR template, including the testnet question.

CI runs lint, type check and build on every pull request
([`.github/workflows/ci.yml`](.github/workflows/ci.yml)), plus a dependency audit and a secretlint
scan of the whole tree ([`.github/workflows/security.yml`](.github/workflows/security.yml)). All of
it must be green.

The audit deserves one sentence of honesty: it prints the full `pnpm audit --prod` report but only
**fails** on a critical advisory, because the tree is not clean today and a gate nobody can pass is
a gate nobody reads. The reasoning, the current counts and the one ignored GHSA are all written out
in comments in that workflow. Do not widen the ignore list to make your PR pass.

## Licence

Furious Abacus is licensed under the **GNU Affero General Public License v3.0 only**
(see [LICENSE](LICENSE)). By submitting a contribution you agree that it is licensed under the
same terms. There is no CLA.

Note what AGPL-3.0 means for an operator: if you run a modified version of this software as a
network service, you must offer the users of that service the corresponding source of your
modified version. If you fork this to run your own instance, plan for that.
