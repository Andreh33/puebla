/**
 * Test del parser WooCommerce (`parseWooCommerceFile`) para BUG 2: cuando el
 * padre `variable` no trae "Precio normal", debe heredar el MÍNIMO precio entre
 * las variations con precio (>0), no el de la primera talla del CSV.
 *
 * Escribe un CSV temporal con el formato del export nativo de WooCommerce y lo
 * parsea desde disco (el parser usa createReadStream).
 */
import { describe, it, expect } from "vitest";
import { writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseWooCommerceFile } from "@/lib/importer/woocommerce";

const HEADER =
  "ID,Tipo,SKU,Nombre,Superior,Categorías,Marca,Precio normal,Precio rebajado,Inventario,Valor(es) del atributo 1,Imágenes";

async function writeCsv(rows: string[]): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "woo-price-"));
  const path = join(dir, "feed.csv");
  await writeFile(path, [HEADER, ...rows].join("\n") + "\n", "utf-8");
  return path;
}

describe("parseWooCommerceFile · precio del padre variable", () => {
  it("padre sin precio hereda el MÍNIMO retailPrice de las tallas (no la primera)", async () => {
    // La primera talla (39) vale 79,95 — la más barata (41) vale 59,95.
    const path = await writeCsv([
      "100,variable,ZAP-1,ZAPATILLA RUNNING JOMA,,Calzado,Joma,,,,,",
      "101,variation,ZAP-1-39,ZAPATILLA RUNNING JOMA - 39,ZAP-1,,,79.95,,5,39,",
      "102,variation,ZAP-1-40,ZAPATILLA RUNNING JOMA - 40,ZAP-1,,,69.95,,3,40,",
      "103,variation,ZAP-1-41,ZAPATILLA RUNNING JOMA - 41,ZAP-1,,,59.95,,2,41,",
    ]);

    const { groups } = await parseWooCommerceFile(path);
    expect(groups).toHaveLength(1);
    const parent = groups[0]!.parent;
    expect(parent.retailPrice?.toString()).toBe("59.95");
  });

  it("ignora variations sin precio (0 o vacío) al calcular el mínimo", async () => {
    // La talla más barata con precio real es 49,95; las de precio 0/vacío no cuentan.
    const path = await writeCsv([
      "200,variable,ZAP-2,SUDADERA JOMA,,Textil,Joma,,,,,",
      "201,variation,ZAP-2-S,SUDADERA JOMA - S,ZAP-2,,,0,,5,S,",
      "202,variation,ZAP-2-M,SUDADERA JOMA - M,ZAP-2,,,,,3,M,",
      "203,variation,ZAP-2-L,SUDADERA JOMA - L,ZAP-2,,,49.95,,2,L,",
      "204,variation,ZAP-2-XL,SUDADERA JOMA - XL,ZAP-2,,,54.95,,1,XL,",
    ]);

    const { groups } = await parseWooCommerceFile(path);
    const parent = groups.find((g) => g.parent.sku === "ZAP-2")!.parent;
    expect(parent.retailPrice?.toString()).toBe("49.95");
  });

  it("padre CON precio propio no se altera (gana su Precio normal)", async () => {
    const path = await writeCsv([
      "300,variable,ZAP-3,CHAQUETA JOMA,,Textil,Joma,89.95,,,,",
      "301,variation,ZAP-3-M,CHAQUETA JOMA - M,ZAP-3,,,59.95,,3,M,",
      "302,variation,ZAP-3-L,CHAQUETA JOMA - L,ZAP-3,,,69.95,,2,L,",
    ]);

    const { groups } = await parseWooCommerceFile(path);
    const parent = groups.find((g) => g.parent.sku === "ZAP-3")!.parent;
    expect(parent.retailPrice?.toString()).toBe("89.95");
  });

  it("si ninguna variation tiene precio, el padre queda sin retailPrice", async () => {
    const path = await writeCsv([
      "400,variable,ZAP-4,GORRA JOMA,,Accesorios,Joma,,,,,",
      "401,variation,ZAP-4-U,GORRA JOMA - U,ZAP-4,,,,,5,U,",
    ]);

    const { groups } = await parseWooCommerceFile(path);
    const parent = groups.find((g) => g.parent.sku === "ZAP-4")!.parent;
    expect(parent.retailPrice).toBeNull();
  });
});
