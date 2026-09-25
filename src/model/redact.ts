// PII redaction. The model directory is shared (mock, slides, report, the LLM), so account emails and
// phone numbers seen on screen (profile pages, billing sheets) are blurred in every screenshot we
// copy and masked in every text we keep. Detection is by regex on the element text; the blur covers
// the element's rect.
import sharp, { type OverlayOptions } from "sharp";
import type { Rect } from "../core/schema.ts";

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}/gi;
// Phone-like runs: digits with spaces, dots, dashes or brackets. Kept only with 9-15 digits, so
// prices ("1,000 credits"), dates and clock times never match.
const PHONE = /\+?\d[\d\s().-]{7,}\d/g;

function phoneMatches(s: string): string[] {
  return (s.match(PHONE) ?? []).filter(m => { const d = m.replace(/\D/g, "").length; return d >= 9 && d <= 15; });
}

export function hasPii(s: string | undefined): boolean {
  if (!s) return false;
  EMAIL.lastIndex = 0;
  return EMAIL.test(s) || phoneMatches(s).length > 0;
}

export function redactText<T extends string | undefined>(s: T): T {
  if (!s) return s;
  let out: string = s.replace(EMAIL, "[email]");
  for (const m of phoneMatches(out)) out = out.replace(m, "[phone]");
  return out as T;
}

/** Blur rects (image px) in a PNG. Returns the input untouched when there is nothing to blur. */
export async function blurRects(png: Buffer, rects: Rect[]): Promise<Buffer> {
  if (!rects.length) return png;
  const meta = await sharp(png).metadata();
  const W = meta.width ?? 0, H = meta.height ?? 0;
  const layers: OverlayOptions[] = [];
  for (const r of rects) {
    const left = Math.max(0, Math.floor(r.x) - 4), top = Math.max(0, Math.floor(r.y) - 4);
    const width = Math.min(W - left, Math.ceil(r.w) + 8), height = Math.min(H - top, Math.ceil(r.h) + 8);
    if (width < 2 || height < 2) continue;
    // Strong sigma relative to the text height: the result must be unreadable, not just soft.
    const input = await sharp(png).extract({ left, top, width, height }).blur(Math.max(8, height / 2)).png().toBuffer();
    layers.push({ input, left, top });
  }
  return layers.length ? sharp(png).composite(layers).png().toBuffer() : png;
}
