> **This project is unmaintained.** Nobody reviews pull requests here and nothing will be merged —
> see the notice at the top of the README. Opening one is still useful as a public record for other
> people running the code, but expect no reply. The licence gives you the better route: fork it and
> merge it there.

## Summary

<!-- What this changes and why, in a few sentences. -->

## Related issue

<!-- "Closes #123", or "none" if this is standalone. -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Refactor or performance
- [ ] Documentation
- [ ] Build, CI or tooling

## Testing

<!-- What you actually ran. "Builds fine" is not testing. -->

- **Verified on Hyperliquid testnet?** <!-- yes / no / not applicable, and what you exercised -->
- Steps you ran:

> Changes to `apps/api/src/lib/executor/`, `dispatcher/` or `brain/` must say how they were
> exercised on testnet. That code spends money when it is wrong.

## Checklist

- [ ] `pnpm lint` passes
- [ ] `pnpm check-types` passes
- [ ] `pnpm --filter @hltape/api test` passes (if this touches the API)
- [ ] The PR title is a Conventional Commit (`feat:`, `fix:`, `docs:`, ...) — commitlint rejects
      anything else
- [ ] No secrets committed: no `.env`, no private key, no agent-wallet key, no `MASTER_KEY_HEX`,
      no API credential, in the diff or in the description
- [ ] No operator-specific values hardcoded — new configuration goes through
      `apps/api/src/lib/config.ts` or `apps/app/src/lib/brand.ts` and is documented in the
      matching `.env.example`
- [ ] I agree to contribute this under the project's AGPL-3.0-only licence
