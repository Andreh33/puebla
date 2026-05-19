/**
 * GET /api/admin/inspect-descriptions
 * Endpoint debug efímero — devuelve 3 muestras de descripción para ver
 * qué hay realmente en DB. Auth: Bearer ${SETUP_TOKEN}.
 */
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hasDirtySpans } from "@/lib/products/clean-description";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const expected = process.env.SETUP_TOKEN;
  if (!expected) return NextResponse.json({ error: "no token" }, { status: 503 });
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (got !== expected) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Busca productos con descripción larga (> 200 chars) y muestrea 5.
  const samples = await db.product.findMany({
    where: {
      description: { not: null },
      OR: [
        { sku: { in: ["8520", "8510"] } },
        { externalId: { in: ["woocommerce:38862", "woocommerce:38764"] } },
        { description: { contains: "data-url" } },
        { description: { contains: "ca://" } },
        { description: { contains: "tabindex" } },
        { description: { contains: "Camara_butilica" } },
      ],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
    },
    take: 10,
  });

  return NextResponse.json({
    ok: true,
    count: samples.length,
    samples: samples.map((s) => ({
      slug: s.slug,
      name: s.name,
      descriptionLen: s.description?.length ?? 0,
      descriptionPreview: s.description?.slice(0, 500),
      hasDirty: hasDirtySpans(s.description),
    })),
  });
}
