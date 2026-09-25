// The spec renderer: a deterministic, absolutely-positioned HTML fragment for one screen, built only
// from the model's elements (dp rects, measured bg/fg/font size, asset crops). It is the stub for the
// per-screen HTML call, the build's fallback when no fragment was generated, and the source of the
// nudge fixer's replacement for a missing element. It follows the same contract as the LLM output:
// data-node on every element, data-bind on counters, chat roles and bubble templates, no scripts.
import { escapeHtml } from "../core/io.ts";
import type { ProductModel, Rect, Screen, UiElement } from "../core/schema.ts";
import { accentOf, baseColors, chroma, deltaE, lightness, onColor } from "./designCss.ts";
import type { RenderHints } from "./measure.ts";
import { areaOf, chatParts, contains, counterBindings, deviceDp, drawable, isOverlay, textOf, type ChatParts, type DeviceDp } from "./roles.ts";

interface Painted { rect: Rect; color: string }
interface Ctx {
  m: ProductModel; s: Screen; dev: DeviceDp; accent: string;
  base: string;                 // colour under everything (page bg, or the overlay panel)
  plan: Plan;                   // paint order (overlays: screen underneath, scrim, panel)
  painted: Painted[];           // filled boxes so far, for "what colour is under this element"
  inside: Map<string, UiElement[]>; // element id -> elements drawn inside its box
  looks: Map<string, Look>;     // effective fill / border
  align: Map<string, "left" | "center" | "right">; // measured text alignment
  binds: Map<string, string>;   // element id -> resource id
  chat: ChatParts | null;
  assets: Map<string, string>;  // asset id -> relative file
  radius: number;
}

const n = (v: number) => Math.round(v * 10) / 10;
const esc = escapeHtml;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const SYSTEM_FONT = "var(--font-body, system-ui, sans-serif)";
/** ΔE above which a box's measured background differs from what is under it (light-grey cards on white are ~2.5). */
const PAINT_DE = 1.5;

/** Glyphs for icon-only controls, keyed by generic UI words in their accessibility label. */
const GLYPHS: [RegExp, string][] = [
  [/send|submit/i, "➤"], [/back|navigate up|up button/i, "←"], [/close|dismiss|cancel/i, "✕"],
  [/more|menu|options|overflow/i, "⋮"], [/search/i, "⌕"], [/add|new|plus|create/i, "+"],
  [/settings|preferences/i, "⚙"], [/mic|voice|record/i, "●"], [/share/i, "⇪"], [/like|heart|favou?rite/i, "♥"],
];

function colorWeights(els: UiElement[], skipButtons: boolean): string | undefined {
  const w = new Map<string, number>();
  for (const e of els) if (e.style?.bg && !(skipButtons && e.role === "button")) w.set(e.style.bg, (w.get(e.style.bg) ?? 0) + areaOf(e.rectDp));
  return [...w].sort((a, b) => b[1] - a[1])[0]?.[0];
}

/** Page colour: a container covering most of the screen, else the area-weighted mode of element backgrounds. */
export function screenBackground(s: Screen, m: ProductModel): string {
  const dev = deviceDp(m);
  const els = drawable(s, dev);
  const big = els.filter(e => e.style?.bg && areaOf(e.rectDp) >= 0.6 * dev.w * dev.h).sort((a, b) => areaOf(b.rectDp) - areaOf(a.rectDp))[0];
  return big?.style?.bg ?? colorWeights(els, true) ?? baseColors(m).bg;
}

/** Overlay panel from the bounding box of the overlay's own elements (sheets extend to the bottom edge). */
function bboxPanel(s: Screen, els: UiElement[], dev: DeviceDp): Rect | null {
  const own = els.filter(e => areaOf(e.rectDp) < 0.8 * dev.w * dev.h);
  if (!own.length) return null;
  const x0 = Math.min(...own.map(e => e.rectDp.x)), y0 = Math.min(...own.map(e => e.rectDp.y));
  const x1 = Math.max(...own.map(e => e.rectDp.x + e.rectDp.w)), y1 = Math.max(...own.map(e => e.rectDp.y + e.rectDp.h));
  if (y1 - y0 > dev.h * 0.85) return null; // the elements fill the screen: render it as an opaque page
  if (s.kind === "sheet") { const y = Math.max(dev.statusDp, y0 - 20); return { x: 0, y, w: dev.w, h: dev.h - y }; }
  const x = Math.max(0, x0 - 20), y = Math.max(dev.statusDp, y0 - 20);
  return { x, y, w: Math.min(dev.w, x1 + 20) - x, h: Math.min(dev.h, y1 + 20) - y };
}

