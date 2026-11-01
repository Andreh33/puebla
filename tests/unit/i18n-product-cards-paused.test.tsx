import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/public/LocaleProvider";
import { ProductCard } from "@/components/public/ProductCard";
import { ProductCardLuxe } from "@/components/public/ProductCardLuxe";
beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => vi.unstubAllGlobals());
it.each([ProductCard, ProductCardLuxe])("preserves Spanish product names and colors even if they match native UI keys", (Card) => {
  const dictionary = new Proxy({ Zapatilla: "Chaussure", Azul: "Bleu" } as Record<string, string>, {
    get: (target, key: string) => target[key] ?? `FR ${key}`,
  });
  const html = renderToStaticMarkup(
    <LocaleProvider locale="fr" dictionary={dictionary}>
      <Card product={{ id: "p1", slug: "shoe", name: "Zapatilla", colorName: "Azul", retailPrice: 49.5 }} />
    </LocaleProvider>,
  );
  expect(html).toContain('href="/producto/shoe"');
  expect(html).toContain(">Zapatilla<");
  expect(html).toContain(">Azul<");
  expect(html).not.toContain("Chaussure");
  expect(html).not.toContain("Bleu");
  expect(html).toContain("FR Sin imagen");
});
