/**
 * Búsqueda full-text para productos y posts apoyada en PostgreSQL.
 *
 *   1. Intenta `websearch_to_tsquery('spanish', q)` contra la columna
 *      `searchVector` (creada por la migración FTS).
 *   2. Si no devuelve resultados, hace fallback a `pg_trgm` similarity sobre
 *      `name` / `title` con un umbral bajo para tolerar erratas.
 *   3. Ordena por `ts_rank` (o similarity en el fallback) y filtra por estado.
 *
 * Devuelve siempre arrays planos serializables (`Decimal` convertido a `number`).
 */
import { db } from "@/lib/db";

export type ProductHit = {
  id: string;
  slug: string;
  name: string;
  mainImageUrl: string | null;
  retailPrice: number;
};

export type PostHit = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
};

const MIN_QUERY_LENGTH = 2;
const TRGM_THRESHOLD = 0.2;

function normalize(q: string): string {
  return q.trim().replace(/\s+/g, " ").slice(0, 200);
}

// ---------------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------------

export async function searchProducts(q: string, limit = 10): Promise<ProductHit[]> {
  const term = normalize(q);
  if (term.length < MIN_QUERY_LENGTH) return [];

  // 1) Full-text con stemming castellano + simple.
  const fts = await db.$queryRaw<
    Array<{
      id: string;
      slug: string;
      name: string;
      mainImageUrl: string | null;
      retailPrice: string;
      rank: number;
    }>
  >`
    SELECT
      p."id",
      p."slug",
      p."name",
      p."mainImageUrl",
      p."retailPrice"::text AS "retailPrice",
      ts_rank(p."searchVector", websearch_to_tsquery('pg_catalog.spanish', unaccent(${term}))) AS rank
    FROM "Product" p
    WHERE p."status" = 'ACTIVE'
      AND p."searchVector" @@ websearch_to_tsquery('pg_catalog.spanish', unaccent(${term}))
    ORDER BY rank DESC, p."isFeatured" DESC, p."updatedAt" DESC
    LIMIT ${limit}
  `;

  if (fts.length > 0) {
    return fts.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      mainImageUrl: r.mainImageUrl,
      retailPrice: Number(r.retailPrice),
    }));
  }

  // 2) Fallback pg_trgm — tolerante a erratas.
  const fuzzy = await db.$queryRaw<
    Array<{
      id: string;
      slug: string;
      name: string;
      mainImageUrl: string | null;
      retailPrice: string;
      sim: number;
    }>
  >`
    SELECT
      p."id",
      p."slug",
      p."name",
      p."mainImageUrl",
      p."retailPrice"::text AS "retailPrice",
      GREATEST(
        similarity(unaccent(p."name"), unaccent(${term})),
        similarity(unaccent(coalesce(p."modelCode", '')), unaccent(${term}))
      ) AS sim
    FROM "Product" p
    WHERE p."status" = 'ACTIVE'
      AND (
        unaccent(p."name") % unaccent(${term})
        OR unaccent(coalesce(p."modelCode", '')) % unaccent(${term})
      )
    ORDER BY sim DESC
    LIMIT ${limit}
  `;

  return fuzzy
    .filter((r) => r.sim >= TRGM_THRESHOLD)
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      mainImageUrl: r.mainImageUrl,
      retailPrice: Number(r.retailPrice),
    }));
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export async function searchPosts(q: string, limit = 5): Promise<PostHit[]> {
  const term = normalize(q);
  if (term.length < MIN_QUERY_LENGTH) return [];

  const fts = await db.$queryRaw<
    Array<{
      id: string;
      slug: string;
      title: string;
      excerpt: string | null;
      coverImageUrl: string | null;
      rank: number;
    }>
  >`
    SELECT
      b."id",
      b."slug",
      b."title",
      b."excerpt",
      b."coverImageUrl",
      ts_rank(b."searchVector", websearch_to_tsquery('pg_catalog.spanish', unaccent(${term}))) AS rank
    FROM "BlogPost" b
    WHERE b."status" = 'PUBLISHED'
      AND b."searchVector" @@ websearch_to_tsquery('pg_catalog.spanish', unaccent(${term}))
    ORDER BY rank DESC, b."publishedAt" DESC NULLS LAST
    LIMIT ${limit}
  `;

  if (fts.length > 0) {
    return fts.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt,
      coverImageUrl: r.coverImageUrl,
    }));
  }

  const fuzzy = await db.$queryRaw<
    Array<{
      id: string;
      slug: string;
      title: string;
      excerpt: string | null;
      coverImageUrl: string | null;
      sim: number;
    }>
  >`
    SELECT
      b."id", b."slug", b."title", b."excerpt", b."coverImageUrl",
      similarity(unaccent(b."title"), unaccent(${term})) AS sim
    FROM "BlogPost" b
    WHERE b."status" = 'PUBLISHED'
      AND unaccent(b."title") % unaccent(${term})
    ORDER BY sim DESC
    LIMIT ${limit}
  `;

  return fuzzy
    .filter((r) => r.sim >= TRGM_THRESHOLD)
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt,
      coverImageUrl: r.coverImageUrl,
    }));
}

// ---------------------------------------------------------------------------
// Buscador unificado (header / página /buscar)
// ---------------------------------------------------------------------------

export type GlobalSearchResult = {
  products: ProductHit[];
  posts: PostHit[];
  totalCount: number;
};

export async function searchAll(q: string): Promise<GlobalSearchResult> {
  const term = normalize(q);
  if (term.length < MIN_QUERY_LENGTH) {
    return { products: [], posts: [], totalCount: 0 };
  }
  const [products, posts] = await Promise.all([searchProducts(term, 10), searchPosts(term, 5)]);
  return { products, posts, totalCount: products.length + posts.length };
}
