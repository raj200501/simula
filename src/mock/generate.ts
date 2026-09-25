// generateMock: the LLM part of the mock stage.
//   1. design-system CSS: one call (MODELS.main, effort high) with up to 5 representative screenshots
//      and the measured tokens; stub = CSS from the tokens.
//   2. one call per render:"html" screen with the full-resolution screenshot, the element spec, the
//      design CSS and the asset manifest; stub = the deterministic spec renderer.
//      Each fragment is sanitized and validated in Playwright; a failing fragment gets one retry that
//      lists the violations, and the better of the two is kept (spec render if both are unusable).
//   3. buildMock assembles out/<app>/mock deterministically.
import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import type { ProductModel, Screen } from "../core/schema.ts";
import type { StageCtx } from "../core/run.ts";
import { MODELS } from "../core/config.ts";
import { ensureDir, writeText } from "../core/io.ts";
import { BudgetExceeded, text, type Img } from "../core/llm.ts";
import { trace } from "../core/trace.ts";
import { buildMock, fragmentFile } from "./build.ts";
import { fontStack, stubDesignCss } from "./designCss.ts";
import { DESIGN_SYSTEM_PROMPT, SCREEN_SYSTEM_PROMPT, designPrompt, retryPrompt, screenPrompt } from "./prompts.ts";
import { deviceDp } from "./roles.ts";
import { sanitizeCss, sanitizeFragment } from "./sanitize.ts";
import { specRender } from "./specRender.ts";
import { validateFragment } from "./validate.ts";

export interface ScreenGeneration {
  screen: string; generatedBy: "llm" | "stub" | "fallback"; attempts: number; coverage: number; violations: string[];
}

const mediaType = (f: string): Img["mediaType"] => (/\.jpe?g$/i.test(f) ? "image/jpeg" : "image/png");

function shotImage(m: ProductModel, modelDir: string, s: Screen, label: string): Img | null {
  const f = path.join(modelDir, s.screenshot);
  return fs.existsSync(f) ? { path: f, mediaType: mediaType(f), label } : null;
}

/** Up to 5 screenshots for the design system: in-scope, most visited, one per kind first. */
function representative(m: ProductModel, modelDir: string): Screen[] {
  const pool = m.screens.filter(s => s.inScope && fs.existsSync(path.join(modelDir, s.screenshot)))
    .sort((a, b) => (a.render === b.render ? 0 : a.render === "html" ? -1 : 1) || b.visits - a.visits || a.id.localeCompare(b.id));
  const out: Screen[] = [];
  for (const s of pool) if (out.length < 5 && !out.some(o => o.kind === s.kind)) out.push(s);
  for (const s of pool) if (out.length < 5 && !out.includes(s)) out.push(s);
  return out;
}

async function designCss(m: ProductModel, modelDir: string): Promise<{ css: string; by: "llm" | "stub" }> {
  const shown = representative(m, modelDir);
  let usedStub = false;
  try {
    const raw = await text({
      stage: "mock", purpose: "design-css", model: MODELS.main, effort: "high",
      system: [DESIGN_SYSTEM_PROMPT],
      prompt: designPrompt(m, fontStack(m), shown),
      images: shown.map(s => shotImage(m, modelDir, s, `Screenshot ${s.id} "${s.name}" (${s.kind})`)).filter((x): x is Img => !!x),
      stub: () => { usedStub = true; return "```css\n" + stubDesignCss(m) + "\n```"; },
    });
    const { css, removed } = sanitizeCss(raw);
    if (removed.length) trace("decision", { what: "design-css sanitized", removed });
    if (!/--c-accent\s*:/.test(css) || css.length < 200) throw new Error("design CSS lacks the required variables");
    return { css: usedStub ? css : `/* generatedBy: llm */\n${css}`, by: usedStub ? "stub" : "llm" };
  } catch (e) {
    trace("failure", { where: "mock:design-css", error: String((e as Error).message ?? e) });
    trace("recovery", { where: "mock:design-css", how: "design CSS from measured tokens (stub)" });
    return { css: stubDesignCss(m), by: "stub" };
  }
}

/** Mark who wrote the fragment on its root, so nothing pretends to be model output. */
function stamp(html: string, by: string): string {
  if (/data-generated-by=/.test(html.slice(0, 400))) return html.replace(/data-generated-by="[^"]*"/, `data-generated-by="${by}"`);
  return html.replace(/(<[a-z]+[^>]*?)(\sdata-screen-root=)/i, `$1 data-generated-by="${by}"$2`);
}

