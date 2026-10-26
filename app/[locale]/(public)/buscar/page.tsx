import { getRequestLocale } from "@/lib/i18n/request";
import { translateValue as tx, translateTemplate as tf } from "@/lib/i18n/dictionaries";
import { t } from "@/lib/i18n/dictionaries";
import { withLocalePage, withLocaleMetadata } from "@/lib/i18n/page";
import { LocalizedLink as Link } from "@/components/public/LocalizedLink";
import { Search } from "lucide-react";
import { localizedPublicDb as db } from "@/lib/i18n/public-db";
import { searchProductWhere, searchPublicPosts } from "@/lib/i18n/search";
import { buildMetadata } from "@/lib/seo/metadata";
import { ProductCardLuxe as ProductCard } from "@/components/public/ProductCardLuxe";
import { EmptyState } from "@/components/public/EmptyState";
import { formatDateES } from "@/lib/utils";

export const dynamic = "force-dynamic";

 async function baseGenerateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return buildMetadata({
    title: q ? tf("Resultados para “{0}”", [q]) : "Buscar",
    description: "Encuentra productos, marcas y artículos del blog de Zona Sport.",
    path: q ? `/buscar?q=${encodeURIComponent(q)}` : "/buscar",
    noIndex: true,
  });
}

  async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: qRaw } = await searchParams;
  const q = (qRaw ?? "").trim().slice(0, 80);

  let products: Awaited<ReturnType<typeof fetchProducts>> = [];
  let posts: Awaited<ReturnType<typeof fetchPosts>> = [];
  if (q.length >= 2) {
    [products, posts] = await Promise.all([fetchProducts(q), fetchPosts(q)]);
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-zs-red-600">
          {t("Buscar")}</p>
        <h1 className="mt-2 text-3xl font-extrabold text-zs-blue-900 sm:text-4xl">
          {tx(q ? <>{t("Resultados para “")}{q}”</> : "Buscar en Zona Sport")}
        </h1>
        <form className="mt-5 flex max-w-xl items-center gap-2 rounded-2xl border border-zs-border bg-white p-2 shadow-sm" method="get">
          <Search className="ml-2 h-5 w-5 text-zs-muted" />
          <input
            name="q"
            defaultValue={q}
            placeholder={t("Producto, marca, artículo…")}
            className="flex-1 bg-transparent px-1 py-2 text-sm text-zs-ink placeholder:text-zs-muted focus:outline-none"
            autoFocus
          />
          <button
            type="submit"
            className="h-10 rounded-xl bg-zs-blue-900 px-4 text-sm font-semibold text-white hover:bg-zs-blue-800"
          >
            {t("Buscar")}</button>
        </form>
      </header>

      {tx(q.length < 2 ? (
        <p className="rounded-2xl border border-zs-border bg-white p-10 text-center text-zs-muted">
          {t("Introduce al menos 2 caracteres para buscar.")}</p>
      ) : products.length === 0 && posts.length === 0 ? (
        <EmptyState
          variant="no-results"
          title={`Sin resultados para “${q}”`}
          description={t("Prueba con otra palabra clave o consúltanos directamente por WhatsApp; te aconsejamos a la vuelta.")}
          cta={{ label: "Volver al inicio", href: "/" }}
          secondaryCta={{ label: "Hablar por WhatsApp", href: "/contacto" }}
        />
      ) : (
        <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
          <div>
            <h2 className="mb-4 text-xl font-bold text-zs-blue-900">
              {t("Productos")}{" "}<span className="text-sm font-medium text-zs-muted">({products.length})</span>
            </h2>
            {products.length === 0 ? (
              <p className="rounded-xl border border-zs-border bg-white p-6 text-sm text-zs-muted">
                {t("Sin productos para “")}{q}”.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={{
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
                      totalStock:
                        p.sizes.length > 0
                          ? p.sizes.reduce((acc, s) => acc + s.stock, 0)
                          : p.stock,
                      availableSizes: p.sizes.filter((s) => s.stock > 0).map((s) => s.size),
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <aside>
            <h2 className="mb-4 text-xl font-bold text-zs-blue-900">
              {t("Artículos")}{" "}<span className="text-sm font-medium text-zs-muted">({posts.length})</span>
            </h2>
            {posts.length === 0 ? (
              <p className="rounded-xl border border-zs-border bg-white p-6 text-sm text-zs-muted">
                {t("Sin artículos para “")}{q}”.
              </p>
            ) : (
              <ul className="space-y-3">
                {posts.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/blog/${p.slug}`}
                      className="block rounded-xl border border-zs-border bg-white p-4 transition hover:border-zs-blue-700 hover:shadow-sm"
                    >
                      <p className="text-xs uppercase tracking-wide text-zs-muted">
                        {formatDateES(p.publishedAt, getRequestLocale())}
                      </p>
                      <p className="mt-1 line-clamp-2 font-semibold text-zs-blue-900">{p.title}</p>
                      {p.excerpt && (
                        <p className="mt-1 line-clamp-2 text-sm text-zs-muted">{p.excerpt}</p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      ))}
    </section>
  );
}

async function fetchProducts(q: string) {
  try {
    const real = await db.product.findMany({
      where: searchProductWhere(getRequestLocale(), q),
      orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
      take: 24,
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
    });
    return real;
  } catch (err) {
    // Sin BD: devolvemos vacío. NO caemos a tarjetas demo — sus slugs no existen
    // en BD y enlazarían a /producto/<slug> con 404 (Bug A). El buscador muestra
    // "Sin resultados" con CTA a WhatsApp.
    console.warn("[buscar] DB no disponible:", (err as Error).message);
    return [];
  }
}

async function fetchPosts(q: string) {
  try {
    return await searchPublicPosts(getRequestLocale(), q, 10);
  } catch (err) {
    console.warn("[buscar] blog no disponible:", (err as Error).message);
    return [];
  }
}

export default withLocalePage(SearchPage);
export const generateMetadata = withLocaleMetadata(baseGenerateMetadata);
