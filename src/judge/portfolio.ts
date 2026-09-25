// Portfolio check (after every proposal is judged). Two SHIPs that are the same idea in different
// words split one moment's inventory and pad the deck, so they are detected in code:
//   near-duplicate  same surface AND same reward resource / entitlement AND same archetype family,
//                   or offer copy (title + body) with word Jaccard >= PORTFOLIO.jaccard.
// The higher-scoring SHIP is kept; the other fails the fixable code gate "portfolio-distinct" and gets
// the ordinary revision loop, and it is rejected if it is still a duplicate after one revision.
// PURE: no I/O, no clock.
import type { GateResult, Proposal } from "../core/schema.ts";

export const PORTFOLIO = { jaccard: 0.7, gate: "portfolio-distinct" } as const;

/**
 * KB archetypes that describe the same exchange (kb/rewarded_ads_kb.md): the generic taxonomy
 * (TAX-*) and its AI-app instances (AI-*). An id outside the table is its own family.
 */
const FAMILIES: Record<string, string[]> = {
  "consumable refill": ["TAX-1", "AI-1", "AI-2", "AI-5", "AI-6"],
  "time-boxed unlock": ["TAX-2", "AI-4", "AI-17"],
  "content unlock": ["TAX-3", "AI-11"],
  "acceleration": ["TAX-4", "AI-9"],
  "multiplier": ["TAX-5", "AI-14"],
  "second chance": ["TAX-6", "AI-10", "AI-16"],
  "capacity": ["TAX-7", "AI-7", "AI-8"],
  "streak protection": ["TAX-8", "AI-13"],
  "daily tasks": ["TAX-9", "AI-3", "AI-12"],
  "decline fallback": ["TAX-10", "AI-15"],
  "sponsorship": ["TAX-11"],
  "offerwall": ["TAX-12"],
  "cosmetic or share": ["TAX-13", "AI-18"],
};
const FAMILY_OF = new Map(Object.entries(FAMILIES).flatMap(([f, ids]) => ids.map(id => [id, f] as const)));

/** The family of an archetype ("TAX-1", "[AI-2] Refills hub", "ai-2"), else the archetype itself. */
export function archetypeFamily(archetype: string): string {
  const id = /\b(TAX|AI)-(\d+|X)\b/i.exec(archetype);
  if (!id) return archetype.trim().toLowerCase();
  const key = `${id[1].toUpperCase()}-${id[2].toUpperCase()}`;
  return FAMILY_OF.get(key) ?? key;
}

/**
 * Where the user meets the offer: the surface screen, or for a new sheet / modal the screen it
 * opens over. A new full page is unique to its proposal (new ids are per proposal, so "N1" in two
 * proposals are two different things); two such pages are still caught by their copy.
 */
export function surfaceKey(p: Proposal): string {
  const ns = p.patch.newScreens.find(s => s.id === p.surface);
  if (!ns) return p.surface;
  return ns.kind !== "screen" && ns.basedOn ? ns.basedOn : `${p.id}:${p.surface}`;
}

const STOP = new Set(["a", "an", "the", "to", "and", "or", "of", "for", "in", "on", "at", "with", "your", "you", "it", "is", "be", "get", "s"]);
const words = (s: string) => s.toLowerCase().replace(/[’']/g, "").split(/[^\p{L}\p{N}]+/u).filter(w => w && !STOP.has(w));

/** What is rewarded: the resource or entitlement id, else the reward's nouns (numbers dropped, singular). */
export function rewardKey(p: Proposal): string {
  if (p.reward.resource) return `res:${p.reward.resource}`;
  return `what:${words(p.reward.what).filter(w => !/^\d+$/.test(w)).map(w => w.replace(/s$/, "")).join(" ")}`;
}

/** Word-set Jaccard similarity of two proposals' offer copy (title + body). */
export function offerJaccard(a: Proposal, b: Proposal): number {
  const A = new Set(words(`${a.offer.title} ${a.offer.body}`)), B = new Set(words(`${b.offer.title} ${b.offer.body}`));
  if (!A.size && !B.size) return 1;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return Math.round((inter / (A.size + B.size - inter)) * 100) / 100;
}

/** Why `p` duplicates `q`, or null when they are distinct. */
export function nearDuplicate(p: Proposal, q: Proposal): string | null {
  const same = surfaceKey(p) === surfaceKey(q) && rewardKey(p) === rewardKey(q) && archetypeFamily(p.archetype) === archetypeFamily(q.archetype);
  const jac = offerJaccard(p, q);
  if (!same && jac < PORTFOLIO.jaccard) return null;
  const why: string[] = [];
  if (same) why.push(`same surface (${surfaceKey(p)}), same reward (${p.reward.resource ?? p.reward.what}) and same archetype family (${archetypeFamily(p.archetype)})`);
  if (jac >= PORTFOLIO.jaccard) why.push(`offer copy overlap ${jac} (Jaccard >= ${PORTFOLIO.jaccard})`);
  return why.join("; ");
}

/** The required change for a duplicate (also its top concern). */
export const duplicateChange = (keeperId: string) => `near-duplicate of ${keeperId}: differentiate the moment or the reward`;

/** The keeper and the reason back from a failed gate's evidence (for one-line summaries). */
export function parseDuplicate(evidence: string): { keeper: string; why: string } | null {
  const m = /^near-duplicate of (\S+): differentiate the moment or the reward: (.+)$/.exec(evidence);
  return m ? { keeper: m[1], why: m[2] } : null;
}

/** The "portfolio-distinct" gate of `p` against the SHIPs kept so far (first duplicate wins). */
export function portfolioGate(p: Proposal, kept: Proposal[]): { gate: GateResult; keeper: string | null } {
  for (const k of kept) {
    if (k.id === p.id) continue;
    const why = nearDuplicate(p, k);
    if (why) return { gate: { gate: PORTFOLIO.gate, pass: false, by: "code", severity: "fixable", evidence: `${duplicateChange(k.id)}: ${why}` }, keeper: k.id };
  }
  const others = kept.filter(k => k.id !== p.id).map(k => k.id);
  return {
    gate: { gate: PORTFOLIO.gate, pass: true, by: "code", severity: "fixable", evidence: others.length ? `distinct from ${others.join(", ")} (surface, reward, archetype family; offer copy overlap < ${PORTFOLIO.jaccard})` : "the first SHIP of the portfolio" },
    keeper: null,
  };
}

/**
 * The order SHIPs claim their place in the portfolio: highest weighted score first, then proposal
 * id (P2 before P10), so the kept one of a duplicate pair is always the better-scored one.
 */
export function portfolioOrder<T extends { id: string; weighted: number | null }>(ships: T[]): T[] {
  return [...ships].sort((a, b) => (b.weighted ?? -1) - (a.weighted ?? -1) || a.id.localeCompare(b.id, "en", { numeric: true }));
}
