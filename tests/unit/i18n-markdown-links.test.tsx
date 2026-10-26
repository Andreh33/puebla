import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarkdownRenderer } from "@/components/public/MarkdownRenderer";
beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => vi.unstubAllGlobals());
describe("localized editorial Markdown links", () => {
  it("keeps a French shopping journey in French while preserving external sources and anchors", () => {
    const html = renderToStaticMarkup(
      MarkdownRenderer({
        locale: "fr",
        source:
          "[Achat](/producto/modelo?q=1#foto) [Source](https://www.dgt.es/guide) [Email](mailto:hola@example.com) [Section](#section) [Photo](/photos/a.webp)",
      }),
    );
    expect(html).toContain('href="/fr/producto/modelo?q=1#foto"');
    expect(html).toContain('href="https://www.dgt.es/guide"');
    expect(html).toContain('href="mailto:hola@example.com"');
    expect(html).toContain('href="#section"');
    expect(html).toContain('href="/photos/a.webp"');
  });
});
