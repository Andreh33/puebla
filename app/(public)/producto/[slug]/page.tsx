import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight, Check, Truck, RotateCcw, MapPin, Shield } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { db } from "@/lib/db";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, productSchema, jsonLd } from "@/lib/seo/schema-org";
import { formatPriceEUR } from "@/lib/utils";
import { sanitizeHtml, cleanProductName } from "@/lib/utils/html";
import { effectivePrice } from "@/lib/price";
import { ProductGallery } from "@/components/public/ProductGallery";
import { ProductActions } from "@/components/public/ProductActions";
import { OtherColors } from "@/components/public/OtherColors";
import { RelatedProducts } from "@/components/public/RelatedProducts";
import { AmazonDisclosure } from "@/components/public/AmazonDisclosure";
import { InfoAccordion } from "@/components/public/InfoAccordion";
import { ProductSku } from "@/components/public/ProductSku";
import { resolveProductSku } from "@/lib/products/sku";
import { Badge } from "@/components/ui/badge";

export const revalidate = 300;
export const dynamicParams = true;

type Params = { slug: string };

export async function generateStaticParams() {
  // Sólo prerender los primeros 100 productos más relevantes; el resto vía ISR.
  // Tolerante a DB caída durante build (devuelve [] si no hay conexión).
  try {
    const total = await db.product.count({ where: { status: "ACTIVE" } });
    if (total > 1000) return [];
    const items = await db.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
      take: 100,
      select: { slug: true },
    });
    return items.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await db.product.findUnique({
    where: { slug },
    select: {
      name: true,
      shortName: true,
      description: true,
      mainImageUrl: true,
      metaTitle: true,
      metaDescription: true,
      tags: true,
      colorName: true,
      brand: { select: { name: true } },
    },
  });
  if (!p) return buildMetadata({ title: "Producto no encontrado", noIndex: true });

  const title =
    p.metaTitle ||
    `${cleanProductName(p.name)}${p.brand ? ` · ${p.brand.name}` : ""}${
      p.colorName && p.colorName !== "Único" ? ` (${p.colorName})` : ""
    }`;
  return buildMetadata({
    title,
    description:
      p.metaDescription ||
      (p.description ? p.description.slice(0, 160) : `Compra ${p.name} en Zona Sport. Recoge en tienda o consulta por WhatsApp.`),
    path: `/producto/${slug}`,
    ogImage: p.mainImageUrl ?? undefined,
    ogType: "product",
    tags: p.tags,
  });
}

