import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronRight } from "lucide-react";
import { ProductCardLuxe as ProductCard } from "@/components/public/ProductCardLuxe";
import { BrandsMarquee } from "@/components/public/BrandsMarquee";
import { jsonLd, breadcrumbSchema } from "@/lib/seo/schema-org";
import {
  getCategoriesByGender,
  getFeaturedBrands,
  getProductsByGender,
} from "@/lib/public-queries";
import type { DemoGender } from "@/lib/demo-products";

/**
 * Configuración editorial por género. Mantiene el copy en castellano natural y
 * los colores dentro de la paleta corporativa (zs-blue / zs-red) — sin
 * estereotipos cromáticos.
 */
export const GENDER_LANDINGS: Record<
  "mujer" | "hombre" | "ninos",
  {
    gender: DemoGender;
    slug: "mujer" | "hombre" | "ninos";
    label: string;
    headline: string;
    /** Subtítulo editorial mostrado bajo el headline. */
    tagline: string;
    eyebrow: string;
    /** Clases de gradiente del hero. */
    heroAccent: string;
    /** Texto descriptivo para SEO / hero párrafo largo. */
    seoLead: string;
  }
> = {
  mujer: {
    gender: "MUJER",
    slug: "mujer",
    label: "Mujer",
    eyebrow: "Para ella",
    headline: "Para ella",
    tagline: "Calzado, ropa técnica y equipación pensada para entrenar mejor.",
    heroAccent: "from-zs-blue-900 via-zs-blue-800 to-zs-red-700",
    seoLead:
      "Selección Zona Sport para mujer: zapatillas de running, mallas técnicas, camisetas deportivas y equipación de las marcas que trabajamos en tienda.",
  },
  hombre: {
    gender: "HOMBRE",
    slug: "hombre",
    label: "Hombre",
    eyebrow: "Para él",
    headline: "Para él",
    tagline: "Equípate con lo que más rinde: calzado, técnico y outdoor.",
    heroAccent: "from-zs-blue-950 via-zs-blue-900 to-zs-blue-700",
    seoLead:
      "Selección Zona Sport para hombre: zapatillas de running y pádel, camisetas, pantalones técnicos, abrigos y equipación de las mejores marcas multideporte.",
  },
  ninos: {
    gender: "NINO",
    slug: "ninos",
    label: "Niños",
    eyebrow: "Para los pequeños",
    headline: "Para los pequeños",
    tagline: "Material deportivo cómodo y resistente para que disfruten del deporte.",
    heroAccent: "from-zs-red-700 via-zs-blue-800 to-zs-blue-900",
    seoLead:
      "Selección Zona Sport para niños y niñas: calzado, ropa deportiva y outdoor que aguanta el ritmo del día a día. Asesoramos la talla en tienda sin compromiso.",
  },
};

type GenderKey = keyof typeof GENDER_LANDINGS;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

/**
 * Landing editorial para /mujer, /hombre y /ninos. Estructura:
 *  1. Breadcrumbs
 *  2. Hero editorial con tipografía display y producto destacado lateral
 *  3. "Categorías" — solo categorías con productos del género
 *  4. Grid de productos top 8 con ProductCardLuxe
 *  5. "Marcas que trabajan para ti" — mini marquee
 *  6. JSON-LD CollectionPage + breadcrumbs
 */
