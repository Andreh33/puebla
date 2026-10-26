import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/public/LocaleProvider";
import { GenderHero } from "@/components/public/GenderHero";
import { GenderHub } from "@/components/public/GenderHub";
import { EmptyState } from "@/components/public/EmptyState";
import { getClientDictionary } from "@/lib/i18n/dictionaries";

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => vi.unstubAllGlobals());

it("translates the complete gender headline before splitting its animated words", () => {
  const dictionary = getClientDictionary("fr");
  const html = renderToStaticMarkup(<LocaleProvider locale="fr" dictionary={dictionary}><GenderHero gender="hombre" /></LocaleProvider>);
  const heading = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)![1]!.replace(/<\/span>/g," ").replace(/<[^>]*>/g,"").replace(/\s+/g," ").trim();
  expect(heading).toBe(dictionary["Equipación para entrenar, competir y disfrutar."]);
  expect(heading).not.toContain("Equipación");
});

it("keeps native shopping links and translated buying/empty-state labels with the real client dictionary", () => {
  const dictionary = getClientDictionary("fr");
  const html = renderToStaticMarkup(<LocaleProvider locale="fr" dictionary={dictionary}><GenderHub seccion="hombre" /><EmptyState variant="no-products" /></LocaleProvider>);
  expect(html).toContain('href="/fr/hombre/textil"');
  expect(html).toContain(dictionary["No hay productos con esos filtros"]);
  expect(html).toContain(dictionary["Quita algún filtro o explora otra categoría para inspirarte."]);
  expect(html).toContain("Découvrir :");
  expect(html).not.toContain("Ver textil");
});