/**
 * Paint order for overlays. An overlay's element list often includes the screen underneath (the
 * accessibility tree still lists it): elements that match the parent screen's elements (same key or
 * text, same place) are that screen, drawn first with their measured, already dimmed colours. The
 * overlay's own elements go on top, on their own panel element if one holds them, else on a panel
 * synthesized from their bounding box. An overlay with only its own elements gets a transparent root
 * and a scrim, and the runtime shows the real screen underneath.
 */
interface Plan { page: boolean; under: UiElement[]; scrim: boolean; panel: Rect | null; panelColor: string; top: UiElement[] }
function plan(s: Screen, m: ProductModel, els: UiElement[], dev: DeviceDp, inside: Map<string, UiElement[]>): Plan {
  const all: Plan = { page: true, under: [], scrim: false, panel: null, panelColor: "#FFFFFF", top: els };
  if (!isOverlay(s)) return all;
  const parent = s.parent ? m.screens.find(p => p.id === s.parent) : undefined;
  const close = (a: Rect, b: Rect) => Math.abs(a.x - b.x) <= 8 && Math.abs(a.y - b.y) <= 8 && Math.abs(a.w - b.w) <= 12 && Math.abs(a.h - b.h) <= 12;
  // Long texts identify an element wherever it is (the list underneath may be scrolled differently);
  // short ones (a chip, "OK") must also be in the same place, so the overlay's own labels stay its own.
  const underOf = (e: UiElement) => !!parent && parent.elements.some(p =>
    (textOf(e).length >= 12 && textOf(p) === textOf(e))
    || ((p.key === e.key || (!!textOf(p) && textOf(p) === textOf(e))) && close(p.rectDp, e.rectDp))
    // Same view id on the same row: a chip whose label (and so width) changed is still the same chip.
    || (!!p.identifier && p.identifier === e.identifier && Math.abs(p.rectDp.y - e.rectDp.y) <= 8 && Math.abs(p.rectDp.h - e.rectDp.h) <= 12));
  const under = els.filter(underOf);
  const own = els.filter(e => !under.includes(e));
  if (!own.length) return all;
  const holder = own.filter(e => e.style?.bg && (inside.get(e.id) ?? []).filter(c => own.includes(c)).length >= Math.max(1, (own.length - 1) * 0.6))
    .sort((a, b) => areaOf(b.rectDp) - areaOf(a.rectDp))[0];
  const panel = holder ? null : bboxPanel(s, own, dev);
  const panelColor = holder?.style?.bg ?? colorWeights(own.filter(e => areaOf(e.rectDp) < 0.8 * dev.w * dev.h), true) ?? "#FFFFFF";
  if (under.length) return { page: true, under, scrim: false, panel, panelColor, top: own };
  if (!holder && !panel) return all;
  return { page: false, under: [], scrim: true, panel, panelColor, top: own };
}

/**
 * Effective fill and border per element. The model's bg is a ring sample of the box edge; for a card
 * with a border that ring is the border colour, while its text children sample the interior. When a
 * container's leaf text children agree on a different colour, that is the fill and the ring is the border.
 */
interface Look { fill?: string; border?: string }
function looks(els: UiElement[], inside: Map<string, UiElement[]>, dev: DeviceDp): Map<string, Look> {
  const out = new Map<string, Look>();
  for (const e of els) {
    const own = e.style?.bg;
    const kids = (inside.get(e.id) ?? []).filter(k => (k.role === "text" || k.role === "counter") && k.style?.bg && !(inside.get(k.id)?.length));
    if (own && kids.length && areaOf(e.rectDp) < 0.5 * dev.w * dev.h) {
      const count = new Map<string, number>();
      for (const k of kids) count.set(k.style!.bg!, (count.get(k.style!.bg!) ?? 0) + 1);
      const [mode, c] = [...count].sort((a, b) => b[1] - a[1])[0];
      if (c >= Math.ceil(kids.length / 2) && deltaE(mode, own) > PAINT_DE) { out.set(e.id, { fill: mode, border: own }); continue; }
    }
    out.set(e.id, { fill: own });
  }
  return out;
}

