// Renderiza el fallback estático forzando WebGL OFF via Chromium flag
import { chromium } from "playwright";
import path from "node:path";

async function main() {
  const browser = await chromium.launch({
    args: ["--disable-webgl", "--disable-webgl2"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:3000/", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: path.join(__dirname, "..", "debug-fallback.png"),
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  });
  console.log("✓ debug-fallback.png");

  await browser.close();
}
main().catch(console.error);
