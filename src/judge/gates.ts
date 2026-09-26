// Stage 1 of the judge: code gates (FINAL_PLAN §9.1). Free, deterministic, and run before any model
// call, so the confusion table can say what code caught versus what the LLM caught.
//   schema          the proposal parses                                         policy  -> REJECT
//   grounding       every referenced id exists; every new id is declared         fixable -> REVISE
//   label           "existing" cites an observed economy item                    fixable (relabel)
//   already-exists  the same surface + format is already an ad today             fixable
//   policy-lint     cash-like rewards, incentivized clicks/installs, "support us" policy  -> REJECT
//   economics       code-computed flags (reward vs view, cannibalization, COGS)  fixable
//   structure       REWARD_VERIFIED, a decline, caps, 5 storyboard phases, no first-value surface  fixable
//   reward-coherence  an entitlement is granted as a time box or a number of uses, never "+N tier"  fixable
//   not-for-account-wall  no ad in place of creating an account                   fixable
// After every proposal is judged, judge.ts adds one portfolio gate (portfolio.ts):
//   portfolio-distinct  no near-duplicate of a better-scored SHIP                   fixable (1 revision, then REJECT)
import { GateResult, Proposal, type ProductModel } from "../core/schema.ts";
import { proposalEconomics } from "../model/economics.ts";
import { ACCOUNT_LIKE, isAccountResource, isConsumable, isSignupScreen } from "../propose/anchors.ts";

const PHASES = ["today", "change", "offer", "ad", "value"];

// FINAL_PLAN §9.1 lint, plus close synonyms. Matched on what users see and on the mechanic, not on
// risks/guards/KPIs (which legitimately say "never reward installs").
export const POLICY_LINT = /\b(gift ?cards?|cash|paypal|venmo|crypto(?:currency)?|bitcoin|vouchers?|support us|rate (?:us|5)|install(?:s|ing)?|tap the ad|click (?:on )?the ad)\b/i;

export function lintText(p: Proposal): string {
  return [
    p.title, p.oneLiner, p.trigger, p.eligibility, p.offer.title, p.offer.body, p.offer.cta, p.offer.decline,
    p.reward.what, p.reward.duration ?? "", p.simula.gamePartner ?? "",
    p.anchor.newMechanic?.name ?? "", p.anchor.newMechanic?.description ?? "",
    ...p.patch.newScreens.map(s => s.change), ...p.patch.newElements.map(e => e.change),
    ...p.storyboard.flatMap(b => [b.caption, ...b.callouts.map(c => c.text)]),
  ].join(" \n");
}

const g = (gate: string, pass: boolean, severity: GateResult["severity"], evidence: string): GateResult => ({ gate, pass, by: "code", severity, evidence });

/** Ids a proposal may reference, with where they live. */
function index(m: ProductModel) {
  const e = m.economy;
  const economy = new Map<string, { kind: string; conf: string }>();
  for (const [kind, xs] of [["resource", e.resources], ["sink", e.sinks], ["source", e.sources], ["offer", e.offers], ["wall", e.walls]] as const)
    for (const x of xs) economy.set(x.id, { kind, conf: x.conf });
  const obs = new Set<string>([
    ...m.screens.flatMap(s => [s.id, s.representative, ...s.observations, ...s.variants.map(v => v.obs)]),
    ...[...e.resources, ...e.sinks, ...e.sources, ...e.offers, ...e.walls].flatMap(x => x.evidence.map(v => v.obs)),
    ...e.entitlements.flatMap(x => x.evidence.map(v => v.obs)), ...e.ads.flatMap(x => x.evidence.map(v => v.obs)),
    ...m.moments.flatMap(x => x.evidence.map(v => v.obs)),
  ]);
  return { screens: new Map(m.screens.map(s => [s.id, s])), moments: new Map(m.moments.map(x => [x.id, x])), economy, obs, externals: new Set(m.externals.map(x => x.id)) };
}

