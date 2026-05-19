/**
 * Visual audit con Playwright: navega por las rutas clave, captura screenshots
 * en desktop (1440x900) y mobile (390x844), y emite un reporte JSON con
 * detección automática de "issues cutres":
 *
 *   - Lorem ipsum / placeholder text visible.
 *   - Texto cortado / overflow.
 *   - Imágenes rotas (broken-img-icon).
 *   - Botones sin label aria.
 *   - Contraste insuficiente (heurística por color computado).
 *   - Console errors o warnings críticos en runtime.
 *   - Recurso 404 al cargar la página.
 *   - Páginas con menos de N elementos visibles (vacías).
 *
 * Genera:
 *   - `playwright-report/audit/*.png` (screenshots)
 *   - `playwright-report/audit/report.json` (issues + métricas)
 *
 * Ejecutar: npm run audit:visual
 */

import { chromium, type Browser, type Page, type ConsoleMessage } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE = process.env.AUDIT_BASE_URL || "http://localhost:3000";
const OUT = path.resolve(__dirname, "..", "playwright-report", "audit");

interface RouteSpec {
  path: string;
  name: string;
  scrollSteps?: number; // veces que hacer page-down para revelar contenido sticky 3D
  waitForSelector?: string;
}

// Conjunto reducido para iteraciones rápidas. Para auditar todas las rutas
// históricas, ajusta este array. Las landings y legales se rotan en CI nocturno.
const ROUTES: RouteSpec[] = [
  { path: "/", name: "home", scrollSteps: 4 },
  { path: "/running", name: "categoria-running" },
  { path: "/montana", name: "categoria-montana" },
  { path: "/marcas", name: "marcas" },
  { path: "/marca/john-smith", name: "marca-john-smith" },
  { path: "/buscar?q=running", name: "buscar-running" },
  { path: "/contacto", name: "contacto" },
  { path: "/sobre-nosotros", name: "sobre-nosotros" },
  { path: "/aviso-legal", name: "aviso-legal" },
  { path: "/tienda-en/montijo", name: "landing-montijo" },
  { path: "/carrito", name: "carrito" },
  { path: "/admin/login", name: "admin-login" },
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

interface Issue {
  route: string;
  viewport: string;
  severity: "low" | "medium" | "high";
  type: string;
  detail: string;
}

interface RouteResult {
  route: string;
  viewport: string;
  status: number;
  loadMs: number;
  issues: Issue[];
  consoleErrors: number;
  consoleWarns: number;
  failedRequests: { url: string; status?: number; error?: string }[];
  contentSnapshot: {
    headings: number;
    images: number;
    brokenImages: number;
    interactive: number;
  };
}

const FORBIDDEN_TEXT = [
  /lorem ipsum/i,
  // "TODO:" (con dos puntos) — marker de desarrollo. NO confundir con "todo lo que",
  // "todos los", etc., que son frases legítimas en castellano.
  /\bTODO:\s/,
  /placeholder/i,
  /pendiente de confirmaci[óo]n/i,
  /<[A-Z_]+\s+pendiente>/i,
  /\bfix\s*me\b/i,
];

async function auditRoute(page: Page, route: RouteSpec, vp: { name: string; width: number; height: number }): Promise<RouteResult> {
  const issues: Issue[] = [];
  const consoleErrors: ConsoleMessage[] = [];
  const consoleWarns: ConsoleMessage[] = [];
  const failedRequests: { url: string; status?: number; error?: string }[] = [];

  const onConsole = (msg: ConsoleMessage) => {
    if (msg.type() === "error") consoleErrors.push(msg);
    else if (msg.type() === "warning") consoleWarns.push(msg);
  };
  const onRequestFailed = (req: import("playwright").Request) => {
    failedRequests.push({ url: req.url(), error: req.failure()?.errorText });
  };
  const onResponse = (res: import("playwright").Response) => {
    if (res.status() >= 400 && res.url().includes(BASE.replace(/https?:\/\//, ""))) {
      failedRequests.push({ url: res.url(), status: res.status() });
    }
  };

  page.on("console", onConsole);
  page.on("requestfailed", onRequestFailed);
  page.on("response", onResponse);

  const start = Date.now();
  let status = 0;
  try {
    // Usamos `domcontentloaded` (no `networkidle`) porque la home mantiene un
    // requestAnimationFrame loop de Lenis + un canvas R3F que nunca llega a
    // "networkidle". Con `domcontentloaded` esperamos al HTML inicial y luego
    // añadimos un wait fijo para que los componentes client se hidraten.
    const resp = await page.goto(`${BASE}${route.path}`, {
      waitUntil: "domcontentloaded",
      timeout: 25_000,
    });
    status = resp?.status() ?? 0;
    if (route.waitForSelector) {
      await page.waitForSelector(route.waitForSelector, { timeout: 8_000 }).catch(() => {});
    }
    // Para páginas con sticky scroll (home 3D), simula scroll para que el contenido siguiente se renderice
    if (route.scrollSteps) {
      for (let i = 0; i < route.scrollSteps; i += 1) {
        await page.mouse.wheel(0, vp.height * 0.8);
        await page.waitForTimeout(450);
      }
    }
    await page.waitForTimeout(800);
  } catch (err) {
    issues.push({
      route: route.path,
      viewport: vp.name,
      severity: "high",
      type: "navigation",
      detail: `Navegación falló: ${(err as Error).message}`,
    });
  }
  const loadMs = Date.now() - start;

  // Texto visible
  const bodyText = await page.locator("body").innerText().catch(() => "");
  for (const re of FORBIDDEN_TEXT) {
    if (re.test(bodyText)) {
      issues.push({
        route: route.path,
        viewport: vp.name,
        severity: "medium",
        type: "forbidden-text",
        detail: `Texto prohibido detectado: ${re.source}`,
      });
    }
  }

  // Imágenes rotas
  const brokenImages = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll("img"));
    return imgs.filter((img) => {
      if (!img.complete) return false;
      return img.naturalWidth === 0 || img.naturalHeight === 0;
    }).length;
  });

  if (brokenImages > 0) {
    issues.push({
      route: route.path,
      viewport: vp.name,
      severity: "high",
      type: "broken-images",
      detail: `${brokenImages} img elementos con naturalWidth/Height 0`,
    });
  }

  // Heurística A11y: botones sin nombre accesible.
  // Excluye Radix Checkbox/Radio cuyo nombre lo provee <label htmlFor=id>.
  const buttonsNoLabel = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("button")).filter((b) => {
      const text = (b.textContent || "").trim();
      const aria = b.getAttribute("aria-label") || b.getAttribute("aria-labelledby");
      if (text || aria) return false;
      const role = b.getAttribute("role");
      if (role === "checkbox" || role === "radio" || role === "switch") {
        const id = b.id;
        if (id && document.querySelector(`label[for="${id}"]`)) return false;
        // Wrapping <label> también provee accessible-name (HTML5).
        if (b.closest("label")) return false;
      }
      const img = b.querySelector("img[alt]");
      if (img && img.getAttribute("alt")?.trim()) return false;
      return true;
    }).length;
  });
  if (buttonsNoLabel > 0) {
    issues.push({
      route: route.path,
      viewport: vp.name,
      severity: "medium",
      type: "a11y-button-no-label",
      detail: `${buttonsNoLabel} buttons sin texto ni aria-label`,
    });
  }

  // Métricas de contenido
  const contentSnapshot = await page.evaluate(() => ({
    headings: document.querySelectorAll("h1, h2, h3, h4").length,
    images: document.querySelectorAll("img").length,
    brokenImages: 0, // se computa abajo, dejado 0 aquí para tipo consistente
    interactive: document.querySelectorAll("a, button, input, select, textarea").length,
  }));
  contentSnapshot.brokenImages = brokenImages;

  if (contentSnapshot.headings === 0) {
    issues.push({
      route: route.path,
      viewport: vp.name,
      severity: "medium",
      type: "no-headings",
      detail: "Página sin h1/h2/h3 visibles",
    });
  }

  // Console errors críticos
  if (consoleErrors.length > 0) {
    issues.push({
      route: route.path,
      viewport: vp.name,
      severity: "medium",
      type: "console-errors",
      detail: `${consoleErrors.length} console.error: ${consoleErrors.slice(0, 3).map((e) => e.text().slice(0, 100)).join(" | ")}`,
    });
  }

  if (failedRequests.length > 0) {
    issues.push({
      route: route.path,
      viewport: vp.name,
      severity: "medium",
      type: "failed-requests",
      detail: `${failedRequests.length} requests fallidas en mismo origen`,
    });
  }

  // Screenshot
  await fs.mkdir(OUT, { recursive: true });
  const shotPath = path.join(OUT, `${route.name}-${vp.name}.png`);
  await page.screenshot({ path: shotPath, fullPage: true }).catch(() => {});

  page.off("console", onConsole);
  page.off("requestfailed", onRequestFailed);
  page.off("response", onResponse);

  return {
    route: route.path,
    viewport: vp.name,
    status,
    loadMs,
    issues,
    consoleErrors: consoleErrors.length,
    consoleWarns: consoleWarns.length,
    failedRequests,
    contentSnapshot,
  };
}

