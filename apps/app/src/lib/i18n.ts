// apps/app/src/lib/i18n.ts
import { getMessages } from "@hltape/messages";
import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
  const locale = "en";
  const messages = getMessages(locale);

  return {
    locale,
    messages,
    formats: {
      number: {
        crypto: {
          style: "decimal",
          maximumSignificantDigits: 5,
        },
        percent: {
          style: "percent",
          maximumFractionDigits: 2,
        },
      },
    },
  };
});
