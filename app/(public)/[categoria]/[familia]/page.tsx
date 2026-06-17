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
  getCategoryBySlug,
  getCategoryFacets,
  getCategoryProducts,
  parseCategoryParams,
  resolveCategoryIdsWithDescendants,
} from "@/lib/public-queries";

// SSR dinámico igual que /[categoria]: el listado depende de query params
// (filtros) y del estado real de la BD en cada request.
export const dynamic = "force-dynamic";
export const dynamicParams = true;

// ----------------------------------------------------------------------------
// Ruta anidada género→familia (Bloque 4 paso a)
//
// Resuelve la categoría compuesta `${seccion}-${familia}` creada en el Bloque 2
// (p.ej. /hombre/calzado → categoría `hombre-calzado`). Reutiliza exactamente
// la misma lógica de listado/facetas que /[categoria], con el filtro "Tipo de
// calzado" encendido solo cuando familia === "calzado".
//
// IMPORTANTE: el primer segmento se llama `[categoria]` (NO `[seccion]`) porque
// Next.js exige que dos segmentos dinámicos hermanos en el mismo nivel
// compartan nombre de slug — y ya existe /[categoria]/page.tsx. Aquí ese param
// `categoria` ES la sección (hombre|mujer|nino|nina); lo aliasamos a `seccion`.
// ----------------------------------------------------------------------------

const VALID_SECCIONES = ["hombre", "mujer", "nino", "nina", "bebe"] as const;
const VALID_FAMILIAS = ["textil", "calzado"] as const;
type Seccion = (typeof VALID_SECCIONES)[number];
type Familia = (typeof VALID_FAMILIAS)[number];

type Params = { categoria: string; familia: string };
type SearchParams = Record<string, string | string[] | undefined>;

function isValidSeccion(s: string): s is Seccion {
  return (VALID_SECCIONES as readonly string[]).includes(s);
}
function isValidFamilia(f: string): f is Familia {
  return (VALID_FAMILIAS as readonly string[]).includes(f);
}

