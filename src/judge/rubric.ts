// What the judge checks: the LLM gates ([POL-9], [JUDGE-1]) and the criterion anchors ([JUDGE-2]).
// Shared by the judge prompt, the stub judge and the reports, so all three say the same thing.
import type { Criterion } from "../core/schema.ts";

export const LLM_GATES = [
  { id: "sfw", severity: "policy", question: "The surface is SFW, age-appropriate and away from sensitive topics (health, self-harm, politics, minors)." },
  { id: "no-incentivized-action", severity: "policy", question: "There is no reward for clicks, installs or ratings, and the reward is in-app and not cash-like (no cash, gift cards, crypto, vouchers)." },
  { id: "no-loss-framing", severity: "policy", question: "There is no hostage or loss framing and no dark pattern (forced or auto-playing ads, fake timers, confirmshaming, false hierarchy, nagging, 'support us')." },
  { id: "explicit-opt-in", severity: "fixable", question: "The user opts in with an explicit tap on a clearly labelled control before anything plays." },
  { id: "disclosed", severity: "fixable", question: "The exact reward and the required action (e.g. 'play a 15-second game') are stated before the ad." },
  { id: "free-decline", severity: "fixable", question: "Declining is free: an equally legible decline returns the user exactly where they were, with no penalty." },
  { id: "no-stream-interrupt", severity: "fixable", question: "It never interrupts a streaming AI response or a live generation; it appears only at a boundary." },
  { id: "not-for-subscribers", severity: "fixable", question: "It is not offered to subscribers or payers for something they already have." },
] as const;

export type LlmGateId = (typeof LLM_GATES)[number]["id"];
export const LLM_GATE_IDS = LLM_GATES.map(g => g.id) as unknown as [LlmGateId, ...LlmGateId[]];

export const ANCHORS: Record<Criterion, { five: string; one: string }> = {
  "value-moment-fit": { five: "The reward is exactly what the user wants at the trigger (cap hit, locked item tapped).", one: "Generic 'free coins' disconnected from any need." },
  "product-integrity": { five: "Feels native; preserves the flow and the user's input; takes nothing away from the free experience.", one: "Interrupts, degrades answers, breaks immersion, or removes free value." },
  "cannibalization-safety": { five: "Non-payer or decliner gating; partial or time-boxed; far below the cheapest pack; holdout planned.", one: "Gives away the paid core benefit, uncapped, to everyone." },
  "unit-economics": { five: "Code-computed cost to serve < 30% of net revenue per view; reward within a few views' worth at list price.", one: "Cost to serve above revenue per view, or a reward worth many views, with no stated rationale." },
  "reach": { five: "The trigger happens for a large share of DAU daily (core loop).", one: "A rare edge case." },
  "feasibility": { five: "Maps to SIM-RWD/INT/NAT with an existing entry point, SSV and remote config; small patch.", one: "Needs a new backend or an economy rewrite." },
  "specificity": { five: "Uses this app's own nouns and ids from the digest (currency, screens, modes, characters); not the obvious baseline.", one: "Could be pasted into any app." },
  "frequency-fatigue": { five: "Explicit per-surface caps and cooldowns, no re-offer after decline.", one: "Unbounded, or re-prompts on every open." },
  "measurability": { five: "Named primary metric, guardrails and a user-level holdout.", one: "No KPI." },
};
