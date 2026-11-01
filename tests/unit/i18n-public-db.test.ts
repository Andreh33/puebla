import { beforeEach, describe, expect, it, vi } from "vitest";
const { findMany, findUnique } = vi.hoisted(() => ({ findMany: vi.fn(), findUnique: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: { product: { findMany, findUnique, fields: { retailPrice: { ref: "retailPrice" } } } },
}));
vi.mock("@/lib/i18n/content", () => ({
  localizeContent: (_kind: string, locale: string, source: Record<string, unknown>) =>
    source.slug === "missing" && locale !== "es"
      ? null
      : { ...source, name: locale === "es" ? source.name : `${locale}:${source.name}` },
  availableContentLocales: () => ["es", "fr", "de"],
  editorialPost: () => null,
  loadEditorialPosts: () => [],
}));
import { publicDatabase, localesForContent } from "@/lib/i18n/public-db";
beforeEach(() => vi.clearAllMocks());
describe("public translation read view", () => {
  it("keeps concurrent locale queries independent and never changes commerce values", async () => {
    const source = { id: "p", slug: "shoe", name: "Zapatilla", retailPrice: 49.5, stock: 3 };
    findUnique.mockImplementation(async () => {
      await Promise.resolve();
      return source;
    });
    const [fr, de] = await Promise.all([
      publicDatabase("fr").product.findUnique({ where: { slug: "shoe" } }),
      publicDatabase("de").product.findUnique({ where: { slug: "shoe" } }),
    ]);
    expect(fr?.name).toBe("Zapatilla");
    expect(de?.name).toBe("Zapatilla");
    expect(fr?.retailPrice).toBe(49.5);
    expect(de?.stock).toBe(3);
    expect(source.name).toBe("Zapatilla");
    expect(localesForContent(fr!)).toEqual(["es"]);
  });
  it("requests hash fields internally but returns only requested selected fields", async () => {
    findMany.mockResolvedValue([
      { id: "p", slug: "shoe", name: "Zapatilla", description: "copy", stock: 3 },
    ]);
    const rows = await publicDatabase("fr").product.findMany({ select: { name: true } });
    expect(findMany.mock.calls[0]?.[0].select).toHaveProperty("technicalDescription", true);
    expect(findMany.mock.calls[0]?.[0].select.images.select).toEqual({ url: true, alt: true });
    expect(rows).toEqual([{ name: "Zapatilla" }]);
  });
  it("preserves published Spanish product cards even without foreign product translations", async () => {
    findUnique.mockResolvedValue({ id: "p", slug: "missing", name: "Español" });
    expect(
      await publicDatabase("fr").product.findUnique({ where: { slug: "missing" } }),
    ).toMatchObject({ name: "Español" });
    expect(
      (await publicDatabase("es").product.findUnique({ where: { slug: "missing" } }))?.name,
    ).toBe("Español");
  });
});
