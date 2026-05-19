/**
 * Garbage collector de Vercel Blob.
 *
 * Lista todos los blobs y los cruza con las referencias en DB:
 *   - ProductImage.url / urlMedium / urlThumb / originalUrl
 *   - BlogPost.coverImageUrl / ogImageUrl
 *   - Brand.logoUrl
 *   - Category.imageUrl
 *   - Product.mainImageUrl
 *
 * Devuelve los blobs que no están referenciados Y se subieron hace > N días.
 * El borrado es manual (admin) — esta función solo lista candidatos.
 */
import { list, del } from "@vercel/blob";
import { db } from "@/lib/db";

export type OrphanBlob = {
  url: string;
  pathname: string;
  uploadedAt: Date;
  size: number;
};

function token(): string {
  const t = process.env.BLOB_READ_WRITE_TOKEN;
  if (!t) {
    throw new Error(
      "Vercel Blob no configurado — añade BLOB_READ_WRITE_TOKEN a .env.local.",
    );
  }
  return t;
}

/**
 * Carga el set completo de URLs referenciadas en DB. Devuelve un Set para
 * lookups O(1). Se normaliza eliminando query strings.
 */
export async function loadReferencedUrls(): Promise<Set<string>> {
  const [productImages, posts, brands, categories, products] = await Promise.all([
    db.productImage.findMany({
      select: { url: true, urlMedium: true, urlThumb: true, originalUrl: true },
    }),
    db.blogPost.findMany({ select: { coverImageUrl: true, ogImageUrl: true } }),
    db.brand.findMany({ select: { logoUrl: true } }),
    db.category.findMany({ select: { imageUrl: true } }),
    db.product.findMany({ select: { mainImageUrl: true } }),
  ]);

  const set = new Set<string>();
  const add = (u?: string | null) => {
    if (!u) return;
    set.add(stripQuery(u));
  };
  for (const i of productImages) {
    add(i.url);
    add(i.urlMedium);
    add(i.urlThumb);
    add(i.originalUrl);
  }
  for (const p of posts) {
    add(p.coverImageUrl);
    add(p.ogImageUrl);
  }
  for (const b of brands) add(b.logoUrl);
  for (const c of categories) add(c.imageUrl);
  for (const p of products) add(p.mainImageUrl);
  return set;
}

function stripQuery(url: string): string {
  const ix = url.indexOf("?");
  return ix < 0 ? url : url.slice(0, ix);
}

/**
 * Busca blobs huérfanos. Iterates con cursor para soportar > 1000.
 */
export async function findOrphanBlobs(
  olderThanDays = 7,
): Promise<OrphanBlob[]> {
  const t = token();
  const referenced = await loadReferencedUrls();
  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

  const orphans: OrphanBlob[] = [];
  let cursor: string | undefined = undefined;
  // Loop de paginación; en raras ocasiones del Vercel Blob list hay cursors.
  do {
    const result: Awaited<ReturnType<typeof list>> = await list({
      token: t,
      cursor,
      limit: 1000,
    });
    for (const b of result.blobs) {
      const uploadedAt = b.uploadedAt instanceof Date ? b.uploadedAt : new Date(b.uploadedAt);
      if (uploadedAt.getTime() > cutoff) continue;
      const url = stripQuery(b.url);
      if (referenced.has(url)) continue;
      orphans.push({
        url: b.url,
        pathname: b.pathname,
        uploadedAt,
        size: b.size,
      });
    }
    cursor = result.cursor ?? undefined;
  } while (cursor);

  return orphans;
}

/**
 * Borra una lista de URLs. Tolerante a fallos individuales.
 */
export async function purgeOrphans(
  urls: string[],
): Promise<{ deleted: number; errors: number }> {
  if (urls.length === 0) return { deleted: 0, errors: 0 };
  const t = token();
  let deleted = 0;
  let errors = 0;
  // Borrado por lotes — del() acepta arrays, pero limitamos para evitar timeouts.
  const BATCH = 50;
  for (let i = 0; i < urls.length; i += BATCH) {
    const slice = urls.slice(i, i + BATCH);
    try {
      await del(slice, { token: t });
      deleted += slice.length;
    } catch (err) {
      console.error("[blob:gc] purge batch falló", err);
      errors += slice.length;
    }
  }
  return { deleted, errors };
}
