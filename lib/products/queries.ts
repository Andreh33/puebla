import "server-only";
import { db, type Prisma } from "@/lib/db";
import { IN_STOCK_WHERE } from "@/lib/products/in-stock";

export type ProductSourceFilter = "LOCAL" | "MIRAVIA" | "AMAZON";
export type ProductStatusFilter = "DRAFT" | "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK";
export type GenderFilter =
  | "HOMBRE"
  | "MUJER"
  | "UNISEX"
  | "NINO"
  | "NINA"
  | "BEBE"
  | "NO_ESPECIFICADO";

export interface ProductListFilters {
  q?: string;
  source?: ProductSourceFilter[];
  brandIds?: string[];
  categoryIds?: string[];
  genders?: GenderFilter[];
  statuses?: ProductStatusFilter[];
  tags?: string[];
  noImage?: boolean;
  /** Bloque 3: calzado SIN footwearType asignado (para etiquetar los NULL). */
  footwearTypeNull?: boolean;
  /** Bloque 6: textil SIN garmentType asignado (para etiquetar los NULL). */
  garmentTypeNull?: boolean;
  /** Bloque 6 §18: prenda con variante aplicable (camiseta/pantalon/mallas) sin variant. */
  garmentVariantNull?: boolean;
  minPrice?: number;
  maxPrice?: number;
  isFeatured?: boolean;
  page?: number;
  pageSize?: number;
  sort?: "createdAt_desc" | "createdAt_asc" | "name_asc" | "price_asc" | "price_desc";
}

export interface ProductListResult {
  rows: Array<{
    id: string;
    slug: string;
    name: string;
    shortName: string | null;
    colorName: string;
    colorHex: string | null;
    sku: string | null;
    modelCode: string | null;
    externalId: string | null;
    mainImageUrl: string | null;
    brand: { id: string; name: string };
    category: { id: string; name: string };
    gender: string;
    footwearType: string | null;
    isCalzado: boolean;
    garmentType: string | null;
    isTextil: boolean;
    garmentVariant: string | null;
    source: string;
    status: string;
    retailPrice: string;
    salePrice: string | null;
    /** Coste (lo que le cuesta a la tienda). Puede ser null si no se registró. */
    costPrice: string | null;
    stock: number;
    sizesCount: number;
    tags: string[];
    isFeatured: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  page: number;
  pageSize: number;
}

function buildWhere(f: ProductListFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};
  const AND: Prisma.ProductWhereInput[] = [];

