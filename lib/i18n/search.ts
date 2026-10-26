import "server-only";
import type { Prisma } from "@prisma/client";
import type { Locale } from "./config";
import { publicDatabase } from "./public-db";
import { translatedSearchSlugs, loadEditorialPosts } from "./content";
import { IN_STOCK_WHERE } from "@/lib/products/in-stock";

/** Shared by command search and the complete search page. */
export function searchProductWhere(locale: Locale, q: string): Prisma.ProductWhereInput {
  return {
    status: "ACTIVE", AND: [IN_STOCK_WHERE],
    OR: [
      { slug: { in: translatedSearchSlugs("products", locale, q) } },
      { name: { contains: q, mode: "insensitive" } },
      { shortName: { contains: q, mode: "insensitive" } },
      { colorName: { contains: q, mode: "insensitive" } },
      { tags: { has: q.toLowerCase() } },
      { brand: { is: { name: { contains: q, mode: "insensitive" } } } },
      { category: { is: { name: { contains: q, mode: "insensitive" } } } },
    ],
  };
}
export function searchPostWhere(locale: Locale, q: string): Prisma.BlogPostWhereInput {
  return {
    status: "PUBLISHED",
    AND: [{ OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }] }],
    OR: [
      { slug: { in: translatedSearchSlugs("posts", locale, q) } },
      { title: { contains: q, mode: "insensitive" } },
      { excerpt: { contains: q, mode: "insensitive" } },
      { tags: { has: q.toLowerCase() } },
    ],
  };
}
export async function searchPublicPosts(locale: Locale, q: string, take: number) {
  const posts = await publicDatabase(locale).blogPost.findMany({
    where: searchPostWhere(locale, q), take,
    orderBy: [{ publishedAt: "desc" }, { slug: "asc" }],
    select: { id: true, slug: true, title: true, excerpt: true, publishedAt: true },
  });
  const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase();
  const needle = normalize(q);
  const native = loadEditorialPosts(locale)
    .filter(post => normalize(`${post.title} ${post.excerpt} ${post.tags.join(" ")}`).includes(needle))
    .map(post => ({ id: `editorial:${locale}:${post.slug}`, slug: post.slug, title: post.title, excerpt: post.excerpt, publishedAt: new Date(post.publishedAt) }));
  // Merge before limiting: both consumers display the count of the returned set.
  return [...new Map([...posts, ...native].map(post => [post.slug, post])).values()]
    .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0) || a.slug.localeCompare(b.slug))
    .slice(0, take);
}
