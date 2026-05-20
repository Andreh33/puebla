import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, jsonLd } from "@/lib/seo/schema-org";
import { ProductCardLuxe as ProductCard } from "@/components/public/ProductCardLuxe";
import { ProductFilters } from "@/components/public/ProductFilters";
import { GenderChips } from "@/components/public/GenderChips";
import { EmptyState } from "@/components/public/EmptyState";
import {
  buildProductWhere,
  getCategoryFacets,
  parseCategoryParams,
} from "@/lib/public-queries";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const GENDER_LABELS: Record<string, string> = {
  HOMBRE: "Hombre",
  MUJER: "Mujer",
  NINO: "Niño",
  NINA: "Niña",
  BEBE: "Bebé",
  UNISEX: "Unisex",
};

function pageTitle(sp: SearchParams): string {
  const genero = typeof sp.genero === "string" ? sp.genero.toUpperCase() : "";
  if (genero in GENDER_LABELS) return `${GENDER_LABELS[genero]} — Catálogo completo`;
  return "Catálogo completo";
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const sp = await searchParams;
  return buildMetadata({
    title: pageTitle(sp),
    description:
      "Catálogo completo de Zona Sport: ropa, calzado y accesorios deportivos con filtros por marca, color, talla y precio.",
    path: "/catalogo",
  });
}

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const filters = parseCategoryParams(sp);
  const perPage = filters.perPage ?? 24;
  const currentPageRequested = filters.page ?? 1;

  // Sin `categoryId` ni `brandId`: filtramos catálogo completo por género,
  // color, talla, marca, precio, oferta, novedad — lo que se haya pasado
  // por query string. El AND con `status: ACTIVE` lo añade buildProductWhere.
  const where = buildProductWhere({ filters });

  // Facets globales: agrupamos sin restringir por categoría para que las
  // opciones del sidebar reflejen el catálogo entero.
  const [count, products, brands, genders, colors, sizes] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
      skip: (currentPageRequested - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        slug: true,
        name: true,
        shortName: true,
        colorName: true,
        mainImageUrl: true,
        retailPrice: true,
        salePrice: true,
        source: true,
        brand: { select: { name: true, slug: true } },
        sizes: { select: { stock: true } },
      },
    }),
    db.product.groupBy({
      by: ["brandId"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
      orderBy: { _count: { brandId: "desc" } },
      take: 50,
    }),
    db.product.groupBy({
      by: ["gender"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
    }),
    db.product.groupBy({
      by: ["colorName"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
      orderBy: { _count: { colorName: "desc" } },
      take: 30,
    }),
    db.productSize.groupBy({
      by: ["size"],
      where: { product: { status: "ACTIVE" } },
      _count: { _all: true },
      orderBy: { _count: { size: "desc" } },
      take: 30,
    }),
  ]);

  // Brands: resolvemos id → name+slug. groupBy solo devuelve brandId.
  const brandIds = brands.map((b) => b.brandId);
  const brandRecords = brandIds.length
    ? await db.brand.findMany({
        where: { id: { in: brandIds } },
        select: { id: true, name: true, slug: true },
      })
    : [];
  const brandsResolved = brands
    .map((b) => {
      const meta = brandRecords.find((r) => r.id === b.brandId);
      if (!meta) return null;
      return { value: meta.slug, label: meta.name, count: b._count._all };
    })
    .filter((x): x is { value: string; label: string; count: number } => x !== null);

  // Conversion al shape esperado por <ProductFilters> (= getCategoryFacets).
  type Facets = Awaited<ReturnType<typeof getCategoryFacets>>;
  const facets: Facets = {
    brands: brandsResolved,
    genders: genders.map((g) => ({ value: g.gender, label: g.gender, count: g._count._all })),
    colors: colors
      .filter((c) => c.colorName && c.colorName !== "Único")
      .map((c) => ({ value: c.colorName, label: c.colorName, count: c._count._all })),
    sizes: sizes.map((s) => ({ value: s.size, label: s.size, count: s._count._all })),
    priceMin: 0,
    priceMax: 500,
  };

  const productsMapped = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    shortName: p.shortName,
    colorName: p.colorName,
    mainImageUrl: p.mainImageUrl,
    retailPrice: Number(p.retailPrice),
    salePrice: p.salePrice != null ? Number(p.salePrice) : null,
    source: p.source,
    brand: p.brand,
    totalStock: p.sizes.reduce((acc, s) => acc + s.stock, 0),
  }));

  const totalPages = Math.max(1, Math.ceil(count / perPage));
  const currentPage = Math.min(currentPageRequested, totalPages);

  const title = pageTitle(sp);
  const breadcrumbs = [
    { name: "Inicio", path: "/" },
    { name: "Catálogo", path: "/catalogo" },
  ];

  // Helper para URLs paginadas conservando todos los demás filtros.
  const baseQs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === "page") continue;
    if (typeof v === "string") baseQs.set(k, v);
  }
  const pageUrl = (n: number) => {
    const q = new URLSearchParams(baseQs);
    if (n > 1) q.set("page", String(n));
    const qs = q.toString();
    return qs ? `/catalogo?${qs}` : "/catalogo";
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema(breadcrumbs)) }}
      />

      {/* Breadcrumbs */}
      <nav aria-label="Migas de pan" className="border-b border-zs-border bg-white">
        <ol className="mx-auto flex max-w-7xl flex-wrap items-center gap-1 px-4 py-3 text-xs text-zs-muted">
          {breadcrumbs.map((b, i) => (
            <li key={b.path} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" aria-hidden />}
              {i === breadcrumbs.length - 1 ? (
                <span className="font-semibold text-zs-ink" aria-current="page">
                  {b.name}
                </span>
              ) : (
                <Link href={b.path} className="hover:text-zs-blue-700">
                  {b.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Hero */}
      <section className="bg-zs-gradient text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
          <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-5xl">
            {title}
          </h1>
          <p className="mt-3 text-sm text-white/70">
            {count} {count === 1 ? "producto" : "productos"} disponibles
          </p>
        </div>
      </section>

      {/* Grid + filtros */}
      <section className="mx-auto max-w-7xl px-4 py-10 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <div className="space-y-4">
            <ProductFilters data={facets} resultsCount={count} autoOpenFirstVisit />
          </div>

          <div className="space-y-6">
            <GenderChips />

            {productsMapped.length === 0 ? (
              <EmptyState variant="no-products" />
            ) : (
              <>
                <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {productsMapped.map((p) => (
                    <li key={p.id}>
                      <ProductCard product={p} />
                    </li>
                  ))}
                </ul>

                {totalPages > 1 && (
                  <nav
                    aria-label="Paginación"
                    className="mt-8 flex flex-wrap items-center justify-center gap-2"
                  >
                    {currentPage > 1 && (
                      <Link
                        href={pageUrl(currentPage - 1)}
                        className="rounded-lg border border-zs-border bg-white px-3 py-1.5 text-sm hover:bg-zs-surface"
                      >
                        ← Anterior
                      </Link>
                    )}
                    <span className="px-3 py-1.5 text-sm text-zs-muted">
                      Página {currentPage} de {totalPages}
                    </span>
                    {currentPage < totalPages && (
                      <Link
                        href={pageUrl(currentPage + 1)}
                        className="rounded-lg border border-zs-border bg-white px-3 py-1.5 text-sm hover:bg-zs-surface"
                      >
                        Siguiente →
                      </Link>
                    )}
                  </nav>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
