import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSkuAvailable } from "@/lib/products/queries";

/**
 * GET /api/products/sku-check?sku=...&excludeId=...
 * Comprueba en vivo (editor de producto) si un SKU ya existe en otro producto,
 * para avisar antes de guardar y evitar duplicados. SKU vacío = disponible.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const url = new URL(request.url);
  const sku = url.searchParams.get("sku")?.trim() ?? "";
  const excludeId = url.searchParams.get("excludeId") ?? undefined;

  if (!sku) return NextResponse.json({ available: true });

  const available = await isSkuAvailable(sku, excludeId);
  return NextResponse.json({ available });
}
