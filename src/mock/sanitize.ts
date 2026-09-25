// Defence in depth for model-written HTML/CSS: whatever the prompt says, the mock never runs model
// code and never touches the network. Every removal is reported so the retry prompt (and the trace)
// can say what was wrong.
import { fenced } from "../core/llm.ts";

export interface Sanitized { html: string; removed: string[] }

/** Clean an HTML fragment and make sure it has exactly one [data-screen-root] wrapper. */
export function sanitizeFragment(raw: string, screenId: string): Sanitized {
  const removed: string[] = [];
  let html = /```/.test(raw) ? fenced(raw, "html") : raw.trim();
  const body = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  if (body) { html = body[1]; removed.push("document wrapper (<html>/<head>/<body>)"); }
  html = html.replace(/<!doctype[^>]*>/gi, "").replace(/<\/?(?:html|head|body)[^>]*>/gi, "").replace(/<meta[^>]*>/gi, "").replace(/<title>[\s\S]*?<\/title>/gi, "");
  const count = (re: RegExp, what: string) => {
    const hits = html.match(re);
    if (hits?.length) { removed.push(`${hits.length} ${what}`); html = html.replace(re, ""); }
  };
  count(/<script\b[\s\S]*?<\/script\s*>/gi, "<script> block(s)");
  count(/<script\b[^>]*\/?>/gi, "<script> tag(s)");
  count(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "inline event handler(s)");
  count(/<link\b[^>]*>/gi, "<link> tag(s)");
  count(/<(?:iframe|object|embed)\b[\s\S]*?(?:<\/(?:iframe|object|embed)>|\/?>)/gi, "embedded frame(s)");
  count(/@import[^;]*;/gi, "@import rule(s)");
  const js = html.match(/(?:href|src)\s*=\s*["']\s*javascript:[^"']*["']/gi);
  if (js?.length) { removed.push(`${js.length} javascript: URL(s)`); html = html.replace(/(href|src)\s*=\s*["']\s*javascript:[^"']*["']/gi, '$1="#"'); }
  // Remote resources: attributes pointing at the network are blanked, url(...) in CSS dropped.
  const remoteAttr = /\s(src|href|srcset|poster)\s*=\s*["']\s*(?:https?:)?\/\/[^"']*["']/gi;
  const ra = html.match(remoteAttr);
  if (ra?.length) { removed.push(`${ra.length} remote URL attribute(s)`); html = html.replace(remoteAttr, ""); }
  const ru = html.match(/url\(\s*["']?(?:https?:)?\/\/[^)]*\)/gi);
  if (ru?.length) { removed.push(`${ru.length} remote url() value(s)`); html = html.replace(/url\(\s*["']?(?:https?:)?\/\/[^)]*\)/gi, "none"); }
  html = html.trim();
  const roots = html.match(/data-screen-root\s*=/gi)?.length ?? 0;
  if (roots !== 1 || !/^\s*(?:<!--[\s\S]*?-->\s*)*<[a-z]+[^>]*data-screen-root/i.test(html)) {
    if (roots === 0) removed.push("missing [data-screen-root] wrapper (added)");
    html = `<div data-screen-root="${screenId}" style="position:relative;width:100%;height:100%;overflow:hidden">\n${html.replace(/\sdata-screen-root\s*=\s*("[^"]*"|'[^']*')/gi, "")}\n</div>`;
  }
  return { html, removed };
}

/** Clean model-written CSS: no network, no imports. */
export function sanitizeCss(raw: string): { css: string; removed: string[] } {
  const removed: string[] = [];
  let css = /```/.test(raw) ? fenced(raw, "css") : raw.trim();
  css = css.replace(/<\/?style[^>]*>/gi, "");
  const imp = css.match(/@import[^;]*;/gi);
  if (imp?.length) { removed.push(`${imp.length} @import rule(s)`); css = css.replace(/@import[^;]*;/gi, ""); }
  const ru = css.match(/url\(\s*["']?(?:https?:)?\/\/[^)]*\)/gi);
  if (ru?.length) { removed.push(`${ru.length} remote url() value(s)`); css = css.replace(/url\(\s*["']?(?:https?:)?\/\/[^)]*\)/gi, "none"); }
  return { css: css.trim(), removed };
}
