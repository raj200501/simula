// runQa: the render -> compare -> fix loop for every render:"html" screen, then flow QA and the report.
//
// Per screen: r0 = the current mock. Each round sends one fix call (MODELS.main, effort high) with a
// composite image original | mock | heatmap, the 12 worst element differences, the must-fix list and
// the current HTML; the answer is a revised fragment + changelog. A round is kept only if it improves
// the composite by >= 0.005 over the best so far (keep-best). Stop at the first of: composite >= 0.90
// with no must-fix, an improvement < 0.01, the round cap (profile.qaRounds for the top profile.qaTopN
// screens, 1 for the rest), or the QA budget (BudgetExceeded stops the fix calls, measuring continues).
// In stub mode the fixer is the deterministic nudge fixer (nudge.ts).
//
// Evidence: qa/<screen>/r<k>/{mock.png, heat.png, metrics.json, diffs.json, changelog.md, screen.html},
// qa/<screen>/best.png; the best HTML is written back to mock/screens/<screen>.html and the mock rebuilt.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { Page } from "playwright";
import type { ProductModel, Screen } from "../core/schema.ts";
import type { StageCtx } from "../core/run.ts";
import { MODELS } from "../core/config.ts";
import { canonical, ensureDir, sha256, writeText } from "../core/io.ts";
import { BudgetExceeded, text } from "../core/llm.ts";
import { trace } from "../core/trace.ts";
import { buildMock, fragmentFile, readFragment } from "../mock/build.ts";
import { FIX_SYSTEM_PROMPT, fixPrompt, parseFix } from "../mock/prompts.ts";
import { isOverlay } from "../mock/roles.ts";
import { sanitizeFragment } from "../mock/sanitize.ts";
import { compareScreen, toRGBA, type Comparison, type Metrics, type RGBA } from "./compare.ts";
import { runFlowQa, type FlowQa } from "./flows.ts";
import { nudgeFix } from "./nudge.ts";
import { launchBrowser, newMockPage, renderScreen, viewportOf, type DomBox, type Viewport } from "./render.ts";
import { writeQaReport } from "./report.ts";

export interface QaSummary {
  screens: { id: string; name: string; render: "html" | "image"; composite: number | null; rounds: number; mustFix: number; best: string }[];
  flow: { total: number; passed: number; failures: { edge: string; reason: string }[] };
  htmlShare: number;
}

export type StopReason = "good-enough" | "plateau" | "round-cap" | "budget" | "no-rounds" | "no-screenshot" | "error";
export const THRESH = { good: 0.9, keep: 0.005, plateau: 0.01 };
/** Bump when the fix prompt changes, so cached fix answers are not reused for a different prompt. */
const FIX_PROMPT_VERSION = 1;

export interface RoundRecord {
  k: number; metrics: Metrics; kept: boolean; by: "initial" | "llm" | "stub" | "nudge-fallback";
  changelog: string[]; worst: string[]; mustFix: string[];
}
export interface ScreenQa {
  screen: Screen; rounds: RoundRecord[]; best: number; stop: StopReason; cap: number; error?: string;
}

/** Screens that matter most (flows, moments, walls, visits) get the full round budget. */
export function rankScreens(m: ProductModel): string[] {
  const score = new Map<string, number>();
  const add = (id: string | undefined, v: number) => { if (id) score.set(id, (score.get(id) ?? 0) + v); };
  for (const f of m.flows) for (const st of f.steps) add(st.screen, f.kind === "core" ? 4 : f.kind === "monetization" ? 3 : 1);
  for (const mo of m.moments) add(mo.screen, 2);
  for (const w of m.economy.walls) add(w.shows, 2);
  for (const o of m.economy.offers) add(o.screen, 1);
  for (const s of m.screens) add(s.id, Math.min(20, s.visits) / 10);
  return m.screens.filter(s => s.render === "html").map(s => s.id)
    .sort((a, b) => (score.get(b) ?? 0) - (score.get(a) ?? 0) || a.localeCompare(b));
}

