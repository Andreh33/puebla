import { describe, it, expect } from "vitest";
import { BLOG_POSTS_EXTRA } from "@/lib/seed/blog-posts-extra";
import { SEED_BLOG_POSTS } from "@/lib/seed/blog-posts";

// Slug del post de bienvenida sembrado inline en lib/seed/core.ts.
const WELCOME_SLUG = "bienvenidos-a-la-nueva-tienda-online-de-zona-sport";

describe("BLOG_POSTS_EXTRA", () => {
  it("contiene exactamente 40 posts", () => {
    expect(BLOG_POSTS_EXTRA).toHaveLength(40);
  });

  it("tiene slugs únicos entre sí", () => {
    const slugs = BLOG_POSTS_EXTRA.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("no colisiona con los 9 posts del seed core", () => {
    const existing = new Set<string>([
      ...SEED_BLOG_POSTS.map((p) => p.slug),
      WELCOME_SLUG,
    ]);
    const collisions = BLOG_POSTS_EXTRA.filter((p) => existing.has(p.slug)).map(
      (p) => p.slug,
    );
    expect(collisions).toEqual([]);
  });

  it("usa slugs en kebab-case (URL-safe)", () => {
    for (const p of BLOG_POSTS_EXTRA) {
      expect(p.slug, p.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it("tiene todos los campos requeridos presentes y no vacíos", () => {
    for (const p of BLOG_POSTS_EXTRA) {
      expect(p.title?.trim(), p.slug).toBeTruthy();
      expect(p.excerpt?.trim(), p.slug).toBeTruthy();
      expect(p.contentMd?.trim(), p.slug).toBeTruthy();
      expect(p.metaTitle?.trim(), p.slug).toBeTruthy();
      expect(p.metaDescription?.trim(), p.slug).toBeTruthy();
      expect(p.author, p.slug).toBe("Equipo Zona Sport");
      expect(p.accent, p.slug).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(p.category?.trim(), p.slug).toBeTruthy();
      expect(Array.isArray(p.tags), p.slug).toBe(true);
      expect(p.tags.length, p.slug).toBeGreaterThanOrEqual(2);
    }
  });

  it("cada contentMd no está vacío y trae al menos dos subtítulos H2", () => {
    for (const p of BLOG_POSTS_EXTRA) {
      expect(p.contentMd.length, p.slug).toBeGreaterThan(0);
      const h2 = (p.contentMd.match(/^##\s/gm) || []).length;
      expect(h2, `${p.slug} con pocos H2`).toBeGreaterThanOrEqual(2);
    }
  });

  it("cada post tiene una longitud editorial razonable (>=230 palabras)", () => {
    for (const p of BLOG_POSTS_EXTRA) {
      const words = p.contentMd
        .replace(/[#>*_`~|-]+/g, " ")
        .split(/\s+/)
        .filter(Boolean).length;
      expect(words, `${p.slug} tiene pocas palabras (${words})`).toBeGreaterThanOrEqual(230);
    }
  });
});
