// slides/flow-<Pn>.gif: the lead flow as a short animation, for readers who see the repo on GitHub
// (a Markdown page can show a GIF, not the clickable mock). Same storyboard and mock as the flow
// slide: today → what changed → offer → the game actually running → the reward confirmed in-screen.
// Each frame carries a caption band. Best effort: any failure leaves the deck untouched.
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import type { Browser } from "playwright";
import type { ProductModel, Proposal } from "../core/schema.ts";
import { escapeHtml } from "../core/io.ts";
import { deviceViewport, phaseSteps } from "./capture.ts";
import { PHASE_LABEL, shortCaption, type PhaseId, type Story } from "./facts.ts";

const WIDTH = 360;        // GIF width in px; the phone is scaled to it
const BAND = 78;          // caption band height
const HOLD = 1900;        // ms a still phase stays on screen
const GAME_SHOTS = [250, 1250, 2250, 3250]; // ms into the game: the countdown ticks, the target moves

interface Shot { png: Buffer; phase: PhaseId; delay: number }

export interface GifInput { browser: Browser; indexHtml: string; p: Proposal; story: Story[]; m: ProductModel; file: string; accent: string }

export async function flowGif(o: GifInput): Promise<string> {
  const { vw, vh } = deviceViewport(o.m);
  const shots: Shot[] = [];
  const known = new Set(o.m.screens.map(s => s.id));
  for (const sb of o.story) {
    const phase = sb.phase as PhaseId;
    const patched = phase !== "today" || !known.has(sb.screen);
    // The game runs live (slide mode would freeze it); every other phase uses slide mode, which
    // outlines what is new and keeps the reward confirmation on screen.
    const qs = new URLSearchParams({ frame: "0", ...(patched ? { proposal: o.p.id } : {}), ...(phase === "ad" ? {} : { slide: "1" }) });
    const ctx = await o.browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
    try {
      const page = await ctx.newPage();
      await page.goto(`${pathToFileURL(o.indexHtml).href}?${qs}`, { waitUntil: "load" });
      await page.waitForFunction("!!(window.__mock && window.__mock.go)", null, { timeout: 10_000 });
      await page.evaluate(`(async (a) => {
        const M = window.__mock;
        const setAll = () => { for (const c of a.counters) { try { M.set(c.resource, c.value); } catch (e) {} } };
        setAll(); M.go(a.screen); setAll();
        if (M.avoid) M.avoid(a.avoid);
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
      })(${JSON.stringify({ screen: sb.screen, counters: sb.counters, avoid: sb.callouts.map(c => c.node) })})`);
      const steps = phaseSteps(phase, sb, o.p);
      const run = (s: string) => page.evaluate(`window.__mock.openRewarded(${JSON.stringify(s)}, ${JSON.stringify(o.p.id)})`);
      const snap = async (delay: number) => shots.push({ png: await page.screenshot(), phase, delay });
      if (phase === "ad") {
        for (const s of steps) await run(s);
        let t = 0;
        for (const at of GAME_SHOTS) {
          await page.waitForTimeout(at - t); t = at;
          if (at !== GAME_SHOTS[0]) await page.evaluate(`document.querySelector(".mock-rw-target")?.click()`); // the user plays: the score counts up
          await snap(at === GAME_SHOTS.at(-1) ? 700 : 1000);
        }
      } else if (phase === "value") {
        await run("verified"); await page.waitForTimeout(250); await snap(1100);
        await run("close");
        if (sb.screen) await page.evaluate(`window.__mock.state && window.__mock.state() !== ${JSON.stringify(sb.screen)} && window.__mock.go(${JSON.stringify(sb.screen)})`);
        await page.evaluate(`(${JSON.stringify(sb.counters)}).forEach(c => { try { window.__mock.set(c.resource, c.value); } catch (e) {} })`);
        await page.waitForTimeout(350); await snap(HOLD + 1200);
      } else {
        for (const s of steps) { await run(s); await page.waitForTimeout(150); }
        await page.waitForTimeout(300); await snap(HOLD);
      }
    } finally {
      await ctx.close();
    }
  }
  const caption = new Map(o.story.map(s => [s.phase, shortCaption(s.caption)]));
  const order = Object.keys(PHASE_LABEL) as PhaseId[];
  const frames = await Promise.all(shots.map(s => frame(s, order.indexOf(s.phase) + 1, caption.get(s.phase) ?? "", o.accent)));
  await sharp(frames.map(f => f.buf), { join: { animated: true } })
    .gif({ delay: shots.map(s => s.delay), loop: 0, effort: 7, dither: 0.6 })
    .toFile(o.file);
  return path.basename(o.file);
}

/** One GIF frame: the caption band ("2 · WHAT CHANGED" + caption) above the scaled screen. */
async function frame(s: Shot, n: number, caption: string, accent: string): Promise<{ buf: Buffer }> {
  const screen = await sharp(s.png).resize({ width: WIDTH }).png().toBuffer();
  const h = (await sharp(screen).metadata()).height ?? WIDTH * 2;
  const lines = wrap(caption, 38).slice(0, 2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${BAND}">
<rect width="100%" height="100%" fill="#ffffff"/>
<circle cx="22" cy="21" r="11" fill="${accent}"/>
<text x="22" y="25.5" font-family="Inter, DejaVu Sans, Helvetica, Arial, sans-serif" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">${n}</text>
<text x="40" y="26" font-family="Inter, DejaVu Sans, Helvetica, Arial, sans-serif" font-size="12" font-weight="700" letter-spacing="1.2" fill="${accent}">${escapeHtml(PHASE_LABEL[s.phase].toUpperCase())}</text>
${lines.map((l, i) => `<text x="12" y="${50 + i * 18}" font-family="Inter, DejaVu Sans, Helvetica, Arial, sans-serif" font-size="14" font-weight="600" fill="#111827">${escapeHtml(l)}</text>`).join("\n")}
</svg>`;
  const buf = await sharp({ create: { width: WIDTH, height: BAND + h, channels: 4, background: "#ffffff" } })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }, { input: screen, top: BAND, left: 0 }])
    .png().toBuffer();
  return { buf };
}

function wrap(s: string, n: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const w of s.split(/\s+/).filter(Boolean)) {
    if (cur && `${cur} ${w}`.length > n) { out.push(cur); cur = w; } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) out.push(cur);
  return out;
}
