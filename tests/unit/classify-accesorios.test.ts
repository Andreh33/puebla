import { describe, it, expect } from "vitest";
import { classify } from "@/lib/categories/classify";

describe("subfamilias finas de complementos (petición cliente 2026-06)", () => {
  it("GORRA → accesorios:gorras", () => expect(classify("GORRA JOHN SMITH")).toBe("accesorios:gorras"));
  it("GUANTES → accesorios:guantes", () => expect(classify("GUANTES PORTERO")).toBe("accesorios:guantes"));
  it("BOLSA → accesorios:bolsos", () => expect(classify("BOLSA DEPORTE JOMA")).toBe("accesorios:bolsos"));
  it("BILLETERO → accesorios:billeteros", () => expect(classify("BILLETERO JOHN SMITH")).toBe("accesorios:billeteros"));
  it("RIÑONERA → accesorios:rinonera", () => expect(classify("RIÑONERA NEGRA")).toBe("accesorios:rinonera"));
  it("ESPINILLERA → accesorios:espinilleras", () => expect(classify("ESPINILLERAS FUTBOL")).toBe("accesorios:espinilleras"));
  it("GAFAS → accesorios:gafas-natacion", () => expect(classify("GAFAS NATACION SPEEDO")).toBe("accesorios:gafas-natacion"));
  it("PATINES → accesorios:patinaje", () => expect(classify("PATINES EN LINEA")).toBe("accesorios:patinaje"));
  it("BOTELLA (catch-all) → accesorios:varios", () => expect(classify("BOTELLA ALUMINIO")).toBe("accesorios:varios"));
  it("MOCHILA sigue → accesorios:mochilas", () => expect(classify("MOCHILA 30L")).toBe("accesorios:mochilas"));
  it("BALON sigue → accesorios:balones", () => expect(classify("BALON FUTBOL")).toBe("accesorios:balones"));
  it("CALCETINES sigue → accesorios:calcetines", () => expect(classify("CALCETINES PACK 3")).toBe("accesorios:calcetines"));
  it("PALA sigue → accesorios:padel", () => expect(classify("PALA BULLPADEL")).toBe("accesorios:padel"));
});
