import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  for (const path of ["/running", "/contacto"]) {
    await page.goto(`http://localhost:3000${path}`, {
      waitUntil: "domcontentloaded",
      timeout: 25_000,
    });
    await page.waitForTimeout(1500);

    const buttons = await page.evaluate(() => {
      const list = Array.from(document.querySelectorAll("button"));
      return list
        .map((b) => {
          const text = (b.textContent || "").trim();
          const aria = b.getAttribute("aria-label") || b.getAttribute("aria-labelledby");
          if (text || aria) return null;
          // Captura HTML truncado del botón problemático
          const html = b.outerHTML.slice(0, 220).replace(/\s+/g, " ");
          const rect = b.getBoundingClientRect();
          return { html, x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) };
        })
        .filter(Boolean);
    });

    console.log(`\n=== ${path} ===`);
    if (buttons.length === 0) {
      console.log("  (sin issues)");
    } else {
      buttons.forEach((b, i) => {
        if (!b) return;
        console.log(`  ${i + 1}. [${b.x},${b.y} ${b.w}x${b.h}] ${b.html}`);
      });
    }
  }

  await browser.close();
}

main().catch(console.error);
