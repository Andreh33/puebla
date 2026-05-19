/**
 * GET /api/admin/gender-stats — diagnóstico de género en productos.
 * Auth: Bearer ${SETUP_TOKEN}.
 */
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const expected = process.env.SETUP_TOKEN;
  if (!expected) return NextResponse.json({ error: "no token" }, { status: 503 });
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (got !== expected)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const byGender = await db.product.groupBy({
    by: ["gender"],
    where: { status: "ACTIVE" },
    _count: { _all: true },
  });

  const sampleNinos = await db.product.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { name: { contains: "NIÑO", mode: "insensitive" } },
        { name: { contains: "JR", mode: "insensitive" } },
        { name: { contains: "JUNIOR", mode: "insensitive" } },
        { name: { contains: "INFANTIL", mode: "insensitive" } },
      ],
    },
    select: { sku: true, name: true, gender: true, category: { select: { slug: true } } },
    take: 10,
  });

  return NextResponse.json({
    ok: true,
    byGender: byGender.map((g) => ({ gender: g.gender, count: g._count._all })),
    sampleNinosByName: sampleNinos,
  });
}
