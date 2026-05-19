import { chromium } from "playwright";
import path from "node:path";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:3000/", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.waitForTimeout(4500);
  const info = await page.evaluate(() => {
    const probe = document.createElement("canvas");
    const gl =
      probe.getContext("webgl2") ||
      probe.getContext("webgl") ||
      probe.getContext("experimental-webgl");
    const webglWorks = !!gl;

    const sections = Array.from(document.querySelectorAll("section")).map((s) => ({
      cls: (s.className || "").slice(0, 80),
      ariaLabel: s.getAttribute("aria-label"),
      text: (s.textContent || "").slice(0, 60).replace(/\s+/g, " ").trim(),
    }));

    return {
      webglWorks,
      canvasCount: document.querySelectorAll("canvas").length,
      has3dSection: !!document.querySelector('[aria-label="Recorrido visual por Zona Sport"]'),
      sectionsCount: sections.length,
      firstSections: sections.slice(0, 6),
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({
    path: path.join(__dirname, "..", "debug-3d-now.png"),
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });
  await browser.close();
}
main().catch(console.error);
