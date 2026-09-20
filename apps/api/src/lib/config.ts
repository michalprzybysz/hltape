// apps/api/src/lib/config.ts
import { z } from "zod";
import { BUILDER_ADDRESS, BUILDER_FEE_TENTHS_BPS, REFERRAL_CODE } from "./revenue";

/**
 * Single source of truth for the API server configuration.
 *
 * This module is imported from worker threads as well as from the Fastify app.
 * Worker threads do NOT inherit the parent's parsed values, but they DO inherit
 * `process.env`, so this file must stay standalone: no imports beyond zod and
 * the compiled-in ./revenue constants, and no dependency on the Fastify instance.
 */

const MASTER_KEY_PATTERN = /^[a-fA-F0-9]{64}$/;
const BUILDER_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const DOMAIN_LABEL = "[a-z0-9](?:[a-z0-9-]*[a-z0-9])?";
/** A bare domain of at least two labels: no scheme, no port, no path, no trailing dot. */
const COOKIE_DOMAIN_PATTERN = new RegExp(`^${DOMAIN_LABEL}(?:\\.${DOMAIN_LABEL})+$`);

const ENV_EXAMPLE_PATH = "apps/api/.env.example";

/** Treat an unset variable and an empty/whitespace-only one as the same thing. */
function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** The same normalization lib/auth.ts applies before handing the value to Better Auth. */
function normalizeCookieDomain(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim().toLowerCase().replace(/^\./, "");
  return trimmed === "" ? undefined : trimmed;
}

/** The hostname of a URL-shaped variable, or null when it is not a URL at all. */
function hostnameOf(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

const requiredString = z.preprocess(emptyToUndefined, z.string().min(1));
const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional());

const envVariables = z.object({
  // --- required ---
  DATABASE_URL: requiredString,
  BETTER_AUTH_SECRET: requiredString,
  BETTER_AUTH_URL: requiredString,
  APP_ORIGIN: requiredString,
  MASTER_KEY_HEX: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(
        MASTER_KEY_PATTERN,
        "must be exactly 64 hex characters (generate with: openssl rand -hex 32)",
      ),
  ),

  // --- optional, with defaults ---
  NODE_ENV: z.preprocess(emptyToUndefined, z.string().min(1).default("development")),
  TESTNET: z.preprocess(emptyToUndefined, z.string().min(1).default("true")),

  // --- cookies ---
  // Empty (the default) keeps the auth cookies host-only. Set it only when the dashboard and
  // this API sit on different subdomains of one domain you own — see .env.example.
  AUTH_COOKIE_DOMAIN: z.preprocess(
    normalizeCookieDomain,
    z
      .string()
      .regex(
        COOKIE_DOMAIN_PATTERN,
        "must be a bare domain of at least two labels: no scheme, port or path (example.com)",
      )
      .optional(),
  ),

  // --- observability ---
  LOGTAIL_SOURCE_TOKEN: optionalString,
  LOGTAIL_ENDPOINT: optionalString,
  SENTRY_DSN: optionalString,
  DEBUG_WORKERS: optionalString,
  DEBUG_METRICS: optionalString,
});

const envSchema = envVariables.superRefine((env, ctx) => {
  // A browser only accepts a Set-Cookie whose Domain is the setting host or a parent of it, and
  // only sends it to hosts under that domain. Get this wrong and nothing errors at runtime: the
  // cookie is dropped, the session never persists and the dashboard bounces back to /login. So
  // check it here, where it is still a boot failure with a name attached.
  const domain = env.AUTH_COOKIE_DOMAIN;
  // Unset, or already reported as malformed above: one problem per variable is enough.
  if (typeof domain !== "string" || !COOKIE_DOMAIN_PATTERN.test(domain)) return;

  for (const name of ["BETTER_AUTH_URL", "APP_ORIGIN"] as const) {
    const host = hostnameOf(env[name]);
    // Not a URL: that variable reports itself, and there is nothing to compare against.
    if (host === null) continue;
    if (host === domain || host.endsWith(`.${domain}`)) continue;

    ctx.addIssue({
      code: "custom",
      path: ["AUTH_COOKIE_DOMAIN"],
      message:
        `is "${domain}", which does not cover ${name} (host "${host}"). ` +
        "A cookie domain has to be the host itself or a parent of it. Leave it empty unless " +
        "the dashboard and this API are on different subdomains of one domain.",
    });
  }
});

type Env = z.infer<typeof envSchema>;

