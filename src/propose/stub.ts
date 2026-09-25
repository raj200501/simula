// The no-LLM proposer (`--llm stub`, `npm run demo`, tests). It is a real heuristic, not a dummy:
// each template is a KB archetype instantiated against the product model's own anchors (the wall,
// the decline, the hub, the check-in, the chat), with rewards sized in code by the exchange rate.
//   wall        -> refill via a rewarded game sized to one cheapest action       [TAX-1]
//   decline     -> paywall-decline fallback card, shown only after "not now"    [TAX-10]
//   hub         -> proactive refill station next to the balance                  [AI-2]
//   post-reward -> 2x the daily source                                           [TAX-5]
//   desire      -> sample the premium mode for one reply                         [AI-4]
//   product changes (every regime; the only kind when nothing is scarce): daily tasks [TAX-9],
//   sponsored sessions [TAX-11], scene-end game [AI-12], wait-or-watch bonus [TAX-3], cosmetic [TAX-13]...
// Output is marked generatedBy "stub" by the caller. Every id it emits comes from resolveAnchors().
import type { Candidates, Moment, ProductModel, Proposal, Screen, UiElement } from "../core/schema.ts";
import type { Profile } from "../core/config.ts";
import { proposalEconomics } from "../model/economics.ts";
import { elText, resolveAnchors, type Anchors, type Cogs } from "./anchors.ts";
import { midSentence, modeName } from "../core/humanize.ts";
import type { LlmIdea } from "./schemas.ts";

export interface Params { amount?: number; perDay: number; cooldownMin: number; cogsUnits: number; minutes?: number }

export interface Template {
  key: string;
  idea: LlmIdea;
  why: string;
  defaults: Params;
  build(pid: string, p: Params): Proposal;
}

type Board = Proposal["storyboard"][number];
type Callout = { node: string; text: string };

const SEC = 15; // Simula default minPlayThreshold [POL-8]
const ELIG = "Non-payers only (no purchase in the last 30 days), returning users from their second session on; suppressed for 24 h after any purchase and never shown to subscribers [TRIG-2] [CANN-4].";

// Priority for the depth pick: diversity first (reactive, proactive, product change), then the rest.
const PICK_ORDER = ["wall-refill", "wall-unlock", "post-reward-multiplier", "daily-tasks", "sponsored-session", "decline-fallback", "decline-sample",
  "premium-sample", "desire-unlock", "hub-refill", "scene-end-game", "pre-session", "bonus-pass", "tasks-bonus", "wait-or-watch", "cosmetic"];

function phase(p: Board["phase"], screen: Screen, counters: [string, number][], overlay: Board["overlay"], callouts: Callout[], caption: string): Board {
  return { phase: p, screen: screen.id, counters: counters.map(([resource, value]) => ({ resource, value })), overlay, callouts, caption };
}

/** A callout only when the element really is on that screen (grounding is checked by the judge). */
function co(screen: Screen | undefined, el: UiElement | undefined, text: string): Callout[] {
  return screen && el && screen.elements.some(e => e.id === el.id) ? [{ node: el.id, text }] : [];
}

function kpis(primary: string): Proposal["kpis"] {
  return {
    primary,
    guardrails: ["Pack / subscription conversion per DAU non-inferior to holdout within -3% relative [MEAS-5]", "D7 retention and sessions per DAU", "Declines followed by churn; ad-related complaints"],
    holdout: "10% user-level holdout never sees the offer for 4 weeks (intent-to-treat) [MEAS-5]",
  };
}

function evidenceFor(m: ProductModel, moments: (Moment | undefined)[], economyIds: (string | undefined)[]): Proposal["evidence"] {
  const e = m.economy;
  const items: { id: string; evidence: Proposal["evidence"] }[] = [...e.resources, ...e.sinks, ...e.sources, ...e.offers, ...e.walls];
  const out = [
    ...moments.flatMap(x => x?.evidence.slice(0, 1) ?? []),
    ...economyIds.flatMap(id => items.find(i => i.id === id)?.evidence.slice(0, 1) ?? []),
  ];
  const seen = new Set<string>();
  return out.filter(x => { const k = `${x.obs}|${x.quote ?? ""}`; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 5);
}

const ids = (...xs: (string | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x))];

