// validateSet: code checks on the breadth call's candidate set (FINAL_PLAN §8). Violations go back
// to the model once, verbatim; they exist to stop the most common failure of proposal systems:
// ten variations of "watch an ad for coins" on one screen.
import type { MomentType, ProductModel, Regime } from "../core/schema.ts";
import type { z } from "zod";
import type { LlmIdea } from "./schemas.ts";

type MType = z.infer<typeof MomentType>;
export const REACTIVE: MType[] = ["wall", "desire", "decline"];
export const PROACTIVE: MType[] = ["hub", "post-reward"];

export interface SetInput {
  ideas: LlmIdea[];
  selected?: { index: number; why: string }[];
}

export function validateSet(set: SetInput, m: Pick<ProductModel, "moments" | "regime">): string[] {
  const v: string[] = [];
  const { ideas } = set;
  const moments = new Map(m.moments.map(x => [x.id, x]));
  const regime: Regime = m.regime;
  const count = (c: string) => ideas.filter(i => i.case === c).length;

  if (regime === "no-scarcity") {
    if (count("product-change") < 5) v.push(`Regime is no-scarcity: need at least 5 product-change ideas, got ${count("product-change")}.`);
  } else {
    if (count("existing") < 3) v.push(`Need at least 3 "existing" ideas, got ${count("existing")}.`);
    if (count("product-change") < 3) v.push(`Need at least 3 "product-change" ideas, got ${count("product-change")}.`);
  }

  const archetypes = new Set(ideas.map(i => i.archetype.replace(/[[\]]/g, "").trim().toUpperCase()));
  if (archetypes.size < 4) v.push(`Need at least 4 distinct archetypes, got ${archetypes.size} (${[...archetypes].join(", ")}).`);

  for (const [i, idea] of ideas.entries()) {
    const mo = moments.get(idea.moment);
    if (!mo) v.push(`Idea ${i} ("${idea.title}") names moment "${idea.moment}", which is not a moment id in the digest.`);
    else if (mo.noOffer) v.push(`Idea ${i} ("${idea.title}") is on ${mo.id}, a ${mo.type} moment where offers are forbidden.`);
  }

  // Only demand a surface type the model actually has.
  const typeOf = (i: LlmIdea) => moments.get(i.moment)?.type;
  const has = (ts: MType[]) => m.moments.some(x => !x.noOffer && ts.includes(x.type));
  if (has(REACTIVE) && !ideas.some(i => REACTIVE.includes(typeOf(i) as MType))) v.push("Need at least 1 reactive idea (a wall, desire or decline moment).");
  if (has(PROACTIVE) && !ideas.some(i => PROACTIVE.includes(typeOf(i) as MType))) v.push("Need at least 1 proactive idea (a hub or post-reward moment).");

  const beyond = ideas.filter(i => i.beyondBaseline).length;
  if (beyond * 2 < ideas.length) v.push(`At least half the ideas must go beyond the baseline: ${beyond} of ${ideas.length} do.`);

  const seen = new Map<string, number>();
  for (const [i, idea] of ideas.entries()) {
    const key = `${idea.moment}|${idea.reward.toLowerCase().replace(/\s+/g, " ").trim()}`;
    if (seen.has(key)) v.push(`Ideas ${seen.get(key)} and ${i} repeat the same (moment, reward): ${idea.moment} / "${idea.reward}".`);
    else seen.set(key, i);
  }

  if (set.selected) {
    const idx = set.selected.map(s => s.index);
    const bad = idx.filter(k => !Number.isInteger(k) || k < 0 || k >= ideas.length);
    if (bad.length) v.push(`Selected indices out of range: ${bad.join(", ")} (valid 0..${ideas.length - 1}).`);
    if (new Set(idx).size !== idx.length) v.push("Selected indices repeat.");
    const noOffer = set.selected.filter(s => moments.get(ideas[s.index]?.moment ?? "")?.noOffer);
    if (noOffer.length) v.push(`Selected ideas on no-offer moments: ${noOffer.map(s => s.index).join(", ")}.`);
  }
  return v;
}
