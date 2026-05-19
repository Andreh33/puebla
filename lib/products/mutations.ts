import "server-only";
import { Decimal } from "decimal.js";
import { db, type Prisma } from "@/lib/db";
import { slugifyEs, uniqueSlug } from "@/lib/seo/slug";
import { ProductSchema, ProductSizeSchema } from "@/lib/validators";
import type { z } from "zod";

export type ProductInput = z.infer<typeof ProductSchema>;
export type ProductSizeInput = z.infer<typeof ProductSizeSchema>;

function diff<T extends Record<string, unknown>>(prev: T, next: T): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const k of keys) {
    const a = prev[k];
    const b = next[k];
    const aStr = a instanceof Date ? a.toISOString() : JSON.stringify(a ?? null);
    const bStr = b instanceof Date ? b.toISOString() : JSON.stringify(b ?? null);
    if (aStr !== bStr) out[k] = { from: a ?? null, to: b ?? null };
  }
  return out;
}

function toDecimal<T extends number | null | undefined>(v: T): Prisma.Decimal | null | undefined {
  if (v == null) return v as null | undefined;
  return new Decimal(v) as unknown as Prisma.Decimal;
}

async function ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
  return uniqueSlug(base, async (s) => {
    const found = await db.product.findUnique({ where: { slug: s }, select: { id: true } });
    if (!found) return false;
    if (excludeId && found.id === excludeId) return false;
    return true;
  });
}

export async function createProduct(
  input: ProductInput,
  sizes: ProductSizeInput[] = [],
  userId?: string,
) {
  const parsed = ProductSchema.parse(input);
  const slug = await ensureUniqueSlug(parsed.slug || slugifyEs(`${parsed.name}-${parsed.colorName}`));

  const created = await db.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        ...parsed,
        slug,
        retailPrice: parsed.retailPrice as unknown as Prisma.Decimal,
        costPrice: parsed.costPrice != null ? (parsed.costPrice as unknown as Prisma.Decimal) : null,
        salePrice: parsed.salePrice != null ? (parsed.salePrice as unknown as Prisma.Decimal) : null,
        taxRate: parsed.taxRate as unknown as Prisma.Decimal,
        weight: parsed.weight != null ? (parsed.weight as unknown as Prisma.Decimal) : null,
        externalUrl: parsed.externalUrl || null,
        colorHex: parsed.colorHex || null,
        publishedAt: parsed.status === "ACTIVE" ? new Date() : null,
      },
    });
    if (sizes.length) {
      await tx.productSize.createMany({
        data: sizes.map((s, i) => ({
          productId: product.id,
          size: s.size,
          ean: s.ean || null,
          stock: s.stock ?? 0,
          costPrice: s.costPrice != null ? (s.costPrice as unknown as Prisma.Decimal) : null,
          retailPrice: s.retailPrice != null ? (s.retailPrice as unknown as Prisma.Decimal) : null,
          position: i,
        })),
      });
    }
    await tx.productAudit.create({
      data: {
        productId: product.id,
        userId,
        action: "created",
        changes: { name: { from: null, to: product.name } } as Prisma.InputJsonValue,
      },
    });
    return product;
  });

  return created;
}

export async function updateProduct(
  id: string,
  input: ProductInput,
  sizes: ProductSizeInput[] | undefined,
  userId?: string,
) {
  const parsed = ProductSchema.parse(input);
  const existing = await db.product.findUnique({
    where: { id },
    include: { sizes: true },
  });
  if (!existing) throw new Error("Producto no encontrado");

  const slug =
    parsed.slug && parsed.slug !== existing.slug
      ? await ensureUniqueSlug(parsed.slug, id)
      : existing.slug;

  const wasActive = existing.status === "ACTIVE";
  const willBeActive = parsed.status === "ACTIVE";

  const updated = await db.$transaction(async (tx) => {
    const product = await tx.product.update({
      where: { id },
      data: {
        ...parsed,
        slug,
        retailPrice: parsed.retailPrice as unknown as Prisma.Decimal,
        costPrice: parsed.costPrice != null ? (parsed.costPrice as unknown as Prisma.Decimal) : null,
        salePrice: parsed.salePrice != null ? (parsed.salePrice as unknown as Prisma.Decimal) : null,
        taxRate: parsed.taxRate as unknown as Prisma.Decimal,
        weight: parsed.weight != null ? (parsed.weight as unknown as Prisma.Decimal) : null,
        externalUrl: parsed.externalUrl || null,
        colorHex: parsed.colorHex || null,
        publishedAt: willBeActive && !wasActive ? new Date() : existing.publishedAt,
      },
    });

    if (sizes) {
      // Replace strategy: borrar y volver a crear
      await tx.productSize.deleteMany({ where: { productId: id } });
      if (sizes.length) {
        await tx.productSize.createMany({
          data: sizes.map((s, i) => ({
            productId: id,
            size: s.size,
            ean: s.ean || null,
            stock: s.stock ?? 0,
            costPrice: s.costPrice != null ? (s.costPrice as unknown as Prisma.Decimal) : null,
            retailPrice:
              s.retailPrice != null ? (s.retailPrice as unknown as Prisma.Decimal) : null,
            position: i,
          })),
        });
      }
    }

    const changes = diff(
      {
        name: existing.name,
        slug: existing.slug,
        status: existing.status,
        retailPrice: existing.retailPrice.toString(),
        brandId: existing.brandId,
        categoryId: existing.categoryId,
        colorName: existing.colorName,
      },
      {
        name: product.name,
        slug: product.slug,
        status: product.status,
        retailPrice: product.retailPrice.toString(),
        brandId: product.brandId,
        categoryId: product.categoryId,
        colorName: product.colorName,
      },
    );

    if (Object.keys(changes).length) {
      await tx.productAudit.create({
        data: {
          productId: id,
          userId,
          action:
            !wasActive && willBeActive
              ? "published"
              : wasActive && !willBeActive
                ? "unpublished"
                : "updated",
          changes: changes as Prisma.InputJsonValue,
        },
      });
    }

    return product;
  });

  return updated;
}

