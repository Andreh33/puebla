import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * GET /api/blog/slug-check?slug=mi-slug&exclude=cuid
 * Devuelve { available: boolean }.
 * Solo accesible para administradores autenticados.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ available: false, error: "unauthenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const slug = (searchParams.get("slug") ?? "").trim().toLowerCase();
  const exclude = searchParams.get("exclude") ?? undefined;

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ available: false, error: "invalid" }, { status: 400 });
  }

  try {
    const existing = await db.blogPost.findUnique({
      where: { slug },
      select: { id: true },
    });
    const available = !existing || existing.id === exclude;
    return NextResponse.json({ available });
  } catch {
    return NextResponse.json({ available: false, error: "db" }, { status: 500 });
  }
}
