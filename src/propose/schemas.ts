// Structured-output schemas for the proposer's model calls, and the code that turns their output
// into schema-valid `Proposal`s. Rules for these schemas (both providers): no z.record, no
// recursion, no regex, no numeric/length constraints; optional fields are nullable. Anything the
// schema cannot express (5 storyboard phases in order, integer caps) is enforced in code here.
import { z } from "zod";
import { Phase, ProposalCase, type Evidence, type ProductModel, type Proposal } from "../core/schema.ts";

export const LlmIdea = z.object({
  title: z.string(),
  case: ProposalCase,
  archetype: z.string(),
  moment: z.string(),
  reward: z.string(),
  beyondBaseline: z.boolean(),
});
export type LlmIdea = z.infer<typeof LlmIdea>;

/** Call 1 (breadth): baseline, moment sweep, one-line ideas, and the pick for depth. */
export const Breadth = z.object({
  baseline: z.array(z.string()),
  momentSweep: z.array(z.object({ moment: z.string(), exchange: z.string(), viable: z.boolean() })),
  ideas: z.array(LlmIdea),
  selected: z.array(z.object({ index: z.number(), why: z.string() })),
});
export type Breadth = z.infer<typeof Breadth>;

const LlmEvidence = z.object({ obs: z.string(), el: z.string().nullable(), quote: z.string() });

/** Call 2 (depth) and revise(): one full proposal, without id/version/economics (code owns those). */
export const LlmProposal = z.object({
  title: z.string(),
  oneLiner: z.string(),
  case: ProposalCase,
  archetype: z.string(),
  beyondBaseline: z.boolean(),
  anchor: z.object({
    moments: z.array(z.string()),
    economy: z.array(z.string()),
    newMechanic: z.object({ name: z.string(), description: z.string(), whyNeeded: z.string(), removesFreeValue: z.boolean() }).nullable(),
  }),
  surface: z.string(),
  trigger: z.string(),
  eligibility: z.string(),
  offer: z.object({ title: z.string(), body: z.string(), cta: z.string(), decline: z.string() }),
  simula: z.object({
    unit: z.enum(["SIM-RWD", "SIM-INT", "SIM-NAT"]),
    entry: z.enum(["button", "invitation", "interstitial"]),
    gamePartner: z.string().nullable(),
    minPlaySec: z.number(),
  }),
  reward: z.object({
    what: z.string(),
    resource: z.string().nullable(),
    amount: z.number().nullable(),
    duration: z.string().nullable(),
    grantOn: z.enum(["REWARD_VERIFIED"]),
  }),
  caps: z.object({ perDay: z.number(), cooldownMin: z.number() }),
  cannibalizationGuard: z.string(),
  assumptions: z.object({
    engagedShare: z.number(),
    viewsPerEngager: z.number(),
    cogs: z.enum(["none", "text-cheap", "text-premium", "image", "voice"]),
    cogsUnitsPerView: z.number(),
  }),
  kpis: z.object({ primary: z.string(), guardrails: z.array(z.string()), holdout: z.string() }),
  precedents: z.array(z.string()),
  risks: z.array(z.string()),
  evidence: z.array(LlmEvidence),
  patch: z.object({
    newScreens: z.array(z.object({ id: z.string(), basedOn: z.string().nullable(), kind: z.enum(["modal", "sheet", "screen"]), change: z.string() })),
    newElements: z.array(z.object({ id: z.string(), in: z.string(), near: z.string().nullable(), place: z.enum(["before", "after", "overlay"]), change: z.string() })),
    newEdges: z.array(z.object({
      from: z.string(), el: z.string(), to: z.string(),
      effects: z.array(z.object({ resource: z.string(), delta: z.number() })),
      guard: z.object({ resource: z.string(), lt: z.number() }).nullable(),
    })),
  }),
  storyboard: z.array(z.object({
    phase: Phase,
    screen: z.string(),
    counters: z.array(z.object({ resource: z.string(), value: z.number() })),
    overlay: z.enum(["none", "invite", "game", "verified"]),
    callouts: z.array(z.object({ node: z.string(), text: z.string() })),
    caption: z.string(),
  })),
});
export type LlmProposal = z.infer<typeof LlmProposal>;

