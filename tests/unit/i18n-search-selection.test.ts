import { expect, it, vi } from "vitest";
const { findMany, originals, slugs } = vi.hoisted(() => ({ findMany: vi.fn(), originals: vi.fn(), slugs: vi.fn(() => ["translated-shoe"]) }));
vi.mock("@/lib/i18n/public-db", () => ({ publicDatabase: () => ({ blogPost: { findMany } }) }));
vi.mock("@/lib/i18n/content", () => ({ loadEditorialPosts: originals, translatedSearchSlugs: slugs }));
import { searchProductWhere, searchPublicPosts } from "@/lib/i18n/search";
it("matches translated product slugs while retaining active stock conditions", () => {
 const where = searchProductWhere("fr", "chaussure");
 expect(where.status).toBe("ACTIVE"); expect(where.AND).toHaveLength(1);
 expect(where.OR).toContainEqual({ slug: { in: ["translated-shoe"] } });
});
it("merges native originals with published current translated posts before ordering and limiting", async () => {
 findMany.mockResolvedValue([{ id: "old", slug: "old", title: "Guide", excerpt: "", publishedAt: new Date("2026-01-01") }]);
 originals.mockReturnValue([{ slug: "native", title: "Chaussure guide", excerpt: "", tags: [], publishedAt: "2026-10-01" }]);
 const posts = await searchPublicPosts("fr", "chaussure", 1);
 expect(posts.map(p => p.slug)).toEqual(["native"]);
 const query = findMany.mock.calls[0]![0];
 expect(query.where.status).toBe("PUBLISHED"); expect(query.where.AND[0].OR).toEqual([{ publishedAt: null }, { publishedAt: { lte: expect.any(Date) } }]);
 expect(query.where.OR).toContainEqual({ slug: { in: ["translated-shoe"] } });
});
it("includes Spanish native originals too", async () => {
 findMany.mockResolvedValue([]); originals.mockReturnValue([{ slug: "nuevo", title: "Guía fútbol", excerpt: "", tags: [], publishedAt: "2026-10-01" }]);
 expect((await searchPublicPosts("es", "fútbol", 10))[0]?.slug).toBe("nuevo");
});