function makeCtx(s: Screen, m: ProductModel, hints: RenderHints = {}): Ctx {
  const dev = deviceDp(m);
  const els = drawable(s, dev);
  const inside = new Map(els.map(e => [e.id, els.filter(c => c !== e && contains(e.rectDp, c.rectDp) && areaOf(c.rectDp) < areaOf(e.rectDp))]));
  const p = plan(s, m, els, dev, inside);
  const base = p.page ? hints.pageBg ?? screenBackground(s, m) : p.panelColor;
  const radii = [...m.design.radiiDp].sort((a, b) => a - b);
  return {
    m, s, dev, accent: accentOf(m), base, plan: p, painted: [], inside, looks: looks(els, inside, dev), align: new Map(Object.entries(hints.align ?? {})),
    binds: new Map(counterBindings(s, m).map(b => [b.el, b.resource])),
    chat: chatParts(s, m),
    assets: new Map(m.design.assets.map(a => [a.id, a.file])),
    radius: radii.length ? radii[radii.length - 1] : 12,
  };
}

function underColor(r: Rect, ctx: Ctx): string {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const hits = ctx.painted.filter(p => cx >= p.rect.x && cx <= p.rect.x + p.rect.w && cy >= p.rect.y && cy <= p.rect.y + p.rect.h);
  hits.sort((a, b) => areaOf(a.rect) - areaOf(b.rect));
  return hits[0]?.color ?? ctx.base;
}

/**
 * Font size: the measured size (else an estimate from the box), capped so the text fits: a label is
 * never taller than its padded control, and the estimated line count x line height must fit the box
 * (ink-based measurements over-read icons and dense multi-line text).
 */
function fitFont(e: UiElement, t: string, availW: number, availH: number): { size: number; multi: boolean } {
  const h = e.rectDp.h;
  const padded = ["button", "tab", "input", "toggle"].includes(e.role);
  let f = e.style?.fontDp ?? (!t ? 14 : padded || e.role === "list-item" ? clamp(Math.round(h * 0.36), 12, 18) : clamp(Math.round(h / 1.3), 10, 28));
  f = Math.min(f, e.role === "tab" ? Math.max(11, Math.min(16, h * 0.4)) : padded ? h * 0.55 : h * 0.9);
  f = Math.round(clamp(f, 8, 48) * 2) / 2;
  const lines = (sz: number) => Math.max(1, Math.ceil((t.length * 0.56 * sz) / Math.max(1, availW)));
  while (t && f > 8 && lines(f) * 1.2 * f > availH * 1.05) f -= 0.5;
  return { size: f, multi: !!t && lines(f) > 1 };
}

function assetFile(e: UiElement, ctx: Ctx): string | undefined {
  if (!e.asset) return undefined;
  return ctx.assets.get(e.asset) ?? (/\.(png|jpe?g|webp|gif|svg)$/i.test(e.asset) ? e.asset : undefined);
}