/** original | mock | heatmap side by side, for the fixer's eyes (derived bytes: never part of the cache key). */
async function compositeImage(orig: Buffer, mock: Buffer, heat: Buffer, v: Viewport): Promise<Buffer> {
  const W = 360, H = Math.round((W * v.heightPx) / v.widthPx), G = 8, T = 26;
  const panels = await Promise.all([orig, mock, heat].map(b => sharp(b).resize(W, H, { fit: "fill" }).png().toBuffer()));
  const labels = ["original", "mock", "difference"].map((l, i) => `<text x="${G + i * (W + G) + 4}" y="18" font-family="sans-serif" font-size="14" font-weight="700" fill="#111">${l}</text>`).join("");
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${3 * W + 4 * G}" height="${T}">${labels}</svg>`);
  return sharp({ create: { width: 3 * W + 4 * G, height: H + T + G, channels: 3, background: "#E5E7EB" } })
    .composite([{ input: svg, left: 0, top: 0 }, ...panels.map((p, i) => ({ input: p, left: G + i * (W + G), top: T }))])
    .png().toBuffer();
}

interface Measured { html: string; png: Buffer; boxes: DomBox[]; cmp: Comparison }

/** What one QA run shares across screens. */
interface Run { m: ProductModel; modelDir: string; mockDir: string; qaDir: string; v: Viewport; page: Page; indexHtml: string; budgetHit: boolean }

async function measure(run: Run, s: Screen, orig: RGBA, html: string): Promise<Measured> {
  const r = await renderScreen(run.page, run.indexHtml, s.id, run.v, html);
  const cmp = await compareScreen(orig, await toRGBA(r.png, run.v.widthPx, run.v.heightPx), r.boxes, s, run.m);
  return { html, png: r.png, boxes: r.boxes, cmp };
}

function record(k: number, x: Measured, kept: boolean, by: RoundRecord["by"], changelog: string[]): RoundRecord {
  return { k, metrics: x.cmp.metrics, kept, by, changelog, worst: x.cmp.worst.map(d => d.phrase), mustFix: x.cmp.mustFix.map(d => d.phrase) };
}

function persist(dir: string, s: Screen, x: Measured, rec: RoundRecord): void {
  const rd = path.join(dir, `r${rec.k}`);
  writeText(path.join(rd, "mock.png"), x.png);
  writeText(path.join(rd, "heat.png"), x.cmp.heat);
  writeText(path.join(rd, "screen.html"), x.html);
  writeText(path.join(rd, "metrics.json"), JSON.stringify({ screen: s.id, round: rec.k, kept: rec.kept, by: rec.by, ...x.cmp.metrics }, null, 2));
  writeText(path.join(rd, "diffs.json"), JSON.stringify({ worst: x.cmp.worst, mustFix: x.cmp.mustFix, elements: x.cmp.elements }, null, 2));
  writeText(path.join(rd, "changelog.md"), `# ${s.id} r${rec.k} (${rec.by})\n\n${rec.changelog.map(l => `- ${l}`).join("\n") || "- (no changes)"}\n`);
}

/** One fix round: the LLM fixer (stub: the nudge fixer). Returns the sanitized candidate. */
async function fixRound(run: Run, s: Screen, k: number, cur: Measured, origPng: Buffer, originalSha: string) {
  const diffs = cur.cmp.worst.map(d => d.phrase), must = cur.cmp.mustFix.map(d => d.phrase);
  const mt = cur.cmp.metrics;
  const metrics = `composite ${mt.composite.toFixed(3)} (IoU ${mt.iou.toFixed(3)}, SSIM ${mt.ssim.toFixed(3)}, text ${mt.text.toFixed(3)}, colour ${mt.color.toFixed(3)}), ${mt.missing} missing element(s)`;
  let usedStub = false;
  const answer = await text({
    stage: "qa", purpose: `qa-fix:${s.id}:r${k}`, model: MODELS.main, effort: "high",
    system: [FIX_SYSTEM_PROMPT],
    prompt: fixPrompt(s, run.m, cur.html, diffs, must, metrics),
    images: [{ data: await compositeImage(origPng, cur.png, cur.cmp.heat, run.v), mediaType: "image/png", label: `Screen ${s.id}${isOverlay(s) ? ` (${s.kind} over ${s.parent ?? "its parent"})` : ""}: original | mock | difference heatmap (red = different, grey rows = masked system bars).` }],
    // Rendered images differ across machines (fonts, Chromium): key the cache on stable inputs only (T4).
    cacheKey: { v: FIX_PROMPT_VERSION, screen: s.id, round: k, htmlSha: sha256(cur.html), diffsSha: sha256(canonical({ diffs, must })), originalSha },
    maxTokens: 32000,
    stub: async () => {
      usedStub = true;
      const n = await nudgeFix(run.page, cur.html, s, run.m, cur.cmp, cur.boxes);
      return "```html\n" + n.html + "\n```\nCHANGELOG:\n" + n.changelog.map(l => `- ${l}`).join("\n");
    },
  });
  const parsed = parseFix(answer);
  const san = sanitizeFragment(parsed.html, s.id);
  return { html: san.html, changelog: [...parsed.changelog, ...san.removed.map(r => `sanitizer removed ${r}`)], by: (usedStub ? "stub" : "llm") as RoundRecord["by"] };
}

