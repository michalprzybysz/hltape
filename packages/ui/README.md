# @furious-abacus/ui

Shared UI primitives for `apps/app`, generated with the shadcn CLI on the `base-nova` style.

Source-only: the package has no build step and no `main`/`types`. Consumers import through the
subpath exports declared in `package.json` and the app's bundler compiles the TSX.

## Structure

```
src/
├── components/   26 shadcn/ui components (alert, button, card, dialog, drawer, table, …)
├── hooks/        use-media-query.ts
├── lib/          utils.ts — the cn() class merger, and nothing else
└── styles/       globals.css — the Tailwind v4 theme and CSS variables
```

## Usage

```typescript
import { Button } from "@furious-abacus/ui/components/button";
import { cn } from "@furious-abacus/ui/lib/utils";
import { useMediaQuery } from "@furious-abacus/ui/hooks/use-media-query";
```

The exports map is `./components/*`, `./lib/*`, `./hooks/*` and `./styles/*` — there is no barrel
file, so import each component by its own path.

`apps/app/src/app/globals.css` pulls in `src/styles/globals.css` and points Tailwind's `@source`
at `packages/ui/src`, which is how classes used only inside this package survive the build.

## Editing components

`src/components/` is generated output. Use the shadcn CLI to add or update a component rather than
hand-editing it, so a later regeneration does not quietly revert your change:

```bash
pnpm --filter @furious-abacus/ui exec shadcn add <component>
```

That uses the `shadcn` version pinned in this package's devDependencies rather than whatever
`pnpm dlx` resolves to today.

Configuration is in `components.json` (style `base-nova`, base colour `neutral`, CSS variables on,
Lucide icons, RSC-aware). `biome.json` at the repo root turns three a11y rules off for this
directory for the same reason — the generated markup is not ours to argue with. Components you
write yourself do not belong here; put them in `apps/app/src/components/`.

## Tech stack

- **Primitives**: `@base-ui/react`, plus `vaul` for drawers and `react-number-format` for the
  numeric input
- **Styling**: Tailwind v4, `class-variance-authority`, `clsx`, `tailwind-merge`
- **Icons**: `lucide-react`
- **React**: 19, as a peer dependency

## Scripts

```bash
pnpm lint             # biome check
pnpm check-types      # tsc --noEmit
```

No `build` and no `test`.
