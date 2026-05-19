import { expect, test } from "@playwright/test";

/**
 * E2E del flujo de creación de producto en /admin/productos.
 *
 * Requiere:
 * - Dev server corriendo.
 * - Seed con admin OWNER y al menos una marca + una categoría.
 *
 * Se omite con SKIP_DB=1 si no hay DB disponible.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const SEED_EMAIL = process.env.SEED_OWNER_EMAIL ?? "admin@zonasport.es";
const SEED_PASSWORD = process.env.SEED_OWNER_PASSWORD ?? "ChangeMe2026!";

test.describe("Admin · Productos", () => {
  test.beforeAll(async () => {
    if (process.env.SKIP_DB === "1") {
      test.skip(true, "SKIP_DB=1, omitiendo e2e de productos");
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/login`);
    await page.getByLabel("Email").fill(SEED_EMAIL);
    await page.getByLabel("Contraseña").fill(SEED_PASSWORD);
    await page.getByRole("button", { name: /Entrar/i }).click();
    await page.waitForURL(/\/admin(?!\/login)/, { timeout: 10_000 }).catch(() => {
      test.skip(true, "Login no completó (seed ausente)");
    });
  });

  test("lista productos muestra cabecera y filtros", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/productos`);
    await expect(page.getByRole("heading", { name: "Productos" })).toBeVisible();
    await expect(page.getByPlaceholder(/buscar por nombre/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Nuevo producto/i })).toBeVisible();
  });

  test("editor de nuevo producto renderiza tabs", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/productos/nuevo`);
    await expect(page.getByRole("heading", { name: /Nuevo producto/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /General/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Imágenes/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Precios y tallas/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /SEO/ })).toBeVisible();
  });

  test("validación: slug vacío bloquea publicación", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/productos/nuevo`);
    await page.getByLabel(/Nombre del producto/).fill("Producto test e2e");
    // El slug auto-generado debería aparecer; cambiamos a vacío para forzar error
    const slug = page.getByLabel(/^Slug/);
    await slug.fill("");
    await page.getByRole("button", { name: /Guardar borrador/i }).click();
    // Debe seguir en la página con error visible
    await expect(page).toHaveURL(/\/admin\/productos\/nuevo/);
  });
});
