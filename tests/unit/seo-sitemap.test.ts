import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const { posts } = vi.hoisted(() => ({
  posts: [
    { slug: "available", updatedAt: new Date("2026-01-01"), publishedAt: new Date("2026-01-01") },
    { slug: "scheduled", updatedAt: new Date("2026-01-01"), publishedAt: new Date("2027-01-01") },
  ],
}));
vi.mock("@/lib/db", () => ({
  db: {
    brand: { findMany: async () => [] },
    category: { findMany: async () => [] },
    product: { count: async () => 0, findMany: async () => [] },
    blogPost: {
      count: async () => 2,
      findMany: async (query: { where: { OR?: Array<{ publishedAt: null | { lte: Date } }> } }) => {
        const cutoff = query.where.OR?.find((clause) => clause.publishedAt !== null)?.publishedAt;
        return posts.filter((post) => !cutoff || post.publishedAt <= cutoff.lte);
      },
    },
  },
}));
import sitemap from "@/app/sitemap";
import { GET } from "@/app/sitemap-posts.xml/route";
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-26"));
});
afterEach(() => vi.useRealTimers());
describe("published sitemap URLs", () => {
  it("only includes the six implemented municipality routes", async () => {
    const paths = (await sitemap()).map((entry) => new URL(entry.url).pathname);
    expect(paths.filter((path) => path.startsWith("/tienda-en/"))).toEqual([
      "/tienda-en/puebla-de-la-calzada",
      "/tienda-en/montijo",
      "/tienda-en/lobon",
      "/tienda-en/talavera-la-real",
      "/tienda-en/merida",
      "/tienda-en/badajoz",
    ]);
  });
  it("includes the existing catalog, outlet and baby hubs", async () => {
    const paths = (await sitemap()).map((entry) => new URL(entry.url).pathname);
    expect(paths).toEqual(expect.arrayContaining(["/catalogo", "/outlet", "/bebe"]));
  });
  it("keeps scheduled posts out of both sitemap formats", async () => {
    const paths = (await sitemap()).map((entry) => new URL(entry.url).pathname);
    expect(paths).toContain("/blog/available");
    expect(paths).not.toContain("/blog/scheduled");
    const xml = await (await GET()).text();
    expect(xml).toContain("/blog/available");
    expect(xml).not.toContain("/blog/scheduled");
  });
});
