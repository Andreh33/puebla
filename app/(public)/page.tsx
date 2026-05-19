import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MapPin, Sparkles, Truck, Shield, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppButton } from "@/components/public/WhatsAppButton";
import { ProductCardLuxe as ProductCard } from "@/components/public/ProductCardLuxe";
import { ScrollScene } from "@/components/public/scroll3d/ScrollScene";
import { buildMetadata } from "@/lib/seo/metadata";
import { WhatsAppMessages } from "@/lib/whatsapp";
import { db } from "@/lib/db";
import { formatDateES } from "@/lib/utils";
import {
  getFeaturedBrands,
  getFeaturedCategories,
  getFeaturedProducts,
  type PublicProductCardData,
} from "@/lib/public-queries";

export const metadata = buildMetadata({
  title: "Tienda de deportes en Puebla de la Calzada",
  description:
    "Zona Sport, tu tienda de deportes multimarca en Puebla de la Calzada (Badajoz). Running, pádel, montaña, calzado y complementos. Atención cercana en tienda y por WhatsApp.",
  path: "/",
});

export const revalidate = 300;

const TRUST_ITEMS = [
  { icon: MapPin, title: "Tienda física", text: "Te esperamos en C. Silos, 3, Puebla de la Calzada" },
  { icon: Heart, title: "Atención cercana", text: "Te asesoramos por WhatsApp o en tienda" },
  { icon: Shield, title: "Marcas de confianza", text: "John Smith, +8000, Adidas, Nike, Bullpadel y más" },
  { icon: Truck, title: "Recogida en tienda", text: "Reserva por WhatsApp y pasa a recoger" },
];

const FALLBACK_CATEGORIES = [
  { name: "Running", slug: "running", description: "Zapatillas, ropa y técnica", color: "from-zs-blue-700 to-zs-blue-900" },
  { name: "Pádel", slug: "padel", description: "Palas, pelotas y equipación", color: "from-zs-red-600 to-zs-red-800" },
  { name: "Montaña", slug: "montana", description: "Trekking, escalada y outdoor", color: "from-emerald-700 to-emerald-900" },
  { name: "Calzado", slug: "calzado", description: "Para deporte y día a día", color: "from-zs-blue-800 to-zs-blue-950" },
];

// Datos de la home — tolerantes a BD caída con fallback a demo-products.
type HomeData = {
  featuredProducts: PublicProductCardData[];
  featuredCategories: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
  }>;
  featuredBrands: Array<{ id: string; name: string; slug: string; logoUrl: string | null }>;
  latestPosts: Array<{
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    coverImageUrl: string | null;
    publishedAt: Date | null;
  }>;
};

async function fetchLatestPosts(): Promise<HomeData["latestPosts"]> {
  try {
    return await db.blogPost.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }],
      take: 3,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        coverImageUrl: true,
        publishedAt: true,
      },
    });
  } catch (err) {
    console.warn("[home] blogPost no disponible:", (err as Error).message);
    return [];
  }
}

async function fetchHomeData(): Promise<HomeData> {
  const [featuredProducts, featuredCategories, featuredBrands, latestPosts] = await Promise.all([
    getFeaturedProducts(8),
    getFeaturedCategories(),
    getFeaturedBrands(6),
    fetchLatestPosts(),
  ]);
  return { featuredProducts, featuredCategories, featuredBrands, latestPosts };
}