  if (f.q && f.q.trim()) {
    const q = f.q.trim();
    AND.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { shortName: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { modelCode: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { externalId: { contains: q, mode: "insensitive" } },
        { brand: { name: { contains: q, mode: "insensitive" } } },
        { category: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }

  if (f.source && f.source.length) AND.push({ source: { in: f.source } });
  if (f.brandIds && f.brandIds.length) AND.push({ brandId: { in: f.brandIds } });
  if (f.categoryIds && f.categoryIds.length)
    AND.push({ categoryId: { in: f.categoryIds } });
  if (f.genders && f.genders.length) AND.push({ gender: { in: f.genders } });
  if (f.statuses && f.statuses.length) AND.push({ status: { in: f.statuses } });
  if (f.tags && f.tags.length) AND.push({ tags: { hasSome: f.tags } });
  if (f.noImage) AND.push({ mainImageUrl: null });
  // Bloque 3: calzado sin footwearType (mismo AND — patrón filtros combinados).
  if (f.footwearTypeNull)
    AND.push({ footwearType: null, primaryCategory: { slug: { endsWith: "-calzado" } } });
  // Bloque 6: textil sin garmentType (mismo AND).
  if (f.garmentTypeNull)
    AND.push({ garmentType: null, primaryCategory: { slug: { endsWith: "-textil" } } });
  // Bloque 6 §18: prenda con variante aplicable sin variant asignada (mismo AND).
  if (f.garmentVariantNull)
    AND.push({ garmentVariant: null, garmentType: { in: ["camiseta", "pantalon", "mallas"] } });
  if (f.minPrice != null) AND.push({ retailPrice: { gte: f.minPrice } });
  if (f.maxPrice != null) AND.push({ retailPrice: { lte: f.maxPrice } });
  if (f.isFeatured != null) AND.push({ isFeatured: f.isFeatured });

  if (AND.length) where.AND = AND;
  return where;
}

function buildOrderBy(
  sort: ProductListFilters["sort"],
): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "createdAt_asc":
      return { createdAt: "asc" };
    case "name_asc":
      return { name: "asc" };
    case "price_asc":
      return { retailPrice: "asc" };
    case "price_desc":
      return { retailPrice: "desc" };
    case "createdAt_desc":
    default:
      return { createdAt: "desc" };
  }
}

export async function listProducts(filters: ProductListFilters = {}): Promise<ProductListResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(500, Math.max(1, filters.pageSize ?? 50));
  const where = buildWhere(filters);
  const orderBy = buildOrderBy(filters.sort);

  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        brand: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        primaryCategory: { select: { slug: true } }, // Bloque 3: para isCalzado + bulk footwearType
        _count: { select: { sizes: true } },
      },
    }),
  ]);

  // Stock REAL para mostrar: para productos con tallas la verdad es la suma de
  // ProductSize.stock (igual que la tienda y recomputeProductStock), NO el
  // escalar Product.stock — que puede quedar obsoleto (p.ej. importación que
  // carga stock por talla sin tocar el agregado, o ediciones previas). Sin esto
  // el listado/CSV mostraban 0 en productos que sí tienen stock por talla.
  const pageIds = rows.map((r) => r.id);
  const sizeAgg = pageIds.length
    ? await db.productSize.groupBy({
        by: ["productId"],
        where: { productId: { in: pageIds } },
        _sum: { stock: true },
      })
    : [];
  const sizeStockByProduct = new Map(
    sizeAgg.map((s) => [s.productId, s._sum.stock ?? 0]),
  );

  return {
    total,
    page,
    pageSize,
    rows: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      shortName: r.shortName,
      colorName: r.colorName,
      colorHex: r.colorHex,
      sku: r.sku ?? null,
      modelCode: r.modelCode ?? null,
      externalId: r.externalId ?? null,
      mainImageUrl: r.mainImageUrl,
      brand: r.brand,
      category: r.category,
      gender: r.gender,
      footwearType: r.footwearType,
      isCalzado: r.primaryCategory?.slug?.endsWith("-calzado") ?? false,
      garmentType: r.garmentType,
      isTextil: r.primaryCategory?.slug?.endsWith("-textil") ?? false,
      garmentVariant: r.garmentVariant,
      source: r.source,
      status: r.status,
      retailPrice: r.retailPrice.toString(),
      salePrice: r.salePrice ? r.salePrice.toString() : null,
      costPrice: r.costPrice ? r.costPrice.toString() : null,
      // Con tallas → suma real por talla; sin tallas → escalar del producto.
      stock: r._count.sizes > 0 ? (sizeStockByProduct.get(r.id) ?? 0) : r.stock,
      sizesCount: r._count.sizes,
      tags: r.tags,
      isFeatured: r.isFeatured,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  };
}

export async function getProductById(id: string) {
  return db.product.findUnique({
    where: { id },
    include: {
      brand: true,
      category: true, // relación antigua (Bloque 2 expand/contract) — se mantiene
      primaryCategory: { select: { slug: true } }, // Bloque 3: condiciona el selector de tipo de calzado
      images: { orderBy: { position: "asc" } },
      sizes: { orderBy: { position: "asc" } },
      audits: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
}

export async function getProductBySlug(slug: string) {
  return db.product.findUnique({
    where: { slug },
    include: {
      brand: true,
      category: true,
      images: { orderBy: { position: "asc" } },
      sizes: { orderBy: { position: "asc" } },
    },
  });
}

/**
 * Hermanos por modelCode (mismos modelos en otros colores).
 */
export async function getRelatedProducts(productId: string, limit = 8) {
  const base = await db.product.findUnique({
    where: { id: productId },
    select: { modelCode: true, categoryId: true },
  });
  if (!base) return [];
  const where: Prisma.ProductWhereInput = {
    id: { not: productId },
    status: "ACTIVE",
    AND: [IN_STOCK_WHERE],
    OR: [],
  };
  if (base.modelCode) where.OR?.push({ modelCode: base.modelCode });
  where.OR?.push({ categoryId: base.categoryId });

  return db.product.findMany({
    where,
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: { brand: { select: { name: true, slug: true } } },
  });
}

export async function getFeaturedProducts(limit = 12) {
  return db.product.findMany({
    where: { isFeatured: true, status: "ACTIVE", ...IN_STOCK_WHERE },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: { brand: { select: { name: true, slug: true } } },
  });
}

export async function isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
  const found = await db.product.findUnique({ where: { slug }, select: { id: true } });
  if (!found) return true;
  return excludeId ? found.id === excludeId : false;
}

/**
 * ¿El SKU está libre? El SKU es @unique en toda la tienda. Vacío = libre (es
 * opcional). `excludeId` permite editar un producto sin chocar consigo mismo.
 */
export async function isSkuAvailable(sku: string, excludeId?: string): Promise<boolean> {
  const trimmed = sku.trim();
  if (!trimmed) return true;
  const found = await db.product.findUnique({ where: { sku: trimmed }, select: { id: true } });
  if (!found) return true;
  return excludeId ? found.id === excludeId : false;
}
