import { describe, it, expect } from "vitest";
import { BLOG_TEMPLATES, getTemplateById } from "@/lib/blog/templates";
import {
  extractHeadings,
  readingTimeMinutes,
  slugifyHeading,
} from "@/lib/blog/reading-time";

describe("blog templates", () => {
  it("exporta exactamente las 4 plantillas requeridas", () => {
    expect(BLOG_TEMPLATES).toHaveLength(4);
  });

  it("cada plantilla tiene los campos obligatorios", () => {
    for (const t of BLOG_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.title).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.suggestedSlug).toMatch(/^[a-z0-9-]+$/);
      expect(Array.isArray(t.suggestedTags)).toBe(true);
      expect(t.suggestedTags.length).toBeGreaterThan(0);
      expect(t.contentMd.length).toBeGreaterThan(0);
    }
  });

  it("cada plantilla contiene al menos un H2", () => {
    for (const t of BLOG_TEMPLATES) {
      const headings = extractHeadings(t.contentMd);
      const h2 = headings.filter((h) => h.level === 2);
      expect(h2.length, `${t.id} sin H2`).toBeGreaterThan(0);
    }
  });

  it("cada plantilla alcanza el mínimo editorial de palabras", () => {
    for (const t of BLOG_TEMPLATES) {
      const words = t.contentMd
        .replace(/[#>*_`~|-]+/g, " ")
        .split(/\s+/)
        .filter(Boolean).length;
      expect(words, `${t.id} tiene pocas palabras (${words})`).toBeGreaterThan(400);
    }
  });

  it("getTemplateById recupera la plantilla y devuelve undefined si no existe", () => {
    for (const t of BLOG_TEMPLATES) {
      expect(getTemplateById(t.id)?.id).toBe(t.id);
    }
    expect(getTemplateById("no-existe")).toBeUndefined();
  });

  it("readingTimeMinutes devuelve al menos 1 para texto cualquiera", () => {
    expect(readingTimeMinutes("")).toBe(1);
    for (const t of BLOG_TEMPLATES) {
      expect(readingTimeMinutes(t.contentMd)).toBeGreaterThanOrEqual(2);
    }
  });

  it("slugifyHeading produce ids URL-safe", () => {
    expect(slugifyHeading("Cómo elegir tu primera pala")).toBe("como-elegir-tu-primera-pala");
    expect(slugifyHeading("¿Qué drop necesito?")).toBe("que-drop-necesito");
    expect(slugifyHeading("Tabla 1 / 2")).toBe("tabla-1-2");
  });

  it("los headings extraidos generan ids únicos cuando se repiten textos", () => {
    const md = "## Sección\n\nTexto\n\n## Sección\n\nMás texto";
    const headings = extractHeadings(md);
    expect(headings.map((h) => h.id)).toEqual(["seccion", "seccion-2"]);
  });
});
