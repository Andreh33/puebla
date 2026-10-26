import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ProductEditor } from "../[id]/ProductEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nuevo producto" };

export default async function NuevoProductoPage() {
  const session = await auth();
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

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Nuevo producto"
        description="Recuerda: 1 color = 1 producto independiente."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Productos", href: "/admin/productos" },
          { label: "Nuevo" },
        ]}
      />
      <ProductEditor
        mode="create"
        brands={brands}
        categories={categories}
        userRole={(session?.user as { role?: "OWNER" | "EDITOR" } | undefined)?.role ?? "EDITOR"}
      />
    </div>
  );
}
