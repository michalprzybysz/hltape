// apps/app/src/lib/revenue.ts
/**
 * ============================================================================
 * REVENUE CONFIGURATION — THE ONLY PLACE THE DASHBOARD DEFINES WHO GETS PAID
 * ============================================================================
 *
 * These are the project's default revenue settings. They are compiled into the
 * client bundle; there is no environment variable that changes them.
 *
 * RUNNING YOUR OWN INSTANCE? Edit this file. It is opt-out:
 *
 *   - to earn the builder fee yourself, replace BUILDER_ADDRESS with your own
 *     Hyperliquid address
 *   - to run with no builder fee at all, set BUILDER_ADDRESS to ""
 *
 * An empty BUILDER_ADDRESS is fully supported: the onboarding flow then skips
 * the on-chain fee approval step entirely and goes straight to generating the
 * agent wallet.
 *
 * BUILDER_ADDRESS must match the one in apps/api/src/lib/revenue.ts. The user
 * approves a fee for one specific address on-chain, and Hyperliquid rejects an
 * order tagged with a builder the user has not approved. The referral code
 * lives only on the server side, in apps/api/src/lib/revenue.ts.
 *
 * Neither value is a secret. Everything in this file ships to every browser
 * that loads the app, which is fine: a builder address is a public on-chain
 * address. Never put a token or key here.
 */

/**
 * Hyperliquid address the user is asked to approve a builder fee for.
 * Empty string disables the builder fee, and the approval step, entirely.
 */
export const BUILDER_ADDRESS = "0x2270544482ceBCc67F5582AB0B2de9521F6AF82F";

/**
 * Maximum builder fee the user approves on-chain, as Hyperliquid's percentage
 * string. This is a ceiling, not the rate charged: the server tags orders at
 * BUILDER_FEE_TENTHS_BPS (apps/api/src/lib/revenue.ts), which must stay at or
 * below this value. Shown to the user before they sign the approval.
 */
export const MAX_BUILDER_FEE = "0.01%";

/**
 * Threshold below which the user is asked to (re-)approve the builder fee.
 *
 * Hyperliquid's `maxBuilderFee` info endpoint returns the already-approved
 * maximum as an integer in tenths of a basis point, so this value works as an
 * "is there any approval at all" check rather than a real rate comparison.
 * That is sufficient while BUILDER_FEE_TENTHS_BPS stays well below
 * MAX_BUILDER_FEE, which it does by default (1 against a ceiling of 10).
 *
 * CAVEAT if you raise BUILDER_FEE_TENTHS_BPS: a user who approved a lower rate
 * earlier still counts as approved here and will not be re-prompted, so their
 * orders start getting rejected by Hyperliquid. Raise this threshold to match.
 */
export const REQUIRED_FEE_APPROVAL = 0.001;
