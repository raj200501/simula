// Design-system CSS from measured tokens (palette, type scale, radii, fonts). This is the stub for
// the design-system LLM call and the fallback the build uses when no CSS was generated, so every
// page has the same variable names whether a model or code wrote them.
import { converter, differenceCiede2000, parse } from "culori";
import type { ProductModel } from "../core/schema.ts";

const oklch = converter("oklch");
const de2000 = differenceCiede2000();

/** Colour distance (CIEDE2000); unparseable colours count as far apart. */
export function deltaE(a: string | undefined, b: string | undefined): number {
  const x = a ? parse(a) : undefined, y = b ? parse(b) : undefined;
  return x && y ? de2000(x, y) : 100;
}

export function lightness(hex: string): number {
  return oklch(hex)?.l ?? 1;
}

/** Text colour readable on `bg`. */
export function onColor(bg: string): string {
  return lightness(bg) > 0.62 ? "#111111" : "#FFFFFF";
}

/** The accent: the most chromatic palette colour with a real share (buttons, selected tabs). */
export function accentOf(m: ProductModel): string {
  const cands = m.design.palette
    .map(p => ({ hex: p.hex, share: p.share, c: oklch(p.hex)?.c ?? 0, l: oklch(p.hex)?.l ?? 0 }))
    .filter(p => p.share >= 0.005 && p.c >= 0.06 && p.l > 0.2 && p.l < 0.92)
    .sort((a, b) => b.c * Math.sqrt(b.share) - a.c * Math.sqrt(a.share));
  if (cands[0]) return cands[0].hex.toUpperCase();
  // Fall back to the most common filled-button colour, then a neutral blue.
  const btn = m.screens.flatMap(s => s.elements).filter(e => e.role === "button" && e.style?.bg && (oklch(e.style.bg)?.c ?? 0) > 0.06);
  return (btn[0]?.style?.bg ?? "#3B82F6").toUpperCase();
}

/** Page background + text colours from the palette: the most common light (or dark) colour. */
export function baseColors(m: ProductModel): { bg: string; surface: string; text: string; muted: string; border: string } {
  const pal = [...m.design.palette].sort((a, b) => b.share - a.share);
  const bg = pal[0]?.hex ?? "#FFFFFF";
  const dark = lightness(bg) < 0.5;
  const text = pal.find(p => Math.abs(lightness(p.hex) - lightness(bg)) > 0.55)?.hex ?? (dark ? "#F5F5F5" : "#111111");
  const surface = pal.find(p => p.hex !== bg && Math.abs(lightness(p.hex) - lightness(bg)) < 0.12 && deltaE(p.hex, bg) > 2)?.hex ?? (dark ? "#1F2126" : "#F3F4F6");
  return { bg, surface, text, muted: dark ? "#A1A1AA" : "#6B7280", border: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)" };
}

const SYSTEM_STACK = `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;

/** Font stack: the model's family first (bundled via @font-face when the model has the file), then system fonts. */
export function fontStack(m: ProductModel): string {
  const fams = m.design.fonts.map(f => f.family).filter(f => f && !/^system(-ui)?$/i.test(f));
  return [...new Set(fams)].map(f => `"${f.replace(/"/g, "")}"`).concat(SYSTEM_STACK).join(", ");
}

/** @font-face rules for fonts shipped in the model directory (never a network URL). */
export function fontFaces(m: ProductModel): { css: string; files: { from: string; to: string }[] } {
  const files: { from: string; to: string }[] = [];
  const rules: string[] = [];
  for (const f of m.design.fonts) {
    if (!f.file) continue;
    const base = f.file.split("/").pop()!;
    const to = `assets/fonts/${base}`;
    files.push({ from: f.file, to });
    const fmt = /\.woff2$/i.test(base) ? "woff2" : /\.woff$/i.test(base) ? "woff" : /\.otf$/i.test(base) ? "opentype" : "truetype";
    rules.push(`@font-face { font-family: "${f.family.replace(/"/g, "")}"; src: url("${to}") format("${fmt}"); font-display: block; }`);
  }
  return { css: rules.join("\n"), files };
}

