// Prompt text for the mock generator and the QA fixer. Stable rules go in system blocks (cached);
// the per-screen spec goes in the prompt. Nothing here may contain absolute paths, timestamps or run
// ids (that breaks replay caching): assets are named by their model-relative path.
import type { ProductModel, Screen } from "../core/schema.ts";
import type { RenderHints } from "./measure.ts";
import { chatParts, counterBindings, deviceDp, drawable, isOverlay, textOf } from "./roles.ts";

const q = (s: string) => JSON.stringify(s.length > 80 ? s.slice(0, 77) + "..." : s);
const r1 = (v: number) => Math.round(v * 10) / 10;

/** One line per element: id role type "text"|label [x,y wxh] bg fg font asset + role markers. */
export function elementSpec(s: Screen, m: ProductModel): string {
  const dev = deviceDp(m);
  const binds = new Map(counterBindings(s, m).map(b => [b.el, b.resource]));
  const chat = chatParts(s, m);
  const assets = new Map(m.design.assets.map(a => [a.id, a.file]));
  const edges = new Map(m.edges.filter(e => e.from === s.id && e.el).map(e => [e.el!, e.to]));
  return drawable(s, dev)
    .slice()
    .sort((a, b) => a.rectDp.y - b.rectDp.y || a.rectDp.x - b.rectDp.x)
    .map(e => {
      const r = e.rectDp;
      const type = e.type.split(".").pop() ?? e.type;
      const text = e.text ? q(e.text) : e.label ? `label=${q(e.label)}` : "-";
      const bits = [e.id, e.role, type, text, `[${r1(r.x)},${r1(r.y)} ${r1(r.w)}x${r1(r.h)}]`,
        `bg=${e.style?.bg ?? "-"}`, `fg=${e.style?.fg ?? "-"}`, `font=${e.style?.fontDp ?? "-"}`, `asset=${e.asset ? assets.get(e.asset) ?? e.asset : "-"}`];
      if (binds.has(e.id)) bits.push(`data-bind=${binds.get(e.id)}`);
      if (chat?.composer === e.id) bits.push("data-role=composer");
      if (chat?.send === e.id) bits.push("data-role=send");
      if (e.flags?.selected) bits.push("selected");
      if (e.flags?.disabled) bits.push("disabled");
      if (e.ad) bits.push("ad");
      if (edges.has(e.id)) bits.push(`tap->${edges.get(e.id)}`);
      return bits.join(" ");
    }).join("\n");
}

export function assetManifest(m: ProductModel, s?: Screen): string {
  const list = m.design.assets.filter(a => !s || a.screen === s.id || s.elements.some(e => e.asset === a.id));
  if (!list.length) return "(no asset crops)";
  return list.map(a => `${a.file} ${a.kind}${a.label ? ` "${a.label}"` : ""} ${Math.round(a.rectPx.w / m.device.density)}x${Math.round(a.rectPx.h / m.device.density)}dp${a.el ? ` (element ${a.el} on ${a.screen})` : ""}`).join("\n");
}

export const DESIGN_SYSTEM_PROMPT = `You write the design-system CSS for a static, clickable HTML mock of a mobile app.
The mock is rendered in a phone viewport where 1 CSS px = 1 dp. Screen fragments use this CSS plus inline geometry.
Output exactly one \`\`\`css fenced block and nothing else.
Requirements:
- On :root define: --c-bg, --c-surface, --c-text, --c-muted, --c-border, --c-accent, --c-on-accent, --font-body,
  --fs-xs, --fs-sm, --fs-md, --fs-lg, --fs-xl (from the measured type scale), --r-sm, --r-md, --r-lg (from the radii).
- Component classes matching the screenshots: .app-bar, .tab-bar, .tab, .tab.is-selected, .btn, .btn-primary,
  .btn-secondary, .chip, .counter, .card, .list-row, .bubble-in, .bubble-out, .composer, .scrim, .modal, .sheet,
  .paywall, .store-tile, .badge.
- Colours, radii and type sizes come from the measured tokens and the screenshots, not from a generic theme.
  No shadows, gradients or radii that are not visible in the screenshots.
- No @import, no url() to the network, no @font-face (fonts are provided locally): use the given font stack.
- Do not style html, body or * globally; scope screen-wide rules under [data-screen-root].`;

export function designPrompt(m: ProductModel, fontStack: string, shown: Screen[]): string {
  const pal = m.design.palette.map(p => `${p.hex} ${(p.share * 100).toFixed(1)}%`).join(", ") || "(none measured)";
  return [
    `App: ${m.app.name}. Screenshots attached: ${shown.map(s => `${s.id} "${s.name}" (${s.kind})`).join("; ")}.`,
    `Viewport: ${deviceDp(m).w}x${deviceDp(m).h} dp.`,
    `Measured palette (share of pixels): ${pal}.`,
    `Measured type scale (dp): ${m.design.typeScaleDp.join(", ") || "(none)"}.`,
    `Measured radii (dp): ${m.design.radiiDp.join(", ") || "(none measured; read them from the screenshots)"}.`,
    `Font stack to use for --font-body: ${fontStack}.`,
  ].join("\n");
}

