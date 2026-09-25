// State identity and diffs (FINAL_PLAN §4.2 as amended by BUILD_SPEC T2).
//
// A state is the SET of tokens over its normalized elements. Chrome (bars, titles, buttons, the selected
// tab) contributes its masked text; content (list rows, messages, feed cards) contributes only its type
// and resource id. Because it is a set and digits are masked, a chat with 3 or 30 messages, a refreshed
// feed, and "450" vs "360" credits are the same state; another selected tab, another title, or a sheet
// opened on top is a different one.
import type { Effect, NormElement, Observation, Rect, State } from "../core/schema.ts";
import { mask, parseNumber } from "../core/io.ts";
import { isWallText } from "./signals.ts";

export function shortType(t: string): string {
  const parts = t.split(".");
  return parts[parts.length - 1] || t;
}

export function labelOf(e: { text?: string; label?: string }): string {
  return e.text?.trim() || e.label?.trim() || "";
}

export function token(e: NormElement): string {
  const base = `${shortType(e.type)}|${e.identifier ?? ""}`;
  if (!e.chrome) return base;
  // a selected tab switches the page: identity. A ticked option or a flipped switch is not (it is edge context).
  return `${base}|${mask(labelOf(e))}${e.selected ? "|sel" : ""}`;
}

export function signatureOf(els: NormElement[]): string[] {
  return [...new Set(els.map(token))].sort();
}

const fields = (t: string) => t.split("|");
/** type|identifier: the structure of a token without its words. */
export const skeletonOf = (t: string) => fields(t).slice(0, 2).join("|");
const textOf = (t: string) => fields(t)[2] ?? "";

/** Chrome tokens that carry a label: the words that make a screen "this screen". */
export function chromeTexts(sig: string[]): string[] {
  return sig.filter(t => textOf(t) !== "");
}

export function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union ? inter / union : 1;
}

/** Hamming distance between two 64-bit dHashes in hex. Unknown hashes are maximally far apart. */
export function hamming(a: string, b: string): number {
  if (!a || !b || a.length !== b.length) return 64;
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let n = 0;
  while (x) { n += Number(x & 1n); x >>= 1n; }
  return n;
}

/**
 * "Same template, different content": `seen` (an observation) is another look at `known` (a state) when
 * the structure is identical (types + resource ids) and the labels that differ are swaps - one item's
 * words for another's (a title, an avatar's initials, a mic that became Send) - or labels that are no
 * longer on screen (a date separator scrolled away): at most 2 of each, with at least as many labels
 * unchanged, none of them a selected item or wall-like text. Labels that appear on top of everything
 * `known` shows are not another item: something opened (a sheet whose rows are too long to carry
 * identity, a dialog) or a panel expanded. This is the heuristic answer to the annotator's sameAs question.
 */
export function templateSame(known: string[], seen: string[]): boolean {
  const d = labelDiff(known, seen);
  if (!d) return false;
  const diff = [...d.onlyA, ...d.onlyB];
  if (diff.some(t => t.endsWith("|sel") || isWallText(textOf(t)))) return false;
  const swaps = d.onlyB.length;                     // every new label must replace an old one
  const gone = d.onlyA.length - swaps;              // old labels simply no longer shown
  if (gone < 0) return false;
  const kept = chromeTexts(known).filter(t => !d.onlyA.includes(t)).length;
  if (swaps > 2 || gone > 2) return false;
  return swaps + gone <= 1 || kept >= Math.max(swaps, gone);
}

/** Same skeleton (types + resource ids) on both sides: the chrome labels only on one side, else null. */
function labelDiff(a: string[], b: string[]): { onlyA: string[]; onlyB: string[] } | null {
  const sa = new Set(a.map(skeletonOf));
  const sb = new Set(b.map(skeletonOf));
  if (sa.size !== sb.size || [...sa].some(t => !sb.has(t))) return null;
  const ca = new Set(chromeTexts(a));
  const cb = new Set(chromeTexts(b));
  return { onlyA: [...ca].filter(t => !cb.has(t)), onlyB: [...cb].filter(t => !ca.has(t)) };
}

/**
 * The same screen with some controls relabelled: identical skeleton, and every label that changed did so
 * on an element of the same type and resource id ("Basic · 10" -> "Premium · 30" on the mode chip, one
 * item's title for another's). Looser than templateSame: used by the wall test, where a mode switch or
 * another item must never count as a wall even when the new label is monetization vocabulary.
 */