const nn = <T>(v: T | null | undefined): T | undefined => (v === null || v === undefined ? undefined : v);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** LLM output -> Proposal. Ids and versions are assigned by code; numbers are clamped to sane ranges. */
export function fromLlmProposal(x: LlmProposal, id: string, version: number): Proposal {
  return {
    id, version,
    title: x.title, oneLiner: x.oneLiner, case: x.case, archetype: x.archetype, beyondBaseline: x.beyondBaseline,
    anchor: { moments: x.anchor.moments, economy: x.anchor.economy, newMechanic: nn(x.anchor.newMechanic) },
    surface: x.surface, trigger: x.trigger, eligibility: x.eligibility,
    offer: x.offer,
    simula: { unit: x.simula.unit, entry: x.simula.entry, gamePartner: nn(x.simula.gamePartner) || undefined, minPlaySec: Math.round(x.simula.minPlaySec) },
    reward: { what: x.reward.what, resource: nn(x.reward.resource) || undefined, amount: nn(x.reward.amount), duration: nn(x.reward.duration) || undefined, grantOn: "REWARD_VERIFIED" },
    caps: { perDay: Math.round(x.caps.perDay), cooldownMin: Math.max(0, Math.round(x.caps.cooldownMin)) },
    cannibalizationGuard: x.cannibalizationGuard,
    assumptions: {
      engagedShare: clamp(x.assumptions.engagedShare, 0, 1),
      viewsPerEngager: Math.max(0, x.assumptions.viewsPerEngager),
      cogs: x.assumptions.cogs,
      cogsUnitsPerView: Math.max(0, x.assumptions.cogsUnitsPerView),
    },
    kpis: x.kpis,
    precedents: x.precedents.map(p => p.replace(/^\[|\]$/g, "")),
    risks: x.risks,
    evidence: x.evidence.map(e => ({ obs: e.obs, el: nn(e.el) || undefined, quote: e.quote || undefined, verified: false })),
    patch: {
      newScreens: x.patch.newScreens.map(s => ({ id: s.id, basedOn: nn(s.basedOn) || undefined, kind: s.kind, change: s.change })),
      newElements: x.patch.newElements.map(e => ({ id: e.id, in: e.in, near: nn(e.near) || undefined, place: e.place, change: e.change })),
      newEdges: x.patch.newEdges.map(e => ({ from: e.from, el: e.el, to: e.to, effects: e.effects, guard: nn(e.guard) })),
    },
    storyboard: x.storyboard.map(s => ({ ...s })),
  };
}

/** Proposal -> the LLM shape (what revise() shows the model as "the current version"). */
export function toLlmProposal(p: Proposal): LlmProposal {
  return {
    title: p.title, oneLiner: p.oneLiner, case: p.case, archetype: p.archetype, beyondBaseline: p.beyondBaseline,
    anchor: { moments: p.anchor.moments, economy: p.anchor.economy, newMechanic: p.anchor.newMechanic ?? null },
    surface: p.surface, trigger: p.trigger, eligibility: p.eligibility, offer: p.offer,
    simula: { ...p.simula, gamePartner: p.simula.gamePartner ?? null },
    reward: { what: p.reward.what, resource: p.reward.resource ?? null, amount: p.reward.amount ?? null, duration: p.reward.duration ?? null, grantOn: "REWARD_VERIFIED" },
    caps: p.caps, cannibalizationGuard: p.cannibalizationGuard, assumptions: p.assumptions, kpis: p.kpis,
    precedents: p.precedents, risks: p.risks,
    evidence: p.evidence.map(e => ({ obs: e.obs, el: e.el ?? null, quote: e.quote ?? "" })),
    patch: {
      newScreens: p.patch.newScreens.map(s => ({ ...s, basedOn: s.basedOn ?? null })),
      newElements: p.patch.newElements.map(e => ({ ...e, near: e.near ?? null })),
      newEdges: p.patch.newEdges.map(e => ({ ...e, guard: e.guard ?? null })),
    },
    storyboard: p.storyboard,
  };
}

export const PHASES = Phase.options; // today, change, offer, ad, value

/**
 * The slide flow needs exactly the 5 phases in order. A model sometimes merges or repeats one;
 * repairing that is a shape fix (not a judgment), so it is done here and traced by the caller.
 * Returns the repaired storyboard and whether anything changed.
 */
export function normalizeStoryboard(p: Proposal): { storyboard: Proposal["storyboard"]; repaired: boolean } {
  const byPhase = new Map<string, Proposal["storyboard"][number]>();
  for (const s of p.storyboard) if (!byPhase.has(s.phase)) byPhase.set(s.phase, s);
  const defaults: Record<string, { overlay: "none" | "invite" | "game" | "verified"; caption: string }> = {
    today: { overlay: "none", caption: "Where the user is today." },
    change: { overlay: "none", caption: "What changes in the product." },
    offer: { overlay: "invite", caption: `Offer: "${p.offer.title}" with "${p.offer.cta}" / "${p.offer.decline}".` },
    ad: { overlay: "game", caption: `The ${p.simula.minPlaySec}-second rewarded game plays; the reward is granted on REWARD_VERIFIED.` },
    value: { overlay: "verified", caption: `The user receives ${p.reward.what} and is back where they were.` },
  };
  let prev: Proposal["storyboard"][number] | undefined;
  const out = PHASES.map(phase => {
    const s = byPhase.get(phase) ?? { phase, screen: prev?.screen ?? p.surface, counters: [], overlay: defaults[phase].overlay, callouts: [], caption: defaults[phase].caption };
    prev = s;
    return s;
  });
  const repaired = out.length !== p.storyboard.length || out.some((s, i) => p.storyboard[i]?.phase !== s.phase);
  return { storyboard: out, repaired };
}

/** Evidence quotes are checked against the model's on-screen texts; only code sets `verified`. */
export function verifyEvidence(evidence: Evidence[], m: ProductModel): Evidence[] {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const textsOf = (obs: string) => {
    const scr = m.screens.filter(s => s.id === obs || s.observations.includes(obs) || s.variants.some(v => v.obs === obs));
    return (scr.length ? scr : m.screens).flatMap(s => s.elements.map(e => norm(`${e.text ?? ""} ${e.label ?? ""}`)));
  };
  return evidence.map(e => {
    const q = e.quote ? norm(e.quote) : "";
    return { ...e, verified: !!q && textsOf(e.obs).some(t => t.includes(q)) };
  });
}
