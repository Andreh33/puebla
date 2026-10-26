import { NextResponse, type NextRequest } from "next/server";
import { isLocaleRouteAvailable } from "@/lib/i18n/publication-policy";
import { lookupRedirect, normalizePath } from "@/lib/redirects";
import {
  shouldLocalizePath,
  routeLocale,
  stripLocale,
  internalLocalePath,
  localePath,
} from "@/lib/i18n/routing";

// ---------------------------------------------------------------------------
// Edge-safe middleware.
//
// Responsabilidades (orden):
//   1. Resolver redirecciones gestionables (`RedirectRule`). Si hay match,
//      responde con 301/302 inmediatamente. Edge no puede usar Prisma, así
//      que la consulta va a `/api/redirects` (Node), cacheada 60s en memoria
//      por instancia. El "fire-and-forget" del POST registra el hit.
//   2. Proteger `/admin/**` redirigiendo a `/admin/login` si no hay cookie.
//
// Performance: la cache local es un Map<string, RedirectRecord>; la lectura
// es O(1) y nunca añade más de 1-2ms en hit. En miss, el fetch a la API
// añade ~5-30ms una sola vez por instancia/minuto.
// ---------------------------------------------------------------------------

const ADMIN_PREFIX = "/admin";
const PUBLIC_ADMIN_ROUTES = ["/admin/login"];

const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

// Paths que jamás deben pasar por el lookup de redirect (overhead inútil).
function shouldSkipRedirectLookup(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/admin") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/sitemap-") ||
    /\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico|css|js|map|txt|xml|json|woff2?|mp4|webm|glb|gltf|pdf|webmanifest)$/i.test(
      pathname,
    )
  );
}

export async function middleware(req: NextRequest) {
  const { pathname, search, origin } = req.nextUrl;

  // Propaga pathname al server (Server Components no tienen acceso directo).
  // Permite, p.ej., que `app/admin/layout.tsx` distinga `/admin/login` y se
  // salte el check de auth para evitar bucles de redirección.
  const forwardHeaders = new Headers(req.headers);
  forwardHeaders.set("x-pathname", pathname);

  // Visible /es URLs are aliases of the original Spanish URLs. Preserve queries.
  if (/^\/es(?:\/|$)/.test(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = stripLocale(pathname);
    return NextResponse.redirect(url, 308);
  }
  if (!isLocaleRouteAvailable(routeLocale(pathname), pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = stripLocale(pathname);
    return NextResponse.redirect(url, 308);
  }
  if (stripLocale(pathname) === "/ninos") {
    const url = req.nextUrl.clone();
    url.pathname = localePath(routeLocale(pathname), "/nino");
    return NextResponse.redirect(url, 308);
  }

  // ---- (1) RedirectRule ----------------------------------------------------
  if (!shouldSkipRedirectLookup(pathname)) {
    const rule = await lookupRedirect(pathname, origin);
    // Anti-bucle: ignoramos una regla cuyo destino interno es la propia ruta
    // actual (to === from), que provocaría un 301→301→… infinito en producción.
    const selfLoop =
      rule != null &&
      !rule.to.startsWith("http") &&
      normalizePath(rule.to) === normalizePath(pathname);
    if (rule && !selfLoop) {
      const dest = rule.to.startsWith("http") ? rule.to : new URL(rule.to + search, req.url);
      // Fire-and-forget para sumar el hit. NO bloqueamos la respuesta.
      void fetch(`${origin}/api/redirects`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: rule.id }),
        // El edge no soporta `keepalive: false` por defecto; lo dejamos así.
      }).catch(() => {});
      const status = rule.type === 302 ? 302 : 301;
      return NextResponse.redirect(dest, status);
    }
  }

  // ---- (2) Protección de /admin -------------------------------------------
  if (pathname.startsWith(ADMIN_PREFIX) && !PUBLIC_ADMIN_ROUTES.includes(pathname)) {
    const hasSession = SESSION_COOKIES.some((name) => req.cookies.get(name));
    if (!hasSession) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (
    (shouldLocalizePath(pathname) ||
      /\/(?:share-image|opengraph-image|twitter-image)$/.test(pathname)) &&
    routeLocale(pathname) === "es"
  ) {
    const url = req.nextUrl.clone();
    url.pathname = internalLocalePath(pathname);
    return NextResponse.rewrite(url, { request: { headers: forwardHeaders } });
  }
  return NextResponse.next({ request: { headers: forwardHeaders } });
}

export const config = {
  // Capturamos todo excepto assets de Next y archivos con extensión.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.*\\.xml).*)"],
};