function formatIssues(issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>): string[] {
  const lines = new Set<string>();

  for (const issue of issues) {
    const name = String(issue.path[0] ?? "(unknown variable)");
    const raw = process.env[name];
    const unset = raw === undefined || raw.trim() === "";
    lines.add(unset ? `  ${name}: required, but is not set` : `  ${name}: ${issue.message}`);
  }

  return [...lines].sort();
}

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const lines = formatIssues(result.error.issues);
    throw new Error(
      [
        `Invalid environment configuration (${lines.length} problem${lines.length === 1 ? "" : "s"}):`,
        ...lines,
        "",
        `Every variable is documented in ${ENV_EXAMPLE_PATH} — copy it to apps/api/.env and fill it in.`,
      ].join("\n"),
    );
  }

  return result.data;
}

const env = parseEnv();

/** Builder-fee tag attached to orders. `address` is null when the fee is disabled. */
export interface BuilderConfig {
  readonly address: string | null;
  readonly feeTenthsBps: number;
}

/** A builder tag that is known to be active — safe to attach to an order payload. */
export interface ActiveBuilderConfig {
  readonly address: string;
  readonly feeTenthsBps: number;
}

/** Hyperliquid referral code, or null when referral linking is disabled. */
export type ReferralCode = string | null;

export interface LogtailConfig {
  readonly token: string;
  readonly endpoint: string;
}

export interface DebugConfig {
  readonly workers: readonly string[];
  readonly metrics: boolean;
}

/**
 * Validate the compiled-in revenue settings. These are not environment
 * variables, so a mistake here is a mistake someone made while editing
 * src/lib/revenue.ts — fail loudly at startup rather than letting Hyperliquid
 * reject every order at runtime.
 */
function resolveBuilder(): BuilderConfig {
  const address = BUILDER_ADDRESS.trim();

  if (address !== "" && !BUILDER_ADDRESS_PATTERN.test(address)) {
    throw new Error(
      `Invalid BUILDER_ADDRESS in src/lib/revenue.ts: ${JSON.stringify(address)}\n` +
        '  Must be a 0x-prefixed 40 hex character address, or "" to disable the builder fee.',
    );
  }

  if (!Number.isInteger(BUILDER_FEE_TENTHS_BPS) || BUILDER_FEE_TENTHS_BPS < 0) {
    throw new Error(
      `Invalid BUILDER_FEE_TENTHS_BPS in src/lib/revenue.ts: ${BUILDER_FEE_TENTHS_BPS}\n` +
        "  Must be a non-negative whole number of tenths of a basis point (1 = 0.001%).",
    );
  }

  return Object.freeze({
    address: address === "" ? null : address.toLowerCase(),
    feeTenthsBps: BUILDER_FEE_TENTHS_BPS,
  });
}

const builder: BuilderConfig = resolveBuilder();

const logtail: LogtailConfig | null = env.LOGTAIL_SOURCE_TOKEN
  ? Object.freeze({
      token: env.LOGTAIL_SOURCE_TOKEN,
      endpoint: env.LOGTAIL_ENDPOINT ?? "",
    })
  : null;

const debug: DebugConfig = Object.freeze({
  workers: Object.freeze(
    (env.DEBUG_WORKERS ?? "")
      .toLowerCase()
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  ),
  metrics: env.DEBUG_METRICS === "true",
});

export const config = Object.freeze({
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === "production",
  appOrigin: env.APP_ORIGIN,
  databaseUrl: env.DATABASE_URL,
  masterKeyHex: env.MASTER_KEY_HEX,
  testnet: env.TESTNET === "true",
  auth: Object.freeze({
    secret: env.BETTER_AUTH_SECRET,
    url: env.BETTER_AUTH_URL,
    /**
     * null keeps the auth cookies host-only, which is the default. lib/auth.ts applies this
     * setting, reading AUTH_COOKIE_DOMAIN from `process.env` itself so that it stays usable
     * without the rest of this configuration (`pnpm auth:generate` loads it on its own).
     */
    cookieDomain: env.AUTH_COOKIE_DOMAIN ?? null,
  }),
  builder,
  referralCode: REFERRAL_CODE.trim() === "" ? null : REFERRAL_CODE.trim(),
  logtail,
  sentryDsn: env.SENTRY_DSN ?? null,
  debug,
});

export type Config = typeof config;

/**
 * Returns the builder tag to attach to orders, or null when no builder address
 * is configured. When null, the `builder` key must be omitted from the order
 * payload entirely — Hyperliquid rejects an empty or zero-fee builder object.
 */
export function getBuilderTag(): ActiveBuilderConfig | null {
  return config.builder.address === null
    ? null
    : { address: config.builder.address, feeTenthsBps: config.builder.feeTenthsBps };
}
