import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { StoreEditorial } from "@/components/public/home/StoreEditorial";
import { HeroLuxe } from "@/components/public/HeroLuxe";
beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => vi.unstubAllGlobals());
it("preserves real curly quote and nonbreaking-space typography after localization", () => {
  const html = renderToStaticMarkup(
    <>
      <StoreEditorial locale="es" />
      <HeroLuxe primaryHref="/catalogo" />
    </>,
  );
  expect(html).toContain("“");
  expect(html).toContain("”");
  expect(html).toContain("\u00a0");
  expect(html).not.toMatch(/&amp;(?:ldquo|rdquo|nbsp|laquo|raquo);/);
});