/** Every template that applies to this model, in PICK_ORDER. */
export function templates(m: ProductModel, a: Anchors = resolveAnchors(m)): Template[] {
  const T: Template[] = [];
  const res = a.res, s = a.sized;
  const u = (n: number) => `${n} ${res?.unit ?? "units"}`;
  // The Game Partner is who the user already talks to (the chat's character or persona), else the app.
  const partner = a.partner;
  const Cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
  const cheapest = a.cheapestOffer ? `${a.cheapestOffer.label} for ${a.cheapestOffer.priceText}` : "the cheapest pack";
  const guard = (lead: string) => `${lead} Non-payers only; capped per day; the grant screen repeats the paid option (${cheapest}); a remote-config kill switch rolls it back if paid conversion drops [CANN-4].`;
  const baseBalance = (m.economy.resources.find(r => r.id === res?.id)?.observedValues[0]) ?? 0;
  const resourceReward = (amt: number): Proposal["reward"] => ({ what: `+${u(amt)}`, resource: res!.id, amount: amt, grantOn: "REWARD_VERIFIED" });
  const cogs: Cogs = s?.cogs ?? "none";

  // --- existing opportunities ------------------------------------------------------------------
  const w = a.wall;
  if (w && res && s && w.moment.resource === res.id) {
    const origin = w.from ?? w.screen;
    const upsell = elText(w.upsellEl) || "the paid option";
    T.push({
      key: "wall-refill", why: "Highest-intent reactive moment: the user is blocked on the core loop and the reward is the blocked resource.",
      idea: { title: `Refill game on "${w.screen.name}"`, case: "existing", archetype: "TAX-1", moment: w.moment.id, reward: `+${u(s.amount)} (${s.buys})`, beyondBaseline: false },
      defaults: { amount: s.amount, perDay: 3, cooldownMin: 10, cogsUnits: s.cogsUnits },
      build: (pid, p) => {
        const amt = p.amount ?? s.amount;
        const before = Math.max(0, (w.blockedCost ?? amt) - amt);
        return {
          id: pid, version: 1, title: `Refill game on "${w.screen.name}"`, case: "existing", archetype: "TAX-1", beyondBaseline: false,
          oneLiner: `When ${res.name} run out and the user tries to ${midSentence(w.blockedIntent)}, ${w.screen.name} offers a ${SEC}-second game for +${u(amt)} (${s.buys}) under "${upsell}".`,
          anchor: { moments: [w.moment.id], economy: ids(res.id, w.item?.id, a.cheapSink?.id) },
          surface: w.screen.id,
          trigger: `${w.screen.name} opens because ${res.name} are below what it costs to ${midSentence(w.blockedIntent)}${w.blockedCost ? ` (${u(w.blockedCost)})` : ""}. The offer sits under "${upsell}", appears only after the previous reply has finished, and the typed draft stays in the composer.`,
          eligibility: ELIG,
          offer: { title: `Out of ${res.name}`, body: `Play a ${SEC}-second game to get +${u(amt)}, enough for ${s.buys}. ${p.perDay} per day.`, cta: `Play for +${amt}`, decline: "No thanks" },
          simula: { unit: "SIM-RWD", entry: "button", gamePartner: partner, minPlaySec: SEC },
          reward: resourceReward(amt),
          caps: { perDay: p.perDay, cooldownMin: p.cooldownMin },
          cannibalizationGuard: guard(`"${upsell}" stays the first, dominant button; one view grants ${u(amt)}, a small slice of ${cheapest}.`),
          assumptions: { engagedShare: 0.25, viewsPerEngager: 1.5, cogs, cogsUnitsPerView: p.cogsUnits },
          kpis: kpis(`Rewarded refills per DAU at ${w.screen.name}, and total revenue per user (ads + packs) against the holdout`),
          precedents: ["TAX-1", "AI-1", "EX-DUO", "TRIG-5"],
          risks: ["Some would-be pack buyers take the free refill instead: watch pack conversion at the wall.", "No fill: show \"No game available right now\" and keep the paid option."],
          evidence: evidenceFor(m, [w.moment], [res.id, w.item?.id, a.cheapSink?.id]),
          patch: {
            newScreens: [],
            newElements: [{ id: "ne1", in: w.screen.id, near: w.upsellEl?.id, place: "after", change: `Secondary button "▶ Play ${SEC} s for +${u(amt)}" with "${p.perDay} left today", under "${upsell}"` }],
            newEdges: [{ from: w.screen.id, el: "ne1", to: "rwd", effects: [{ resource: res.id, delta: amt }] }],
          },
          storyboard: [
            phase("today", origin, [[res.id, before]], "none", co(origin, a.desire?.modeEl, `Next message: ${u(w.blockedCost ?? amt)}`), `${Cap(res.name)} at ${before}: not enough to ${midSentence(w.blockedIntent)}.`),
            phase("change", w.screen, [[res.id, before]], "none", [{ node: "ne1", text: `NEW: play ${SEC} s for +${u(amt)}` }], `${w.screen.name} gains a secondary rewarded option under "${upsell}".`),
            phase("offer", w.screen, [], "invite", [{ node: "ne1", text: "Opt-in tap; reward and length disclosed" }], `"Play for +${amt}" or "No thanks", which returns to ${origin.name} with the draft kept.`),
            phase("ad", w.screen, [], "game", [], `A ${SEC}-second mini-game with ${partner}; the grant waits for REWARD_VERIFIED.`),
            phase("value", origin, [[res.id, before + amt]], "verified", co(origin, a.chat?.inputEl, "Draft still here: tap Send"), `+${u(amt)}: ${res.name} at ${before + amt}. Back in ${origin.name}.`),
          ],
        };
      },
    });
  }

  const pr = a.postReward;
  const srcAmt = pr?.source?.amount ?? undefined;
  if (pr && res && srcAmt && pr.source?.resource === res.id) {
    const home = pr.parent ?? a.hub?.screen ?? pr.screen;
    const claim = elText(pr.claimEl) || "Claim";
    const units0 = a.cheapSink ? Math.round((srcAmt / a.cheapSink.amount) * 100) / 100 : 0;
    T.push({
      key: "post-reward-multiplier", why: "Proactive and non-interruptive: a positive, post-claim moment every day, on free value that already exists.",
      idea: { title: `Double today's ${pr.screen.name}`, case: "existing", archetype: "TAX-5", moment: pr.moment.id, reward: `+${u(srcAmt)} (2x the ${pr.screen.name})`, beyondBaseline: true },
      defaults: { amount: srcAmt, perDay: 1, cooldownMin: 0, cogsUnits: units0 },
      build: (pid, p) => {
        const amt = p.amount ?? srcAmt;
        const doubles = amt === srcAmt;
        return {
          id: pid, version: 1, case: "existing", archetype: "TAX-5", beyondBaseline: true,
          title: doubles ? `Double today's ${pr.screen.name}` : `Bonus game after ${pr.screen.name}`,
          oneLiner: doubles
            ? `Right after "${claim}" (+${u(srcAmt)}), a ${SEC}-second game doubles it: another +${u(amt)}.`
            : `Right after "${claim}" (+${u(srcAmt)}), a ${SEC}-second game adds a +${u(amt)} bonus (${s?.buys ?? "one action"}).`,
          anchor: { moments: [pr.moment.id], economy: ids(res.id, pr.source?.id) },
          surface: pr.screen.id,
          trigger: `Immediately after the user taps "${claim}" on ${pr.screen.name}; once per day, never before the claim.`,
          eligibility: ELIG,
          offer: {
            title: doubles ? `Double it?` : `Bonus ${res.name}?`,
            body: doubles ? `Play a ${SEC}-second game to get another +${u(amt)} today.` : `Play a ${SEC}-second game to get a +${u(amt)} bonus on top of today's +${srcAmt}.`,
            cta: `Play for +${amt}`, decline: "No thanks",
          },
          simula: { unit: "SIM-RWD", entry: "button", gamePartner: partner, minPlaySec: SEC },
          reward: resourceReward(amt),
          caps: { perDay: p.perDay, cooldownMin: p.cooldownMin },
          cannibalizationGuard: guard(`The base +${u(srcAmt)} stays free and unconditional; the bonus is once per day.`),
          assumptions: { engagedShare: 0.35, viewsPerEngager: 1, cogs, cogsUnitsPerView: p.cogsUnits },
          kpis: kpis(`Share of ${pr.screen.name} claims followed by a completed bonus game, and total revenue per user against the holdout`),
          precedents: ["TAX-5", "AI-14", "EX-DUO"],
          risks: ["A generous bonus lowers the need to buy packs: size it with the exchange rate."],
          evidence: evidenceFor(m, [pr.moment], [pr.source?.id, res.id]),
          patch: {
            newScreens: [],
            newElements: [{ id: "ne1", in: pr.screen.id, near: pr.claimEl?.id, place: "after", change: `"▶ ${doubles ? "Double it" : "Bonus"}: play ${SEC} s for +${u(amt)}" shown after "${claim}"` }],
            newEdges: [{ from: pr.screen.id, el: "ne1", to: "rwd", effects: [{ resource: res.id, delta: amt }] }],
          },
          storyboard: [
            phase("today", pr.screen, [[res.id, baseBalance]], "none", co(pr.screen, pr.claimEl, `Claim +${srcAmt}`), `The daily ${pr.screen.name} gives +${u(srcAmt)}.`),
            phase("change", pr.screen, [[res.id, baseBalance + srcAmt]], "none", [{ node: "ne1", text: `NEW: ${doubles ? "double it" : "bonus"} for one game` }], `After the claim, a rewarded ${doubles ? "doubling" : "bonus"} option appears.`),
            phase("offer", pr.screen, [], "invite", [{ node: "ne1", text: "Opt-in; reward disclosed" }], `"Play for +${amt}" or "No thanks"; the base reward is kept either way.`),
            phase("ad", pr.screen, [], "game", [], `A ${SEC}-second mini-game; grant on REWARD_VERIFIED.`),
            phase("value", home, [[res.id, baseBalance + srcAmt + amt]], "verified", co(home, a.hub?.balanceEl, `+${amt} more`), `${Cap(res.name)} at ${baseBalance + srcAmt + amt} on ${home.name}.`),
          ],
        };
      },
    });
  }

  const dec = a.decline;
  if (dec && res && s) {
    const surface = dec.to ?? dec.screen;
    const said = elText(dec.declineEl) || "Not now";
    const input = surface.id === a.chat?.screen.id ? a.chat.inputEl : undefined;
    const before = Math.max(0, (w?.blockedCost ?? s.amount) - s.amount);
    T.push({
      key: "decline-fallback", why: "Self-selects users with low willingness to pay after they have seen the price; the paid refill stays first.",
      idea: { title: `Fallback offer after "${said}"`, case: "existing", archetype: "TAX-10", moment: dec.moment.id, reward: `+${u(s.amount)} once after declining`, beyondBaseline: true },
      defaults: { amount: s.amount, perDay: 2, cooldownMin: 60, cogsUnits: s.cogsUnits },
      build: (pid, p) => {
        const amt = p.amount ?? s.amount;
        return {
          id: pid, version: 1, title: `Fallback offer after "${said}"`, case: "existing", archetype: "TAX-10", beyondBaseline: true,
          oneLiner: `Only after the user taps "${said}" on ${dec.screen.name}, ${surface.name} shows a one-time card: play ${SEC} s for +${u(amt)}.`,
          anchor: { moments: [dec.moment.id], economy: ids(res.id, w?.item?.id) },
          surface: surface.id,
          trigger: `The user dismisses ${dec.screen.name} with "${said}" and lands back on ${surface.name}; the card appears once per session, after any reply has finished.`,
          eligibility: `Only users who just declined the paid refill; ${ELIG}`,
          offer: { title: "Not ready to buy?", body: `Play a ${SEC}-second game for +${u(amt)}, or carry on without it.`, cta: `Play for +${amt}`, decline: "Dismiss" },
          simula: { unit: "SIM-RWD", entry: "button", gamePartner: partner, minPlaySec: SEC },
          reward: resourceReward(amt),
          caps: { perDay: p.perDay, cooldownMin: p.cooldownMin },
          cannibalizationGuard: guard(`Shown only after the paid option was seen and declined, so the paywall stays the first and dominant choice [TAX-10].`),
          assumptions: { engagedShare: 0.12, viewsPerEngager: 1.2, cogs, cogsUnitsPerView: p.cogsUnits },
          kpis: kpis(`Fallback opt-in rate among decliners, and total revenue per user against the holdout`),
          precedents: ["TAX-10", "AI-15", "EX-MUSIC", "CANN-4"],
          risks: ["Users could learn to decline to get the fallback: keep it smaller than the wall reward's daily cap and once per session."],
          evidence: evidenceFor(m, [dec.moment, w?.moment], [w?.item?.id, res.id]),
          patch: {
            newScreens: [],
            newElements: [{ id: "ne1", in: surface.id, near: input?.id, place: "before", change: `One-time inline card "Not ready to buy? Play ${SEC} s for +${u(amt)}" with Play / Dismiss, shown after "${said}"` }],
            newEdges: [{ from: surface.id, el: "ne1", to: "rwd", effects: [{ resource: res.id, delta: amt }] }],
          },
          storyboard: [
            phase("today", dec.screen, [[res.id, before]], "none", co(dec.screen, dec.declineEl, `User taps "${said}"`), `The user sees the paid refill and declines.`),
            phase("change", surface, [[res.id, before]], "none", [{ node: "ne1", text: "NEW: one-time fallback card" }], `Back on ${surface.name}, a small card offers a free path once.`),
            phase("offer", surface, [], "invite", [{ node: "ne1", text: "Reward and length disclosed" }], `"Play for +${amt}" or "Dismiss" (the card disappears, nothing else changes).`),
            phase("ad", surface, [], "game", [], `A ${SEC}-second mini-game; grant on REWARD_VERIFIED.`),
            phase("value", surface, [[res.id, before + amt]], "verified", co(surface, input, "Carry on"), `+${u(amt)}: back exactly where the user was.`),
          ],
        };
      },
    });
  }

  const des = a.desire;
  const prem = a.premiumSink, cheapSink = a.cheapSink;
  if (des && res && prem && cheapSink && (!des.moment.resource || des.moment.resource === res.id)) {
    const premLabel = prem.context ? modeName(prem.context) : `the ${prem.amount}-${res.unit} mode`;
    const cheapLabel = cheapSink.context ? modeName(cheapSink.context) : "the standard mode";
    const pc: Cogs = cogs === "none" ? "none" : "text-premium";
    T.push({
      key: "premium-sample", why: "Samples the premium mode at the moment of desire: a taste that shows the paid difference [CANN-1].",
      idea: { title: `Try the next reply in ${premLabel}`, case: "existing", archetype: "AI-4", moment: des.moment.id, reward: `One ${premLabel} reply at no ${res.name} cost`, beyondBaseline: true },
      defaults: { amount: prem.amount, perDay: 2, cooldownMin: 60, cogsUnits: 1 },
      build: (pid, p) => {
        const amt = p.amount ?? prem.amount;
        return {
          id: pid, version: 1, title: `Try the next reply in ${premLabel}`, case: "existing", archetype: "AI-4", beyondBaseline: true,
          oneLiner: `Under a finished ${cheapLabel} reply, a chip offers the next reply in ${premLabel} for one ${SEC}-second game instead of ${u(prem.amount)}.`,
          anchor: { moments: [des.moment.id], economy: ids(res.id, prem.id, cheapSink.id) },
          surface: des.screen.id,
          trigger: `After a ${cheapLabel} reply has fully finished (never mid-stream), at most once per conversation.`,
          eligibility: ELIG,
          offer: { title: `Try ${premLabel}?`, body: `Play a ${SEC}-second game and your next reply uses ${premLabel} at no ${res.name} cost (worth ${u(amt)}).`, cta: "Play and upgrade", decline: "Keep current mode" },
          simula: { unit: "SIM-RWD", entry: "button", gamePartner: partner, minPlaySec: SEC },
          reward: { what: `One ${premLabel} reply at no ${res.name} cost (worth ${u(amt)})`, resource: res.id, amount: amt, grantOn: "REWARD_VERIFIED" },
          caps: { perDay: p.perDay, cooldownMin: p.cooldownMin },
          cannibalizationGuard: guard(`One reply per view, twice a day: a sample of ${premLabel}, never a session of it.`),
          assumptions: { engagedShare: 0.15, viewsPerEngager: 1.2, cogs: pc, cogsUnitsPerView: p.cogsUnits },
          kpis: kpis(`Share of sampled users who later spend ${res.name} on ${premLabel}, against the holdout`),
          precedents: ["AI-4", "TAX-2", "CANN-1"],
          risks: [`${premLabel} replies cost more to serve than ${cheapLabel}: check COGS per view.`],
          evidence: evidenceFor(m, [des.moment], [prem.id, cheapSink.id]),
          patch: {
            newScreens: [],
            newElements: [{ id: "ne1", in: des.screen.id, near: des.modeEl?.id, place: "after", change: `Chip "✨ Next reply in ${premLabel}: play ${SEC} s" under the finished reply` }],
            newEdges: [{ from: des.screen.id, el: "ne1", to: "rwd", effects: [{ resource: res.id, delta: amt }] }],
          },
          storyboard: [
            phase("today", des.screen, [[res.id, baseBalance]], "none", co(des.screen, des.modeEl, `${premLabel} costs ${u(prem.amount)}`), `Chatting in ${cheapLabel}; ${premLabel} costs ${u(prem.amount)} per message.`),
            phase("change", des.screen, [[res.id, baseBalance]], "none", [{ node: "ne1", text: "NEW: sample chip" }], `A chip appears under the finished reply.`),
            phase("offer", des.screen, [], "invite", [{ node: "ne1", text: "Opt-in; reward disclosed" }], `"Play and upgrade" or "Keep current mode".`),
            phase("ad", des.screen, [], "game", [], `A ${SEC}-second game with ${partner}; grant on REWARD_VERIFIED.`),
            phase("value", des.screen, [[res.id, baseBalance]], "verified", co(des.screen, des.modeEl, `${premLabel} for this reply`), `The next reply uses ${premLabel}; the balance is untouched.`),
          ],
        };
      },
    });
  }

  const hub = a.hub;
  const threshold = prem?.amount ?? w?.blockedCost ?? (s ? s.amount * 3 : 0);
  if (hub && res && s) {
    const bal = hub.balanceEl ?? hub.anchorEl;
    T.push({
      key: "hub-refill", why: "Always-open proactive surface on the most visited screen; pairs with the reactive wall offer [TAX-X].",
      idea: { title: `Refill station on ${hub.screen.name}`, case: "existing", archetype: "AI-2", moment: hub.moment.id, reward: `+${u(s.amount)} from a refill station`, beyondBaseline: false },
      defaults: { amount: s.amount, perDay: 2, cooldownMin: 120, cogsUnits: s.cogsUnits },
      build: (pid, p) => {
        const amt = p.amount ?? s.amount;
        const low = Math.max(0, threshold - amt);
        return {
          id: pid, version: 1, title: `Refill station on ${hub.screen.name}`, case: "existing", archetype: "AI-2", beyondBaseline: false,
          oneLiner: `Next to the ${res.name} balance on ${hub.screen.name}, a "Free refill" pill opens a ${SEC}-second game for +${u(amt)} while the balance is low.`,
          anchor: { moments: [hub.moment.id], economy: ids(res.id, a.cheapSink?.id) },
          surface: hub.screen.id,
          trigger: `Visible on ${hub.screen.name} while ${res.name} < ${threshold}; the user taps it (nothing pops up on its own).`,
          eligibility: ELIG,
          offer: { title: `Free ${res.name} refill`, body: `Play a ${SEC}-second game for +${u(amt)}. ${p.perDay} per day.`, cta: `Play for +${amt}`, decline: "Not now" },
          simula: { unit: "SIM-RWD", entry: "button", minPlaySec: SEC },
          reward: resourceReward(amt),
          caps: { perDay: p.perDay, cooldownMin: p.cooldownMin },
          cannibalizationGuard: guard(`Only while the balance is below ${u(threshold)}, ${p.perDay} per day.`),
          assumptions: { engagedShare: 0.2, viewsPerEngager: 1.3, cogs, cogsUnitsPerView: p.cogsUnits },
          kpis: kpis(`Refill-station views per DAU and total revenue per user against the holdout`),
          precedents: ["AI-2", "TRIG-1", "TAX-1"],
          risks: ["Proactive refills can pre-empt the wall offer: share one daily cap across both."],
          evidence: evidenceFor(m, [hub.moment], [res.id]),
          patch: {
            newScreens: [],
            newElements: [{ id: "ne1", in: hub.screen.id, near: bal?.id, place: "after", change: `"Free refill ▶ +${u(amt)}" pill next to the balance, visible below ${threshold}` }],
            newEdges: [{ from: hub.screen.id, el: "ne1", to: "rwd", effects: [{ resource: res.id, delta: amt }], guard: { resource: res.id, lt: threshold } }],
          },
          storyboard: [
            phase("today", hub.screen, [[res.id, low]], "none", co(hub.screen, bal, `Only ${low} left`), `${Cap(res.name)} running low on ${hub.screen.name}.`),
            phase("change", hub.screen, [[res.id, low]], "none", [{ node: "ne1", text: "NEW: refill station" }], `A refill pill appears next to the balance.`),
            phase("offer", hub.screen, [], "invite", [{ node: "ne1", text: "Tap to open; reward disclosed" }], `"Play for +${amt}" or "Not now".`),
            phase("ad", hub.screen, [], "game", [], `A ${SEC}-second mini-game; grant on REWARD_VERIFIED.`),
            phase("value", hub.screen, [[res.id, low + amt]], "verified", co(hub.screen, bal, `+${amt}`), `Balance at ${low + amt}.`),
          ],
        };
      },
    });
  }

  // Walls and desires with no priced resource (paywalls, locked features): a short time-boxed unlock
  // of exactly the blocked thing [TAX-2]; nothing that is free today is taken away.
  const unlockOn: { key: string; archetype: string; mo: Moment; screen: Screen; what: string; el?: UiElement }[] = [];
  if (w && !(res && s && w.moment.resource === res.id)) unlockOn.push({ key: "wall-unlock", archetype: "TAX-2", mo: w.moment, screen: w.screen, what: w.blockedIntent, el: w.upsellEl });
  const plan = m.economy.entitlements[0];
  if (dec && !(res && s) && plan) unlockOn.push({ key: "decline-sample", archetype: "TAX-10", mo: dec.moment, screen: dec.to ?? dec.screen, what: `${plan.plan}: ${plan.benefits[0] ?? "its benefits"}` });
  // A locked feature is a clean time-unlock anchor; a priced consumable is better served by the refill templates.
  const lockMo = m.moments.filter(x => x.type === "desire" && !x.noOffer).map(x => ({ x, screen: m.screens.find(sc => sc.id === x.screen)! }))
    .map(({ x, screen }) => ({ x, screen, sig: screen?.signals.find(g => g.kind === "lock" || (!s && (g.kind === "upsell" || g.kind === "price"))) }))
    .find(o => o.screen && o.sig);
  if (lockMo) unlockOn.push({ key: "desire-unlock", archetype: "TAX-2", mo: lockMo.x, screen: lockMo.screen, what: lockMo.sig!.text, el: lockMo.screen.elements.find(e => e.id === lockMo.sig!.el) });
  for (const x of unlockOn) {
    const what = `"${x.what.slice(0, 40)}" unlocked`;
    T.push({
      key: x.key, why: "Reactive moment of need on a gated feature: a time-boxed taste, the paid plan stays the only unlimited path [TAX-2].",
      idea: { title: `Play to unlock ${x.what.slice(0, 40)} for a while`, case: "existing", archetype: x.archetype, moment: x.mo.id, reward: `${what} for 30 minutes`, beyondBaseline: true },
      defaults: { perDay: 1, cooldownMin: 0, cogsUnits: 0, minutes: 30 },
      build: (pid, p) => {
        const min = p.minutes ?? 30;
        return {
          id: pid, version: 1, title: `Play to unlock ${x.what.slice(0, 40)} for ${min} minutes`, case: "existing", archetype: x.archetype, beyondBaseline: true,
          oneLiner: `Where ${x.screen.name} blocks "${x.what.slice(0, 40)}", a ${SEC}-second game unlocks it for ${min} minutes, once a day.`,
          anchor: { moments: [x.mo.id], economy: ids(w?.item?.id) },
          surface: x.screen.id,
          trigger: `The user hits "${x.what.slice(0, 40)}" on ${x.screen.name}; the rewarded option sits below the paid one.`,
          eligibility: ELIG,
          offer: { title: "Try it for free", body: `Play a ${SEC}-second game to get ${what} for ${min} minutes.`, cta: "Play to unlock", decline: "No thanks" },
          simula: { unit: "SIM-RWD", entry: "button", gamePartner: partner, minPlaySec: SEC },
          reward: nonRes(`${what} for ${min} minutes`, `${min} minutes`),
          caps: { perDay: p.perDay, cooldownMin: p.cooldownMin },
          cannibalizationGuard: guard(`${min} minutes once a day with a visible countdown; the paid plan remains unlimited.`),
          assumptions: { engagedShare: 0.1, viewsPerEngager: 1, cogs: "none", cogsUnitsPerView: 0 },
          kpis: kpis(`Unlock opt-in rate and later paid conversion against the holdout`),
          precedents: [x.archetype, "EX-MUSIC", "AI-15"],
          risks: ["If the unlocked feature is the plan's core promise, sampling can substitute for buying: keep it short."],
          evidence: evidenceFor(m, [x.mo], [w?.item?.id]),
          patch: {
            newScreens: [],
            newElements: [{ id: "ne1", in: x.screen.id, near: x.el?.id, place: "after", change: `Secondary button "▶ Play ${SEC} s: ${min} minutes free"` }],
            newEdges: [{ from: x.screen.id, el: "ne1", to: "rwd", effects: [] }],
          },
          storyboard: [
            phase("today", x.screen, [], "none", co(x.screen, x.el, "Blocked today"), `"${x.what.slice(0, 40)}" is gated.`),
            phase("change", x.screen, [], "none", [{ node: "ne1", text: "NEW: play to unlock" }], "A secondary rewarded option appears under the paid one."),
            phase("offer", x.screen, [], "invite", [{ node: "ne1", text: "Duration disclosed" }], `"Play to unlock" or "No thanks".`),
            phase("ad", x.screen, [], "game", [], `A ${SEC}-second game; unlock on REWARD_VERIFIED.`),
            phase("value", x.screen, [], "verified", [{ node: "ne1", text: `${min}:00 left` }], `Unlocked for ${min} minutes.`),
          ],
        };
      },
    });
  }

  // --- product changes ---------------------------------------------------------------------------
  const hasAds = m.economy.ads.length > 0;
  const nonRes = (what: string, duration?: string): Proposal["reward"] => ({ what, duration, grantOn: "REWARD_VERIFIED" });
  if (hub) {
    const bal = hub.balanceEl ?? hub.anchorEl;
    const dailySource = m.economy.sources.find(x => x.cadence === "daily");
    // Without a priced resource: a short taste of the paid plan, else an ad-free window where ads
    // interrupt, else a collectible.
    const plan = m.economy.entitlements[0];
    const interruptive = m.economy.ads.some(x => x.format === "interstitial" || x.format === "banner");
    const reward = (amt?: number) => (res && s && amt ? resourceReward(amt)
      : plan ? nonRes(`15 minutes of ${plan.plan}${plan.benefits[0] ? ` (${plan.benefits[0]})` : ""}`, "15 minutes")
      : interruptive ? nonRes(`30 minutes of ${hub.screen.name} without ads`, "30 minutes")
      : nonRes("a collectible profile badge for completing all 3 tasks"));
    T.push({
      key: "daily-tasks", why: "A capped, proactive daily habit loop: predictable inventory with no interruption [TAX-9].",
      idea: { title: `Daily tasks on ${hub.screen.name}`, case: "product-change", archetype: "TAX-9", moment: hub.moment.id, reward: `${res && s ? `+${u(s.amount)}` : "a reward"} per sponsored task, 3 a day`, beyondBaseline: true },
      defaults: { amount: s?.amount, perDay: 3, cooldownMin: 5, cogsUnits: s?.cogsUnits ?? 0 },
      build: (pid, p) => {
        const r = reward(p.amount);
        return {
          id: pid, version: 1, title: `Daily tasks on ${hub.screen.name}`, case: "product-change", archetype: "TAX-9", beyondBaseline: true,
          oneLiner: `A "Daily tasks" sheet on ${hub.screen.name}: 3 sponsored ${SEC}-second games a day with ${partner}, each for ${r.what}.`,
          anchor: {
            moments: [hub.moment.id], economy: ids(res?.id, dailySource?.id),
            newMechanic: { name: "Daily tasks", description: `A ${hub.screen.name} sheet listing 3 sponsored mini-game tasks per day, each paying ${r.what}; resets at midnight.`,
              whyNeeded: dailySource ? `The only free daily source today is "${dailySource.how}"; a capped task list adds proactive inventory without touching it.` : "Nothing renews daily today; a capped task list creates a daily habit and predictable inventory.", removesFreeValue: false },
          },
          surface: "ns1",
          trigger: `A "Daily tasks 0/3" badge on ${hub.screen.name}; the user opens the sheet and picks a task. No pop-ups.`,
          eligibility: ELIG,
          offer: { title: "Daily tasks", body: `Play a ${SEC}-second sponsored game to get ${r.what}. 3 tasks a day.`, cta: "Play task", decline: "Close" },
          simula: { unit: "SIM-RWD", entry: "invitation", gamePartner: partner, minPlaySec: SEC },
          reward: r,
          caps: { perDay: p.perDay, cooldownMin: p.cooldownMin },
          cannibalizationGuard: guard(`At most ${p.perDay} tasks a day; the free daily sources are unchanged.`),
          assumptions: { engagedShare: 0.2, viewsPerEngager: 2, cogs: r.resource ? cogs : "none", cogsUnitsPerView: r.resource ? p.cogsUnits : 0 },
          kpis: kpis(`Tasks completed per DAU and D7 retention against the holdout`),
          precedents: ["TAX-9", "AI-3", "EX-SOCIAL", "TRIG-1"],
          risks: ["New surface to build and maintain; sponsor demand for the tasks must be confirmed."],
          evidence: evidenceFor(m, [hub.moment], [dailySource?.id, res?.id]),
          patch: {
            newScreens: [{ id: "ns1", basedOn: hub.screen.id, kind: "sheet", change: `"Daily tasks" sheet: 3 rows "Play a ${SEC}-second game: ${r.what}", progress 0/3, resets at midnight` }],
            newElements: [
              { id: "ne1", in: hub.screen.id, near: bal?.id, place: "after", change: `Badge "Daily tasks 0/3"` },
              { id: "ne2", in: "ns1", place: "overlay", change: `Task row "Play with ${partner}: ${r.what}" with a Play button` },
            ],
            newEdges: [
              { from: hub.screen.id, el: "ne1", to: "ns1", effects: [] },
              { from: "ns1", el: "ne2", to: "rwd", effects: r.resource && r.amount ? [{ resource: r.resource, delta: r.amount }] : [] },
            ],
          },
          storyboard: [
            phase("today", hub.screen, res ? [[res.id, baseBalance]] : [], "none", co(hub.screen, bal, "Today's balance"), `${hub.screen.name} today: nothing to do for free beyond the existing sources.`),
            phase("change", hub.screen, [], "none", [{ node: "ne1", text: "NEW: Daily tasks 0/3" }], `A Daily tasks badge opens a sheet of 3 sponsored games.`),
            { phase: "offer", screen: "ns1", counters: [], overlay: "invite", callouts: [{ node: "ne2", text: "Task disclosed: game length and reward" }], caption: `"Play task" or "Close".` },
            { phase: "ad", screen: "ns1", counters: [], overlay: "game", callouts: [], caption: `A ${SEC}-second sponsored game; grant on REWARD_VERIFIED.` },
            { phase: "value", screen: "ns1", counters: res && r.amount ? [{ resource: res.id, value: baseBalance + r.amount }] : [], overlay: "verified", callouts: [{ node: "ne2", text: "1/3 done" }], caption: `Task done: ${r.what}.` },
          ],
        };
      },
    });
  }

  // Sponsored session [TAX-11]: the paid mode, time-boxed [TAX-2]; else a taste of the paid plan;
  // else an ad-light hour [AI-17] (the judge checks whether ads there actually interrupt).
  const plan0 = m.economy.entitlements[0];
  const premLabel = prem?.context ? modeName(prem.context) : "the premium mode";
  const cheapLabel = cheapSink?.context ? modeName(cheapSink.context) : "the standard price";
  type Session = { where: Screen; mo: Moment; near?: UiElement; minutes: number; cogs: Cogs; units: number; archetype: string; title: string;
    what: (min: number) => string; today: string; why: string; paid: string; precedents: string[]; risk: string };
  const session: Session | undefined = des && prem && cheapSink && res
    ? { where: des.screen, mo: des.moment, near: des.modeEl, minutes: 15, cogs: "text-premium", units: 10, archetype: "TAX-11", title: `Sponsored ${premLabel} session`,
        what: min => `${premLabel} messages at the ${cheapLabel} price for ${min} minutes`, today: `${premLabel} is paid per message`,
        why: `${premLabel} is priced per message today; there is no way to feel it for a while without paying.`, paid: "mode",
        precedents: ["TAX-11", "TAX-2", "EX-MUSIC", "EX-DUO"], risk: `${premLabel} replies cost more to serve; a time box has no per-message cap.` }
    : plan0 && hub
      ? { where: hub.screen, mo: hub.moment, near: hub.anchorEl, minutes: 30, cogs: "none", units: 0, archetype: "TAX-11", title: `Sponsored ${plan0.plan} half hour`,
          what: min => `${min} minutes of ${plan0.plan}${plan0.benefits[0] ? ` (${plan0.benefits[0]})` : ""}`, today: `${plan0.plan} is subscription-only`,
          why: `${plan0.plan} can only be felt by subscribing; a sponsored time box samples it [CANN-1].`, paid: "plan",
          precedents: ["TAX-11", "TAX-2", "EX-MUSIC"], risk: `Sampling ${plan0.plan}'s core benefit can substitute for subscribing: keep it short.` }
      : hub && hasAds
        ? { where: hub.screen, mo: hub.moment, near: hub.anchorEl, minutes: 60, cogs: "none", units: 0, archetype: "AI-17", title: `Sponsored ad-free hour on ${hub.screen.name}`,
            what: min => `${min} minutes of ${hub.screen.name} without in-feed ads`, today: "Ads today",
            why: "The app already shows ads; an ad-light hour is the one thing ads make scarce.", paid: "plan",
            precedents: ["AI-17", "TAX-11", "EX-MUSIC"], risk: "Ad-free time only has value while other ads keep interrupting." }
        : undefined;
  if (session) {
    const x = session;
    T.push({
      key: "sponsored-session", why: "A sponsor-attributed, time-boxed taste of the paid experience at session start [TAX-11][EX-MUSIC].",
      idea: { title: x.title, case: "product-change", archetype: x.archetype, moment: x.mo.id, reward: x.what(x.minutes), beyondBaseline: true },
      defaults: { perDay: 1, cooldownMin: 0, cogsUnits: x.units, minutes: x.minutes },
      build: (pid, p) => {
        const min = p.minutes ?? x.minutes;
        const what = x.what(min);
        return {
          id: pid, version: 1, case: "product-change", archetype: x.archetype, beyondBaseline: true, title: x.title,
          oneLiner: `A sponsor pays for ${what}: one ${SEC}-second game, once a day, offered at the start of a session on ${x.where.name}.`,
          anchor: {
            moments: [x.mo.id], economy: ids(prem?.id, cheapSink?.id, res?.id),
            newMechanic: { name: x.title, description: `A daily, sponsor-attributed time box: ${what}.`, whyNeeded: x.why, removesFreeValue: false },
          },
          surface: x.where.id,
          trigger: `At the start of the first session of the day on ${x.where.name}, as a dismissible chip; never mid-reply.`,
          eligibility: ELIG,
          offer: { title: x.title, body: `Play a ${SEC}-second sponsored game to get ${what}.`, cta: "Play to unlock", decline: "Not today" },
          simula: { unit: "SIM-RWD", entry: "button", gamePartner: partner, minPlaySec: SEC },
          reward: nonRes(what, `${min} minutes`),
          caps: { perDay: p.perDay, cooldownMin: p.cooldownMin },
          cannibalizationGuard: guard(`Once a day, ${min} minutes, visibly expiring; the paid ${x.paid} remains the only unlimited option.`),
          assumptions: { engagedShare: 0.15, viewsPerEngager: 1, cogs: x.cogs, cogsUnitsPerView: p.cogsUnits },
          kpis: kpis(`Sessions started with the sponsored time box, and later paid ${x.paid} usage against the holdout`),
          precedents: x.precedents,
          risks: [x.risk],
          evidence: evidenceFor(m, [x.mo], [prem?.id, res?.id]),
          patch: {
            newScreens: [],
            newElements: [{ id: "ne1", in: x.where.id, near: x.near?.id, place: "after", change: `Dismissible chip "Sponsored: ${what} — play ${SEC} s"` }],
            newEdges: [{ from: x.where.id, el: "ne1", to: "rwd", effects: [] }],
          },
          storyboard: [
            phase("today", x.where, [], "none", co(x.where, x.near, x.today), `First session of the day on ${x.where.name}.`),
            phase("change", x.where, [], "none", [{ node: "ne1", text: "NEW: sponsored session chip" }], `A sponsor offers ${what}.`),
            phase("offer", x.where, [], "invite", [{ node: "ne1", text: "Opt-in; duration disclosed" }], `"Play to unlock" or "Not today".`),
            phase("ad", x.where, [], "game", [], `A ${SEC}-second sponsored game; unlock on REWARD_VERIFIED.`),
            phase("value", x.where, [], "verified", [{ node: "ne1", text: `${min}:00 left` }], `${Cap(what)}, with a visible countdown.`),
          ],
        };
      },
    });
  }

  const chatDesire = des && a.chat && des.screen.id === a.chat.screen.id ? des : undefined;
  if (chatDesire && res && s) {
    const chat = a.chat!;
    T.push({
      key: "scene-end-game", why: "Turns the chat's natural lulls into an in-world, opt-in game with the character [AI-12].",
      idea: { title: `Game Partner break in ${chat.screen.name}`, case: "product-change", archetype: "AI-12", moment: chatDesire.moment.id, reward: `+${u(s.amount)} for a game with the character`, beyondBaseline: true },
      defaults: { amount: s.amount, perDay: 2, cooldownMin: 30, cogsUnits: s.cogsUnits },
      build: (pid, p) => {
        const amt = p.amount ?? s.amount;
        return {
          id: pid, version: 1, title: `Game Partner break in ${chat.screen.name}`, case: "product-change", archetype: "AI-12", beyondBaseline: true,
          oneLiner: `After a finished scene in ${chat.screen.name}, the character invites the user to a ${SEC}-second game for +${u(amt)}.`,
          anchor: { moments: [chatDesire.moment.id], economy: ids(res.id, cheapSink?.id),
            newMechanic: { name: "Game Partner break", description: "An in-world invitation from the character at a natural lull, at most twice a day.", whyNeeded: "The chat has no opt-in moment between walls; a lull invitation creates one without interrupting.", removesFreeValue: false } },
          surface: chat.screen.id,
          trigger: `Only after the character's reply has fully finished and the user has been idle for 20 s, at most every 20 messages.`,
          eligibility: ELIG,
          offer: { title: "Play a game with me?", body: `Play a ${SEC}-second game together for +${u(amt)}.`, cta: "Let's play", decline: "Keep chatting" },
          simula: { unit: "SIM-RWD", entry: "invitation", gamePartner: partner, minPlaySec: SEC },
          reward: resourceReward(amt),
          caps: { perDay: p.perDay, cooldownMin: p.cooldownMin },
          cannibalizationGuard: guard(`Twice a day at most; +${u(amt)} each.`),
          assumptions: { engagedShare: 0.15, viewsPerEngager: 1.5, cogs, cogsUnitsPerView: p.cogsUnits },
          kpis: kpis(`Invitation acceptance and messages per DAU against the holdout`),
          precedents: ["AI-12", "POL-8", "TRIG-1"],
          risks: ["An invitation mid-roleplay can break immersion: only at lulls, SFW characters only [SAFE-1]."],
          evidence: evidenceFor(m, [chatDesire.moment], [res.id]),
          patch: {
            newScreens: [],
            newElements: [{ id: "ne1", in: chat.screen.id, near: chat.inputEl?.id, place: "before", change: `Character invitation bubble "Play a game with me? +${u(amt)}" with Let's play / Keep chatting` }],
            newEdges: [{ from: chat.screen.id, el: "ne1", to: "rwd", effects: [{ resource: res.id, delta: amt }] }],
          },
          storyboard: [
            phase("today", chat.screen, [[res.id, baseBalance]], "none", co(chat.screen, chat.titleEl, "Scene just ended"), `A scene has just finished in ${chat.screen.name}.`),
            phase("change", chat.screen, [], "none", [{ node: "ne1", text: "NEW: character invitation" }], `The character invites the user to a quick game.`),
            phase("offer", chat.screen, [], "invite", [{ node: "ne1", text: "Opt-in; reward disclosed" }], `"Let's play" or "Keep chatting".`),
            phase("ad", chat.screen, [], "game", [], `A ${SEC}-second game with the character; grant on REWARD_VERIFIED.`),
            phase("value", chat.screen, [[res.id, baseBalance + amt]], "verified", co(chat.screen, chat.inputEl, "Back to the story"), `+${u(amt)} and back to the story.`),
          ],
        };
      },
    });
  }

  if (hub) {
    // Smaller product-change patterns anchored on the hub; mostly for apps with nothing scarce.
    const mk = (key: string, archetype: string, title: string, what: string, duration: string | undefined, mechanic: string, why: string, precedents: string[], perDay: number): Template => ({
      key, why, idea: { title, case: "product-change", archetype, moment: hub.moment.id, reward: what, beyondBaseline: true },
      defaults: { perDay, cooldownMin: 30, cogsUnits: 0 },
      build: (pid, p) => ({
        id: pid, version: 1, title, case: "product-change", archetype, beyondBaseline: true,
        oneLiner: `${mechanic} on ${hub.screen.name}: one ${SEC}-second game for ${what}.`,
        anchor: { moments: [hub.moment.id], economy: ids(res?.id), newMechanic: { name: title, description: `${mechanic}; reward: ${what}.`, whyNeeded: why, removesFreeValue: false } },
        surface: hub.screen.id,
        trigger: `A tile on ${hub.screen.name} the user taps; nothing opens on its own.`,
        eligibility: ELIG,
        offer: { title, body: `Play a ${SEC}-second game to get ${what}.`, cta: "Play", decline: "Not now" },
        simula: { unit: "SIM-RWD", entry: "button", minPlaySec: SEC },
        reward: nonRes(what, duration),
        caps: { perDay: p.perDay, cooldownMin: p.cooldownMin },
        cannibalizationGuard: guard(`${p.perDay} per day; the free experience is unchanged.`),
        assumptions: { engagedShare: 0.1, viewsPerEngager: 1, cogs: "none", cogsUnitsPerView: 0 },
        kpis: kpis(`Tile views per DAU and D7 retention against the holdout`),
        precedents,
        risks: ["Needs a new surface; value depends on users caring about the reward."],
        evidence: evidenceFor(m, [hub.moment], [res?.id]),
        patch: {
          newScreens: [],
          newElements: [{ id: "ne1", in: hub.screen.id, near: hub.anchorEl?.id, place: "after", change: `Tile "${title}: play ${SEC} s"` }],
          newEdges: [{ from: hub.screen.id, el: "ne1", to: "rwd", effects: [] }],
        },
        storyboard: [
          phase("today", hub.screen, [], "none", co(hub.screen, hub.anchorEl, "Today"), `${hub.screen.name} today.`),
          phase("change", hub.screen, [], "none", [{ node: "ne1", text: `NEW: ${title}` }], `${mechanic}.`),
          phase("offer", hub.screen, [], "invite", [{ node: "ne1", text: "Opt-in; reward disclosed" }], `"Play" or "Not now".`),
          phase("ad", hub.screen, [], "game", [], `A ${SEC}-second game; grant on REWARD_VERIFIED.`),
          phase("value", hub.screen, [], "verified", [{ node: "ne1", text: "Unlocked" }], `The user gets ${what}.`),
        ],
      }),
    });
    const items = hub.screen.elements.filter(e => e.role === "list-item" && !e.ad && elText(e)).slice(0, 1);
    T.push(mk("pre-session", "TAX-11", `Sponsored start on ${hub.screen.name}`, "a sponsor-branded bonus for today's first session", "today",
      "A sponsor-attributed game at the start of the day's first session", "A pre-session sponsorship is the highest-completion placement for apps without a scarce resource [TRIG-1].", ["TAX-11", "TRIG-1", "EX-DUO"], 1));
    T.push(mk("bonus-pass", "TAX-1", "Bonus pass", "one Bonus pass (a new earn-only extra, never taken from the free tier)", undefined,
      "A new earn-only bonus item layered on top of the unchanged free experience", "Nothing is scarce today; a bonus layer creates value without removing anything [AI-X].", ["AI-X", "TAX-1", "CORE-2"], 3));
    T.push(mk("tasks-bonus", "TAX-5", "Streak bonus for daily tasks", "a 2x bonus on the day's completed task set", "today",
      "A multiplier offered right after the day's tasks are completed", "A post-completion multiplier is a positive, non-interruptive moment [TAX-5].", ["TAX-5", "AI-14"], 1));
    if (items.length) T.push(mk("wait-or-watch", "TAX-3", `Wait-or-watch bonus for "${elText(items[0]).slice(0, 30)}"`, "72-hour early access to one bonus item", "72 hours",
      `Early access to a bonus item in "${elText(items[0]).slice(0, 30)}" behind a short game`, "Rate-limited, temporary unlocks are a proven wait-or-watch design [EX-SERIAL].", ["TAX-3", "EX-SERIAL", "AI-11"], 3));
    T.push(mk("cosmetic", "TAX-13", "Collectible profile badge", "a limited collectible profile badge", undefined,
      "A cosmetic collectible earned by play", "Cosmetics have near-zero cost to serve [TAX-13].", ["TAX-13", "EX-SOCIAL"], 1));
  }

  const rank = (k: string) => { const i = PICK_ORDER.indexOf(k); return i < 0 ? PICK_ORDER.length : i; };
  return T.sort((x, y) => rank(x.key) - rank(y.key));
}

