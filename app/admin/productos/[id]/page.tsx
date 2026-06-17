import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ProductEditor } from "./ProductEditor";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const [product, brands, categories] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        brand: true,
        category: true,
        primaryCategory: { select: { slug: true } },
        images: { orderBy: { position: "asc" } },
        sizes: { orderBy: { position: "asc" } },
        audits: { orderBy: { createdAt: "desc" }, take: 50 },
        // m2m categories (Bloque 2)
        categories: { select: { categoryId: true } },
      },
    }),
    db.brand.findMany({
      orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true },
    }),
    db.category.findMany({
      orderBy: [{ parentId: "asc" }, { position: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, parentId: true },
    }),
  ]);

  if (!product) notFound();

  const serialized = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortName: product.shortName,
    description: product.description,
    brandId: product.brandId,
    categoryId: product.categoryId,
    source: product.source,
    externalId: product.externalId,
    externalUrl: product.externalUrl,
    modelCode: product.modelCode,
    sku: product.sku,
    colorName: product.colorName,
    colorHex: product.colorHex,
    gender: product.gender,
    sportUse: product.sportUse,
    footwearType: product.footwearType,
    garmentType: product.garmentType,
    garmentVariant: product.garmentVariant,
    primaryCategorySlug: product.primaryCategory?.slug ?? null,
    composition: product.composition,
    costPrice: product.costPrice ? Number(product.costPrice) : null,
    retailPrice: Number(product.retailPrice),
    salePrice: product.salePrice ? Number(product.salePrice) : null,
    taxRate: Number(product.taxRate),
    tags: product.tags,
    status: product.status,
    stock: product.stock,
    weight: product.weight ? Number(product.weight) : null,
    isFeatured: product.isFeatured,
    isOutlet: product.isOutlet,
    isCustomized: product.isCustomized,
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
    mainImageUrl: product.mainImageUrl,
    images: product.images.map((img) => ({
      id: img.id,
      url: img.url,
      urlThumb: img.urlThumb ?? null,
      urlMedium: img.urlMedium ?? null,
      blurDataUrl: img.blurDataUrl ?? null,
      width: img.width ?? null,
      height: img.height ?? null,
      alt: img.alt,
      position: img.position,
    })),
    sizes: product.sizes.map((s) => ({
      id: s.id,
      size: s.size,
      ean: s.ean,
      stock: s.stock,
      costPrice: s.costPrice ? Number(s.costPrice) : null,
      retailPrice: s.retailPrice ? Number(s.retailPrice) : null,
    })),
    audits: product.audits.map((a) => ({
      id: a.id,
      action: a.action,
      changes: a.changes,
      userId: a.userId,
      createdAt: a.createdAt.toISOString(),
    })),
    // m2m categories
    categoryIds: product.categories.map((pc) => pc.categoryId),
    primaryCategoryId: product.primaryCategoryId ?? null,
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={product.name}
        description={`${product.colorName} · ${product.brand.name}`}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Productos", href: "/admin/productos" },
          { label: product.shortName ?? product.name },
        ]}
        actions={
          <>
            <Badge variant={product.status === "ACTIVE" ? "success" : "draft"}>
              {product.status}
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link href={`/producto/${product.slug}`} target="_blank">
                Ver público
              </Link>
            </Button>
          </>
        }
      />

      <ProductEditor
        mode="edit"
        initial={serialized}
        brands={brands}
        categories={categories}
        userRole={(session?.user as { role?: "OWNER" | "EDITOR" } | undefined)?.role ?? "EDITOR"}
      />
    </div>
  );
}
