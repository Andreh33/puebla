import { NextResponse } from "next/server";
import { publicDatabase } from "@/lib/i18n/public-db";
import { normalizeLocale } from "@/lib/i18n/config";
import { searchProductWhere, searchPublicPosts } from "@/lib/i18n/search";
import { isLocalePublished } from "@/lib/i18n/readiness";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { cleanProductName } from "@/lib/utils/html";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimit(`search:${ip}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const locale=normalizeLocale(searchParams.get("locale"));
  if(!isLocalePublished(locale))return NextResponse.json({products:[],posts:[]});
  const db=publicDatabase(locale);
  const qRaw = (searchParams.get("q") || "").trim();
  if (qRaw.length < 2) {
    return NextResponse.json({ products: [], posts: [] });
  }
  const q = qRaw.slice(0, 80);

  try {
    const [products, posts] = await Promise.all([
      db.product.findMany({
        where: searchProductWhere(locale, q),
        take: 8,
        orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
        select: {
          id: true,
          slug: true,
          name: true,
          shortName: true,
          colorName: true,
          mainImageUrl: true,
          retailPrice: true,
          salePrice: true,
          brand: { select: { name: true } },
        },
      }),
      searchPublicPosts(locale, q, 5),
    ]);

    return NextResponse.json(
      {
        products: products.map((p) => ({
          id: p.id,
          slug: p.slug,
          name: cleanProductName(p.name),
          colorName: p.colorName,
          brandName: p.brand?.name,
          mainImageUrl: p.mainImageUrl,
          price: p.salePrice ? Number(p.salePrice) : Number(p.retailPrice),
        })),
        posts: posts.map((p) => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          excerpt: p.excerpt,
        })),
      },
      {
        headers: {
          "cache-control": "public, max-age=10, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (err) {
    console.error("[/api/search] error", err);
    return NextResponse.json({ products: [], posts: [] }, { status: 200 });
  }
}
