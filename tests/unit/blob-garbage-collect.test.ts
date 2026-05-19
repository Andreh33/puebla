import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Tests para el GC: comprobamos la lógica de "cross-reference" entre el
 * resultado de `list()` de Vercel Blob y las URLs guardadas en DB.
 *
 * Mockeamos:
 *   - @vercel/blob: list() / del()
 *   - @/lib/db: findMany de cada modelo relevante
 */

// ----- Mocks de módulos -----
const listMock = vi.fn();
const delMock = vi.fn();
vi.mock("@vercel/blob", () => ({
  list: (...args: unknown[]) => listMock(...args),
  del: (...args: unknown[]) => delMock(...args),
}));

const findProductImage = vi.fn();
const findBlogPost = vi.fn();
const findBrand = vi.fn();
const findCategory = vi.fn();
const findProduct = vi.fn();
vi.mock("@/lib/db", () => ({
  db: {
    productImage: { findMany: (...a: unknown[]) => findProductImage(...a) },
    blogPost: { findMany: (...a: unknown[]) => findBlogPost(...a) },
    brand: { findMany: (...a: unknown[]) => findBrand(...a) },
    category: { findMany: (...a: unknown[]) => findCategory(...a) },
    product: { findMany: (...a: unknown[]) => findProduct(...a) },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BLOB_READ_WRITE_TOKEN = "test-token";
  // Setups por defecto: sin referencias
  findProductImage.mockResolvedValue([]);
  findBlogPost.mockResolvedValue([]);
  findBrand.mockResolvedValue([]);
  findCategory.mockResolvedValue([]);
  findProduct.mockResolvedValue([]);
});

describe("blob/garbage-collect", () => {
  it("findOrphanBlobs marca como huérfano lo no referenciado y antiguo", async () => {
    const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 días
    listMock.mockResolvedValueOnce({
      blobs: [
        { url: "https://b/x-large.webp", pathname: "products/a/x-large.webp", uploadedAt: old, size: 1234 },
        { url: "https://b/y-large.webp", pathname: "products/b/y-large.webp", uploadedAt: old, size: 5678 },
      ],
      cursor: null,
      hasMore: false,
    });
    findProductImage.mockResolvedValueOnce([
      { url: "https://b/y-large.webp", urlMedium: null, urlThumb: null, originalUrl: null },
    ]);
    const { findOrphanBlobs } = await import("@/lib/blob/garbage-collect");
    const result = await findOrphanBlobs(7);
    expect(result).toHaveLength(1);
    expect(result[0]?.pathname).toBe("products/a/x-large.webp");
  });

  it("findOrphanBlobs ignora los recientes aunque no estén referenciados", async () => {
    const recent = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 día
    listMock.mockResolvedValueOnce({
      blobs: [
        { url: "https://b/z-large.webp", pathname: "z-large.webp", uploadedAt: recent, size: 1 },
      ],
      cursor: null,
      hasMore: false,
    });
    const { findOrphanBlobs } = await import("@/lib/blob/garbage-collect");
    const result = await findOrphanBlobs(7);
    expect(result).toHaveLength(0);
  });

  it("findOrphanBlobs normaliza query strings al comparar", async () => {
    const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    listMock.mockResolvedValueOnce({
      blobs: [
        { url: "https://b/y-large.webp", pathname: "y-large.webp", uploadedAt: old, size: 1 },
      ],
      cursor: null,
      hasMore: false,
    });
    // En DB el URL guardado puede traer un querystring de versión
    findBrand.mockResolvedValueOnce([{ logoUrl: "https://b/y-large.webp?v=2" }]);
    const { findOrphanBlobs } = await import("@/lib/blob/garbage-collect");
    const result = await findOrphanBlobs(7);
    expect(result).toHaveLength(0);
  });

  it("findOrphanBlobs pagina con cursor", async () => {
    const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    listMock
      .mockResolvedValueOnce({
        blobs: [{ url: "https://b/a.webp", pathname: "a.webp", uploadedAt: old, size: 1 }],
        cursor: "page2",
        hasMore: true,
      })
      .mockResolvedValueOnce({
        blobs: [{ url: "https://b/b.webp", pathname: "b.webp", uploadedAt: old, size: 2 }],
        cursor: null,
        hasMore: false,
      });
    const { findOrphanBlobs } = await import("@/lib/blob/garbage-collect");
    const result = await findOrphanBlobs(7);
    expect(result).toHaveLength(2);
    expect(listMock).toHaveBeenCalledTimes(2);
  });

  it("purgeOrphans agrupa en batches y devuelve contadores", async () => {
    delMock.mockResolvedValue(undefined);
    const urls = Array.from({ length: 120 }, (_, i) => `https://b/${i}.webp`);
    const { purgeOrphans } = await import("@/lib/blob/garbage-collect");
    const r = await purgeOrphans(urls);
    expect(r.deleted).toBe(120);
    expect(r.errors).toBe(0);
    // 120 items / batch 50 → 3 llamadas a del
    expect(delMock).toHaveBeenCalledTimes(3);
  });

  it("purgeOrphans contabiliza errores por batch sin fallar el total", async () => {
    delMock.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(undefined);
    const urls = Array.from({ length: 60 }, (_, i) => `https://b/${i}.webp`);
    const { purgeOrphans } = await import("@/lib/blob/garbage-collect");
    const r = await purgeOrphans(urls);
    expect(r.errors).toBe(50);
    expect(r.deleted).toBe(10);
  });
});
