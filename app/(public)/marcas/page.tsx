import Link from "next/link";
import Image from "next/image";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, jsonLd } from "@/lib/seo/schema-org";
import { getBrandList } from "@/lib/public-queries";

export const revalidate = 600;

export const metadata = buildMetadata({
  title: "Marcas que trabajamos",
  description:
    "Catálogo de marcas deportivas disponibles en Zona Sport — Puebla de la Calzada. John Smith, +8000, Joma, Bullpadel, Head, Asics, Salomon y muchas más.",
  path: "/marcas",
});

export default async function BrandsPage() {
  // Real-or-demo: si la BD no responde, el helper devuelve las marcas del
  // catálogo demo para que la página siga llena de contenido.
  const { brands } = await getBrandList();

  const breadcrumbs = [
    { name: "Inicio", path: "/" },
    { name: "Marcas", path: "/marcas" },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema(breadcrumbs)) }}
      />

      <section className="bg-zs-gradient text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
          <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
            Marcas en Zona Sport
          </h1>
          <p className="mt-3 max-w-2xl text-balance text-white/85 sm:text-lg">
            Trabajamos con las firmas que mejor se adaptan a nuestros clientes: técnicas,
            duraderas y con la mejor relación calidad-precio.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        {brands.length === 0 ? (
          <p className="rounded-2xl border border-zs-border bg-white p-8 text-center text-zs-muted">
            Estamos cargando el catálogo de marcas. Vuelve pronto.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {brands.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/marca/${b.slug}`}
                  className="group flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-zs-border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-zs-blue-700 hover:shadow-md"
                >
                  <div className="flex h-20 w-full items-center justify-center">
                    {b.logoUrl ? (
                      <Image
                        src={b.logoUrl}
                        alt={b.name}
                        width={160}
                        height={80}
                        className="max-h-16 w-auto object-contain"
                      />
                    ) : (
                      <span className="text-xl font-bold text-zs-blue-900">{b.name}</span>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-zs-ink group-hover:text-zs-blue-700">
                      {b.name}
                    </p>
                    <p className="text-xs text-zs-muted">
                      {b.productCount} {b.productCount === 1 ? "producto" : "productos"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
