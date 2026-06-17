"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CategorySchema } from "@/lib/validators";
import { slugifyEs, uniqueSlug } from "@/lib/seo/slug";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  return session;
}

export async function createCategoryAction(input: unknown) {
  await requireSession();
  const parsed = CategorySchema.parse(input);
  const slug = await uniqueSlug(parsed.slug || slugifyEs(parsed.name), async (s) => {
    const f = await db.category.findUnique({ where: { slug: s }, select: { id: true } });
    return !!f;
  });
  const cat = await db.category.create({
    data: { ...parsed, slug, imageUrl: parsed.imageUrl || null, parentId: parsed.parentId || null },
  });
  revalidatePath("/admin/categorias");
  return { ok: true as const, id: cat.id };
}

export async function updateCategoryAction(id: string, input: unknown) {
  await requireSession();
  const parsed = CategorySchema.parse(input);
  const existing = await db.category.findUnique({ where: { id } });
  if (!existing) throw new Error("Categoría no encontrada");
  // Prevent cycles
  if (parsed.parentId === id) throw new Error("Una categoría no puede ser hija de sí misma");
  if (parsed.parentId) {
    const descendant = await isDescendant(id, parsed.parentId);
    if (descendant) throw new Error("Movimiento crearía un ciclo");
  }
  const slug =
    parsed.slug && parsed.slug !== existing.slug
      ? await uniqueSlug(parsed.slug, async (s) => {
          const f = await db.category.findUnique({ where: { slug: s }, select: { id: true } });
          return !!f && f.id !== id;
        })
      : existing.slug;
  await db.category.update({
    where: { id },
    data: {
      ...parsed,
      slug,
      imageUrl: parsed.imageUrl || null,
      parentId: parsed.parentId || null,
    },
  });
  revalidatePath("/admin/categorias");
  return { ok: true as const };
}

async function isDescendant(rootId: string, candidateId: string): Promise<boolean> {
  // Returns true if candidateId is a descendant of rootId (i.e. moving rootId beneath candidateId would create a cycle)
  let cur: string | null = candidateId;
  let depth = 0;
  while (cur && depth < 50) {
    const node: { parentId: string | null } | null = await db.category.findUnique({
      where: { id: cur },
      select: { parentId: true },
    });
    if (!node) return false;
    if (node.parentId === rootId) return true;
    cur = node.parentId;
    depth += 1;
  }
  return false;
}

export async function deleteCategoryAction(id: string) {
  await requireSession();
  const [prodCount, childCount] = await Promise.all([
    db.product.count({ where: { categoryId: id } }),
    db.category.count({ where: { parentId: id } }),
  ]);
  if (prodCount > 0 || childCount > 0) {
    return {
      ok: false as const,
      error: `No se puede eliminar: ${prodCount} producto(s) y ${childCount} subcategoría(s).`,
    };
  }
  await db.category.delete({ where: { id } });
  revalidatePath("/admin/categorias");
  return { ok: true as const };
}

export async function reorderCategories(updates: Array<{ id: string; parentId: string | null; position: number }>) {
  await requireSession();
  // Validación anti-ciclo: una server action es invocable directamente, no solo
  // desde el drag&drop de hermanos de la UI. Rechazamos auto-parent y mover una
  // categoría bajo uno de sus descendientes (crearía un ciclo que deja ramas
  // huérfanas/invisibles en el árbol y bucles en las queries recursivas).
  for (const u of updates) {
    if (u.parentId === u.id) {
      throw new Error("Una categoría no puede ser hija de sí misma.");
    }
    if (u.parentId && (await isDescendant(u.id, u.parentId))) {
      throw new Error("El reordenamiento crearía un ciclo en el árbol de categorías.");
    }
  }
  await db.$transaction(
    updates.map((u) =>
      db.category.update({
        where: { id: u.id },
        data: { parentId: u.parentId, position: u.position },
      }),
    ),
  );
  revalidatePath("/admin/categorias");
  return { ok: true as const };
}
