import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { BrandSchema } from "@/lib/validators";
import { slugifyEs, uniqueSlug } from "@/lib/seo/slug";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const brands = await db.brand.findMany({
    orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, isFeatured: true },
  });
  return NextResponse.json({ brands });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
  }

  // Si solo viene name, generamos slug. Si viene completo, validamos.
  const incoming = {
    name,
    slug: body.slug || slugifyEs(name),
    logoUrl: body.logoUrl ?? null,
    description: body.description ?? null,
    metaTitle: body.metaTitle ?? null,
    metaDescription: body.metaDescription ?? null,
    isFeatured: !!body.isFeatured,
    position: typeof body.position === "number" ? body.position : 0,
  };

  const parsed = BrandSchema.safeParse(incoming);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validación", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Check if already exists
  const existingByName = await db.brand.findUnique({ where: { name: parsed.data.name } });
  if (existingByName) {
    return NextResponse.json({ brand: existingByName }, { status: 200 });
  }

  const finalSlug = await uniqueSlug(parsed.data.slug, async (s) => {
    const f = await db.brand.findUnique({ where: { slug: s }, select: { id: true } });
    return !!f;
  });

  const brand = await db.brand.create({
    data: {
      ...parsed.data,
      slug: finalSlug,
      logoUrl: parsed.data.logoUrl || null,
    },
  });

  return NextResponse.json({ brand }, { status: 201 });
}
