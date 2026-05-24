"use server";

import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createInStoreSale, type CreateSaleInput } from "@/lib/pos/sale";
import { productFamily, skuOrFallback } from "@/lib/pos/sku";
import { renderReceiptPdf } from "@/lib/pos/receipt";
import { buildReceiptText, type ReceiptData } from "@/lib/pos/receipt-text";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  return session;
}

export type PosSearchResult = {
  id: string;
  name: string;
  baseSku: string;
  family: "calzado" | "textil" | "accesorio";
  mainImageUrl: string | null;
  unitPrice: number; // salePrice ?? retailPrice
  productStock: number;
  sizes: Array<{ size: string; stock: number }>;
};

/** Busca productos por nombre, sku, modelo o EAN para el TPV. */
export async function searchProductsForPos(q: string): Promise<PosSearchResult[]> {
  await requireSession();
  const term = q.trim();
  if (term.length < 2) return [];
  const rows = await db.product.findMany({
    where: {
      status: { in: ["ACTIVE", "OUT_OF_STOCK", "DRAFT"] },
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { sku: { contains: term, mode: "insensitive" } },
        { modelCode: { contains: term, mode: "insensitive" } },
        { sizes: { some: { ean: { contains: term } } } },
      ],
    },
    take: 20,
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, sku: true, modelCode: true, externalId: true,
      mainImageUrl: true, retailPrice: true, salePrice: true, stock: true,
      primaryCategory: { select: { slug: true } },
      sizes: { select: { size: true, stock: true }, orderBy: { position: "asc" } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    baseSku: skuOrFallback(r),
    family: productFamily(r.primaryCategory?.slug ?? null),
    mainImageUrl: r.mainImageUrl,
    unitPrice: Number(r.salePrice ?? r.retailPrice),
    productStock: r.stock,
    sizes: r.sizes,
  }));
}

export async function createInStoreSaleAction(input: CreateSaleInput): Promise<
  { ok: true; orderId: string; ticketNumber: string } | { ok: false; error: string }
> {
  const session = await requireSession();
  try {
    const res = await createInStoreSale(input, session.user.id);
    revalidatePath("/admin/pedidos");
    revalidatePath("/admin/productos");
    return { ok: true, orderId: res.orderId, ticketNumber: res.ticketNumber };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error al registrar la venta" };
  }
}

/** Genera el PDF del comprobante, lo sube a Blob y guarda la url + devuelve texto. */
export async function generateTicketAction(orderId: string): Promise<
  { ok: true; ticketUrl: string; text: string } | { ok: false; error: string }
> {
  await requireSession();
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return { ok: false, error: "Pedido no encontrado" };
    const meta = (order.metadata ?? {}) as Record<string, unknown>;
    const ticketNumber = String(meta.ticketNumber ?? order.id.slice(0, 8));
    const paymentMethod = (meta.paymentMethod as ReceiptData["paymentMethod"]) ?? "efectivo";

    const data: ReceiptData = {
      ticketNumber,
      createdAt: order.createdAt,
      items: order.items.map((it) => ({
        productName: it.productName,
        variantSize: it.variantSize,
        productSku: it.productSku ?? "",
        quantity: it.quantity,
        subtotal: Number(it.subtotal),
      })),
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      total: Number(order.total),
      paymentMethod,
      ticketUrl: null,
    };

    const pdf = await renderReceiptPdf(data);
    const blob = await put(`tickets/${ticketNumber}.pdf`, pdf, {
      access: "public",
      contentType: "application/pdf",
      addRandomSuffix: true,
    });

    await db.order.update({
      where: { id: orderId },
      data: { metadata: { ...meta, ticketNumber, ticketUrl: blob.url } },
    });

    const text = buildReceiptText({ ...data, ticketUrl: blob.url });
    return { ok: true, ticketUrl: blob.url, text };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error al generar el ticket" };
  }
}
