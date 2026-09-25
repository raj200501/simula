// Shared, pure helpers for the mock generator, the runtime data and QA: device size in dp, which
// element plays which special role (counter, chat composer / send / message list), initial counter
// values and the "selected mode" context groups the runtime uses to pick between consume edges.
// Everything here is derived from the product model only, so it is deterministic.
import type { Edge, ProductModel, Rect, Screen, UiElement } from "../core/schema.ts";
import { parseNumber } from "../core/io.ts";

export const OVERLAY_KINDS = new Set(["modal", "sheet", "dialog"]);
export const isOverlay = (s: Pick<Screen, "kind">): boolean => OVERLAY_KINDS.has(s.kind);

export interface DeviceDp { w: number; h: number; density: number; statusDp: number; navDp: number; widthPx: number; heightPx: number }

/** The phone viewport in dp (= CSS px in the mock). Pixel 8: 1080x2400 px at 2.625 -> 411x914 dp. */
export function deviceDp(m: ProductModel): DeviceDp {
  const d = m.device.density || 2.625;
  const widthPx = m.device.widthPx || 1080, heightPx = m.device.heightPx || 2400;
  return {
    w: Math.round(widthPx / d), h: Math.round(heightPx / d), density: d,
    statusDp: Math.round((m.device.statusBarPx || 0) / d), navDp: Math.round((m.device.navBarPx || 0) / d),
    widthPx, heightPx,
  };
}

export const textOf = (e: Pick<UiElement, "text" | "label">): string => (e.text || e.label || "").replace(/\s+/g, " ").trim();
export const areaOf = (r: Rect): number => Math.max(0, r.w) * Math.max(0, r.h);
export const contains = (outer: Rect, inner: Rect, tol = 0.5): boolean =>
  inner.x >= outer.x - tol && inner.y >= outer.y - tol && inner.x + inner.w <= outer.x + outer.w + tol && inner.y + inner.h <= outer.y + outer.h + tol;

/** Elements worth rendering / measuring: a real box that intersects the screen. */
export function drawable(s: Screen, dev: DeviceDp): UiElement[] {
  return s.elements.filter(e => e.rectDp.w >= 1 && e.rectDp.h >= 1 && e.rectDp.x < dev.w && e.rectDp.y < dev.h && e.rectDp.x + e.rectDp.w > 0 && e.rectDp.y + e.rectDp.h > 0);
}

/** A consume edge spends a counter: it carries a negative counter effect or is an observed limit hit. */
export const isConsume = (e: Edge): boolean => !!e.limitHit || e.effects.some(f => f.kind === "counter" && f.delta < 0);

/**
 * What one traversal of an edge does to each counter. An edge taken repeatedly accumulates one counter
 * effect per observed traversal, so the per-traversal delta is the most frequent one, not the sum.
 */
export function edgeDeltas(e: Edge): { resource: string; delta: number }[] {
  const byRes = new Map<string, Map<number, number>>();
  for (const f of e.effects) {
    if (f.kind !== "counter" || !f.delta) continue;
    const c = byRes.get(f.resource) ?? new Map<number, number>();
    c.set(f.delta, (c.get(f.delta) ?? 0) + 1);
    byRes.set(f.resource, c);
  }
  return [...byRes].map(([resource, c]) => ({ resource, delta: [...c].sort((a, b) => b[1] - a[1])[0][0] }));
}

/** Counter bindings shown on a screen: the screen's own bindings plus economy.resources[].shownOn. */
export function counterBindings(s: Screen, m: ProductModel): { el: string; resource: string }[] {
  const out = new Map<string, string>();
  for (const b of s.bindings) out.set(b.el, b.resource);
  for (const r of m.economy.resources) for (const on of r.shownOn) if (on.screen === s.id && !out.has(on.el)) out.set(on.el, r.id);
  return [...out].filter(([el]) => s.elements.some(e => e.id === el)).map(([el, resource]) => ({ el, resource }));
}

export interface ChatParts {
  composer?: string;            // element id of the text input
  send?: string;                // element id of the send control
  messages: Rect;               // dp rect of the message list area
  lastMessageBottom: number;    // dp: new bubbles are appended below this line
}

/**
 * Chat structure of a screen, or null when it is not a chat. Send = the element the consume edges
 * start from, else a control labelled like send, else the rightmost control on the input's row.
 */
