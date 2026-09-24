import { describe, expect, it } from "vitest";
import { MEGA_MENU, buildMegaMenuHref } from "@/lib/menu/mega-menu";

function ropaItems(section: keyof typeof MEGA_MENU) {
  return MEGA_MENU[section].sections[0]!.groups.find((group) => group.title === "Ropa")!.items;
}

describe("megamenú de ropa", () => {
  it("muestra Faldas solo en Mujer", () => {
    expect(ropaItems("mujer")).toContainEqual({
      label: "Faldas",
      familia: "textil",
      prenda: "falda",
    });

    for (const section of ["hombre", "nino", "nina", "bebe"] as const) {
      expect(ropaItems(section).some((item) => item.label === "Faldas")).toBe(false);
    }
  });

  it("enlaza Faldas con el filtro de prenda existente", () => {
    const faldas = ropaItems("mujer").find((item) => item.label === "Faldas")!;

    expect(buildMegaMenuHref(faldas, "MUJER")).toBe("/mujer/textil?prenda=falda");
  });
});
