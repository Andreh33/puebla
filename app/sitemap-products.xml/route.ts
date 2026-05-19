import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export const revalidate = 3600;
export const dynamic = "force-dynamic";

/**
 * Sub-sitemap específico de productos activos. Útil como fallback cuando el
 * sitemap principal supera ~50k URLs (límite de Google). Lo referencia
 * `app/robots.ts` para que los buscadores lo descubran.
 */
export async function GET() {
  try {
    const products = await db.product.findMany({
      where: { status: "ACTIVE" },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 50_000,
    });

    const urls = products
      .map(
        (p) =>
          `<url><loc>${SITE_URL}/producto/${p.slug}</loc><lastmod>${p.updatedAt.toISOString()}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`,
      )
      .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

    return new NextResponse(xml, {
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
      { headers: { "content-type": "application/xml; charset=utf-8" } },
    );
  }
}