export function chatParts(s: Screen, m: ProductModel): ChatParts | null {
  const dev = deviceDp(m);
  const consumes = m.edges.filter(e => e.from === s.id && e.el && isConsume(e));
  const inputs = s.elements.filter(e => e.role === "input").sort((a, b) => b.rectDp.y - a.rectDp.y);
  if (s.kind !== "chat" && !(consumes.length && inputs.length)) return null;
  const composer = inputs.find(e => e.rectDp.y > dev.h * 0.5) ?? inputs[0];
  const byCount = new Map<string, number>();
  for (const e of consumes) byCount.set(e.el!, (byCount.get(e.el!) ?? 0) + e.seen);
  let send: string | undefined = [...byCount].sort((a, b) => b[1] - a[1])[0]?.[0];
  // Type-and-send actions start at the input itself; the send control is then the one next to it.
  if (send && send === composer?.id) send = undefined;
  if (!send) send = s.elements.find(e => e.role === "button" && /send|submit|arrow/i.test(`${textOf(e)} ${e.identifier ?? ""}`))?.id;
  if (!send && composer) {
    const cy = composer.rectDp.y + composer.rectDp.h / 2;
    send = s.elements.filter(e => (e.role === "button" || e.role === "image") && e.id !== composer.id && Math.abs(e.rectDp.y + e.rectDp.h / 2 - cy) < composer.rectDp.h && e.rectDp.x >= composer.rectDp.x)
      .sort((a, b) => b.rectDp.x - a.rectDp.x)[0]?.id;
  }
  // The message list sits between the header band (top 15%) and the composer row.
  const headerBottom = Math.max(dev.statusDp, ...s.elements.filter(e => e.rectDp.y + e.rectDp.h / 2 < dev.h * 0.15 && e.rectDp.h < dev.h * 0.2).map(e => e.rectDp.y + e.rectDp.h));
  const bottom = composer ? composer.rectDp.y - 8 : dev.h - dev.navDp - 64;
  const top = Math.min(headerBottom + 4, bottom - 40);
  const messages = { x: 0, y: top, w: dev.w, h: Math.max(40, bottom - top) };
  const inside = s.elements.filter(e => e.id !== composer?.id && e.id !== send && e.rectDp.y >= top - 1 && e.rectDp.y + e.rectDp.h <= bottom + 1 && areaOf(e.rectDp) < areaOf(messages) * 0.5);
  const lastMessageBottom = inside.length ? Math.max(...inside.map(e => e.rectDp.y + e.rectDp.h)) : top;
  return { composer: composer?.id, send, messages, lastMessageBottom };
}

/** Initial counter values: what the bound element shows, else the first observed value, else 0. */
export function initialCounters(m: ProductModel): { id: string; name: string; unit: string; initial: number }[] {
  return m.economy.resources.map(r => {
    let shown: number | null = null;
    const places = [...m.screens.flatMap(s => counterBindings(s, m).filter(b => b.resource === r.id).map(b => ({ s, el: b.el })))];
    for (const p of places) {
      shown = parseNumber(textOf(p.s.elements.find(e => e.id === p.el) ?? {}));
      if (shown !== null) break;
    }
    return { id: r.id, name: r.name, unit: r.unit, initial: shown ?? r.observedValues[0] ?? 0 };
  });
}

export interface ContextGroup { labels: string[]; screens: string[] }

/**
 * Mode contexts ("Basic · 10" vs "Premium · 30"): edges from the same element that differ by the
 * selected context are alternatives, so their labels form one group. The initial selection is the
 * label the from-screen displays (the mode chip), else the label of the most-seen edge.
 */
export function contextGroups(m: ProductModel): { groups: ContextGroup[]; initial: string[] } {
  const byKey = new Map<string, Edge[]>();
  for (const e of m.edges) if (e.el && e.context.selected.length) byKey.set(`${e.from}|${e.el}`, [...(byKey.get(`${e.from}|${e.el}`) ?? []), e]);
  const groups: ContextGroup[] = [];
  for (const edges of byKey.values()) {
    const labels = [...new Set(edges.flatMap(e => e.context.selected))];
    const screens = [...new Set(edges.map(e => e.from))];
    const hit = groups.find(g => g.labels.some(l => labels.includes(l)));
    if (hit) { hit.labels = [...new Set([...hit.labels, ...labels])]; hit.screens = [...new Set([...hit.screens, ...screens])]; }
    else groups.push({ labels, screens });
  }
  const initial: string[] = [];
  for (const g of groups) {
    // Screens where a mode is spent (consume edges) show the current mode best (the chip); a mode
    // picker lists every option, so it only counts after them.
    const spend = g.screens.filter(sid => m.edges.some(e => e.from === sid && isConsume(e)));
    const order = [...spend, ...g.screens.filter(sid => !spend.includes(sid))];
    const shown = order.map(sid => g.labels.find(l => m.screens.find(s => s.id === sid)?.elements.some(e => textOf(e) === l))).find(Boolean)
      ?? g.labels.find(l => m.screens.some(s => s.elements.some(e => e.flags?.selected && textOf(e) === l)));
    const bySeen = m.edges.filter(e => e.context.selected.some(l => g.labels.includes(l))).sort((a, b) => b.seen - a.seen)[0]?.context.selected.find(l => g.labels.includes(l));
    const pick = shown ?? bySeen ?? g.labels[0];
    if (pick) initial.push(pick);
  }
  return { groups, initial };
}

/** The screen the mock opens on: the first step of the core flow, else the first tab, else s01. */
export function startScreen(m: ProductModel): string {
  const core = m.flows.find(f => f.kind === "core")?.steps[0]?.screen;
  if (core && m.screens.some(s => s.id === core)) return core;
  return (m.screens.find(s => s.kind === "tab" && s.inScope) ?? m.screens.find(s => s.inScope && !isOverlay(s)) ?? m.screens[0])?.id ?? "";
}