export function grounding(p: Proposal, m: ProductModel): string[] {
  const ix = index(m);
  const bad: string[] = [];
  const newScreens = p.patch.newScreens.map(s => s.id);
  const newEls = p.patch.newElements.map(e => e.id);
  const screenOk = (id: string) => ix.screens.has(id) || newScreens.includes(id);
  const elOn = (screen: string, el: string) => !!ix.screens.get(screen)?.elements.some(e => e.id === el) || newEls.includes(el);
  // A product change may introduce one new resource; it is declared by anchor.newMechanic. A time-boxed
  // reward ("15 minutes of X") declares its own temporary entitlement: the reward is that resource.
  const resourceOk = (id: string) => ix.economy.get(id)?.kind === "resource" || (id === p.reward.resource && ((p.case === "product-change" && !!p.anchor.newMechanic) || !!p.reward.duration));

  if (!screenOk(p.surface)) bad.push(`surface "${p.surface}" is not a screen in the model nor declared in patch.newScreens`);
  for (const id of p.anchor.moments) if (!ix.moments.has(id)) bad.push(`moment "${id}" does not exist`);
  // A product change cites the resource it introduces (its reward resource, or an id marked "(new)").
  // A time box's own entitlement counts too, with or without the "(new)" mark (resourceOk agrees).
  const declaredNew = (id: string) => (p.case === "product-change" && !!p.anchor.newMechanic && (id === p.reward.resource || /\(new\)\s*$/i.test(id)))
    || (!!p.reward.duration && id.replace(/\s*\(new\)\s*$/i, "") === p.reward.resource);
  // Ad placements have no ids: the digest lists each as "AD TODAY <format> on <screen> (<element>)", and a
  // proposal may cite one by that label or by any text ending in the ad's element id.
  const adEls = new Set(m.economy.ads.flatMap(a => (a.el ? [a.el] : [])));
  const isAdRef = (id: string) => {
    const el = /\((e\d+)\)\s*$/.exec(id)?.[1];
    return el ? adEls.has(el) : /^AD TODAY\b/i.test(id) && m.economy.ads.length > 0;
  };
  for (const id of p.anchor.economy) if (!ix.economy.has(id) && !declaredNew(id) && !isAdRef(id)) bad.push(`economy item "${id}" does not exist`);
  if (p.reward.resource && !resourceOk(p.reward.resource)) bad.push(`reward resource "${p.reward.resource}" does not exist`);

  for (const d of [...newScreens, ...newEls].filter((x, i, a) => a.indexOf(x) !== i)) bad.push(`new id "${d}" is declared twice`);
  for (const s of p.patch.newScreens) {
    if (ix.screens.has(s.id)) bad.push(`new screen "${s.id}" collides with an existing screen id`);
    if (s.basedOn && !ix.screens.has(s.basedOn)) bad.push(`new screen "${s.id}" is based on unknown screen "${s.basedOn}"`);
  }
  for (const e of p.patch.newElements) {
    if (!screenOk(e.in)) bad.push(`new element "${e.id}" is in unknown screen "${e.in}"`);
    if (ix.screens.get(e.in)?.elements.some(x => x.id === e.id)) bad.push(`new element "${e.id}" collides with an existing element on ${e.in}`);
    if (e.near && !elOn(e.in, e.near)) bad.push(`new element "${e.id}" is placed near "${e.near}", which is not an element on ${e.in}`);
  }
  for (const e of p.patch.newEdges) {
    if (!screenOk(e.from)) bad.push(`edge from unknown screen "${e.from}"`);
    else if (!elOn(e.from, e.el)) bad.push(`edge element "${e.el}" is not on ${e.from} and not declared`);
    if (!(e.to === "rwd" || e.to === "back" || screenOk(e.to) || ix.externals.has(e.to))) bad.push(`edge target "${e.to}" does not exist`);
    for (const f of e.effects) if (!resourceOk(f.resource)) bad.push(`edge effect on unknown resource "${f.resource}"`);
    if (e.guard && !resourceOk(e.guard.resource)) bad.push(`edge guard on unknown resource "${e.guard.resource}"`);
  }
  for (const b of p.storyboard) {
    if (!screenOk(b.screen)) { bad.push(`storyboard ${b.phase}: unknown screen "${b.screen}"`); continue; }
    for (const c of b.callouts) if (!elOn(b.screen, c.node) && !newScreens.includes(c.node)) bad.push(`storyboard ${b.phase}: callout node "${c.node}" is not on ${b.screen} and not declared`);
    for (const c of b.counters) if (!resourceOk(c.resource)) bad.push(`storyboard ${b.phase}: counter on unknown resource "${c.resource}"`);
  }
  for (const ev of p.evidence) {
    if (!ix.obs.has(ev.obs)) bad.push(`evidence "${ev.obs}" is not an observation or screen in the model`);
    else if (ev.el && ix.screens.has(ev.obs) && !elOn(ev.obs, ev.el)) bad.push(`evidence element "${ev.el}" is not on ${ev.obs}`);
  }
  return [...new Set(bad)];
}