/** One element as absolutely-positioned HTML. Records filled boxes in ctx so children know their backdrop. */
function renderElement(e: UiElement, ctx: Ctx): string {
  const r = e.rectDp;
  const t = textOf(e);
  const under = underColor(r, ctx);
  const look = ctx.looks.get(e.id) ?? {};
  const bg = look.fill;
  const paint = !!bg && deltaE(bg, under) > PAINT_DE;
  const fill = paint ? bg! : under;
  const fg = e.style?.fg ?? onColor(fill);
  const kids = ctx.inside.get(e.id) ?? [];
  // Children that show text themselves (a label-only icon does not): then the box does not repeat it.
  const hasTextChildren = kids.some(c => c.text && c.role !== "image");

  const attrs = [`data-node="${esc(e.id)}"`];
  const bind = ctx.binds.get(e.id);
  if (bind) attrs.push(`data-bind="${esc(bind)}"`);
  if (ctx.chat?.composer === e.id) attrs.push(`data-role="composer"`);
  if (ctx.chat?.send === e.id) attrs.push(`data-role="send"`);
  if (e.ad) attrs.push("data-ad");
  // Accessible name: the label for icon-only controls, the text when a container shows it via its children.
  if (e.label && e.label !== e.text) attrs.push(`aria-label="${esc(e.label)}"`);
  else if (t && hasTextChildren) attrs.push(`aria-label="${esc(t)}"`);
  if (e.flags?.selected) attrs.push(`aria-selected="true"`);
  const A = attrs.join(" ");
  const box = `position:absolute;left:${n(r.x)}px;top:${n(r.y)}px;width:${n(r.w)}px;height:${n(r.h)}px;box-sizing:border-box;margin:0;`;
  const dim = e.flags?.disabled ? "opacity:0.5;" : "";
  const fullWidth = r.w >= ctx.dev.w - 2;
  const hairline = `1px solid ${lightness(fill) > 0.5 ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)"}`;
  if (paint) ctx.painted.push({ rect: r, color: bg! });

  const file = assetFile(e, ctx);
  if (e.role === "image" || (file && !t)) {
    if (file) return `<img ${A} src="${esc(file)}" alt="${esc(t)}" style="${box}object-fit:cover;display:block;${dim}">`;
    return `<div ${A} role="img" style="${box}background:${bg ?? "#E5E7EB"};border-radius:8px;${dim}"></div>`;
  }

  if (e.role === "input") {
    // A saturated ring on a text field is its (focus) border, not its fill.
    const ringIsBorder = !!bg && chroma(bg) > 0.08;
    const inFill = ringIsBorder ? under : fill;
    const border = ringIsBorder ? `1.5px solid ${bg}` : paint ? "0" : `1px solid ${lightness(fill) > 0.5 ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.2)"}`;
    const f = fitFont(e, t, r.w - 32, r.h);
    return `<input ${A} type="text" placeholder="${esc(t)}" style="${box}padding:0 16px;border:${border};border-radius:${n(Math.min(r.h / 2, 24))}px;background:${inFill};color:${ringIsBorder ? e.style?.fg ?? onColor(inFill) : fg};font:${f.size}px/1.2 ${SYSTEM_FONT};outline:none;${dim}">`;
  }

  if (e.role === "toggle") {
    const on = !!e.flags?.checked;
    const f = fitFont(e, t, r.w - 52, r.h);
    const track = `display:inline-block;position:relative;width:36px;height:20px;border-radius:10px;flex:none;background:${on ? ctx.accent : "rgba(128,128,128,0.45)"}`;
    const knob = `position:absolute;top:2px;left:${on ? 18 : 2}px;width:16px;height:16px;border-radius:50%;background:#FFFFFF`;
    return `<div ${A} role="switch" aria-checked="${on}" style="${box}display:flex;align-items:center;justify-content:${t ? "space-between" : "center"};gap:8px;color:${fg};font:${f.size}px/1.2 ${SYSTEM_FONT};${dim}">${t ? `<span>${esc(t)}</span>` : ""}<span aria-hidden="true" style="${track}"><span style="${knob}"></span></span></div>`;
  }

  if (e.role === "button") {
    // Visible text is the text; a label-only (icon) button shows a glyph for its label, else the label.
    const glyph = !e.text ? GLYPHS.find(([re]) => re.test(`${e.label ?? ""} ${e.identifier ?? ""} ${ctx.chat?.send === e.id ? "send" : ""}`))?.[1] : undefined;
    const shown = e.text || (glyph ? "" : e.label || "");
    const radius = paint ? (r.h <= 44 ? r.h / 2 : Math.min(ctx.radius, r.h / 2)) : 0;
    const f = fitFont(e, shown, r.w - 16, r.h);
    const inner = file ? `<img src="${esc(file)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">`
      : shown ? esc(shown) : glyph ? `<span aria-hidden="true" style="font-size:${n(Math.min(22, r.h * 0.5))}px">${glyph}</span>` : "";
    const border = look.border ? `border:1px solid ${look.border};` : "border:0;";
    // Text buttons (a tappable title or row) keep their measured alignment; filled buttons centre.
    const al = paint ? "center" : ctx.align.get(e.id) ?? "center";
    const justify = al === "left" ? "flex-start" : al === "right" ? "flex-end" : "center";
    return `<button type="button" ${A} style="${box}display:flex;align-items:center;justify-content:${justify};padding:0 ${file ? 0 : al === "center" ? 8 : 0}px;${border}background:${paint ? bg : "transparent"};color:${fg};font:600 ${f.size}px/1.2 ${SYSTEM_FONT};border-radius:${n(radius)}px;overflow:hidden;white-space:${f.multi ? "normal" : "nowrap"};text-align:${al};cursor:pointer;${dim}">${inner}</button>`;
  }

  if (e.role === "tab") {
    const sel = !!e.flags?.selected;
    const f = fitFont(e, t, r.w - 8, r.h);
    // Bottom navigation items put the label under an icon: keep the label in the lower part.
    const bottomNav = r.y > ctx.dev.h * 0.8 && r.h >= 48;
    return `<div ${A} role="tab" style="${box}display:flex;align-items:${bottomNav ? "flex-end" : "center"};justify-content:center;${bottomNav ? `padding-bottom:${n(r.h * 0.14)}px;` : ""}${paint ? `background:${bg};` : ""}color:${fg};font:${sel ? 700 : 500} ${f.size}px/1.2 ${SYSTEM_FONT};white-space:nowrap;overflow:hidden;cursor:pointer;${dim}">${esc(t)}</div>`;
  }

  // Text-bearing boxes: text, counter, list-item, container.
  const leaf = kids.length === 0;
  const chip = paint && leaf;                              // a filled leaf: bubble, chip, tag, counter pill
  const border = look.border ? `border:1px solid ${look.border};` : e.role === "list-item" && !leaf && !paint && r.w > ctx.dev.w * 0.6 && r.h >= 44 ? `border:${hairline};` : "";
  const radius = chip ? Math.min(r.h / 2, 18) : (paint || border) && !fullWidth ? 12 : 0;
  const shape = `${paint ? `background:${bg};` : ""}${border}${radius ? `border-radius:${n(radius)}px;` : ""}`;
  const showText = !!t && !hasTextChildren;
  if (!showText) return `<div ${A} style="${box}${shape}${dim}"></div>`;

  // Text starts after a leading icon / avatar drawn inside the box.
  const lead = kids.filter(c => !c.text && c.rectDp.x < r.x + r.w * 0.4).reduce((mx, c) => Math.max(mx, c.rectDp.x + c.rectDp.w - r.x), 0);
  // Content padding: chips and bubbles around their text, containers and edge-to-edge rows at 16 dp.
  const edgeToEdge = r.x <= 2 && r.w >= ctx.dev.w - 4;
  const padX = chip ? clamp(r.h * 0.3, 6, 14) : !leaf || edgeToEdge ? 16 : 0;
  const padL = lead ? lead + 12 : padX;
  const padY = chip ? clamp(r.h * 0.15, 3, 10) : 0;
  const f = fitFont(e, t, r.w - padL - padX, r.h - 2 * padY);
  const weight = e.role === "counter" || f.size >= 24 || (f.size >= 18 && r.y < ctx.dev.h * 0.15) ? 600 : 400;
  // Alignment: measured from the screenshot's ink when available, else centred chips and left text.
  const align = ctx.align.get(e.id) ?? (chip && !f.multi && r.w < ctx.dev.w * 0.5 ? "center" : "left");
  const lines = f.multi
    ? `padding:${n(padY)}px ${n(padX)}px ${n(padY)}px ${n(padL)}px;white-space:normal;line-height:1.2;overflow:hidden;overflow-wrap:anywhere;`
    : `padding:0 ${n(padX)}px 0 ${n(padL)}px;white-space:nowrap;line-height:${n(r.h)}px;overflow:hidden;text-overflow:ellipsis;`;
  return `<div ${A} style="${box}${shape}color:${fg};font-family:${SYSTEM_FONT};font-size:${f.size}px;font-weight:${weight};text-align:${align};${lines}${dim}">${esc(t)}</div>`;
}

