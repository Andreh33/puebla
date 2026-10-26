"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recomputeProductStock } from "@/lib/products/stock";

/**
 * Vista de edición por MODELO (/admin/modelos): agrupa los productos-color del
 * mismo modelo (mismo `modelCode`) en una rejilla colores × tallas para editar
 * stock, precio y coste de todos a la vez — SIN cambiar el modelo de datos
 * ("1 color = 1 producto"). Cada color sigue siendo su Product por debajo.
 */

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  return session;
}

function toNum(d: unknown): number {
  if (d == null) return 0;
  if (typeof d === "number") return Number.isFinite(d) ? d : 0;
  const n = Number(typeof d === "string" ? d : (d as { toString(): string }).toString());
  return Number.isFinite(n) ? n : 0;
}

export type ModelSize = { id: string; size: string; stock: number };
export type ModelColor = {
  productId: string;
  colorName: string;
  colorHex: string | null;
  mainImageUrl: string | null;
  status: string;
  /** Stock total editable directamente cuando el producto no tiene tallas. */
  stock: number;
  retailPrice: number;
  costPrice: number | null;
  sizes: ModelSize[];
};
export type ModelGroup = {
  key: string;
  name: string;
  modelCode: string | null;
  /** Unión ordenada de tallas presentes en cualquier color del modelo. */
  sizeLabels: string[];
  colors: ModelColor[];
};

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Busca productos por nombre/SKU/modelo y los agrupa por modelo. Agrupa por
 * `modelCode`; si un producto no tiene modelCode, queda como modelo individual.
 */
export async function searchModelsAction(term: string): Promise<ActionResult<ModelGroup[]>> {
  try {
    await requireSession();
    const t = term.trim();
    if (t.length < 2) return { ok: true, data: [] };

    const products = await db.product.findMany({
      where: {
        OR: [
          { name: { contains: t, mode: "insensitive" } },
          { sku: { contains: t, mode: "insensitive" } },
          { modelCode: { contains: t, mode: "insensitive" } },
        ],
      },
      take: 300,
      orderBy: [{ modelCode: "asc" }, { colorName: "asc" }],
      select: {
        id: true,
        name: true,
        colorName: true,
        colorHex: true,
        mainImageUrl: true,
        status: true,
        modelCode: true,
        stock: true,
        retailPrice: true,
        costPrice: true,
        sizes: {
          select: { id: true, size: true, stock: true },
          orderBy: { position: "asc" },
        },
      },
    });

    const groups = new Map<string, ModelGroup>();
    for (const p of products) {
      const code = p.modelCode?.trim() || null;
      const key = code ? `m:${code}` : `p:${p.id}`;
      let g = groups.get(key);
      if (!g) {
        g = { key, name: p.name, modelCode: code, sizeLabels: [], colors: [] };
        groups.set(key, g);
      }
      g.colors.push({
        productId: p.id,
        colorName: p.colorName,
        colorHex: p.colorHex,
        mainImageUrl: p.mainImageUrl,
        status: p.status,
        stock: p.stock,
        retailPrice: toNum(p.retailPrice),
        costPrice: p.costPrice == null ? null : toNum(p.costPrice),
        sizes: p.sizes.map((s) => ({ id: s.id, size: s.size, stock: s.stock })),
      });
    }

    // Unión de tallas por modelo, en orden de aparición.
    const result = [...groups.values()].map((g) => {
      const seen = new Set<string>();
      const labels: string[] = [];
      for (const c of g.colors) {
        for (const s of c.sizes) {
          if (!seen.has(s.size)) {
            seen.add(s.size);
            labels.push(s.size);
          }
        }
      }
      return { ...g, sizeLabels: labels };
    });

    // Modelos con más colores primero (los "de verdad" multivariante).
    result.sort((a, b) => b.colors.length - a.colors.length || a.name.localeCompare(b.name, "es"));
    return { ok: true, data: result.slice(0, 40) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error" };
  }
}

export type ModelGridChanges = {
  /** Stock por talla (ProductSize.id → nuevas unidades). */
  stock?: Array<{ sizeId: string; value: number }>;
  /** Stock total de productos sin tallas (Product.id → nuevas unidades). */
  productStock?: Array<{ productId: string; value: number }>;
  /** Precio/coste por producto (color). */
  prices?: Array<{ productId: string; retailPrice?: number; costPrice?: number | null }>;
};

function parseStock(value: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("Stock inválido (entero ≥ 0)");
  }
  if (parsed > 1_000_000) throw new Error("Stock máximo 1 000 000");
  return parsed;
}

/**
 * Guarda los cambios de la rejilla de un modelo: stock por talla + precio/coste
 * por color, en una transacción, y recalcula el stock agregado (y la regla
 * sellout→DRAFT) de cada producto tocado.
 */
export async function saveModelGridAction(
  changes: ModelGridChanges,
): Promise<ActionResult<{ updated: number }>> {
  try {
    await requireSession();
    const stock = changes.stock ?? [];
    const productStock = changes.productStock ?? [];
    const prices = changes.prices ?? [];
    if (!stock.length && !productStock.length && !prices.length) {
      return { ok: true, data: { updated: 0 } };
    }

    const affected = new Set<string>();

    await db.$transaction(async (tx) => {
      // Stock por talla. Validar entero >= 0.
      for (const s of stock) {
        const v = parseStock(s.value);
        const updated = await tx.productSize.update({
          where: { id: s.sizeId },
          data: { stock: v },
          select: { productId: true },
        });
        affected.add(updated.productId);
      }

      // Stock total: solo puede escribirse si el producto sigue sin tallas.
      // El filtro relacional evita desincronizar Product.stock si se añadió una
      // talla entre la búsqueda y el guardado.
      for (const p of productStock) {
        const v = parseStock(p.value);
        const updated = await tx.product.updateMany({
          where: { id: p.productId, sizes: { none: {} } },
          data: { stock: v },
        });
        if (updated.count !== 1) {
          throw new Error(
            "No se pudo actualizar el stock: el producto no existe o ya tiene tallas. Vuelve a buscarlo.",
          );
        }
        affected.add(p.productId);
      }

      // Precio/coste por color (producto).
      for (const p of prices) {
        const data: { retailPrice?: string; costPrice?: string | null } = {};
        if (p.retailPrice != null) {
          const v = Number(p.retailPrice);
          if (Number.isFinite(v) && v >= 0) data.retailPrice = v.toFixed(2);
        }
        if (p.costPrice !== undefined) {
          if (p.costPrice === null) {
            data.costPrice = null;
          } else {
            const v = Number(p.costPrice);
            if (Number.isFinite(v) && v >= 0) data.costPrice = v.toFixed(2);
          }
        }
        if (Object.keys(data).length) {
          await tx.product.update({ where: { id: p.productId }, data });
          affected.add(p.productId);
        }
      }

      // Recalcula el stock agregado de cada producto tocado (sellout→DRAFT).
      for (const productId of affected) {
        await recomputeProductStock(tx, productId);
      }
    });

    return { ok: true, data: { updated: affected.size } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error" };
  }
}
