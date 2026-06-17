import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight, Shirt, Footprints, ArrowRight, Tag } from "lucide-react";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, jsonLd } from "@/lib/seo/schema-org";

// Hub del Outlet: dos tarjetas (Textil / Calzado) que llevan a los listados
// filtrables /outlet/textil y /outlet/calzado. SSR dinámico para coherencia con
// el resto de la tienda (el listado real depende de la BD).
export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Outlet — Ofertas en textil y calzado",
  description:
    "Outlet de Zona Sport: ropa y calzado deportivo de marca a precio reducido. Textil y calzado con recogida en tienda en Puebla de la Calzada (Badajoz).",
  path: "/outlet",
});

const FAMILIES: Array<{
  familia: "textil" | "calzado";
  title: string;
  caption: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  gradient: string;
}> = [
  {
    familia: "textil",
    title: "Textil",
    caption: "Camisetas, sudaderas, chándales y más, rebajados.",
    Icon: Shirt,
    gradient: "from-zs-blue-700 via-zs-blue-950 to-[#08102d]",
  },
  {
    familia: "calzado",
    title: "Calzado",
    caption: "Zapatillas y botas de marca a precio de outlet.",
    Icon: Footprints,
    gradient: "from-zs-red-600 via-zs-red-600 to-[#7a1e1e]",
  },
];

export default function OutletHubPage() {
  const breadcrumbs = [
    { name: "Inicio", path: "/" },
    { name: "Outlet", path: "/outlet" },
  ];

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
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/85 backdrop-blur">
            <Tag className="h-3.5 w-3.5" />
            Outlet
          </p>
          <h1 className="mt-4 text-balance text-3xl font-extrabold tracking-tight sm:text-5xl">
            Outlet
          </h1>
          <p className="mt-3 max-w-2xl text-balance text-white/85 sm:text-lg">
            Una selección de textil y calzado de marca a precio reducido. Mismas
            marcas de siempre, con un descuento que dura mientras haya stock.
          </p>
        </div>
      </section>

      {/* Tarjetas Textil / Calzado */}
      <section className="mx-auto max-w-7xl px-4 py-12 lg:py-16">
        <div className="grid gap-5 sm:grid-cols-2">
          {FAMILIES.map((f) => {
            const Icon = f.Icon;
            return (
              <Link
                key={f.familia}
                href={`/outlet/${f.familia}`}
                className={[
                  "group relative flex aspect-[16/10] flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br p-7 text-white transition-transform duration-500 hover:-translate-y-1 sm:p-9",
                  f.gradient,
                ].join(" ")}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-12 -top-12 h-72 w-72 rounded-full bg-white/15 blur-3xl"
                />
                <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur transition-transform duration-500 group-hover:scale-110 sm:h-16 sm:w-16">
                  <Icon className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={2.25} />
                </span>
                <div className="relative">
                  <h2
                    className="font-display font-black leading-[0.92] tracking-[-0.035em]"
                    style={{ fontSize: "clamp(1.75rem, 3vw, 2.75rem)" }}
                  >
                    {f.title}
                  </h2>
                  <p className="mt-2 max-w-[34ch] text-sm text-white/80">{f.caption}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em]">
                    Ver outlet de {f.title.toLowerCase()}
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1.5"
                      strokeWidth={2.5}
                    />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
