// apps/app/src/lib/brand.ts
/**
 * Per-deployment branding and public configuration.
 *
 * Every value here comes from a NEXT_PUBLIC_* variable, which Next.js inlines into the
 * client bundle at build time. That means these values are PUBLIC: they ship to every
 * browser that loads the app. Never put a secret, private key or API token in this file.
 *
 * Next.js only substitutes a NEXT_PUBLIC_* variable when it appears as a literal
 * `process.env.NEXT_PUBLIC_FOO` expression, so the keys below are always written out in
 * full and never built dynamically.
 *
 * A fork sets these in apps/app/.env (see .env.example) to run under its own name, source
 * URL and CSP allowlist. The builder fee is NOT here: it is compiled in, in
 * ./revenue.ts.
 */

/** Display name of this deployment, used in page titles and user-facing copy. */
export const BRAND_NAME: string = process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || "hltape";

/**
 * Where the source code of THIS deployment lives. The footer links to it.
 *
 * AGPL-3.0 section 13 binds whoever runs this app for other people over a network, not
 * whoever publishes it: an operator of a MODIFIED version owes its users the corresponding
 * source of that modified version, and a link to the upstream repository does not satisfy
 * that. So if you change the code and deploy it, publish your fork and point this at it.
 * A deployment that runs the code unchanged can leave the default in place.
 */
export const SOURCE_URL: string =
  process.env.NEXT_PUBLIC_SOURCE_URL?.trim() || "https://github.com/michalprzybysz/hltape";

/**
 * Publishable LogoKit token used to fetch instrument icons from img.logokit.com.
 * Every deployment brings its own (https://logokit.com); when unset the app renders a
 * symbol-initial placeholder instead of calling the service.
 */
export const LOGOKIT_TOKEN: string = process.env.NEXT_PUBLIC_LOGOKIT_TOKEN?.trim() || "";

/**
 * Extra origins appended to the script-src and connect-src CSP directives,
 * space-separated, for analytics or CDN subdomains a fork adds. Empty when unset.
 */
export const CSP_EXTRA_ORIGINS: string = process.env.NEXT_PUBLIC_CSP_EXTRA_ORIGINS?.trim() || "";