export async function GenderLanding({ slug }: { slug: GenderKey }) {
  const config = GENDER_LANDINGS[slug];

  const [productsRes, categories, brands] = await Promise.all([
    getProductsByGender({ gender: config.gender, take: 8 }),
    getCategoriesByGender(config.gender),
    getFeaturedBrands(8),
  ]);

  const products = productsRes.products;
  const heroProduct = products[0] ?? null;

  const breadcrumbs = [
    { name: "Inicio", path: "/" },
    { name: config.label, path: `/${config.slug}` },
  ];

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${config.label} — Zona Sport`,
    description: config.seoLead,
    url: `${SITE_URL}/${config.slug}`,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    inLanguage: "es-ES",
  };

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

      {/* HERO editorial */}
      <section
        className={`relative overflow-hidden bg-gradient-to-br ${config.heroAccent} text-white`}
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:py-20 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:py-28">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
              {config.eyebrow}
            </p>
            <h1 className="mt-3 font-display text-balance text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl lg:text-8xl">
              {config.headline}
            </h1>
            <p className="mt-5 max-w-xl text-balance text-base text-white/85 sm:text-lg">
              {config.tagline}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="#productos"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-5 py-3 text-sm font-bold text-zs-blue-900 transition hover:bg-zs-surface"
              >
                Ver selección <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#categorias"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/40 bg-white/5 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
              >
                Explorar por categoría
              </Link>
            </div>
            {productsRes.total > 0 && (
              <p className="mt-6 text-sm text-white/65">
                {productsRes.total}{" "}
                {productsRes.total === 1 ? "producto" : "productos"} disponibles
              </p>
            )}
          </div>

          {/* Producto editorial lateral */}
          {heroProduct?.mainImageUrl && (
            <div className="relative hidden aspect-[4/5] w-full max-w-md justify-self-end overflow-hidden rounded-3xl bg-white/10 backdrop-blur-sm lg:block">
              <Image
                src={heroProduct.mainImageUrl}
                alt={heroProduct.name}
                fill
                sizes="(max-width: 1024px) 0px, 40vw"
                className="object-contain p-6 transition duration-700 hover:scale-[1.03]"
                priority
              />
              <Link
                href={`/producto/${heroProduct.slug}`}
                className="absolute inset-x-4 bottom-4 inline-flex items-center justify-between rounded-2xl bg-white/95 px-4 py-3 text-zs-blue-900 shadow-lg backdrop-blur transition hover:bg-white"
              >
                <span className="flex flex-col text-left">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zs-red-600">
                    Destacado
                  </span>
                  <span className="line-clamp-1 text-sm font-semibold">
                    {heroProduct.brand?.name} {heroProduct.shortName ?? heroProduct.name}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* CATEGORÍAS por género */}
      {categories.length > 0 && (
        <section id="categorias" className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
          <div className="mb-8 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-zs-red-600">
                Categorías
              </p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight text-zs-blue-900 sm:text-4xl">
                Explora por tipo de prenda
              </h2>
            </div>
          </div>

          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.slice(0, 8).map((cat) => (
              <li key={cat.slug}>
                <Link
                  href={`/${cat.slug}?genero=${config.gender}`}
                  className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl border border-zs-border bg-zs-surface p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  {cat.imageUrl && (
                    <Image
                      src={cat.imageUrl}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-contain p-6 transition duration-500 group-hover:scale-105"
                      aria-hidden
                    />
                  )}
                  <div className="relative">
                    <h3 className="text-lg font-bold leading-tight text-zs-blue-900">
                      {cat.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-zs-muted">
                      {cat.productCount}{" "}
                      {cat.productCount === 1 ? "artículo" : "artículos"}
                    </p>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-zs-blue-700">
                      Ver{" "}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* PRODUCTOS DESTACADOS */}
      <section id="productos" className="border-y border-zs-border bg-zs-surface">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
          <div className="mb-8 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-zs-red-600">
                Selección {config.label}
              </p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight text-zs-blue-900 sm:text-4xl">
                Lo más destacado
              </h2>
            </div>
            <Link
              href={`/calzado?genero=${config.gender}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-zs-blue-700 hover:text-zs-red-600"
            >
              Ver todo en calzado <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zs-border bg-white p-10 text-center">
              <p className="text-zs-muted">
                Aún no tenemos productos publicados para {config.label.toLowerCase()}.
                Pásate por la tienda o escríbenos por WhatsApp.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p, i) => (
                <ProductCard key={p.id} priority={i < 2} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* MARCAS */}
      {brands.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14">
          <div className="mb-6 flex flex-col items-start gap-2">
            <p className="text-sm font-semibold uppercase tracking-wider text-zs-red-600">
              Marcas que trabajan para ti
            </p>
            <h2 className="text-2xl font-bold text-zs-blue-900 sm:text-3xl">
              Multimarca, sin filtros
            </h2>
          </div>
          <BrandsMarquee brands={brands} />
        </section>
      )}
    </>
  );
}
