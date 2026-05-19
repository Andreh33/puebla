/**
 * GET /api/admin/inspect-descriptions
 * Diagnóstico catálogo. Auth: Bearer ${SETUP_TOKEN}.
 */
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hasDirtySpans } from "@/lib/products/clean-description";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const expected = process.env.SETUP_TOKEN;
  if (!expected) return NextResponse.json({ error: "no token" }, { status: 503 });
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (got !== expected) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [
    total,
    activeCount,
    draftCount,
    withImage,
    withoutImage,
    withDescription,
    withoutDescription,
    fromWoo,
  ] = await Promise.all([
    db.product.count(),
    db.product.count({ where: { status: "ACTIVE" } }),
    db.product.count({ where: { status: "DRAFT" } }),
    db.product.count({ where: { mainImageUrl: { not: null } } }),
    db.product.count({ where: { mainImageUrl: null } }),
    db.product.count({ where: { description: { not: null } } }),
    db.product.count({ where: { description: null } }),
    db.product.count({ where: { externalId: { startsWith: "woocommerce:" } } }),
  ]);

  // Conteo de descripciones que aún contienen el patrón sucio (lectura
  // paginada para evitar timeout en catálogos grandes).
  let dirty = 0;
  let cursor: string | undefined;
  for (let i = 0; i < 30; i++) {
    const batch: Array<{ id: string; description: string | null }> = await db.product.findMany({
      where: { description: { not: null } },
      select: { id: true, description: true },
      orderBy: { id: "asc" },
      take: 200,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (batch.length === 0) break;
    for (const p of batch) if (hasDirtySpans(p.description)) dirty++;
    cursor = batch[batch.length - 1]!.id;
    if (batch.length < 200) break;
  }

  return NextResponse.json({
    ok: true,
    counts: {
      total,
      activeCount,
      draftCount,
      withImage,
      withoutImage,
      withDescription,
      withoutDescription,
      fromWoo,
      dirtyDescriptions: dirty,
    },
  });
}
