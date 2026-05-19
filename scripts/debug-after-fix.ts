import { chromium } from "playwright";
import path from "node:path";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 150)));

  await page.goto("http://localhost:3000/", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.waitForTimeout(3500);
  await page.screenshot({
    path: path.join(__dirname, "..", "debug-after-fix.png"),
    fullPage: true,
  });

  const heros = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("h1, h2"))
      .slice(0, 10)
      .map((h) => `${h.tagName}: ${(h.textContent || "").trim().slice(0, 70)}`);
  });
  console.log("Headings principales:");
  heros.forEach((h, i) => console.log(`  ${i + 1}. ${h}`));
  console.log(`\nErrores en página: ${errors.length}`);
  errors.forEach((e) => console.log(`  · ${e}`));

  await browser.close();
}

main().catch(console.error);
