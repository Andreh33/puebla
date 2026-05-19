import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock del módulo `@/lib/db` antes de importar lib/search.
const queryRaw = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    $queryRaw: (...args: unknown[]) => queryRaw(...args),
  },
}));

import { searchProducts, searchPosts, searchAll } from "@/lib/search";

beforeEach(() => {
  queryRaw.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("searchProducts", () => {
  it("devuelve vacío si la query es demasiado corta", async () => {
    const r = await searchProducts("a");
    expect(r).toEqual([]);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("devuelve resultados FTS cuando los hay", async () => {
    queryRaw.mockResolvedValueOnce([
      {
        id: "1",
        slug: "zapatilla-x",
        name: "Zapatilla X",
        mainImageUrl: null,
        retailPrice: "59.99",
        rank: 0.4,
      },
    ]);
    const r = await searchProducts("zapatilla running");
    expect(queryRaw).toHaveBeenCalledTimes(1); // no llega al fallback
    expect(r).toHaveLength(1);
    expect(r[0]!.retailPrice).toBe(59.99);
  });

  it("hace fallback a pg_trgm cuando tsquery devuelve vacío", async () => {
    queryRaw
      .mockResolvedValueOnce([]) // FTS vacío
      .mockResolvedValueOnce([
        {
          id: "2",
          slug: "zapatos-trekking",
          name: "Zapatos Trekking",
          mainImageUrl: null,
          retailPrice: "120.00",
          sim: 0.45,
        },
      ]);
    const r = await searchProducts("zapato trecking"); // errata intencionada
    expect(queryRaw).toHaveBeenCalledTimes(2);
    expect(r).toHaveLength(1);
    expect(r[0]!.slug).toBe("zapatos-trekking");
  });

  it("filtra fallback por umbral de similitud", async () => {
    queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "1", slug: "x", name: "X", mainImageUrl: null, retailPrice: "10.00", sim: 0.05 },
      ]);
    const r = await searchProducts("xxxxxx");
    expect(r).toEqual([]);
  });
});

describe("searchPosts", () => {
  it("usa FTS y normaliza la query", async () => {
    queryRaw.mockResolvedValueOnce([
      {
        id: "p1",
        slug: "guia-padel",
        title: "Guía pádel",
        excerpt: null,
        coverImageUrl: null,
        rank: 0.3,
      },
    ]);
    const r = await searchPosts("   padel ");
    expect(r).toHaveLength(1);
    expect(r[0]!.slug).toBe("guia-padel");
  });
});

describe("searchAll", () => {
  it("agrega resultados de productos y posts", async () => {
    queryRaw
      .mockResolvedValueOnce([
        { id: "1", slug: "a", name: "A", mainImageUrl: null, retailPrice: "10.00", rank: 0.2 },
      ])
      .mockResolvedValueOnce([
        { id: "p", slug: "post", title: "Post", excerpt: null, coverImageUrl: null, rank: 0.2 },
      ]);
    const r = await searchAll("padel");
    expect(r.totalCount).toBe(2);
    expect(r.products).toHaveLength(1);
    expect(r.posts).toHaveLength(1);
  });

  it("devuelve estructura vacía con query corta", async () => {
    const r = await searchAll("a");
    expect(r.totalCount).toBe(0);
  });
});
