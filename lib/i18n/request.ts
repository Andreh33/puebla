import "server-only";
import { cache } from "react";
import type { Locale } from "./config";
// React.cache scopes this cell to a single server render, rather than module state.
const requestLocale = cache(() => ({ value: "es" as Locale }));
export function setRequestLocale(locale: Locale): void {
  requestLocale().value = locale;
}
export function getRequestLocale(): Locale {
  return requestLocale().value;
}
