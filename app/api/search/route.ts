import { NextResponse } from "next/server";
import { db } from "@/lib/db";
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
  const qRaw = (searchParams.get("q") || "").trim();
  if (qRaw.length < 2) {
    return NextResponse.json({ products: [], posts: [] });
  }
  const q = qRaw.slice(0, 80);

  try {
    const [products, posts] = await Promise.all([
      db.product.findMany({
        where: {
          status: "ACTIVE",
          stock: { gt: 0 },
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { shortName: { contains: q, mode: "insensitive" } },
            { colorName: { contains: q, mode: "insensitive" } },
            { tags: { has: q.toLowerCase() } },
            { brand: { is: { name: { contains: q, mode: "insensitive" } } } },
          ],
        },
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
      db.blogPost.findMany({
        where: {
          status: "PUBLISHED",
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { excerpt: { contains: q, mode: "insensitive" } },
            { tags: { has: q.toLowerCase() } },
          ],
        },
        take: 5,
        orderBy: [{ publishedAt: "desc" }],
        select: { id: true, slug: true, title: true, excerpt: true },
      }),
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
