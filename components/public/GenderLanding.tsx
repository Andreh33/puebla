import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronRight } from "lucide-react";
import { ProductCardLuxe as ProductCard } from "@/components/public/ProductCardLuxe";
import { BrandsMarquee } from "@/components/public/BrandsMarquee";
import { GenderHero } from "@/components/public/GenderHero";
import { jsonLd, breadcrumbSchema } from "@/lib/seo/schema-org";
import { stripHtml } from "@/lib/utils/html";
import {
  getCategoriesByGender,
  getFeaturedBrands,
  getProductsByGender,
} from "@/lib/public-queries";
import type { DemoGender } from "@/lib/demo-products";

/**
 * Configuración editorial por género. Conserva la info que necesitan las
 * páginas (slug, label, gender, seoLead) y el sub-bloque de identidad. El
 * headline/eyebrow/tagline del HERO foto-top vive en `GenderHero` —
 * mantenemos aquí los antiguos como fallback documental y para SEO.
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
    /** Texto descriptivo para SEO / hero párrafo largo. */
    seoLead: string;
  }
> = {
  mujer: {
    gender: "MUJER",
    slug: "mujer",
    label: "Mujer",
    eyebrow: "Para ella",
    headline: "Su deporte, sin postureo.",
    tagline: "Calzado, ropa técnica y equipación pensada para entrenar mejor.",
    seoLead:
      "Selección Zona Sport para mujer: zapatillas de running, mallas técnicas, camisetas deportivas y equipación de las marcas que trabajamos en tienda.",
  },
  hombre: {
    gender: "HOMBRE",
    slug: "hombre",
    label: "Hombre",
    eyebrow: "Para él",
    headline: "Equipación para entrenar, competir y disfrutar.",
    tagline: "Equípate con lo que más rinde: calzado, técnico y outdoor.",
    seoLead:
      "Selección Zona Sport para hombre: zapatillas de running y pádel, camisetas, pantalones técnicos, abrigos y equipación de las mejores marcas multideporte.",
  },
  ninos: {
    gender: "NINO",
    slug: "ninos",
    label: "Niños",
    eyebrow: "Para los pequeños",
    headline: "Que crezcan moviéndose.",
    tagline: "Material deportivo cómodo y resistente para que disfruten del deporte.",
    seoLead:
      "Selección Zona Sport para niños y niñas: calzado, ropa deportiva y outdoor que aguanta el ritmo del día a día. Asesoramos la talla en tienda sin compromiso.",
  },
};

type GenderKey = keyof typeof GENDER_LANDINGS;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