function structure(p: Proposal, m: ProductModel): string[] {
  const bad: string[] = [];
  if (p.reward.grantOn !== "REWARD_VERIFIED") bad.push("reward is not granted on REWARD_VERIFIED");
  if (!p.offer.decline.trim()) bad.push("offer has no decline option");
  if (!(p.caps.perDay >= 1)) bad.push(`caps.perDay is ${p.caps.perDay} (must be >= 1)`);
  const phases = p.storyboard.map(b => b.phase);
  if (phases.join(",") !== PHASES.join(",")) bad.push(`storyboard phases are [${phases.join(", ")}], expected [${PHASES.join(", ")}]`);
  const moments = new Map(m.moments.map(x => [x.id, x]));
  for (const id of p.anchor.moments) if (moments.get(id)?.noOffer) bad.push(`anchored on ${id}, a ${moments.get(id)!.type} moment where offers are forbidden`);
  const noOffer = m.moments.filter(x => x.noOffer && x.screen === p.surface);
  if (noOffer.length) {
    // The first-value screen can also be a hub; an offer there is allowed only for an allowed moment
    // on that same screen, and never in the first session [ANTI-12].
    const allowedHere = p.anchor.moments.some(id => { const x = moments.get(id); return x && !x.noOffer && x.screen === p.surface; });
    if (!allowedHere) bad.push(`surface ${p.surface} is the first-value screen (${noOffer.map(x => x.id).join(", ")}): no offers there`);
    else if (!/first session|second session|returning|session 2|after (the )?first/i.test(p.eligibility)) bad.push(`surface ${p.surface} is also the first-value screen: eligibility must exclude the first session`);
  }
  return bad;
}

const FORMAT = { "SIM-RWD": "rewarded", "SIM-INT": "interstitial", "SIM-NAT": "native" } as const;

