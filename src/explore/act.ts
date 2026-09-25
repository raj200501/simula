// Performing one action on the device: re-find the element by key, tap it safely, type and send.
// Coordinates are always computed by us (never positional refs), from a fresh element list.
import type { Device } from "../device/types.ts";
import type { Action, DeviceInfo, NormElement, RawElement, Rect } from "../core/schema.ts";
import { mask, sleep } from "../core/io.ts";
import type { Timing } from "./observe.ts";
import { findByKey } from "./observe.ts";
import { OUT_OF_SCOPE, guardReason } from "./guards.ts";
import { DEFAULT_INPUT, SEND_RE, isInput } from "./heuristic.ts";
import { labelOf, overlapRatio, shortType } from "./signature.ts";

export interface ActCtx {
  dev: Device;
  info: DeviceInfo;
  timing: Timing;
  normalize: (raw: RawElement[]) => NormElement[];
}

export type ActResult =
  | { ok: true; typed?: string; sent?: boolean; note?: string }
  | { ok: false; reason: string; skip?: boolean };

export const MIN_VISIBLE = 0.4; // T8: tap only if at least 40% of the element is inside the safe area

export function safeArea(info: DeviceInfo): Rect {
  return { x: 0, y: info.statusBarPx, w: info.widthPx, h: info.heightPx - info.statusBarPx - info.navBarPx };
}

function intersect(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const w = Math.min(a.x + a.w, b.x + b.w) - x;
  const h = Math.min(a.y + a.h, b.y + b.h) - y;
  return w > 0 && h > 0 ? { x, y, w, h } : null;
}

export interface SafeTap { point?: { x: number; y: number }; visible: number; scroll?: "up" | "down"; dist?: number }

/**
 * T8: tap the centre of the element's rect intersected with the safe area, so a row half hidden under
 * the navigation bar is tapped on its visible half (the bar's gesture zone means "go home"). If less
 * than 40% is visible, say which way to scroll it into view instead.
 */
export function safeTap(rect: Rect, info: DeviceInfo): SafeTap {
  const safe = safeArea(info);
  const total = rect.w * rect.h;
  const v = intersect(rect, safe);
  const visible = v && total > 0 ? (v.w * v.h) / total : 0;
  if (v && visible >= MIN_VISIBLE) return { point: { x: Math.round(v.x + v.w / 2), y: Math.round(v.y + v.h / 2) }, visible };
  const below = rect.y + rect.h / 2 > safe.y + safe.h / 2;
  const margin = 0.05 * info.heightPx;
  const dist = below ? rect.y + rect.h - (safe.y + safe.h) + margin : safe.y - rect.y + margin;
  return { visible, scroll: below ? "up" : "down", dist: Math.max(0, dist) };
}

/** Swipe clamped to 15-85% of the height, away from the gesture edges. "up" reveals what is below. */
export async function swipe(dev: Device, info: DeviceInfo, dir: "up" | "down", dist: number): Promise<void> {
  const H = info.heightPx;
  const lo = 0.15 * H;
  const hi = 0.85 * H;
  const d = Math.max(0.1 * H, Math.min(dist, hi - lo));
  const slack = (hi - lo - d) / 2;
  const y = dir === "up" ? hi - slack : lo + slack;
  await dev.swipe(dir, Math.round(info.widthPx / 2), Math.round(y), Math.round(d));
}

const look = async (c: ActCtx) => c.normalize(await c.dev.elements());

/**
 * Find the element by key on the live screen; if absent, scroll down (up to twice) to reveal it, unless it
 * sat in the top bar (a bar does not scroll: scrolling would only move the content under it).
 */
async function locate(c: ActCtx, key: string, hint?: Rect): Promise<NormElement | undefined> {
  const scrolls = hint && hint.y + hint.h <= c.info.heightPx * 0.15 ? 0 : 2;
  for (let i = 0; i <= scrolls; i++) {
    const el = findByKey(await look(c), key, hint);
    if (el) return el;
    if (i < scrolls) { await swipe(c.dev, c.info, "up", 0.4 * c.info.heightPx); await sleep(c.timing.pollMs); }
  }
  return undefined;
}

async function tapElement(c: ActCtx, el: NormElement): Promise<ActResult> {
  let t = safeTap(el.rect, c.info);
  if (!t.point) {
    await swipe(c.dev, c.info, t.scroll!, t.dist!);
    await sleep(c.timing.pollMs);
    const again = findByKey(await look(c), el.key, el.rect);
    if (!again) return { ok: false, reason: "element lost while scrolling it into view" };
    t = safeTap(again.rect, c.info);
    if (!t.point) return { ok: false, reason: `only ${Math.round(t.visible * 100)}% visible after scrolling (not safely tappable)`, skip: true };
  }
  await c.dev.tap(t.point.x, t.point.y);
  return { ok: true };
}

