# Security Policy

Furious Abacus custodies encrypted agent-wallet private keys and submits real orders to a live
exchange. A vulnerability here can cost people money directly. We take reports seriously and we
would rather hear about a problem early and imperfectly than late and politely.

## Supported versions

| Version                    | Supported |
| -------------------------- | --------- |
| `main` (latest commit)     | Yes       |
| Anything older             | No        |

This is a self-hosted project with no release branches. Fixes land on `main`; operators are
expected to track it. If you run a fork or a modified deployment, the fix is yours to pull in.

## Reporting a vulnerability

**Do not open a public issue for a security vulnerability.** A public report on software that
signs transactions is an exploit announcement with a lead time measured in minutes.

Report it privately, by either route:

1. **GitHub private vulnerability reporting** (preferred) — go to the repository's **Security**
   tab and choose **Report a vulnerability**. This opens a private advisory visible only to you
   and the maintainers.
2. **Email** — `security@<your-domain>` (a placeholder; see the note below).

<!-- OPERATOR: two things to do before publishing this repository.

     1. Replace the address above with a real monitored contact. Reports should
        reach a person, not a void.
     2. Turn on private vulnerability reporting: Settings -> Advanced Security ->
        Private vulnerability reporting -> Enable. It is OFF by default, and
        until it is on, the "Report a vulnerability" button route described
        above does not exist for anyone who follows it. -->

Please include:

- what an attacker can do, in one sentence
- affected workspace and file paths, and the commit or tag you tested
- reproduction steps, or a proof of concept
- whether you ran it against Hyperliquid testnet or mainnet
- your assessment of impact (funds at risk, key disclosure, account takeover, denial of service)

**Redact secrets from your report.** No private keys, agent-wallet keys, `MASTER_KEY_HEX` values,
session cookies or API credentials — not in the body, not in a screenshot, not in an attached log.
If your proof of concept needs a key, say so and we will arrange a channel.

### What to expect

| Stage                                    | Target            |
| ---------------------------------------- | ----------------- |
| Acknowledgement of your report            | 3 business days   |
| Initial assessment and severity           | 7 days            |
| Fix or mitigation for a critical issue    | 30 days           |
| Coordinated public disclosure             | after the fix ships, by agreement |

If you have not heard back within the acknowledgement window, send a follow-up — assume the
message was lost, not ignored.

We do not currently run a paid bounty programme. Reporters who want credit are named in the
advisory; reporters who want anonymity get it.

## Scope

Everything in this repository is in scope, but these are the parts where a bug is most expensive.
Look here first.

### Master key handling and agent-wallet encryption

`apps/api/src/lib/crypto.ts` is the whole of the at-rest protection for agent-wallet private keys.
It derives a 32-byte key from the `MASTER_KEY_HEX` environment variable (required, exactly 64 hex
characters), caches it in module memory, and encrypts with AES-256-GCM using a fresh 12-byte
random IV per message. The stored value is the hex of `IV || auth tag || ciphertext`;
`decrypt()` rejects anything shorter than the IV plus tag and verifies the tag before returning
plaintext.

Of particular interest: key material reaching logs, error messages, Sentry events or API
responses; IV reuse or nonce handling; anything that decrypts a key outside the paths that need
it; the worker-side copy of the same routine and the decrypted-key cache in
`apps/api/src/lib/executor/agentCache.ts`; and whether a compromise of the database alone is
sufficient to move funds.

### SIWE authentication and sessions

`apps/api/src/lib/siwe.ts`, `verifyMessage.ts`, `getNonce.ts` and `auth.ts` implement Sign-In With
Ethereum on top of better-auth. The signing domain is derived from `APP_ORIGIN` at boot and the
process refuses to start without it. In scope: nonce replay or reuse, signature verification
gaps, domain or chain-id confusion, session fixation, cookie scope and flags, and any route that
reads a user or wallet identifier from the request instead of from the session (an IDOR).

### Order execution path

`apps/api/src/lib/dispatcher/` and `apps/api/src/lib/executor/` build, sign and submit orders, and
`apps/api/src/lib/brain/` decides when. Orders are keyed by CLOID and modified by cancel-and-
replace. In scope: any way one user's request can act on another user's position or agent wallet,
order parameters that can be influenced to trade a size, side, price or asset the user did not
authorise, the builder-fee and referral tagging, and rate-limit or reconciliation failures that
can be driven into duplicate or orphaned orders.

### Also in scope

- The Content Security Policy and security headers in `apps/app/src/proxy.ts` and
  `apps/app/next.config.ts`.
- Rate limiting, CORS and helmet configuration in `apps/api/src/plugins/`.
- Input validation on API routes (`apps/api/src/routes/`).
- Dependency vulnerabilities with a plausible exploitation path in this codebase.

### Out of scope

- Vulnerabilities in Hyperliquid itself, or in a wallet provider — report those to their vendor.
- Findings that require an attacker who already has the operator's `MASTER_KEY_HEX`, database
  credentials or server shell.
- Missing hardening with no demonstrated impact, automated scanner output without a working
  proof of concept, and social engineering of maintainers or users.
- A misconfigured third-party deployment of this software. Report that to whoever runs it.

## For operators running this software

If you deploy a fork, you own its security posture. At minimum: generate your own
`MASTER_KEY_HEX` (`openssl rand -hex 32`) and never reuse one across environments, store it in a
secret manager rather than a `.env` on disk, keep `TESTNET=true` until you have exercised the
execution path end to end, and subscribe to this repository's advisories so a fix reaches you.