/** Pick the ideas list (profile.candidates) so the case mix survives truncation. */
function pickIdeas(all: Template[], m: ProductModel, n: number): Template[] {
  if (all.length <= n) return all;
  const needExisting = m.regime === "no-scarcity" ? 0 : 3;
  const needChange = m.regime === "no-scarcity" ? 5 : 3;
  const out: Template[] = [];
  const take = (pred: (t: Template) => boolean, k: number) => { for (const t of all) if (out.length < n && k > 0 && pred(t) && !out.includes(t)) { out.push(t); k--; } };
  take(t => t.idea.case === "existing", needExisting);
  take(t => t.idea.case === "product-change", needChange);
  take(() => true, n);
  return out.sort((x, y) => all.indexOf(x) - all.indexOf(y));
}

export function stubCandidates(m: ProductModel, profile: Pick<Profile, "candidates" | "proposals">): Candidates {
  const a = resolveAnchors(m);
  const chosen = pickIdeas(templates(m, a), m, Math.max(profile.candidates, 6));
  const nSel = Math.min(profile.proposals, chosen.length);
  // chosen is already in pick order, so the first nSel are the most diverse set.
  const selected = chosen.slice(0, nSel).map((t, index) => ({ index, why: `[stub] ${t.why}` }));
  const proposals = chosen.slice(0, nSel).map((t, i) => {
    const p = t.build(`P${i + 1}`, t.defaults);
    return { ...p, economics: proposalEconomics(p, m) };
  });
  return {
    schema: "simula.candidates/1", app: m.app.id,
    baseline: stubBaseline(m, a), momentSweep: stubSweep(m, a),
    ideas: chosen.map(t => t.idea), selected, proposals, generatedBy: "stub",
  };
}

