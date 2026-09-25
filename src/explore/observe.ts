// Observations (FINAL_PLAN §4.2, BUILD_SPEC T2/T3): normalize the flat element list, wait for the
// screen to settle, then screenshot and hash it. Also home of the chrome rule, which decides which
// elements' words count as the identity of a screen.
import path from "node:path";
import sharp from "sharp";
import type { Device } from "../device/types.ts";
import type { DeviceInfo, NormElement, Observation, RawElement, Rect, Resource } from "../core/schema.ts";
import { ensureDir, mask, nowIso, parseNumber, sleep } from "../core/io.ts";
import { isAdContainer, isAdLabel } from "./guards.ts";
import { isWallText } from "./signals.ts";
import { labelCounts, labelOf, overlapRatio, shortType, signatureOf } from "./signature.ts";

export const BAND = 0.15;        // top/bottom 15% of the screen: app bars and tab bars (chrome)
export const SHORT_LABEL = 24;   // short labels outside repeated groups are chrome (titles, buttons)
export const LONG_TEXT = 40;     // longer text is content (messages, descriptions) wherever it sits
const EDGE_TOL = 8;              // px: "shares a left or right edge"

export interface Timing {
  pollMs: number;          // between element polls while settling
  settleMaxMs: number;     // UI settle gives up after this
  contentPollMs: number;   // after a consume action: poll texts this often...
  contentMinMs: number;    // ...wait at least this long for a reply to start...
  contentMaxMs: number;    // ...and at most this long for it to finish streaming
  clearMaxMs: number;      // after Send: wait this long for the input to clear
}

export const DEFAULT_TIMING: Timing = {
  pollMs: 400, settleMaxMs: 4000, contentPollMs: 1500, contentMinMs: 6000, contentMaxMs: 25_000, clearMaxMs: 3000,
};

/** A local web page (a test app, our own generated mock) answers in milliseconds, not over adb: poll faster. */
export const WEB_TIMING: Timing = {
  pollMs: 200, settleMaxMs: 3000, contentPollMs: 500, contentMinMs: 3000, contentMaxMs: 15_000, clearMaxMs: 2000,
};

// ---------------------------------------------------------------------------------------------
// Exclusions (T2): text the explorer caused is never identity. Everything it typed, and the replies
// it provoked, would otherwise turn every sent message into a "new" chat state.
// ---------------------------------------------------------------------------------------------
export interface Exclusions { exact: Set<string>; typed: string[]; indicators: Indicator[] }

/**
 * A control that shows the current choice (a mode chip reading "Basic · 10", learned when it opened a
 * picker). Its label is selection context (edge.context.selected), never identity: the same chat in
 * another mode is the same state.
 */
export interface Indicator { type: string; identifier: string; rect: Rect }

export function newExclusions(): Exclusions {
  return { exact: new Set(), typed: [], indicators: [] };
}

/** Same short type and resource id, and mostly the same place (a chip's width changes with its label). */
export function isIndicator(e: Pick<RawElement, "type" | "identifier" | "rect">, inds: readonly Indicator[]): boolean {
  return inds.some(i => i.type === shortType(e.type) && i.identifier === (e.identifier ?? "") && overlapRatio(i.rect, e.rect) >= 0.5);
}

const INPUT_TYPE = /edit|input|textfield|textarea|searchbox|textbox/i;

/** A text field: its text is the user's (or a hint), so it is never identity. */
export function isInputType(type: string): boolean {
  return INPUT_TYPE.test(shortType(type));
}

export function excludeTyped(ex: Exclusions, s: string): void {
  const m = mask(s, 200);
  if (m && !ex.typed.includes(m)) ex.typed.push(m);
}

export function excludeText(ex: Exclusions, s: string): void {
  const m = mask(s, 200);
  if (m) ex.exact.add(m);
}

export function isExcluded(ex: Exclusions, text: string): boolean {
  const m = mask(text, 200);
  if (!m) return false;
  // typed strings also match when echoed inside a bubble ("You: Hi! ...")
  return ex.exact.has(m) || ex.typed.some(t => t.length >= 4 && m.includes(t));
}

