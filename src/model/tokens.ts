// Design tokens measured from pixels, so the mock generator is told numbers instead of guessing
// them from a screenshot. Every screenshot is decoded ONCE to raw RGB (sharp) and all
// measurements are plain loops over that buffer: one sharp call per element would be far slower.
import sharp from "sharp";
import type { Rect } from "../core/schema.ts";

export type RGB = [number, number, number];
export interface RawImage { data: Buffer; width: number; height: number } // 3 channels, row-major

export async function decode(png: Buffer): Promise<RawImage> {
  // flatten() drops alpha onto white, so every pixel is exactly 3 bytes.
  const { data, info } = await sharp(png).flatten({ background: "#ffffff" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

export const hex = (c: RGB): string => "#" + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();

export function fromHex(h: string): RGB {
  const n = parseInt(h.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG relative luminance + contrast ratio: "highest-contrast colour" means text or icon ink. */
function luminance([r, g, b]: RGB): number {
  const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function contrast(a: RGB, b: RGB): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

interface Box { x0: number; y0: number; x1: number; y1: number }
function clip(img: RawImage, r: Rect): Box | null {
  const x0 = Math.max(0, Math.round(r.x)), y0 = Math.max(0, Math.round(r.y));
  const x1 = Math.min(img.width, Math.round(r.x + r.w)), y1 = Math.min(img.height, Math.round(r.y + r.h));
  return x1 - x0 >= 1 && y1 - y0 >= 1 ? { x0, y0, x1, y1 } : null;
}

const px = (img: RawImage, x: number, y: number): RGB => {
  const i = (y * img.width + x) * 3;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
};

/** Quantized colour histogram (5 bits per channel). Each bin remembers its mean colour, so the
 *  returned colour is a real average, not the bin corner. */
class Hist {
  private bins = new Map<number, { n: number; r: number; g: number; b: number }>();
  total = 0;
  add([r, g, b]: RGB): void {
    const k = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const e = this.bins.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += r; e.g += g; e.b += b; this.total++;
    this.bins.set(k, e);
  }
  entries(): { color: RGB; n: number }[] {
    return [...this.bins.values()].map(e => ({ color: [e.r / e.n, e.g / e.n, e.b / e.n] as RGB, n: e.n })).sort((a, b) => b.n - a.n);
  }
}

/** Background = mode of the 2 px ring just inside the rect (robust to the text and icons inside). */
export function ringBg(img: RawImage, r: Rect): RGB | undefined {
  const b = clip(img, r);
  if (!b) return undefined;
  const h = new Hist();
  for (let y = b.y0; y < b.y1; y++) {
    const edgeRow = y - b.y0 < 2 || b.y1 - 1 - y < 2;
    if (edgeRow) { for (let x = b.x0; x < b.x1; x++) h.add(px(img, x, y)); continue; }
    for (const x of [b.x0, b.x0 + 1, b.x1 - 2, b.x1 - 1]) if (x >= b.x0 && x < b.x1) h.add(px(img, x, y));
  }
  return h.entries()[0]?.color;
}

/** Foreground = the interior colour with the highest contrast against the background, among colours
 *  covering enough pixels to be ink (not a single anti-aliased pixel). Sampled with a stride so a
 *  full-screen container costs the same as a chip. */
export function inkFg(img: RawImage, r: Rect, bg: RGB): RGB | undefined {
  const b = clip(img, { x: r.x + 2, y: r.y + 2, w: r.w - 4, h: r.h - 4 });
  if (!b) return undefined;
  const area = (b.x1 - b.x0) * (b.y1 - b.y0);
  const step = Math.max(1, Math.floor(Math.sqrt(area / 20000)));
  const h = new Hist();
  for (let y = b.y0; y < b.y1; y += step) for (let x = b.x0; x < b.x1; x += step) h.add(px(img, x, y));
  const minN = Math.max(3, h.total * 0.005);
  let best: { color: RGB; c: number } | undefined;
  for (const e of h.entries()) {
    if (e.n < minN) break;
    const c = contrast(e.color, bg);
    if (!best || c > best.c) best = { color: e.color, c };
  }
  return best && best.c >= 1.5 ? best.color : undefined;
}

const half = (n: number) => Math.round(n * 2) / 2;

/**
 * Font size in dp for a text view bounded tightly by its text: one line is about 1.25x the font
 * size; multi-line text picks the size whose implied line count best matches the text length.
 */
export function tightFontDp(r: Rect, pxPerDp: number, text: string): number | undefined {
  const hDp = r.h / pxPerDp, wDp = r.w / pxPerDp;
  if (!text.trim() || hDp < 6 || wDp < 6) return undefined;
  let best = 0, bestErr = Infinity;
  for (let s = 9; s <= 40; s += 0.5) {
    const lines = Math.max(1, Math.ceil((text.length * 0.55 * s) / wDp));
    const err = Math.abs(lines * 1.25 * s - hDp);
    if (err < bestErr) { bestErr = err; best = s; }
  }
  return best || undefined;
}

/**
 * Font size in dp for padded elements (buttons, chips, list rows), whose rect height is mostly
 * padding: measure the first line of ink instead. The ink of a Latin line spans about 0.75em.
 */
export function inkFontDp(img: RawImage, r: Rect, pxPerDp: number, bg: RGB | undefined): number | undefined {
  if (!bg) return undefined;
  const b = clip(img, { x: r.x + 2, y: r.y + 2, w: r.w - 4, h: r.h - 4 });
  if (!b) return undefined;
  let start = -1, end = -1, gap = 0;
  for (let y = b.y0; y < b.y1; y++) {
    let ink = false;
    for (let x = b.x0; x < b.x1 && !ink; x++) {
      const p = px(img, x, y);
      ink = Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2]) > 90;
    }
    if (ink) { if (start < 0) start = y; end = y; gap = 0; }
    else if (start >= 0 && ++gap > 1) break; // first line of ink ended
  }
  if (start < 0) return undefined;
  const s = (end - start + 1) / pxPerDp / 0.75;
  return s >= 8 && s <= 48 ? half(s) : undefined;
}

/** A grid sample of about `target` pixels (for the palette). */
export function samplePixels(img: RawImage, target = 3000): RGB[] {
  const step = Math.max(1, Math.floor(Math.sqrt((img.width * img.height) / target)));
  const out: RGB[] = [];
  for (let y = Math.floor(step / 2); y < img.height; y += step) for (let x = Math.floor(step / 2); x < img.width; x += step) out.push(px(img, x, y));
  return out;
}

/** Deterministic k-means (k-means++ init from a fixed-seed LCG): the same screenshots always give
 *  the same palette, which keeps the model diffable across runs. */
export function kmeans(pts: RGB[], k = 8, iters = 10): { color: RGB; share: number }[] {
  if (!pts.length) return [];
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const d2 = (a: RGB, b: RGB) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  const cents: RGB[] = [pts[Math.floor(rnd() * pts.length)]];
  const dist = pts.map(p => d2(p, cents[0]));
  while (cents.length < Math.min(k, pts.length)) {
    const tot = dist.reduce((a, b) => a + b, 0);
    if (tot === 0) break; // fewer distinct colours than k
    let t = rnd() * tot, i = 0;
    while ((t -= dist[i]) > 0 && i < pts.length - 1) i++;
    cents.push(pts[i]);
    pts.forEach((p, j) => { dist[j] = Math.min(dist[j], d2(p, pts[i])); });
  }
  const assign = new Array<number>(pts.length).fill(0);
  for (let it = 0; it < iters; it++) {
    pts.forEach((p, i) => { let bi = 0, bd = Infinity; cents.forEach((c, j) => { const d = d2(p, c); if (d < bd) { bd = d; bi = j; } }); assign[i] = bi; });
    const sums = cents.map(() => [0, 0, 0, 0]);
    pts.forEach((p, i) => { const s = sums[assign[i]]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++; });
    sums.forEach((s, j) => { if (s[3]) cents[j] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
  }
  const counts = cents.map((_, j) => assign.filter(a => a === j).length);
  return cents.map((c, j) => ({ color: c, share: counts[j] / pts.length })).filter(c => c.share > 0).sort((a, b) => b.share - a.share);
}

/** App palette: k=8 over pixels pooled from every screen. Near-identical clusters are merged. */
export function palette(pts: RGB[], k = 8): { hex: string; share: number }[] {
  const out: { color: RGB; share: number }[] = [];
  for (const c of kmeans(pts, k)) {
    const twin = out.find(o => Math.abs(o.color[0] - c.color[0]) + Math.abs(o.color[1] - c.color[1]) + Math.abs(o.color[2] - c.color[2]) < 24);
    if (twin) twin.share += c.share; else out.push({ ...c });
  }
  return out.filter(c => c.share >= 0.005).map(c => ({ hex: hex(c.color), share: Math.round(c.share * 1000) / 1000 }));
}

/** Type scale: 1-D gap clustering of measured font sizes; each cluster is represented by its mode. */
export function typeScale(sizes: number[]): number[] {
  const xs = sizes.filter(s => s > 0).map(half).sort((a, b) => a - b);
  const clusters: number[][] = [];
  for (const s of xs) {
    const last = clusters[clusters.length - 1];
    if (last && s - last[last.length - 1] <= 1) last.push(s); else clusters.push([s]);
  }
  const mode = (c: number[]) => [...new Set(c)].sort((a, b) => c.filter(x => x === b).length - c.filter(x => x === a).length || a - b)[0];
  return clusters.sort((a, b) => b.length - a.length).slice(0, 8).map(mode).sort((a, b) => a - b);
}

/** 64-bit difference hash (hex). Used to dedupe cropped assets across screens. */
export async function dHash(png: Buffer): Promise<string> {
  const { data } = await sharp(png).flatten({ background: "#ffffff" }).greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += data[y * 9 + x] > data[y * 9 + x + 1] ? "1" : "0";
  return BigInt("0b" + bits).toString(16).padStart(16, "0");
}

export function hamming(a: string, b: string): number {
  let x = BigInt("0x" + a) ^ BigInt("0x" + b), n = 0;
  while (x) { n += Number(x & 1n); x >>= 1n; }
  return n;
}

/** Crop a rect (image px) to a PNG buffer, or null when it falls outside the image. */
export async function crop(png: Buffer, img: RawImage, r: Rect): Promise<Buffer | null> {
  const b = clip(img, r);
  if (!b) return null;
  return sharp(png).extract({ left: b.x0, top: b.y0, width: b.x1 - b.x0, height: b.y1 - b.y0 }).png().toBuffer();
}
