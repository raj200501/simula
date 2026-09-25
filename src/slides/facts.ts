// Pure helpers that turn the typed artifacts (model, candidates, judgments) into what a slide says.
// No I/O and no LLM: every number shown on a slide comes from here or from model/economics.ts, so a
// product team can trace each claim back to an observed price, a cap or a judge score.
import type { Candidates, JudgmentRound, Judgments, ProductModel, Proposal, ProposalEconomics, Verdict } from "../core/schema.ts";
import { deriveEconomy, exchangeRateLine, ECON } from "../model/economics.ts";
import { actionNoun, firstQuoted, midSentence, modeName, sinkUse } from "../core/humanize.ts";

export const PHASES = ["today", "change", "offer", "ad", "value"] as const;
export type PhaseId = (typeof PHASES)[number];
export const PHASE_LABEL: Record<PhaseId, string> = { today: "Today", change: "What changed", offer: "Offer", ad: "Ad plays", value: "Value received" };

export interface Final { proposalId: string; version: number; verdict: Verdict; weighted: number | null; summary: string }
export type Story = Proposal["storyboard"][number];

// ---------------------------------------------------------------------------------------------- selection
/** The proposal text the judge's final verdict refers to: exact version, else the newest one we have. */
export function resolveProposal(cands: Candidates, id: string, version?: number): Proposal | undefined {
  const all = cands.proposals.filter(p => p.id === id);
  return all.find(p => p.version === version) ?? all.sort((a, b) => b.version - a.version)[0];
}

/**
 * Every proposal whose FINAL verdict is SHIP, best score first. Nothing else is promoted: a REVISE
 * never becomes a flow slide, and no SHIP is dropped to fit a slot count (critique D6).
 */
export function shipped(cands: Candidates, j: Judgments): { p: Proposal; f: Final }[] {
  const out: { p: Proposal; f: Final }[] = [];
  for (const f of latestFinals(j)) {
    if (f.verdict !== "SHIP") continue;
    const p = resolveProposal(cands, f.proposalId, f.version);
    if (p) out.push({ p, f });
  }
  return out.sort((a, b) => (b.f.weighted ?? 0) - (a.f.weighted ?? 0) || a.p.id.localeCompare(b.p.id, "en", { numeric: true }));
}

/** One final entry per proposal id (the last one written wins, as the judge appends revisions). */
export function latestFinals(j: Judgments): Final[] {
  const by = new Map<string, Final>();
  for (const f of j.final) by.set(f.proposalId, f);
  return [...by.values()];
}

export function roundsOf(j: Judgments, id: string): JudgmentRound[] {
  return j.rounds.filter(r => r.proposalId === id).sort((a, b) => a.round - b.round || a.version - b.version);
}

// ---------------------------------------------------------------------------------------------- storyboard
/** Exactly five frames in reading order; a phase the proposer left out gets a sensible default. */
export function normalizeStoryboard(p: Proposal, m: ProductModel): Story[] {
  const by = new Map(p.storyboard.map(s => [s.phase, s]));
  const res = resourceOf(m, p.reward.resource);
  const first = p.storyboard[0]?.screen ?? p.surface;
  const fallbackScreen: Record<PhaseId, string> = {
    today: first, change: by.get("offer")?.screen ?? p.surface, offer: p.surface, ad: by.get("offer")?.screen ?? p.surface,
    value: by.get("today")?.screen ?? p.surface,
  };
  const fallbackCaption: Record<PhaseId, string> = {
    today: `Today: ${screenName(m, first)}`,
    change: p.patch.newElements[0]?.change ?? p.patch.newScreens[0]?.change ?? "New rewarded entry point",
    offer: p.offer.title,
    ad: `${p.simula.minPlaySec}s sponsored game${p.simula.gamePartner ? ` with ${p.simula.gamePartner}` : ""}`,
    value: p.reward.amount != null && res ? `+${p.reward.amount} ${unitOf(res)}, right where they were` : p.reward.what,
  };
  // Captions are at most 12 words (E5) whatever the proposer wrote.
  return PHASES.map(phase => {
    const s = by.get(phase) ?? { phase, screen: fallbackScreen[phase], counters: [], overlay: "none" as const, callouts: [], caption: fallbackCaption[phase] };
    return { ...s, caption: clampWords(s.caption, 12) };
  });
}

