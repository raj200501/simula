// A deliberately tiny Markdown -> HTML renderer (no dependencies) for the artifacts this pipeline
// writes itself: candidates.md, judgments.md, judge-eval.md, trajectory.md. It covers what those
// files use: headings, paragraphs, bullet/numbered lists (one nesting level), GFM tables, fenced
// code, blockquotes, rules, and inline code/bold/italic/links. Input is escaped first, so any
// HTML inside the Markdown is shown as text, never executed.
import { escapeHtml } from "../core/io.ts";

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  const isTableSep = (l: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
  const isBlockStart = (l: string) =>
    /^\s*(#{1,6}\s|```|>|[-*+]\s|\d+[.)]\s|(-{3,}|\*{3,}|_{3,})\s*$)/.test(l) || (l.includes("|") && isTableSep(lines[i + 1] ?? ""));

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const fence = /^\s*```(\w*)/.exec(line);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) body.push(lines[i++]);
      i++; // closing fence
      out.push(`<pre><code${fence[1] ? ` class="lang-${escapeHtml(fence[1])}"` : ""}>${escapeHtml(body.join("\n"))}</code></pre>`);
      continue;
    }

    const hd = /^\s*(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (hd) {
      const n = hd[1].length;
      out.push(`<h${n} id="${anchor(hd[2])}">${inline(hd[2])}</h${n}>`);
      i++;
      continue;
    }

    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { out.push("<hr>"); i++; continue; }

    if (line.includes("|") && isTableSep(lines[i + 1] ?? "")) {
      const head = cells(line);
      const align = cells(lines[i + 1]).map(c => (/^:-+:$/.test(c) ? "center" : /-+:$/.test(c) ? "right" : ""));
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) rows.push(cells(lines[i++]));
      const td = (tag: string, c: string, k: number) => `<${tag}${align[k] ? ` style="text-align:${align[k]}"` : ""}>${inline(c)}</${tag}>`;
      out.push(`<table><thead><tr>${head.map((c, k) => td("th", c, k)).join("")}</tr></thead><tbody>${rows
        .map(r => `<tr>${head.map((_, k) => td("td", r[k] ?? "", k)).join("")}</tr>`).join("")}</tbody></table>`);
      continue;
    }

    if (/^\s*>/.test(line)) {
      const body: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) body.push(lines[i++].replace(/^\s*>\s?/, ""));
      out.push(`<blockquote>${renderMarkdown(body.join("\n"))}</blockquote>`);
      continue;
    }

    if (/^\s*([-*+]|\d+[.)])\s/.test(line)) {
      out.push(list());
      continue;
    }

    // Paragraph: consecutive plain lines.
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && (para.length === 0 || !isBlockStart(lines[i]))) para.push(lines[i++].trim());
    out.push(`<p>${inline(para.join(" "))}</p>`);
  }
  return out.join("\n");

  // A list with at most one nested level: items indented deeper than the first marker nest.
  function list(): string {
    const baseIndent = indentOf(lines[i]);
    const ordered = /^\s*\d+[.)]\s/.test(lines[i]);
    const sameKind = (l: string) => (ordered ? /^\s*\d+[.)]\s/ : /^\s*[-*+]\s/).test(l);
    const items: string[] = [];
    while (i < lines.length) {
      const l = lines[i];
      if (!l.trim()) {
        // a blank line ends the list unless the next line continues it (same kind, or nested deeper)
        const nx = lines[i + 1] ?? "";
        if (/^\s*([-*+]|\d+[.)])\s/.test(nx) && (indentOf(nx) > baseIndent || (indentOf(nx) === baseIndent && sameKind(nx)))) { i++; continue; }
        break;
      }
      const ind = indentOf(l);
      const m = /^\s*([-*+]|\d+[.)])\s+(.*)$/.exec(l);
      if (m && ind === baseIndent && !sameKind(l)) break; // a different list type starts a new list
      if (m && ind === baseIndent) { items.push(inline(m[2])); i++; continue; }
      if (m && ind > baseIndent) { items[items.length - 1] += list(); continue; }
      if (!m && ind > baseIndent && items.length) { items[items.length - 1] += " " + inline(l.trim()); i++; continue; }
      break;
    }
    const tag = ordered ? "ol" : "ul";
    return `<${tag}>${items.map(x => `<li>${x}</li>`).join("")}</${tag}>`;
  }
}

function indentOf(l: string): number {
  return /^\s*/.exec(l)![0].replace(/\t/g, "  ").length;
}

function cells(row: string): string[] {
  let r = row.trim();
  if (r.startsWith("|")) r = r.slice(1);
  if (r.endsWith("|") && !r.endsWith("\\|")) r = r.slice(0, -1);
  // split on unescaped pipes
  return r.split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, "|"));
}

function anchor(s: string): string {
  return s.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Inline spans. Code spans are cut out first so their content is not formatted. */
export function inline(s: string): string {
  const codes: string[] = [];
  let t = s.replace(/`([^`]+)`/g, (_, c: string) => `\u0000${codes.push(c) - 1}\u0000`);
  t = escapeHtml(t);
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, url: string) =>
    /^(https?:|mailto:|#|\.{0,2}\/|[\w-]+\.(html|md|pdf|png)(\?|#|$))/i.test(url) && !/^javascript:/i.test(url)
      ? `<a href="${url}">${label}</a>` : `${label} (${url})`);
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/__([^_]+)__/g, "<strong>$1</strong>");
  t = t.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\*)/g, "$1<em>$2</em>").replace(/(^|[^_\w])_([^_\s][^_]*?)_(?!\w)/g, "$1<em>$2</em>");
  return t.replace(/\u0000(\d+)\u0000/g, (_, k: string) => `<code>${escapeHtml(codes[Number(k)])}</code>`);
}
