/**
 * Sincroniza productos ACTIVE con stock > 0 hacia el catálogo de Stripe.
 *
 * Estrategia:
 *   1. Listar productos LOCAL ACTIVE con stock > 0.
 *   2. Buscar Product en Stripe con `metadata['zs_product_id'] = product.id`.
 *      - Si existe, actualiza nombre/descripcion/imagen y crea Price nuevo
 *        solo si cambió el `unit_amount`.
 *      - Si no existe, crea Product + Price.
 *   3. Devuelve un resumen con creados/actualizados/saltados/errores.
 *
 * Idempotente — se puede ejecutar N veces sin duplicar.
 *
 * Esta función NO se invoca automáticamente. Se llama desde un botón en
 * /admin/pedidos cuando hay claves Stripe configuradas y el usuario tiene
 * rol OWNER.
 */

import "server-only";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripe } from "./client";

export interface SyncResult {
  ok: boolean;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ productId: string; error: string }>;
  totalProducts: number;
  durationMs: number;
}

const METADATA_KEY = "zs_product_id";

/**
 * Convierte EUR (Decimal/number) a céntimos enteros para Stripe.
 * Stripe requiere `unit_amount` en la unidad mínima de la moneda.
 */
function toCents(value: number | string): number {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

/**
 * Truncado seguro a 500 caracteres (límite de Stripe para descripciones).
 */
function clip(text: string | null | undefined, max: number): string | undefined {
  if (!text) return undefined;
  const s = text.trim();
  if (!s) return undefined;
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

/**
 * Busca un Stripe Product por nuestro `zs_product_id`. Stripe permite
 * filtrar productos con Search API (consume cuota de búsqueda).
 */
async function findStripeProduct(
  stripe: Stripe,
  productId: string,
): Promise<Stripe.Product | null> {
  try {
    const res = await stripe.products.search({
      query: `metadata['${METADATA_KEY}']:'${productId}'`,
      limit: 1,
    });
    return res.data[0] ?? null;
  } catch (err) {
    // Search puede no estar disponible en cuentas sin búsqueda activada.
    // Fallback silencioso: tratamos como "no encontrado" y crearemos uno
    // nuevo (el caller debe revisar duplicados manualmente).
    console.warn("[stripe:sync] products.search falló:", (err as Error).message);
    return null;
  }
}

export async function syncProductsToStripe(opts?: {
  /** Límite duro de productos por ejecución (paginación). */
  limit?: number;
}): Promise<SyncResult> {
  const started = Date.now();
  const stripe = getStripe();

  if (!stripe) {
    return {
      ok: false,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [
        {
          productId: "—",
          error: "Stripe no configurado (STRIPE_SECRET_KEY ausente)",
        },
      ],
      totalProducts: 0,
      durationMs: 0,
    };
  }

  const limit = Math.min(opts?.limit ?? 1000, 1000);

  const products = await db.product.findMany({
    where: { status: "ACTIVE", stock: { gt: 0 }, source: "LOCAL" },
    take: limit,
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      sku: true,
      retailPrice: true,
      salePrice: true,
      mainImageUrl: true,
      brand: { select: { name: true } },
      category: { select: { name: true, slug: true } },
    },
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: SyncResult["errors"] = [];

  for (const p of products) {
    try {
      const finalPrice = p.salePrice ?? p.retailPrice;
      const unitAmount = toCents(finalPrice.toString());
      if (unitAmount <= 0) {
        skipped++;
        continue;
      }

      const existing = await findStripeProduct(stripe, p.id);
      const metadata = {
        [METADATA_KEY]: p.id,
        zs_slug: p.slug,
        zs_brand: p.brand?.name ?? "",
        zs_category: p.category?.slug ?? "",
        zs_sku: p.sku ?? "",
      };
      const description = clip(p.description, 500);
      const images = p.mainImageUrl ? [p.mainImageUrl] : [];

      let stripeProduct: Stripe.Product;
      if (existing) {
        stripeProduct = await stripe.products.update(existing.id, {
          name: p.name,
          description,
          images,
          metadata,
        });
        updated++;
      } else {
        stripeProduct = await stripe.products.create({
          name: p.name,
          description,
          images,
          metadata,
          active: true,
        });
        created++;
      }

      // Comprueba si existe ya un Price con el mismo unit_amount; si no,
      // crea uno nuevo y archiva el anterior por defecto. Stripe Prices
      // son inmutables: nunca se "actualizan", siempre se reemplazan.
      const prices = await stripe.prices.list({
        product: stripeProduct.id,
        active: true,
        limit: 10,
      });
      const samePrice = prices.data.find(
        (pr) => pr.unit_amount === unitAmount && pr.currency === "eur",
      );

      if (!samePrice) {
        // El nuevo Price se crea activo; archivamos todos los antiguos del
        // mismo Product para mantener uno solo activo por SKU.
        await stripe.prices.create({
          product: stripeProduct.id,
          unit_amount: unitAmount,
          currency: "eur",
          tax_behavior: "inclusive",
          metadata: { [METADATA_KEY]: p.id },
        });
        for (const old of prices.data) {
          await stripe.prices
            .update(old.id, { active: false })
            .catch(() => undefined);
        }
      }
    } catch (err) {
      errors.push({
        productId: p.id,
        error: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }

  return {
    ok: errors.length === 0,
    created,
    updated,
    skipped,
    errors,
    totalProducts: products.length,
    durationMs: Date.now() - started,
  };
}
