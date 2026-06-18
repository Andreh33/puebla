/**
 * Tests de `processGroup` (importador WooCommerce) centrados en el respeto de
 * `isCustomized`: cuando el cliente ha corregido categorías/tipos a mano por SKU
 * (isCustomized=true), un re-import NO debe pisar esa clasificación manual, pero
 * SÍ debe seguir refrescando el inventario/precios del feed.
 *
 * No toca BD real: se inyecta un `tx` (TransactionClient) y un `TaxonomyCache`
 * simulados que registran las llamadas, y se inspecciona qué se escribió.
 */
import { describe, it, expect, vi } from "vitest";
import { Decimal } from "decimal.js";
import {
  processGroup,
  TaxonomyCache,
} from "@/lib/importer/process-woocommerce-job";
import type {
  WooNormalizedParent,
  WooProductGroup,
} from "@/lib/importer/woocommerce";

// ---------------------------------------------------------------------------
// Builders de fixtures
// ---------------------------------------------------------------------------

function makeParent(over: Partial<WooNormalizedParent> = {}): WooNormalizedParent {
  return {
    rowNumber: 2,
    wooId: "1001",
    sku: "4021",
    rawName: "ZAPATILLA RUNNING JOMA ROJO",
    name: "ZAPATILLA RUNNING JOMA ROJO",
    shortName: null,
    description: null,
    shortDescription: null,
    brand: "Joma",
    category: "Calzado",
    slugSeed: "zapatilla-running-joma-rojo",
    modelCode: "4021",
    colorName: "Rojo",
    gender: "HOMBRE",
    retailPrice: new Decimal("59.95"),
    salePrice: null,
    costPrice: new Decimal("30.00"),
    weight: null,
    tags: [],
    mainImageUrl: null,
    extraImageUrls: [],
    status: "ACTIVE",
    externalId: "woocommerce:1001",
    isSimple: true,
    stock: 7,
    ...over,
  };
}

function makeGroup(over: Partial<WooNormalizedParent> = {}): WooProductGroup {
  return { parent: makeParent(over), variations: [] };
}

/**
 * `TaxonomyCache` simulado: devuelve ids deterministas y resuelve TODOS los
 * slugs del árbol a `<slug>-id` para que el m2m tenga algo que enlazar.
 */
function makeTaxonomy(): TaxonomyCache {
  const stub = {
    getBrandId: vi.fn(async () => "brand-id"),
    getCategoryId: vi.fn(async () => "legacy-cat-id"),
    resolveTreeSlugs: vi.fn(async (_tx: unknown, slugs: string[]) => {
      const m = new Map<string, string>();
      for (const s of slugs) m.set(s, `${s}-id`);
      return m;
    }),
  };
  return stub as unknown as TaxonomyCache;
}

/**
 * `tx` simulado: registra llamadas a las tablas que `processGroup` toca. Devuelve
 * `existing` configurable desde `product.findUnique`.
 */
function makeTx(existing: Record<string, unknown> | null) {
  const productUpdate = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
    id: "prod-id",
    name: (data.name as string) ?? "ZAPATILLA RUNNING JOMA ROJO",
    retailPrice: new Decimal("59.95"),
    status: "ACTIVE",
  }));
  const pcDeleteMany = vi.fn(async () => ({ count: 0 }));
  const pcCreateMany = vi.fn(async () => ({ count: 0 }));
  const sizeUpsert = vi.fn(async () => ({}));

  const tx = {
    product: {
      findUnique: vi.fn(async () => existing),
      create: vi.fn(async () => ({ id: "prod-id" })),
      update: productUpdate,
    },
    productCategory: {
      deleteMany: pcDeleteMany,
      createMany: pcCreateMany,
    },
    productSize: { upsert: sizeUpsert },
    productAudit: { create: vi.fn(async () => ({})) },
  };

  return { tx, productUpdate, pcDeleteMany, pcCreateMany, sizeUpsert };
}

