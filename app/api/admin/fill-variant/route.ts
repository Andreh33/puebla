/**
 * POST /api/admin/fill-variant?type=camiseta&variant=manga_corta&gender=NINO
 *
 * Rellena el `garmentVariant` de los productos de un tipo que lo tienen EN BLANCO
 * (null), con la variante indicada. Útil cuando una variante "por defecto" (p. ej.
 * camisetas de manga corta) no se clasificó porque el nombre no lo decía.
 *
 * - NO pisa los que ya tienen variante (p. ej. los ya clasificados como manga_larga).
 * - `gender` opcional: si se da, solo esa sección; si no, todas MENOS bebé (sin variantes).
 * - El filtro público de variante se rige por `garmentVariant`, así que tras esto
 *   los productos aparecen bajo la variante en /[genero]/textil.
 *
 * Auth: Header `Authorization: Bearer ${SETUP_TOKEN}`.
 * Respuesta: { ok: true, type, variant, gender, updated: <nº> }
 */
import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { db, type Prisma } from "@/lib/db";
import { VARIANT_TO_TYPE, type GarmentVariant } from "@/lib/categories/garment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENDERS = ["HOMBRE", "MUJER", "NINO", "NINA", "UNISEX", "NO_ESPECIFICADO"] as const;

function checkAuth(req: NextRequest): NextResponse | null {
  const expected = process.env.SETUP_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "SETUP_TOKEN no configurado en este entorno" },
      { status: 503 },
    );
  }
  const header = req.headers.get("authorization") ?? "";
  const got = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (got !== expected) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const unauthorized = checkAuth(req);
  if (unauthorized) return unauthorized;

  const url = new URL(req.url);
  const type = (url.searchParams.get("type") ?? "").trim();
  const variant = (url.searchParams.get("variant") ?? "").trim();
  const gender = (url.searchParams.get("gender") ?? "").trim();

  // La variante debe pertenecer al tipo (p. ej. manga_corta → camiseta).
  if (!variant || VARIANT_TO_TYPE[variant as GarmentVariant] !== type) {
    return NextResponse.json(
      { ok: false, error: `La variante "${variant}" no pertenece al tipo "${type}".` },
      { status: 400 },
    );
  }
  if (gender && !(GENDERS as readonly string[]).includes(gender)) {
    return NextResponse.json(
      { ok: false, error: `Género no válido: "${gender}". Válidos: ${GENDERS.join(", ")}` },
      { status: 400 },
    );
  }

  // Solo rellena los que NO tienen variante (no pisa los ya clasificados). Por
  // defecto excluye bebé (su taxonomía no tiene variantes).
  const where: Prisma.ProductWhereInput = {
    garmentType: type,
    garmentVariant: null,
    gender: gender ? (gender as (typeof GENDERS)[number]) : { not: "BEBE" },
  };

  const res = await db.product.updateMany({ where, data: { garmentVariant: variant } });

  for (const g of ["hombre", "mujer", "nino", "nina"]) revalidatePath(`/${g}/textil`);
  revalidatePath("/catalogo");

  return NextResponse.json({
    ok: true,
    type,
    variant,
    gender: gender || "todos (no bebé)",
    updated: res.count,
  });
}