/** Pre-renderiza los 8 combos válidos (4 secciones × 2 familias). */
export function generateStaticParams(): Params[] {
  return VALID_SECCIONES.flatMap((seccion) =>
    VALID_FAMILIAS.map((familia) => ({ categoria: seccion, familia })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { categoria: seccion, familia } = await params;
  if (!isValidSeccion(seccion) || !isValidFamilia(familia)) {
    return buildMetadata({ title: "Categoría no encontrada", noIndex: true });
  }
  const slug = `${seccion}-${familia}`;
  let category: {
    name: string;
    metaTitle?: string | null;
    metaDescription?: string | null;
    description?: string | null;
  } | null = null;
  try {
    category = await db.category.findUnique({
      where: { slug },
      select: { name: true, metaTitle: true, metaDescription: true, description: true },
    });
  } catch {
    category = null;
  }
  if (!category) return buildMetadata({ title: "Categoría no encontrada", noIndex: true });
  return buildMetadata({
    title: category.metaTitle || `${category.name} — Tienda online`,
    description:
      category.metaDescription ||
      category.description ||
      `Descubre nuestra selección de ${category.name.toLowerCase()} en Zona Sport. Marcas top, asesoramiento personal y recogida en tienda en Puebla de la Calzada.`,
    path: `/${seccion}/${familia}`,
  });
}

export default async function SeccionFamiliaPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { categoria: seccion, familia } = await params;
  const sp = await searchParams;

  // Guard de combos: solo hombre|mujer|nino|nina × textil|calzado. Cualquier
  // otra cosa (/foo/bar) cae a 404 sin consultar BD.
  if (!isValidSeccion(seccion) || !isValidFamilia(familia)) notFound();

  const slug = `${seccion}-${familia}`;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const filters = parseCategoryParams(sp);

  // Coherencia con la exclusión de facetas: ignorar ?prenda=bermuda en mujer.
  if (seccion === "mujer" && filters.prenda?.length) {
    filters.prenda = filters.prenda.filter((p) => p !== "bermuda");
  }

  const perPage = filters.perPage ?? 12;
  const currentPageRequested = filters.page ?? 1;

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

  // Las categorías compuestas son reales en BD (no demo). Si por lo que sea
  // el resolver devuelve isDemo (BD caída), renderizamos vacío con gracia en
  // lugar de un listado falso — no hay datos demo para slugs compuestos.
  if (!category.isDemo) {
    // Bug B: incluir descendientes por si la categoría compuesta tuviera hijas.
    const categoryIds = await resolveCategoryIdsWithDescendants(category.id);
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
        `[seccion/familia] product query falló para ${slug}:`,
        (err as Error).message,
      );
    }

    // Facets en su propio try: si fallan, sidebar sin counts pero listado vivo.
    try {
      facets = await getCategoryFacets(categoryIds);
    } catch (err) {
      console.warn(
        `[seccion/familia] facets fallaron para ${slug}, sidebar sin counts:`,
        (err as Error).message,
      );
    }

    // Petición cliente: ocultar "Calentadores" (calentador) en TODAS las
    // secciones; y "Bermudas y shorts" (bermuda) solo en Mujer.
    const hiddenGarment = seccion === "mujer" ? ["bermuda", "calentador"] : ["calentador"];
    facets = {
      ...facets,
      garmentTypes: facets.garmentTypes.filter((g) => !hiddenGarment.includes(g.value)),
    };
  }

  // Filtros de TIPO siempre visibles: si no hay facetas dinámicas (catálogo
  // vacío o sin productos tipados en esta sección), mostramos la lista canónica
  // de tipos para que el sidebar no quede pelado. Cuando haya productos reales,
  // las facetas dinámicas de arriba ganan y el filtro vuelve a ser "como antes".
  // Orden y contenido reflejan el megamenú (lib/menu/mega-menu.ts).
  if (familia === "calzado" && facets.footwearTypes.length === 0) {
    const hidden = seccion === "mujer" ? ["futbol", "futbol_sala", "baloncesto"] : [];
    facets = {
      ...facets,
      footwearTypes: [
        "running", "trail", "padel", "futbol", "futbol_sala", "casual", "baloncesto", "chanclas",
      ]
        .filter((t) => !hidden.includes(t))
        .map((value) => ({ value, label: value, count: 0 })),
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

  // Breadcrumb: Inicio → [sección hub] → [familia]. La sección la trae el
  // padre de la categoría (ROOT de género); fallback al slug capitalizado.
  const seccionLabel =
    category.parent?.name ?? seccion.charAt(0).toUpperCase() + seccion.slice(1);
  const breadcrumbs = [
    { name: "Inicio", path: "/" },
    { name: seccionLabel, path: `/${seccion}` },
    { name: category.name, path: `/${seccion}/${familia}` },
  ];

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category.name,
    description: category.description ?? undefined,
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/${seccion}/${familia}`,
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
    return qs ? `/${seccion}/${familia}?${qs}` : `/${seccion}/${familia}`;
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
            <ProductFilters
              data={facets}
              resultsCount={total}
              showFootwearFilter={familia === "calzado"}
              showGarmentFilter={familia === "textil"}
              showGenderFilter={false}
              compact={familia === "textil" || familia === "calzado"}
            />
          </div>

          <div className="space-y-6">
            {/* Sin selector de género: esta ruta /[seccion]/[familia] ya está
                scopeada a un género (hombre/mujer/nino/nina) — el chip "Para"
                aquí sería redundante/confuso (hotfix Bloque 7.1). */}
            {products.length === 0 ? (
              <EmptyState
                variant="no-products"
                cta={{ label: "Quitar todos los filtros", href: `/${seccion}/${familia}` }}
                secondaryCta={{ label: "Ver todas las categorías", href: "/catalogo" }}
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
