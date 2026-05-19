import { describe, it, expect } from "vitest";
import { writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseCsvLine,
  parseCsvText,
  createMovaliaCsvProvider,
} from "@/lib/movalia/adapters/csv";

describe("parseCsvLine", () => {
  it("separa por coma respetando comillas dobles", () => {
    expect(parseCsvLine('"Hola, mundo",2,3', ",")).toEqual(["Hola, mundo", "2", "3"]);
  });

  it("interpreta '' dentro de comillas como '\"' literal", () => {
    expect(parseCsvLine('"él dijo ""hola""",ok', ",")).toEqual(['él dijo "hola"', "ok"]);
  });

  it("soporta punto y coma como separador", () => {
    expect(parseCsvLine("a;b;c", ";")).toEqual(["a", "b", "c"]);
  });
});

describe("parseCsvText", () => {
  it("devuelve headers y rows como records", () => {
    const text = "a,b,c\n1,2,3\n4,5,6\n";
    const r = parseCsvText(text, ",");
    expect(r.headers).toEqual(["a", "b", "c"]);
    expect(r.rows).toEqual([
      { a: "1", b: "2", c: "3" },
      { a: "4", b: "5", c: "6" },
    ]);
  });

  it("respeta saltos de línea dentro de comillas", () => {
    const text = 'a,b\n"línea1\nlínea2",ok\n';
    const r = parseCsvText(text, ",");
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]!.a).toContain("línea1");
    expect(r.rows[0]!.a).toContain("línea2");
  });
});

describe("createMovaliaCsvProvider", () => {
  it("agrupa filas por externalId y construye MovaliaItem", async () => {
    const dir = await mkdtemp(join(tmpdir(), "movalia-csv-"));
    const path = join(dir, "feed.csv");
    const csv =
      "externalId,name,brand,category,colorName,retailPrice,size,ean,stock,imageUrl\n" +
      'MV001,Camiseta Running,Adidas,Running,Negro,"21,99",M,1234567890123,5,https://shop.movalia.com/img/a.jpg\n' +
      'MV001,Camiseta Running,Adidas,Running,Negro,"21,99",L,1234567890124,3,https://shop.movalia.com/img/a.jpg\n' +
      'MV002,Pantalón Trekking,Salomon,Montaña,Verde,"45,00",42,,2,\n';
    await writeFile(path, csv, "utf-8");

    const provider = createMovaliaCsvProvider({ source: path });
    const items = [];
    for await (const it of provider.fetchCatalog()) items.push(it);

    expect(items).toHaveLength(2);
    const mv001 = items.find((i) => i.externalId === "MV001")!;
    expect(mv001.name).toBe("Camiseta Running");
    expect(mv001.brand).toBe("Adidas");
    expect(mv001.retailPrice).toBe(21.99);
    expect(mv001.sizes).toHaveLength(2);
    expect(mv001.sizes.map((s) => s.size)).toEqual(["M", "L"]);
    expect(mv001.imageUrls).toHaveLength(1);

    const mv002 = items.find((i) => i.externalId === "MV002")!;
    expect(mv002.retailPrice).toBe(45);
    expect(mv002.sizes).toHaveLength(1);
  });

  it("auto-detecta separador `;`", async () => {
    const dir = await mkdtemp(join(tmpdir(), "movalia-csv2-"));
    const path = join(dir, "feed.csv");
    const csv =
      "externalId;name;brand;category;colorName;retailPrice;size\n" +
      "X1;Producto X;MarcaY;CatZ;Rojo;9,90;UNICA\n";
    await writeFile(path, csv, "utf-8");

    const provider = createMovaliaCsvProvider({ source: path });
    const items = [];
    for await (const it of provider.fetchCatalog()) items.push(it);
    expect(items).toHaveLength(1);
    expect(items[0]!.name).toBe("Producto X");
    // talla ÚNICA se normaliza a "" (no se añade a sizes)
    expect(items[0]!.sizes).toHaveLength(0);
  });

  it("aplica mapping de campos custom", async () => {
    const dir = await mkdtemp(join(tmpdir(), "movalia-csv3-"));
    const path = join(dir, "feed.csv");
    const csv =
      "id,nombre,marca,categoria,color,pvp,talla\n" +
      "AA,producto A,marca A,cat A,Rojo,10,UNICA\n";
    await writeFile(path, csv, "utf-8");

    const provider = createMovaliaCsvProvider({
      source: path,
      mapping: {
        id: "externalId",
        nombre: "name",
        marca: "brand",
        categoria: "category",
        color: "colorName",
        pvp: "retailPrice",
        talla: "size",
      },
    });
    const items = [];
    for await (const it of provider.fetchCatalog()) items.push(it);
    expect(items).toHaveLength(1);
    expect(items[0]!.externalId).toBe("AA");
    expect(items[0]!.retailPrice).toBe(10);
  });
});
