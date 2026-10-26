"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { BrandSchema } from "@/lib/validators";
import { slugifyEs, uniqueSlug } from "@/lib/seo/slug";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  return session;
}

export async function createBrandAction(input: unknown) {
  await requireSession();
  const parsed = BrandSchema.parse(input);
  const slug = await uniqueSlug(parsed.slug || slugifyEs(parsed.name), async (s) => {
    const f = await db.brand.findUnique({ where: { slug: s }, select: { id: true } });
    return !!f;
  });
  const brand = await db.brand.create({
    data: { ...parsed, slug, logoUrl: parsed.logoUrl || null },
  });
  revalidatePath("/admin/marcas");
  return { ok: true as const, id: brand.id };
}

export async function updateBrandAction(id: string, input: unknown) {
  await requireSession();
  const parsed = BrandSchema.parse(input);
  const existing = await db.brand.findUnique({ where: { id } });
  if (!existing) throw new Error("Marca no encontrada");
  const slug =
    parsed.slug && parsed.slug !== existing.slug
      ? await uniqueSlug(parsed.slug, async (s) => {
          const f = await db.brand.findUnique({ where: { slug: s }, select: { id: true } });
          return !!f && f.id !== id;
        })
      : existing.slug;
  await db.brand.update({
    where: { id },
    data: { ...parsed, slug, logoUrl: parsed.logoUrl || null },
  });
  revalidatePath("/admin/marcas");
  return { ok: true as const };
}

export async function deleteBrandAction(id: string) {
  await requireSession();
  const count = await db.product.count({ where: { brandId: id } });
  if (count > 0) {
    return { ok: false as const, error: `Marca con ${count} producto(s). Reasigna o archiva.` };
  }
  await db.brand.delete({ where: { id } });
  revalidatePath("/admin/marcas");
  return { ok: true as const };
}
