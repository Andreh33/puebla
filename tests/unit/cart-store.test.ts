import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addItemPure,
  removeItemPure,
  updateQtyPure,
  totalItemsPure,
  totalPricePure,
  readCart,
  writeCart,
  CART_STORAGE_KEY,
  type CartItem,
  type StorageLike,
} from "@/lib/cart/store";

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: "p1",
    slug: "mochila-m24205-azul",
    name: "Mochila John Smith M24205",
    brand: "John Smith",
    imageUrl: "https://cdn.example.com/p1.jpg",
    colorName: "Azul Marino",
    size: "M",
    price: 21.99,
    qty: 1,
    addedAt: 1700000000000,
    ...overrides,
  };
}

describe("addItemPure", () => {
  it("añade un item nuevo", () => {
    const result = addItemPure([], makeItem());
    expect(result).toHaveLength(1);
    expect(result[0]?.qty).toBe(1);
  });

  it("suma la qty al añadir el mismo productId + size", () => {
    const start = addItemPure([], makeItem({ qty: 1 }));
    const after = addItemPure(start, makeItem({ qty: 2 }));
    expect(after).toHaveLength(1);
    expect(after[0]?.qty).toBe(3);
  });

  it("trata distinto el mismo producto con tallas diferentes", () => {
    const start = addItemPure([], makeItem({ size: "M" }));
    const after = addItemPure(start, makeItem({ size: "L" }));
    expect(after).toHaveLength(2);
    expect(totalItemsPure(after)).toBe(2);
  });

  it("trata distinto productos diferentes con misma talla", () => {
    const start = addItemPure([], makeItem({ productId: "p1" }));
    const after = addItemPure(start, makeItem({ productId: "p2" }));
    expect(after).toHaveLength(2);
  });

  it("refresca el precio al añadir de nuevo (precio congelado más reciente)", () => {
    const start = addItemPure([], makeItem({ price: 21.99 }));
    const after = addItemPure(start, makeItem({ price: 19.99, qty: 1 }));
    expect(after[0]?.price).toBe(19.99);
    expect(after[0]?.qty).toBe(2);
  });

  it("soporta size null como clave válida", () => {
    const start = addItemPure([], makeItem({ size: null, qty: 1 }));
    const after = addItemPure(start, makeItem({ size: null, qty: 2 }));
    expect(after).toHaveLength(1);
    expect(after[0]?.qty).toBe(3);
  });
});

describe("removeItemPure", () => {
  it("elimina por productId + size", () => {
    const a = makeItem({ productId: "p1", size: "M" });
    const b = makeItem({ productId: "p1", size: "L" });
    const result = removeItemPure([a, b], "p1", "M");
    expect(result).toHaveLength(1);
    expect(result[0]?.size).toBe("L");
  });

  it("no toca si no encuentra coincidencia", () => {
    const a = makeItem();
    const result = removeItemPure([a], "p999", "Z");
    expect(result).toHaveLength(1);
  });
});

describe("updateQtyPure", () => {
  it("actualiza qty existente", () => {
    const a = makeItem({ qty: 1 });
    const result = updateQtyPure([a], a.productId, a.size, 5);
    expect(result[0]?.qty).toBe(5);
  });

  it("qty=0 elimina la línea", () => {
    const a = makeItem({ qty: 3 });
    const result = updateQtyPure([a], a.productId, a.size, 0);
    expect(result).toHaveLength(0);
  });

  it("qty negativa elimina la línea (saneo)", () => {
    const a = makeItem({ qty: 3 });
    const result = updateQtyPure([a], a.productId, a.size, -2);
    expect(result).toHaveLength(0);
  });

  it("floor de qty decimal", () => {
    const a = makeItem({ qty: 1 });
    const result = updateQtyPure([a], a.productId, a.size, 2.9);
    expect(result[0]?.qty).toBe(2);
  });
});