function bubbleTemplates(ctx: Ctx): string {
  const chat = ctx.chat!;
  const mid = ctx.dev.w / 2;
  // Captured bubbles: leaf text boxes in the message area (left = bot, right = user).
  const inArea = drawable(ctx.s, ctx.dev).filter(e => (e.role === "text" || e.role === "list-item") && !(ctx.inside.get(e.id)?.length)
    && e.rectDp.y >= chat.messages.y && e.rectDp.y + e.rectDp.h <= chat.messages.y + chat.messages.h && e.rectDp.w < ctx.dev.w * 0.9);
  const bot = inArea.find(e => e.rectDp.x + e.rectDp.w / 2 < mid && e.style?.bg && deltaE(e.style.bg, ctx.base) > PAINT_DE);
  const user = inArea.find(e => e.rectDp.x + e.rectDp.w / 2 > mid && e.style?.bg && deltaE(e.style.bg, ctx.base) > PAINT_DE);
  const botBg = bot?.style?.bg ?? (lightness(ctx.base) > 0.5 ? "#EEF0F3" : "#2A2D33");
  const userBg = user?.style?.bg ?? ctx.accent;
  const bubble = (bgc: string, fgc: string, self: boolean) =>
    `style="align-self:${self ? "flex-end" : "flex-start"};max-width:75%;margin:0 16px;padding:10px 14px;border-radius:${self ? "18px 18px 4px 18px" : "18px 18px 18px 4px"};background:${bgc};color:${fgc};font:15px/1.35 ${SYSTEM_FONT};white-space:pre-wrap;overflow-wrap:anywhere"`;
  return `<template data-template="user"><div class="sr-bubble sr-bubble-user" data-slot="text" ${bubble(userBg, user?.style?.fg ?? onColor(userBg), true)}></div></template>`
    + `<template data-template="bot"><div class="sr-bubble sr-bubble-bot" data-slot="text" ${bubble(botBg, bot?.style?.fg ?? onColor(botBg), false)}></div></template>`;
}

