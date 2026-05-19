import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { HomeHero } from "@/components/public/home/HomeHero";
import { QuickShop } from "@/components/public/home/QuickShop";
import { PromoStrip } from "@/components/public/home/PromoStrip";
import { ProductShowcase } from "@/components/public/home/ProductShowcase";
import { GenderSplit } from "@/components/public/home/GenderSplit";
import { StoreEditorial } from "@/components/public/home/StoreEditorial";
import { StoreMap } from "@/components/public/home/StoreMap";
import { PhrasesMarquee } from "@/components/public/home/PhrasesMarquee";
import { WhatsAppNudge } from "@/components/public/home/WhatsAppNudge";
import { Reveal } from "@/components/public/Reveal";
import { buildMetadata } from "@/lib/seo/metadata";
import { db } from "@/lib/db";
import { formatDateES } from "@/lib/utils";
import {
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

type HomeData = {
  featuredProducts: PublicProductCardData[];
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
  const [featuredProducts, latestPosts] = await Promise.all([
    getFeaturedProducts(8),
    fetchLatestPosts(),
  ]);
  return { featuredProducts, latestPosts };
}

export default async function HomePage() {
  const { featuredProducts, latestPosts } = await fetchHomeData();

  return (
    <>
      {/* Hero editorial directo (sin ScrollScene 3D — reservado para fase futura). */}
      <HomeHero />

      {/* Ancla del catálogo. */}
      <div id="catalogo" aria-hidden className="h-0" />

      {/* 01 — Atajos para comprar (4 categorías estrella con foto Unsplash). */}
      <QuickShop />

      {/* 02 — Promo strip: Ofertas / Recién llegado / Recogida en tienda. */}
      <PromoStrip />

      {/* 03 — Top ventas con badges, countdown y trust badges. */}
      <ProductShowcase products={featuredProducts} />

      {/* 04 — Para ella / Para él / Para los pequeños con fotos reales. */}
      <GenderSplit />

      {/* Marquesina infinita con frases (reemplaza la antigua tira de logos). */}
      <PhrasesMarquee />

      {/* 05 — La tienda con foto Unsplash + testimonial. */}
      <StoreEditorial />

      {/* 06 — Mapa real a la tienda + NAP, horarios, WhatsApp y "Cómo llegar"
              (reemplaza al antiguo SocialProof). */}
      <StoreMap />

      {/* Mini-tooltip mobile sobre el WhatsApp flotante. */}
      <WhatsAppNudge />

      {/* Blog: si hay posts publicados se mantiene en formato editorial. */}
      {latestPosts.length > 0 && (
        <section className="relative bg-white py-24 sm:py-32">
          <header className="mx-auto mb-14 flex max-w-[1600px] flex-col gap-6 px-4 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
            <Reveal variant="fade-up">
              <p className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-zs-muted">
                <span className="inline-block h-px w-8 bg-zs-blue-900/30" />
                05 — Diario
              </p>
              <h2
                className="mt-6 font-display font-bold leading-[0.92] tracking-[-0.035em] text-zs-blue-950"
                style={{ fontSize: "clamp(2.25rem, 5.5vw, 4.5rem)" }}
              >
                Guías, reviews,<br />
                <span className="text-zs-muted/70">apuntes desde la tienda.</span>
              </h2>
            </Reveal>
            <Link
              href="/blog"
              data-cursor="Blog"
              className="group inline-flex items-center gap-3 self-start text-sm font-semibold uppercase tracking-[0.22em] text-zs-blue-950 lg:self-end"
            >
              Ver el blog
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-zs-blue-950/15 transition-all group-hover:bg-zs-blue-950 group-hover:text-white">
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:rotate-45" />
              </span>
            </Link>
          </header>
          <div className="mx-auto grid max-w-[1600px] gap-8 px-4 sm:px-8 md:grid-cols-3">
            {latestPosts.map((post, i) => (
              <Reveal key={post.id} variant="fade-up" delay={i * 100}>
                <Link
                  href={`/blog/${post.slug}`}
                  data-cursor="Leer"
                  className="group block overflow-hidden rounded-3xl bg-zs-surface"
                >
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-zs-surface">
                    {post.coverImageUrl ? (
                      <Image
                        src={post.coverImageUrl}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-zs-gradient" aria-hidden />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
                  </div>
                  <div className="space-y-3 px-1 pt-6 pb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-zs-muted">
                      {formatDateES(post.publishedAt)}
                    </p>
                    <h3
                      className="line-clamp-3 font-display font-bold leading-[1.05] tracking-[-0.025em] text-zs-blue-950"
                      style={{ fontSize: "clamp(1.35rem, 2vw, 1.85rem)" }}
                    >
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="line-clamp-2 text-sm text-zs-muted">{post.excerpt}</p>
                    )}
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Si por algún motivo no hay productos destacados, fallback discreto. */}
      {featuredProducts.length === 0 && (
        <section className="bg-white py-20">
          <div className="mx-auto max-w-2xl px-4 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zs-red-600">
              Catálogo en preparación
            </p>
            <p className="mt-6 font-display text-3xl font-bold leading-tight tracking-tight text-zs-blue-950">
              Pronto verás aquí la selección completa.
            </p>
            <p className="mt-4 text-zs-muted">
              Mientras tanto, pásate por la tienda o pregúntanos por WhatsApp.
            </p>
          </div>
        </section>
      )}
    </>
  );
}
