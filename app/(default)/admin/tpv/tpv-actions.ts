"use server";

import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { productFamily, skuOrFallback } from "@/lib/pos/sku";
import { validatePromoCode } from "@/lib/promo/validate";
import type { PosCatalogItem, PosCatalogParams, PosFilters } from "./pos-shared";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  return session;
}

/** Valida un código promocional para el TPV y devuelve el descuento en € sobre
 *  `subtotalGross` (bruto del ticket). Reutiliza el validador común. */
export async function validatePromoForPos(
  code: string,
  subtotalGross: number,
): Promise<{ ok: true; code: string; discount: number } | { ok: false; error: string }> {
  await requireSession();
  const res = await validatePromoCode(code, subtotalGross);
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, code: res.code, discount: res.discount };
}

/**
 * Catálogo del TPV: busca por término (nombre/sku/modelo/EAN) y/o filtra por
 * stock, destacado, oferta, categoría, marca y etiqueta. Devuelve hasta `take`
 * fichas listas para el grid (con precio efectivo y tallas con stock).
 */
export async function searchPosCatalog(
  params: PosCatalogParams,
): Promise<PosCatalogItem[]> {
  await requireSession();
  const term = (params.q ?? "").trim();
  const take = Math.min(Math.max(params.take ?? 48, 1), 100);

  const and: Prisma.ProductWhereInput[] = [
    { status: { in: ["ACTIVE", "OUT_OF_STOCK", "DRAFT"] } },
  ];

  if (term.length >= 2) {
    and.push({
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { sku: { contains: term, mode: "insensitive" } },
        { modelCode: { contains: term, mode: "insensitive" } },
        { sizes: { some: { ean: { contains: term } } } },
      ],
    });
  }
  if (params.inStock) {
    and.push({ OR: [{ stock: { gt: 0 } }, { sizes: { some: { stock: { gt: 0 } } } }] });
  }
  if (params.featured) and.push({ isFeatured: true });
  if (params.onSale) and.push({ salePrice: { not: null } });
  if (params.brandSlug) and.push({ brand: { slug: params.brandSlug } });
  if (params.categorySlug) {
    and.push({
      OR: [
        { primaryCategory: { slug: params.categorySlug } },
        { category: { slug: params.categorySlug } },
        { categories: { some: { category: { slug: params.categorySlug } } } },
      ],
    });
  }
  if (params.tag) and.push({ tags: { has: params.tag } });

  const rows = await db.product.findMany({
    where: { AND: and },
    take,
    orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      colorName: true,
      sku: true,
      modelCode: true,
      externalId: true,
      mainImageUrl: true,
      retailPrice: true,
      salePrice: true,
      stock: true,
      isFeatured: true,
      tags: true,
      brand: { select: { name: true } },
      primaryCategory: { select: { slug: true, name: true } },
      category: { select: { slug: true, name: true } },
      sizes: { select: { size: true, stock: true }, orderBy: { position: "asc" } },
    },
  });

  return rows.map((r) => {
    const retail = Number(r.retailPrice);
    const sale = r.salePrice == null ? null : Number(r.salePrice);
    const onSale = sale != null && sale < retail;
    return {
      id: r.id,
      name: r.name,
      baseSku: skuOrFallback(r),
      colorName: r.colorName,
      family: productFamily(r.primaryCategory?.slug ?? r.category?.slug ?? null),
      mainImageUrl: r.mainImageUrl,
      unitPrice: onSale ? (sale as number) : retail,
      retailPrice: retail,
      salePrice: sale,
      onSale,
      productStock: r.stock,
      isFeatured: r.isFeatured,
      brandName: r.brand?.name ?? "",
      categoryName: r.primaryCategory?.name ?? r.category?.name ?? null,
      tags: r.tags ?? [],
      sizes: r.sizes,
    } satisfies PosCatalogItem;
  });
}

/** Listas para los filtros del TPV (marcas, categorías, etiquetas). */
export async function getPosFilters(): Promise<PosFilters> {
  await requireSession();
  const [brands, categories, tagRows] = await Promise.all([
    db.brand.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { slug: true, name: true },
    }),
    db.category.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { slug: true, name: true },
    }),
    db.product.findMany({
      where: { tags: { isEmpty: false } },
      select: { tags: true },
      take: 500,
    }),
  ]);

  const tagSet = new Set<string>();
  for (const r of tagRows) for (const t of r.tags) tagSet.add(t);
  const tags = [...tagSet].sort((a, b) => a.localeCompare(b, "es")).slice(0, 40);

  return { brands, categories, tags };
}
