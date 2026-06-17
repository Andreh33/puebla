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
import { EmptyState } from "@/components/public/EmptyState";
import {
  buildProductWhere,
  getOutletFacets,
  parseCategoryParams,
} from "@/lib/public-queries";

// SSR dinámico: el listado depende de los query params (filtros) y del estado
// real de la BD (qué productos están marcados isOutlet) en cada request.
export const dynamic = "force-dynamic";
export const dynamicParams = true;

// ----------------------------------------------------------------------------
// Outlet por familia — /outlet/textil y /outlet/calzado
//
// Lista productos ACTIVE + isOutlet:true de la familia pedida. La familia
// (textil/calzado) se distingue por el slug de la categoría enlazada vía pivote
// m2m: textil → slugs "*-textil*", calzado → "*-calzado*" (mismo criterio que
// las páginas /[seccion]/[familia]). Reutiliza buildProductWhere (con isOutlet +
// categorySlugContains) y getOutletFacets, además de ProductFilters / cards /
// EmptyState. Un producto marcado outlet sigue saliendo en su categoría normal:
// el flag NO lo quita de ningún sitio, solo lo AÑADE aquí.
// ----------------------------------------------------------------------------

const VALID_FAMILIAS = ["textil", "calzado"] as const;
type Familia = (typeof VALID_FAMILIAS)[number];

type Params = { familia: string };
type SearchParams = Record<string, string | string[] | undefined>;

const FAMILIA_LABEL: Record<Familia, string> = {
  textil: "Textil",
  calzado: "Calzado",
};

function isValidFamilia(f: string): f is Familia {
  return (VALID_FAMILIAS as readonly string[]).includes(f);
}

/** Pre-renderiza las 2 familias válidas. */
export function generateStaticParams(): Params[] {
  return VALID_FAMILIAS.map((familia) => ({ familia }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { familia } = await params;
  if (!isValidFamilia(familia)) {
    return buildMetadata({ title: "Outlet no encontrado", noIndex: true });
  }
  const label = FAMILIA_LABEL[familia];
  return buildMetadata({
    title: `Outlet de ${label.toLowerCase()} — Ofertas`,
    description: `${label} deportivo de marca rebajado en el outlet de Zona Sport. Recogida en tienda en Puebla de la Calzada (Badajoz) y envío 24/48 h.`,
    path: `/outlet/${familia}`,
  });
}

export default async function OutletFamiliaPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { familia } = await params;
  const sp = await searchParams;

  // Guard: solo textil|calzado. Cualquier otra cosa → 404 sin consultar BD.
  if (!isValidFamilia(familia)) notFound();

  const label = FAMILIA_LABEL[familia];
  const filters = parseCategoryParams(sp);
  const perPage = filters.perPage ?? 12;
  const currentPageRequested = filters.page ?? 1;

  type Facets = Awaited<ReturnType<typeof getOutletFacets>>;
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

  let products: Array<{
    id: string;
    slug: string;
    name: string;
    shortName: string | null;
    colorName: string;
    mainImageUrl: string | null;
    retailPrice: number;
    salePrice: number | null;
    source: "LOCAL" | "MIRAVIA" | "AMAZON";
    brand: { name: string; slug: string };
    totalStock: number;
    availableSizes: string[];
  }> = [];
  let total = 0;

  // Universo del outlet: ACTIVE + isOutlet + familia (vía slug "-textil"/"-calzado"
  // del pivote m2m), combinado con los filtros del usuario (marca/talla/precio/
  // color + tipo). buildProductWhere mantiene la intersección AND de los filtros.
  const where = buildProductWhere({
    filters,
    isOutlet: true,
    categorySlugContains: `-${familia}`,
  });

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
          stock: true,
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
      totalStock: p.sizes.length > 0 ? p.sizes.reduce((acc, s) => acc + s.stock, 0) : p.stock,
      availableSizes: p.sizes.filter((s) => s.stock > 0).map((s) => s.size),
    }));
  } catch (err) {
    console.warn(
      `[outlet/${familia}] product query falló:`,
      (err as Error).message,
    );
  }

  // Facets en su propio try: si fallan, sidebar sin counts pero listado vivo.
  try {
    facets = await getOutletFacets(familia);
  } catch (err) {
    console.warn(
      `[outlet/${familia}] facets fallaron, sidebar sin counts:`,
      (err as Error).message,
    );
  }

  // Filtros de TIPO siempre visibles: si no hay facetas dinámicas (outlet vacío
  // o sin productos tipados todavía), mostramos la lista canónica de tipos para
  // que el sidebar no quede pelado (mismo patrón que /[seccion]/[familia]).
  if (familia === "calzado" && facets.footwearTypes.length === 0) {
    facets = {
      ...facets,
      footwearTypes: [
        "running", "trail", "padel", "futbol", "futbol_sala", "casual", "baloncesto", "chanclas",
      ].map((value) => ({ value, label: value, count: 0 })),
    };
  }
  if (familia === "textil" && facets.garmentTypes.length === 0) {
    facets = {
      ...facets,
      garmentTypes: [
        "camiseta", "polo", "sudadera", "polar", "chandal", "chaqueta", "abrigo",
        "cortavientos", "conjunto", "pantalon", "mallas", "banador",
      ].map((value) => ({ value, label: value, count: 0 })),
    };
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(currentPageRequested, totalPages);

  const breadcrumbs = [
    { name: "Inicio", path: "/" },
    { name: "Outlet", path: "/outlet" },
    { name: label, path: `/outlet/${familia}` },
  ];

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Outlet — ${label}`,
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/outlet/${familia}`,
    isPartOf: { "@id": `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/#website` },
  };

  // URLs de paginación conservando el resto de query params.
  const baseQs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === "page") continue;
    if (typeof v === "string") baseQs.set(k, v);
  }
  const pageUrl = (n: number) => {
    const q = new URLSearchParams(baseQs);
    if (n > 1) q.set("page", String(n));
    const qs = q.toString();
    return qs ? `/outlet/${familia}?${qs}` : `/outlet/${familia}`;
  };

  // Borde pastel animado en ~20% del listado actual.
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
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/70">
            Outlet
          </p>
          <h1 className="mt-2 text-balance text-3xl font-extrabold tracking-tight sm:text-5xl">
            Outlet de {label.toLowerCase()}
          </h1>
          <p className="mt-3 max-w-2xl text-balance text-white/85 sm:text-lg">
            {label} de marca a precio reducido, mientras haya stock.
          </p>
          <p className="mt-4 text-sm text-white/70">
            {total} {total === 1 ? "producto" : "productos"} en el outlet
          </p>
        </div>
      </section>

      {/* Grid + filtros */}
      <section className="mx-auto max-w-7xl px-4 py-10 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <div className="space-y-4">
            <ProductFilters
              data={facets}
              resultsCount={total}
              showFootwearFilter={familia === "calzado"}
              showGarmentFilter={familia === "textil"}
              showGenderFilter
              compact={familia === "textil" || familia === "calzado"}
            />
          </div>

          <div className="space-y-6">
            {products.length === 0 ? (
              <EmptyState
                variant="no-products"
                title="Aún no hay productos en el outlet"
                description="Estamos preparando una selección de ofertas. Vuelve pronto o escríbenos por WhatsApp y te avisamos."
                cta={{ label: "Quitar todos los filtros", href: `/outlet/${familia}` }}
                secondaryCta={{ label: "Ver todo el outlet", href: "/outlet" }}
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

            {/* Paginación */}
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