// A count of uses of something named: "3 Deep reasoning answers", "1 image".
const USE_COUNT = /\b\d+\s+(?:[\w+'-]+\s+){0,4}?(?:uses?|answers?|repl(?:y|ies)|messages?|images?|generations?|tries|questions?|edits?|videos?|photos?|minutes?|sessions?|chats?|episodes?|chapters?|articles?)\b/i;
const TIER_WORD = /\+\s?\d+\s*(?:tiers?|plans?|memberships?|subscriptions?|accounts?|profiles?|levels?)\b/i;
const escapeRe = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Entitlements (a plan, tier, membership, account) are not currencies: a reward on one is a time box
 * or a number of uses of a named feature. "+1 tier" / "+1 Membership" is incoherent.
 */
export function rewardCoherence(p: Proposal, m: ProductModel): string[] {
  const bad: string[] = [];
  const res = (id?: string) => m.economy.resources.find(x => x.id === id);
  const r = res(p.reward.resource);
  if (r && !isConsumable(r)) {
    if (p.reward.amount != null) bad.push(`the reward grants ${p.reward.amount} "${r.unit}" of ${r.name}, an entitlement: grant a time box or a number of uses of a named feature instead`);
    else if (!p.reward.duration && !USE_COUNT.test(p.reward.what)) bad.push(`the reward on ${r.name} (an entitlement) has neither a duration nor a use count`);
  }
  const copy = [p.title, p.oneLiner, p.offer.title, p.offer.body, p.offer.cta, p.reward.what, ...p.storyboard.map(b => b.caption), ...p.storyboard.flatMap(b => b.callouts.map(c => c.text))].join("\n");
  const words = m.economy.resources.filter(x => !isConsumable(x)).flatMap(x => [x.unit, x.name]).filter(w => w && w.trim().length >= 3);
  for (const w of words) {
    const hit = new RegExp(`\\+\\s?\\d+\\s*${escapeRe(w.trim())}(?![\\w])`, "i").exec(copy);
    if (hit) bad.push(`the copy says "${hit[0]}": an entitlement is not a currency`);
  }
  const tier = TIER_WORD.exec(copy);
  if (tier) bad.push(`the copy says "${tier[0]}": a plan or account is not a currency`);
  for (const e of p.patch.newEdges) for (const f of e.effects) {
    const x = res(f.resource);
    if (x && !isConsumable(x)) bad.push(`the patch adds ${f.delta} "${x.unit}" of ${x.name} on REWARD_VERIFIED`);
  }
  return [...new Set(bad)];
}

const SKIP_SIGNUP = /\b(skip (?:the )?sign[- ]?(?:up|in)|instead of (?:signing|creating|logging|registering)|without (?:signing (?:up|in)|logging in|creating an account|an account)|no (?:account|sign[- ]?up|login) (?:needed|required)|continue as (?:a )?guest)\b/i;
const AFTER_DECLINE = /\b(after|once|when)\b[^.]{0,60}\b(declin\w*|dismiss\w*|clos\w*|skip\w*|maybe later|not now|no,? thanks)\b/i;
const stems = (x: string) => x.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 5).map(w => w.slice(0, 6));

/** Rewarded ads cannot replace sign-up: no account for an ad, no account-only feature for an ad. */
export function accountWallProblems(p: Proposal, m: ProductModel): string[] {
  const bad: string[] = [];
  const res = (id?: string) => m.economy.resources.find(x => x.id === id);
  const r = res(p.reward.resource);
  if (isAccountResource(r)) bad.push(`the reward is ${r!.name}: an ad cannot stand in for creating an account`);
  const surface = m.screens.find(s => s.id === p.surface);
  const onAccountWall = !!surface && (surface.kind === "login"
    || m.economy.walls.some(w => w.shows === surface.id && (isAccountResource(res(w.resource)) || isSignupScreen(surface))));
  const skip = SKIP_SIGNUP.exec([p.offer.title, p.offer.body, p.offer.cta, p.reward.what, p.trigger].join("\n"));
  if (onAccountWall && skip) bad.push(`on the sign-up wall ${surface!.name}, the offer trades an ad for skipping sign-up ("${skip[0]}")`);
  // A sign-up sheet that gates a FEATURE (not a used-up quota): an offer placed there, beside "Continue with
  // Google", is an ad in place of the account. It may only appear after the user declines sign-up, and
  // then it samples the feature. (A sheet that also ends a free quota may offer a refill of that quota.)
  const wallsHere = m.economy.walls.filter(w => w.shows === surface?.id);
  const featureWall = wallsHere.length > 0 && wallsHere.every(w => !isConsumable(res(w.resource)));
  const afterDecline = AFTER_DECLINE.test(`${p.trigger} ${p.eligibility}`);
  if (surface && isSignupScreen(surface) && featureWall && !afterDecline && !skip)
    bad.push(`"${surface.name}" asks the user to sign up for a feature: an offer beside the sign-up button stands in for the account; show it only after the user declines (e.g. taps "Maybe later")`);
  // Features that only an account unlocks (saving, profile settings) cannot be earned with an ad.
  // A reward counted in a consumable ("+3 messages") is units of that resource, never the account
  // feature, whatever words the two share ("Save favorite messages").
  if (!isConsumable(r)) {
    const accountOnly = m.economy.walls.filter(w => isAccountResource(res(w.resource)) || (!w.resource && ACCOUNT_LIKE.test(w.blockedIntent)));
    // Nor do words that name a consumable's unit ("up to 2 messages for 10 minutes" is not saving messages).
    const unitWords = new Set(m.economy.resources.filter(isConsumable).flatMap(x => stems(`${x.name} ${x.unit}`)));
    const want = new Set(stems(p.reward.what).filter(w => !unitWords.has(w)));
    const hit = accountOnly.find(w => stems(w.blockedIntent).some(x => want.has(x)));
    if (hit) bad.push(`the reward is "${hit.blockedIntent}", which only an account unlocks: an ad cannot stand in for signing up`);
  }
  return bad;
}

/** Run every code gate. `p` should carry code-computed economics (recomputed here if absent). */
export function codeGates(input: Proposal, m: ProductModel): GateResult[] {
  const parsed = Proposal.safeParse(input);
  if (!parsed.success) {
    return [g("schema", false, "policy", parsed.error.issues.slice(0, 5).map(i => `${i.path.join(".")}: ${i.message}`).join("; "))];
  }
  const p = parsed.data;
  const out: GateResult[] = [g("schema", true, "policy", "parses as a Proposal")];

  const gr = grounding(p, m);
  out.push(g("grounding", !gr.length, "fixable", gr.length ? gr.slice(0, 8).join("; ") : "every referenced id exists; new ids are declared in the patch"));

  const ix = index(m);
  if (p.case === "existing") {
    const observed = p.anchor.economy.filter(id => ix.economy.get(id)?.conf === "observed");
    out.push(g("label", observed.length > 0, "fixable", observed.length ? `cites observed economy items: ${observed.join(", ")}` : "relabel as product-change: an existing opportunity must cite at least one observed economy item"));
  } else {
    out.push(g("label", !!p.anchor.newMechanic, "fixable", p.anchor.newMechanic ? `declares new mechanic "${p.anchor.newMechanic.name}"` : "a product change must declare anchor.newMechanic"));
  }

  const dup = m.economy.ads.find(a => a.screen === p.surface && a.format === FORMAT[p.simula.unit]);
  out.push(g("already-exists", !dup, "fixable", dup ? `a ${dup.format} ad already runs on ${dup.screen}${dup.el ? ` (${dup.el})` : ""}` : "no ad of this format on this surface today"));

  const hit = POLICY_LINT.exec(lintText(p));
  out.push(g("policy-lint", !hit, "policy", hit ? `matched "${hit[0]}"` : "no cash-like reward, incentivized click/install or 'support us' copy"));

  const flags = (p.economics ?? proposalEconomics(p, m)).flags;
  out.push(g("economics", !flags.length, "fixable", flags.length ? flags.join(" ") : "reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view"));

  const st = structure(p, m);
  out.push(g("structure", !st.length, "fixable", st.length ? st.join("; ") : "REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface"));

  const rc = rewardCoherence(p, m);
  out.push(g("reward-coherence", !rc.length, "fixable", rc.length ? rc.join("; ") : "consumables granted as amounts; entitlements as a time box or a number of uses"));

  const aw = accountWallProblems(p, m);
  out.push(g("not-for-account-wall", !aw.length, "fixable", aw.length ? aw.join("; ") : "no ad in place of creating an account"));
  return out;
}
