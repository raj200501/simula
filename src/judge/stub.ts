// The no-LLM judge (`--llm stub`). A deterministic, genuinely discriminating heuristic with the same
// output shape as the LLM judge, so the loop, the verdict code and the reports run unchanged:
//   value-moment-fit       wall/decline moments with the reward on the blocked resource score highest
//   product-integrity      interruptive entries, mid-stream language, removed free value lose points
//   cannibalization-safety code economics flags, payer gating, guard text
//   unit-economics         code-computed reward/view ratio and COGS share of net revenue per view
//   reach                  the anchored moment's reach
//   feasibility            Simula unit, entry, patch size, new mechanics
//   specificity            share of the app's nouns and ids present (offer copy weighs most)
//   frequency-fatigue      caps and cooldowns; "every open" re-prompts
//   measurability          KPI completeness
// Rounds judged by it are marked judgedBy "stub".
import type { Criterion, GateResult, ProductModel, Proposal } from "../core/schema.ts";
import { ECON } from "../model/economics.ts";
import { isConsumable } from "../propose/anchors.ts";
import { grounding, rewardCoherence } from "./gates.ts";
import { LLM_GATES, type LlmGateId } from "./rubric.ts";
import { WEIGHTS } from "./verdict.ts";

export interface JudgeOut {
  gates: { gate: LlmGateId; pass: boolean; evidence: string }[];
  scores: { criterion: Criterion; evidence: string; score: number }[];
  requiredChanges: string[];
  topConcern: string;
}

