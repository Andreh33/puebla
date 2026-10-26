import type { Locale } from "./config";

/** Human publication decision: preserve unfinished product copy while localizing store pages. */
export const PRODUCT_TRANSLATIONS_ENABLED = false;
export const PRODUCT_SOURCE_FILE = PRODUCT_TRANSLATIONS_ENABLED
  ? "product-source-corrections.json"
  : "product-source-corrections.published.json";

const EDITORIAL =
  /^\/(?:blog|contacto|sobre-nosotros|aviso-legal|politica-cookies|politica-privacidad|condiciones-de-venta|carrito|checkout|buscar|tienda-en)(?:\/|$)/;
const OPERATIONAL = /^\/(?:api|admin|_next|3d|sample-products|blog-covers)(?:\/|$)/;
const SHOPPING =
  /^\/(?:producto|catalogo|marca|marcas|outlet|hombre|mujer|nino|ninos|nina|bebe)(?:\/|$)/;

/** Unknown public paths are category/family routes, not translated editorial pages. */
export function isShoppingPath(path: string): boolean {
  const pathname =
    path.replace(/^\/(?:es|pt|it|fr|de)(?=\/|[?#]|$)/, "").split(/[?#]/, 1)[0] || "/";
  return (
    SHOPPING.test(pathname) ||
    (pathname !== "/" &&
      !EDITORIAL.test(pathname) &&
      !OPERATIONAL.test(pathname) &&
      (!/\.[a-z0-9]+$/i.test(pathname) ||
        /\/(?:share-image|opengraph-image|twitter-image)$/.test(pathname)))
  );
}

export function isLocaleRouteAvailable(locale: Locale, path: string): boolean {
  return locale === "es" || PRODUCT_TRANSLATIONS_ENABLED || !isProductPath(path);
}

/** Product pages and their images stay Spanish; category/catalog/brand interfaces are native. */
export function isProductPath(path: string): boolean {
  const pathname =
    path.replace(/^\/(?:es|pt|it|fr|de)(?=\/|[?#]|$)/, "").split(/[?#]/, 1)[0] || "/";
  return /^\/producto(?:\/|$)/.test(pathname);
}
