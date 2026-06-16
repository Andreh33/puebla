/**
 * POST /api/admin/purge-products
 *
 * Borra TODOS los productos de la DB (con doble confirmación).
 *
 * Las relaciones ProductImage, ProductSize, ProductAudit y ProductCategory
 * tienen `onDelete: Cascade` hacia Product, por lo que `deleteMany({})` sobre
 * Product las elimina automáticamente sin necesidad de borrarlas manualmente.
 *
 * OrderItem.productId es nullable (String?) en el schema, por lo que antes
 * de borrar los productos se pone a null para desanclar los ítems de pedido
 * sin perder el histórico de pedidos.
 *
 * Auth: Header `Authorization: Bearer ${SETUP_TOKEN}` (env var en Vercel).
 *
 * Body requerido: { "confirm": "BORRAR-TODOS-LOS-PRODUCTOS" }
 *
 * Respuesta: { ok: true, deleted: <antes>, remaining: <después> }
 */
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONFIRM = "BORRAR-TODOS-LOS-PRODUCTOS";

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

  let body: { confirm?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* sin body o body no-JSON */
  }

  if (body.confirm !== CONFIRM) {
    return NextResponse.json(
      {
        error: "confirmation_required",
        hint: `POST { "confirm": "${CONFIRM}" }`,
      },
      { status: 400 },
    );
  }

  const before = await db.product.count();

  // Desanclar OrderItems antes de borrar productos (productId es nullable)
  await db.orderItem.updateMany({
    where: { productId: { not: null } },
    data: { productId: null },
  });

  // Borrar todos los productos; las cascade eliminan ProductImage/Size/Audit/Category
  await db.product.deleteMany({});

  const after = await db.product.count();

  return NextResponse.json({ ok: true, deleted: before, remaining: after });
}