async function qaScreen(run: Run, s: Screen, cap: number): Promise<ScreenQa> {
  const { m, v } = run;
  const dir = path.join(run.qaDir, s.id);
  fs.rmSync(dir, { recursive: true, force: true });
  ensureDir(dir);
  const origFile = path.join(run.modelDir, s.screenshot);
  if (!fs.existsSync(origFile)) {
    trace("failure", { where: `qa:${s.id}`, error: `original screenshot missing (${s.screenshot}); screen not measured` });
    return { screen: s, rounds: [], best: -1, stop: "no-screenshot", cap };
  }
  const origPng = fs.readFileSync(origFile);
  const originalSha = sha256(origPng);
  const orig = await toRGBA(origPng, v.widthPx, v.heightPx);
  writeText(path.join(dir, "original.png"), await sharp(origPng).resize(v.widthPx, v.heightPx, { fit: "fill" }).png().toBuffer());

  const html0 = readFragment(m, s, run.mockDir);
  const gen = /generatedBy:\s*(\w+)/.exec(html0)?.[1] ?? /data-generated-by="(\w+)"/.exec(html0)?.[1] ?? "unknown";
  let best = await measure(run, s, orig, html0);
  const rounds: RoundRecord[] = [record(0, best, true, "initial", [`initial mock (generated by ${gen})`])];
  persist(dir, s, best, rounds[0]);
  trace("qa", { screen: s.id, round: 0, ...best.cmp.metrics });
  let bestK = 0;
  let stop: StopReason = cap > 0 ? "round-cap" : "no-rounds";
  for (let k = 1; k <= cap; k++) {
    if (best.cmp.metrics.composite >= THRESH.good && best.cmp.metrics.mustFix === 0) { stop = "good-enough"; break; }
    if (run.budgetHit) { stop = "budget"; break; }
    let fix: { html: string; changelog: string[]; by: RoundRecord["by"] };
    try {
      fix = await fixRound(run, s, k, best, origPng, originalSha);
    } catch (e) {
      if (e instanceof BudgetExceeded) {
        run.budgetHit = true; stop = "budget";
        trace("budget", { where: `qa:${s.id}:r${k}`, error: String(e.message) });
        break;
      }
      // A failed fix call must not end QA: the deterministic fixer takes this round.
      trace("failure", { where: `qa-fix:${s.id}:r${k}`, error: String((e as Error).message ?? e).slice(0, 400) });
      const n = await nudgeFix(run.page, best.html, s, m, best.cmp, best.boxes);
      trace("recovery", { where: `qa-fix:${s.id}:r${k}`, how: "nudge fixer" });
      fix = { html: n.html, changelog: n.changelog, by: "nudge-fallback" };
    }
    const cand = await measure(run, s, orig, fix.html);
    const gain = cand.cmp.metrics.composite - best.cmp.metrics.composite;
    const kept = gain >= THRESH.keep;
    const rec = record(k, cand, kept, fix.by, fix.changelog);
    rounds.push(rec);
    persist(dir, s, cand, rec);
    trace("decision", { what: "qa-round", screen: s.id, round: k, composite: cand.cmp.metrics.composite, gain: Number(gain.toFixed(4)), kept });
    if (kept) { best = cand; bestK = k; }
    if (gain < THRESH.plateau) { stop = "plateau"; break; }
  }
  if (best.cmp.metrics.composite >= THRESH.good && best.cmp.metrics.mustFix === 0 && stop !== "budget") stop = "good-enough";
  trace("stop", { stage: "qa", screen: s.id, reason: stop, best: `r${bestK}`, composite: best.cmp.metrics.composite, mustFix: best.cmp.metrics.mustFix });
  writeText(path.join(dir, "best.png"), best.png);
  writeText(path.join(dir, "best.json"), JSON.stringify({ screen: s.id, round: bestK, stop, ...best.cmp.metrics }, null, 2));
  if (bestK > 0) {
    // Keep-best: the improved fragment becomes the mock's source for this screen.
    const head = `<!-- screen ${s.id} · generatedBy: ${gen} · improved by QA round r${bestK} (${rounds[bestK].by}) -->\n`;
    writeText(fragmentFile(run.mockDir, s.id), head + best.html.replace(/^<!--[\s\S]*?-->\s*/, "") + "\n");
  }
  return { screen: s, rounds, best: bestK, stop, cap };
}

