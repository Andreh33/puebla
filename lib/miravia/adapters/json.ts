/**
 * Adaptador JSON para Miravia. Espera un array de items con la forma de
 * MiraviaItem (los campos opcionales pueden faltar) o un objeto con `items`.
 */

import { readFile } from "node:fs/promises";
import type { MiraviaItem, MiraviaProvider, MiraviaItemSize } from "../provider";

export interface MiraviaJsonOptions {
  source: string;
}

async function readSource(source: string): Promise<string> {
  if (/^https?:\/\//i.test(source)) {
    const res = await fetch(source, { redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status} en ${source}`);
    return res.text();
  }
  return readFile(source, "utf-8");
}

function coerce(it: Record<string, unknown>): MiraviaItem | null {
  const externalId = String(it.externalId ?? it.id ?? "").trim();
  const name = String(it.name ?? "").trim();
  const retail = Number(it.retailPrice ?? it.price ?? 0);
  if (!externalId || !name || !Number.isFinite(retail)) return null;

  const sizesRaw = Array.isArray(it.sizes) ? it.sizes : [];
  const sizes: MiraviaItemSize[] = [];
  for (const s of sizesRaw) {
    if (!s || typeof s !== "object") continue;
    const o = s as Record<string, unknown>;
    const size = String(o.size ?? "").trim();
    if (!size) continue;
    sizes.push({
      size,
      ean: o.ean ? String(o.ean) : null,
      stock: Number(o.stock ?? 0) || 0,
    });
  }

  const imageUrls = Array.isArray(it.imageUrls)
    ? it.imageUrls.map((u) => String(u))
    : [];

  return {
    externalId,
    modelCode: it.modelCode ? String(it.modelCode) : undefined,
    name,
    description: it.description ? String(it.description) : undefined,
    brand: String(it.brand ?? "Sin Marca"),
    category: String(it.category ?? "Sin Categoría"),
    colorName: String(it.colorName ?? "Ãšnico"),
    colorHex: it.colorHex ? String(it.colorHex) : undefined,
    gender: it.gender ? String(it.gender) : undefined,
    composition: it.composition ? String(it.composition) : undefined,
    costPrice:
      it.costPrice == null ? null : Number(it.costPrice) || null,
    retailPrice: retail,
    sportUse: it.sportUse ? String(it.sportUse) : undefined,
    sizes,
    imageUrls,
    raw: it,
  };
}

export function createMiraviaJsonProvider(opts: MiraviaJsonOptions): MiraviaProvider {
  return {
    name: `miravia-json:${opts.source}`,
    async *fetchCatalog(): AsyncIterable<MiraviaItem> {
      const text = await readSource(opts.source);
      const parsed = JSON.parse(text);
      const items: unknown[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.items)
          ? parsed.items
          : [];
      for (const raw of items) {
        if (raw && typeof raw === "object") {
          const item = coerce(raw as Record<string, unknown>);
          if (item) yield item;
        }
      }
    },
  };
}
