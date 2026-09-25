// WebDevice: the Device interface over a web page at phone size (Playwright chromium).
// It drives the fixture app (under fixtures/) and our own generated mock, so the same explorer code that
// crawls a real Android app can crawl both without a device.
//
// It deliberately reports what an Android accessibility dump would report, not what the DOM knows:
//   - flat element list in document order, device-px rects clipped to what is actually on screen;
//   - Android-like classes (Button / EditText / ImageView / TextView / View);
//   - text fields report their value only (mobile-mcp drops the hint, so we drop the placeholder);
//   - a button "merges" the text of its children (like a MaterialButton), a generic clickable container does not
//     (like a clickable LinearLayout with TextView children);
//   - nothing app-specific: an ad is anything with a data-ad attribute, an external surface anything with data-external.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser, type Page } from "playwright";
import type { DeviceInfo, RawElement } from "../core/schema.ts";
import { ROOT } from "../core/config.ts";
import { ensureDir, sleep } from "../core/io.ts";
import type { Device } from "./types.ts";

export interface WebOpenOptions {
  /** http(s) URL, file:// URL, absolute file path, or a path relative to the repo root (a query string is kept). */
  url: string;
  /** What foreground() reports while no external surface is showing (the app's package in apps/<id>.json). */
  appPackage: string;
  widthDp?: number;
  heightDp?: number;
  dpr?: number;
  headless?: boolean;
  /** Append ?reset=1 on the first load only, so the page starts from a clean state; later launches keep state. */
  resetState?: boolean;
}

/** Pixel 8: 411x914 dp at 2.625 px/dp, the same screen the emulator AVD uses. */
const DEFAULTS = { widthDp: 411, heightDp: 914, dpr: 2.625 };
/** Android-like system bar heights in dp; pages draw their own 24 dp status strip and 48 dp nav strip. */
const STATUS_BAR_DP = 24;
const NAV_BAR_DP = 48;
const SETTLE_MS = 150;

