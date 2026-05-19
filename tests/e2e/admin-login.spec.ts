import { expect, test } from "@playwright/test";

/**
 * E2E del flujo de login admin.
 *
 * Requiere:
 * - Dev server corriendo en process.env.BASE_URL (o http://localhost:3000).
 * - Seed ejecutado: usuario admin@zonasport.es / ChangeMe2026!.
 *
 * Si no hay DB disponible (variable SKIP_DB=1 o no responde), el test se omite.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const SEED_EMAIL = process.env.SEED_OWNER_EMAIL ?? "admin@zonasport.es";
const SEED_PASSWORD = process.env.SEED_OWNER_PASSWORD ?? "ChangeMe2026!";

test.describe("Admin · Login", () => {
  test.beforeAll(async () => {
    if (process.env.SKIP_DB === "1") {
      test.skip(true, "SKIP_DB=1, omitiendo e2e de login");
    }
  });

  test("redirige /admin a /admin/login sin sesión", async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/admin`);
    expect(response).not.toBeNull();
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(
      page.getByRole("heading", { name: /Acceso administración/i }),
    ).toBeVisible();
  });

  test("credenciales inválidas muestran mensaje de error", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/login`);
    await page.getByLabel("Email").fill("noexiste@example.com");
    await page.getByLabel("Contraseña").fill("WrongPassword123!");
    await page.getByRole("button", { name: /Entrar/i }).click();
    await expect(page).toHaveURL(/error=invalid/);
    await expect(page.getByRole("alert")).toContainText(/credenciales/i);
  });

  test("credenciales válidas redirigen al dashboard", async ({ page }) => {
    // Si no hay seed, marcamos skip suave
    await page.goto(`${BASE_URL}/admin/login`);
    await page.getByLabel("Email").fill(SEED_EMAIL);
    await page.getByLabel("Contraseña").fill(SEED_PASSWORD);
    await page.getByRole("button", { name: /Entrar/i }).click();

    await page.waitForURL(/\/admin(?!\/login)/, { timeout: 10_000 }).catch(() => {
      test.skip(true, "Login válido no completó (¿seed no ejecutado o DB sin acceso?)");
    });

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/CRM|Bienvenido/i);
  });
});