async function generateScreen(page: Page, m: ProductModel, modelDir: string, s: Screen, css: string): Promise<{ html: string; rec: ScreenGeneration }> {
  const dev = deviceDp(m);
  let usedStub = false;
  const stub = () => { usedStub = true; return "```html\n" + specRender(s, m) + "\n```"; };
  const img = shotImage(m, modelDir, s, `Original screenshot of ${s.id} "${s.name}": ${m.device.widthPx}x${m.device.heightPx} px = ${dev.w}x${dev.h} dp`);
  const base = screenPrompt(s, m, css);
  const attempt = async (prompt: string, purpose: string) => {
    usedStub = false;
    const raw = await text({ stage: "mock", purpose, model: MODELS.main, effort: "high", system: [SCREEN_SYSTEM_PROMPT], prompt, images: img ? [img] : [], stub, maxTokens: 32000 });
    const san = sanitizeFragment(raw, s.id);
    const v = await validateFragment(page, san.html, s, m);
    return { html: san.html, violations: [...san.removed.map(r => `removed ${r}`), ...v.violations], coverage: v.coverage, by: (usedStub ? "stub" : "llm") as "stub" | "llm" };
  };
  const score = (a: { violations: string[]; coverage: number }) => a.coverage - 0.05 * a.violations.length;
  let attempts = 0;
  let best: Awaited<ReturnType<typeof attempt>> | null = null;
  try {
    attempts++;
    best = await attempt(base, `screen-html:${s.id}`);
    if (best.violations.length) {
      trace("failure", { where: `mock:validate:${s.id}`, error: best.violations.join("; ").slice(0, 600) });
      attempts++;
      const second = await attempt(retryPrompt(base, best.violations), `screen-html:${s.id}:retry`);
      const keep = score(second) > score(best) ? second : best;
      trace("recovery", { where: `mock:validate:${s.id}`, how: `regenerated once with ${best.violations.length} violation(s); kept ${keep === second ? "the retry" : "the first"} (${keep.violations.length} left)` });
      best = keep;
    }
  } catch (e) {
    if (!(e instanceof BudgetExceeded)) trace("failure", { where: `mock:screen-html:${s.id}`, error: String((e as Error).message ?? e).slice(0, 400) });
    else trace("budget", { where: `mock:screen-html:${s.id}`, error: String((e as Error).message) });
  }
  if (!best || best.coverage < 0.6) {
    // Unusable or no answer: the spec renderer keeps navigation and QA working for this screen.
    trace("recovery", { where: `mock:screen-html:${s.id}`, how: "spec renderer fallback", coverage: best?.coverage ?? 0 });
    const html = specRender(s, m);
    const v = await validateFragment(page, html, s, m);
    return { html: stamp(html, "fallback"), rec: { screen: s.id, generatedBy: "fallback", attempts, coverage: v.coverage, violations: v.violations } };
  }
  return { html: stamp(best.html, best.by), rec: { screen: s.id, generatedBy: best.by, attempts, coverage: best.coverage, violations: best.violations } };
}

export async function generateMock(c: StageCtx, m: ProductModel, modelDir: string): Promise<{ indexHtml: string }> {
  const outDir = c.paths.mock;
  ensureDir(outDir);
  // Fragments are regenerated; stale ones from an earlier model would otherwise be picked up by the build.
  fs.rmSync(path.join(outDir, "screens"), { recursive: true, force: true });

  const design = await designCss(m, modelDir);
  writeText(path.join(outDir, "design.css"), design.css);
  trace("info", { what: "design-css", by: design.by, bytes: design.css.length });

  const screens = m.screens.filter(s => s.render === "html");
  const records: ScreenGeneration[] = [];
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch();
    const b = browser;
    const queue = [...screens];
    const worker = async () => {
      const page = await b.newPage();
      await page.setContent("<!doctype html><html><body></body></html>");
      for (let s = queue.shift(); s; s = queue.shift()) {
        const { html, rec } = await generateScreen(page, m, modelDir, s, design.css);
        writeText(fragmentFile(outDir, s.id), `<!-- screen ${s.id} "${s.name.replace(/--/g, "-")}" · generatedBy: ${rec.generatedBy} -->\n${html}\n`);
        records.push(rec);
        trace("decision", { what: "screen-html", screen: s.id, by: rec.generatedBy, attempts: rec.attempts, coverage: Number(rec.coverage.toFixed(3)), violations: rec.violations.length });
      }
      await page.close();
    };
    // A few screens in parallel: LLM latency dominates, and llm.ts paces provider rate limits.
    await Promise.all(Array.from({ length: Math.min(3, screens.length) }, worker));
  } finally {
    await browser?.close();
  }
  records.sort((a, b) => a.screen.localeCompare(b.screen));
  writeText(path.join(outDir, "generation.json"), JSON.stringify({ designCss: design.by, screens: records }, null, 2));
  const indexHtml = buildMock(m, modelDir, outDir);
  return { indexHtml };
}