export default async function HomePage() {
  const { featuredProducts, featuredCategories, featuredBrands, latestPosts } =
    await fetchHomeData();

  const categories =
    featuredCategories.length > 0
      ? featuredCategories.map((c, i) => ({
          name: c.name,
          slug: c.slug,
          description: c.description ?? "Descubre nuestra selección",
          imageUrl: c.imageUrl,
          color: FALLBACK_CATEGORIES[i % FALLBACK_CATEGORIES.length]!.color,
        }))
      : FALLBACK_CATEGORIES.map((c) => ({ ...c, imageUrl: null as string | null }));

  return (
    <>
      {/* HERO 3D scroll-driven (zapatilla + rocas + tienda) */}
      <ScrollScene />

      {/* Anclaje y transición elegante hacia el catálogo real */}
      <div
        id="catalogo"
        aria-hidden
        className="relative -mt-px h-16 bg-gradient-to-b from-zs-blue-950 via-zs-blue-900 to-transparent"
      />

      {/* TRUST */}
      <section className="border-b border-zs-border bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_ITEMS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zs-blue-50 text-zs-blue-700">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-zs-ink">{title}</p>
                <p className="text-sm text-zs-muted">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORÍAS */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
        <div className="mb-10 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-zs-blue-900 sm:text-4xl">
              Descubre por deporte
            </h2>
            <p className="mt-2 max-w-2xl text-base text-zs-muted">
              Lo que vas a encontrar en la tienda. Pásate o consúltanos por stock concreto.
            </p>
          </div>
          <Link
            href="/marcas"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-zs-blue-700 hover:text-zs-red-600"
          >
            Ver todas las marcas <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/${cat.slug}`}
              className={`group relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br ${cat.color} p-6 text-white shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md`}
            >
              {cat.imageUrl && (
                <Image
                  src={cat.imageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover opacity-40 transition group-hover:opacity-50"
                  aria-hidden
                />
              )}
              <span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" aria-hidden />
              <div className="relative">
                <h3 className="text-2xl font-extrabold tracking-tight">{cat.name}</h3>
                <p className="mt-1 text-sm text-white/85">{cat.description}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold">
                  Ver categoría <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* PRODUCTOS DESTACADOS */}
      {featuredProducts.length > 0 ? (
        <section className="border-y border-zs-border bg-zs-surface">
          <div className="mx-auto max-w-7xl px-4 py-16">
            <div className="mb-8 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-zs-red-600">
                  Selección Zona Sport
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-zs-blue-900 sm:text-4xl">
                  Lo que más sale por la puerta
                </h2>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {featuredProducts.map((p, i) => (
                <ProductCard key={p.id} priority={i < 2} product={p} />
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="border-y border-zs-border bg-zs-surface">
          <div className="mx-auto max-w-7xl px-4 py-16 text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-zs-red-600">
              Catálogo en construcción
            </p>
            <h2 className="mt-2 text-3xl font-bold text-zs-blue-900">
              Estamos preparando el escaparate online
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-zs-muted">
              Pronto verás aquí nuestros artículos destacados. Mientras tanto, pásate por
              la tienda o consúltanos lo que necesitas.
            </p>
            <div className="mt-6 flex justify-center">
              <WhatsAppButton label="Consultar por WhatsApp" />
            </div>
          </div>
        </section>
      )}

      {/* MARCAS */}
      {featuredBrands.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16">
          <div className="mb-8 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
            <h2 className="text-2xl font-bold text-zs-blue-900 sm:text-3xl">
              Marcas que trabajamos
            </h2>
            <Link
              href="/marcas"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-zs-blue-700 hover:text-zs-red-600"
            >
              Ver todas <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {featuredBrands.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/marca/${b.slug}`}
                  className="flex h-24 items-center justify-center rounded-xl border border-zs-border bg-white p-4 transition hover:border-zs-blue-700 hover:shadow-sm"
                >
                  {b.logoUrl ? (
                    <Image
                      src={b.logoUrl}
                      alt={b.name}
                      width={140}
                      height={64}
                      className="max-h-12 w-auto object-contain"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-zs-blue-900">{b.name}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* BLOG */}
      {latestPosts.length > 0 && (
        <section className="border-t border-zs-border bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16">
            <div className="mb-8 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-zs-red-600">
                  Lo último del blog
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-zs-blue-900 sm:text-4xl">
                  Guías, consejos y reviews
                </h2>
              </div>
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-zs-blue-700 hover:text-zs-red-600"
              >
                Ver el blog <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {latestPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group overflow-hidden rounded-2xl border border-zs-border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative aspect-[16/10] w-full bg-zs-surface">
                    {post.coverImageUrl ? (
                      <Image
                        src={post.coverImageUrl}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-zs-gradient opacity-90" aria-hidden />
                    )}
                  </div>
                  <div className="space-y-2 p-5">
                    <p className="text-xs uppercase tracking-wide text-zs-muted">
                      {formatDateES(post.publishedAt)}
                    </p>
                    <h3 className="line-clamp-2 text-lg font-bold text-zs-blue-900 group-hover:text-zs-red-600">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="line-clamp-2 text-sm text-zs-muted">{post.excerpt}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* VISÍTANOS */}
      <section className="border-y border-zs-border bg-zs-surface">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-zs-red-600">
              Visítanos
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-zs-blue-900 sm:text-4xl">
              Puebla de la Calzada · C. Silos, 3
            </h2>
            <p className="mt-3 max-w-xl text-base text-zs-muted">
              Estamos en pleno centro. A 5 minutos de Montijo, 15 de Mérida y 30 de Badajoz.
              Te asesoramos sin compromiso, ven a ver el producto y pruébatelo.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <a
                  href="https://maps.google.com/?q=C.+Silos,+3,+06490+Puebla+de+la+Calzada,+Badajoz"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Cómo llegar
                </a>
              </Button>
              <WhatsAppButton message={WhatsAppMessages.generic()} label="Consultar por WhatsApp" />
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-zs-border bg-white">
            <iframe
              title="Ubicación Zona Sport"
              src="https://www.google.com/maps?q=C.+Silos,+3,+06490+Puebla+de+la+Calzada,+Badajoz&output=embed"
              className="aspect-video w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </>
  );
}