function stubBaseline(m: ProductModel, a: Anchors): string[] {
  const home = a.hub?.screen.name ?? m.screens.find(s => s.kind === "tab")?.name ?? "the home screen";
  const store = m.screens.find(s => s.kind === "store" || s.kind === "paywall")?.name ?? "the store";
  return [
    `A "Watch a video for free ${a.res?.name ?? "rewards"}" button on ${home}.`,
    `An interstitial video every few ${a.chat ? "messages" : "screens"}.`,
    `Banner ads on ${store} and ${home}.`,
  ];
}

function stubSweep(m: ProductModel, a: Anchors): Candidates["momentSweep"] {
  const res = a.res?.name ?? "the resource";
  const amt = a.sized ? `${a.sized.amount} ${a.res?.unit}` : "a small reward";
  return m.moments.map(mo => {
    if (mo.noOffer) return { moment: mo.id, exchange: "Offers are forbidden before first value.", viable: false };
    switch (mo.type) {
      case "wall": return { moment: mo.id, exchange: mo.resource ? `Blocked on ${res}: a game for ${amt} (one cheapest action) closes the loop.` : "Blocked on a paid feature: a short time-boxed unlock.", viable: true };
      case "decline": return { moment: mo.id, exchange: `After declining the paid option: a one-time smaller fallback (${amt}).`, viable: !!a.res };
      case "hub": return { moment: mo.id, exchange: "Proactive surface: a refill station or daily tasks, capped per day.", viable: true };
      case "post-reward": return { moment: mo.id, exchange: "Right after a free claim: a bonus or 2x for one game.", viable: true };
      case "desire": return { moment: mo.id, exchange: a.premiumSink ? `Wants the pricier option (${a.premiumSink.context ?? a.premiumSink.amount}): sample it for one reply.` : "Wants something locked or priced: sample it.", viable: true };
      default: return { moment: mo.id, exchange: mo.description, viable: mo.reach !== "rare" };
    }
  });
}