export const SCREEN_SYSTEM_PROMPT = `You rebuild one mobile app screen as a static HTML fragment for a 1:1 clickable mock.
The fragment is placed in a phone viewport where 1 CSS px = 1 dp, with design.css already loaded.
The mock runtime adds ALL behaviour (navigation, counters, chat); you write only structure and style.
Rules:
1. Output exactly one \`\`\`html fenced block and nothing else.
2. Wrap everything in <div data-screen-root="<screen id>" style="position:relative;width:100%;height:100%;overflow:hidden">.
3. Every element in the spec gets data-node="<id>" on the element whose box is that element. Keep every id; do not invent ids.
4. Copy text verbatim: same case, punctuation, numbers and spacing.
5. Each data-node box must be within 2 dp of its spec rect [x,y wxh] (dp from the screen's top-left corner).
   Absolute positioning with inline left/top/width/height is fine and preferred for irregular layouts.
6. Counters: put data-bind="<resource>" on the element that shows the number (spec marks them data-bind=...).
7. Chat screens: the message list container gets data-role="messages", the text input data-role="composer"
   (a real <input> or <textarea>), the send control data-role="send". Inside the message list add
   <template data-template="user"> and <template data-template="bot">, each holding one bubble styled like the
   screenshot, with its text element marked data-slot="text".
8. No <script>, no on* attributes, no javascript: URLs, no forms that submit.
9. Do not draw the Android status bar or the system navigation bar; leave those rows as the screen background.
10. No external URLs. Images only from the asset manifest (relative paths as given). Fonts: var(--font-body) only.
11. Use design.css variables and classes where they fit and inline styles for exact geometry and colours.
    No shadows, gradients or radii that are not visible in the screenshot.
12. Overlays (modal / sheet / dialog): draw a full-screen scrim matching the screenshot's dimming and the overlay's
    own panel; do not redraw the screen underneath (the runtime shows it).
13. Elements marked "ad" keep their look and get a data-ad attribute.
14. Icons without an asset: a simple inline SVG or a unicode glyph with aria-label set to the element's label.`;

export function screenPrompt(s: Screen, m: ProductModel, css: string, hints: RenderHints = {}): string {
  const dev = deviceDp(m);
  const chat = chatParts(s, m);
  const binds = counterBindings(s, m);
  const lines = [
    `Screen ${s.id} "${s.name}" (kind ${s.kind}${s.parent ? `, shown over ${s.parent}` : ""}). Purpose: ${s.purpose}`,
    `Viewport ${dev.w}x${dev.h} dp; the screenshot is ${m.device.widthPx}x${m.device.heightPx} px (${m.device.density} px per dp).`,
    `Status bar: top ${dev.statusDp} dp. System navigation bar: bottom ${dev.navDp} dp. Do not draw either.`,
    isOverlay(s) ? `This is an overlay (${s.kind}): scrim + panel only.` : "",
    hints.pageBg ? `Page background (measured where no element is): ${hints.pageBg}.` : "",
    binds.length ? `Counters: ${binds.map(b => `${b.el} -> data-bind="${b.resource}"`).join(", ")}.` : "",
    chat ? `Chat parts: composer ${chat.composer ?? "(none)"}, send ${chat.send ?? "(none)"}, message list area [0,${Math.round(chat.messages.y)} ${chat.messages.w}x${Math.round(chat.messages.h)}] dp. New bubbles are appended to the list after the captured ones.` : "",
    "",
    "Element spec (id role type \"text\"|label=... [x,y wxh] bg fg font asset markers):",
    elementSpec(s, m),
    "",
    "Asset manifest (relative paths usable in src):",
    assetManifest(m, s),
    "",
    "design.css:",
    "```css",
    css,
    "```",
  ];
  return lines.filter(l => l !== "").join("\n");
}

export function retryPrompt(base: string, violations: string[]): string {
  return `${base}\n\nYour previous fragment for this screen was rejected by the validator:\n${violations.map(v => `- ${v}`).join("\n")}\nFix every point and output the complete fragment again.`;
}

export const FIX_SYSTEM_PROMPT = `You fix a generated HTML fragment of a mobile app screen so it matches the original screenshot 1:1.
You get: a composite image (left: original screenshot, middle: current mock render, right: pixel-difference heatmap,
red = different), the worst measured differences per element, the must-fix list, and the current HTML.
Diff lines read "<id>: <what is wrong>"; "18dp too low" means the mock box is 18 dp below the original,
"bg #A vs #B" and "text 'a' vs 'b'" list the mock value first and the original second.
Change what the differences call for and nothing else. Keep every data-node, data-bind, data-role, data-template
and data-slot attribute. Same rules as generation: no <script>, no on* attributes, no external URLs, no status bar.
Output exactly one \`\`\`html fenced block with the complete revised fragment, then a line "CHANGELOG:" followed by
at most 8 lines starting with "- ", each naming the element ids you changed and how.`;

export function fixPrompt(s: Screen, m: ProductModel, html: string, diffs: string[], mustFix: string[], metrics: string): string {
  return [
    `Screen ${s.id} "${s.name}" (kind ${s.kind}). Current metrics: ${metrics}.`,
    mustFix.length ? `Must fix:\n${mustFix.map(d => `- ${d}`).join("\n")}` : "Must fix: none.",
    `Worst differences (ranked by area x error):\n${diffs.map(d => `- ${d}`).join("\n") || "- none"}`,
    "Element spec (targets):",
    elementSpec(s, m),
    "Current HTML:",
    "```html",
    html,
    "```",
  ].join("\n");
}

/** Split a fixer answer into HTML and changelog lines. */
export function parseFix(answer: string): { html: string; changelog: string[] } {
  const m = /```html\s*\n([\s\S]*?)```/i.exec(answer) ?? /```\w*\s*\n([\s\S]*?)```/.exec(answer);
  const html = (m ? m[1] : answer).trim();
  const after = m ? answer.slice((m.index ?? 0) + m[0].length) : "";
  const cl = /CHANGELOG:\s*\n?([\s\S]*)$/i.exec(after);
  const changelog = (cl ? cl[1] : "").split("\n").map(l => l.trim()).filter(l => l.startsWith("-")).map(l => l.replace(/^-\s*/, "")).slice(0, 8);
  return { html, changelog };
}

export { textOf };
