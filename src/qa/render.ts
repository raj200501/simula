// Renders one mock screen the way the device saw the original: the phone viewport in dp at the
// device's density (411x914 at 2.625 on a Pixel 8), ?frame=0 so there is no device chrome, then the
// screenshot is resized to exactly model.device widthPx x heightPx and every [data-node] box of the
// screen's own layer is read and converted to device px.
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { chromium, type Browser, type Page } from "playwright";
import type { ProductModel, Rect } from "../core/schema.ts";
import { deviceDp } from "../mock/roles.ts";

export interface Viewport { widthDp: number; heightDp: number; dpr: number; widthPx: number; heightPx: number }
export interface DomBox {
  id: string;
  text: string;           // text the element shows itself (nested data-node excluded), else its accessible name
  bind: string | null;    // data-bind on the element or inside it
  bindAuto: boolean;      // the binding was added by the runtime, not present in the fragment
  role: string | null;    // data-role
  parents: string[];      // enclosing data-node ids, closest first
  hidden: boolean;
  rect: Rect;             // device px
}
export interface RenderResult { png: Buffer; boxes: DomBox[] }

export function viewportOf(m: ProductModel): Viewport {
  const d = deviceDp(m);
  return { widthDp: d.w, heightDp: d.h, dpr: d.density, widthPx: d.widthPx, heightPx: d.heightPx };
}

export async function launchBrowser(): Promise<Browser> {
  return chromium.launch();
}

export async function newMockPage(b: Browser, v: Viewport): Promise<Page> {
  const page = await b.newPage({ viewport: { width: v.widthDp, height: v.heightDp }, deviceScaleFactor: v.dpr });
  page.on("pageerror", e => process.stderr.write(`[qa] mock page error: ${e.message}\n`));
  return page;
}

export function mockUrl(indexHtml: string, params: Record<string, string>): string {
  const u = new URL(pathToFileURL(indexHtml).href);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.href;
}

/** Evaluate a plain-JS function source in the page (see mock/validate.ts for why it is a string). */
export async function call<T>(page: Page, fnSrc: string, ...args: unknown[]): Promise<T> {
  return (await page.evaluate(`(${fnSrc})(${args.map(a => JSON.stringify(a)).join(",")})`)) as T;
}

export async function openMock(page: Page, indexHtml: string, params: Record<string, string>): Promise<void> {
  await page.goto(mockUrl(indexHtml, params));
  await page.waitForFunction("document.documentElement.dataset.mockReady === '1'", undefined, { timeout: 10_000 });
}

const SETTLE_JS = String.raw`() => Promise.all([
  document.fonts ? document.fonts.ready : Promise.resolve(),
  ...Array.from(document.images).filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; })),
]).then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true)))))`;

const INJECT_JS = String.raw`(id, html) => {
  const t = document.querySelector('template[data-screen="' + id + '"]');
  if (!t) throw new Error("no template for " + id);
  t.innerHTML = html;
  window.__mock.go(id);
  return true;
}`;

const BOXES_JS = String.raw`(id) => {
  const layer = document.querySelector('[data-screen-layer="' + id + '"]');
  if (!layer) return [];
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const own = (el) => {
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return clean(el.value || el.placeholder || el.getAttribute("aria-label"));
    if (el.tagName === "IMG") return clean(el.getAttribute("aria-label") || el.alt);
    let s = "";
    const walk = (n) => {
      for (let c = n.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) s += c.nodeValue + " ";
        else if (c.nodeType === 1 && !c.hasAttribute("data-node") && !["TEMPLATE", "STYLE", "SCRIPT"].includes(c.tagName) && c.getAttribute("aria-hidden") !== "true" && getComputedStyle(c).display !== "none") walk(c);
      }
    };
    walk(el);
    return clean(s) || clean(el.getAttribute("aria-label") || el.getAttribute("title") || "");
  };
  const out = [];
  for (const el of layer.querySelectorAll("[data-node]")) {
    if (el.closest("template")) continue;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const parents = [];
    for (let p = el.parentElement && el.parentElement.closest("[data-node]"); p && layer.contains(p); p = p.parentElement && p.parentElement.closest("[data-node]")) parents.push(p.getAttribute("data-node"));
    const b = el.matches("[data-bind]") ? el : el.querySelector("[data-bind]");
    out.push({
      id: el.getAttribute("data-node"), text: own(el), bind: b ? b.getAttribute("data-bind") : null, bindAuto: !!(b && b.hasAttribute("data-bind-auto")),
      role: el.getAttribute("data-role"), parents,
      hidden: cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0 || r.width < 0.5 || r.height < 0.5,
      x: r.left, y: r.top, w: r.width, h: r.height,
    });
  }
  return out;
}`;

interface RawBox { id: string; text: string; bind: string | null; bindAuto: boolean; role: string | null; parents: string[]; hidden: boolean; x: number; y: number; w: number; h: number }

/**
 * Render `screenId` of the mock at `indexHtml`. With `html`, that fragment replaces the screen's
 * template first (QA candidates are measured without rebuilding the mock).
 */
export async function renderScreen(page: Page, indexHtml: string, screenId: string, v: Viewport, html?: string): Promise<RenderResult> {
  await openMock(page, indexHtml, { screen: screenId, frame: "0" });
  if (html !== undefined) await call(page, INJECT_JS, screenId, html);
  await call(page, SETTLE_JS);
  const raw = await page.screenshot({ type: "png", animations: "disabled", caret: "hide" });
  const meta = await sharp(raw).metadata();
  const png = await sharp(raw).resize(v.widthPx, v.heightPx, { fit: "fill" }).png().toBuffer();
  // CSS px -> device px, exactly as the screenshot was scaled.
  const sx = (v.widthPx / (meta.width ?? v.widthPx)) * v.dpr, sy = (v.heightPx / (meta.height ?? v.heightPx)) * v.dpr;
  const boxes = (await call<RawBox[]>(page, BOXES_JS, screenId)).map(b => ({
    id: b.id, text: b.text, bind: b.bind, bindAuto: b.bindAuto, role: b.role, parents: b.parents, hidden: b.hidden,
    rect: { x: b.x * sx, y: b.y * sy, w: b.w * sx, h: b.h * sy },
  }));
  return { png, boxes };
}