// ------------------------------------------------------------------------------------------------
// Stub revise: deterministic repairs keyed on the code-computed economics flags and on the words
// of the judge's required changes (never on scores, which revise() never sees).
// Proposals that came from a template are rebuilt from it with adjusted parameters (so every text
// stays coherent); anything else gets field-level fixes.
// ------------------------------------------------------------------------------------------------
const FLAG = { ratio: /one view's revenue/i, cann: /cannibalization/i, cogs: /cost to serve/i };

export function stubRevise(m: ProductModel, p: Proposal, requiredChanges: string[], topConcern: string): Proposal {
  const a = resolveAnchors(m);
  const want = `${requiredChanges.join(" \n")} \n${topConcern}`;
  const flags = (p.economics ?? proposalEconomics(p, m)).flags;
  const t = templates(m, a).find(x => x.idea.archetype === p.archetype && x.idea.moment === p.anchor.moments[0] && x.idea.case === p.case);
  let next: Proposal;
  if (t) {
    const minutes = Number(/(\d+)\s*min/i.exec(p.reward.duration ?? "")?.[1]) || t.defaults.minutes;
    const q: Params = { amount: p.reward.amount ?? t.defaults.amount, perDay: p.caps.perDay, cooldownMin: p.caps.cooldownMin, cogsUnits: p.assumptions.cogsUnitsPerView, minutes };
    const sized = a.sized && p.reward.resource === a.res?.id ? a.sized : undefined;
    if (sized && q.amount !== undefined && flags.some(f => FLAG.ratio.test(f) || FLAG.cann.test(f))) {
      // Resize to the exchange rate: one cheapest action per view [TRIG-4].
      q.amount = Math.min(q.amount, sized.amount);
      q.cogsUnits = Math.min(q.cogsUnits, sized.cogsUnits);
    }
    if (flags.some(f => FLAG.cogs.test(f))) {
      // Shorter time box and fewer served units [JUDGE-5 "COGS is too high"].
      if (q.minutes) q.minutes = Math.max(5, Math.round(q.minutes / 3));
      if (q.cogsUnits > 1) q.cogsUnits = Math.max(1, Math.round(q.cogsUnits / 3));
      if (sized && q.amount !== undefined) { q.amount = Math.min(q.amount, sized.amount); q.cogsUnits = Math.min(q.cogsUnits, sized.cogsUnits); }
    }
    if (/\bcaps?\b|frequen|fatigue|per day|cooldown/i.test(want)) { q.perDay = Math.min(q.perDay, 3); q.cooldownMin = Math.max(q.cooldownMin, 30); }
    next = t.build(p.id, q);
  } else {
    next = structuredClone(p);
    if (a.sized && p.reward.resource === a.res?.id && p.reward.amount !== undefined && flags.some(f => FLAG.ratio.test(f) || FLAG.cann.test(f))) {
      const amt = Math.min(p.reward.amount, a.sized.amount);
      next.reward = { ...next.reward, amount: amt, what: `+${amt} ${a.res!.unit}` };
      next.assumptions = { ...next.assumptions, cogsUnitsPerView: Math.min(next.assumptions.cogsUnitsPerView, a.sized.cogsUnits) };
      next.patch = { ...next.patch, newEdges: next.patch.newEdges.map(e => ({ ...e, effects: e.effects.map(f => (f.resource === p.reward.resource ? { ...f, delta: amt } : f)) })) };
    }
    if (/\bcaps?\b|frequen|fatigue|per day|cooldown/i.test(want)) next.caps = { perDay: Math.max(1, Math.min(next.caps.perDay, 3)), cooldownMin: Math.max(next.caps.cooldownMin, 30) };
  }
  return { ...fieldFixes(next, want, m, a), id: p.id, version: p.version + 1, economics: undefined };
}

/** Field-level repairs for the failures a judge names in words ([JUDGE-5] revision prompts). */
function fieldFixes(p: Proposal, want: string, m: ProductModel, a: Anchors): Proposal {
  const q = structuredClone(p);
  const disclose = () => `Play a ${q.simula.minPlaySec}-second game to get ${q.reward.what}.`;
  if (/subscriber|eligib|payer|every (app )?open|first session/i.test(want)) q.eligibility = ELIG;
  if (/holdout|measur|kpi|guardrail/i.test(want)) q.kpis = kpis(q.kpis.primary || `Opt-ins per DAU for "${q.title}"`);
  if (!q.offer.decline.trim() || /declin|no thanks|dismiss/i.test(want)) q.offer.decline = q.offer.decline.trim() || "No thanks";
  if (/stream|mid-response|interrupt|auto-?play|opt-?in/i.test(want)) {
    q.trigger = `Only at a boundary: after any reply has fully finished, on ${m.screens.find(s => s.id === q.surface)?.name ?? q.surface}; the user taps to opt in, nothing plays on its own.`;
    if (q.simula.entry === "interstitial") q.simula.entry = "button";
  }
  if (/loss|hostage|lose|dark pattern|confirmshaming|guilt/i.test(want)) q.offer = { ...q.offer, title: q.title, body: disclose() };
  if (/disclos|reward and the action|state the reward/i.test(want)) q.offer.body = disclose();
  // Specificity comes from the reward itself being named in the app's nouns; never stuff nouns into copy.
  if (/specific|generic|this app's|own nouns/i.test(want)) q.offer.body = disclose();
  if (/ground|unknown id|does not exist|not declared|missing id/i.test(want)) {
    const known = new Set([...m.screens.map(s => s.id), ...q.patch.newScreens.map(s => s.id)]);
    const home = m.moments.find(x => q.anchor.moments.includes(x.id))?.screen ?? a.hub?.screen.id ?? m.screens[0].id;
    if (!known.has(q.surface)) q.surface = home;
    q.anchor.moments = q.anchor.moments.filter(id => m.moments.some(x => x.id === id));
    q.storyboard = q.storyboard.map(b => ({ ...b, screen: known.has(b.screen) ? b.screen : q.surface }));
  }
  return q;
}