/** Resolve a URL or path to something page.goto accepts. Repo-relative paths resolve against the repo root. */
export function resolveUrl(u: string): string {
  if (/^(https?|file|about|data):/i.test(u)) return u;
  const cut = u.search(/[?#]/);
  const file = cut < 0 ? u : u.slice(0, cut);
  const suffix = cut < 0 ? "" : u.slice(cut);
  const abs = path.isAbsolute(file) ? file : path.join(ROOT, file);
  return pathToFileURL(abs).href + suffix;
}

/** Add (or replace) one query parameter, keeping any #hash at the end. */
export function withParam(url: string, key: string, value: string): string {
  const hashAt = url.indexOf("#");
  const base = hashAt < 0 ? url : url.slice(0, hashAt);
  const hash = hashAt < 0 ? "" : url.slice(hashAt);
  const re = new RegExp(`([?&])${key}=[^&]*`);
  if (re.test(base)) return base.replace(re, `$1${key}=${encodeURIComponent(value)}`) + hash;
  return `${base}${base.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(value)}${hash}`;
}

// In-page code is kept as plain JS strings, not TS functions: tsx (esbuild keepNames) wraps named inner functions
// in a __name() helper that does not exist inside the browser, which breaks page.evaluate(fn).
const ELEMENTS_JS = String.raw`(dpr) => {
  const INTERACTIVE = "button,a,input,textarea,select,[role=button],[role=tab],[role=link],[role=switch],[role=checkbox],[role=radio],[role=menuitem],[role=option],[onclick],[tabindex],[data-node]";
  const MERGING = "button,a,[role=button],[role=tab]"; // controls whose descendants' text is merged into them
  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "LINK", "META"]);
  const vw = window.innerWidth, vh = window.innerHeight;
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();

  const shown = (el) => {
    if (typeof el.checkVisibility === "function") {
      return el.checkVisibility({ opacityProperty: true, visibilityProperty: true, checkOpacity: true, checkVisibilityCSS: true });
    }
    for (let p = el; p; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
    }
    return true;
  };

  // Bounding box clipped by every ancestor that clips overflow and by the viewport, like Android's
  // getBoundsInScreen. Returns null when nothing of the element is on screen.
  const visibleBox = (el) => {
    const b = el.getBoundingClientRect();
    if (b.width <= 0 || b.height <= 0) return null;
    let l = b.left, t = b.top, r = b.right, bt = b.bottom;
    if (getComputedStyle(el).position !== "fixed") {
      for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
        const s = getComputedStyle(p);
        if (s.overflowX !== "visible" || s.overflowY !== "visible") {
          const pb = p.getBoundingClientRect();
          if (s.overflowX !== "visible") { l = Math.max(l, pb.left); r = Math.min(r, pb.right); }
          if (s.overflowY !== "visible") { t = Math.max(t, pb.top); bt = Math.min(bt, pb.bottom); }
        }
        if (s.position === "fixed") break; // a fixed ancestor escapes the clipping of everything above it
      }
    }
    l = Math.max(l, 0); t = Math.max(t, 0); r = Math.min(r, vw); bt = Math.min(bt, vh);
    return r > l && bt > t ? { l, t, r, b: bt } : null;
  };

  const out = [];
  for (const el of document.body.querySelectorAll("*")) {
    if (SKIP.has(el.tagName)) continue;
    if (el.closest("[inert],[aria-hidden=true]")) continue; // outside the accessibility tree
    const interactive = el.matches(INTERACTIVE);
    const tag = el.tagName.toLowerCase();
    const isImg = tag === "img" || tag === "svg";
    const label = clean(el.getAttribute("aria-label") || (tag === "img" ? el.getAttribute("alt") : ""));
    const ownText = clean(Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join(" "));
    const isAd = el.hasAttribute("data-ad");
    if (!interactive && !label && !ownText && !isAd) continue;
    // Text inside a button is part of the button (one node), unless it is itself labelled or interactive.
    if (!interactive && !label && el.parentElement && el.parentElement.closest(MERGING)) continue;
    if (!shown(el)) continue;
    const box = visibleBox(el);
    if (!box) continue;

    const merging = el.matches(MERGING);
    const editable = tag === "input" || tag === "textarea";
    let text = "";
    if (editable) text = el.type === "password" ? "" : clean(el.value); // Android EditText: value only, hint dropped
    else if (tag === "select") text = clean(el.selectedOptions && el.selectedOptions[0] ? el.selectedOptions[0].text : "");
    else if (merging) text = clean(el.innerText);
    else text = ownText;

    const role = el.getAttribute("role");
    let type;
    if (tag === "input" && el.type === "checkbox") type = "android.widget.CheckBox";
    else if (role === "switch") type = "android.widget.Switch";
    else if (merging) type = "android.widget.Button";
    else if (editable) type = "android.widget.EditText";
    else if (isImg) type = "android.widget.ImageView";
    else if (ownText) type = "android.widget.TextView";
    else type = "android.view.View";

    const testid = el.getAttribute("data-testid");
    const identifier = isAd ? "web:id/ad_container" : el.id ? "web:id/" + el.id : testid ? "web:id/" + testid : "";

    const cls = el.classList;
    const current = el.getAttribute("aria-current");
    const selected = el.getAttribute("aria-selected") === "true" || (current !== null && current !== "false") || cls.contains("selected") || cls.contains("active");
    const checked = el.getAttribute("aria-checked") === "true" || el.checked === true;
    const disabled = el.disabled === true || el.getAttribute("aria-disabled") === "true";
    const focused = document.activeElement === el && el !== document.body;

    const e = {
      type,
      rect: { x: Math.round(box.l * dpr), y: Math.round(box.t * dpr), w: Math.round((box.r - box.l) * dpr), h: Math.round((box.b - box.t) * dpr) },
    };
    if (text) e.text = text;
    if (label) e.label = label;
    if (identifier) e.identifier = identifier;
    if (selected) e.selected = true;
    if (checked) e.checked = true;
    if (focused) e.focused = true;
    if (disabled) e.disabled = true;
    out.push(e);
  }
  return out;
}`;

const EXTERNAL_JS = String.raw`(() => {
  for (const el of document.querySelectorAll("[data-external]")) {
    const b = el.getBoundingClientRect();
    if (b.width <= 0 || b.height <= 0) continue;
    if (typeof el.checkVisibility === "function" && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true, checkOpacity: true, checkVisibilityCSS: true })) continue;
    return el.getAttribute("data-external") || "other";
  }
  return null;
})()`;

const BACK_JS = "(() => { if (typeof window.__appBack === 'function') window.__appBack(); else history.back(); })()";

export class WebDevice implements Device {
  readonly kind = "web" as const;
  readonly page: Page;
  /** The app URL (resolved, without the one-time reset flag). */
  readonly url: string;
  readonly appPackage: string;
  /** Uncaught page errors, for debugging a fixture or a generated mock. */
  readonly pageErrors: string[] = [];
  private readonly browser: Browser;
  private readonly widthDp: number;
  private readonly heightDp: number;
  private readonly dpr: number;

  private constructor(browser: Browser, page: Page, url: string, appPackage: string, dims: { widthDp: number; heightDp: number; dpr: number }) {
    this.browser = browser;
    this.page = page;
    this.url = url;
    this.appPackage = appPackage;
    this.widthDp = dims.widthDp;
    this.heightDp = dims.heightDp;
    this.dpr = dims.dpr;
    page.on("pageerror", e => { if (this.pageErrors.length < 50) this.pageErrors.push(String(e?.message ?? e)); });
  }

  static async open(o: WebOpenOptions): Promise<WebDevice> {
    const dims = { widthDp: o.widthDp ?? DEFAULTS.widthDp, heightDp: o.heightDp ?? DEFAULTS.heightDp, dpr: o.dpr ?? DEFAULTS.dpr };
    const browser = await chromium.launch({ headless: o.headless ?? true });
    try {
      const context = await browser.newContext({
        viewport: { width: dims.widthDp, height: dims.heightDp },
        deviceScaleFactor: dims.dpr,
        isMobile: true,
        hasTouch: true,
      });
      const page = await context.newPage();
      const url = resolveUrl(o.url);
      const dev = new WebDevice(browser, page, url, o.appPackage, dims);
      await page.goto(o.resetState ? withParam(url, "reset", "1") : url);
      await dev.settle();
      return dev;
    } catch (e) {
      await browser.close().catch(() => undefined);
      throw e;
    }
  }

  async info(): Promise<DeviceInfo> {
    const d = this.dpr;
    return {
      widthPx: Math.round(this.widthDp * d), heightPx: Math.round(this.heightDp * d), density: d,
      statusBarPx: Math.round(STATUS_BAR_DP * d), navBarPx: Math.round(NAV_BAR_DP * d), kind: "web",
    };
  }

  /** "ext:<kind>" while a [data-external] surface is visible (billing, browser, signin, permission, other). */
  async foreground(): Promise<string> {
    const ext = (await this.page.evaluate(EXTERNAL_JS)) as string | null;
    return ext ? `ext:${ext}` : this.appPackage;
  }

  async elements(): Promise<RawElement[]> {
    return (await this.page.evaluate(`(${ELEMENTS_JS})(${JSON.stringify(this.dpr)})`)) as RawElement[];
  }

  /** Viewport PNG at device resolution (CSS px x dpr). */
  async screenshot(absPath: string): Promise<void> {
    ensureDir(path.dirname(absPath));
    await this.page.screenshot({ path: absPath, type: "png", fullPage: false });
    if (!fs.existsSync(absPath)) throw new Error(`screenshot was not written: ${absPath}`);
  }

  /** x, y in device px, like the Android driver. */
  async tap(x: number, y: number): Promise<void> {
    await this.page.mouse.click(x / this.dpr, y / this.dpr);
    await this.settle();
  }

  async typeText(text: string): Promise<void> {
    await this.page.keyboard.type(text);
    await this.settle();
  }

  async pressEnter(): Promise<void> {
    await this.page.keyboard.press("Enter");
    await this.settle();
  }

  /** A mouse wheel over (x, y) scrolls whatever container is under the finger. "up" = finger up = content moves up. */
  async swipe(dir: "up" | "down", x: number, y: number, distPx: number): Promise<void> {
    await this.page.mouse.move(x / this.dpr, y / this.dpr);
    const dy = Math.abs(distPx) / this.dpr;
    await this.page.mouse.wheel(0, dir === "up" ? dy : -dy);
    await sleep(300); // wheel scrolling is applied asynchronously
    await this.settle();
  }

  /** The page's own back handler (closes a sheet, pops a screen), like the Android BACK key. */
  async back(): Promise<void> {
    await this.page.evaluate(BACK_JS);
    await this.settle();
  }

  /** cold: reload the app (a "process restart": in-memory navigation resets, localStorage state persists). */
  async launch(opts: { cold?: boolean } = {}): Promise<void> {
    const current = this.page.url().split(/[?#]/)[0];
    const app = this.url.split(/[?#]/)[0];
    if (opts.cold || current !== app) await this.page.goto(this.url);
    await this.settle();
  }

  async close(): Promise<void> {
    await this.browser.close().catch(() => undefined);
  }

  /** Let the page react: network idle-ish, then a short pause for handlers and CSS state to apply. */
  private async settle(): Promise<void> {
    await this.page.waitForLoadState("networkidle", { timeout: 2000 }).catch(() => undefined);
    await sleep(SETTLE_MS);
  }
}
