import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, jsonLd } from "@/lib/seo/schema-org";
import { PostCard } from "@/components/public/PostCard";
import { EmptyState } from "@/components/public/EmptyState";

export const revalidate = 600;

const PER_PAGE = 10;

type SearchParams = Promise<{ page?: string; tag?: string }>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { tag } = await searchParams;
  const title = tag ? `Blog — etiqueta: ${tag}` : "Blog de Zona Sport";
  return buildMetadata({
    title,
    description:
      "Guías de compra, comparativas y noticias deportivas desde la tienda Zona Sport en Puebla de la Calzada (Badajoz).",
    path: tag ? `/blog?tag=${encodeURIComponent(tag)}` : "/blog",
  });
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { page: pageRaw, tag } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const skip = (page - 1) * PER_PAGE;

  const where = {
    status: "PUBLISHED" as const,
    publishedAt: { lte: new Date() },
    ...(tag ? { tags: { has: tag } } : {}),
  };

  let posts: Awaited<ReturnType<typeof db.blogPost.findMany>> = [];
  let total = 0;
  let dbAvailable = true;
  try {
    [posts, total] = await Promise.all([
      db.blogPost.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip,
        take: PER_PAGE,
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          coverImageUrl: true,
          author: true,
          publishedAt: true,
          tags: true,
          contentMd: true,
        },
      }) as never,
      db.blogPost.count({ where }),
    ]);
  } catch {
    dbAvailable = false;
  }

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Blog de Zona Sport",
    description:
      "Listado de artículos del blog editorial de Zona Sport: guías, comparativas, noticias y eventos.",
    url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/blog`,
  };
  const crumbs = breadcrumbSchema([
    { name: "Inicio", path: "/" },
    { name: "Blog", path: "/blog" },
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd([collectionSchema, crumbs]) }}
      />

      <header className="mb-10 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-zs-red-600">
          Blog editorial
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-zs-blue-900 sm:text-5xl">
          {tag ? `Etiqueta: ${tag}` : "Diario de Zona Sport"}
        </h1>
        <p className="mt-3 text-base text-zs-muted">
          Guías de compra, comparativas, noticias de la tienda y crónicas del deporte
          local en la comarca de Mérida y Badajoz.
        </p>
        {tag && (
          <p className="mt-4">
            <Link href="/blog" className="text-sm font-semibold text-zs-blue-700 hover:text-zs-red-600">
              ← Ver todos los artículos
            </Link>
          </p>
        )}
      </header>

      {!dbAvailable && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          No se puede acceder a la base de datos en este momento. Vuelve a intentarlo
          en unos minutos.
        </div>
      )}

      {dbAvailable && posts.length === 0 && (
        <EmptyState
          variant="no-posts"
          title={tag ? `Sin artículos para "${tag}"` : undefined}
          description={
            tag
              ? "Estamos preparando contenido sobre esta etiqueta. Mientras tanto, lee el resto del blog."
              : undefined
          }
          cta={tag ? { label: "Ver todo el blog", href: "/blog" } : null}
        />
      )}

      {posts.length > 0 && (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p, i) => (
            <PostCard
              key={p.id}
              priority={i < 3}
              post={{
                slug: p.slug,
                title: p.title,
                excerpt: p.excerpt,
                coverImageUrl: p.coverImageUrl,
                author: p.author,
                publishedAt: p.publishedAt,
                tags: p.tags,
                contentMd: p.contentMd,
              }}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Paginación">
          {page > 1 && (
            <Link
              href={pageHref(page - 1, tag)}
              className="rounded-lg border border-zs-border px-4 py-2 text-sm font-semibold text-zs-ink hover:bg-zs-surface"
            >
              ← Anterior
            </Link>
          )}
          <span className="text-sm text-zs-muted">
            Página {page} de {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={pageHref(page + 1, tag)}
              className="rounded-lg border border-zs-border px-4 py-2 text-sm font-semibold text-zs-ink hover:bg-zs-surface"
            >
              Siguiente →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

function pageHref(p: number, tag?: string): string {
  const params = new URLSearchParams();
  if (p > 1) params.set("page", String(p));
  if (tag) params.set("tag", tag);
  const qs = params.toString();
  return qs ? `/blog?${qs}` : "/blog";
}
