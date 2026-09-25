// Validates a screen fragment in a real DOM (Playwright): the contract the runtime and QA rely on.
//   - no scripts, inline handlers or javascript: URLs; no network URLs (fonts are local/system)
//   - at least 90% of the spec's elements carry their data-node id
//   - every bound counter carries data-bind="<resource>"
//   - chat screens have the message list, composer, send and both bubble templates
import type { Page } from "playwright";
import type { ProductModel, Screen } from "../core/schema.ts";
import { chatParts, counterBindings, deviceDp, drawable } from "./roles.ts";

export interface Validation { ok: boolean; violations: string[]; coverage: number; missing: string[] }

// In-page code stays a plain string: tsx would wrap named inner functions in a __name() helper
// that does not exist in the browser.
const CHECK_JS = String.raw`(a) => {
  let host = document.getElementById("mock-validate-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "mock-validate-host";
    host.style.cssText = "position:relative;overflow:hidden;width:" + a.w + "px;height:" + a.h + "px";
    document.body.appendChild(host);
  }
  host.innerHTML = a.html;
  const out = { scripts: 0, handlers: 0, jsUrls: 0, remote: 0, present: [], dup: [], unbound: [], chat: [], roots: 0 };
  out.scripts = host.querySelectorAll("script").length;
  out.roots = host.querySelectorAll("[data-screen-root]").length;
  const all = [host, ...host.querySelectorAll("*")];
  for (const el of all) {
    for (const at of Array.from(el.attributes)) {
      if (/^on/i.test(at.name)) out.handlers++;
      if (/^(href|src|action|formaction)$/i.test(at.name) && /^\s*javascript:/i.test(at.value)) out.jsUrls++;
      if (/^(href|src|srcset|poster|style)$/i.test(at.name) && /(^|[\s("'])(https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(at.value)) out.remote++;
    }
    if (el.tagName === "STYLE" && /(@import|url\(\s*["']?(https?:)?\/\/)/i.test(el.textContent || "")) out.remote++;
  }
  const seen = new Map();
  for (const el of host.querySelectorAll("[data-node]")) {
    const id = el.getAttribute("data-node");
    seen.set(id, (seen.get(id) || 0) + 1);
  }
  out.present = [...seen.keys()];
  out.dup = [...seen].filter(([, n]) => n > 1).map(([id]) => id);
  for (const b of a.binds) {
    const n = host.querySelector('[data-node="' + b.el + '"]');
    const sel = '[data-bind="' + b.resource + '"]';
    if (!n || !(n.matches(sel) || n.querySelector(sel))) out.unbound.push(b.el + " -> " + b.resource);
  }
  if (a.chat) {
    for (const r of ["messages", "composer", "send"]) if (!host.querySelector('[data-role="' + r + '"]')) out.chat.push('missing data-role="' + r + '"');
    for (const t of ["user", "bot"]) if (!host.querySelector('[data-template="' + t + '"]')) out.chat.push('missing data-template="' + t + '"');
  }
  host.innerHTML = "";
  return out;
}`;

interface CheckResult { scripts: number; handlers: number; jsUrls: number; remote: number; present: string[]; dup: string[]; unbound: string[]; chat: string[]; roots: number }

export async function validateFragment(page: Page, html: string, s: Screen, m: ProductModel): Promise<Validation> {
  const dev = deviceDp(m);
  const arg = { html, w: dev.w, h: dev.h, binds: counterBindings(s, m), chat: !!chatParts(s, m) };
  const r = (await page.evaluate(`(${CHECK_JS})(${JSON.stringify(arg)})`)) as CheckResult;
  const expected = drawable(s, dev).map(e => e.id);
  const present = new Set(r.present);
  const missing = expected.filter(id => !present.has(id));
  const coverage = expected.length ? (expected.length - missing.length) / expected.length : 1;
  const v: string[] = [];
  if (r.scripts) v.push(`${r.scripts} <script> element(s)`);
  if (r.handlers) v.push(`${r.handlers} inline on* handler attribute(s)`);
  if (r.jsUrls) v.push(`${r.jsUrls} javascript: URL(s)`);
  if (r.remote) v.push(`${r.remote} external URL reference(s) (only local assets and system fonts are allowed)`);
  if (r.roots !== 1) v.push(`expected exactly one [data-screen-root], found ${r.roots}`);
  if (coverage < 0.9) v.push(`data-node coverage ${(coverage * 100).toFixed(0)}% < 90%; missing ids: ${missing.slice(0, 30).join(", ")}${missing.length > 30 ? ", ..." : ""}`);
  if (r.unbound.length) v.push(`counters without data-bind: ${r.unbound.join(", ")}`);
  v.push(...r.chat.map(x => `chat screen ${x}`));
  if (r.dup.length) v.push(`data-node ids used more than once: ${r.dup.slice(0, 10).join(", ")}`);
  return { ok: v.length === 0, violations: v, coverage, missing };
}