const OPTS = { mode: "create_update" as const, defaultStatus: "ACTIVE" as const };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("processGroup · isCustomized protege categorías/tipos", () => {
  it("isCustomized=true: NO reescribe categorías/primary/footwearType ni el m2m", async () => {
    const existing = {
      id: "prod-id",
      name: "Nombre puesto a mano",
      retailPrice: new Decimal("59.95"),
      status: "ACTIVE",
      isCustomized: true,
    };
    const { tx, productUpdate, pcDeleteMany, pcCreateMany } = makeTx(existing);

    const res = await processGroup(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tx as any,
      makeTaxonomy(),
      makeGroup(),
      OPTS,
    );

    expect(res.updated).toBe(true);
    expect(productUpdate).toHaveBeenCalledTimes(1);
    const data = productUpdate.mock.calls[0]![0].data;

    // Categorías / tipos NO se tocan
    expect(data).not.toHaveProperty("category");
    expect(data).not.toHaveProperty("primaryCategory");
    expect(data).not.toHaveProperty("footwearType");
    expect(data).not.toHaveProperty("garmentType");
    expect(data).not.toHaveProperty("garmentVariant");
    // Nombre/precios tampoco (también protegidos por isCustomized)
    expect(data).not.toHaveProperty("name");
    expect(data).not.toHaveProperty("retailPrice");
    expect(data).not.toHaveProperty("salePrice");

    // El m2m NO se reemplaza
    expect(pcDeleteMany).not.toHaveBeenCalled();
    expect(pcCreateMany).not.toHaveBeenCalled();
  });

  it("isCustomized=true: SÍ refresca stock/precio-coste/tags/status del feed", async () => {
    const existing = {
      id: "prod-id",
      name: "Nombre puesto a mano",
      retailPrice: new Decimal("59.95"),
      status: "DRAFT",
      isCustomized: true,
    };
    const { tx, productUpdate } = makeTx(existing);

    await processGroup(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tx as any,
      makeTaxonomy(),
      makeGroup({ stock: 42, costPrice: new Decimal("33.00"), tags: ["promo"], status: "ACTIVE" }),
      OPTS,
    );

    const data = productUpdate.mock.calls[0]![0].data;
    // Inventario y demás campos NO-manuales sí se actualizan
    expect(data.stock).toBe(42);
    expect(data).toHaveProperty("costPrice");
    expect(data).toHaveProperty("tags");
    expect(data).toHaveProperty("status");
    expect(data).toHaveProperty("brand"); // la marca viene del feed, no es edición manual
  });

  it("isCustomized=false: SÍ reescribe categorías/tipos y reemplaza el m2m (comportamiento intacto)", async () => {
    const existing = {
      id: "prod-id",
      name: "ZAPATILLA RUNNING JOMA ROJO",
      retailPrice: new Decimal("59.95"),
      status: "ACTIVE",
      isCustomized: false,
    };
    const { tx, productUpdate, pcDeleteMany, pcCreateMany } = makeTx(existing);

    await processGroup(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tx as any,
      makeTaxonomy(),
      makeGroup(),
      OPTS,
    );

    const data = productUpdate.mock.calls[0]![0].data;
    // Clasificación automática completa
    expect(data).toHaveProperty("category");
    expect(data).toHaveProperty("primaryCategory");
    expect(data).toHaveProperty("footwearType");
    expect(data).toHaveProperty("name");
    expect(data).toHaveProperty("retailPrice");

    // El m2m se reemplaza (running hombre → hay slugs que enlazar)
    expect(pcDeleteMany).toHaveBeenCalledTimes(1);
    expect(pcCreateMany).toHaveBeenCalledTimes(1);
  });

  it("producto nuevo (sin existing): crea y enlaza m2m con normalidad", async () => {
    const { tx, pcDeleteMany, pcCreateMany } = makeTx(null);

    const res = await processGroup(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tx as any,
      makeTaxonomy(),
      makeGroup(),
      OPTS,
    );

    expect(res.created).toBe(true);
    expect(tx.product.create).toHaveBeenCalledTimes(1);
    // Para un producto nuevo el m2m sí se crea (no hay edición manual previa)
    expect(pcDeleteMany).toHaveBeenCalledTimes(1);
    expect(pcCreateMany).toHaveBeenCalledTimes(1);
  });
});
