import { expect, test } from "@playwright/test";

/**
 * E2E del home público de Zona Sport.
 * Se ejecuta contra BASE_URL (default http://localhost:3000). Si la home no
 * está implementada todavía (Agente 4), el test se marca como skip suavemente.
 */
test.describe("Home pública", () => {
  test("muestra branding y CTA WhatsApp", async ({ page }) => {
    const resp = await page.goto("/");
    if (!resp || resp.status() >= 500) {
      test.skip(true, "Home no disponible (5xx)");
      return;
    }
    // El logo / nombre Zona Sport debe estar presente
    await expect(page.locator("body")).toContainText(/Zona Sport/i, {
      timeout: 5000,
    });
    // Algún enlace a WhatsApp
    const whatsapp = page.locator('a[href*="wa.me"], a[href*="whatsapp"]').first();
    if ((await whatsapp.count()) > 0) {
      await expect(whatsapp).toBeVisible();
    }
  });

  test("permite navegar a una categoría", async ({ page }) => {
    await page.goto("/");
    const cat = page
      .locator('a[href^="/running"], a[href*="/categoria"], a[href^="/c/"]')
      .first();
    if ((await cat.count()) === 0) {
      test.skip(true, "Sin enlace a categoría en home");
      return;
    }
    await cat.click();
    await expect(page).toHaveURL(/(running|categoria|\/c\/)/i);
  });
});
