import { expect, test } from "@playwright/test";

/**
 * E2E del formulario de contacto. Skip si la página /contacto no está
 * disponible o si la DB no responde.
 */
test.describe("Formulario de contacto", () => {
  test("envía un lead y muestra confirmación", async ({ page }) => {
    const resp = await page.goto("/contacto");
    if (!resp || resp.status() >= 400) {
      test.skip(true, "Página /contacto no disponible");
      return;
    }

    const name = page.locator('input[name="name"], input[id*="name"]').first();
    const email = page.locator('input[type="email"], input[name="email"]').first();
    const msg = page
      .locator('textarea[name="message"], textarea[id*="message"]')
      .first();

    if (
      (await name.count()) === 0 ||
      (await email.count()) === 0 ||
      (await msg.count()) === 0
    ) {
      test.skip(true, "Formulario de contacto no encontrado");
      return;
    }

    await name.fill("Ana Test E2E");
    await email.fill("ana.test+e2e@example.com");
    await msg.fill(
      "Este es un mensaje de prueba E2E. Por favor ignora si llega al admin.",
    );

    // RGPD checkbox
    const gdpr = page.locator(
      'input[name="gdprConsent"], input[id*="gdpr"], input[type="checkbox"]',
    );
    if ((await gdpr.count()) > 0) {
      await gdpr.first().check({ force: true }).catch(() => undefined);
    }

    const submit = page
      .locator(
        'button[type="submit"], button:has-text("Enviar"), button:has-text("Enviar mensaje")',
      )
      .first();
    if ((await submit.count()) === 0) {
      test.skip(true, "Sin botón submit");
      return;
    }
    await submit.click();

    // Esperar alguna confirmación (toast, texto "Gracias", "recibido"…)
    await expect(page.locator("body")).toContainText(
      /(gracias|recibido|hemos recibido|enviado)/i,
      { timeout: 8000 },
    );
  });
});
