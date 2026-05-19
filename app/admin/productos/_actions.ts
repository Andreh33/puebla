"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ProductSchema, ProductSizeSchema } from "@/lib/validators";
import {
  archiveProduct,
  bulkAddTags,
  bulkDelete,
  bulkSetCategory,
  bulkSetStatus,
  createProduct,
  deleteProduct,
  duplicateProduct,
  updateProduct,
  type ProductInput,
  type ProductSizeInput,
} from "@/lib/products/mutations";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  return session;
}

export interface ProductFormPayload {
  product: ProductInput;
  sizes?: ProductSizeInput[];
  // Imágenes: gestionadas en endpoints aparte (uploads). Aquí solo si vienen ya creadas.
  mainImageUrl?: string | null;
}

export async function createProductAction(payload: ProductFormPayload) {
  const session = await requireSession();
  const parsed = ProductSchema.parse(payload.product);
  const sizes = payload.sizes ? payload.sizes.map((s) => ProductSizeSchema.parse(s)) : [];
  const product = await createProduct(parsed, sizes, session.user.id);
  revalidatePath("/admin/productos");
  return { ok: true as const, id: product.id, slug: product.slug };
}

export async function createProductAndRedirect(payload: ProductFormPayload) {
  const res = await createProductAction(payload);
  redirect(`/admin/productos/${res.id}`);
}

export async function updateProductAction(id: string, payload: ProductFormPayload) {
  const session = await requireSession();
  const parsed = ProductSchema.parse(payload.product);
  const sizes = payload.sizes ? payload.sizes.map((s) => ProductSizeSchema.parse(s)) : undefined;
  const product = await updateProduct(id, parsed, sizes, session.user.id);
  revalidatePath("/admin/productos");
  revalidatePath(`/admin/productos/${id}`);
  revalidatePath(`/producto/${product.slug}`);
  return { ok: true as const, slug: product.slug };
}

export async function duplicateProductAction(id: string) {
  const session = await requireSession();
  const created = await duplicateProduct(id, session.user.id);
  revalidatePath("/admin/productos");
  return { ok: true as const, id: created.id };
}

export async function archiveProductAction(id: string) {
  const session = await requireSession();
  await archiveProduct(id, session.user.id);
  revalidatePath("/admin/productos");
  return { ok: true as const };
}

export async function deleteProductAction(id: string) {
  const session = await requireSession();
  await deleteProduct(id, session.user.id);
  revalidatePath("/admin/productos");
  return { ok: true as const };
}

export type BulkActionType =
  | { kind: "publish" }
  | { kind: "unpublish" }
  | { kind: "archive" }
  | { kind: "delete" }
  | { kind: "category"; categoryId: string }
  | { kind: "addTags"; tags: string[] };

export async function bulkAction(ids: string[], action: BulkActionType) {
  const session = await requireSession();
  if (!ids.length) return { ok: false as const, error: "Nada seleccionado" };

  let count = 0;
  switch (action.kind) {
    case "publish":
      count = await bulkSetStatus(ids, "ACTIVE", session.user.id);
      break;
    case "unpublish":
      count = await bulkSetStatus(ids, "DRAFT", session.user.id);
      break;
    case "archive":
      count = await bulkSetStatus(ids, "INACTIVE", session.user.id);
      break;
    case "delete":
      count = await bulkDelete(ids, session.user.id);
      break;
    case "category":
      count = await bulkSetCategory(ids, action.categoryId, session.user.id);
      break;
    case "addTags":
      count = await bulkAddTags(ids, action.tags, session.user.id);
      break;
  }
  revalidatePath("/admin/productos");
  return { ok: true as const, count };
}

