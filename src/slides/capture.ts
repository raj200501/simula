// Deterministic storyboard captures: drive the patched mock through its runtime API
// (window.__mock, see BUILD_SPEC "Mock runtime API"), screenshot each of the five phases at DPR 2,
// and record where the callout nodes, the new elements and the offer's two choices really are, so
// the deck can pin numbered callouts on the actual DOM positions.
//
// In-page code is plain JS source (not TS closures): tsx/esbuild may wrap named functions in
// helpers that do not exist inside the browser.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import type { Browser } from "playwright";
import type { ProductModel, Proposal } from "../core/schema.ts";
import { trace } from "../core/trace.ts";
import { ensureDir } from "../core/io.ts";
import type { PhaseId, Story } from "./facts.ts";

export interface Box { x: number; y: number; w: number; h: number } // CSS px within the viewport

export interface Frame {
  phase: PhaseId;
  screen: string;
  /** Image path relative to the slides directory. */
  img: string;
  vw: number;
  vh: number;
  callouts: { text: string; box: Box | null }[];
  newBoxes: Box[];
  choices: { play: Box | null; decline: Box | null };
  caption: string;
  source: "mock" | "model-screenshot" | "placeholder";
}

type Step = "invite" | "game" | "verified" | "nofill" | "close";

/** What each phase does on top of go(screen) (E5: offer = invite, ad = game, value = verified then close). */
export function phaseSteps(phase: PhaseId, sb: Story, p: Proposal): Step[] {
  const offerIsOwnScreen = p.patch.newScreens.some(s => s.id === sb.screen);
  switch (phase) {
    case "offer": return offerIsOwnScreen && sb.overlay === "none" ? [] : ["invite"];
    case "ad": return ["game"];
    case "value": return ["verified", "close"];
    default: return sb.overlay !== "none" ? [sb.overlay] : [];
  }
}

export function deviceViewport(m: ProductModel): { vw: number; vh: number } {
  const d = m.device.density > 0 ? m.device.density : 1;
  return { vw: Math.round(m.device.widthPx / d), vh: Math.round(m.device.heightPx / d) };
}

const RUN_PHASE = `async (a) => {
  const M = window.__mock;
  const setAll = () => { for (const c of a.counters) { try { M.set(c.resource, c.value); } catch (e) {} } };
  setAll();
  M.go(a.screen);
  setAll();
  for (const s of a.steps) {
    M.openRewarded(s, a.pid);
    await new Promise(r => setTimeout(r, 150));
  }
  if (a.steps.includes("close") && M.state && M.state() !== a.screen) M.go(a.screen);
  setAll(); // the storyboard's numbers are the source of truth for what the frame shows
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  await new Promise(r => setTimeout(r, 350));
}`;

const MEASURE = `(a) => {
  const vw = innerWidth, vh = innerHeight;
  const rectOf = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) return null;
    if (r.bottom <= 0 || r.right <= 0 || r.top >= vh || r.left >= vw) return null;
    return r;
  };
  const onTop = (el, r) => {
    const x = Math.min(vw - 1, Math.max(0, r.left + r.width / 2)), y = Math.min(vh - 1, Math.max(0, r.top + r.height / 2));
    const hit = document.elementFromPoint(x, y);
    return !!hit && (hit === el || el.contains(hit) || hit.contains(el));
  };
  const box = (r) => {
    const x = Math.max(0, r.left), y = Math.max(0, r.top);
    return { x, y, w: Math.min(vw, r.right) - x, h: Math.min(vh, r.bottom) - y };
  };
  const pick = (els) => {
    let fallback = null;
    for (const el of els) {
      const r = rectOf(el);
      if (!r) continue;
      if (onTop(el, r)) return box(r);
      fallback = fallback || box(r);
    }
    return fallback;
  };
  const byAttr = (name, v) => Array.from(document.querySelectorAll("[" + name + "]")).filter(e => e.getAttribute(name) === v);
  const find = (node) => pick(byAttr("data-node", node).concat(byAttr("data-new", node), byAttr("id", node)));
  // Smallest visible, unobscured element whose whole text is one of the wanted labels.
  const byText = (texts) => {
    const want = texts.map(t => String(t || "").trim().toLowerCase()).filter(Boolean);
    let best = null, area = Infinity;
    for (const el of document.querySelectorAll("body *")) {
      const t = (el.innerText || "").replace(/\\s+/g, " ").trim().toLowerCase();
      if (!t || !want.includes(t)) continue;
      const r = rectOf(el);
      if (!r || !onTop(el, r)) continue;
      const ar = r.width * r.height;
      if (ar < area) { area = ar; best = box(r); }
    }
    return best;
  };
  const newBoxes = Array.from(document.querySelectorAll("[data-new]"))
    .filter(el => !(el.parentElement && el.parentElement.closest("[data-new]")))
    .map(el => rectOf(el)).filter(Boolean).map(box);
  return { vw, vh, callouts: a.nodes.map(find), newBoxes, play: byText(a.play), decline: byText(a.decline) };
}`;