describe("tope de stock por talla (maxStock)", () => {
  it("addItemPure no supera el stock de la talla al sumar", () => {
    const start = addItemPure([], makeItem({ qty: 1, maxStock: 2 }));
    const after = addItemPure(start, makeItem({ qty: 5, maxStock: 2 }));
    expect(after[0]?.qty).toBe(2); // capado a 2, no 6
  });

  it("addItemPure sin maxStock no capa (comportamiento previo)", () => {
    const start = addItemPure([], makeItem({ qty: 1 }));
    const after = addItemPure(start, makeItem({ qty: 5 }));
    expect(after[0]?.qty).toBe(6);
  });

  it("updateQtyPure respeta el tope de stock", () => {
    const a = makeItem({ qty: 1, maxStock: 3 });
    const result = updateQtyPure([a], a.productId, a.size, 10);
    expect(result[0]?.qty).toBe(3);
  });

  it("sanitización parsea y capa el maxStock guardado", () => {
    const storage = createMemoryStorage();
    storage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([
        { productId: "p1", qty: 9, price: 10, addedAt: 1, maxStock: 2 },
      ]),
    );
    const read = readCart(storage);
    expect(read[0]?.qty).toBe(2);
    expect(read[0]?.maxStock).toBe(2);
  });
});

describe("totales", () => {
  it("totalItemsPure suma qty de todas las líneas", () => {
    const items = [
      makeItem({ productId: "a", qty: 2 }),
      makeItem({ productId: "b", qty: 3 }),
    ];
    expect(totalItemsPure(items)).toBe(5);
  });

  it("totalPricePure suma price*qty sin perder precisión", () => {
    const items = [
      makeItem({ price: 21.99, qty: 1 }),
      makeItem({ productId: "b", price: 54.99, qty: 1 }),
    ];
    expect(totalPricePure(items)).toBeCloseTo(76.98, 2);
  });

  it("totalPricePure devuelve 0 con carrito vacío", () => {
    expect(totalPricePure([])).toBe(0);
  });
});

describe("readCart / writeCart con storage", () => {
  let storage: StorageLike;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it("devuelve [] si no hay nada en storage", () => {
    expect(readCart(storage)).toEqual([]);
  });

  it("persiste y recupera correctamente", () => {
    const items = [makeItem(), makeItem({ productId: "p2", size: "L" })];
    writeCart(items, storage);
    const read = readCart(storage);
    expect(read).toHaveLength(2);
    expect(read[0]?.productId).toBe("p1");
  });

  it("descarta entradas corruptas en sanitización", () => {
    storage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([
        { productId: "ok", qty: 2, price: 10, addedAt: 1 },
        { qty: 1 }, // sin productId → descartado
        "string-suelto", // tipo inválido → descartado
      ]),
    );
    const read = readCart(storage);
    expect(read).toHaveLength(1);
    expect(read[0]?.productId).toBe("ok");
  });

  it("devuelve [] si el JSON es inválido", () => {
    storage.setItem(CART_STORAGE_KEY, "no-es-json");
    expect(readCart(storage)).toEqual([]);
  });

  it("no lanza si setItem falla (quota / private mode)", () => {
    const failing: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceeded");
      },
      removeItem: () => {},
    };
    expect(() => writeCart([makeItem()], failing)).not.toThrow();
  });
});

describe("clear (vía writeCart)", () => {
  it("vacía el storage al escribir []", () => {
    const storage = createMemoryStorage();
    writeCart([makeItem()], storage);
    expect(readCart(storage)).toHaveLength(1);
    writeCart([], storage);
    expect(readCart(storage)).toHaveLength(0);
  });
});

describe("integración con localStorage del navegador", () => {
  const realWindow = (globalThis as { window?: Window }).window;

  beforeEach(() => {
    const memory = new Map<string, string>();
    const ls: Storage = {
      getItem: (k) => (memory.has(k) ? (memory.get(k) as string) : null),
      setItem: (k, v) => {
        memory.set(k, v);
      },
      removeItem: (k) => {
        memory.delete(k);
      },
      clear: () => memory.clear(),
      key: (i) => Array.from(memory.keys())[i] ?? null,
      get length() {
        return memory.size;
      },
    };
    vi.stubGlobal("window", { localStorage: ls, addEventListener: () => {} });
  });

  afterEach(() => {
    if (realWindow) {
      vi.stubGlobal("window", realWindow);
    } else {
      vi.unstubAllGlobals();
    }
  });

  it("readCart sin argumentos lee del window.localStorage", () => {
    writeCart([makeItem({ productId: "ws" })]);
    expect(readCart()).toHaveLength(1);
  });
});