export async function duplicateProduct(id: string, userId?: string) {
  const src = await db.product.findUnique({
    where: { id },
    include: { sizes: true, images: true },
  });
  if (!src) throw new Error("Producto origen no existe");

  const baseSlug = `${src.slug}-copia`;
  const slug = await ensureUniqueSlug(baseSlug);

  const cloned = await db.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        slug,
        name: `${src.name} (copia)`,
        shortName: src.shortName,
        description: src.description,
        brandId: src.brandId,
        categoryId: src.categoryId,
        source: "LOCAL",
        externalId: null,
        externalUrl: src.externalUrl,
        modelCode: src.modelCode,
        sku: null, // sku es @unique → no se copia en duplicados; el admin asignará uno nuevo.
        colorName: src.colorName,
        colorHex: src.colorHex,
        gender: src.gender,
        sportUse: src.sportUse,
        composition: src.composition,
        costPrice: src.costPrice,
        retailPrice: src.retailPrice,
        salePrice: src.salePrice,
        taxRate: src.taxRate,
        mainImageUrl: src.mainImageUrl,
        tags: src.tags,
        status: "DRAFT",
        stock: 0,
        weight: src.weight,
        isFeatured: false,
        isCustomized: true,
        metaTitle: src.metaTitle,
        metaDescription: src.metaDescription,
      },
    });
    if (src.sizes.length) {
      await tx.productSize.createMany({
        data: src.sizes.map((s, i) => ({
          productId: product.id,
          size: s.size,
          ean: null, // EAN único — no clonar
          stock: 0,
          costPrice: s.costPrice,
          retailPrice: s.retailPrice,
          position: i,
        })),
      });
    }
    if (src.images.length) {
      await tx.productImage.createMany({
        data: src.images.map((img, i) => ({
          productId: product.id,
          url: img.url,
          urlThumb: img.urlThumb,
          urlMedium: img.urlMedium,
          alt: img.alt,
          position: i,
          width: img.width,
          height: img.height,
          blurDataUrl: img.blurDataUrl,
          source: img.source,
          originalUrl: img.originalUrl,
        })),
      });
    }
    await tx.productAudit.create({
      data: {
        productId: product.id,
        userId,
        action: "duplicated",
        changes: { from: { to: src.id } } as Prisma.InputJsonValue,
      },
    });
    return product;
  });

  return cloned;
}

export async function archiveProduct(id: string, userId?: string) {
  const product = await db.product.update({
    where: { id },
    data: { status: "INACTIVE" },
  });
  await db.productAudit.create({
    data: { productId: id, userId, action: "archived" },
  });
  return product;
}

export async function deleteProduct(id: string, userId?: string) {
  // Log antes de borrar (audit cascade-deletes con producto, así que log informativo standalone)
  await db.productAudit.create({
    data: { productId: id, userId, action: "deleted" },
  });
  return db.product.delete({ where: { id } });
}

export async function bulkSetStatus(ids: string[], status: "ACTIVE" | "INACTIVE" | "DRAFT", userId?: string) {
  if (!ids.length) return 0;
  const res = await db.product.updateMany({
    where: { id: { in: ids } },
    data: {
      status,
      publishedAt: status === "ACTIVE" ? new Date() : undefined,
    },
  });
  await db.productAudit.createMany({
    data: ids.map((productId) => ({
      productId,
      userId,
      action: `bulk_${status.toLowerCase()}`,
    })),
  });
  return res.count;
}

export async function bulkSetCategory(ids: string[], categoryId: string, userId?: string) {
  if (!ids.length) return 0;
  const res = await db.product.updateMany({
    where: { id: { in: ids } },
    data: { categoryId },
  });
  await db.productAudit.createMany({
    data: ids.map((productId) => ({
      productId,
      userId,
      action: "bulk_category",
      changes: { categoryId: { to: categoryId } } as Prisma.InputJsonValue,
    })),
  });
  return res.count;
}

export async function bulkAddTags(ids: string[], tags: string[], userId?: string) {
  if (!ids.length || !tags.length) return 0;
  // Prisma no permite append a string[] sin raw. Hacemos read+write.
  const products = await db.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, tags: true },
  });
  await db.$transaction(
    products.map((p) =>
      db.product.update({
        where: { id: p.id },
        data: { tags: Array.from(new Set([...p.tags, ...tags])) },
      }),
    ),
  );
  await db.productAudit.createMany({
    data: ids.map((productId) => ({
      productId,
      userId,
      action: "bulk_add_tags",
      changes: { tags: { to: tags } } as Prisma.InputJsonValue,
    })),
  });
  return products.length;
}

export async function bulkDelete(ids: string[], userId?: string) {
  if (!ids.length) return 0;
  await db.productAudit.createMany({
    data: ids.map((productId) => ({
      productId,
      userId,
      action: "bulk_deleted",
    })),
  });
  const res = await db.product.deleteMany({ where: { id: { in: ids } } });
  return res.count;
}
