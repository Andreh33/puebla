/* Zona Sport — Service Worker mínimo.
 * Estrategia:
 *   - cache-first para assets estáticos (/icons/*, /logo.*, /favicon-*, /apple-touch-icon.png)
 *   - network-first para documentos HTML (no cacheamos datos de producto)
 *   - resto: pass-through
 *
 * Mantener pequeño y conservador: en caso de duda, deja pasar a la red.
 */

const VERSION = "zs-v1";
const STATIC_CACHE = `zs-static-${VERSION}`;
const HTML_CACHE = `zs-html-${VERSION}`;

const STATIC_ASSETS = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/apple-touch-icon.png",
  "/favicon-16.png",
  "/favicon-32.png",
  "/favicon.svg",
  "/logo.svg",
  "/logo.png",
  "/logo.webp",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("zs-") && k !== STATIC_CACHE && k !== HTML_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/logo.") ||
    url.pathname.startsWith("/favicon") ||
    url.pathname === "/apple-touch-icon.png"
  );
}

function isHtmlNavigation(request) {
  return (
    request.mode === "navigate" ||
    (request.method === "GET" && request.headers.get("accept")?.includes("text/html"))
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // No cacheamos rutas de API ni de admin.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin")) return;

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request)
            .then((res) => {
              if (res.ok) {
                const clone = res.clone();
                caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
              }
              return res;
            })
            .catch(() => cached),
      ),
    );
    return;
  }

  if (isHtmlNavigation(request)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(HTML_CACHE).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }
});
