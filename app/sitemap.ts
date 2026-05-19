import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

// Tope (informativo) — Google admite 50.000 URLs / 50MB por sitemap. Si nos
// acercamos a este límite, los sub-sitemaps `/sitemap-products.xml` y
// `/sitemap-posts.xml` toman el relevo. El sitemap raíz mantiene los enlaces
// estáticos, marcas, categorías y landings locales.
const HARD_LIMIT = 5000;

export const revalidate = 3600; // 1h

type Entry = MetadataRoute.Sitemap[number];

function staticEntries(now: Date): Entry[] {
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/contacto`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/sobre-nosotros`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/marcas`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/aviso-legal`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/politica-privacidad`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/politica-cookies`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/condiciones-de-venta`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}

function localLandings(now: Date): Entry[] {
  const municipios = [
    "puebla-de-la-calzada",
    "montijo",
    "lobon",
    "talavera-la-real",
    "merida",
    "badajoz",
    "esparragalejo",
    "la-garrovilla",
    "torremayor",
    "calamonte",
  ];
  return municipios.map((m) => ({
    url: `${SITE_URL}/tienda-en/${m}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: Entry[] = [...staticEntries(now), ...localLandings(now)];

  // Lecturas en paralelo. Si la BD no está disponible (build inicial sin DB),
  // devolvemos solo las páginas estáticas para no romper la generación.
  try {
    const [brands, categories, productCount, postCount] = await Promise.all([
      db.brand.findMany({
        select: { slug: true, updatedAt: true },
        orderBy: { name: "asc" },
      }),
      db.category.findMany({
        select: { slug: true, updatedAt: true, products: { select: { id: true }, take: 1 } },
        orderBy: { name: "asc" },
      }),
      db.product.count({ where: { status: "ACTIVE" } }),
      db.blogPost.count({ where: { status: "PUBLISHED" } }),
    ]);

    for (const b of brands) {
      entries.push({
        url: `${SITE_URL}/marca/${b.slug}`,
        lastModified: b.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    for (const c of categories) {
      if (c.products.length === 0) continue;
      entries.push({
        url: `${SITE_URL}/${c.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }

    const overLimit = productCount + postCount + entries.length > HARD_LIMIT;

    if (overLimit) {
      // Referenciamos los sub-sitemaps mediante entradas-señuelo en el root.
      // (Next aún no soporta sitemap index nativo en `app/sitemap.ts`; los
      // motores de búsqueda los descubrirán a través de robots.txt + los
      // routes específicos `/sitemap-products.xml` y `/sitemap-posts.xml`.)
      return entries;
    }

    // Si no superamos límite, embebemos productos y posts en el principal.
    const [products, posts] = await Promise.all([
      db.product.findMany({
        where: { status: "ACTIVE" },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      db.blogPost.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, updatedAt: true, publishedAt: true },
        orderBy: { publishedAt: "desc" },
      }),
    ]);

    for (const p of products) {
      entries.push({
        url: `${SITE_URL}/producto/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
    for (const p of posts) {
      entries.push({
        url: `${SITE_URL}/blog/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  } catch (err) {
    // Eco silencioso: en build sin DB es esperable.
    console.warn("[sitemap] no se pudo consultar DB:", (err as Error).message);
  }

  return entries;
}