/** The whole screen as an HTML fragment (root: [data-screen-root]). Hints are optional pixel measurements. */
export function specRender(s: Screen, m: ProductModel, hints: RenderHints = {}): string {
  const ctx = makeCtx(s, m, hints);
  const dev = ctx.dev, p = ctx.plan;
  // group 0: the screen under an overlay, 1: scrim + synthesized panel, 2: the screen / overlay itself.
  const parts: { group: number; area: number; order: number; html: () => string }[] = [];
  const underIds = new Set(p.under.map(e => e.id));
  drawable(s, dev).forEach((e, i) => parts.push({ group: underIds.has(e.id) ? 0 : 2, area: areaOf(e.rectDp), order: i, html: () => renderElement(e, ctx) }));

  // A tab bar backdrop behind 3+ tabs in one row, so the bar reads as a bar.
  const tabs = s.elements.filter(e => e.role === "tab");
  if (tabs.length >= 3) {
    const y = Math.min(...tabs.map(t => t.rectDp.y));
    const tbg = tabs[0].style?.bg ?? ctx.base;
    const line = lightness(tbg) > 0.5 ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)";
    parts.push({ group: underIds.has(tabs[0].id) ? 0 : 2, area: 1e9, order: -1, html: () => { ctx.painted.push({ rect: { x: 0, y, w: dev.w, h: dev.h - y }, color: tbg }); return `<div class="sr-tabbar" aria-hidden="true" style="position:absolute;left:0;top:${n(y)}px;width:${dev.w}px;height:${n(dev.h - y)}px;background:${tbg};border-top:1px solid ${line}"></div>`; } });
  }
  // Chat: a transparent message list (new bubbles are appended below the last captured message).
  if (ctx.chat) {
    const c = ctx.chat, r = c.messages;
    const pad = Math.max(8, c.lastMessageBottom - r.y + 8);
    parts.push({ group: 2, area: areaOf(r), order: -2, html: () => `<div data-role="messages" style="position:absolute;left:${n(r.x)}px;top:${n(r.y)}px;width:${n(r.w)}px;height:${n(r.h)}px;box-sizing:border-box;padding:${n(pad)}px 0 12px;display:flex;flex-direction:column;gap:8px;overflow-y:auto;scrollbar-width:none">${bubbleTemplates(ctx)}</div>` });
  }
  if (p.scrim) parts.push({ group: 1, area: 2, order: 0, html: () => `<div class="sr-scrim" aria-hidden="true" style="position:absolute;inset:0;background:rgba(0,0,0,0.4)"></div>` });
  if (p.panel) {
    const r = p.panel;
    const radius = s.kind === "sheet" ? `${ctx.radius}px ${ctx.radius}px 0 0` : `${Math.max(12, ctx.radius)}px`;
    parts.push({ group: 1, area: 1, order: 1, html: () => { ctx.painted.push({ rect: r, color: p.panelColor }); return `<div class="sr-panel" aria-hidden="true" style="position:absolute;left:${n(r.x)}px;top:${n(r.y)}px;width:${n(r.w)}px;height:${n(r.h)}px;background:${p.panelColor};border-radius:${radius}"></div>`; } });
  }
  parts.sort((a, b) => a.group - b.group || b.area - a.area || a.order - b.order);
  const body = parts.map(x => x.html()).join("\n");
  const rootBg = p.page ? ctx.base : "transparent";
  return `<div data-screen-root="${esc(s.id)}" data-generated-by="stub" style="position:relative;width:100%;height:100%;overflow:hidden;background:${rootBg};color:${onColor(ctx.base)};font-family:${SYSTEM_FONT}">\n${body}\n</div>`;
}

