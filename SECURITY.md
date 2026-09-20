# Security Policy

> [!IMPORTANT]
> **This project is unmaintained, and its author does not operate an instance of it.** There is no
> security team here, no on-call and no undertaking to answer a report or to publish a fix.
> Everything below is still the right way to handle a finding — it is addressed to whoever runs
> this code, which may well be you.

hltape custodies encrypted agent-wallet private keys and submits real orders to a live exchange. A
vulnerability here can cost people money directly. The rest of this file is specific about where
the expensive bugs live, so that whoever reads the code knows where to look first.

## Supported versions

None. There are no release branches, no backports and no security releases: `main` is the last
commit the author pushed, and nothing follows it. If you run this software — as a fork, a private
deployment or a handful of copied files — you are its security maintainer, and the fix is yours to
write.

## Reporting a vulnerability

**Do not open a public issue for a security vulnerability.** A public report on software that
signs transactions is an exploit announcement with a lead time measured in minutes. That holds
whether or not anyone is maintaining the code: the people it can hurt are the ones running it
today.

Report it privately, by either route:

1. **GitHub private vulnerability reporting** — open the repository's **Security** tab and look
   for **Report a vulnerability**. That opens a private advisory instead of a public issue. The
   button exists only if the repository's owner has switched the feature on, and it is off by
   default, so check before you rely on it.
2. **Email** — m.przybysz@blackmoose.pl. This is the author's ordinary inbox, not a monitored
   security address, and it may not be answered. Put "security" and the repository name in the
   subject.

> [!NOTE]
> **If you own this repository or a fork of it, turn private vulnerability reporting on:**
> Settings -> Advanced Security -> Private vulnerability reporting -> Enable. It is off by default
> and exists on public repositories only. Until it is on, the route above does not exist for
> anyone who follows it, and a reporter's only working channel is the public issue tracker — the
> exact opposite of what this page asks for.

Please include:

- what an attacker can do, in one sentence
- affected workspace and file paths, and the commit or tag you tested
- reproduction steps, or a proof of concept
- whether you ran it against Hyperliquid testnet or mainnet
- your assessment of impact (funds at risk, key disclosure, account takeover, denial of service)

**Redact secrets from your report.** No private keys, agent-wallet keys, `MASTER_KEY_HEX` values,
session cookies or API credentials — not in the body, not in a screenshot, not in an attached log.
If your proof of concept only works with a real key, describe what it demonstrates and leave the
key out.

### What to expect

Nothing, on any timescale. There is no acknowledgement window, no severity triage, no fix target
and no coordinated-disclosure process behind this file — the author has stopped maintaining the
project and runs no instance of it. Treat a reply as a courtesy if it comes, and do not wait on
one before protecting whoever depends on your deployment.

Assume the fix is yours. Patch your own deployment first; publish the patch, which the AGPL
already obliges you to offer to the users of a modified instance; then tell the other operators
you know of. If you want the finding on the public record, a GitHub advisory on your own fork is
the durable way to do it, and it will outlive this repository.

There is no bounty, paid or otherwise, and no advisory will be published here to credit you in.

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

### Administrative access: roles, bans and impersonation

After `MASTER_KEY_HEX`, an admin account is the strongest identity in the system, and nothing in
the dashboard shows that it exists. better-auth's `admin` plugin is registered in
[`apps/api/src/lib/auth.ts`](apps/api/src/lib/auth.ts) with `defaultRole: "user"` and
`adminRoles: ["admin"]`, and
[`apps/api/src/routes/auth/index.ts`](apps/api/src/routes/auth/index.ts) forwards every request
under the auth prefix straight to `auth.handler`. The plugin's endpoints are therefore live on any
deployment, at `/auth/admin/*`: `list-users`, `get-user`, `update-user`, `create-user`,
`remove-user`, `set-role`, `set-user-password`, `ban-user`, `unban-user`, `list-user-sessions`,
`revoke-user-session`, `revoke-user-sessions`, `has-permission`, `impersonate-user` and
`stop-impersonating`.

How an account becomes admin: only by a direct database write. The `user.role` column defaults to
`'user'` ([`apps/api/src/db/schema/auth.ts`](apps/api/src/db/schema/auth.ts)) and no application
code path ever sets it to `'admin'`, so the first administrator has to be created with SQL against
the `user` table. From then on that account can promote others through `/auth/admin/set-role`.
Write access to that one column is therefore equivalent to admin access.

What the role is worth to an attacker: `impersonate-user` mints a genuine session for another
user, recorded in `session.impersonated_by`, and every authenticated route in this API treats that
session as that user — including `POST /positions`, `POST /orders` and `PATCH /orders/:id`, which
open a position and place or modify a trailing stop signed with that user's agent wallet, and
`POST /wallets/agent` and `DELETE /wallets/agent/:id`, which register or remove an agent wallet. It
does not hand the stored agent key back, but it can trade with it. `ban-user` locks an account out
and `remove-user` deletes it.

Note also what enforces this. [`apps/api/src/plugins/auth.ts`](apps/api/src/plugins/auth.ts)
declares a `verifyAdmin` guard, but no route in this repository uses it; the checks that matter
are better-auth's own, inside the plugin. The same file's `verifySession` re-reads `role`, `banned`
and `ban_expires` from the database on every authenticated request, so a ban takes effect on that
user's next request and an expired ban clears itself.

In scope here: any path that lets a non-admin reach an `/auth/admin/*` endpoint or set its own
`role`, any impersonated session that outlives `stop-impersonating`, and anything that lets an
impersonated session read or export key material rather than merely trade.

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
  proof of concept, and social engineering of operators or users.
- A misconfigured third-party deployment of this software. Report that to whoever runs it.

## For operators running this software

If you deploy a fork, you own its security posture — and because nobody maintains this repository,
you own all of it. At minimum: generate your own `MASTER_KEY_HEX` (`openssl rand -hex 32`) and
never reuse one across environments, store it in a secret manager rather than a `.env` on disk,
keep `TESTNET=true` until you have exercised the execution path end to end, and keep the `admin`
role off any account you use for anything else.

There will be no advisories published here, so there is nothing to subscribe to. Watch the
dependencies yourself — [`.github/workflows/security.yml`](.github/workflows/security.yml) runs
`pnpm audit --prod` and a secretlint scan, and it runs in your fork too — read what you pull in,
and budget for the fact that a fix arrives when you write it.
