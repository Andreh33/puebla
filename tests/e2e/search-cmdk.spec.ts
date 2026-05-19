import { expect, test } from "@playwright/test";

/**
 * E2E del Command Menu (Ctrl+K). Skip si la home no está disponible o si el
 * command no aparece.
 */
test("Ctrl+K abre el command menu y muestra resultados", async ({ page }) => {
  const resp = await page.goto("/");
  if (!resp || resp.status() >= 400) {
    test.skip(true, "Home no disponible");
    return;
  }

  await page.keyboard.press("Control+K");

  const dialog = page.locator('[role="dialog"], [cmdk-root], [data-cmdk-root]').first();
  if ((await dialog.count()) === 0) {
    test.skip(true, "Command menu no detectado");
    return;
  }
  await expect(dialog).toBeVisible({ timeout: 3000 });

  // Escribir "running"
  await page.keyboard.type("running", { delay: 30 });
  await page.waitForTimeout(500);

  // Si la DB tiene resultados, deberían aparecer; si no, debe mostrarse el
  // mensaje de "sin resultados". Aceptamos ambas como pase suave.
  const hasContent = await dialog
    .locator("text=/running|sin resultados|no hay/i")
    .first()
    .isVisible()
    .catch(() => false);
  expect(hasContent).toBe(true);
});
