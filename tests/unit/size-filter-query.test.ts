import { describe, expect, it } from "vitest";
import {
  parseSizeFilterParam,
  serializeSizeFilterParam,
} from "@/lib/products/size-filter-query";
import { buildProductWhere, parseCategoryParams } from "@/lib/public-queries";

describe("parámetro del filtro de talla", () => {
  it("mantiene una talla decimal con coma como un único valor", () => {
    expect(parseSizeFilterParam("40,5")).toEqual(["40,5"]);
  });

  it("admite varias tallas sin confundir sus comas decimales", () => {
    const serialized = serializeSizeFilterParam(["40,5", "41", "42,5"]);
    expect(serialized).toBe("40,5|41|42,5");
    expect(parseSizeFilterParam(serialized)).toEqual(["40,5", "41", "42,5"]);
  });

  it("conserva compatibilidad con enlaces antiguos de tallas enteras", () => {
    expect(parseSizeFilterParam("40,41")).toEqual(["40", "41"]);
    expect(parseSizeFilterParam("4,6")).toEqual(["4", "6"]);
  });

  it("acepta parámetros repetidos recibidos como array", () => {
    expect(parseSizeFilterParam(["40,5", "41"])).toEqual(["40,5", "41"]);
  });

  it("mantiene los valores correctos al construir la consulta de productos", () => {
    const filters = parseCategoryParams({ talla: "40,5|41" });
    const where = buildProductWhere({ filters });
    const serializedWhere = JSON.stringify(where);

    expect(filters.talla).toEqual(["40,5", "41"]);
    expect(serializedWhere).toContain('"equals":"40,5"');
    expect(serializedWhere).toContain('"equals":"41"');
    expect(serializedWhere).not.toContain('"equals":"5"');
  });
});
