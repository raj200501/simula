// Original screenshot vs mock render, both at device px. Elements are matched by data-node id (the
// model's element ids), so the per-element numbers are exact, not guessed by box matching.
//   IoU of the DOM box vs the original rectPx (missing = 0)
//   text Sørensen–Dice (character bigrams, case-insensitive; exact mismatches are still reported)
//   background ΔE (CIEDE2000) of a ring just inside the original rect, in both images -> 1 - ΔE/20
//   grayscale SSIM over the unmasked rows, and a pixelmatch heatmap
// Status and navigation rows are masked (the frame draws them), never cropped out of the geometry.
// composite = 0.35 IoU + 0.25 SSIM + 0.20 text + 0.20 colour. It decides keep/stop only; the fix
// loop is driven by the ranked element differences.
import sharp from "sharp";
import pixelmatch from "pixelmatch";
import { ssim } from "ssim.js";
import type { ProductModel, Rect, Screen, UiElement } from "../core/schema.ts";
import { deltaE } from "../mock/designCss.ts";
import { counterBindings, textOf } from "../mock/roles.ts";
import type { DomBox } from "./render.ts";

export interface RGBA { data: Buffer; width: number; height: number } // 4 channels

export interface ElementScore {
  id: string; role: string; areaFrac: number;
  missing: boolean;
  iou: number;
  want: string; got: string; textScore: number | null;
  bgOrig: string | null; bgMock: string | null; dE: number | null; colorScore: number | null;
  dxDp: number; dyDp: number; dwDp: number; dhDp: number;   // mock minus original
  target: Rect; got_rect: Rect | null;                     // dp
  unbound: string | null;                                  // resource the element should be bound to
}
export interface Diff { node: string; role: string; severity: number; mustFix: boolean; phrase: string }
export interface Metrics { composite: number; iou: number; ssim: number; text: number; color: number; pixelDiff: number; elements: number; missing: number; mustFix: number }
export interface Comparison { metrics: Metrics; elements: ElementScore[]; worst: Diff[]; mustFix: Diff[]; heat: Buffer }

export const WEIGHTS = { iou: 0.35, ssim: 0.25, text: 0.2, color: 0.2 };