export async function perform(c: ActCtx, a: Action, hint?: Rect): Promise<ActResult> {
  switch (a.kind) {
    case "back":
      await c.dev.back();
      return { ok: true };
    case "scroll":
      await swipe(c.dev, c.info, "up", 0.4 * c.info.heightPx);
      return { ok: true };
    case "tap": {
      if (!a.elKey && a.tapPoint) {
        // vision fallback for canvas screens: clamp into the safe area
        const s = safeArea(c.info);
        await c.dev.tap(Math.min(Math.max(a.tapPoint.x, s.x + 1), s.x + s.w - 1), Math.min(Math.max(a.tapPoint.y, s.y + 1), s.y + s.h - 1));
        return { ok: true, note: "vision tap point" };
      }
      const el = a.elKey ? await locate(c, a.elKey, hint) : undefined;
      if (!el) return { ok: false, reason: "element not found on screen" };
      // re-found by place on another item of the template: its own words must pass the guard rails too
      const veto = el.key !== a.elKey ? guardReason(el, labelOf(el), a.kind) : undefined;
      if (veto) return { ok: false, reason: `${veto} (the element found in its place)`, skip: true };
      return tapElement(c, el);
    }
    case "type-send":
    case "consume":
      return spend(c, a, hint);
  }
}

/**
 * An action that types or spends. On a text field: type, check that it landed, send. On anything else - a
 * "Claim", "Start chat" or "Generate" button that the annotator called spending - it is a tap (the action
 * keeps its kind, so its effects and walls still count as spending); when the control belongs to a prompt
 * field (on its row, or just above it) that is empty, the field gets the action's text first, so the tap
 * has something to act on.
 */
async function spend(c: ActCtx, a: Action, hint?: Rect): Promise<ActResult> {
  if (!a.elKey && a.tapPoint) return perform(c, { ...a, kind: "tap" }, hint);
  const el = a.elKey ? await locate(c, a.elKey, hint) : undefined;
  if (!el) return { ok: false, reason: a.kind === "type-send" || !a.elKey ? "input field not found" : "element not found on screen" };
  if (isInput(el)) return typeAndSend(c, a, el);
  const veto = el.key !== a.elKey ? guardReason(el, labelOf(el), "tap") : undefined;
  if (veto) return { ok: false, reason: `${veto} (the element found in its place)`, skip: true };
  const field = companionField(await look(c), el);
  const text = a.input?.trim() || DEFAULT_INPUT;
  let typed: string | undefined;
  if (field && !(field.text ?? "").trim()) {
    const filled = await fillField(c, field, text);
    if (!filled.ok) return filled;
    typed = text;
  }
  const target = typed ? findByKey(await look(c), el.key, el.rect) ?? el : el;
  const t = await tapElement(c, target);
  if (!t.ok) return t;
  const name = labelOf(el) || el.identifier || shortType(el.type);
  return { ok: true, typed, note: typed ? `filled its prompt field, then tapped "${name}"` : `tapped "${name}" (a spending control, not a text field)` };
}

/**
 * The text field a control acts on: on the control's row (a Send next to a composer), or just above it and
 * overlapping it horizontally (a "Generate" button under a prompt field). Exported for tests.
 */
export function companionField(els: NormElement[], control: NormElement): NormElement | undefined {
  const cy = (e: NormElement) => e.rect.y + e.rect.h / 2;
  const xOverlap = (f: NormElement) => Math.min(f.rect.x + f.rect.w, control.rect.x + control.rect.w) - Math.max(f.rect.x, control.rect.x);
  const onRow = (f: NormElement) => Math.abs(cy(f) - cy(control)) <= Math.max(f.rect.h, 48);
  const above = (f: NormElement) => {
    const gap = control.rect.y - (f.rect.y + f.rect.h);
    return gap >= -8 && gap <= Math.max(3 * f.rect.h, 400) && xOverlap(f) > 0;
  };
  return els.filter(f => f !== control && isInput(f) && (onRow(f) || above(f)))
    .sort((x, y) => Math.abs(cy(x) - cy(control)) - Math.abs(cy(y) - cy(control)))[0];
}

/** The typed text is in the field: its own text, or a text drawn inside its rect (Compose draws it apart). */
function landedIn(els: NormElement[], field: NormElement, text: string): boolean {
  const want = mask(text, 200);
  const box = (refindField(els, field, text) ?? field).rect;
  return els.some(e => mask(labelOf(e), 200).includes(want) && overlapRatio(e.rect, box) >= 0.5);
}

