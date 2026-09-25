// PII redaction. The model directory is shared (mock, slides, report, the LLM), so account emails and
// phone numbers seen on screen (profile pages, billing sheets) are blurred in every screenshot we
// copy and masked in every text we keep: element texts and labels, element re-find keys (they embed
// the masked label), action intents, effect texts, signals, transcripts, externals and the synthesized
// economy. Detection is by regex on the text; the blur covers the element's rect.
import sharp, { type OverlayOptions } from "sharp";
import type { Action, Rect } from "../core/schema.ts";

// '#' is allowed because element keys mask digits as '#' ("jane2@x.com" -> "jane#@x.com").
const EMAIL = /[A-Z0-9._%+#-]+@[A-Z0-9#-]+(?:\.[A-Z0-9#-]+)*\.[A-Z]{2,}/gi;
// Phone-like runs: digits with spaces, dots, dashes or brackets. Kept only with 9-15 digits, so
// prices ("1,000 credits"), counters and clock times never match.
const PHONE = /\+?\d[\d\s().-]{7,}\d/g;
// Dates and clock times are blanked out before phone matching, so "2026-09-25 09:41" or
// "25.09.2026 14:30" never merge into a phone-length digit run. A date is 3 groups exactly: a longer
// dotted run ("06.12.34.56.78") is a phone, not a date.
const DATE = /(?<!\d[-/.]?)(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})(?![-/.]?\d)/g;
const TIME = /(?<!\d)\d{1,2}:\d{2}(?::\d{2})?(?!\d)/g;
// Thousands grouped with dots ("1.000.000.000") is an amount, not a phone; so is a run right next to a currency.
const DOT_GROUPED = /^\d{1,3}(?:\.\d{3}){2,}$/;
const CURRENCY_BEFORE = /(?:[$€£¥₹₩₽]|US\$|R\$|Rp|USD|EUR)\s?$/;
const CURRENCY_AFTER = /^\s?(?:[$€£¥₹₩₽]|USD|EUR)/;

/** Phone matches as [start, end) spans of the ORIGINAL string. */
function phoneSpans(s: string): [number, number][] {
  const blank = (m: string) => "_".repeat(m.length);
  const masked = s.replace(DATE, blank).replace(TIME, blank);
  const out: [number, number][] = [];
  for (const m of masked.matchAll(PHONE)) {
    const start = m.index!, end = start + m[0].length;
    const digits = m[0].replace(/\D/g, "").length;
    if (digits < 9 || digits > 15) continue;
    if (DOT_GROUPED.test(m[0].trim())) continue;
    if (CURRENCY_BEFORE.test(s.slice(Math.max(0, start - 4), start)) || CURRENCY_AFTER.test(s.slice(end, end + 4))) continue;
    out.push([start, end]);
  }
  return out;
}

export function hasPii(s: string | undefined): boolean {
  if (!s) return false;
  EMAIL.lastIndex = 0;
  return EMAIL.test(s) || phoneSpans(s).length > 0;
}

export function redactText<T extends string | undefined>(s: T): T {
  if (!s) return s;
  // Emails first: an address with a digit run in it must go whole, not as "jane.[phone]@x.com".
  const e = s.replace(EMAIL, "[email]");
  let out = "";
  let at = 0;
  for (const [a, b] of phoneSpans(e)) { out += e.slice(at, a) + "[phone]"; at = b; }
  return (out + e.slice(at)) as T;
}

/** Element re-find keys ("type|identifier|masked label|ordinal") embed the label, lowercased and cut
 *  to 40 chars, so a truncated address ("jane.doe@exam") must go too: any token with an "@" inside. */
export function redactKey<T extends string | undefined>(k: T): T {
  if (!k) return k;
  return redactText(k).replace(/[^\s|@]+@[^\s|@]+/g, "[email]") as T;
}

/** An action as kept in the model: its key, intent, typed input and notes carry no PII. */
export function redactAction(a: Action): Action {
  return {
    ...a, elKey: redactKey(a.elKey), sendElKey: redactKey(a.sendElKey), intent: redactText(a.intent),
    input: redactText(a.input), skip: redactText(a.skip), note: redactText(a.note),
  };
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