/** Conversation, not UI: wall-like text ("Out of credits", "Refill") and buttons stay in the identity. */
export function replyLike(text: string, type = ""): boolean {
  return !isWallText(text) && !/button/i.test(type);
}

// ---------------------------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------------------------
const area = (r: Rect) => Math.max(0, r.w) * Math.max(0, r.h);

function contains(outer: Rect, inner: Rect, tol = 2): boolean {
  return inner.x >= outer.x - tol && inner.y >= outer.y - tol
    && inner.x + inner.w <= outer.x + outer.w + tol && inner.y + inner.h <= outer.y + outer.h + tol;
}

/**
 * Drop what is not the app's screen (systemui, zero-area, off-screen, entirely inside the status or
 * navigation rows), sort into reading order, then give each element an id (e1..eN), a re-find key
 * (shortType|identifier|masked label|ordinal), its repeated group, its ad flag and its chrome flag.
 */
export function normalize(raw: RawElement[], info: DeviceInfo, ex: Exclusions): NormElement[] {
  const W = info.widthPx;
  const H = info.heightPx;
  const top = info.statusBarPx;
  const bottom = H - info.navBarPx;
  const kept = raw.filter(e => {
    const r = e.rect;
    if ((e.identifier ?? "").startsWith("com.android.systemui:")) return false;
    if (r.w <= 0 || r.h <= 0) return false;
    if (r.x + r.w <= 0 || r.y + r.h <= 0 || r.x >= W || r.y >= H) return false;
    if (r.y >= bottom || r.y + r.h <= top) return false; // wholly inside an inset row
    return true;
  });
  const els = kept.map((e, i) => ({ e, i }))
    .sort((a, b) => a.e.rect.y - b.e.rect.y || a.e.rect.x - b.e.rect.x || a.i - b.i)
    .map(x => x.e);
  const groups = repeatedGroups(els, H);
  const ads = adFlags(els, W, H);
  const inherited = inheritLabels(els, W, H).label;
  const ordinals = new Map<string, number>();
  return els.map((e, i) => {
    // the key carries the words a chip shows even when they live in a TextView inside it
    const base = `${shortType(e.type)}|${e.identifier ?? ""}|${mask(labelOf(e) || inherited[i])}`;
    const n = ordinals.get(base) ?? 0;
    ordinals.set(base, n + 1);
    const el: NormElement = { ...e, id: `e${i + 1}`, key: `${base}|${n}`, chrome: false };
    if (groups[i]) el.group = groups[i];
    if (ads[i]) el.ad = true;
    el.chrome = isChrome(el, info, ex);
    return el;
  });
}

/**
 * Chrome rule (T2): top/bottom 15% band, or selected, or a short label (<= 24 chars) that is not in a
 * repeated group. Never chrome: ads (they rotate), text fields (their text is the user's), text the
 * explorer caused (typed, replies), a control that shows the current choice (an indicator), and text
 * longer than 40 chars (a message or a description is content wherever it sits). "Checked" alone is not
 * identity: the same picker with another option ticked, or a switch flipped, is the same screen; the
 * choice is recorded as edge context instead. A selected tab is identity (it switches the page).
 */
function isChrome(e: NormElement, info: DeviceInfo, ex: Exclusions): boolean {
  const lab = labelOf(e);
  if (e.ad || isInputType(e.type) || isIndicator(e, ex.indicators)) return false;
  if (lab && isExcluded(ex, lab)) return false;
  if (e.selected) return true;
  if (lab.length > LONG_TEXT) return false;
  const H = info.heightPx;
  const inBand = e.rect.y + e.rect.h <= H * BAND || e.rect.y >= H * (1 - BAND);
  return inBand || (!e.group && lab.length > 0 && lab.length <= SHORT_LABEL);
}

/**
 * Label inheritance (Jetpack Compose, React Native): a chip or an icon button is often an unlabeled
 * clickable View whose words sit in a TextView (or a labelled icon) drawn inside it. An unlabeled,
 * control-sized element - not a full-width bar or card, not a big layout - that holds 1-2 labelled
 * elements takes their words as its label, and those elements become part of it (`owner`), so the control
 * is one action, not one per text. A text field absorbs the hint drawn inside it the same way.
 * Returns, per element, the inherited label ("" = none) and the index of the element that absorbed it (-1).
 */
