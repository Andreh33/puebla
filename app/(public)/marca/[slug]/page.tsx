import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { buildMetadata } from "@/lib/seo/metadata";
import { brandSchema, breadcrumbSchema, jsonLd } from "@/lib/seo/schema-org";
import { ProductCardLuxe as ProductCard } from "@/components/public/ProductCardLuxe";
import { getBrandBySlug, getBrandProducts } from "@/lib/public-queries";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

type Params = { slug: string };

export async function generateStaticParams() {
  try {
    const brands = await db.brand.findMany({
      where: { isFeatured: true },
      take: 20,
      select: { slug: true },
    });
    return brands.map((b) => ({ slug: b.slug }));
  } catch {
    // BD no disponible — no pre-renderizamos slugs estáticos (las páginas se
    // generarán bajo demanda con el fallback demo).
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  let brand: {
    name: string;
    metaTitle?: string | null;
    metaDescription?: string | null;
    description?: string | null;
  } | null = null;
  try {
    brand = await db.brand.findUnique({
      where: { slug },
      select: { name: true, metaTitle: true, metaDescription: true, description: true },
    });
  } catch {
    brand = null;
  }
  if (!brand) {
    const demoBrand = await getBrandBySlug(slug);
    if (demoBrand) brand = { name: demoBrand.name };
  }
  if (!brand) return buildMetadata({ title: "Marca no encontrada", noIndex: true });
  return buildMetadata({
    title: brand.metaTitle || `Productos ${brand.name} en Zona Sport`,
    description:
      brand.metaDescription ||
      brand.description ||
      `Descubre la selección de ${brand.name} en Zona Sport: productos oficiales, asesoramiento personal y recogida en tienda en Puebla de la Calzada.`,
    path: `/marca/${slug}`,
  });
}

export default async function BrandPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;

  // Helper que ya cae a demo si la BD falla.
  const brand = await getBrandBySlug(slug);
  if (!brand) notFound();

  const perPage = 12;
  const page = Math.max(1, Number(pageParam) || 1);

  const { products, total } = await getBrandProducts({
    brandSlug: slug,
    skip: (page - 1) * perPage,
    take: perPage,
  });

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const breadcrumbs = [
    { name: "Inicio", path: "/" },
    { name: "Marcas", path: "/marcas" },
    { name: brand.name, path: `/marca/${brand.slug}` },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(brandSchema(brand)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema(breadcrumbs)) }}
      />

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

      {/* Hero marca */}
      <section className="border-b border-zs-border bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-12 sm:py-16 lg:flex-row lg:items-center">
          <div className="flex h-28 w-48 shrink-0 items-center justify-center rounded-2xl border border-zs-border bg-zs-surface p-4">
            {brand.logoUrl ? (
              <Image
                src={brand.logoUrl}
                alt={brand.name}
                width={180}
                height={100}
                className="max-h-20 w-auto object-contain"
              />
            ) : (
              <span className="text-2xl font-extrabold text-zs-blue-900">{brand.name}</span>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-zs-blue-900 sm:text-4xl">
              {brand.name}
            </h1>
            {brand.description && (
              <p className="max-w-3xl text-base text-zs-muted">{brand.description}</p>
            )}
            <p className="text-sm font-semibold text-zs-blue-700">
              {total} {total === 1 ? "producto" : "productos"} disponibles
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 lg:py-14">
        {products.length === 0 ? (
          <div className="rounded-2xl border border-zs-border bg-white p-10 text-center">
            <p className="font-semibold text-zs-blue-900">
              Aún no tenemos productos publicados de {brand.name}.
            </p>
            <p className="mt-2 text-sm text-zs-muted">
              Pero los trabajamos en tienda. Consúltanos por WhatsApp y te buscamos lo que necesitas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p, i) => (
              <ProductCard key={p.id} priority={i < 4} product={p} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav className="mt-8 flex flex-wrap justify-center gap-2" aria-label="Paginación">
            {page > 1 && (
              <Link
                href={`/marca/${brand.slug}?page=${page - 1}`}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-zs-border bg-white px-4 text-sm font-semibold hover:bg-zs-surface"
                rel="prev"
              >
                Anterior
              </Link>
            )}
            <span className="inline-flex h-10 items-center px-3 text-sm text-zs-muted">
              Página {page} de {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/marca/${brand.slug}?page=${page + 1}`}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-zs-border bg-white px-4 text-sm font-semibold hover:bg-zs-surface"
                rel="next"
              >
                Siguiente
              </Link>
            )}
          </nav>
        )}
      </section>

      {/* SEO text */}
      <section className="border-t border-zs-border bg-zs-surface">
        <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-zs-ink">
          <h2 className="mb-3 text-xl font-bold text-zs-blue-900">
            Sobre {brand.name} en Zona Sport
          </h2>
          <p className="text-zs-muted">
            En Zona Sport, tu tienda de deportes en Puebla de la Calzada (Badajoz),
            seleccionamos lo mejor de {brand.name} para deportistas exigentes y para el
            día a día. Ven a probarte el producto en tienda, asegúrate de la talla y, si
            tienes dudas, te asesoramos sin compromiso por WhatsApp.
          </p>
        </div>
      </section>
    </>
  );
}