/** A single element rendered the spec way (used to re-add an element the fragment lost). */
export function specElementHtml(s: Screen, m: ProductModel, elId: string, hints: RenderHints = {}): string | null {
  const e = s.elements.find(x => x.id === elId);
  if (!e) return null;
  const ctx = makeCtx(s, m, hints);
  // Paint everything larger first so the element picks up the right backdrop colour.
  if (ctx.plan.panel) ctx.painted.push({ rect: ctx.plan.panel, color: ctx.plan.panelColor });
  for (const o of drawable(s, ctx.dev)) {
    const fill = ctx.looks.get(o.id)?.fill;
    if (o !== e && areaOf(o.rectDp) > areaOf(e.rectDp) && fill && deltaE(fill, underColor(o.rectDp, ctx)) > PAINT_DE) ctx.painted.push({ rect: o.rectDp, color: fill });
  }
  return renderElement(e, ctx);
}

/** Image screens: the screenshot plus invisible hotspots (data-node) at element rects, and a badge. */
export function imageScreenHtml(s: Screen, m: ProductModel, src: string | null): string {
  const dev = deviceDp(m);
  const els = drawable(s, dev).map((e, i) => ({ e, i })).sort((a, b) => areaOf(b.e.rectDp) - areaOf(a.e.rectDp) || a.i - b.i);
  const chat = chatParts(s, m);
  // No data-bind on hotspots: the screenshot already shows the number and an invisible box cannot repaint it.
  const hot = els.map(({ e }) => {
    const r = e.rectDp;
    const extra = [chat?.send === e.id ? `data-role="send"` : "", e.ad ? "data-ad" : ""].filter(Boolean).join(" ");
    return `<div class="mock-hotspot" data-node="${esc(e.id)}" ${extra} title="${esc(textOf(e))}" aria-label="${esc(textOf(e))}" style="left:${n(r.x)}px;top:${n(r.y)}px;width:${n(r.w)}px;height:${n(r.h)}px"></div>`;
  }).join("\n");
  const shot = src ? `<img class="mock-shot" src="${esc(src)}" alt="${esc(s.name)} (screenshot)">` : `<div class="mock-shot mock-shot-missing">${esc(s.name)}<br>(no screenshot)</div>`;
  return `<div data-screen-root="${esc(s.id)}" data-render="image" class="mock-image-screen">\n${shot}\n${hot}\n<div class="mock-badge" aria-hidden="true">image screen</div>\n</div>`;
}
