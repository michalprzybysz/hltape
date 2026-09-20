// apps/app/src/lib/useFormatter.ts
import { useFormatter as useFormat } from "next-intl";

/**
 * Prices and sizes travel from the API as decimal strings so that no precision is lost on the
 * way (see the order and log types in packages/sdk), and a missing value arrives as null.
 * Intl.NumberFormat formats such a string directly, without a round trip through a double, but
 * next-intl types its argument as number | bigint only — hence the single cast below instead of
 * one at every call site.
 */
type Numeric = number | bigint | string | null;

const toIntlValue = (value: Numeric) => (value ?? 0) as number | bigint;

const useFormatter = () => {
  const format = useFormat();
  return {
    crypto(number: Numeric, currency: string = "USDC") {
      const formatted = format.number(toIntlValue(number), "crypto");
      return currency ? `${formatted} ${currency}` : formatted;
    },
    percent(number: Numeric) {
      return format.number(toIntlValue(number), "percent");
    },
    number(number: Numeric) {
      return format.number(toIntlValue(number));
    },
  };
};

export default useFormatter;
