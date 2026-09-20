// packages/messages/src/index.ts
import en from "./en";

export const messages = { en };
export type Locale = keyof typeof messages;
export type Messages = (typeof messages)[Locale];

export function getMessages(locale: Locale): Messages {
  return messages[locale];
}
