// Performing one action on the device: re-find the element by key, tap it safely, type and send.
// Coordinates are always computed by us (never positional refs), from a fresh element list.
import type { Device } from "../device/types.ts";
import type { Action, DeviceInfo, NormElement, RawElement, Rect } from "../core/schema.ts";
import { mask, sleep } from "../core/io.ts";
import type { Timing } from "./observe.ts";
import { findByKey } from "./observe.ts";
import { OUT_OF_SCOPE } from "./guards.ts";
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

/** Find the element by key on the live screen; if absent, scroll down (up to twice) to reveal it. */
async function locate(c: ActCtx, key: string, hint?: Rect): Promise<NormElement | undefined> {
  for (let i = 0; i <= 2; i++) {
    const el = findByKey(await look(c), key, hint);
    if (el) return el;
    if (i < 2) { await swipe(c.dev, c.info, "up", 0.4 * c.info.heightPx); await sleep(c.timing.pollMs); }
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
      return el ? tapElement(c, el) : { ok: false, reason: "element not found on screen" };
    }
    case "type-send":
    case "consume":
      return typeAndSend(c, a, hint);
  }
}

/** The field took the focus: an input at the tapped field's place reports focused (nothing else does). */
function focusedField(els: NormElement[], field: NormElement): NormElement | undefined {
  return els.find(e => e.focused && isInput(e) && overlapRatio(e.rect, field.rect) >= 0.5);
}

/**
 * T7: tap the field and check that it took the focus (a tap that opened something else must not type into
 * whatever has the focus now), type (never ENTER: it is a newline in chat apps), then look again, because
 * many composers only show Send once there is text. Send = a control on the field's row named
 * send/submit/arrow, else the rightmost control on that row that appeared with the typing, else ENTER.
 * Finally check that the field cleared.
 */
async function typeAndSend(c: ActCtx, a: Action, hint?: Rect): Promise<ActResult> {
  const text = a.input?.trim() || DEFAULT_INPUT;
  const field = a.elKey ? await locate(c, a.elKey, hint) : undefined;
  if (!field) return { ok: false, reason: "input field not found" };
  let focused: NormElement | undefined;
  for (let i = 0; i < 2 && !focused; i++) {
    const focus = await tapElement(c, i === 0 ? field : refindField(await look(c), field) ?? field);
    if (!focus.ok) return focus;
    await sleep(c.timing.pollMs);
    focused = focusedField(await look(c), field);
  }
  if (!focused) return { ok: false, reason: "the text field did not take the focus after tapping it (nothing typed)" };
  const before = await look(c);
  // a draft left in the field (a wall keeps it) already holds our text: send it rather than typing it twice
  const draft = mask(labelOf(focused), 200).includes(mask(text, 200));
  if (!draft) {
    await c.dev.typeText(text);
    await sleep(c.timing.pollMs);
  }
  const els = await look(c);
  const typedField = refindField(els, field) ?? field;
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

/** The field's key changes as its text changes, so re-find it by type + resource id + position. */
function refindField(els: NormElement[], field: NormElement): NormElement | undefined {
  const d = (e: NormElement) => Math.hypot(e.rect.x - field.rect.x, e.rect.y - field.rect.y);
  const same = els.filter(e => shortType(e.type) === shortType(field.type) && (e.identifier ?? "") === (field.identifier ?? ""));
  return (same.length ? same : els.filter(isInput)).sort((a, b) => d(a) - d(b))[0];
}

async function waitCleared(c: ActCtx, field: NormElement, text: string): Promise<boolean> {
  const typed = mask(text, 200);
  const t0 = Date.now();
  for (;;) {
    const f = refindField(await look(c), field);
    if (!f || !mask(labelOf(f), 200).includes(typed)) return true;
    if (Date.now() - t0 >= c.timing.clearMaxMs) return false;
    await sleep(c.timing.pollMs);
  }
}
