import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { db } from "@/lib/db";
import { BrandsManager } from "./BrandsManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marcas" };

export default async function MarcasPage() {
  const brands = await db.brand.findMany({
    orderBy: [{ isFeatured: "desc" }, { position: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });

  const serialized = brands.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    logoUrl: b.logoUrl,
    description: b.description,
    metaTitle: b.metaTitle,
    metaDescription: b.metaDescription,
    isFeatured: b.isFeatured,
    position: b.position,
    productsCount: b._count.products,
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Marcas"
        description={`${brands.length} marcas en catálogo`}
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Marcas" }]}
      />
      <BrandsManager brands={serialized} />
    </div>
  );
}
