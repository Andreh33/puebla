import Link from "next/link";
import { Plus, Download } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { listProducts, type ProductListFilters } from "@/lib/products/queries";
import { ProductsTable } from "./ProductsTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Productos" };

function parseList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap((v) => v.split(",")).filter(Boolean);
  return value.split(",").filter(Boolean);
}

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const filters: ProductListFilters = {
    q: typeof sp.q === "string" ? sp.q : undefined,
    source: parseList(sp.source) as ProductListFilters["source"],
    brandIds: parseList(sp.brand),
    categoryIds: parseList(sp.category),
    genders: parseList(sp.gender) as ProductListFilters["genders"],
    statuses: parseList(sp.status) as ProductListFilters["statuses"],
    tags: parseList(sp.tag),
    noImage: sp.noImage === "1",
    minPrice: sp.minPrice ? Number(sp.minPrice) : undefined,
    maxPrice: sp.maxPrice ? Number(sp.maxPrice) : undefined,
    page: sp.page ? Number(sp.page) : 1,
    pageSize: sp.pageSize ? Number(sp.pageSize) : 50,
    sort: (typeof sp.sort === "string" ? sp.sort : undefined) as ProductListFilters["sort"],
  };

  const [data, brands, categories, allTags] = await Promise.all([
    listProducts(filters),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.category.findMany({
      orderBy: [{ parentId: "asc" }, { position: "asc" }, { name: "asc" }],
      select: { id: true, name: true, parentId: true },
    }),
    // Tags más populares (top 40)
    db.$queryRaw<Array<{ tag: string; n: bigint }>>`
      SELECT UNNEST(tags) AS tag, COUNT(*) AS n
      FROM "Product"
      GROUP BY tag
      ORDER BY n DESC
      LIMIT 40
    `.catch(() => [] as Array<{ tag: string; n: bigint }>),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Productos"
        description={`${data.total.toLocaleString("es-ES")} productos en catálogo`}
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Productos" }]}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/productos/exportCsv?${new URLSearchParams(
                Object.entries(sp).reduce<Record<string, string>>((acc, [k, v]) => {
                  if (typeof v === "string") acc[k] = v;
                  return acc;
                }, {}),
              ).toString()}`}>
                <Download className="h-4 w-4" />
                Exportar CSV
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/admin/productos/nuevo">
                <Plus className="h-4 w-4" />
                Nuevo producto
              </Link>
            </Button>
          </>
        }
      />

      <ProductsTable
        initialData={data}
        brands={brands}
        categories={categories}
        popularTags={allTags.map((t) => t.tag)}
      />
    </div>
  );
}
