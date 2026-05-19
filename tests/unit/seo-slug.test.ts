import { describe, expect, it } from "vitest";
import { slugifyEs, uniqueSlug } from "@/lib/seo/slug";

describe("slugifyEs", () => {
  it("convierte a minúsculas", () => {
    expect(slugifyEs("Zapatillas Running")).toBe("zapatillas-running");
  });

  it("quita acentos y caracteres especiales", () => {
    expect(slugifyEs("Camiseta Niño Montañismo")).toBe("camiseta-nino-montanismo");
  });

  it("filtra stopwords castellanas cuando el resultado sigue siendo legible", () => {
    expect(slugifyEs("Las mejores zapatillas de la temporada")).toBe(
      "mejores-zapatillas-temporada",
    );
  });

  it("preserva stopwords si quedaría menos de 2 palabras", () => {
    // "de la" → si filtramos quedan 0 palabras; debe devolver el slug base.
    expect(slugifyEs("De la")).toBe("de-la");
  });

  it("respeta opt-out de stopwords", () => {
    expect(slugifyEs("Las mejores zapatillas", { keepStopwords: true })).toBe(
      "las-mejores-zapatillas",
    );
  });

  it("elimina símbolos como acentos y puntuación", () => {
    // Nota: slugify (locale 'es') transcribe ® → 'r', ™ → 'tm'. Comprobamos
    // que al menos los signos puntuales sí se eliminan y el resultado es válido.
    const out = slugifyEs("¡Hola! ¿Qué tal? — Día 2024");
    expect(out).toBe("hola-que-tal-dia-2024");
  });

  it("colapsa espacios múltiples", () => {
    expect(slugifyEs("   pádel   pala   ")).toBe("padel-pala");
  });
});

describe("uniqueSlug", () => {
  it("devuelve el slug base si no existe", async () => {
    const result = await uniqueSlug("zapatilla", async () => false);
    expect(result).toBe("zapatilla");
  });

  it("añade sufijo numérico si ya existe", async () => {
    const ocupados = new Set(["zapatilla", "zapatilla-2", "zapatilla-3"]);
    const result = await uniqueSlug("zapatilla", async (s) => ocupados.has(s));
    expect(result).toBe("zapatilla-4");
  });

  it("falla si no puede encontrar slug en 1000 intentos", async () => {
    await expect(uniqueSlug("x", async () => true)).rejects.toThrow(/no se pudo/i);
  });
});
