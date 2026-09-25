// deck.html -> deck.pdf (one 1920x1080 page per section) + png/NN-<id>.png per slide.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Browser } from "playwright";
import { ensureDir } from "../core/io.ts";

export async function exportDeck(browser: Browser, deckHtml: string): Promise<{ pdf: string; pngs: string[] }> {
  const dir = path.dirname(deckHtml);
  const pdf = path.join(dir, "deck.pdf");
  const pngDir = path.join(dir, "png");
  fs.rmSync(pngDir, { recursive: true, force: true });
  ensureDir(pngDir);
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  try {
    await page.goto(pathToFileURL(deckHtml).href, { waitUntil: "load" });
    await page.evaluate("document.fonts ? document.fonts.ready.then(() => true) : true"); // bundled fonts before PDF/PNG
    await page.pdf({ path: pdf, width: "1920px", height: "1080px", printBackground: true });
    await page.emulateMedia({ media: "print" }); // print CSS renders every slide at 1:1, no gaps
    const sections = page.locator("section.slide");
    const n = await sections.count();
    const pngs: string[] = [];
    for (let i = 0; i < n; i++) {
      const id = (await sections.nth(i).getAttribute("id")) ?? `slide-${i + 1}`;
      const file = path.join(pngDir, `${String(i + 1).padStart(2, "0")}-${id.replace(/[^A-Za-z0-9_-]+/g, "_")}.png`);
      await sections.nth(i).screenshot({ path: file });
      pngs.push(file);
    }
    return { pdf, pngs };
  } finally {
    await page.close();
  }
}
