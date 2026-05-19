import { chromium } from "playwright";
import path from "node:path";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Simulate slow 3G to make loader stay visible longer
  // Sin throttling — velocidad normal del dev server

  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 60_000 });
  // Captura inmediata: aún descargando GLB
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(__dirname, "..", "debug-loader-immediate.png"),
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });
  console.log("✓ Screenshot inmediato");

  // Captura tras unos segundos: loader debería seguir si GLB aún descarga
  await page.waitForTimeout(2500);
  await page.screenshot({
    path: path.join(__dirname, "..", "debug-loader-mid.png"),
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });
  console.log("✓ Screenshot intermedio");

  // Tras suficiente tiempo: loaded
  await page.waitForTimeout(10_000);
  await page.screenshot({
    path: path.join(__dirname, "..", "debug-loader-done.png"),
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });
  console.log("✓ Screenshot final");

  await browser.close();
}

main().catch(console.error);
