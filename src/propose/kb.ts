// The rewarded-ads knowledge base as the proposer and the judge see it.
//
// There is no retrieval: at ~16k tokens the whole KB fits in the stable (cached) system block, and
// every chunk carries an id ([TAX-1], [AI-2], ...) that proposals must cite.
//   - Appendix T (facts about the specific test apps) is ALWAYS removed: product understanding has
//     to come from exploring the app, never from the KB.
//   - The judge variant also removes [JUDGE-6], the calibration set, so the judge is not scoring
//     against the very examples it is evaluated with (eval/judge-cal).
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../core/config.ts";

export type KbVariant = "proposer" | "judge";

export interface Kb {
  variant: KbVariant;
  text: string;
  /** Every chunk id defined in `text` (a heading or a bold bullet), in document order. */
  ids: string[];
}

export const KB_FILE = path.join(ROOT, "kb", "rewarded_ads_kb.md");

/**
 * Remove the section whose heading line starts with `headingPrefix` (e.g. "## Appendix T" or
 * "### [JUDGE-6]") up to the next heading of the same or a higher level.
 */
export function dropSection(md: string, headingPrefix: string): string {
  const lines = md.split("\n");
  const start = lines.findIndex(l => l.startsWith(headingPrefix));
  if (start < 0) return md;
  const level = /^(#+)/.exec(headingPrefix)?.[1].length ?? 2;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const h = /^(#+)\s/.exec(lines[i]);
    if (h && h[1].length <= level) { end = i; break; }
  }
  return [...lines.slice(0, start), ...lines.slice(end)].join("\n");
}

/** Chunk ids defined in the text: `### [POL-1] ...` headings and `- **[ANTI-1] ...` bullets. */
export function kbChunkIds(md: string): string[] {
  const ids: string[] = [];
  const re = /^(?:#{2,4}\s+|\s*-\s+\*\*|\*\*)\[([A-Z]+(?:-[A-Z0-9]+)+)\]/gm;
  for (let m = re.exec(md); m; m = re.exec(md)) if (!ids.includes(m[1])) ids.push(m[1]);
  return ids;
}

const cache = new Map<string, Kb>();

export function loadKb(variant: KbVariant = "proposer", file = KB_FILE): Kb {
  const key = `${variant}|${file}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let text = dropSection(fs.readFileSync(file, "utf8"), "## Appendix T");
  if (variant === "judge") text = dropSection(text, "### [JUDGE-6]");
  const kb: Kb = { variant, text: text.replace(/\n{3,}/g, "\n\n"), ids: kbChunkIds(text) };
  cache.set(key, kb);
  return kb;
}

/** The KB wrapped for the stable system block (identical bytes on every call, so it caches). */
export function kbSystemBlock(variant: KbVariant): string {
  const kb = loadKb(variant);
  return [
    "<knowledge_base>",
    "Rewarded-ads knowledge base. Cite chunks by their bracketed id, e.g. [TAX-1], [AI-2], [EX-DUO].",
    kb.text.trim(),
    "</knowledge_base>",
  ].join("\n");
}

/** KB ids cited in free text or an id list; unknown ids are returned separately. */
export function citedIds(xs: string[], variant: KbVariant = "proposer"): { known: string[]; unknown: string[] } {
  const all = new Set(loadKb(variant).ids);
  const found = [...new Set(xs.flatMap(x => [...x.matchAll(/\[?([A-Z]+(?:-[A-Z0-9]+)+)\]?/g)].map(m => m[1])))];
  return { known: found.filter(i => all.has(i)), unknown: found.filter(i => !all.has(i)) };
}
