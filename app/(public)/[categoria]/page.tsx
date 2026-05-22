import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, jsonLd } from "@/lib/seo/schema-org";
import { ProductCardLuxe as ProductCard } from "@/components/public/ProductCardLuxe";
import { selectAnimatedBorderIds } from "@/lib/products/visual";
import { ProductFilters } from "@/components/public/ProductFilters";
import { GenderChips } from "@/components/public/GenderChips";
import { EmptyState } from "@/components/public/EmptyState";
import {
  buildProductWhere,
  getCategoryBySlug,
  getCategoryFacets,
  getCategoryProducts,
  isReservedSlug,
  parseCategoryParams,
  resolveCategoryIdsWithDescendants,
} from "@/lib/public-queries";

// Forzamos SSR dinámico mientras no haya DATABASE_URL real en producción:
// el fallback demo es server-side y necesita ejecutar en cada request hasta
// que la BD esté provisionada. Cuando Neon esté activo, vuelve a `revalidate = 60`.
export const dynamic = "force-dynamic";
export const dynamicParams = true;

type Params = { categoria: string };
type SearchParams = Record<string, string | string[] | undefined>;

export async function generateStaticParams() {
  try {
    const top = await db.category.findMany({
      where: { products: { some: { status: "ACTIVE" } } },
      orderBy: [{ position: "asc" }],
      take: 20,
      select: { slug: true },
    });
    return top.map((c) => ({ categoria: c.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { categoria } = await params;
  if (isReservedSlug(categoria)) return buildMetadata({ title: "Categoría", noIndex: true });
  let category: {
    name: string;
    metaTitle?: string | null;
    metaDescription?: string | null;
    description?: string | null;
  } | null = null;
  try {
    category = await db.category.findUnique({
      where: { slug: categoria },
      select: { name: true, metaTitle: true, metaDescription: true, description: true },
    });
  } catch {
    category = null;
  }
  // Si la BD no respondió, intentamos resolver con el catálogo demo.
  if (!category) {
    const demoCat = await getCategoryBySlug(categoria);
    if (demoCat) category = { name: demoCat.name };
  }
  if (!category) return buildMetadata({ title: "Categoría no encontrada", noIndex: true });
  return buildMetadata({
    title: category.metaTitle || `${category.name} — Tienda online`,
    description:
      category.metaDescription ||
      category.description ||
      `Descubre nuestra selección de ${category.name.toLowerCase()} en Zona Sport. Marcas top, asesoramiento personal y recogida en tienda en Puebla de la Calzada.`,
    path: `/${categoria}`,
  });
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { categoria } = await params;
  const sp = await searchParams;
  if (isReservedSlug(categoria)) notFound();

  // Buscamos la categoría: primero en BD real, si falla intentamos en demo.
  const category = await getCategoryBySlug(categoria);
  if (!category) notFound();

  const filters = parseCategoryParams(sp);
  const perPage = filters.perPage ?? 12;
  const currentPageRequested = filters.page ?? 1;

  // Facets vacías por defecto — solo se rellenan con datos reales si la BD
  // responde y la categoría existe en BD (no en demo).
  type Facets = Awaited<ReturnType<typeof getCategoryFacets>>;
  let facets: Facets = {
    brands: [],
    genders: [],
    colors: [],
    sizes: [],
    footwearTypes: [],
    garmentTypes: [],
    garmentVariants: [],
    priceMin: 0,
    priceMax: 500,
  };

  let products: Awaited<ReturnType<typeof getCategoryProducts>>["products"] = [];
  let total = 0;

  // Bloque 8.9: sub-categorías hijas navegables como chips (p.ej. accesorios →
  // Mochilas, Balones, Calcetines, Pádel, Otros). ?sub=<slug-hija> filtra a esa hija.
  let subCats: Array<{ id: string; slug: string; name: string }> = [];
  const subParam = typeof sp.sub === "string" ? sp.sub : undefined;
  if (!category.isDemo) {
    subCats = await db.category.findMany({
      where: { parentId: category.id },
      select: { id: true, slug: true, name: true },
      orderBy: [{ position: "asc" }, { name: "asc" }],
    });
  }
  const activeSub = subCats.find((c) => c.slug === subParam) ?? null;

  if (category.isDemo) {
    // Sin BD operativa: enseñamos los productos del catálogo demo asociados a
    // este slug de categoría. No tenemos facets reales, pero el listado sigue
    // siendo navegable.
    const res = await getCategoryProducts({
      categorySlug: category.slug,
      skip: (currentPageRequested - 1) * perPage,
      take: perPage,
    });
    products = res.products;
    total = res.total;
  } else {
    // Bug B + 8.9: si hay sub-categoría activa (?sub=) filtramos solo a esa hija;
    // si no, incluimos todos los descendientes.
    const categoryIds = activeSub
      ? [activeSub.id]
      : await resolveCategoryIdsWithDescendants(category.id);
    const where = buildProductWhere({ categoryId: categoryIds, filters });
    try {
      const [count, list] = await Promise.all([
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
            sizes: { select: { size: true, stock: true } },
          },
        }),
      ]);
      total = count;
      products = list.map((p) => ({
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
        availableSizes: p.sizes.filter((s) => s.stock > 0).map((s) => s.size),
      }));
    } catch (err) {
      console.warn("[categoria] BD respondió category pero falló product query:", (err as Error).message);
      // Caemos a demo aunque la categoría existiera en BD (consulta de productos rota).
      const res = await getCategoryProducts({
        categorySlug: category.slug,
        skip: (currentPageRequested - 1) * perPage,
        take: perPage,
      });
      products = res.products;
      total = res.total;
    }

    // Facets en su PROPIO try: si los groupBy fallan, dejamos las facets
    // vacías (sidebar sin counts) pero NO tiramos el listado real a demo.
    try {
      facets = await getCategoryFacets(categoryIds);
    } catch (err) {
      console.warn("[categoria] facets fallaron, sidebar sin counts:", (err as Error).message);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(currentPageRequested, totalPages);

  const breadcrumbs = [
    { name: "Inicio", path: "/" },
    ...(category.parent
      ? [{ name: category.parent.name, path: `/${category.parent.slug}` }]
      : []),
    { name: category.name, path: `/${category.slug}` },
  ];

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category.name,
    description: category.description ?? undefined,
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/${category.slug}`,
    isPartOf: { "@id": `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/#website` },
  };

  // Build pagination URLs preserving query
  const baseQs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === "page") continue;
    if (typeof v === "string") baseQs.set(k, v);
  }
  const pageUrl = (n: number) => {
    const q = new URLSearchParams(baseQs);
    if (n > 1) q.set("page", String(n));
    const qs = q.toString();
    return qs ? `/${category.slug}?${qs}` : `/${category.slug}`;
  };

  // Borde pastel animado en ~20% del listado actual (no del catálogo total).
  const animatedIds = selectAnimatedBorderIds(products);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema(breadcrumbs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(collectionLd) }}
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
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-5xl">
            {category.name}
          </h1>
          {category.description && (
            <p className="mt-3 max-w-2xl text-balance text-white/85 sm:text-lg">
              {category.description}
            </p>
          )}
          <p className="mt-4 text-sm text-white/70">
            {total} {total === 1 ? "producto" : "productos"} en catálogo
          </p>
        </div>
      </section>

      {/* Grid + filtros */}
      <section className="mx-auto max-w-7xl px-4 py-10 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <div className="space-y-4">
            {/* Filtros abiertos por defecto (1ª visita, móvil/tablet) sólo en
                categorías raíz que son listados — p.ej. /accesorios. En
                subcategorías mantenemos el comportamiento actual. */}
            {/* Bloque 9.2: en /accesorios ocultamos también el FilterGroup
                "Género" del sidebar (accesorios universales; ya quitamos el chip
                "Para" en 8.10). Resto de categorías raíz lo mantienen. */}
            <ProductFilters
              data={facets}
              resultsCount={total}
              autoOpenFirstVisit={!category.parent}
              showFootwearFilter={category.slug?.endsWith("-calzado") ?? false}
              showGenderFilter={category.slug !== "accesorios"}
              startCollapsed={category.slug === "accesorios"}
            />
          </div>

          <div className="space-y-6">
            {/* Bloque 8.9: chips de sub-categoría (hijas). Solo si la categoría
                tiene hijas (p.ej. accesorios). "Todos" + cada hija; ?sub= filtra. */}
            {subCats.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <a
                  href={`/${category.slug}`}
                  className={`inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold transition-colors ${
                    !activeSub
                      ? "bg-zs-red-600 text-white"
                      : "border border-zs-border bg-white text-zs-ink hover:bg-zs-surface"
                  }`}
                >
                  Todos
                </a>
                {subCats.map((c) => (
                  <a
                    key={c.id}
                    href={`/${category.slug}?sub=${encodeURIComponent(c.slug)}`}
                    className={`inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold transition-colors ${
                      activeSub?.id === c.id
                        ? "bg-zs-red-600 text-white"
                        : "border border-zs-border bg-white text-zs-ink hover:bg-zs-surface"
                    }`}
                  >
                    {c.name}
                  </a>
                ))}
              </div>
            )}

            {/* Chips de género — más prominentes que el filtro en sidebar.
                Bloque 8.10: ocultos en /accesorios (son universales, no segmentados). */}
            {category.slug !== "accesorios" && <GenderChips />}

            {products.length === 0 ? (
              <EmptyState
                variant="no-products"
                cta={{ label: "Quitar todos los filtros", href: `/${category.slug}` }}
                secondaryCta={{ label: "Ver todas las categorías", href: "/marcas" }}
              />
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((p, i) => (
                  <ProductCard
                    key={p.id}
                    priority={i < 4}
                    product={p}
                    animated={animatedIds.has(p.id)}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <nav className="flex flex-wrap items-center justify-center gap-2 pt-6" aria-label="Paginación">
                {currentPage > 1 && (
                  <Link
                    href={pageUrl(currentPage - 1)}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-zs-border bg-white px-4 text-sm font-semibold hover:bg-zs-surface"
                    rel="prev"
                  >
                    Anterior
                  </Link>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === totalPages || Math.abs(n - currentPage) <= 1)
                  .reduce<number[]>((acc, n) => {
                    if (acc.length && n - acc[acc.length - 1]! > 1) acc.push(-1);
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, i) =>
                    n === -1 ? (
                      <span key={`gap-${i}`} className="px-2 text-zs-muted">
                        …
                      </span>
                    ) : (
                      <Link
                        key={n}
                        href={pageUrl(n)}
                        aria-current={n === currentPage ? "page" : undefined}
                        className={
                          n === currentPage
                            ? "inline-flex h-10 min-w-10 items-center justify-center rounded-xl bg-zs-red-600 px-3 text-sm font-bold text-white"
                            : "inline-flex h-10 min-w-10 items-center justify-center rounded-xl border border-zs-border bg-white px-3 text-sm font-semibold hover:bg-zs-surface"
                        }
                      >
                        {n}
                      </Link>
                    ),
                  )}
                {currentPage < totalPages && (
                  <Link
                    href={pageUrl(currentPage + 1)}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-zs-border bg-white px-4 text-sm font-semibold hover:bg-zs-surface"
                    rel="next"
                  >
                    Siguiente
                  </Link>
                )}
              </nav>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