export async function toRGBA(png: Buffer, width: number, height: number): Promise<RGBA> {
  const { data, info } = await sharp(png).resize(width, height, { fit: "fill" }).flatten({ background: "#ffffff" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Character-bigram Sørensen–Dice similarity. */
export function dice(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const grams = (s: string) => { const m = new Map<string, number>(); for (let i = 0; i < s.length - 1; i++) { const k = s.slice(i, i + 2); m.set(k, (m.get(k) ?? 0) + 1); } return m; };
  const A = grams(a), B = grams(b);
  let inter = 0;
  for (const [k, c] of A) inter += Math.min(c, B.get(k) ?? 0);
  return (2 * inter) / (a.length - 1 + b.length - 1);
}

export function iou(a: Rect, b: Rect): number {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const i = ix * iy;
  const u = a.w * a.h + b.w * b.h - i;
  return u > 0 ? i / u : 0;
}

const hex = (r: number, g: number, b: number) => "#" + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();

/** Dominant colour (mode of a 5-bit histogram) of a ring `t` px wide just inside the rect, within rows [y0, y1). */
export function ringColor(img: RGBA, r: Rect, y0: number, y1: number, t = 3): string | null {
  const x0 = Math.max(0, Math.round(r.x)), x1 = Math.min(img.width, Math.round(r.x + r.w));
  const top = Math.max(y0, Math.round(r.y)), bot = Math.min(y1, img.height, Math.round(r.y + r.h));
  if (x1 - x0 < 4 || bot - top < 4) return null;
  const bins = new Map<number, [number, number, number, number]>();
  const add = (x: number, y: number) => {
    const i = (y * img.width + x) * 4;
    const rr = img.data[i], gg = img.data[i + 1], bb = img.data[i + 2];
    const k = ((rr >> 3) << 10) | ((gg >> 3) << 5) | (bb >> 3);
    const e = bins.get(k) ?? [0, 0, 0, 0];
    e[0]++; e[1] += rr; e[2] += gg; e[3] += bb;
    bins.set(k, e);
  };
  const step = Math.max(1, Math.floor(Math.max(x1 - x0, bot - top) / 400)); // bounded cost for big boxes
  for (let y = top; y < bot; y++) {
    const edgeRow = y - top < t || bot - 1 - y < t;
    if (edgeRow) { for (let x = x0; x < x1; x += step) add(x, y); continue; }
    for (let k = 0; k < t; k++) { add(x0 + k, y); add(x1 - 1 - k, y); }
  }
  let best: [number, number, number, number] | null = null;
  for (const e of bins.values()) if (!best || e[0] > best[0]) best = e;
  return best ? hex(best[1] / best[0], best[2] / best[0], best[3] / best[0]) : null;
}

/** Grayscale SSIM of the rows [y0, y1), downsampled to 360 px wide (as in the plan's simulation). */
async function graySsim(a: RGBA, b: RGBA, y0: number, y1: number): Promise<number> {
  const W = 360, H = Math.max(8, Math.round((360 * (y1 - y0)) / a.width));
  const prep = async (img: RGBA) => {
    const { data } = await sharp(img.data, { raw: { width: img.width, height: img.height, channels: 4 } })
      .extract({ left: 0, top: y0, width: img.width, height: y1 - y0 }).resize(W, H, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const out = new Uint8ClampedArray(W * H * 4);
    for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
      const g = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      out[j] = out[j + 1] = out[j + 2] = g; out[j + 3] = 255;
    }
    return { data: out, width: W, height: H };
  };
  const [x, y] = await Promise.all([prep(a), prep(b)]);
  return ssim(x, y, { downsample: false }).mssim;
}

/** Pixelmatch at half resolution; the masked rows are painted grey so the heatmap shows what was ignored. */
async function heatmap(a: RGBA, b: RGBA, y0: number, y1: number): Promise<{ png: Buffer; ratio: number }> {
  const W = Math.round(a.width / 2), H = Math.round(a.height / 2);
  const half = (img: RGBA) => sharp(img.data, { raw: { width: img.width, height: img.height, channels: 4 } }).resize(W, H, { fit: "fill" }).ensureAlpha().raw().toBuffer();
  const [ha, hb] = await Promise.all([half(a), half(b)]);
  const out = Buffer.alloc(W * H * 4);
  const m0 = Math.round(y0 / 2), m1 = Math.round(y1 / 2);
  // Masked rows are made identical before matching, so they never count as differences.
  for (let y = 0; y < H; y++) if (y < m0 || y >= m1) ha.copy(hb, y * W * 4, y * W * 4, (y + 1) * W * 4);
  const diff = pixelmatch(new Uint8Array(ha.buffer, ha.byteOffset, ha.length), new Uint8Array(hb.buffer, hb.byteOffset, hb.length), new Uint8Array(out.buffer, out.byteOffset, out.length), W, H, { threshold: 0.1, alpha: 0.25 });
  for (let y = 0; y < H; y++) if (y < m0 || y >= m1) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; out[i] = 156; out[i + 1] = 163; out[i + 2] = 175; out[i + 3] = 255; }
  const png = await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
  return { png, ratio: diff / Math.max(1, W * (m1 - m0)) };
}

const r1 = (v: number) => Math.round(v * 10) / 10;
const fmtRect = (r: Rect) => `[${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.w)}x${Math.round(r.h)}]dp`;
const clip = (s: string, n = 40) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function phrase(e: ElementScore): string {
  if (e.missing) return `${e.id}: missing ${e.role}${e.want ? ` '${clip(e.want)}'` : ""} at ${fmtRect(e.target)}`;
  const p: string[] = [];
  if (Math.abs(e.dyDp) >= 2) p.push(`${Math.round(Math.abs(e.dyDp))}dp too ${e.dyDp > 0 ? "low" : "high"}`);
  if (Math.abs(e.dxDp) >= 2) p.push(`${Math.round(Math.abs(e.dxDp))}dp too far ${e.dxDp > 0 ? "right" : "left"}`);
  if (Math.abs(e.dwDp) >= 2) p.push(`${Math.round(Math.abs(e.dwDp))}dp too ${e.dwDp > 0 ? "wide" : "narrow"}`);
  if (Math.abs(e.dhDp) >= 2) p.push(`${Math.round(Math.abs(e.dhDp))}dp too ${e.dhDp > 0 ? "tall" : "short"}`);
  if (e.dE !== null && e.dE > 5 && e.bgMock && e.bgOrig) p.push(`bg ${e.bgMock} vs ${e.bgOrig}`);
  if (e.want && e.got !== e.want) p.push(`text '${clip(e.got)}' vs '${clip(e.want)}'`);
  if (e.unbound) p.push(`counter not bound (needs data-bind="${e.unbound}")`);
  return p.length ? `${e.id}: ${p.join("; ")}` : "";
}

export async function compareScreen(orig: RGBA, mock: RGBA, boxes: DomBox[], s: Screen, m: ProductModel): Promise<Comparison> {
  const W = orig.width, H = orig.height, d = m.device.density || 1;
  const y0 = Math.min(H - 8, Math.max(0, Math.round(m.device.statusBarPx || 0)));
  const y1 = Math.max(y0 + 8, H - Math.max(0, Math.round(m.device.navBarPx || 0)));
  const binds = new Map(counterBindings(s, m).map(b => [b.el, b.resource]));
  const byId = new Map<string, DomBox[]>();
  for (const b of boxes) if (!b.hidden) byId.set(b.id, [...(byId.get(b.id) ?? []), b]);

  const els = s.elements.filter((e: UiElement) => e.rectPx.w >= 2 && e.rectPx.h >= 2 && e.rectPx.x < W && e.rectPx.y < H && e.rectPx.x + e.rectPx.w > 0 && e.rectPx.y + e.rectPx.h > 0);
  const scores: ElementScore[] = els.map(e => {
    const target = e.rectPx;
    const cands = byId.get(e.id) ?? [];
    const box = cands.sort((a, b) => iou(target, b.rect) - iou(target, a.rect))[0];
    const want = textOf(e);
    const got = box?.text ?? "";
    const bgOrig = ringColor(orig, target, y0, y1), bgMock = ringColor(mock, target, y0, y1);
    const dE = bgOrig && bgMock ? deltaE(bgOrig, bgMock) : null;
    // A binding the runtime had to add (data-bind-auto) still counts as missing from the fragment.
    const res = binds.get(e.id);
    const unbound = box && res && (!box.bind || box.bindAuto || box.bind !== res) ? res : null;
    return {
      id: e.id, role: e.role, areaFrac: (target.w * target.h) / (W * H), missing: !box,
      iou: box ? iou(target, box.rect) : 0,
      want, got, textScore: want ? (box ? dice(want.toLowerCase(), got.toLowerCase()) : 0) : null,
      bgOrig, bgMock, dE, colorScore: dE === null ? null : Math.max(0, 1 - dE / 20),
      dxDp: box ? r1((box.rect.x - target.x) / d) : 0, dyDp: box ? r1((box.rect.y - target.y) / d) : 0,
      dwDp: box ? r1((box.rect.w - target.w) / d) : 0, dhDp: box ? r1((box.rect.h - target.h) / d) : 0,
      target: e.rectDp, got_rect: box ? { x: r1(box.rect.x / d), y: r1(box.rect.y / d), w: r1(box.rect.w / d), h: r1(box.rect.h / d) } : null,
      unbound,
    };
  });

  const mean = (xs: number[], empty = 1) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : empty);
  const meanIou = mean(scores.map(x => x.iou));
  const meanText = mean(scores.filter(x => x.textScore !== null).map(x => x.textScore!));
  const meanColor = mean(scores.filter(x => x.colorScore !== null).map(x => x.colorScore!));
  const [ss, heat] = await Promise.all([graySsim(orig, mock, y0, y1), heatmap(orig, mock, y0, y1)]);
  const composite = WEIGHTS.iou * meanIou + WEIGHTS.ssim * ss + WEIGHTS.text * meanText + WEIGHTS.color * meanColor;

  const diffs: Diff[] = [];
  for (const e of scores) {
    const text = phrase(e);
    if (!text) continue;
    const important = e.role === "button" || e.role === "tab" || e.role === "counter";
    const mustFix = (e.missing && e.areaFrac >= 0.01) || (important && (e.missing || (e.textScore !== null && e.textScore < 0.9))) || !!e.unbound;
    const error = (1 - e.iou) + (e.textScore !== null ? 1 - e.textScore : 0) + (e.colorScore !== null ? 1 - e.colorScore : 0) + (e.unbound ? 1 : 0);
    diffs.push({ node: e.id, role: e.role, severity: Number((Math.min(0.25, Math.max(0.003, e.areaFrac)) * error).toFixed(5)), mustFix, phrase: text });
  }
  diffs.sort((a, b) => b.severity - a.severity || a.node.localeCompare(b.node));
  const mustFix = diffs.filter(x => x.mustFix);
  return {
    metrics: {
      composite: Number(composite.toFixed(4)), iou: Number(meanIou.toFixed(4)), ssim: Number(ss.toFixed(4)), text: Number(meanText.toFixed(4)),
      color: Number(meanColor.toFixed(4)), pixelDiff: Number(heat.ratio.toFixed(4)), elements: scores.length, missing: scores.filter(x => x.missing).length, mustFix: mustFix.length,
    },
    elements: scores, worst: diffs.slice(0, 12), mustFix, heat: heat.png,
  };
}