/**
 * Tap the field, type (never ENTER: it is a newline in chat apps), then check that the text landed in that
 * field - many devices (Compose apps under mobile-mcp) never report which field has the focus, so the check
 * is on the result. Real devices add three wrinkles the checks allow for:
 * - a first tap right after a screen change is often swallowed: tap again while no field reports focus;
 * - the keyboard moves a bottom composer up: a focused field of the same type, id and column is the same
 *   field, not "another" one;
 * - the element list lags the keys: poll a few times before deciding.
 * If the keys went nowhere (the text shows nowhere on screen: the field was not focused yet), tap once more
 * and type again. If the text went somewhere else (it shows outside the field), press BACK (hides the
 * keyboard) and fail: never send what did not land in the field. If the tap visibly gave the focus to a
 * different field (it opened a profile sheet), nothing is typed at all. A draft already holding the text is
 * not typed twice. The failure reason says what the field shows, so a trajectory explains itself.
 * On success, `before` is the screen just before typing (to see what the typing made appear).
 */
async function fillField(c: ActCtx, field: NormElement, text: string): Promise<{ ok: true; before: NormElement[] } | { ok: false; reason: string }> {
  const want = mask(text, 200);
  const same = sameFieldAs(field);
  let before: NormElement[] = [];
  for (let i = 0; i < 2; i++) {
    const target = i === 0 ? field : refindField(before, field);
    // the first tap opened something else (a dialog, another screen): never tap or type there
    if (!target) return { ok: false, reason: "tapping the field opened something else; the field is gone from the screen (nothing typed)" };
    const tapped = await tapElement(c, target);
    if (!tapped.ok) return tapped;
    await sleep(c.timing.pollMs);
    before = await look(c);
    const focused = before.filter(e => e.focused && isInput(e));
    if (focused.some(same)) break;
    if (focused.length) return { ok: false, reason: "tapping the field gave the focus to another text field (nothing typed)" };
  }
  if (landedIn(before, field, text)) return { ok: true, before };
  await c.dev.typeText(text);
  let now = await landedSoon(c, field, text);
  const elsewhere = () => now.els.some(e => mask(labelOf(e), 200).includes(want));
  // Some composers never expose what they hold (a custom input bar): the text shows nowhere, yet the same
  // field has the focus. That is the field holding our text, as a tap on Send confirms (the earlier
  // focus-verified typing sent fine on the same device).
  const holdsUnseen = () => !elsewhere() && !!refindField(now.els, field, text)?.focused;
  if (!now.landed && !elsewhere() && !holdsUnseen()) {
    // the keys went nowhere: the field was not focused yet. Tap THE SAME field again (never another one:
    // a rename box that opened meanwhile is not the composer) and type once more.
    const f = refindField(now.els, field, text);
    if (f) {
      const again = await tapElement(c, f);
      if (again.ok) {
        await sleep(c.timing.pollMs);
        await c.dev.typeText(text);
        now = await landedSoon(c, field, text);
      }
    }
  }
  if (now.landed || holdsUnseen()) return { ok: true, before };
  const f = refindField(now.els, field, text);
  const shows = f ? mask(labelOf(f), 60) : "";
  await c.dev.back();
  return {
    ok: false,
    reason: `the typed text did not land in the field (pressed BACK to hide the keyboard; nothing sent): ${f ? `the field shows "${shows}"` : "the field is gone from the screen"}${elsewhere() ? ", the text appeared elsewhere" : ", the text appeared nowhere"}${now.els.some(e => e.focused && isInput(e)) ? "" : ", no field reported focus"}`,
  };
}

/**
 * The same text field after the keyboard moved it: same type and id, and the same place, or the same column.
 * Without an id to go by, a field in the same column must also show the same words (its hint) or our own
 * text: a "Nickname" box on a sheet that opened is not the "Message" composer.
 */
function sameFieldAs(field: NormElement, typed?: string): (e: NormElement) => boolean {
  const words = mask(labelOf(field), 200);
  const ours = typed ? mask(typed, 200) : "";
  return e => {
    if (!isInput(e) || shortType(e.type) !== shortType(field.type) || (e.identifier ?? "") !== (field.identifier ?? "")) return false;
    if (overlapRatio(e.rect, field.rect) >= 0.5) return true;
    if (Math.abs(e.rect.x - field.rect.x) > 24) return false;
    if (field.identifier) return true;
    const w = mask(labelOf(e), 200);
    return !w || !words || w === words || (!!ours && w.includes(ours));
  };
}

/** Poll until the typed text shows in the field (the element list can lag the keys by a dump or two). */
async function landedSoon(c: ActCtx, field: NormElement, text: string): Promise<{ landed: boolean; els: NormElement[] }> {
  let els: NormElement[] = [];
  for (let i = 0; i < 3; i++) {
    await sleep(c.timing.pollMs);
    els = await look(c);
    if (landedIn(els, field, text)) return { landed: true, els };
  }
  return { landed: false, els };
}

