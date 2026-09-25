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
  return `${base}|${mask(labelOf(e))}${e.selected || e.checked ? "|sel" : ""}`;
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
 * "Same template, different content": identical structure (types + resource ids) and at most one
 * label differing on each side, none of them a selected item or wall-like text. This is the
 * heuristic answer to the annotator's sameAs question (story detail A vs story detail B).
 */
export function templateSame(a: string[], b: string[]): boolean {
  const sa = new Set(a.map(skeletonOf));
  const sb = new Set(b.map(skeletonOf));
  if (sa.size !== sb.size || [...sa].some(t => !sb.has(t))) return false;
  const ca = new Set(chromeTexts(a));
  const cb = new Set(chromeTexts(b));
  const onlyA = [...ca].filter(t => !cb.has(t));
  const onlyB = [...cb].filter(t => !ca.has(t));
  const diff = [...onlyA, ...onlyB];
  if (diff.some(t => t.endsWith("|sel") || isWallText(textOf(t)))) return false;
  return onlyA.length <= 1 && onlyB.length <= 1;
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
export function matchState(states: State[], obs: Seen, variants?: ReadonlyMap<string, string[][]>): Match {
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