export function inheritLabels(els: ReadonlyArray<Pick<RawElement, "type" | "text" | "label" | "rect">>, W: number, H: number): { label: string[]; owner: number[] } {
  const label = els.map(() => "");
  const owner = els.map(() => -1);
  const inside = (outer: Rect, inner: Rect) => {
    const w = Math.min(outer.x + outer.w, inner.x + inner.w) - Math.max(outer.x, inner.x);
    const h = Math.min(outer.y + outer.h, inner.y + inner.h) - Math.max(outer.y, inner.y);
    return w > 0 && h > 0 && (w * h) / Math.max(1, area(inner)) >= 0.9 && area(inner) < area(outer);
  };
  // smallest first: a chip inside a card claims its text before the card could
  const order = els.map((_, i) => i).filter(i => !labelOf(els[i])).sort((a, b) => area(els[a].rect) - area(els[b].rect));
  for (const i of order) {
    const r = els[i].rect;
    const input = isInputType(els[i].type);
    if (!input && (r.w > 0.9 * W || area(r) > 0.25 * W * H)) continue; // a bar, a card, a layout
    const kids = els.map((_, j) => j).filter(j => j !== i && labelOf(els[j]) && inside(r, els[j].rect));
    if (!kids.length || kids.length > 2 || kids.some(j => owner[j] >= 0)) continue; // a layout around other controls
    if (input && kids.some(j => isInputType(els[j].type))) continue;
    for (const j of kids) owner[j] = i;
    if (!input) label[i] = kids.sort((a, b) => els[a].rect.y - els[b].rect.y || els[a].rect.x - els[b].rect.x).map(j => labelOf(els[j])).join(" ");
  }
  return { label, owner };
}

/**
 * Repeated groups (T2): 3+ elements of the same short type that share a left edge OR a right edge
 * (within 8 px) in a vertical run. Left-aligned bot bubbles and right-aligned user bubbles of varying
 * widths both qualify; the old "same x and width" rule never matched a chat.
 */
function repeatedGroups(els: RawElement[], H: number): (string | undefined)[] {
  const parent = els.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const member = els.map(() => false);
  const byType = new Map<string, number[]>();
  els.forEach((e, i) => byType.set(shortType(e.type), [...(byType.get(shortType(e.type)) ?? []), i]));
  const edges = [(r: Rect) => r.x, (r: Rect) => r.x + r.w];
  for (const idx of byType.values()) {
    if (idx.length < 3) continue;
    for (const edgeOf of edges) {
      const sorted = [...idx].sort((a, b) => edgeOf(els[a].rect) - edgeOf(els[b].rect));
      let cluster: number[] = [];
      const flush = () => {
        for (const run of verticalRuns(cluster, els, H)) {
          for (const i of run) { member[i] = true; parent[find(i)] = find(run[0]); }
        }
      };
      for (const i of sorted) {
        if (cluster.length && edgeOf(els[i].rect) - edgeOf(els[cluster[0]].rect) > EDGE_TOL) { flush(); cluster = []; }
        cluster.push(i);
      }
      flush();
    }
  }
  const names = new Map<number, string>();
  return els.map((_, i) => {
    if (!member[i]) return undefined;
    const root = find(i);
    if (!names.has(root)) names.set(root, `g${names.size + 1}`);
    return names.get(root);
  });
}

/** Split a same-edge cluster where a large vertical gap separates members; keep runs of 3+ stacked items. */
function verticalRuns(cluster: number[], els: RawElement[], H: number): number[][] {
  const s = [...cluster].sort((a, b) => els[a].rect.y - els[b].rect.y);
  const runs: number[][] = [];
  let run: number[] = [];
  for (const i of s) {
    const prev = run[run.length - 1];
    if (prev !== undefined && els[i].rect.y - (els[prev].rect.y + els[prev].rect.h) > 0.2 * H) { runs.push(run); run = []; }
    run.push(i);
  }
  if (run.length) runs.push(run);
  return runs.filter(r => new Set(r.map(i => Math.round(els[i].rect.y))).size >= 3);
}