const GENDER_LABEL: Record<string, string> = {
  HOMBRE: "Hombre",
  MUJER: "Mujer",
  UNISEX: "Unisex",
  NINO: "Niño",
  NINA: "Niña",
  BEBE: "Bebé",
  NO_ESPECIFICADO: "",
};

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;

  const product = await db.product.findUnique({
    where: { slug },
    include: {
      brand: true,
      category: { include: { parent: true } },
      images: { orderBy: { position: "asc" } },
      sizes: { orderBy: [{ position: "asc" }, { size: "asc" }] },
    },
  });
  if (!product || product.status !== "ACTIVE") notFound();

  const { final, retail, onSale, discountPct } = effectivePrice(
    Number(product.retailPrice),
    product.salePrice != null ? Number(product.salePrice) : null,
  );

  const totalStock =
    product.sizes.length > 0
      ? product.sizes.reduce((acc, s) => acc + s.stock, 0)
      : product.stock;
  const inStock = totalStock > 0 || product.source === "AMAZON";

  // Hermanos de color (mismo modelCode, distinto id)
  const [colorSiblings, relatedProducts] = await Promise.all([
    product.modelCode
      ? db.product.findMany({
          where: {
            modelCode: product.modelCode,
            id: { not: product.id },
            status: "ACTIVE",
          },
          take: 8,
          select: {
            id: true,
            slug: true,
            colorName: true,
            colorHex: true,
            mainImageUrl: true,
          },
        })
      : Promise.resolve([]),
    db.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
        status: "ACTIVE",
        ...(product.modelCode ? { NOT: { modelCode: product.modelCode } } : {}),
      },
      orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
      take: 8,
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
      },
    }),
  ]);

  const breadcrumbs = [
    { name: "Inicio", path: "/" },
    ...(product.category.parent
      ? [{ name: product.category.parent.name, path: `/${product.category.parent.slug}` }]
      : []),
    { name: product.category.name, path: `/${product.category.slug}` },
    { name: cleanProductName(product.name), path: `/producto/${product.slug}` },
  ];

  const galleryImages =
    product.images.length > 0
      ? product.images.map((img) => ({
          url: img.url,
          urlThumb: img.urlThumb,
          urlMedium: img.urlMedium,
          alt: img.alt || product.name,
          blurDataUrl: img.blurDataUrl,
          width: img.width,
          height: img.height,
        }))
      : product.mainImageUrl
        ? [{ url: product.mainImageUrl, alt: product.name }]
        : [];

  const productLd = productSchema({
    name: cleanProductName(product.name),
    description: product.description,
    images: galleryImages.map((i) => i.url),
    sku: product.id,
    mpn: product.modelCode,
    brandName: product.brand.name,
    categoryName: product.category.name,
    price: final.toNumber(),
    inStock,
    slug: product.slug,
  });

  const sizes = product.sizes.map((s) => ({ id: s.id, size: s.size, stock: s.stock }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema(breadcrumbs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(productLd) }}
      />

      <nav aria-label="Migas de pan" className="border-b border-zs-border bg-white">
        <ol className="mx-auto flex max-w-7xl flex-wrap items-center gap-1 px-4 py-3 text-xs text-zs-muted">
          {breadcrumbs.map((b, i) => (
            <li key={b.path + i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" aria-hidden />}
              {i === breadcrumbs.length - 1 ? (
                <span className="line-clamp-1 max-w-[40ch] font-semibold text-zs-ink" aria-current="page">
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

      <section className="mx-auto max-w-7xl px-4 py-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Galería */}
          <ProductGallery images={galleryImages} productName={product.name} />

          {/* Info */}
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              {product.brand.slug && (
                <Link
                  href={`/marca/${product.brand.slug}`}
                  className="text-xs font-semibold uppercase tracking-wider text-zs-blue-700 hover:text-zs-red-600"
                >
                  {product.brand.name}
                </Link>
              )}
              {product.source === "AMAZON" && (
                <Badge variant="amazon">Disponible vía Amazon</Badge>
              )}
              {onSale && <Badge variant="sale">-{discountPct}%</Badge>}
              {product.gender && product.gender !== "NO_ESPECIFICADO" && (
                <Badge variant="outline">{GENDER_LABEL[product.gender]}</Badge>
              )}
            </div>

            <h1 className="text-balance text-3xl font-extrabold tracking-tight text-zs-blue-900 sm:text-4xl">
              {product.name}
            </h1>
            {product.colorName && product.colorName !== "Único" && (
              <p className="text-sm text-zs-muted">
                Color: <strong className="text-zs-ink">{product.colorName}</strong>
              </p>
            )}

            <div className="flex flex-wrap items-baseline gap-3 pt-1">
              <span className="text-3xl font-extrabold tabular-nums text-zs-blue-900 sm:text-4xl">
                {formatPriceEUR(final.toNumber())}
              </span>
              {onSale && (
                <span className="text-lg text-zs-muted line-through tabular-nums">
                  {formatPriceEUR(retail.toNumber())}
                </span>
              )}
            </div>
            <p className="text-xs text-zs-muted">IVA incluido</p>

            <ProductSku
              sku={resolveProductSku({
                modelCode: product.modelCode,
                externalId: product.externalId,
                id: product.id,
              })}
            />

            <ProductActions
              productName={cleanProductName(product.name)}
              priceLabel={formatPriceEUR(final.toNumber())}
              sizes={sizes}
              source={product.source}
              externalUrl={product.externalUrl}
              product={{
                id: product.id,
                slug: product.slug,
                name: cleanProductName(product.name),
                brand: product.brand.name,
                imageUrl: product.mainImageUrl ?? galleryImages[0]?.url ?? null,
                colorName: product.colorName,
                price: final.toNumber(),
              }}
            />

            {/* Resumen rápido */}
            <ul className="grid grid-cols-2 gap-3 border-t border-zs-border pt-5 text-sm text-zs-ink">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-zs-blue-700" />
                <span>Recogida gratis en tienda</span>
              </li>
              <li className="flex items-start gap-2">
                <Truck className="mt-0.5 h-4 w-4 text-zs-blue-700" />
                <span>Envíos a toda España</span>
              </li>
              <li className="flex items-start gap-2">
                <RotateCcw className="mt-0.5 h-4 w-4 text-zs-blue-700" />
                <span>Cambios y devoluciones 14 días</span>
              </li>
              <li className="flex items-start gap-2">
                <Shield className="mt-0.5 h-4 w-4 text-zs-blue-700" />
                <span>Garantía del fabricante</span>
              </li>
            </ul>

            {/* Otros colores */}
            {colorSiblings.length > 0 && (
              <div className="border-t border-zs-border pt-6">
                <OtherColors
                  siblings={colorSiblings}
                  currentColor={product.colorName ?? "Único"}
                  productName={cleanProductName(product.name)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Descripción + acordeones */}
        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {product.description ? (
              /<[a-z][\s\S]*?>/i.test(product.description) ? (
                // Descripciones importadas desde WooCommerce vienen como HTML
                // (<ul><li><strong>…</strong></li></ul>). React Markdown las
                // muestra como texto plano con los tags visibles. Renderizamos
                // como HTML sanitizado (allowlist: ul/li/strong/p/em/h2…h6/a).
                <article className="prose prose-zs max-w-none">
                  <h2 className="text-2xl font-bold text-zs-blue-900">Descripción</h2>
                  <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }} />
                </article>
              ) : (
                <article className="prose prose-zs max-w-none">
                  <h2 className="text-2xl font-bold text-zs-blue-900">Descripción</h2>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {product.description}
                  </ReactMarkdown>
                </article>
              )
            ) : (
              <div>
                <h2 className="text-2xl font-bold text-zs-blue-900">Descripción</h2>
                <p className="mt-2 text-sm text-zs-muted">
                  Sin descripción detallada. Si necesitas información extra, consúltanos
                  por WhatsApp y te ayudamos.
                </p>
              </div>
            )}

            {/* Descripción técnica (texto libre, opcional) — debajo de la normal */}
            {product.technicalDescription &&
              (/<[a-z][\s\S]*?>/i.test(product.technicalDescription) ? (
                <article className="prose prose-zs mt-8 max-w-none">
                  <h2 className="text-2xl font-bold text-zs-blue-900">Descripción técnica</h2>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(product.technicalDescription),
                    }}
                  />
                </article>
              ) : (
                <article className="prose prose-zs mt-8 max-w-none">
                  <h2 className="text-2xl font-bold text-zs-blue-900">Descripción técnica</h2>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {product.technicalDescription}
                  </ReactMarkdown>
                </article>
              ))}

            {/* Ficha técnica */}
            <dl className="mt-8 grid grid-cols-1 gap-x-6 gap-y-3 rounded-2xl border border-zs-border bg-white p-5 text-sm sm:grid-cols-2">
              {product.brand && (
                <Row label="Marca" value={product.brand.name} />
              )}
              {product.modelCode && <Row label="Modelo" value={product.modelCode} />}
              {product.colorName && <Row label="Color" value={product.colorName} />}
              {product.sportUse && <Row label="Uso deportivo" value={product.sportUse} />}
              {product.composition && (
                <Row label="Composición" value={product.composition} />
              )}
              {product.gender && product.gender !== "NO_ESPECIFICADO" && (
                <Row label="Género" value={GENDER_LABEL[product.gender] ?? product.gender} />
              )}
              {product.category && <Row label="Categoría" value={product.category.name} />}
            </dl>
          </div>

          <aside className="space-y-4">
            <InfoAccordion
              items={[
                {
                  title: "Composición y cuidados",
                  content: product.composition ? (
                    <p>{product.composition}</p>
                  ) : (
                    <p>Consulta la etiqueta del producto o pregúntanos por WhatsApp.</p>
                  ),
                },
                {
                  title: "Envíos y devoluciones",
                  content: (
                    <ul className="space-y-1">
                      <li className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                        Recogida gratis en tienda (Puebla de la Calzada).
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                        Envío a toda España disponible bajo consulta.
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                        14 días para cambios y devoluciones según ley.
                      </li>
                    </ul>
                  ),
                },
                {
                  title: "Atención y reservas",
                  content: (
                    <p>
                      Te atendemos por WhatsApp al 689 11 06 91 o en tienda, en
                      C. Silos, 3 (Puebla de la Calzada). Te apartamos el producto para
                      que pases a recogerlo cuando te venga bien.
                    </p>
                  ),
                },
              ]}
            />
          </aside>
        </div>

        {/* Relacionados */}
        <RelatedProducts
          products={relatedProducts.map((p) => ({
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
          }))}
        />

        {product.source === "AMAZON" && <AmazonDisclosure />}
      </section>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs uppercase tracking-wide text-zs-muted">{label}</dt>
      <dd className="font-semibold text-zs-ink">{value}</dd>
    </div>
  );
}