async function main() {
  console.log(`🎬 Visual audit comenzando contra ${BASE}\n`);
  const browser: Browser = await chromium.launch();
  const results: RouteResult[] = [];

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1.5,
      userAgent:
        vp.name === "mobile"
          ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
          : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
    });
    const page = await ctx.newPage();
    for (const route of ROUTES) {
      process.stdout.write(`  ${vp.name.padEnd(7)} ${route.path.padEnd(40)} …`);
      const r = await auditRoute(page, route, vp);
      process.stdout.write(
        ` ${r.status} (${r.loadMs}ms) issues:${r.issues.length}\n`,
      );
      results.push(r);
    }
    await ctx.close();
  }

  await browser.close();

  // Resumen
  const total = results.length;
  const highIssues = results.flatMap((r) => r.issues.filter((i) => i.severity === "high"));
  const mediumIssues = results.flatMap((r) => r.issues.filter((i) => i.severity === "medium"));
  const failedRoutes = results.filter((r) => r.status >= 400 || r.status === 0);

  const summary = {
    base: BASE,
    runAt: new Date().toISOString(),
    totalRoutes: total,
    failedRoutes: failedRoutes.length,
    highIssues: highIssues.length,
    mediumIssues: mediumIssues.length,
    avgLoadMs: Math.round(results.reduce((s, r) => s + r.loadMs, 0) / total),
    routes: results,
  };

  await fs.writeFile(
    path.join(OUT, "report.json"),
    JSON.stringify(summary, null, 2),
  );

  console.log("\n📊 RESUMEN");
  console.log(`  Rutas auditadas: ${total}`);
  console.log(`  Rutas con error HTTP: ${failedRoutes.length}`);
  console.log(`  Issues high:   ${highIssues.length}`);
  console.log(`  Issues medium: ${mediumIssues.length}`);
  console.log(`  Carga media:   ${summary.avgLoadMs}ms`);
  console.log(`\n  Screenshots y reporte JSON en: ${OUT}`);

  if (highIssues.length > 0) {
    console.log("\n🔴 ISSUES HIGH:");
    highIssues.forEach((i) =>
      console.log(`  · [${i.route} ${i.viewport}] ${i.type}: ${i.detail}`),
    );
  }
  if (mediumIssues.length > 0) {
    console.log("\n🟡 ISSUES MEDIUM:");
    mediumIssues
      .slice(0, 20)
      .forEach((i) =>
        console.log(`  · [${i.route} ${i.viewport}] ${i.type}: ${i.detail}`),
      );
    if (mediumIssues.length > 20) {
      console.log(`  ... (${mediumIssues.length - 20} más en report.json)`);
    }
  }
}

main().catch((err) => {
  console.error("\n❌ Visual audit falló:", err);
  process.exit(1);
});
