// The spec renderer: a deterministic, absolutely-positioned HTML fragment for one screen, built only
// from the model's elements (dp rects, measured bg/fg/font size, asset crops). It is the stub for the
// per-screen HTML call, the build's fallback when no fragment was generated, and the source of the
// nudge fixer's replacement for a missing element. It follows the same contract as the LLM output:
// data-node on every element, data-bind on counters, chat roles and bubble templates, no scripts.
import { escapeHtml } from "../core/io.ts";
import type { ProductModel, Rect, Screen, UiElement } from "../core/schema.ts";
import { accentOf, baseColors, deltaE, lightness, onColor } from "./designCss.ts";
import { areaOf, chatParts, counterBindings, deviceDp, drawable, isOverlay, textOf, type ChatParts, type DeviceDp } from "./roles.ts";

interface Painted { rect: Rect; color: string }
interface Ctx {
  m: ProductModel; s: Screen; dev: DeviceDp; accent: string;
  base: string;                 // colour under everything (page bg, or the overlay panel)
  panel: Rect | null;           // overlay panel rect (dp)
  painted: Painted[];           // filled boxes so far, for "what colour is under this element"
  binds: Map<string, string>;   // element id -> resource id
  chat: ChatParts | null;
  assets: Map<string, string>;  // asset id -> relative file
  radius: number;
}

const n = (v: number) => Math.round(v * 10) / 10;
const esc = escapeHtml;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const SYSTEM_FONT = "var(--font-body, system-ui, sans-serif)";

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

/** Overlay panel: the box around the overlay's own elements (sheets extend to the bottom edge). */
function overlayPanel(s: Screen, dev: DeviceDp): Rect | null {
  const els = drawable(s, dev).filter(e => areaOf(e.rectDp) < 0.8 * dev.w * dev.h);
  if (!els.length) return null;
  const x0 = Math.min(...els.map(e => e.rectDp.x)), y0 = Math.min(...els.map(e => e.rectDp.y));
  const x1 = Math.max(...els.map(e => e.rectDp.x + e.rectDp.w)), y1 = Math.max(...els.map(e => e.rectDp.y + e.rectDp.h));
  if (y1 - y0 > dev.h * 0.85) return null; // the elements fill the screen: render it as an opaque page
  if (s.kind === "sheet") { const y = Math.max(dev.statusDp, y0 - 20); return { x: 0, y, w: dev.w, h: dev.h - y }; }
  const x = Math.max(0, x0 - 20), y = Math.max(dev.statusDp, y0 - 20);
  return { x, y, w: Math.min(dev.w, x1 + 20) - x, h: Math.min(dev.h, y1 + 20) - y };
}

