import { describe, it, expect } from "vitest";
import { collectProductFormErrors } from "@/lib/admin/product-form-errors";

describe("collectProductFormErrors", () => {
  it("sin errores devuelve lista vacía", () => {
    expect(collectProductFormErrors({})).toEqual([]);
  });

  it("traduce un error de 'name' a la pestaña General con etiqueta en español", () => {
    const items = collectProductFormErrors({
      name: { type: "too_small", message: "String must contain at least 3 character(s)" },
    });
    expect(items).toHaveLength(1);
    expect(items[0]!.tab).toBe("general");
    expect(items[0]!.tabLabel).toBe("General");
    expect(items[0]!.label).toBe("Nombre");
    expect(items[0]!.message.length).toBeGreaterThan(0);
  });

  it("ubica 'metaTitle' en la pestaña SEO y explica el límite de 70", () => {
    const items = collectProductFormErrors({
      metaTitle: { type: "too_big", message: "..." },
    });
    expect(items[0]!.tab).toBe("seo");
    expect(items[0]!.label).toBe("Meta título");
    expect(items[0]!.message).toContain("70");
  });

  it("explica un enum legacy (garmentType) como valor no válido", () => {
    const items = collectProductFormErrors({
      garmentType: { type: "invalid_enum_value", message: "..." },
    });
    expect(items[0]!.tab).toBe("general");
    expect(items[0]!.label).toBe("Tipo de prenda");
    expect(items[0]!.message.toLowerCase()).toContain("no es válido");
  });

  it("añade la longitud actual cuando se pasan los valores (composición > 500)", () => {
    const items = collectProductFormErrors(
      { composition: { type: "too_big", message: "..." } },
      { composition: "x".repeat(540) },
    );
    expect(items[0]!.label).toBe("Composición");
    expect(items[0]!.message).toContain("540");
  });

  it("desglosa errores por fila de talla (sizes[1].ean)", () => {
    const items = collectProductFormErrors({
      sizes: [undefined, { ean: { type: "invalid_string", message: "..." } }],
    });
    expect(items).toHaveLength(1);
    expect(items[0]!.tab).toBe("precios");
    expect(items[0]!.label).toContain("Talla 2");
    expect(items[0]!.label.toLowerCase()).toContain("ean");
  });

  it("ordena los items por pestaña (General antes que SEO)", () => {
    const items = collectProductFormErrors({
      metaTitle: { type: "too_big", message: "" },
      name: { type: "too_small", message: "" },
    });
    expect(items.map((i) => i.field)).toEqual(["name", "metaTitle"]);
  });

  it("un campo desconocido no rompe y produce un item genérico", () => {
    const items = collectProductFormErrors({
      foobar: { type: "custom", message: "algo raro" },
    });
    expect(items).toHaveLength(1);
    expect(items[0]!.label).toBeTruthy();
    expect(items[0]!.message).toBeTruthy();
  });
});