/**
 * Ad flags (T3): ad containers by type/id, exact "Ad"/"Sponsored" labels, and everything inside either.
 * A native ad card is often just a card with a "Sponsored" badge, so the smallest element holding the
 * badge plus other labelled content counts as the container too.
 */
function adFlags(els: RawElement[], W: number, H: number): boolean[] {
  const boxes: Rect[] = els.filter(isAdContainer).map(e => e.rect);
  for (const badge of els.filter(isAdLabel)) {
    const card = els
      .filter(c => c !== badge && contains(c.rect, badge.rect) && area(c.rect) < 0.4 * W * H
        && els.some(o => o !== badge && o !== c && labelOf(o) && contains(c.rect, o.rect)))
      .sort((a, b) => area(a.rect) - area(b.rect))[0];
    boxes.push(card ? card.rect : badge.rect);
  }
  return els.map(e => isAdContainer(e) || isAdLabel(e) || boxes.some(b => contains(b, e.rect)));
}

// ---------------------------------------------------------------------------------------------
// Keys, counters, texts
// ---------------------------------------------------------------------------------------------
export function keyPrefix(key: string): string {
  const i = key.lastIndexOf("|");
  return i < 0 ? key : key.slice(0, i);
}

const centreDist = (a: Rect, b: Rect) => Math.hypot(a.x + a.w / 2 - b.x - b.w / 2, a.y + a.h / 2 - b.y - b.h / 2);

/**
 * Re-find an element: exact key; else the same key without its ordinal; else, when it has a resource id,
 * the same type + resource id (the title of another item on the same template); else, without a resource
 * id but knowing where it was, the element of the same type in that place (another story's title or
 * avatar on the same chat template). Nearest to where it was. The caller re-checks the guard rails on
 * whatever a fallback returns.
 */
export function findByKey(els: NormElement[], key: string, hint?: Rect): NormElement | undefined {
  const exact = els.find(e => e.key === key);
  if (exact) return exact;
  const nearest = (xs: NormElement[]) => (hint ? [...xs].sort((a, b) => centreDist(a.rect, hint) - centreDist(b.rect, hint)) : xs)[0];
  const p = keyPrefix(key);
  const same = els.filter(e => keyPrefix(e.key) === p);
  if (same.length) return nearest(same);
  const [type, id] = key.split("|");
  if (id) {
    const kin = els.filter(e => e.key.startsWith(`${type}|${id}|`));
    return kin.length === 1 || hint ? nearest(kin) : undefined;
  }
  if (!hint) return undefined;
  return nearest(els.filter(e => shortType(e.type) === type && !e.identifier && !isInputType(e.type) && overlapRatio(e.rect, hint) >= 0.6));
}

export interface Counter { resource: string; value: number }

/** Read every resource whose bound element (by key) is on screen. */
export function readCounters(els: NormElement[], resources: Resource[]): Counter[] {
  const out: Counter[] = [];
  for (const r of resources) {
    for (const b of r.bindings) {
      const el = findByKey(els, b.elKey);
      const v = el ? parseNumber(labelOf(el)) : null;
      if (v !== null) { out.push({ resource: r.id, value: v }); break; }
    }
  }
  return out;
}

export function textsOf(els: NormElement[]): string[] {
  return [...new Set(els.map(labelOf).filter(Boolean))];
}

export interface Snapshot { raw: RawElement[]; els: NormElement[]; sig: string[]; counters: Counter[]; texts: string[] }

export function snapshot(raw: RawElement[], info: DeviceInfo, ex: Exclusions, resources: Resource[]): Snapshot {
  const els = normalize(raw, info, ex);
  return { raw, els, sig: signatureOf(els), counters: readCounters(els, resources), texts: textsOf(els) };
}

// ---------------------------------------------------------------------------------------------
// Settling
// ---------------------------------------------------------------------------------------------
type Look = (raw: RawElement[]) => Snapshot;

