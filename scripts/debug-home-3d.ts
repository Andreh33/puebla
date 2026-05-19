import { chromium } from "playwright";
import path from "node:path";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      console.log(`[browser ${msg.type()}]`, msg.text().slice(0, 200));
    }
  });
  page.on("pageerror", (err) => {
    console.log("[browser pageerror]", err.message);
  });

  await page.goto("http://localhost:3000/", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.waitForTimeout(3000);

  // Verifica que el componente ScrollScene está montado
  const scrollSceneInfo = await page.evaluate(() => {
    const section = document.getElementById("zs-scroll3d-section") || document.querySelector('section[aria-label="Recorrido visual por Zona Sport"]');
    const canvas = document.querySelector("canvas");
    const sticky = section?.querySelector(".sticky") ?? null;
    return {
      hasSection: !!section,
      sectionHeight: section?.getBoundingClientRect().height ?? 0,
      sectionStyleHeight: section instanceof HTMLElement ? section.style.height : null,
      hasCanvas: !!canvas,
      canvasWidth: canvas?.getBoundingClientRect().width ?? 0,
      canvasHeight: canvas?.getBoundingClientRect().height ?? 0,
      hasSticky: !!sticky,
      stickyTop: sticky instanceof HTMLElement ? sticky.style.top : null,
    };
  });
  console.log("\n=== Estado del componente ScrollScene ===");
  console.log(JSON.stringify(scrollSceneInfo, null, 2));

  // Screenshot del top de la home (lo que el user ve primero)
  await page.screenshot({
    path: path.join(__dirname, "..", "debug-home-top.png"),
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });
  console.log("\n✓ Screenshot top home guardado en debug-home-top.png");

  // Scroll a la mitad del scroll3d
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(__dirname, "..", "debug-home-scroll1.png"),
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });
  console.log("✓ Screenshot scroll1");

  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(__dirname, "..", "debug-home-scroll2.png"),
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });
  console.log("✓ Screenshot scroll2");

  await browser.close();
}

main().catch(console.error);
