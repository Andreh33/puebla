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

    const cbInfo = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[role="checkbox"]')).map((b) => {
        const id = b.id;
        const labelFor = id ? document.querySelector(`label[for="${id}"]`) : null;
        const labelText = labelFor?.textContent?.trim();
        const wrappingLabel = b.closest("label");
        return {
          id,
          hasLabelFor: !!labelFor,
          labelText,
          hasWrappingLabel: !!wrappingLabel,
          ariaLabel: b.getAttribute("aria-label"),
        };
      });
    });
    console.log(`\n=== ${path} ===`);
    cbInfo.forEach((cb, i) => console.log(`  ${i + 1}.`, JSON.stringify(cb)));
  }

  await browser.close();
}

main().catch(console.error);