export interface CaptureInput {
  browser: Browser;
  indexHtml: string;
  p: Proposal;
  story: Story[];
  m: ProductModel;
  modelDir: string;
  slidesDir: string;
}

/** Capture the five frames of one proposal. A phase that fails falls back to the real screenshot. */
export async function captureFlow(o: CaptureInput): Promise<Frame[]> {
  const { vw, vh } = deviceViewport(o.m);
  ensureDir(path.join(o.slidesDir, "img"));
  const frames: Frame[] = [];
  const known = new Set(o.m.screens.map(s => s.id));
  for (const [i, sb] of o.story.entries()) {
    const phase = sb.phase as PhaseId;
    const rel = `img/${safe(o.p.id)}-${i + 1}-${phase}.png`;
    const file = path.join(o.slidesDir, rel);
    const steps = phaseSteps(phase, sb, o.p);
    // "Today" is the app as it is: no proposal patch, unless the screen only exists in the patch.
    const patched = phase !== "today" || !known.has(sb.screen);
    const qs = new URLSearchParams(patched ? { proposal: o.p.id, slide: "1", frame: "0" } : { frame: "0" });
    const url = `${pathToFileURL(o.indexHtml).href}?${qs.toString()}`;
    const ctx = await o.browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2 });
    try {
      const page = await ctx.newPage();
      const errors: string[] = [];
      page.on("pageerror", e => errors.push(String(e.message ?? e)));
      await page.goto(url, { waitUntil: "load" });
      await page.waitForFunction("!!(window.__mock && window.__mock.go)", null, { timeout: 10_000 });
      await page.evaluate(`(${RUN_PHASE})(${JSON.stringify({ screen: sb.screen, counters: sb.counters, steps, pid: o.p.id })})`);
      await page.screenshot({ path: file, animations: "disabled" });
      const meas = (await page.evaluate(`(${MEASURE})(${JSON.stringify({
        nodes: sb.callouts.map(c => c.node),
        play: phase === "offer" ? [o.p.offer.cta, "Play now", "Play"] : [],
        decline: phase === "offer" ? [o.p.offer.decline, "No thanks", "No, thanks", "Not now"] : [],
      })})`)) as { vw: number; vh: number; callouts: (Box | null)[]; newBoxes: Box[]; play: Box | null; decline: Box | null };
      if (errors.length) trace("failure", { where: `slides:capture:${o.p.id}:${phase}`, error: errors.slice(0, 3).join(" | ") });
      if (phase === "offer" && (!meas.play || !meas.decline))
        trace("failure", { where: `slides:capture:${o.p.id}:offer`, error: `offer frame is missing ${!meas.play ? "the play button" : ""}${!meas.play && !meas.decline ? " and " : ""}${!meas.decline ? "the decline button" : ""}` });
      frames.push({
        phase, screen: sb.screen, img: rel, vw: meas.vw, vh: meas.vh,
        callouts: sb.callouts.map((c, k) => ({ text: c.text, box: meas.callouts[k] ?? null })),
        newBoxes: meas.newBoxes.slice(0, 4), choices: { play: meas.play, decline: meas.decline },
        caption: sb.caption, source: "mock",
      });
    } catch (e) {
      const why = String((e as Error)?.message ?? e).split("\n")[0];
      trace("failure", { where: `slides:capture:${o.p.id}:${phase}`, error: why });
      frames.push(await fallbackFrame(o, sb, phase, rel, vw, vh));
      trace("recovery", { how: `used ${frames.at(-1)!.source} for ${o.p.id}/${phase}` });
    } finally {
      await ctx.close();
    }
  }
  return frames;
}

/** The real screenshot from the model directory when the mock cannot render a phase; else a grey card. */
async function fallbackFrame(o: CaptureInput, sb: Story, phase: PhaseId, rel: string, vw: number, vh: number): Promise<Frame> {
  const file = path.join(o.slidesDir, rel);
  const shot = o.m.screens.find(s => s.id === sb.screen)?.screenshot;
  const src = shot ? path.join(o.modelDir, shot) : "";
  let source: Frame["source"] = "placeholder";
  if (src && fs.existsSync(src)) {
    await sharp(src).resize({ width: vw * 2, height: vh * 2, fit: "cover", position: "top" }).png().toFile(file);
    source = "model-screenshot";
  } else {
    await placeholderPng(file, vw * 2, vh * 2, "Screen not captured");
  }
  return { phase, screen: sb.screen, img: rel, vw, vh, callouts: sb.callouts.map(c => ({ text: c.text, box: null })), newBoxes: [], choices: { play: null, decline: null }, caption: sb.caption, source };
}

export async function placeholderPng(file: string, w: number, h: number, label: string): Promise<void> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#F3F4F6"/>` +
    `<text x="50%" y="50%" font-family="sans-serif" font-size="${Math.round(w / 16)}" fill="#9CA3AF" text-anchor="middle">${label.replace(/[<&>]/g, "")}</text></svg>`;
  ensureDir(path.dirname(file));
  await sharp(Buffer.from(svg)).png().toFile(file);
}

const safe = (s: string) => s.replace(/[^A-Za-z0-9_-]+/g, "_");
