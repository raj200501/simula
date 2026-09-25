// The stub fixer for the QA loop (no LLM): moves and resizes data-node boxes to the measured rects,
// restores verbatim text, re-adds missing elements (spec-rendered at their rect) and restores missing
// counter bindings. It only acts on the same top-12 differences the LLM fixer would get, and skips an
// element whose enclosing data-node is being moved in the same round (it moves with its parent and
// is re-measured next round). Deterministic, so stub-mode demos show a real improving loop.
import type { Page } from "playwright";
import type { ProductModel, Screen } from "../core/schema.ts";
import { specElementHtml } from "../mock/specRender.ts";
import type { Comparison } from "./compare.ts";
import { call, type DomBox } from "./render.ts";

interface Fix { id: string; dx?: number; dy?: number; w?: number; h?: number; text?: string; add?: string; bind?: string }

const APPLY_JS = String.raw`(html, fixes) => {
  const t = document.createElement("template");
  t.innerHTML = html;
  const root = t.content.querySelector("[data-screen-root]") || t.content.firstElementChild;
  const px = (v) => (Math.round(v * 10) / 10) + "px";
  const sgn = (v) => (v > 0 ? "+" : "") + (Math.round(v * 10) / 10);
  const log = [];
  for (const f of fixes) {
    const el = t.content.querySelector('[data-node="' + f.id + '"]');
    if (f.add) {
      if (el) {
        // Present but hidden: show it instead of adding a duplicate.
        el.removeAttribute("hidden");
        if (el.style.display === "none") el.style.display = "";
        if (el.style.visibility === "hidden") el.style.visibility = "";
        log.push(f.id + ": made visible");
      } else if (root) {
        const tt = document.createElement("template");
        tt.innerHTML = f.add;
        const add = tt.content.firstElementChild;
        if (add) {
          if (!root.style.position) root.style.position = "relative";
          root.appendChild(add);
          log.push(f.id + ": added the missing element at its spec rect");
        }
      }
      continue;
    }
    if (!el) continue;
    const parts = [];
    if (f.dx || f.dy) {
      const abs = el.style.position === "absolute" && /px$/.test(el.style.left) && /px$/.test(el.style.top);
      if (abs) {
        el.style.left = px(parseFloat(el.style.left) + (f.dx || 0));
        el.style.top = px(parseFloat(el.style.top) + (f.dy || 0));
      } else {
        // Flow layout: shift visually without disturbing siblings.
        const cur = (el.style.translate || "0px 0px").split(/\s+/).map((v) => parseFloat(v) || 0);
        el.style.translate = px((cur[0] || 0) + (f.dx || 0)) + " " + px((cur[1] || 0) + (f.dy || 0));
      }
      parts.push("moved " + sgn(f.dx || 0) + "," + sgn(f.dy || 0) + "dp");
    }
    if (f.w !== undefined && f.h !== undefined) {
      el.style.width = px(f.w);
      el.style.height = px(f.h);
      el.style.boxSizing = "border-box";
      parts.push("resized to " + (Math.round(f.w * 10) / 10) + "x" + (Math.round(f.h * 10) / 10) + "dp");
    }
    if (f.text !== undefined) {
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") el.setAttribute("placeholder", f.text);
      else {
        const own = [];
        const walk = (n) => {
          for (let c = n.firstChild; c; c = c.nextSibling) {
            if (c.nodeType === 3 && c.nodeValue.trim()) own.push(c);
            else if (c.nodeType === 1 && !c.hasAttribute("data-node") && c.tagName !== "TEMPLATE" && c.tagName !== "STYLE") walk(c);
          }
        };
        walk(el);
        if (own.length) { own[0].nodeValue = f.text; own.slice(1).forEach((n) => { n.nodeValue = ""; }); }
        else if (el.hasAttribute("aria-label")) el.setAttribute("aria-label", f.text);
        else if (!el.children.length) el.textContent = f.text;
        else el.setAttribute("aria-label", f.text);
      }
      parts.push("text -> '" + f.text.slice(0, 40) + "'");
    }
    if (f.bind) { el.setAttribute("data-bind", f.bind); parts.push('data-bind="' + f.bind + '"'); }
    if (parts.length) log.push(f.id + ": " + parts.join("; "));
  }
  const host = document.createElement("div");
  host.appendChild(t.content.cloneNode(true));
  return { html: host.innerHTML, log };
}`;

/** Fixes for the worst differences, parents before children. */
export function planFixes(s: Screen, m: ProductModel, cmp: Comparison, boxes: DomBox[]): Fix[] {
  const parents = new Map(boxes.map(b => [b.id, b.parents]));
  const byId = new Map(cmp.elements.map(e => [e.id, e]));
  const fixes: Fix[] = [];
  const moving = new Set<string>();
  const targets = [...new Set([...cmp.mustFix, ...cmp.worst].map(d => d.node))].slice(0, 12);
  // Outermost first, so a child is only nudged when its container is already in place.
  targets.sort((a, b) => (parents.get(a)?.length ?? 0) - (parents.get(b)?.length ?? 0));
  for (const id of targets) {
    const e = byId.get(id);
    if (!e) continue;
    if (e.missing) {
      const add = specElementHtml(s, m, id);
      if (add) fixes.push({ id, add });
      continue;
    }
    if ((parents.get(id) ?? []).some(p => moving.has(p))) continue;
    const f: Fix = { id };
    const got = e.got_rect!;
    if (Math.abs(e.dxDp) >= 1 || Math.abs(e.dyDp) >= 1) { f.dx = e.target.x - got.x; f.dy = e.target.y - got.y; moving.add(id); }
    if (Math.abs(e.dwDp) >= 1 || Math.abs(e.dhDp) >= 1) { f.w = e.target.w; f.h = e.target.h; moving.add(id); }
    if (e.want && e.got !== e.want) f.text = e.want;
    if (e.unbound) f.bind = e.unbound;
    if (Object.keys(f).length > 1) fixes.push(f);
  }
  return fixes;
}

export async function nudgeFix(page: Page, html: string, s: Screen, m: ProductModel, cmp: Comparison, boxes: DomBox[]): Promise<{ html: string; changelog: string[] }> {
  const fixes = planFixes(s, m, cmp, boxes);
  if (!fixes.length) return { html, changelog: ["nudge: nothing to change"] };
  const r = await call<{ html: string; log: string[] }>(page, APPLY_JS, html, fixes);
  const log = r.log.length > 8 ? [...r.log.slice(0, 7), `+${r.log.length - 7} more element fixes`] : r.log;
  return { html: r.html, changelog: log.map(l => `nudge ${l}`) };
}
