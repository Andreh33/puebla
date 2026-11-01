"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { BlogPostSchema } from "@/lib/validators";
import { slugifyEs, uniqueSlug } from "@/lib/seo/slug";

type ActionResult =
  | { ok: true; id: string; slug: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("No autorizado");
  }
  return session.user;
}

function normalize(input: unknown) {
  // react-hook-form puede mandar strings vacíos para campos opcionales y
  // publishedAt como string ISO. Hacemos coerción aquí.
  const v = input as Record<string, unknown>;
  const publishedAt =
    v.publishedAt instanceof Date
      ? v.publishedAt
      : typeof v.publishedAt === "string" && v.publishedAt
        ? new Date(v.publishedAt)
        : null;
  return {
    ...v,
    publishedAt,
    coverImageUrl: v.coverImageUrl || null,
    ogImageUrl: v.ogImageUrl || null,
    excerpt: v.excerpt || null,
    metaTitle: v.metaTitle || null,
    metaDescription: v.metaDescription || null,
    tags: Array.isArray(v.tags) ? v.tags.filter(Boolean) : [],
  };
}

export async function createPost(raw: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = BlogPostSchema.safeParse(normalize(raw));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const data = parsed.data;

  // Asegurar slug único
  const slug = await uniqueSlug(slugifyEs(data.slug || data.title), async (s) => {
    const existing = await db.blogPost.findUnique({ where: { slug: s }, select: { id: true } });
    return !!existing;
  });

  const now = new Date();
  const publishedAt =
    data.status === "PUBLISHED" ? (data.publishedAt ?? now) : (data.publishedAt ?? null);

  const post = await db.blogPost.create({
    data: {
      title: data.title,
      slug,
      excerpt: data.excerpt ?? null,
      contentMd: data.contentMd,
      coverImageUrl: data.coverImageUrl || null,
      ogImageUrl: data.ogImageUrl || null,
      author: data.author,
      tags: data.tags,
      status: data.status,
      metaTitle: data.metaTitle ?? null,
      metaDescription: data.metaDescription ?? null,
      publishedAt,
    },
  });

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  if (post.status === "PUBLISHED") revalidatePath(`/blog/${post.slug}`);

  return { ok: true, id: post.id, slug: post.slug };
}

export async function updatePost(id: string, raw: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = BlogPostSchema.safeParse(normalize(raw));
  if (!parsed.success) {
    return {
      ok: false,
      error: "Datos inválidos",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const data = parsed.data;

  const current = await db.blogPost.findUnique({ where: { id } });
  if (!current) {
    return { ok: false, error: "El post no existe" };
  }

  // Slug puede cambiar; aseguramos unicidad excluyendo el propio id
  let nextSlug = slugifyEs(data.slug || data.title);
  if (nextSlug !== current.slug) {
    nextSlug = await uniqueSlug(nextSlug, async (s) => {
      const existing = await db.blogPost.findUnique({ where: { slug: s }, select: { id: true } });
      return !!existing && existing.id !== id;
    });
  }

  // publishedAt: se asigna automáticamente al pasar a PUBLISHED por primera vez
  let publishedAt = data.publishedAt ?? current.publishedAt;
  if (data.status === "PUBLISHED" && !publishedAt) publishedAt = new Date();
  if (data.status === "DRAFT") {
    // Conservamos publishedAt si ya existía, pero si el usuario lo borró, lo respetamos
    publishedAt = data.publishedAt ?? current.publishedAt;
  }

  const post = await db.blogPost.update({
    where: { id },
    data: {
      title: data.title,
      slug: nextSlug,
      excerpt: data.excerpt ?? null,
      contentMd: data.contentMd,
      coverImageUrl: data.coverImageUrl || null,
      ogImageUrl: data.ogImageUrl || null,
      author: data.author,
      tags: data.tags,
      status: data.status,
      metaTitle: data.metaTitle ?? null,
      metaDescription: data.metaDescription ?? null,
      publishedAt,
    },
  });

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/${current.slug}`);
  if (nextSlug !== current.slug) revalidatePath(`/blog/${nextSlug}`);

  return { ok: true, id: post.id, slug: post.slug };
}

export async function duplicatePost(id: string): Promise<ActionResult> {
  await requireAdmin();
  const src = await db.blogPost.findUnique({ where: { id } });
  if (!src) return { ok: false, error: "El post original no existe" };

  const baseSlug = slugifyEs(`${src.slug}-copia`);
  const slug = await uniqueSlug(baseSlug, async (s) => {
    const existing = await db.blogPost.findUnique({ where: { slug: s }, select: { id: true } });
    return !!existing;
  });

  const post = await db.blogPost.create({
    data: {
      title: `${src.title} (copia)`,
      slug,
      excerpt: src.excerpt,
      contentMd: src.contentMd,
      coverImageUrl: src.coverImageUrl,
      ogImageUrl: src.ogImageUrl,
      author: src.author,
      tags: src.tags,
      status: "DRAFT",
      metaTitle: src.metaTitle,
      metaDescription: src.metaDescription,
      publishedAt: null,
    },
  });

  revalidatePath("/admin/blog");
  return { ok: true, id: post.id, slug: post.slug };
}

export async function archivePost(id: string): Promise<ActionResult> {
  await requireAdmin();
  const post = await db.blogPost.update({
    where: { id },
    data: { status: "DRAFT" },
  });
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/${post.slug}`);
  return { ok: true, id: post.id, slug: post.slug };
}

export async function deletePost(id: string): Promise<ActionResult> {
  await requireAdmin();
  const post = await db.blogPost.findUnique({ where: { id }, select: { slug: true } });
  if (!post) return { ok: false, error: "El post no existe" };
  await db.blogPost.delete({ where: { id } });
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/${post.slug}`);
  return { ok: true, id, slug: post.slug };
}

export async function createPostAndRedirect(raw: unknown): Promise<void> {
  const res = await createPost(raw);
  if (res.ok) {
    redirect(`/admin/blog/${res.id}`);
  }
  throw new Error(res.error);
}
