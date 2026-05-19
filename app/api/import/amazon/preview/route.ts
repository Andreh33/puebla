/**
 * POST /api/import/amazon/preview
 * Body: { asins: string[] }
 * Devuelve la información normalizada sin tocar la base de datos.
 */
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  getItems,
  AmazonNotConfiguredError,
  AmazonApiError,
} from "@/lib/amazon/paapi-client";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const rl = rateLimit(`amazon-preview:${session.user.id}`, {
    limit: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Demasiadas peticiones." },
      { status: 429 },
    );
  }

  if (process.env.AMAZON_ENABLED !== "true") {
    return NextResponse.json(
      { ok: false, error: "Conector Amazon no habilitado (AMAZON_ENABLED != true)" },
      { status: 503 },
    );
  }

  let body: { asins?: unknown };
  try {
    body = (await req.json()) as { asins?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const raw = Array.isArray(body.asins) ? body.asins : [];
  const asins = Array.from(
    new Set(
      raw
        .map((v) => String(v).trim().toUpperCase())
        .filter((v) => /^[A-Z0-9]{10}$/.test(v)),
    ),
  ).slice(0, 10);

  if (asins.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No hay ASINs válidos en la petición" },
      { status: 400 },
    );
  }

  try {
    const items = await getItems(asins);
    return NextResponse.json({ ok: true, items });
  } catch (err) {
    if (err instanceof AmazonNotConfiguredError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 503 });
    }
    if (err instanceof AmazonApiError) {
      console.error("[amazon/preview] AmazonApiError", err.cause);
      return NextResponse.json(
        { ok: false, error: "Amazon devolvió un error" },
        { status: 502 },
      );
    }
    console.error("[amazon/preview] error", err);
    return NextResponse.json(
      { ok: false, error: "Error desconocido" },
      { status: 500 },
    );
  }
}
