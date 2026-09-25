// Goal 4: one flow slide (and one details slide) for EVERY proposal whose final verdict is SHIP.
//   variant HTML per patch entry (model, stubbed to the runtime default)
//   -> buildMock with the SHIP patches (deterministic)
//   -> Playwright drives the patched mock through the five storyboard phases (deterministic)
//   -> deck.html (1920x1080 sections) -> deck.pdf + png/NN-*.png
// Reads only the model directory, the mock/qa outputs, its own inputs (candidates, judgments) and
// the KB headings (to name cited precedents).
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { chromium } from "playwright";
import { ROOT } from "../core/config.ts";
import { ensureDir, rel, writeText } from "../core/io.ts";
import type { StageCtx } from "../core/run.ts";
import type { Candidates, Judgments, ProductModel, Proposal } from "../core/schema.ts";
import { trace } from "../core/trace.ts";
import { buildMock } from "../mock/build.ts";
import { proposalEconomics } from "../model/economics.ts";
import { readQa, rollupCost } from "../report/data.ts";
import { captureFlow } from "./capture.ts";
import { renderDeck, type FlowInput } from "./deck.ts";
import { exportDeck } from "./export.ts";
import {
  accentOf, claimOf, declineTarget, econTable, judgeChanges, latestFinals, moneyToday, normalizeStoryboard, resourceOf, screenName, shipped, surfaceLabel, unitOf, whyBullets,
} from "./facts.ts";
import { integrationSnippet } from "./integration.ts";
import { variantFragments, type Fragment } from "./variants.ts";

export async function buildSlides(c: StageCtx, m: ProductModel, modelDir: string, cands: Candidates, j: Judgments): Promise<{ deckHtml: string; pdf: string }> {
  const outDir = ensureDir(c.paths.slides);
  // Start from a clean image folder so a proposal that no longer ships leaves no stale frames behind.
  fs.rmSync(path.join(outDir, "img"), { recursive: true, force: true });

  const ships = shipped(cands, j);
  const missing = latestFinals(j).filter(f => f.verdict === "SHIP" && !ships.some(s => s.p.id === f.proposalId));
  for (const f of missing) trace("failure", { where: "slides:select", error: `SHIP ${f.proposalId} v${f.version} has no proposal text in candidates.json; it cannot get a flow slide` });
  trace("decision", {
    stage: "slides", ships: ships.map(s => s.p.id),
    why: ships.length ? "every final SHIP gets a flow slide; REVISE is never promoted" : "no final SHIP: the deck says so and lists every idea in the review table",
  });

  // 1. Variant screens, then one patched mock carrying every SHIP proposal.
  const patches: { proposal: Proposal; html: Fragment[] }[] = [];
  for (const { p } of ships) patches.push({ proposal: p, html: await variantFragments(p, m, c.paths.mock) });
  let indexHtml: string | null = null;
  if (ships.length) {
    try {
      indexHtml = buildMock(m, modelDir, c.paths.mock, { proposals: patches });
    } catch (e) {
      trace("failure", { where: "slides:buildMock", error: String((e as Error)?.message ?? e).slice(0, 300) });
      trace("recovery", { how: "flow frames fall back to the real screenshots from the model directory" });
    }
  }

  const browser = await chromium.launch();
  try {
    // 2. Captures, one flow at a time (each phase gets a fresh browser context).
    const flows: FlowInput[] = [];
    for (const { p, f } of ships) {
      const story = normalizeStoryboard(p, m);
      const frames = await captureFlow({ browser, indexHtml, p, story, m, modelDir, slidesDir: outDir });
      const econ = proposalEconomics(p, m);
      const offer = story.find(s => s.phase === "offer")!;
      const res = resourceOf(m, p.reward.resource);
      flows.push({
        p, f, econ, frames,
        claim: claimOf(p),
        declineTo: declineTarget(p, m, offer.screen),
        surfaceName: surfaceLabel(p, m),
        protoHref: `${rel(outDir, indexHtml ?? path.join(c.paths.mock, "index.html"))}?proposal=${encodeURIComponent(p.id)}`,
        snippet: integrationSnippet(p, { surfaceName: surfaceLabel(p, m).replace(/\s*\(new [^)]*\)$/, ""), resourceName: res ? unitOf(res) : undefined }),
        changes: judgeChanges(p, cands, j),
        why: whyBullets(p, m, econ),
        econRows: econTable(p, m, econ),
        precedents: p.precedents.map(id => ({ id: id.replace(/[[\]]/g, ""), title: kbTitles().get(id.replace(/[[\]]/g, "")) ?? "" })),
      });
      trace("info", { stage: "slides", proposal: p.id, frames: frames.map(x => `${x.phase}:${x.source}`), pins: frames.reduce((a, x) => a + x.callouts.filter(k => k.box).length, 0) });
    }

    // 3. The deck: real screenshots for "how it makes money today", captures for the flows.
    const html = renderDeck({
      m, cands, j, flows, accent: accentOf(m), shots: await moneyShots(m, modelDir, outDir),
      qa: readQa(path.join(c.paths.qa, "summary.json")), cost: rollupCost(c.paths.cost),
    });
    const deckHtml = path.join(outDir, "deck.html");
    writeText(deckHtml, html);
    copyFonts(outDir);

    // 4. Export: one PDF page and one PNG per 1920x1080 section.
    const { pdf, pngs } = await exportDeck(browser, deckHtml);
    trace("info", { stage: "slides", slides: pngs.length, flowSlides: flows.length, deck: rel(c.paths.out, deckHtml) });
    return { deckHtml, pdf };
  } finally {
    await browser.close();
  }
}