function makeCtx(s: Screen, m: ProductModel): Ctx {
  const dev = deviceDp(m);
  const overlay = isOverlay(s);
  const panel = overlay ? overlayPanel(s, dev) : null;
  const els = drawable(s, dev);
  const base = overlay && panel ? colorWeights(els.filter(e => areaOf(e.rectDp) < 0.8 * dev.w * dev.h), true) ?? "#FFFFFF" : screenBackground(s, m);
  const radii = [...m.design.radiiDp].sort((a, b) => a - b);
  return {
    m, s, dev, accent: accentOf(m), base, panel, painted: [],
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

function fontFor(e: UiElement, t: string): number {
  if (e.style?.fontDp) return clamp(e.style.fontDp, 8, 48);
  if (!t) return 14;
  if (["button", "tab", "list-item", "input", "toggle"].includes(e.role)) return clamp(Math.round(e.rectDp.h * 0.36), 12, 18);
  return clamp(Math.round(e.rectDp.h / 1.3), 10, 28);
}

const textWidth = (t: string, font: number) => t.length * 0.52 * font;

function assetFile(e: UiElement, ctx: Ctx): string | undefined {
  if (!e.asset) return undefined;
  return ctx.assets.get(e.asset) ?? (/\.(png|jpe?g|webp|gif|svg)$/i.test(e.asset) ? e.asset : undefined);
}

/** One element as absolutely-positioned HTML. Records filled boxes in ctx so children know their backdrop. */
function renderElement(e: UiElement, ctx: Ctx): string {
  const r = e.rectDp;
  const t = textOf(e);
  const under = underColor(r, ctx);
  const bg = e.style?.bg;
  const paint = !!bg && deltaE(bg, under) > 3;
  const fill = paint ? bg! : under;
  const fg = e.style?.fg ?? onColor(fill);
  const font = fontFor(e, t);
  const multi = textWidth(t, font) > r.w * 1.02 && r.h > font * 1.9;
  const hasTextChildren = ctx.s.elements.some(c => c !== e && textOf(c) && c.rectDp.x >= r.x - 0.5 && c.rectDp.y >= r.y - 0.5
    && c.rectDp.x + c.rectDp.w <= r.x + r.w + 0.5 && c.rectDp.y + c.rectDp.h <= r.y + r.h + 0.5 && areaOf(c.rectDp) < areaOf(r));

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
  if (paint) ctx.painted.push({ rect: r, color: bg! });

  const file = assetFile(e, ctx);
  if (e.role === "image" || (file && !t)) {
    if (file) return `<img ${A} src="${esc(file)}" alt="${esc(t)}" style="${box}object-fit:cover;display:block;${dim}">`;
    return `<div ${A} role="img" style="${box}background:${bg ?? "#E5E7EB"};border-radius:8px;${dim}"></div>`;
  }

  if (e.role === "input") {
    const radius = Math.min(r.h / 2, 24);
    const border = paint ? "0" : `1px solid ${lightness(fill) > 0.5 ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.2)"}`;
    return `<input ${A} type="text" placeholder="${esc(t)}" style="${box}padding:0 16px;border:${border};border-radius:${n(radius)}px;background:${fill};color:${fg};font:${font}px/1.2 ${SYSTEM_FONT};outline:none;${dim}">`;
  }

  if (e.role === "toggle") {
    const on = !!e.flags?.checked;
    const track = `display:inline-block;position:relative;width:36px;height:20px;border-radius:10px;flex:none;background:${on ? ctx.accent : "rgba(128,128,128,0.45)"}`;
    const knob = `position:absolute;top:2px;left:${on ? 18 : 2}px;width:16px;height:16px;border-radius:50%;background:#FFFFFF`;
    return `<div ${A} role="switch" aria-checked="${on}" style="${box}display:flex;align-items:center;justify-content:${t ? "space-between" : "center"};gap:8px;color:${fg};font:${font}px/1.2 ${SYSTEM_FONT};${dim}">${t ? `<span>${esc(t)}</span>` : ""}<span aria-hidden="true" style="${track}"><span style="${knob}"></span></span></div>`;
  }

  if (e.role === "button") {
    const pill = paint && r.h <= 44;
    const radius = paint ? (pill ? r.h / 2 : Math.min(ctx.radius, r.h / 2)) : 0;
    const glyph = !t ? GLYPHS.find(([re]) => re.test(`${e.label ?? ""} ${e.identifier ?? ""} ${ctx.chat?.send === e.id ? "send" : ""}`))?.[1] : undefined;
    const inner = file ? `<img src="${esc(file)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">`
      : t ? esc(t) : glyph ? `<span aria-hidden="true" style="font-size:${n(Math.min(22, r.h * 0.5))}px">${glyph}</span>` : "";
    return `<button type="button" ${A} style="${box}display:flex;align-items:center;justify-content:center;padding:0 ${file ? 0 : 8}px;border:0;background:${paint ? bg : "transparent"};color:${fg};font:600 ${font}px/1.2 ${SYSTEM_FONT};border-radius:${n(radius)}px;overflow:hidden;white-space:${multi ? "normal" : "nowrap"};text-align:center;cursor:pointer;${dim}">${inner}</button>`;
  }

  if (e.role === "tab") {
    const sel = !!e.flags?.selected;
    return `<div ${A} role="tab" style="${box}display:flex;align-items:center;justify-content:center;${paint ? `background:${bg};` : ""}color:${fg};font:${sel ? 700 : 500} ${font}px/1.2 ${SYSTEM_FONT};white-space:nowrap;overflow:hidden;cursor:pointer;${dim}">${esc(t)}</div>`;
  }

  // Text-bearing boxes: text, counter, list-item, container.
  const card = e.role === "list-item" || (e.role === "container" && paint && !fullWidth);
  const cardStyle = e.role === "list-item" && !paint && r.w > ctx.dev.w * 0.6 && r.h >= 44
    ? `border:1px solid ${lightness(fill) > 0.5 ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)"};border-radius:12px;`
    : card ? `border-radius:${fullWidth ? 0 : 12}px;` : "";
  const showText = t && !hasTextChildren;
  if (!showText) return `<div ${A} style="${box}${paint ? `background:${bg};` : ""}${cardStyle}${dim}"></div>`;

  const weight = e.role === "counter" || font >= 20 ? 600 : 400;
  const centered = e.role !== "list-item" && Math.abs(r.x + r.w / 2 - ctx.dev.w / 2) < 6 && r.w > ctx.dev.w * 0.5 && textWidth(t, font) < r.w * 0.7;
  const chip = e.role === "counter" && paint;
  const pad = e.role === "list-item" ? "padding:0 16px;" : chip ? `padding:0 ${n(Math.min(12, r.h / 2))}px;border-radius:${n(r.h / 2)}px;` : "";
  const align = chip || centered ? "center" : "left";
  const lines = multi
    ? `white-space:normal;line-height:1.25;overflow:hidden;display:flex;align-items:${e.role === "list-item" ? "center" : "flex-start"};`
    : `white-space:nowrap;line-height:${n(r.h)}px;overflow:hidden;text-overflow:ellipsis;`;
  return `<div ${A} style="${box}${pad}${paint ? `background:${bg};` : ""}${cardStyle}color:${fg};font-family:${SYSTEM_FONT};font-size:${font}px;font-weight:${weight};text-align:${align};${lines}${dim}">${esc(t)}</div>`;
}

function bubbleTemplates(ctx: Ctx): string {
  const chat = ctx.chat!;
  const mid = ctx.dev.w / 2;
  const inArea = drawable(ctx.s, ctx.dev).filter(e => e.role === "text" && e.rectDp.y >= chat.messages.y && e.rectDp.y + e.rectDp.h <= chat.messages.y + chat.messages.h);
  const bot = inArea.find(e => e.rectDp.x + e.rectDp.w / 2 < mid && e.style?.bg && deltaE(e.style.bg, ctx.base) > 3);
  const user = inArea.find(e => e.rectDp.x + e.rectDp.w / 2 > mid && e.style?.bg && deltaE(e.style.bg, ctx.base) > 3);
  const botBg = bot?.style?.bg ?? (lightness(ctx.base) > 0.5 ? "#EEF0F3" : "#2A2D33");
  const userBg = user?.style?.bg ?? ctx.accent;
  const bubble = (bgc: string, fgc: string, self: boolean) =>
    `style="align-self:${self ? "flex-end" : "flex-start"};max-width:75%;margin:0 16px;padding:10px 14px;border-radius:${self ? "18px 18px 4px 18px" : "18px 18px 18px 4px"};background:${bgc};color:${fgc};font:15px/1.35 ${SYSTEM_FONT};white-space:pre-wrap;overflow-wrap:anywhere"`;
  return `<template data-template="user"><div class="sr-bubble sr-bubble-user" data-slot="text" ${bubble(userBg, user?.style?.fg ?? onColor(userBg), true)}></div></template>`
    + `<template data-template="bot"><div class="sr-bubble sr-bubble-bot" data-slot="text" ${bubble(botBg, bot?.style?.fg ?? onColor(botBg), false)}></div></template>`;
}

/** The whole screen as an HTML fragment (root: [data-screen-root]). */
export function specRender(s: Screen, m: ProductModel): string {
  const ctx = makeCtx(s, m);
  const dev = ctx.dev;
  const overlay = isOverlay(s) && !!ctx.panel;
  const parts: { area: number; order: number; html: () => string }[] = [];
  drawable(s, dev).forEach((e, i) => parts.push({ area: areaOf(e.rectDp), order: i, html: () => renderElement(e, ctx) }));

  // A tab bar backdrop behind 3+ tabs in one row, so the bar reads as a bar.
  const tabs = s.elements.filter(e => e.role === "tab");
  if (tabs.length >= 3) {
    const y = Math.min(...tabs.map(t => t.rectDp.y));
    const tbg = tabs[0].style?.bg ?? ctx.base;
    const line = lightness(tbg) > 0.5 ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)";
    parts.push({ area: dev.w * (dev.h - y) + 1e9, order: -1, html: () => { ctx.painted.push({ rect: { x: 0, y, w: dev.w, h: dev.h - y }, color: tbg }); return `<div class="sr-tabbar" aria-hidden="true" style="position:absolute;left:0;top:${n(y)}px;width:${dev.w}px;height:${n(dev.h - y)}px;background:${tbg};border-top:1px solid ${line}"></div>`; } });
  }
  // Chat: a transparent message list (new bubbles are appended below the last captured message).
  if (ctx.chat) {
    const c = ctx.chat, r = c.messages;
    const pad = Math.max(8, c.lastMessageBottom - r.y + 8);
    parts.push({ area: areaOf(r), order: -2, html: () => `<div data-role="messages" style="position:absolute;left:${n(r.x)}px;top:${n(r.y)}px;width:${n(r.w)}px;height:${n(r.h)}px;box-sizing:border-box;padding:${n(pad)}px 0 12px;display:flex;flex-direction:column;gap:8px;overflow-y:auto;scrollbar-width:none">${bubbleTemplates(ctx)}</div>` });
  }
  parts.sort((a, b) => b.area - a.area || a.order - b.order);

  const pre: string[] = [];
  if (overlay) {
    pre.push(`<div class="sr-scrim" aria-hidden="true" style="position:absolute;inset:0;background:rgba(0,0,0,0.4)"></div>`);
    const p = ctx.panel!;
    const radius = s.kind === "sheet" ? `${ctx.radius}px ${ctx.radius}px 0 0` : `${Math.max(12, ctx.radius)}px`;
    pre.push(`<div class="sr-panel" aria-hidden="true" style="position:absolute;left:${n(p.x)}px;top:${n(p.y)}px;width:${n(p.w)}px;height:${n(p.h)}px;background:${ctx.base};border-radius:${radius}"></div>`);
  }
  const body = parts.map(p => p.html()).join("\n");
  const rootBg = overlay ? "transparent" : ctx.base;
  const text = onColor(ctx.base);
  return `<div data-screen-root="${esc(s.id)}" data-generated-by="stub" style="position:relative;width:100%;height:100%;overflow:hidden;background:${rootBg};color:${text};font-family:${SYSTEM_FONT}">\n${[...pre, body].join("\n")}\n</div>`;
}

/** A single element rendered the spec way (used to re-add an element the fragment lost). */
export function specElementHtml(s: Screen, m: ProductModel, elId: string): string | null {
  const e = s.elements.find(x => x.id === elId);
  if (!e) return null;
  const ctx = makeCtx(s, m);
  // Paint everything larger first so the element picks up the right backdrop colour.
  for (const o of drawable(s, ctx.dev)) if (o !== e && areaOf(o.rectDp) > areaOf(e.rectDp) && o.style?.bg && deltaE(o.style.bg, underColor(o.rectDp, ctx)) > 3) ctx.painted.push({ rect: o.rectDp, color: o.style.bg });
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