/**
 * T7: fill the field (fillField), then look again, because many composers only show Send once there is
 * text: Send = a control on the field's row named send/submit/arrow, else the rightmost control on that row
 * that appeared with the typing, else ENTER. Finally check that the field cleared.
 */
async function typeAndSend(c: ActCtx, a: Action, field: NormElement): Promise<ActResult> {
  const text = a.input?.trim() || DEFAULT_INPUT;
  const filled = await fillField(c, field, text);
  if (!filled.ok) return filled;
  const before = filled.before;
  const els = await look(c);
  const typedField = refindField(els, field, text) ?? field;
  const pre = a.sendElKey ? findByKey(els, a.sendElKey) : undefined;
  const send = (pre && sendable(pre, typedField, text) && onRowOf(typedField)(pre) ? pre : undefined) ?? findSend(els, typedField, text, before);
  let how = "ENTER";
  if (send) {
    const s = await tapElement(c, send);
    if (s.ok) how = `"${labelOf(send) || send.identifier || shortType(send.type)}"`;
    else await c.dev.pressEnter();
  } else {
    await c.dev.pressEnter();
  }
  const sent = await waitCleared(c, typedField, text);
  return { ok: true, typed: text, sent, note: `sent with ${how}${sent ? "" : "; the input did not clear"}` };
}

function sendable(e: NormElement, field: NormElement, typed: string): boolean {
  const words = `${e.text ?? ""} ${e.label ?? ""} ${e.identifier ?? ""}`;
  return e !== field && !e.ad && !isInput(e) && !OUT_OF_SCOPE.test(words) // never the mic or the camera
    && !(e.text ?? "").toLowerCase().includes(typed.toLowerCase());
}

/** On the field's row: centres at most one field height (or 48 px) apart vertically. */
function onRowOf(field: NormElement): (e: NormElement) => boolean {
  const cy = field.rect.y + field.rect.h / 2;
  return e => Math.abs(e.rect.y + e.rect.h / 2 - cy) <= Math.max(field.rect.h, 48);
}

/**
 * Send control for a typed field (exported for tests). Only on the field's row, never elsewhere (an avatar
 * or a "+" in the header opens other things). A control named send/submit/arrow first; else, the
 * rightmost control on the right half of the row that was not there before typing (the mic turned into
 * Send); undefined means: press ENTER.
 */
export function findSend(els: NormElement[], field: NormElement, typed: string, before?: NormElement[]): NormElement | undefined {
  const onRow = onRowOf(field);
  const dist = (e: NormElement) => Math.hypot(e.rect.x - field.rect.x, e.rect.y - field.rect.y);
  const named = els.filter(e => sendable(e, field, typed) && onRow(e)
    && (SEND_RE.test(e.label ?? "") || SEND_RE.test(e.identifier ?? "") || (!!e.text && e.text.length <= 12 && SEND_RE.test(e.text))));
  if (named.length) return named.sort((a, b) => dist(a) - dist(b))[0];
  if (!before) return undefined;
  const fieldArea = field.rect.w * field.rect.h;
  const existed = (e: NormElement) => before.some(b => shortType(b.type) === shortType(e.type) && (b.identifier ?? "") === (e.identifier ?? "")
    && labelOf(b) === labelOf(e) && overlapRatio(b.rect, e.rect) >= 0.5);
  return els
    .filter(e => sendable(e, field, typed) && onRow(e) && !existed(e) && e.rect.x >= field.rect.x + field.rect.w / 2 && e.rect.w * e.rect.h < fieldArea)
    .sort((a, b) => b.rect.x + b.rect.w - (a.rect.x + a.rect.w))[0];
}

/**
 * The field's key changes as its text changes, so re-find it by type + resource id + place or column (the
 * keyboard moves it up; a Send button may narrow it). Never another field: a dialog that opened meanwhile
 * (a rename box prefilled with the chat's title) is not the field we typed into.
 */
function refindField(els: NormElement[], field: NormElement, typed?: string): NormElement | undefined {
  const d = (e: NormElement) => Math.hypot(e.rect.x - field.rect.x, e.rect.y - field.rect.y);
  return els.filter(sameFieldAs(field, typed)).sort((a, b) => d(a) - d(b))[0];
}

async function waitCleared(c: ActCtx, field: NormElement, text: string): Promise<boolean> {
  const typed = mask(text, 200);
  const t0 = Date.now();
  for (;;) {
    const f = refindField(await look(c), field, text);
    if (!f || !mask(labelOf(f), 200).includes(typed)) return true;
    if (Date.now() - t0 >= c.timing.clearMaxMs) return false;
    await sleep(c.timing.pollMs);
  }
}
