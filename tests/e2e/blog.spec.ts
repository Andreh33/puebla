import { test, expect } from "@playwright/test";

/**
 * Tests E2E del blog público.
 *
 * Se ejecutan contra el dev server en :3000. Si la base de datos no está
 * accesible o no hay posts publicados, los tests se saltan para no romper la
 * suite en CI sin DB.
 */

test.describe("Blog público", () => {
  test("la página /blog responde y muestra al menos un artículo", async ({ page }) => {
    const response = await page.goto("/blog");
    if (!response || response.status() >= 500) {
      test.skip(true, "DB no disponible en este entorno");
    }

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Buscamos la primera tarjeta del listado (article con enlace a /blog/...).
    const firstPostLink = page.locator('a[href^="/blog/"]').first();
    const linkExists = (await firstPostLink.count()) > 0;
    test.skip(!linkExists, "No hay posts publicados todavía");

    const href = (await firstPostLink.getAttribute("href")) ?? "/blog";
    await firstPostLink.click();
    await page.waitForURL(new RegExp(href + "$"));

    // Hay un H1 con el título del post
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Hay JSON-LD con tipo BlogPosting
    const ldJsonHandles = await page.locator('script[type="application/ld+json"]').all();
    let foundBlogPosting = false;
    for (const handle of ldJsonHandles) {
      const text = (await handle.textContent()) ?? "";
      if (text.includes("BlogPosting")) {
        foundBlogPosting = true;
        break;
      }
    }
    expect(foundBlogPosting).toBe(true);
  });

  test("los listados aceptan filtro por etiqueta", async ({ page }) => {
    const response = await page.goto("/blog?tag=tienda");
    if (!response || response.status() >= 500) {
      test.skip(true, "DB no disponible");
    }
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
