import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { db } from "@/lib/db";
import { CategoriesManager } from "./CategoriesManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categorías" };

export default async function CategoriasPage() {
  const categories = await db.category.findMany({
    orderBy: [{ parentId: "asc" }, { position: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true, children: true } } },
  });

  const serialized = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    parentId: c.parentId,
    description: c.description,
    imageUrl: c.imageUrl,
    metaTitle: c.metaTitle,
    metaDescription: c.metaDescription,
    position: c.position,
    isFeatured: c.isFeatured,
    productsCount: c._count.products,
    childrenCount: c._count.children,
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Categorías"
        description={`${categories.length} categorías. Arrastra para reordenar o anidar.`}
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Categorías" }]}
      />
      <CategoriesManager categories={serialized} />
    </div>
  );
}
