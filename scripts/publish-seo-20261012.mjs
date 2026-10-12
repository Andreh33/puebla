/** One-off, production-only publication. Never called by the normal build or seed. */
import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { posts } from "../data/editorial/2026-10-12.mjs";

if (process.env.VERCEL_ENV !== "production") {
  throw new Error("Editorial publication is restricted to the production deployment.");
}
if (posts.length !== 5 || new Set(posts.map((post) => post.slug)).size !== 5) {
  throw new Error("Expected exactly five unique editorial articles.");
}

const db = new PrismaClient();
const digest = (rows) => createHash("sha256").update(JSON.stringify(rows)).digest("hex");
const slugs = posts.map((post) => post.slug);

try {
  const result = await db.$transaction(async (tx) => {
    // Content and metadata of every pre-existing article are verified unchanged.
    const existing = await tx.blogPost.findMany({
      where: { slug: { notIn: slugs } },
      orderBy: { id: "asc" },
    });
    const beforeHash = digest(existing);
    let created = 0;
    for (const post of posts) {
      const present = await tx.blogPost.findUnique({ where: { slug: post.slug } });
      if (present) {
        if (present.title !== post.title || present.contentMd !== post.contentMd) {
          throw new Error(`Existing slug differs from the reviewed source: ${post.slug}`);
        }
        continue;
      }
      await tx.blogPost.create({ data: {
        slug: post.slug,
        title: post.title,
        contentMd: post.contentMd,
        excerpt: post.excerpt,
        tags: post.tags,
        metaTitle: post.metaTitle,
        metaDescription: post.metaDescription,
        author: "Equipo Zona Sport",
        coverImageUrl: `/blog-covers/${post.slug}.svg`,
        status: "PUBLISHED",
        publishedAt: new Date("2026-10-12T18:00:00.000Z"),
      } });
      created += 1;
    }
    const after = await tx.blogPost.findMany({
      where: { slug: { notIn: slugs } },
      orderBy: { id: "asc" },
    });
    if (beforeHash !== digest(after)) throw new Error("Pre-existing articles changed during publication");
    const published = await tx.blogPost.count({
      where: { slug: { in: slugs }, status: "PUBLISHED" },
    });
    if (published !== 5) throw new Error("Expected exactly five published editorial articles");
    return { created, published, preserved: existing.length, existingHash: beforeHash };
  }, { timeout: 30000 });
  console.log("SEO_EDITORIAL_RESULT", JSON.stringify(result));

  // Second pass proves create-only idempotence without writing any row.
  const present = await db.blogPost.findMany({ where: { slug: { in: slugs } } });
  if (posts.some((post) => !present.some((row) => row.slug === post.slug && row.contentMd === post.contentMd))) {
    throw new Error("Editorial source verification failed");
  }
  console.log("SEO_EDITORIAL_SECOND_PASS", JSON.stringify({ wouldCreate: 0, verified: present.length }));
} finally {
  await db.$disconnect();
}