export function relabelOnly(a: string[], b: string[]): boolean {
  const d = labelDiff(a, b);
  if (!d) return false;
  const ka = d.onlyA.map(skeletonOf).sort();
  const kb = d.onlyB.map(skeletonOf).sort();
  return ka.length === kb.length && ka.every((t, i) => t === kb[i]);
}

// ---------------------------------------------------------------------------------------------
// Overlays: a sheet, dialog or menu drawn over a screen whose elements are still listed
// ---------------------------------------------------------------------------------------------
const area = (r: Rect) => Math.max(0, r.w) * Math.max(0, r.h);

function interArea(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/** Share of the smaller rect covered by the other one. */
export function overlapRatio(a: Rect, b: Rect): number {
  const m = Math.min(area(a), area(b));
  return m > 0 ? interArea(a, b) / m : 0;
}

const INTERSECT_MIN_PX = 4;
const intersects = (a: Rect, b: Rect) =>
  Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > INTERSECT_MIN_PX && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > INTERSECT_MIN_PX;

export const OVERLAY_KEEP = 0.5;   // share of the base screen still in place when something opened on top of it
type Screenish = { elements: NormElement[] };
type Dims = { widthPx: number; heightPx: number };

/**
 * Elements of `top` that sit over `base`: most of base is still there (same token at the same place; a dimmed
 * backdrop is invisible in an element list), and what is new - at least two labels, one of them chrome (a
 * title or a button) - is drawn over something that was there. A control that only changed in place (mic
 * -> Send, a chip's label, a switch) is not part of it, nor are replies below the last message.
 * Also answers the reverse question: overlayOf(before, after) = what closed. Returns the elements or null.
 */
export function overlayOf(top: Screenish, base: Screenish | null | undefined, dims: Dims): NormElement[] | null {
  if (!base?.elements.length || !top.elements.length) return null;
  const big = (e: NormElement) => area(e.rect) >= 0.9 * dims.widthPx * dims.heightPx; // root containers are always there
  const samePlace = (a: NormElement, b: NormElement) =>
    token(a) === token(b) && Math.abs(a.rect.x - b.rect.x) <= 8 && Math.abs(a.rect.y - b.rect.y) <= 8;
  const under = base.elements.filter(e => !big(e));
  if (!under.length) return null;
  const kept = under.filter(b => top.elements.some(e => samePlace(e, b)));
  if (kept.length / under.length < OVERLAY_KEEP) return null;
  const gone = under.filter(b => !kept.includes(b));
  const relabelled = (e: NormElement) => gone.some(b => shortType(b.type) === shortType(e.type)
    && (b.identifier ?? "") === (e.identifier ?? "") && overlapRatio(b.rect, e.rect) >= 0.5);
  const added = top.elements.filter(e => !big(e) && !base.elements.some(b => samePlace(e, b)) && !relabelled(e));
  const labelled = added.filter(e => labelOf(e));
  if (labelled.length < 2 || !labelled.some(e => e.chrome)) return null;
  return added.some(e => kept.some(b => intersects(e.rect, b.rect))) ? added : null;
}

/** The identity tokens an overlay contributes (its labelled chrome): a state that shows it must have them. */
export function overlayTokens(els: NormElement[]): string[] {
  return [...new Set(els.filter(e => e.chrome && labelOf(e)).map(token))].sort();
}

export const SAME = 0.85;      // Jaccard at or above: same state
export const BORDER = 0.6;     // Jaccard in [BORDER, SAME): ask the annotator (sameAs)
export const SPARSE = 6;       // fewer elements than this (canvas, WebView): fall back to pixels
export const DHASH_MAX = 10;

export interface Match {
  state?: State;
  how: "exact" | "jaccard" | "dhash" | "none";
  score: number;               // best Jaccard
  borderline: State[];         // candidates for the annotator's sameAs
  nearest: State[];            // top 3 by Jaccard (context for the annotator)
}

type Seen = Pick<Observation, "signature" | "dhash" | "elements">;

/**
 * exact -> Jaccard >= 0.85 -> dHash for sparse screens -> borderline for the annotator -> new.
 * `variants` are extra signatures of a state that the explorer already decided belong to it (a scrolled
 * view, a sameAs page for another item), so coming back to them is recognised directly.
 */
export function matchState(states: State[], obs: Seen, variants?: ReadonlyMap<string, string[][]>, veto?: (s: State) => boolean): Match {
  // veto: states this screen cannot be, whatever the overlap (an overlay state without its overlay on screen,
  // a screen without the sheet that just opened on top of it)
  if (veto) states = states.filter(s => !veto(s));
  const sig = new Set(obs.signature);
  const key = obs.signature.join("\n");
  const sigsOf = (s: State) => [s.signature, ...(variants?.get(s.id) ?? [])];
  const scored = states.map(s => {
    let best = { j: -1, sig: s.signature };
    for (const v of sigsOf(s)) { const j = jaccard(sig, new Set(v)); if (j > best.j) best = { j, sig: v }; }
    return { s, ...best };
  }).sort((x, y) => y.j - x.j);
  const nearest = scored.slice(0, 3).map(x => x.s);
  const exact = states.find(s => sigsOf(s).some(v => v.join("\n") === key));
  if (exact) return { state: exact, how: "exact", score: 1, borderline: [], nearest };
  const best = scored[0];
  if (best && best.j >= SAME && !hidesOverlay(best.sig, obs.signature)) {
    return { state: best.s, how: "jaccard", score: best.j, borderline: [], nearest };
  }
  if (obs.elements.length < SPARSE && obs.dhash) {
    const d = states.map(s => ({ s, h: hamming(s.dhash, obs.dhash) })).sort((x, y) => x.h - y.h)[0];
    if (d && d.h <= DHASH_MAX) return { state: d.s, how: "dhash", score: best?.j ?? 0, borderline: [], nearest };
  }
  const borderline = scored.filter(x => x.j >= BORDER).slice(0, 3).map(x => x.s);
  return { how: "none", score: Math.max(0, best?.j ?? 0), borderline, nearest };
}

/**
 * A high overlap is trusted only when little labelled chrome was added: a big screen with a small
 * dialog on top overlaps > 85%, and missing that dialog would hide a wall.
 */
function hidesOverlay(known: string[], seen: string[]): boolean {
  const k = new Set(known);
  const added = chromeTexts(seen).filter(t => !k.has(t));
  return added.length > 2 || added.some(t => isWallText(textOf(t)));
}

export type CounterEffect = Extract<Effect, { kind: "counter" }>;

export function counterEffects(fx: Effect[]): CounterEffect[] {
  return fx.filter((f): f is CounterEffect => f.kind === "counter");
}

const MAX_TEXT_FX = 12;

/** Visible labels as a multiset: the same reply twice is still a new reply. */
export function labelCounts(els: NormElement[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of els) { const l = labelOf(e); if (l) m.set(l, (m.get(l) ?? 0) + 1); }
  return m;
}

/**
 * What changed after an action: bound counters (before/after/delta), numeric changes on unbound chrome
 * (resource "auto:<elKey>"), and texts that appeared or disappeared (counted, so a repeated reply still
 * shows). Text changes are only recorded when the screen stayed mostly the same (a reply, a toast, an
 * overlay); after navigation they are noise.
 */
export function diffEffects(before: Observation, after: Observation, boundKeys: ReadonlySet<string>): Effect[] {
  const fx: Effect[] = [];
  const was = new Map(before.counters.map(c => [c.resource, c.value]));
  for (const c of after.counters) {
    const b = was.get(c.resource);
    if (b !== undefined && b !== c.value) fx.push({ kind: "counter", resource: c.resource, before: b, after: c.value, delta: c.value - b });
  }
  const prev = new Map(before.elements.filter(e => e.chrome).map(e => [e.key, e]));
  for (const e of after.elements) {
    if (!e.chrome || boundKeys.has(e.key)) continue;
    const p = prev.get(e.key);
    if (!p) continue;
    const x = parseNumber(labelOf(p));
    const y = parseNumber(labelOf(e));
    if (x !== null && y !== null && x !== y) fx.push({ kind: "counter", resource: `auto:${e.key}`, before: x, after: y, delta: y - x });
  }
  const bt = labelCounts(before.elements);
  const at = labelCounts(after.elements);
  const kept = [...bt.keys()].filter(t => at.has(t)).length;
  if (bt.size && kept / bt.size >= 0.5) {
    const grew = (a: Map<string, number>, b: Map<string, number>) => [...a].filter(([t, n]) => n > (b.get(t) ?? 0)).map(([t]) => t);
    for (const text of grew(at, bt).slice(0, MAX_TEXT_FX)) fx.push({ kind: "appeared", text });
    for (const text of grew(bt, at).slice(0, MAX_TEXT_FX)) fx.push({ kind: "disappeared", text });
  }
  return fx;
}
