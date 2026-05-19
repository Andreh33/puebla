import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { CalendarDays, Clock, User2 } from "lucide-react";
import { db } from "@/lib/db";
import { buildMetadata } from "@/lib/seo/metadata";
import { blogPostingSchema, breadcrumbSchema, jsonLd } from "@/lib/seo/schema-org";
import { Badge } from "@/components/ui/badge";
import { MarkdownRenderer } from "@/components/public/MarkdownRenderer";
import { TableOfContents } from "@/components/public/TableOfContents";
import { ShareButtons } from "@/components/public/ShareButtons";
import { PostCard } from "@/components/public/PostCard";
import { BlogPostNav } from "@/components/public/BlogPostNav";
import { extractHeadings, readingTimeMinutes } from "@/lib/blog/reading-time";
import { formatDateES, absoluteUrl } from "@/lib/utils";

export const revalidate = 600;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  try {
    const posts = await db.blogPost.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true },
      take: 100,
    });
    return posts.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await db.blogPost.findUnique({
      where: { slug },
      select: {
        title: true,
        metaTitle: true,
        excerpt: true,
        metaDescription: true,
        coverImageUrl: true,
        ogImageUrl: true,
        publishedAt: true,
        updatedAt: true,
        tags: true,
        status: true,
      },
    });
    if (!post || post.status !== "PUBLISHED") {
      return buildMetadata({ title: "Artículo no encontrado", path: `/blog/${slug}`, noIndex: true });
    }
    return buildMetadata({
      title: post.metaTitle ?? post.title,
      description: post.metaDescription ?? post.excerpt ?? undefined,
      path: `/blog/${slug}`,
      ogImage: post.ogImageUrl ?? post.coverImageUrl ?? undefined,
      ogType: "article",
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt?.toISOString(),
      tags: post.tags,
    });
  } catch {
    return buildMetadata({ title: "Blog", path: `/blog/${slug}` });
  }
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;

  let post: Awaited<ReturnType<typeof db.blogPost.findUnique>> = null;
  try {
    post = await db.blogPost.findUnique({ where: { slug } });
  } catch {
    notFound();
  }

  if (!post || post.status !== "PUBLISHED") notFound();
  if (post.publishedAt && post.publishedAt > new Date()) notFound();

  const headings = extractHeadings(post.contentMd);
  const minutes = readingTimeMinutes(post.contentMd);

  // Prev / Next posts (orden cronológico por publishedAt)
  let prevNeighbor: { slug: string; title: string } | null = null;
  let nextNeighbor: { slug: string; title: string } | null = null;
  try {
    if (post.publishedAt) {
      const [p, n] = await Promise.all([
        db.blogPost.findFirst({
          where: { status: "PUBLISHED", publishedAt: { lt: post.publishedAt } },
          orderBy: { publishedAt: "desc" },
          select: { slug: true, title: true },
        }),
        db.blogPost.findFirst({
          where: {
            status: "PUBLISHED",
            publishedAt: { gt: post.publishedAt, lte: new Date() },
          },
          orderBy: { publishedAt: "asc" },
          select: { slug: true, title: true },
        }),
      ]);
      prevNeighbor = p ?? null;
      nextNeighbor = n ?? null;
    }
  } catch {
    // ignore
  }

  // Posts relacionados (mismo tag)
  let related: Awaited<ReturnType<typeof db.blogPost.findMany>> = [];
  let relatedProducts: Array<{ id: string; slug: string; name: string; mainImageUrl: string | null; retailPrice: unknown }> = [];
  try {
    if (post.tags.length > 0) {
      related = await db.blogPost.findMany({
        where: {
          status: "PUBLISHED",
          slug: { not: post.slug },
          tags: { hasSome: post.tags },
        },
        orderBy: { publishedAt: "desc" },
        take: 3,
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
      }) as never;

      relatedProducts = await db.product.findMany({
        where: {
          status: "ACTIVE",
          tags: { hasSome: post.tags },
        },
        take: 4,
        orderBy: { isFeatured: "desc" },
        select: {
          id: true,
          slug: true,
          name: true,
          mainImageUrl: true,
          retailPrice: true,
        },
      });
    }
  } catch {
    // ignore
  }

  const url = absoluteUrl(`/blog/${post.slug}`);
  const postingSchema = blogPostingSchema({
    title: post.title,
    description: post.excerpt,
    slug: post.slug,
    publishedAt: post.publishedAt ?? post.createdAt,
    modifiedAt: post.updatedAt,
    author: post.author,
    imageUrl: post.ogImageUrl ?? post.coverImageUrl,
    tags: post.tags,
  });
  const crumbs = breadcrumbSchema([
    { name: "Inicio", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: post.title, path: `/blog/${post.slug}` },
  ]);

  return (
    <article className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd([postingSchema, crumbs]) }}
      />

      {/* Breadcrumbs visuales */}
      <nav className="mb-6 text-xs text-zs-muted" aria-label="Migas de pan">
        <Link href="/" className="hover:text-zs-blue-700">Inicio</Link>
        <span className="mx-1">/</span>
        <Link href="/blog" className="hover:text-zs-blue-700">Blog</Link>
        <span className="mx-1">/</span>
        <span className="text-zs-ink">{post.title}</span>
      </nav>

      <header className="mb-10">
        {post.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <Link key={t} href={`/blog?tag=${encodeURIComponent(t)}`}>
                <Badge variant="outline" className="text-xs uppercase tracking-wide hover:bg-zs-surface">
                  {t}
                </Badge>
              </Link>
            ))}
          </div>
        )}
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-zs-blue-900 sm:text-4xl lg:text-5xl">
          {post.title}
        </h1>
        {post.excerpt && (
          <p className="mt-4 text-lg text-zs-muted">{post.excerpt}</p>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zs-muted">
          <span className="inline-flex items-center gap-1.5">
            <User2 className="h-4 w-4" /> {post.author}
          </span>
          {post.publishedAt && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              <time dateTime={post.publishedAt.toISOString()}>
                {formatDateES(post.publishedAt)}
              </time>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> {minutes} min de lectura
          </span>
        </div>
      </header>

      {post.coverImageUrl && (
        <div className="relative mb-12 aspect-[16/9] overflow-hidden rounded-2xl bg-zs-surface">
          <Image
            src={post.coverImageUrl}
            alt={`Portada de ${post.title}`}
            fill
            sizes="(min-width: 1024px) 1024px, 100vw"
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* TOC mobile colapsable (sólo si hay >1 heading) */}
      {headings.length >= 2 && (
        <div className="mb-6 lg:hidden">
          <TableOfContents headings={headings} mobileCollapsible />
        </div>
      )}

      <div className="grid gap-12 lg:grid-cols-[1fr_220px]">
        <div className="prose prose-zs max-w-prose text-base leading-relaxed text-zs-ink">
          <MarkdownRenderer source={post.contentMd} />
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <TableOfContents headings={headings} />
          </div>
        </aside>
      </div>

      <div className="mt-12 border-t border-zs-border pt-8">
        <ShareButtons url={url} title={post.title} />
      </div>

      <BlogPostNav prev={prevNeighbor} next={nextNeighbor} />

      {relatedProducts.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold text-zs-blue-900">
            Productos mencionados
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((p) => (
              <Link
                key={p.id}
                href={`/producto/${p.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-zs-border bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="relative aspect-square overflow-hidden bg-zs-surface">
                  {p.mainImageUrl ? (
                    <Image
                      src={p.mainImageUrl}
                      alt={p.name}
                      fill
                      sizes="(min-width: 1024px) 25vw, 50vw"
                      className="object-contain transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-zs-muted">
                      Sin imagen
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-semibold text-zs-ink group-hover:text-zs-blue-700">
                    {p.name}
                  </p>
                  <p className="mt-1 text-sm font-bold text-zs-blue-900">
                    {Number(p.retailPrice).toFixed(2)} €
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold text-zs-blue-900">
            Sigue leyendo
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <PostCard
                key={r.id}
                post={{
                  slug: r.slug,
                  title: r.title,
                  excerpt: r.excerpt,
                  coverImageUrl: r.coverImageUrl,
                  author: r.author,
                  publishedAt: r.publishedAt,
                  tags: r.tags,
                  contentMd: r.contentMd,
                }}
              />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
