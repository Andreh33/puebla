import "server-only";
import { isLocale, type Locale } from "./config";
import { isLocalePublished } from "./readiness";

/** Image handlers bypass layouts, so validate before data or dictionary access. */
export function publishedImageLocale(rawLocale: unknown): Locale | null {
  const locale = rawLocale === undefined ? "es" : rawLocale;
  return isLocale(locale) && isLocalePublished(locale) ? locale : null;
}
