import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests para la generación de descripción/meta a partir de los CAMPOS del
 * formulario (sin productId), y para la forma del banco de plantillas.
 *
 * Mockeamos `@/lib/db` con `descriptionTemplate.findMany` controlado para
 * inyectar plantillas (o ninguna) según el caso.
 */

const findMany = vi.fn();
vi.mock("@/lib/db", () => ({
  db: {
    descriptionTemplate: { findMany: (...a: unknown[]) => findMany(...a) },
  },
}));

import {
  generateDescriptionFromFields,
  generateMetaFromFields,
} from "@/lib/products/description";
import { DESCRIPTION_TEMPLATES } from "@/lib/seed/description-templates";

// Helper: configura findMany para que devuelva `rows` SOLO cuando se pida la
// categoría `slug`, y vacío en cualquier otra consulta (incluido el fallback).
function templatesFor(slug: string, rows: unknown[]) {
  findMany.mockImplementation((args: { where?: { categorySlug?: string } }) => {
    if (args?.where?.categorySlug === slug) return Promise.resolve(rows);
    return Promise.resolve([]);
  });
}

beforeEach(() => {
  findMany.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("generateDescriptionFromFields", () => {
  it("sustituye los placeholders con los campos dados", async () => {
    templatesFor("camisetas", [
      {
        id: "t1",
        body: "Camiseta {name} {color} de {brand} ({category}).",
        metaShort: null,
        categorySlug: "camisetas",
      },
    ]);

    const out = await generateDescriptionFromFields({
      name: "Camiseta Pro",
      brandName: "John Smith",
      categorySlug: "camisetas",
      colorName: "Azul",
    });

    expect(out).toBe("Camiseta Camiseta Pro azul de John Smith (camisetas).");
    expect(out).not.toContain("{brand}");
    expect(out).not.toContain("{color}");
    expect(out).not.toContain("{name}");
    expect(out).not.toContain("{category}");
  });

  it("cae en la plantilla 'default' cuando no hay plantilla de esa categoría", async () => {
    // No hay plantilla para 'no-existe', pero sí para 'default'.
    findMany.mockImplementation((args: { where?: { categorySlug?: string } }) => {
      if (args?.where?.categorySlug === "default") {
        return Promise.resolve([
          {
            id: "d1",
            body: "Producto {name} {color} de {brand}.",
            metaShort: null,
            categorySlug: "default",
          },
        ]);
      }
      return Promise.resolve([]);
    });

    const out = await generateDescriptionFromFields({
      name: "Cosa",
      brandName: "+8000",
      categorySlug: "no-existe",
      colorName: "Verde",
    });

    expect(out).toBe("Producto Cosa verde de +8000.");
  });

  it("usa valores neutros cuando faltan brand/color/categoría", async () => {
    templatesFor("default", [
      {
        id: "d1",
        body: "{name} {color} {brand} {category}",
        metaShort: null,
        categorySlug: "default",
      },
    ]);

    const out = await generateDescriptionFromFields({ name: "Bambas" });
    // color → "único", brand → "Zona Sport", category (default) → "deportivo"
    expect(out).toBe("Bambas único Zona Sport deportivo");
  });

  it("devuelve null si no hay ninguna plantilla sembrada (ni default)", async () => {
    findMany.mockResolvedValue([]);
    const out = await generateDescriptionFromFields({
      name: "X",
      categorySlug: "camisetas",
    });
    expect(out).toBeNull();
  });
});

describe("generateMetaFromFields", () => {
  it("usa el metaShort de la plantilla si existe, con placeholders sustituidos", async () => {
    templatesFor("polos", [
      {
        id: "p1",
        body: "irrelevante",
        metaShort: "Polo {color} de {brand}. Envío 24/48 h.",
        categorySlug: "polos",
      },
    ]);

    const out = await generateMetaFromFields({
      name: "Polo Club",
      brandName: "Joma",
      categorySlug: "polos",
      colorName: "Marino",
    });

    expect(out).toBe("Polo marino de Joma. Envío 24/48 h.");
  });

  it("cae en meta genérica cuando no hay plantilla con metaShort (nunca null)", async () => {
    findMany.mockResolvedValue([]); // sin plantillas → meta genérica
    const out = await generateMetaFromFields({
      name: "Sudadera Norte",
      brandName: "Hummel",
      categorySlug: "sudaderas",
      colorName: "Gris",
    });

    expect(out).toBeTypeOf("string");
    expect(out.length).toBeGreaterThan(0);
    expect(out.length).toBeLessThanOrEqual(156); // META_MAX + posible "…"
    expect(out).toContain("Sudadera Norte");
    expect(out).toContain("Hummel");
  });
});

describe("DESCRIPTION_TEMPLATES (banco ampliado)", () => {
  it("tiene un volumen alto de plantillas (≥600)", () => {
    expect(DESCRIPTION_TEMPLATES.length).toBeGreaterThanOrEqual(600);
  });

  it("todos los slugs son únicos", () => {
    const slugs = DESCRIPTION_TEMPLATES.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("cada plantilla tiene la forma válida que espera el seed/applyPlaceholders", () => {
    for (const t of DESCRIPTION_TEMPLATES) {
      expect(typeof t.slug).toBe("string");
      expect(t.slug.length).toBeGreaterThan(0);
      expect(typeof t.label).toBe("string");
      expect(typeof t.categorySlug).toBe("string");
      expect(t.categorySlug.length).toBeGreaterThan(0);
      expect(typeof t.body).toBe("string");
      expect(t.body.length).toBeGreaterThan(0);
      expect(typeof t.position).toBe("number");
      // No debe quedar ningún placeholder mal escrito tipo {{ }} ni vacíos {}
      expect(t.body).not.toMatch(/\{\}/);
    }
  });

  it("incluye una plantilla 'default' para el fallback", () => {
    expect(DESCRIPTION_TEMPLATES.some((t) => t.categorySlug === "default")).toBe(true);
  });

  it("cubre las categorías/tipos nuevos (running, futbol, padel, accesorios)", () => {
    const cats = new Set(DESCRIPTION_TEMPLATES.map((t) => t.categorySlug));
    for (const slug of ["running", "futbol", "padel", "accesorios"]) {
      expect(cats.has(slug)).toBe(true);
    }
  });

  it("las descripciones son razonablemente largas (intro+body+outro)", () => {
    // Comprobamos que el body medio supera los 250 chars (más largas que antes).
    const avg =
      DESCRIPTION_TEMPLATES.reduce((s, t) => s + t.body.length, 0) /
      DESCRIPTION_TEMPLATES.length;
    expect(avg).toBeGreaterThan(250);
  });
});