/**
 * Landing editorial para /mujer, /hombre y /ninos. Estructura:
 *  1. HERO foto-top fullbleed (GenderHero) — anula el padding del <main>
 *  2. Breadcrumbs + tira de producto destacado (si existe)
 *  3. "Deportes" — Running / Pádel / Montaña / Calzado + sub-categorías
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

      {/* Anula el padding-top del <main> público para que la foto del hero
          quede DETRÁS de la pill flotante del Header (mismo truco que el home).
          El GenderHero internamente añade `pt-44 sm:pt-48 lg:pt-52` para que el
          texto del hero no quede tapado por la pill. */}
      <div className="-mt-[136px] sm:-mt-[148px]" />

      {/* HERO foto-top — fullbleed con foto landscape, igual concepto que
          HomeHero pero más compacto. Sustituye al antiguo hero de gradiente. */}
      <GenderHero gender={config.slug} productCount={productsRes.total} />

      {/* Breadcrumbs (movidos debajo del hero, como en el home tras una sección
          de portada). Mantienen el SEO + accesibilidad sin romper el impacto
          visual de la foto. */}
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

      {/* Producto destacado lateral — antes vivía dentro del hero gradiente.
          Lo mantenemos como tira editorial bajo el breadcrumb cuando hay
          producto principal: foto a la izquierda + título a la derecha. */}
      {heroProduct?.mainImageUrl && (
        <section className="border-b border-zs-border bg-white">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8 sm:py-8">
            <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-2xl bg-zs-surface sm:w-28">
              <Image
                src={heroProduct.mainImageUrl}
                alt={heroProduct.name}
                fill
                sizes="(max-width: 640px) 96px, 112px"
                className="object-contain p-2"
              />
            </div>
            <Link
              href={`/producto/${heroProduct.slug}`}
              className="group flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zs-red-600">
                  Producto destacado · {config.label}
                </p>
                <p className="mt-1 truncate text-base font-semibold text-zs-blue-900 sm:text-lg">
                  {heroProduct.brand?.name} {stripHtml(heroProduct.shortName ?? heroProduct.name)}
                </p>
              </div>
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zs-border text-zs-blue-700 transition-all group-hover:border-zs-red-600 group-hover:bg-zs-red-600 group-hover:text-white">
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </section>
      )}

      {/* CATEGORÍAS POR TIPO DE PRENDA — Camisetas / Pantalones / Sudaderas /
          Calzado. El cliente prefiere navegación por prenda en lugar de por
          deporte (las landings de deporte ya viven en /running, /padel, etc.).
          Sin fotos: gradiente brand + tipografía editorial — más limpio y sin
          riesgo de logos prohibidos en imágenes. Los 4 slugs son categorías
          ROOT en la DB (camisetas, pantalones, sudaderas, calzado). */}
      <section id="categorias" className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
        <div className="mb-10 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zs-red-600">
              Por tipo de prenda
            </p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-zs-blue-900 sm:text-4xl lg:text-5xl">
              ¿Qué buscas hoy?
            </h2>
          </div>
          <Link
            href="/marcas"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-zs-blue-700 hover:text-zs-red-600"
          >
            Ver todas las marcas <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {[
            {
              slug: "camisetas",
              name: "Camisetas",
              copy: "Manga corta, larga y polos",
              accent: "from-zs-blue-700 to-zs-blue-950",
              numeral: "01",
            },
            {
              slug: "pantalones",
              name: "Pantalones",
              copy: "Mallas, shorts y chándales",
              accent: "from-zs-red-600 to-zs-red-800",
              numeral: "02",
            },
            {
              slug: "sudaderas",
              name: "Sudaderas",
              copy: "Con capucha, abrigos y forros",
              accent: "from-emerald-700 to-emerald-950",
              numeral: "03",
            },
            {
              slug: "calzado",
              name: "Calzado",
              copy: "Deporte, casual y técnico",
              accent: "from-zs-blue-800 to-zs-blue-950",
              numeral: "04",
            },
          ].map((prenda) => (
            <li key={prenda.slug}>
              <Link
                href={`/${prenda.slug}?genero=${config.gender}`}
                className={`group relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br ${prenda.accent} p-5 text-white shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl sm:p-6`}
              >
                <span
                  aria-hidden
                  className="absolute right-4 top-4 font-display text-3xl font-extrabold tracking-tight text-white/20 sm:text-4xl"
                >
                  {prenda.numeral}
                </span>
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-transparent"
                />
                <div className="relative">
                  <h3 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
                    {prenda.name}
                  </h3>
                  <p className="mt-1 text-sm text-white/85">{prenda.copy}</p>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold">
                    Ver {prenda.name.toLowerCase()}{" "}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {/* Sub-categorías derivadas del catálogo si las hay (mochilas, sudaderas, etc.) */}
        {categories.length > 0 && (
          <div className="mt-12 border-t border-zs-border pt-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zs-muted">
              También en {config.label.toLowerCase()}
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {categories.slice(0, 14).map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/${cat.slug}?genero=${config.gender}`}
                    className="inline-flex items-center gap-2 rounded-full border border-zs-border bg-white px-4 py-2 text-sm font-medium text-zs-ink transition hover:border-zs-blue-700 hover:text-zs-blue-700"
                  >
                    {cat.name}
                    <span className="text-xs text-zs-muted">{cat.productCount}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

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