/** Deterministic design-system CSS: variables + the component classes the prompt asks the LLM for. */
export function stubDesignCss(m: ProductModel): string {
  const c = baseColors(m);
  const accent = accentOf(m);
  const scale = (m.design.typeScaleDp.length ? m.design.typeScaleDp : [12, 14, 16, 20, 24]).slice().sort((a, b) => a - b);
  const pick = (q: number) => scale[Math.min(scale.length - 1, Math.max(0, Math.round(q * (scale.length - 1))))];
  const radii = (m.design.radiiDp.length ? m.design.radiiDp : [8, 12, 20]).slice().sort((a, b) => a - b);
  const r = (i: number) => radii[Math.min(radii.length - 1, i)];
  return `/* generatedBy: stub (deterministic, from measured design tokens) */
:root {
  --c-bg: ${c.bg};
  --c-surface: ${c.surface};
  --c-text: ${c.text};
  --c-muted: ${c.muted};
  --c-border: ${c.border};
  --c-accent: ${accent};
  --c-on-accent: ${onColor(accent)};
  --font-body: ${fontStack(m)};
  --fs-xs: ${pick(0)}px; --fs-sm: ${pick(0.25)}px; --fs-md: ${pick(0.5)}px; --fs-lg: ${pick(0.75)}px; --fs-xl: ${pick(1)}px;
  --r-sm: ${r(0)}px; --r-md: ${r(1)}px; --r-lg: ${r(2)}px;
}
[data-screen-root] { font-family: var(--font-body); color: var(--c-text); }
.app-bar { display: flex; align-items: center; gap: 12px; height: 56px; padding: 0 16px; background: var(--c-bg); color: var(--c-text); font-size: var(--fs-lg); font-weight: 600; }
.tab-bar { display: flex; justify-content: space-around; align-items: stretch; background: var(--c-bg); border-top: 1px solid var(--c-border); }
.tab { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-size: var(--fs-xs); color: var(--c-muted); }
.tab.is-selected { color: var(--c-accent); font-weight: 600; }
.btn { display: inline-flex; align-items: center; justify-content: center; min-height: 40px; padding: 0 16px; border-radius: var(--r-md); border: 0; font: 600 var(--fs-md) var(--font-body); background: transparent; color: var(--c-text); }
.btn-primary { background: var(--c-accent); color: var(--c-on-accent); }
.btn-secondary { background: var(--c-surface); color: var(--c-text); }
.chip { display: inline-flex; align-items: center; gap: 6px; padding: 0 12px; height: 32px; border-radius: 999px; background: var(--c-surface); font-size: var(--fs-sm); }
.counter { display: inline-flex; align-items: center; gap: 4px; font-weight: 600; font-variant-numeric: tabular-nums; }
.card { background: var(--c-surface); border-radius: var(--r-md); }
.list-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--c-border); }
.bubble-in { align-self: flex-start; max-width: 75%; padding: 10px 14px; border-radius: 18px 18px 18px 4px; background: var(--c-surface); color: var(--c-text); font-size: var(--fs-md); }
.bubble-out { align-self: flex-end; max-width: 75%; padding: 10px 14px; border-radius: 18px 18px 4px 18px; background: var(--c-accent); color: var(--c-on-accent); font-size: var(--fs-md); }
.composer { display: flex; align-items: center; gap: 8px; padding: 0 16px; min-height: 44px; border-radius: 999px; border: 1px solid var(--c-border); background: var(--c-bg); font: var(--fs-md) var(--font-body); color: var(--c-text); }
.scrim { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.4); }
.modal { position: absolute; background: var(--c-bg); border-radius: var(--r-lg); padding: 20px; }
.sheet { position: absolute; left: 0; right: 0; bottom: 0; background: var(--c-bg); border-radius: var(--r-lg) var(--r-lg) 0 0; padding: 20px 16px; }
.paywall { background: var(--c-bg); padding: 24px 16px; }
.store-tile { display: flex; align-items: center; justify-content: space-between; padding: 16px; border-radius: var(--r-md); background: var(--c-surface); }
.badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 999px; font-size: var(--fs-xs); background: var(--c-accent); color: var(--c-on-accent); }
`;
}
