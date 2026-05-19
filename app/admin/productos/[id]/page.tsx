import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getProductById } from "@/lib/products/queries";
import { ProductEditor } from "./ProductEditor";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const product = await getProductById(id);
  if (!product) notFound();

  const [brands, categories] = await Promise.all([
    db.brand.findMany({
      orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true },
    }),
    db.category.findMany({
      orderBy: [{ parentId: "asc" }, { position: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, parentId: true },
    }),
  ]);

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
    colorName: product.colorName,
    colorHex: product.colorHex,
    gender: product.gender,
    sportUse: product.sportUse,
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
    isCustomized: product.isCustomized,
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
    mainImageUrl: product.mainImageUrl,
    images: product.images.map((img) => ({
      id: img.id,
      url: img.url,
      urlThumb: img.urlThumb,
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