/** "10 credits" without repeating the amount when the proposer's text already states it. */
export function rewardText(p: Proposal, m: ProductModel): string {
  const what = oneLine(p.reward.what);
  const res = resourceOf(m, p.reward.resource);
  if (p.reward.amount == null || !res || what.includes(String(p.reward.amount))) return what;
  return `${what} (${p.reward.amount} ${unitOf(res)})`;
}

/** Where "No thanks" lands: the screen under the offer (a new modal returns to what it was based on). */
export function declineTarget(p: Proposal, m: ProductModel, offerScreen: string): string {
  if (m.screens.some(s => s.id === offerScreen)) return screenName(m, offerScreen);
  const ns = p.patch.newScreens.find(s => s.id === offerScreen);
  const back = ns?.basedOn ?? p.storyboard.find(s => s.phase === "change")?.screen ?? p.surface;
  return screenName(m, back);
}

// ---------------------------------------------------------------------------------------------- copy
/**
 * The flow slide title: the offer in the words the user reads on screen, as a complete claim of at
 * most `max` characters (never cut with "…"): title + first sentence of the body, else title + the
 * body's first clause, else the body's first sentence or clause, else the title alone.
 */
export function claimOf(p: Proposal, max = 70): string {
  const t = oneLine(p.offer.title).replace(/[.!:;,]+$/, "");
  const body = firstSentence(oneLine(p.offer.body)).replace(/[.!]+$/, "");
  const clause = body.split(/[,;:–—(]/)[0].trim();
  const join = (a: string, b: string) => (!a ? b : !b ? a : /\?$/.test(a) ? `${a} ${b}` : `${a}: ${midSentence(b)}`);
  const fits = (s: string) => s.length <= max && s.split(" ").length >= 2;
  // A body that is too long is cut before a trailing qualifier ("… bonus on top of today's +300").
  const cuts = [...body.matchAll(/\s(?:on top of|on|for|in|with|at|after|before|until|so|and|while|each|per|every|from|once|when|if|or)\s/gi)]
    .map(x => body.slice(0, x.index).trim()).filter(x => x.length >= 20).reverse();
  const options = [join(t, body), join(t, clause), ...cuts.map(c => join(t, c)), body, clause, ...cuts, t, oneLine(p.title)].map(s => s.trim()).filter(Boolean);
  const hit = options.find(fits);
  if (hit) return /[?!]$/.test(hit) ? hit : `${hit}.`;
  // Nothing fits: cut the title at a word boundary (still no ellipsis in the headline).
  const words = (t || oneLine(p.title)).split(" ");
  let out = "";
  for (const w of words) { if ((out ? `${out} ${w}` : w).length > max) break; out = out ? `${out} ${w}` : w; }
  return out || (t || p.title).slice(0, max);
}

/** A slide headline with one accent-coloured key phrase (`accent` is a substring of `text`, or ""). */
export interface Headline { text: string; accent: string }

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

/**
 * The flow slide headline: at most `max` words, "where it happens: the exchange", with the reward as
 * the accent phrase ("Out of credits: play a game for +10 credits"). A reward that is not a short
 * amount falls back to the offer's own title ("Unlock 15 Min Premium for one short game").
 */
export function headlineOf(p: Proposal, m: ProductModel, max = 8): Headline {
  const res = resourceOf(m, p.reward.resource);
  const what = oneLine(p.reward.what).replace(/[.!;:,]+$/, "");
  let reward = "";
  if (p.reward.amount != null && res) reward = what.includes(String(p.reward.amount)) && wordCount(what) <= 4 ? what : `+${num(p.reward.amount)} ${unitOf(res)}`;
  else if (what && wordCount(what) <= 4 && !/^(nothing|none|n\/a|no reward)$/i.test(what)) reward = what;
  const moment = momentOf(p, m);
  const title = oneLine(p.offer.title).replace(/[.!:;,]+$/, "");
  const sec = p.simula.minPlaySec;
  const cands: Headline[] = [];
  if (reward) {
    if (moment) cands.push({ text: `${moment}: play a game for ${reward}`, accent: reward }, { text: `${moment}: play for ${reward}`, accent: reward });
    cands.push({ text: `Play a ${sec}-second game for ${reward}`, accent: reward }, { text: `Play for ${reward}`, accent: reward });
  }
  if (title && !/\?$/.test(title)) cands.push({ text: `${title} for one short game`, accent: title });
  if (title) cands.push({ text: title, accent: title });
  const hit = cands.find(c => wordCount(c.text) <= max);
  if (hit) return hit;
  const short = clampWords(p.title, max).replace(/…$/, "");
  return { text: short, accent: "" };
}

/** Where the offer happens, in at most four words: the surface screen, or the new surface's name. */
function momentOf(p: Proposal, m: ProductModel): string {
  const ns = p.patch.newScreens.find(s => s.id === p.surface);
  const raw = m.screens.some(s => s.id === p.surface)
    ? screenName(m, p.surface)
    : ns ? firstQuoted(ns.change) ?? p.anchor.newMechanic?.name ?? "" : p.anchor.newMechanic?.name ?? "";
  const t = oneLine(raw).replace(/^["“'«]|["”'»]$/g, "").replace(/[.!?:;,]+$/, "");
  if (!t || wordCount(t) > 4 || /^n?s\d+$/i.test(t)) return "";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** The recommendation headline: what users get, with the exchange as the accent phrase. */
export function recommendationHeadline(m: ProductModel, ps: Proposal[]): Headline {
  if (!ps.length) return { text: `No rewarded flow for ${m.app.name} is ready to ship yet.`, accent: "" };
  const units = [...new Set(ps.map(p => resourceOf(m, p.reward.resource)).filter(Boolean).map(r => unitOf(r!)))];
  const accent = `play a short game for ${units.length ? units.join(" and ") : "a reward"}`;
  return { text: `Let users ${accent}.`, accent };
}

/**
 * A flow-slide caption that fits two lines: the caption itself when short enough, else its first
 * clause, else a word-boundary cut. The full caption stays on the details slide.
 */
export function shortCaption(s: string, max = 60): string {
  const t = oneLine(s);
  if (t.length <= max) return t;
  const stop = (x: string) => `${x.replace(/[.,;:\-–—]+$/, "")}.`;
  const sentence1 = firstSentence(t);
  if (sentence1 !== t && sentence1.length <= max && wordCount(sentence1) >= 3) return sentence1;
  const clause = t.split(/[,;(]\s|\s[–—]\s/)[0].trim();
  if (clause.length <= max && wordCount(clause) >= 4) return stop(clause);
  // Drop a trailing qualifier ("… option under "Refill now"") so the caption stays a sentence.
  const cuts = [...t.matchAll(/\s(?:under|above|below|next to|with|for|in|on|at|after|before|until|when|while|so|and|which|where|from|beyond|than|without|into|via|through|because)\s/gi)]
    .map(x => t.slice(0, x.index).trim()).filter(x => x.length <= max && wordCount(x) >= 4);
  if (cuts.length) return stop(cuts[cuts.length - 1]);
  let out = "";
  for (const w of t.split(" ")) { if (`${out} ${w}`.trim().length > max - 1) break; out = `${out} ${w}`.trim(); }
  return `${out.replace(/[,;:.\-–—]+$/, "")}…`;
}

/** The first sentence of a text (for one-line labels such as the trigger). */
export function firstSentenceOf(s: string): string {
  return firstSentence(oneLine(s));
}

/** Where the offer lives, in words: an existing screen's name, or the new surface the proposal adds. */
export function surfaceLabel(p: Proposal, m: ProductModel): string {
  if (m.screens.some(s => s.id === p.surface)) return screenName(m, p.surface);
  const ns = p.patch.newScreens.find(s => s.id === p.surface);
  if (!ns) return p.anchor.newMechanic?.name ?? p.surface;
  const name = firstQuoted(ns.change) ?? p.anchor.newMechanic?.name ?? `new ${ns.kind}`;
  return `${name} (new ${ns.kind === "screen" ? "screen" : ns.kind}${ns.basedOn ? ` on ${screenName(m, ns.basedOn)}` : ""})`;
}

/** Captions are at most 12 words (E5); longer proposer copy is cut at a word boundary. */
export function clampWords(s: string, n = 12): string {
  const w = oneLine(s).split(" ").filter(Boolean);
  if (w.length <= n) return w.join(" ");
  return w.slice(0, n).join(" ").replace(/[,;:.\-–—]+$/, "") + "…";
}

export function clip(s: string, n: number): string {
  const t = oneLine(s);
  return t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…";
}

export const oneLine = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
const firstSentence = (s: string) => (/^(.+?[.!?])(\s|$)/.exec(s)?.[1] ?? s);

// ---------------------------------------------------------------------------------------------- economics copy
/** `stat` is the big number, `text` the full reasoning (details), `line` one sentence for the flow slide's rail. */
export interface WhyBullet { stat: string; text: string; line: string }

/** "Why this works": exactly three bullets, each led by a number computed in code (T10, E5g). */
export function whyBullets(p: Proposal, m: ProductModel, e: ProposalEconomics): WhyBullet[] {
  const d = m.economy.derived ?? deriveEconomy(m.economy);
  const res = resourceOf(m, p.reward.resource);
  const unit = res ? unitOf(res) : "";
  const upv = res ? d.unitsPerView.find(u => u.resource === res.id) : undefined;
  const amount = p.reward.amount;
  const out: WhyBullet[] = [];

  // 1. The exchange rate: what one completed view is worth, in the app's own currency.
  if (upv && amount != null) {
    const equiv = sinkEquivalent(m, res!.id, amount);
    const ratio = e.rewardToViewRatio != null ? ` (${e.rewardToViewRatio}× one view)` : "";
    out.push({
      stat: `1 view ≈ ${num(upv.min)}–${num(upv.max)} ${unit}`,
      text: `A completed US view is worth ${num(upv.min)}–${num(upv.max)} ${unit} ${upv.basis === "cost-to-serve" ? "at cost to serve (the app shows no prices)" : "at list price"}. The reward is ${amount} ${unit}${ratio}${equiv ? `, enough for ${equiv}` : ""}.`,
      line: `The reward is ${amount} ${unit}${ratio}${equiv ? `, enough for ${equiv}` : ""}.`,
    });
  } else {
    out.push({
      stat: `$${e.viewValueUsd[0]}–$${e.viewValueUsd[1]} per view`,
      text: `Revenue per completed US view after a ${ECON.nonGameHaircut * 100}% non-game haircut; the reward (${clip(p.reward.what, 60)}) costs ≈ $${e.cogsPerViewUsd} to serve.`,
      line: `Earned per completed US view; the reward costs ≈ $${e.cogsPerViewUsd} to serve.`,
    });
  }

  // 2. Cannibalization: the most a user can earn in a day against the cheapest thing they could buy.
  const pack = cheapestPack(m, res?.id);
  const dailyUnits = amount != null ? amount * p.caps.perDay : null;
  if (pack && dailyUnits && pack.grants.amount) {
    const x = pack.grants.amount / dailyUnits;
    out.push(x >= 1
      ? { stat: `1 pack = ${num(x)} days of ads`, text: `The cheapest pack (${pack.label}, ${pack.priceText}) equals ${num(x)} days of the most ads can earn (${dailyUnits} ${unit} a day at ${p.caps.perDay}/day), so buying stays the fast path.`,
          line: `The cheapest pack (${pack.priceText}) outlasts ${num(x)} days of capped ad rewards, so buying stays the fast path.` }
      : { stat: `A day of ads > cheapest pack`, text: `Daily ad earnings (${dailyUnits} ${unit}) exceed the cheapest pack (${pack.label}); guard: ${clip(p.cannibalizationGuard, 90)}`,
          line: `Capped daily ad rewards (${dailyUnits} ${unit}) exceed the cheapest pack; the guard is on the details slide.` });
  } else if (e.maxDailyEarnUsdAtList != null && e.cheapestPaidUnitUsd != null) {
    const pct = (e.maxDailyEarnUsdAtList / e.cheapestPaidUnitUsd) * 100;
    out.push({ stat: `${Math.round(pct)}% of the cheapest pack`, text: `Max earnable per day ≈ $${e.maxDailyEarnUsdAtList.toFixed(2)} at list vs $${e.cheapestPaidUnitUsd.toFixed(2)} for the cheapest pack.`,
      line: `A full day of ads earns ≈ $${e.maxDailyEarnUsdAtList.toFixed(2)} at list, below the cheapest pack.` });
  } else {
    out.push({ stat: "Paid path untouched", text: clip(p.cannibalizationGuard, 150), line: firstSentence(clip(p.cannibalizationGuard, 120)) });
  }

  // 3. Caps and eligibility: how often, and for whom.
  out.push({
    stat: `≤ ${p.caps.perDay} a day`,
    text: `Opt-in only, ${p.caps.cooldownMin} min apart. Eligible: ${clip(p.eligibility, 110)}`,
    line: `Opt-in only, at least ${p.caps.cooldownMin} min apart; nothing plays unless the user taps.`,
  });
  return out;
}

/** "10 credits = one message in Basic": the reward translated into what users spend it on. */
export function sinkEquivalent(m: ProductModel, resource: string, amount: number): string {
  const sinks = m.economy.sinks.filter(s => s.resource === resource && s.amount > 0).sort((a, b) => a.amount - b.amount);
  const parts = sinks.slice(0, 2).map(s => ({ n: Math.floor(amount / s.amount), s })).filter(x => x.n > 0)
    .map(x => sinkUse(x.s.action, x.n, x.s.context));
  return parts.join(" or ");
}

/** "10 credits per message in Basic" / "30 credits to generate an image". */
export function sinkLine(s: { action: string; amount: number; context?: string }, unit: string): string {
  const noun = actionNoun(s.action);
  const mode = modeName(s.context);
  return `${s.amount} ${unit} ${noun ? `per ${noun}` : `to ${midSentence(s.action)}`}${mode ? ` in ${mode}` : ""}`;
}

export function cheapestPack(m: ProductModel, resource?: string) {
  return m.economy.offers
    .filter(o => o.kind === "pack" && o.priceUsd != null && (!resource || o.grants.resource === resource))
    .sort((a, b) => (a.priceUsd as number) - (b.priceUsd as number))[0];
}

export interface EconRow { label: string; value: string }
/** The details-slide economics table. Everything here is code output (model/economics.ts). */
export function econTable(p: Proposal, m: ProductModel, e: ProposalEconomics): EconRow[] {
  const res = resourceOf(m, p.reward.resource);
  const unit = res ? unitOf(res) : "";
  const rows: EconRow[] = [
    { label: "Revenue per completed US view", value: `$${e.viewValueUsd[0]}–$${e.viewValueUsd[1]}` },
  ];
  const ex = res ? exchangeRateLine(m, res.id) : null;
  if (ex) rows.push({ label: "Exchange rate", value: ex.replace(/^1 completed US view ≈ /, "1 view ≈ ") });
  rows.push({ label: "Reward value at list price", value: e.rewardValueUsdAtList != null ? `$${e.rewardValueUsdAtList} (${p.reward.amount} ${unit})` : "n/a (no priced unit)" });
  rows.push({ label: "Reward ÷ one view", value: e.rewardToViewRatio != null ? `${e.rewardToViewRatio}×` : "n/a" });
  rows.push({ label: `Max earnable per day (${p.caps.perDay}/day)`, value: e.maxDailyEarnUsdAtList != null ? `$${e.maxDailyEarnUsdAtList}` : "n/a" });
  rows.push({ label: "Cheapest pack", value: e.cheapestPaidUnitUsd != null ? `$${e.cheapestPaidUnitUsd}` : "none observed" });
  rows.push({ label: "Cost to serve the reward", value: `$${e.cogsPerViewUsd} per view` });
  return rows;
}

// ---------------------------------------------------------------------------------------------- money today
export interface MoneyStage { key: "sources" | "balance" | "sinks" | "wall" | "store"; title: string; screen?: string; facts: string[] }

/** Sources -> balance -> sinks -> wall -> store, from observed economy items only. */
export function moneyToday(m: ProductModel): MoneyStage[] {
  const e = m.economy;
  const r = (id?: string) => resourceOf(m, id);
  const u = (id?: string) => { const x = r(id); return x ? unitOf(x) : ""; };
  const sinkScreen = (edges: string[]) => m.edges.find(g => edges.includes(g.id))?.from;
  const daily = e.sources.find(s => s.cadence === "daily" && s.screen) ?? e.sources.find(s => s.screen);
  const stages: MoneyStage[] = [
    { key: "sources", title: "Earn", screen: daily?.screen,
      facts: e.sources.map(s => `${s.amount != null ? `+${s.amount} ${u(s.resource)}` : cap(u(s.resource) || "units")}, ${s.cadence}: ${s.how}`) },
    { key: "balance", title: "Balance", screen: e.resources.flatMap(x => x.shownOn)[0]?.screen,
      facts: e.resources.map(x => `${cap(x.name)} (${x.kind})${x.shownOn.length ? `, shown on ${uniq(x.shownOn.map(s => screenName(m, s.screen))).join(", ")}` : ""}${x.observedValues.length ? `; seen ${x.observedValues.slice(0, 4).join(", ")}` : ""}`) },
    { key: "sinks", title: "Spend", screen: e.sinks.map(s => sinkScreen(s.edges)).find(Boolean),
      facts: e.sinks.map(s => sinkLine(s, u(s.resource))) },
    { key: "wall", title: "Hit the wall", screen: e.walls[0]?.shows,
      facts: e.walls.map(w => `“${screenName(m, w.shows)}” stops “${w.blockedIntent}”${w.resource ? ` when ${r(w.resource)?.name ?? "the balance"} run out` : ""}${w.offers.length ? `; offers ${w.offers.length} pack${w.offers.length > 1 ? "s" : ""}` : ""}`) },
    { key: "store", title: "Buy", screen: e.offers[0]?.screen,
      facts: e.offers.map(o => `${o.label}: ${o.priceText}${o.kind !== "pack" ? ` (${o.kind})` : ""}`).concat(e.entitlements.map(x => `${x.plan}: ${x.benefits.slice(0, 2).join(", ")}`)) },
  ];
  for (const s of stages) if (!s.facts.length) s.facts = ["Not observed"];
  return stages;
}

// ---------------------------------------------------------------------------------------------- rejected table
export interface IdeaRow { id: string; title: string; case: string; verdict: Verdict | "not judged"; weighted: number | null; reason: string; flowSlide?: number }

/** Every judged candidate with its verdict and a one-line reason; SHIP rows point at their flow slide. */
export function ideaRows(cands: Candidates, j: Judgments, flowSlideOf: Map<string, number>): IdeaRow[] {
  const finals = new Map(latestFinals(j).map(f => [f.proposalId, f]));
  const ids = uniq([...finals.keys(), ...cands.proposals.map(p => p.id)]);
  const rank: Record<string, number> = { SHIP: 0, REVISE: 1, REJECT: 2, "not judged": 3 };
  return ids.map(id => {
    const f = finals.get(id);
    const p = resolveProposal(cands, id, f?.version);
    const last = roundsOf(j, id).at(-1);
    const reason = oneLine(f?.summary) || oneLine(last?.topConcern) || oneLine(last?.reasons[0]) || (f ? "" : "Not reached by the judge.");
    return {
      id, title: p?.title ?? id, case: p?.case === "product-change" ? "Product change" : "Existing mechanic",
      verdict: (f?.verdict ?? "not judged") as IdeaRow["verdict"], weighted: f?.weighted ?? null,
      reason: clip(reason, 170), flowSlide: flowSlideOf.get(id),
    };
  }).sort((a, b) => rank[a.verdict] - rank[b.verdict] || (b.weighted ?? -1) - (a.weighted ?? -1) || a.id.localeCompare(b.id, "en", { numeric: true }));
}

/** Ideas the proposer brainstormed but did not develop into full proposals. */
export function undevelopedIdeas(cands: Candidates): string[] {
  const picked = new Set(cands.selected.map(s => s.index));
  const titles = new Set(cands.proposals.map(p => p.title.toLowerCase()));
  return cands.ideas.filter((x, i) => !picked.has(i) && !titles.has(x.title.toLowerCase())).map(x => x.title);
}

// ---------------------------------------------------------------------------------------------- judge history
export interface JudgeChange { rounds: string[]; diffs: { field: string; before: string; after: string }[] }

/** "What the judge changed": earlier rounds' required changes, plus a field diff when both versions exist. */
export function judgeChanges(p: Proposal, cands: Candidates, j: Judgments): JudgeChange | null {
  const rs = roundsOf(j, p.id);
  if (!(rs.length > 1 || p.version > 1)) return null;
  const stop = (x: string) => (x && !/[.!?…]$/.test(x) ? `${x}.` : x);
  const rounds = rs.slice(0, -1).map(r => `Round ${r.round} (v${r.version}) ${r.verdict}${r.weighted != null ? ` ${r.weighted.toFixed(2)}` : ""}: ${stop(clip(r.topConcern, 120))}${r.requiredChanges.length ? ` Required: ${stop(clip(r.requiredChanges.join("; "), 160))}` : ""}`);
  const v1 = cands.proposals.filter(x => x.id === p.id && x.version < p.version).sort((a, b) => a.version - b.version)[0];
  const diffs: JudgeChange["diffs"] = [];
  if (v1) {
    const fields: [string, (x: Proposal) => string][] = [
      ["trigger", x => x.trigger], ["eligibility", x => x.eligibility], ["reward", x => x.reward.amount != null && !x.reward.what.includes(String(x.reward.amount)) ? `${x.reward.amount} ${x.reward.what}` : x.reward.what],
      ["caps", x => `${x.caps.perDay}/day, ${x.caps.cooldownMin} min`], ["guard", x => x.cannibalizationGuard], ["offer", x => `${x.offer.title} / ${x.offer.cta}`],
    ];
    for (const [field, get] of fields) if (oneLine(get(v1)) !== oneLine(get(p))) diffs.push({ field, before: clip(get(v1), 90), after: clip(get(p), 90) });
  }
  return { rounds, diffs };
}

// ---------------------------------------------------------------------------------------------- style + names
/** The app's accent: the most saturated mid-lightness palette colour, weighted by how much it is used. */
export function accentOf(m: ProductModel): { accent: string; ink: string } {
  let best: { hex: string; score: number } | null = null;
  for (const c of m.design.palette) {
    const hsl = toHsl(c.hex);
    if (!hsl || hsl.s < 0.3 || hsl.l < 0.2 || hsl.l > 0.8) continue;
    const score = hsl.s * (0.5 + Math.sqrt(Math.max(c.share, 0)));
    if (!best || score > best.score) best = { hex: normHex(c.hex)!, score };
  }
  const accent = best?.hex ?? "#4F46E5";
  // Text on the accent: whichever of black/white has the higher WCAG contrast ratio.
  const L = luminance(accent);
  return { accent, ink: (L + 0.05) / 0.05 > 1.05 / (L + 0.05) ? "#111827" : "#FFFFFF" };
}

export function screenName(m: ProductModel, id: string | undefined): string {
  if (!id) return "";
  return m.screens.find(s => s.id === id)?.name ?? id;
}

export function resourceOf(m: ProductModel, id: string | undefined) {
  return id ? m.economy.resources.find(r => r.id === id || r.name === id) : undefined;
}
export const unitOf = (r: { unit: string; name: string }) => r.unit || r.name;

export function num(n: number): string {
  if (!Number.isFinite(n)) return "?";
  return n >= 10 ? Math.round(n).toLocaleString("en-US") : String(Math.round(n * 10) / 10);
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const uniq = <T>(xs: T[]) => [...new Set(xs)];

function normHex(hex: string): string | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split("").map(c => c + c).join("") : m[1];
  return `#${h.toUpperCase()}`;
}
function rgb(hex: string): [number, number, number] | null {
  const h = normHex(hex);
  if (!h) return null;
  return [0, 2, 4].map(i => parseInt(h.slice(1 + i, 3 + i), 16) / 255) as [number, number, number];
}
function toHsl(hex: string): { h: number; s: number; l: number } | null {
  const c = rgb(hex);
  if (!c) return null;
  const [r, g, b] = c, max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  return { h: 0, s, l };
}
function luminance(hex: string): number {
  const c = rgb(hex) ?? [0, 0, 0];
  const lin = c.map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
