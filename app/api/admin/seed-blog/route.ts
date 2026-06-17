/**
 * POST /api/admin/seed-blog
 *
 * Upserta los 40 posts de `lib/seed/blog-posts-extra.ts` en la tabla BlogPost,
 * en estado PUBLISHED. Idempotente: upsert por `slug`, así que correrlo N veces
 * deja la BD igual al módulo de datos (refina textos al re-ejecutar).
 *
 * Las portadas SVG (`/blog-covers/<slug>.svg`) son ficheros estáticos en
 * /public; este endpoint solo fija las URLs en la BD.
 *
 * Auth: Header `Authorization: Bearer ${SETUP_TOKEN}` (igual que import-woo).
 *
 * Devuelve `{ ok, upserted }`.
 */
import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { BLOG_POSTS_EXTRA } from "@/lib/seed/blog-posts-extra";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function checkAuth(req: NextRequest): NextResponse | null {
  const expected = process.env.SETUP_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "SETUP_TOKEN no configurado en este entorno" },
      { status: 503 },
    );
  }
  const header = req.headers.get("authorization") ?? "";
  const got = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (got !== expected) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  return null;
}

function coverUrl(slug: string): string {
  return `/blog-covers/${slug}.svg`;
}

export async function POST(req: NextRequest) {
  const unauthorized = checkAuth(req);
  if (unauthorized) return unauthorized;

  let upserted = 0;
  const now = new Date();

  for (const post of BLOG_POSTS_EXTRA) {
    const cover = coverUrl(post.slug);
    // Campos comunes a create/update (excepto publishedAt, que NO se pisa en
    // update para respetar un orden manual editado desde /admin).
    const common = {
      title: post.title,
      excerpt: post.excerpt,
      contentMd: post.contentMd,
      coverImageUrl: cover,
      ogImageUrl: cover,
      author: post.author,
      tags: post.tags,
      status: "PUBLISHED" as const,
      metaTitle: post.metaTitle,
      metaDescription: post.metaDescription,
    };

    await db.blogPost.upsert({
      where: { slug: post.slug },
      update: common,
      create: {
        slug: post.slug,
        ...common,
        publishedAt: now,
      },
    });
    upserted += 1;
  }

  // Refresca la web pública (índice de blog y fichas) para que aparezcan ya.
  revalidatePath("/", "layout");

  return NextResponse.json({ ok: true, upserted });
}
