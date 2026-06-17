/**
 * Lookup de redirecciones gestionadas (RedirectRule).
 *
 * Estrategia de cache:
 *   - El middleware corre en runtime Edge y NO puede usar Prisma directamente.
 *     Para resolverlas, consulta `/api/redirects` (Node runtime) en caso de miss
 *     y cachea el Map en memoria con TTL configurable.
 *   - Esta tabla es pequeña (cientos, no millones), así que cargamos todas las
 *     reglas activas a la vez.
 *   - Cuando el admin guarda/borra una regla llamamos a `invalidateRedirectCache()`
 *     desde su server action (revalidateTag('redirects') + reset del Map).
 *
 * Helpers expuestos:
 *   - `lookupRedirect(pathname)` para middleware (edge-safe): hace fetch a la API.
 *   - `loadRedirectsFromDb()` para la propia API route (runtime nodejs).
 *   - `incrementHits(id)` para persistir conteo (Node).
 */

import { unstable_cache } from "next/cache";

export type RedirectRecord = {
  id: string;
  from: string;
  to: string;
  type: number;
};

export type RedirectMap = Map<string, RedirectRecord>;

const CACHE_TTL_MS = 60_000; // 1 minuto

type CacheEntry = { fetchedAt: number; map: RedirectMap };

// Cache global. En Edge runtime cada región tiene su instancia; el TTL corto
// (60s) compensa la falta de invalidación cross-region.
declare global {
  // eslint-disable-next-line no-var
  var __zs_redirects_cache: CacheEntry | undefined;
}

function setCache(map: RedirectMap) {
  globalThis.__zs_redirects_cache = { fetchedAt: Date.now(), map };
}

function getCache(): RedirectMap | null {
  const c = globalThis.__zs_redirects_cache;
  if (!c) return null;
  if (Date.now() - c.fetchedAt > CACHE_TTL_MS) return null;
  return c.map;
}

export function invalidateRedirectCache() {
  globalThis.__zs_redirects_cache = undefined;
}

export function normalizePath(p: string): string {
  if (!p) return "/";
  let path = p.trim();
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path;
}

/**
 * Edge-safe. Se llama desde middleware. Si la cache local está caliente, no
 * hace fetch. Si no, pide a `/api/redirects` la lista completa.
 */
export async function lookupRedirect(
  pathname: string,
  origin: string,
): Promise<RedirectRecord | null> {
  const key = normalizePath(pathname);
  let map = getCache();
  if (!map) {
    try {
      const res = await fetch(`${origin}/api/redirects`, {
        // Tag para revalidateTag('redirects') desde server actions.
        next: { revalidate: 60, tags: ["redirects"] },
        headers: { accept: "application/json" },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { rules: RedirectRecord[] };
      map = new Map(data.rules.map((r) => [normalizePath(r.from), r]));
      setCache(map);
    } catch {
      return null;
    }
  }
  return map.get(key) ?? null;
}

// ---------------------------------------------------------------------------
// Funciones de runtime Node (uso desde `/api/redirects` y server actions).
// ---------------------------------------------------------------------------

/**
 * Carga reglas activas desde la DB usando Prisma. Solo usable en runtime Node.
 * El consumidor importa `db` y se la pasa para evitar bundlar Prisma en edge.
 */
// NOTA: unstable_cache hace JSON.stringify de los argumentos para componer la
// cache key. Pasarle PrismaClient (que tiene `_originalClient` circular)
// rompe el TypeError. Por eso la función es sin args — importa `db`
// dinámicamente dentro.
export const loadRedirectsFromDb = unstable_cache(
  async (): Promise<RedirectRecord[]> => {
    try {
      const { db } = await import("@/lib/db");
      const rules = await db.redirectRule.findMany({
        where: { isActive: true },
        select: { id: true, from: true, to: true, type: true },
        take: 5000,
      });
      return rules;
    } catch {
      // Sin DATABASE_URL operativa: no hay redirects. El middleware sigue
      // sin redirigir (comportamiento por defecto).
      return [];
    }
  },
  ["redirects:active"],
  { tags: ["redirects"], revalidate: 60 },
);

/** Acumulador de hits en memoria (Node runtime). Se vacía cada FLUSH_MS. */
const HITS = new Map<string, number>();
const FLUSH_MS = 30_000;
let lastFlush = Date.now();

export function bumpHit(id: string) {
  HITS.set(id, (HITS.get(id) ?? 0) + 1);
}

export function shouldFlushHits(): boolean {
  return Date.now() - lastFlush >= FLUSH_MS && HITS.size > 0;
}

export function drainHits(): Array<{ id: string; hits: number }> {
  const out = Array.from(HITS.entries()).map(([id, hits]) => ({ id, hits }));
  HITS.clear();
  lastFlush = Date.now();
  return out;
}
