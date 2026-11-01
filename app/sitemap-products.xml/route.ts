import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  PRODUCT_TRANSLATION_SELECT,
  contentLocaleEntries,
  editorialLocaleEntries,
  sitemapXml,
} from "@/lib/i18n/sitemap";
export const revalidate = 3600;
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const sources = await db.product.findMany({
      where: { status: "ACTIVE" },
      select: PRODUCT_TRANSLATION_SELECT,
      orderBy: { updatedAt: "desc" },
      take: 50000,
    });
    const entries = sources.flatMap((source) => contentLocaleEntries("products", source));

    return new NextResponse(sitemapXml(entries), {
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new NextResponse(sitemapXml([]), {
      headers: { "content-type": "application/xml; charset=utf-8" },
    });
  }
}