/** Downscaled copies of the real screenshots used on "how it makes money today" (keeps the deck folder self-contained). */
async function moneyShots(m: ProductModel, modelDir: string, outDir: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const s of moneyToday(m)) {
    if (!s.screen || out.has(s.screen)) continue;
    const src = m.screens.find(x => x.id === s.screen)?.screenshot;
    const file = src ? path.join(modelDir, src) : "";
    if (!file || !fs.existsSync(file)) continue;
    const relPath = `img/model-${s.screen.replace(/[^A-Za-z0-9_-]+/g, "_")}.png`;
    ensureDir(path.join(outDir, "img"));
    await sharp(file).resize({ width: 400, withoutEnlargement: true }).png().toFile(path.join(outDir, relPath));
    out.set(s.screen, relPath);
  }
  return out;
}

/** The deck's two bundled OFL fonts (display + text), next to deck.html so it stays self-contained. */
function copyFonts(outDir: string): void {
  const src = path.join(import.meta.dirname, "fonts");
  try {
    ensureDir(path.join(outDir, "fonts"));
    for (const f of fs.readdirSync(src)) fs.copyFileSync(path.join(src, f), path.join(outDir, "fonts", f));
  } catch (e) {
    trace("failure", { where: "slides:fonts", error: String((e as Error)?.message ?? e).slice(0, 200) });
    trace("recovery", { how: "the deck falls back to system fonts" });
  }
}

let kbCache: Map<string, string> | null = null;
/** "### [TAX-1] Consumable refill" -> TAX-1 => "Consumable refill", so cited precedents read as names. */
function kbTitles(): Map<string, string> {
  if (kbCache) return kbCache;
  kbCache = new Map();
  try {
    const md = fs.readFileSync(path.join(ROOT, "kb", "rewarded_ads_kb.md"), "utf8");
    for (const mt of md.matchAll(/^#{2,4}\s+\[([A-Z0-9-]+)\]\s+(.+)$/gm)) kbCache.set(mt[1], mt[2].trim());
  } catch {
    /* no KB checked out: precedents show their ids only */
  }
  return kbCache;
}
