import { isLocale, type Locale } from "./config";
const OPERATIONAL = /^\/(?:api|admin|_next|3d|sample-products|blog-covers)(?:\/|$)/;
export function shouldLocalizePath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  const pathname = path.split(/[?#]/, 1)[0]!;
  return (
    !OPERATIONAL.test(pathname) &&
    !/\.[a-z0-9]+$/i.test(pathname) &&
    !/\/(?:share-image|opengraph-image|twitter-image)(?:\/|$)/.test(pathname)
  );
}
export function routeLocale(path: string): Locale {
  const segment = path.split(/[/?#]/)[1];
  return isLocale(segment) ? segment : "es";
}
export function stripLocale(path: string): string {
  return path.replace(/^\/(?:es|pt|it|fr|de)(?=\/|[?#]|$)/, "") || "/";
}
export function localePath(locale: Locale, path: string): string {
  if (!shouldLocalizePath(path)) return path;
  const unprefixed = stripLocale(path);
  const normalized =
    unprefixed.startsWith("?") || unprefixed.startsWith("#") ? `/${unprefixed}` : unprefixed;
  return locale === "es" ? normalized : `/${locale}${normalized === "/" ? "" : normalized}`;
}
export function internalLocalePath(path: string): string {
  return `/es${path === "/" ? "" : path}`;
}

/** Localize editorial shopping links, preserving genuine external references and media. */
export function localizedContentHref(
  locale: Locale,
  href: string | undefined,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://zonasportpuebla.com",
): string | undefined {
  if (!href) return href;
  if (href.startsWith("/") && !href.startsWith("//")) return localePath(locale, href);
  if (!/^https?:\/\//i.test(href)) return href;
  try {
    let target = new URL(href);
    const canonical = new URL(siteUrl);
    if (
      target.hostname === "zonasport.vercel.app" ||
      target.hostname === `www.${canonical.hostname}`
    )
      target = new URL(`${target.pathname}${target.search}${target.hash}`, canonical);
    if (target.origin !== new URL(siteUrl).origin || !shouldLocalizePath(target.pathname))
      return href;
    target.pathname = localePath(locale, target.pathname);
    return target.toString();
  } catch {
    return href;
  }
}