/** Poll until two consecutive signatures AND counter values agree (or give up after settleMaxMs). */
export async function settleUi(dev: Device, look: Look, t: Timing): Promise<Snapshot> {
  const t0 = Date.now();
  let prev: string | null = null;
  for (;;) {
    const snap = look(await dev.elements());
    const k = `${snap.sig.join("\n")}#${JSON.stringify(snap.counters)}`;
    if (k === prev || Date.now() - t0 >= t.settleMaxMs) return snap;
    prev = k;
    await sleep(t.pollMs);
  }
}

/**
 * After spending: compare ALL text, which waits out streamed replies. Stable for two polls is enough
 * once something new (not our own typing) has appeared; otherwise keep waiting up to contentMinMs,
 * because a reply that has not started yet also looks "stable".
 */
export async function settleContent(dev: Device, look: Look, t: Timing, before: ReadonlyMap<string, number>, isOurs: (s: string) => boolean): Promise<Snapshot> {
  const t0 = Date.now();
  let prev: string | null = null;
  for (;;) {
    const snap = look(await dev.elements());
    const now = labelCounts(snap.els);
    const k = [...now].map(([x, n]) => `${n}x${x}`).join("\n");
    const elapsed = Date.now() - t0;
    // counted, so a reply identical to an earlier one still counts as a reply
    const replied = [...now].some(([x, n]) => n > (before.get(x) ?? 0) && !isOurs(x));
    if ((k === prev && (replied || elapsed >= t.contentMinMs)) || elapsed >= t.contentMaxMs) return snap;
    prev = k;
    await sleep(t.contentPollMs);
  }
}

// ---------------------------------------------------------------------------------------------
// Observe = settle + foreground + screenshot + dHash
// ---------------------------------------------------------------------------------------------
export interface ObserveCtx { dev: Device; info: DeviceInfo; ex: Exclusions; resources: Resource[]; runDir: string; timing: Timing }
export interface ObserveOpts { mode: "ui" | "content"; before?: Observation; excludeAppeared?: boolean }

export async function observe(o: ObserveCtx, id: string, step: number, opts: ObserveOpts): Promise<Observation> {
  const look: Look = raw => snapshot(raw, o.info, o.ex, o.resources);
  let snap = opts.mode === "content" && opts.before
    ? await settleContent(o.dev, look, o.timing, labelCounts(opts.before.elements), s => isExcluded(o.ex, s))
    : await settleUi(o.dev, look, o.timing);
  // T2: the reply we just provoked is conversation, not identity (wall text and buttons stay). Only while
  // the screen mostly stayed: a spending tap that navigated ("Start chat") shows a new screen, whose words are
  // its identity, not a reply.
  const stayed = (b: Observation) => !b.texts.length || b.texts.filter(t => snap.texts.includes(t)).length / b.texts.length >= 0.5;
  if (opts.excludeAppeared && opts.before && stayed(opts.before)) {
    const seen = new Set(opts.before.texts);
    const extra = snap.els.filter(e => labelOf(e) && !seen.has(labelOf(e)) && replyLike(labelOf(e), e.type)).map(labelOf);
    if (extra.length) {
      const ex2: Exclusions = { exact: new Set([...o.ex.exact, ...extra.map(s => mask(s, 200))]), typed: o.ex.typed, indicators: o.ex.indicators };
      snap = snapshot(snap.raw, o.info, ex2, o.resources);
    }
  }
  const fg = await o.dev.foreground();
  const rel = `obs/${id}.png`;
  const abs = path.join(o.runDir, rel);
  ensureDir(path.dirname(abs));
  await o.dev.screenshot(abs);
  return {
    id, step, ts: nowIso(), fg, screenshot: rel, elements: snap.els, signature: snap.sig,
    dhash: await dhashOf(abs), scrollIndex: 0, counters: snap.counters, texts: snap.texts,
  };
}

/** 64-bit difference hash (9x8 grayscale), as hex. Used for identity only on sparse screens. */
export async function dhashOf(file: string | Buffer): Promise<string> {
  try {
    const { data, info } = await sharp(file).removeAlpha().greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
    const ch = info.channels;
    let bits = "";
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += data[(y * 9 + x) * ch] > data[(y * 9 + x + 1) * ch] ? "1" : "0";
    return BigInt(`0b${bits}`).toString(16).padStart(16, "0");
  } catch {
    return "";
  }
}