export async function runQa(c: StageCtx, m: ProductModel, modelDir: string, o: { rounds?: number; screens?: string[] } = {}): Promise<QaSummary> {
  const mockDir = c.paths.mock, qaDir = c.paths.qa;
  ensureDir(qaDir);
  let indexHtml = path.join(mockDir, "index.html");
  if (!fs.existsSync(indexHtml)) indexHtml = buildMock(m, modelDir, mockDir);
  const v = viewportOf(m);
  const htmlScreens = m.screens.filter(s => s.render === "html" && (!o.screens || o.screens.includes(s.id)));
  const top = new Set(o.screens ?? rankScreens(m).slice(0, c.profile.qaTopN));
  const capFor = (id: string) => (top.has(id) ? o.rounds ?? c.profile.qaRounds : Math.min(1, o.rounds ?? 1));
  const results: ScreenQa[] = [];

  const browser = await launchBrowser();
  let flow: FlowQa;
  let budgetHit = false;
  try {
    const run: Run = { m, modelDir, mockDir, qaDir, v, page: await newMockPage(browser, v), indexHtml, budgetHit: false };
    for (const s of htmlScreens) {
      try {
        results.push(await qaScreen(run, s, capFor(s.id)));
      } catch (e) {
        trace("failure", { where: `qa:${s.id}`, error: String((e as Error).message ?? e).slice(0, 400) });
        results.push({ screen: s, rounds: [], best: -1, stop: "error", cap: capFor(s.id), error: String((e as Error).message ?? e) });
      }
    }
    budgetHit = run.budgetHit;
    await run.page.close();
    // The kept fragments are in mock/screens: rebuild so index.html carries them, then test the flows.
    indexHtml = buildMock(m, modelDir, mockDir);
    flow = await runFlowQa(indexHtml, m, { browser });
  } finally {
    await browser.close();
  }

  const inScope = m.screens.filter(s => s.inScope);
  const summary: QaSummary = {
    screens: m.screens.map(s => {
      const r = results.find(x => x.screen.id === s.id);
      const b = r && r.best >= 0 ? r.rounds[r.best] : undefined;
      return {
        id: s.id, name: s.name, render: s.render,
        composite: b ? b.metrics.composite : null,
        rounds: r ? Math.max(0, r.rounds.length - 1) : 0,
        mustFix: b ? b.metrics.mustFix : 0,
        best: b ? `${s.id}/best.png` : "",
      };
    }),
    flow: { total: flow.total, passed: flow.passed, failures: flow.failures },
    htmlShare: inScope.length ? Number((inScope.filter(s => s.render === "html").length / inScope.length).toFixed(3)) : 0,
  };
  writeText(path.join(qaDir, "summary.json"), JSON.stringify(summary, null, 2));
  await writeQaReport(qaDir, m, results, flow, summary);
  trace("info", { what: "qa summary", screens: results.length, flowPassed: `${flow.passed}/${flow.total}`, htmlShare: summary.htmlShare, budgetHit });
  return summary;
}