const clamp = (n: number) => Math.max(1, Math.min(5, Math.round(n)));
const NEG = /\b(no|not|never|without|nothing|don'?t|won'?t|doesn'?t|isn'?t|can'?t|cannot|non|excluding|except)\b[^.;:\n]*$/i;

/** First match of `re` in `text` that is not negated by a preceding "never", "no", "non-" etc. in the same clause. */
export function unnegated(text: string, re: RegExp): string | null {
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  for (let m = g.exec(text); m; m = g.exec(text)) {
    const before = text.slice(Math.max(0, m.index - 60), m.index);
    if (!NEG.test(before) && !/non-?$/i.test(before)) return m[0];
    if (m[0].length === 0) g.lastIndex++;
  }
  return null;
}

const escapeRe = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const nameRe = (r: { name: string; unit: string }) => new RegExp(`\\b(${escapeRe(r.name)}|${escapeRe(r.unit)})\\b`, "i");
const offerText = (p: Proposal) => `${p.offer.title}. ${p.offer.body} [${p.offer.cta}] [${p.offer.decline}]`;
const userText = (p: Proposal) => [p.title, p.oneLiner, p.trigger, offerText(p), p.reward.what, ...p.storyboard.map(b => b.caption), ...p.patch.newElements.map(e => e.change)].join(" \n");

/** Distinctive nouns of this app: resource names/units, screen names, labels and modes (digits stripped). */
export function appNouns(m: ProductModel): string[] {
  const STOP = new Set(["ok", "cancel", "close", "back", "next", "yes", "no", "done", "send", "message", "home", "settings", "profile", "search", "more", "menu", "the", "and", "for", "now", "not",
    "there", "their", "about", "which", "would", "these", "those", "other", "after", "before", "today", "first", "every", "while", "where", "still", "again", "right", "great", "hello", "thanks"]);
  const raw = [
    // Entitlement names ("Membership", "tier") are not credited: used as a currency they are a red flag.
    ...m.economy.resources.filter(r => isConsumable(r)).flatMap(r => [r.name, r.unit]),
    ...m.economy.sinks.flatMap(k => [k.context ?? ""]),
    ...m.economy.offers.map(o => o.label),
    ...m.economy.entitlements.flatMap(x => [x.plan, ...x.benefits]),
    ...m.economy.walls.map(w => w.blockedIntent),
    ...m.screens.filter(s => s.inScope).flatMap(s => [s.name, ...s.elements.filter(e => !e.ad).map(e => e.text || e.label || "")]),
  ];
  const out = new Set<string>();
  for (const r of raw) {
    const t = r.toLowerCase().replace(/[\d$€£.,:·+%()"'!?]/g, " ").replace(/\s+/g, " ").trim();
    if (t.length >= 4 && t.length <= 30 && !STOP.has(t)) out.add(t);
    for (const w of t.split(" ")) if (w.length >= 5 && !STOP.has(w)) out.add(w);
  }
  return [...out];
}

function nounHits(text: string, nouns: string[]): string[] {
  const t = text.toLowerCase();
  return nouns.filter(n => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(t));
}

// ------------------------------------------------------------------------------------------------
// LLM-gate heuristics
// ------------------------------------------------------------------------------------------------
function gates(p: Proposal, m: ProductModel): JudgeOut["gates"] {
  const all = userText(p);
  const offer = offerText(p);
  const res = m.economy.resources.find(r => r.id === p.reward.resource);
  const check = (id: LlmGateId, bad: string | null, okText: string) => ({ gate: id, pass: !bad, evidence: bad ? `"${bad}"` : okText });

  const sfw = unnegated(`${all}\n${p.eligibility}`, /\b(nsfw|explicit|adult content|sexual|erotic|18\+|self-harm|suicide|gore)\b/i);
  const cashy = unnegated(`${p.reward.what}\n${offer}\n${p.trigger}`, /\b(gift ?cards?|cash|paypal|crypto|vouchers?|\$\s?\d+|click(?:ing)?|tap the ad|install(?:s|ing)?|rate us|review us)\b/i);
  const confirmshame = /^\s*no,? i (don'?t|do not) (want|like|need)/i.test(p.offer.decline) ? p.offer.decline : null;
  const loss = unnegated(`${offer}\n${p.trigger}\n${p.reward.what}`, /\b(lose|lost|losing|deleted?|wiped|disappears?|or else|last chance|before it'?s gone|support us)\b|auto-?plays?|plays automatically|forced|mandatory|must watch/i) ?? confirmshame;
  const autoplay = unnegated(`${p.trigger}\n${offer}`, /auto-?plays?|plays automatically|starts automatically|without a tap/i);
  const optIn = autoplay ?? (!p.offer.cta.trim() ? "no call-to-action button" : null);

  const action = /\b(play|watch|game|video)\b/i.test(offer);
  const amountShown = p.reward.amount !== undefined && offer.includes(String(p.reward.amount));
  const consumable = isConsumable(res);
  const unitShown = !!res && consumable && nameRe(res).test(offer);
  const durShown = !!p.reward.duration && (/\d+/.exec(p.reward.duration)?.[0] ?? p.reward.duration).length > 0 && offer.includes(/\d+/.exec(p.reward.duration)?.[0] ?? p.reward.duration);
  const whatShown = nounHits(offer, p.reward.what.toLowerCase().split(/\W+/).filter(w => w.length >= 5)).length > 0;
  // A consumable is disclosed as an amount of its unit; an entitlement sample by its feature or time box.
  const disclosed = action && (consumable ? amountShown && unitShown : p.reward.duration ? durShown || whatShown : whatShown);

  const penalty = unnegated(`${p.trigger}\n${offer}\n${p.eligibility}`, /\b(penalt\w*|locked out|can'?t continue|must watch|lose (your|their|the))\b/i);
  const decline = !p.offer.decline.trim() ? "no decline option" : confirmshame ?? penalty;
  const stream = unnegated(`${p.trigger}\n${all}`, /\bmid-?(?:response|reply|stream|generation|sentence)\b|while (?:the )?(?:reply|response|answer|message) (?:is )?(?:still )?(?:stream|generat|typ)\w*|interrupts? (?:the )?(?:reply|response|generation|stream)/i);
  const subs = unnegated(`${p.eligibility}\n${p.trigger}`, /\b(all users|everyone|every user|subscribers|paying users|payers|every (?:app )?open|each launch|every session)\b/i);

  return [
    check("sfw", sfw, "Surfaces are ordinary app screens; no sensitive or adult context is named."),
    check("no-incentivized-action", cashy, `The reward is in-app ("${p.reward.what}"); nothing is paid for clicks or installs.`),
    check("no-loss-framing", loss, "Gain framing only; no forced play, fake timer or confirmshaming in the offer."),
    check("explicit-opt-in", optIn, `Opt-in via "${p.offer.cta}" (${p.simula.entry} entry).`),
    { gate: "disclosed", pass: disclosed, evidence: disclosed ? `"${p.offer.body}"` : `The offer "${p.offer.body}" does not state both the action and the exact reward (${p.reward.what}).` },
    check("free-decline", decline, `"${p.offer.decline}" dismisses the offer and leaves the user where they were.`),
    check("no-stream-interrupt", stream, "Shown at a boundary, not during a generation."),
    check("not-for-subscribers", subs, `Eligibility: ${p.eligibility.slice(0, 120)}`),
  ];
}

// ------------------------------------------------------------------------------------------------
// Criterion scores
// ------------------------------------------------------------------------------------------------
function scores(p: Proposal, m: ProductModel): JudgeOut["scores"] {
  const moments = p.anchor.moments.map(id => m.moments.find(x => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x);
  const mo = moments[0];
  const e = p.economics!;
  const res = m.economy.resources.find(r => r.id === p.reward.resource);
  const offer = offerText(p);
  const all = userText(p);
  const S: JudgeOut["scores"] = [];
  const add = (criterion: Criterion, score: number, evidence: string) => S.push({ criterion, score: clamp(score), evidence });

  // value-moment-fit: is the reward the thing the user is blocked on / wants right there?
  {
    const blocked = mo?.resource ?? m.economy.walls.find(w => w.shows === mo?.screen)?.resource ?? m.economy.sources.find(s => s.screen === mo?.screen)?.resource;
    const onBlocked = !!p.reward.resource && p.reward.resource === blocked;
    const sized = !!p.reward.amount || !!p.reward.duration;
    let v = 2, why = "no offer-allowed moment anchors it";
    if (mo) switch (mo.type) {
      case "wall": v = onBlocked ? 5 : sized ? 4 : 2; why = onBlocked ? `the reward (${p.reward.what}) is the resource the ${mo.id} wall blocks` : `a wall moment (${mo.id}), but the reward is not the blocked resource`; break;
      case "decline": v = onBlocked ? 4 : sized ? 3 : 2; why = `shown to users who just declined the paid option (${mo.id})`; break;
      case "desire": v = sized ? 4 : 3; why = `offered where the user wants more (${mo.id}: ${mo.description.slice(0, 60)})`; break;
      case "post-reward": v = onBlocked || p.reward.resource ? 4 : 3; why = `a positive moment right after a claim (${mo.id})`; break;
      case "hub": v = 3; why = `a proactive surface (${mo.id}); lower intent than a moment of need`; break;
      default: v = 1; why = `${mo.type} moment`; break;
    }
    const cheapest = m.economy.sinks.filter(k => k.resource === p.reward.resource && k.amount > 0).sort((a, b) => a.amount - b.amount)[0];
    if (p.reward.amount !== undefined && cheapest && p.reward.amount < cheapest.amount / 2) { v -= 1; why += `; ${p.reward.amount} does not buy even one "${cheapest.action}" (${cheapest.amount}) [ANTI-3]`; }
    if (res && isConsumable(res) && !nameRe(res).test(offer)) { v -= 1; why += `; the offer never names ${res.name}`; }
    if (!sized && !p.reward.resource) { v -= 1; why += "; the reward has no amount or duration"; }
    // A reward must name something this app has (a feature, mode, plan or its currency) [ANTI-3].
    if (!(isConsumable(res) && p.reward.amount != null) && !nounHits(p.reward.what, appNouns(m)).length) { v -= 1; why += "; the reward names nothing this app has"; }
    const incoherent = rewardCoherence(p, m);
    if (incoherent.length) { v = Math.min(v, 2); why += `; incoherent reward: ${incoherent[0]}`; }
    // [AI-17]: an ad-free window is only worth something where ads actually interrupt.
    if (/ad-?free|without (?:the )?(?:in-feed )?ads|no ads/i.test(p.reward.what) && !m.economy.ads.some(x => x.format === "interstitial" || x.format === "banner")) {
      v -= 2; why += `; the app runs no interstitial or banner ads (${m.economy.ads.map(x => x.format).join(", ") || "none"}), so an ad-free window removes little [AI-17][ANTI-3]`;
    }
    add("value-moment-fit", v, why);
  }

  // product-integrity
  {
    let v = 5; const why: string[] = [];
    if (p.simula.entry === "interstitial") { v -= 1; why.push("interstitial entry interrupts the flow"); }
    const stream = unnegated(all, /\bmid-?(?:response|reply|stream|generation)\b|auto-?plays?|interrupts?/i);
    if (stream) { v -= 2; why.push(`"${stream}"`); }
    const loss = unnegated(`${offer}\n${p.trigger}`, /\b(lose|lost|deleted?|wiped|or else)\b/i);
    if (loss) { v -= 2; why.push(`loss framing "${loss}"`); }
    if (p.anchor.newMechanic?.removesFreeValue) { v -= 2; why.push("removes something free users have today"); }
    if (!p.offer.decline.trim()) { v -= 1; why.push("no way to decline"); }
    add("product-integrity", v, why.length ? why.join("; ") : "Additive, at a boundary, returns the user where they were; nothing free is removed.");
  }

  // cannibalization-safety (reads code economics)
  {
    let v = 5; const why: string[] = [];
    if (e.flags.some(f => /cannibalization/i.test(f))) { v -= 2; why.push(`max daily earn $${e.maxDailyEarnUsdAtList} >= cheapest pack $${e.cheapestPaidUnitUsd}`); }
    if (e.flags.some(f => /one view's revenue/i.test(f))) { v -= 1; why.push(`reward worth ${e.rewardToViewRatio}x a view at list`); }
    if (!/non-?pay|non-?subscri|free users|declin|no purchase|never purchased/i.test(p.eligibility)) { v -= 1; why.push("no payer gating in eligibility"); }
    if (unnegated(p.eligibility, /\b(all users|everyone|subscribers|payers)\b/i)) { v -= 2; why.push("offered to payers or subscribers"); }
    if (p.cannibalizationGuard.trim().length < 30) { v -= 1; why.push("no real cannibalization guard"); }
    if (/\bunlimited\b/i.test(p.reward.what) && !p.reward.duration) { v -= 1; why.push("unlimited reward with no time box"); }
    // Sampling the paid plan's core benefit is fine only if short [TAX-2]; long or repeated is [ANTI-4].
    // A sample that expires tonight costs 1; a longer time box 2; days of the plan per view 3 [ANTI-4].
    const benefit = m.economy.entitlements.flatMap(x => x.benefits).find(b => nounHits(p.reward.what, b.toLowerCase().split(/\W+/).filter(w => w.length >= 5)).length > 0)
      ?? m.economy.entitlements.map(x => x.plan).find(pl => new RegExp(`(^|\\W)${escapeRe(pl)}(\\W|$)`, "i").test(p.reward.what));
    if (benefit) {
      const d = p.reward.duration ?? "";
      const min = Number(/(\d+)\s*min/i.exec(d)?.[1] ?? 0) + 60 * Number(/(\d+)\s*h/i.exec(d)?.[1] ?? 0);
      const days = /\d+\s*(?:days?|weeks?|months?)\b|\b(?:a|one) (?:week|month)\b/i.test(d);
      v -= days ? 3 : min > 30 ? 2 : 1;
      why.push(`samples the paid plan's "${benefit}"${d ? ` for ${d}` : ""}${days ? ": days of the plan per view [ANTI-4]" : ""}`);
    }
    add("cannibalization-safety", v, why.length ? why.join("; ") : `Non-payers only, ${p.caps.perDay}/day, reward far below the cheapest pack (${e.maxDailyEarnUsdAtList != null ? `$${e.maxDailyEarnUsdAtList}/day max vs $${e.cheapestPaidUnitUsd}` : "time-boxed"}).`);
  }

  // unit-economics: code numbers only
  {
    const net = e.viewValueUsd[0] * (1 - ECON.platformShare);
    const share = net > 0 ? e.cogsPerViewUsd / net : 0;
    const r = e.rewardToViewRatio;
    // A time box has no list-price value to compare; its anchor is then the cost to serve alone [JUDGE-2].
    const ratioScore = r == null ? 4 : r <= 1 ? 5 : r <= 2 ? 4 : r <= ECON.maxRewardToView ? 3 : r <= 2 * ECON.maxRewardToView ? 2 : 1;
    const cogsScore = share <= 0.3 ? 5 : share <= 0.6 ? 4 : share <= 0.8 ? 3 : share <= 1 ? 2 : 1;
    add("unit-economics", Math.min(ratioScore, cogsScore),
      `reward/view ${r ?? "n/a (not a priced resource)"}; cost to serve $${e.cogsPerViewUsd} = ${(share * 100).toFixed(0)}% of net revenue per view ($${net.toFixed(4)})`);
  }

  // reach
  {
    const R = { "core-loop": 5, frequent: 4, occasional: 3, rare: 2 } as const;
    const best = moments.filter(x => !x.noOffer).reduce((a, x) => Math.max(a, R[x.reach]), 0);
    add("reach", best || 2, best ? `anchored on ${moments.map(x => `${x.id} (${x.reach})`).join(", ")}` : "no anchored moment: reach unknown");
  }

  // feasibility
  {
    let v = 5; const why: string[] = [];
    if (p.simula.unit !== "SIM-RWD") { v -= 1; why.push(`${p.simula.unit} is not the rewarded unit`); }
    if (p.simula.minPlaySec < 10 || p.simula.minPlaySec > 30) { v -= 1; why.push(`minPlaySec ${p.simula.minPlaySec} outside the SDK's 10-30 s`); }
    if (p.patch.newScreens.length > 1) { v -= p.patch.newScreens.length - 1; why.push(`${p.patch.newScreens.length} new screens`); }
    if (p.patch.newElements.length > 3) { v -= 1; why.push(`${p.patch.newElements.length} new elements`); }
    if (p.anchor.newMechanic) { v -= 1; why.push(`new mechanic "${p.anchor.newMechanic.name}" to build`); }
    add("feasibility", Math.max(2, v), why.length ? why.join("; ") : `${p.simula.unit} via ${p.simula.entry}, one small patch.`);
  }

  // specificity: nouns in what the user sees; ids that resolve
  {
    const nouns = appNouns(m);
    const inOffer = nounHits(offer, nouns);
    const inAll = nounHits(all, nouns);
    const refs = 1 + p.anchor.moments.length + p.anchor.economy.length + p.storyboard.length;
    const bad = grounding(p, m).length;
    const idShare = Math.max(0, 1 - bad / refs);
    let v = 1 + Math.min(3, Math.floor(inAll.length / 2)) + (idShare >= 0.9 ? 1 : 0);
    if (!inOffer.length) v = Math.min(v, 2);
    if (rewardCoherence(p, m).length) v = Math.min(v, 2); // an entitlement used as a currency earns no credit
    add("specificity", v, `app nouns in the offer: ${inOffer.slice(0, 5).map(n => `"${n}"`).join(", ") || "none"}; overall ${inAll.length}; ${bad ? `${bad} unresolved ids` : "all ids resolve"}`);
  }

  // frequency-fatigue
  {
    const d = p.caps.perDay;
    let v = d <= 0 ? 1 : d <= 5 ? 5 : d <= 8 ? 3 : d <= 10 ? 2 : 1;
    const why = [`${d}/day, cooldown ${p.caps.cooldownMin} min`];
    if (p.caps.cooldownMin === 0 && d > 1) { v -= 1; why.push("no cooldown"); }
    const every = unnegated(`${p.trigger}\n${p.eligibility}`, /\bevery (?:app )?open|each launch|every session|every time\b/i);
    if (every) { v = 1; why.push(`re-prompts: "${every}"`); }
    add("frequency-fatigue", v, why.join("; "));
  }

  // measurability
  {
    const k = p.kpis;
    const v = 1 + (k.primary.trim() ? 1 : 0) + (k.guardrails.length >= 1 ? 1 : 0) + (k.guardrails.length >= 2 ? 1 : 0) + (/holdout|control/i.test(k.holdout) ? 1 : 0);
    add("measurability", v, `primary: ${k.primary ? "yes" : "no"}; ${k.guardrails.length} guardrails; holdout: ${k.holdout ? k.holdout.slice(0, 60) : "none"}`);
  }
  return S;
}

// ------------------------------------------------------------------------------------------------
// Required changes ([JUDGE-5] revision prompts), most important first
// ------------------------------------------------------------------------------------------------
const GATE_FIX: Record<string, string> = {
  grounding: "Use only ids that exist in the digest and declare every new screen and element in the patch",
  label: "Relabel as product-change and declare anchor.newMechanic, or cite an observed economy item",
  "already-exists": "Pick a surface or format that is not already an ad today",
  economics: "Resize the reward with the exchange rate (about one cheapest action per view) and keep the daily maximum far below the cheapest pack",
  structure: "Restore the required structure (grant on REWARD_VERIFIED, a decline, caps, the 5 storyboard frames, an allowed surface)",
  schema: "Return a complete, schema-valid proposal",
  "policy-lint": "Remove cash-like rewards, incentivized clicks, installs or ratings, and 'support us' copy [POL-2]",
  sfw: "Restrict to SFW surfaces and exclude sensitive conversations [SAFE-1]",
  "no-incentivized-action": "Reward the completed play only, with an in-app, non-transferable item [POL-2]",
  "no-loss-framing": "Remove the loss/hostage framing and any forced play; use gain framing on new value [ANTI-10]",
  "explicit-opt-in": "Require an explicit opt-in tap; nothing may auto-play [ANTI-1]",
  disclosed: "State the exact reward and the action (\"Play a 15-second game to get +N <unit>\") in the offer before the ad [POL-2]",
  "free-decline": "Add an equally legible decline that returns the user exactly where they were, with no penalty [ANTI-2]",
  "no-stream-interrupt": "Move the offer to a boundary: after the reply has finished or when the composer is blocked [ANTI-5]",
  "not-for-subscribers": "Restrict eligibility to non-payers and never show it to subscribers or on every open [TRIG-2]",
};
const CRIT_FIX: Record<Criterion, string> = {
  "value-moment-fit": "Anchor the reward to what the user is blocked on at this moment and name it in the offer",
  "product-integrity": "Keep the offer at a boundary, preserve the user's input, and take nothing away from the free experience",
  "cannibalization-safety": "Gate to non-payers or paywall decliners, keep the reward partial or time-boxed, cap it per day, and show the paid option on the grant screen",
  "unit-economics": "Cut the cost to serve: fewer units per view, a cheaper reward class or a shorter time box, so COGS stays under ~60% of net revenue per view [TRIG-4]",
  reach: "Move the entry point to a surface on the core loop that a large share of daily users reach",
  feasibility: "Map it to SIM-RWD with a button or invitation entry and a 10-30 s game; keep the patch to one new surface",
  specificity: "Use this app's own nouns in the offer copy (resource, screen and mode names) and the digest's ids; generic copy could be pasted into any app",
  "frequency-fatigue": "Set explicit caps (3 or fewer per day here), a cooldown, and no re-offer after a decline or on every open",
  measurability: "Name the primary metric, at least two guardrails and a user-level holdout [MEAS-5]",
};

export function requiredChangesFor(codeGates: GateResult[], llm: JudgeOut["gates"], sc: JudgeOut["scores"]): { requiredChanges: string[]; topConcern: string } {
  const sev = new Map<string, string>(LLM_GATES.map(g => [g.id, g.severity]));
  const failed = [
    ...codeGates.filter(g => !g.pass).map(g => ({ gate: g.gate, severity: g.severity as string, evidence: g.evidence })),
    ...llm.filter(g => !g.pass).map(g => ({ gate: g.gate as string, severity: sev.get(g.gate) ?? "fixable", evidence: g.evidence })),
  ].sort((a, b) => Number(b.severity === "policy") - Number(a.severity === "policy"));
  // An economics failure that is only about cost to serve needs a cheaper reward, not a smaller one.
  const fix = (f: { gate: string; evidence: string }) =>
    f.gate === "economics" && !/one view's revenue|cannibalization/i.test(f.evidence) ? CRIT_FIX["unit-economics"] : GATE_FIX[f.gate] ?? `Fix ${f.gate}`;
  const out = failed.map(f => `${fix(f)} (${f.gate}: ${f.evidence.slice(0, 160)}).`);
  const weight = new Map(WEIGHTS.map(w => [w.criterion, w.weight]));
  const weak = sc.filter(s => s.score <= 3).sort((a, b) => (5 - b.score) * (weight.get(b.criterion) ?? 0) - (5 - a.score) * (weight.get(a.criterion) ?? 0));
  for (const s of weak) out.push(`${CRIT_FIX[s.criterion]} (${s.criterion} ${s.score}/5: ${s.evidence.slice(0, 140)}).`);
  const requiredChanges = out.slice(0, 5);
  return { requiredChanges, topConcern: requiredChanges[0] ?? "None: ship as is." };
}

/** The stub judge: deterministic heuristics in the LLM judge's output shape. Needs p.economics (code). */
export function stubJudge(p: Proposal, m: ProductModel, codeGates: GateResult[]): JudgeOut {
  const gs = gates(p, m);
  const sc = scores(p, m);
  return { gates: gs, scores: sc, ...requiredChangesFor(codeGates, gs, sc) };
}
