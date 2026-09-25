// Anchors: the handful of model facts a rewarded exchange hangs on (the blocked resource, the wall,
// the decline, the hub, the post-reward moment, the chat composer), resolved ONCE from the product
// model with generic rules. The stub proposer, the stub reviser and the judge calibration set all
// build their proposals from these, so every id they emit exists in the model.
import type { Economy, Moment, ProductModel, Proposal, Screen, UiElement } from "../core/schema.ts";
import { ECON, deriveEconomy } from "../model/economics.ts";
import { cleanName, humanizeAction, sinkUse, topBarTitle } from "../core/humanize.ts";

type Sink = Economy["sinks"][number];
type Source = Economy["sources"][number];
type Offer = Economy["offers"][number];
type Wall = Economy["walls"][number];
export type Cogs = Proposal["assumptions"]["cogs"];

export interface Sized {
  amount: number;          // units granted per completed view
  buys: string;            // what that amount buys, in the app's words
  cogs: Cogs;              // cost class of what the reward is spent on
  cogsUnits: number;       // how many of those it buys (input to code economics, never computed by an LLM)
}

export interface Anchors {
  res?: { id: string; name: string; unit: string };
  cheapSink?: Sink;
  premiumSink?: Sink;      // a pricier sink on the same resource (a "mode" users desire)
  cheapestOffer?: Offer;
  sized?: Sized;
  spendKind?: "chat" | "other"; // where the resource is spent: chat replies cost inference
  wall?: { moment: Moment; screen: Screen; item?: Wall; from?: Screen; upsellEl?: UiElement; declineEl?: UiElement; blockedCost?: number; blockedIntent: string };
  decline?: { moment: Moment; screen: Screen; to?: Screen; declineEl?: UiElement };
  hub?: { moment: Moment; screen: Screen; balanceEl?: UiElement; anchorEl?: UiElement };
  postReward?: { moment: Moment; screen: Screen; parent?: Screen; source?: Source; claimEl?: UiElement };
  desire?: { moment: Moment; screen: Screen; modeEl?: UiElement };
  chat?: { screen: Screen; inputEl?: UiElement; titleEl?: UiElement; persona?: string };
  /** Who plays along in the game: the character or persona shown on the chat, else the app itself. */
  partner: string;
  noOfferScreens: Set<string>;
}

const REACH = { "core-loop": 4, frequent: 3, occasional: 2, rare: 1 } as const;
const DECLINE = /not now|no,? thanks|maybe later|later|cancel|close|dismiss|skip/i;
const CLAIM = /claim|collect|get|receive|redeem/i;
const CTA = /refill|top.?up|buy|get (more|premium|pro|plus)|upgrade|subscribe|unlock|go (premium|pro|plus)|continue|purchase|recharge|store|shop|see (plans|offers)|try (free|premium|pro)/i;

const txt = (e?: UiElement) => (e?.text || e?.label || "").trim();
const byReach = (a: Moment, b: Moment) => REACH[b.reach] - REACH[a.reach] || a.id.localeCompare(b.id);

export function screenOf(m: ProductModel, id: string | undefined): Screen | undefined {
  return id ? m.screens.find(s => s.id === id) : undefined;
}

/** Numbers that appear in a string ("Premium · 30" -> [30]). */
function numbers(s: string): number[] {
  return [...s.matchAll(/\d+(?:[.,]\d+)?/g)].map(x => Number(x[0].replace(",", ".")));
}

/**
 * Size one view's reward in code: one of the cheapest action the resource buys when that stays
 * within ECON.maxRewardToView of what a view earns, otherwise about one view's worth of units.
 * This is the exchange-rate rule from [TRIG-4]/[CANN-4]: "1 premium reply, not 100 gems".
 */
export function sizeReward(m: ProductModel, resource: string): Sized | undefined {
  const d = m.economy.derived ?? deriveEconomy(m.economy);
  const sinks = m.economy.sinks.filter(k => k.resource === resource && k.amount > 0).sort((a, b) => a.amount - b.amount || a.id.localeCompare(b.id));
  const unit = d.unitPriceUsd.find(u => u.resource === resource);
  const upv = d.unitsPerView.find(u => u.resource === resource);
  const cheap = sinks[0];
  const cogs = cheap ? cogsOf(m, cheap, sinks) : "none";
  const unitName = m.economy.resources.find(r => r.id === resource)?.unit ?? resource;
  if (cheap && !unit && upv?.basis === "cost-to-serve") {
    const amount = Math.max(cheap.amount, Math.floor((upv.min + upv.max) / 2));
    return { amount, buys: sinkUse(cheap.action, amount, cheap.context), cogs, cogsUnits: amount / cheap.amount };
  }
  if (cheap && (!unit || cheap.amount * unit.min <= ECON.maxRewardToView * d.viewValueUsd.US[1]))
    return { amount: cheap.amount, buys: sinkUse(cheap.action, 1, cheap.context), cogs, cogsUnits: 1 };
  if (upv) {
    const amount = Math.max(1, Math.floor(upv.max));
    return { amount, buys: `about one view's worth of ${unitName}`, cogs, cogsUnits: cheap ? Math.round((amount / cheap.amount) * 100) / 100 : 0 };
  }
  return undefined;
}

/** Spending on a chat screen costs inference; the priciest of several chat sinks is a premium model. */
export function cogsOf(m: ProductModel, k: Sink, all: Sink[]): Cogs {
  const onChat = k.edges.some(g => screenOf(m, m.edges.find(e => e.id === g)?.from)?.kind === "chat");
  if (!onChat) return "none";
  const min = Math.min(...all.map(x => x.amount));
  return k.amount >= 2 * min ? "text-premium" : "text-cheap";
}

export function resolveAnchors(m: ProductModel): Anchors {
  const a: Anchors = { noOfferScreens: new Set(m.moments.filter(x => x.noOffer).map(x => x.screen)), partner: cleanName(m.app.name) };
  const offerable = m.moments.filter(x => !x.noOffer);
  const of = (t: Moment["type"]) => offerable.filter(x => x.type === t).sort(byReach);

  // The primary resource: the one users hit a wall on, else the one they spend most often.
  const wallM = of("wall").sort((x, y) => Number(!!y.resource) - Number(!!x.resource))[0];
  const resId = wallM?.resource
    ?? m.economy.sinks.slice().sort((x, y) => y.edges.length - x.edges.length)[0]?.resource
    ?? m.economy.resources.find(r => r.kind === "currency" || r.kind === "quota")?.id
    ?? m.economy.resources[0]?.id;
  const r = m.economy.resources.find(x => x.id === resId);
  if (r) a.res = { id: r.id, name: r.name, unit: r.unit || r.name };
  if (a.res) {
    const sinks = m.economy.sinks.filter(k => k.resource === a.res!.id && k.amount > 0).sort((x, y) => x.amount - y.amount || x.id.localeCompare(y.id));
    a.cheapSink = sinks[0];
    a.premiumSink = sinks.length > 1 && sinks[sinks.length - 1].amount > sinks[0].amount ? sinks[sinks.length - 1] : undefined;
    a.cheapestOffer = m.economy.offers.filter(o => o.grants.resource === a.res!.id && o.priceUsd != null).sort((x, y) => (x.priceUsd ?? 0) - (y.priceUsd ?? 0))[0];
    a.sized = sizeReward(m, a.res.id);
    a.spendKind = a.cheapSink && cogsOf(m, a.cheapSink, sinks) !== "none" ? "chat" : "other";
  }

  if (wallM) {
    const screen = screenOf(m, wallM.screen)!;
    const edge = m.edges.find(e => e.id === wallM.edge);
    const item = m.economy.walls.find(w => w.shows === wallM.screen && (!wallM.edge || w.edge === wallM.edge)) ?? m.economy.walls.find(w => w.shows === wallM.screen);
    const buttons = screen.elements.filter(e => e.role === "button");
    const upsellId = screen.signals.find(s => s.kind === "upsell" && s.el)?.el;
    const declineEdge = item?.declineEdge ? m.edges.find(e => e.id === item.declineEdge) : undefined;
    const declineEl = screen.elements.find(e => e.id === declineEdge?.el) ?? buttons.find(e => DECLINE.test(txt(e)));
    // The paid call to action ("Refill now", "Upgrade"), not the sentence that explains the wall.
    const cta = buttons.filter(e => e !== declineEl && CTA.test(txt(e)) && txt(e).length <= 30);
    const upsellEl = cta[0] ?? screen.elements.find(e => e.id === upsellId) ?? buttons.find(e => e !== declineEl);
    // The cost that could not be paid: a sink whose price appears in the selected mode at the wall.
    const sel = (edge?.context.selected ?? []).flatMap(numbers);
    const onFrom = m.economy.sinks.filter(k => k.resource === wallM.resource && k.edges.some(g => m.edges.find(e => e.id === g)?.from === edge?.from));
    const blocked = onFrom.find(k => sel.includes(k.amount)) ?? onFrom.sort((x, y) => y.amount - x.amount)[0] ?? a.cheapSink;
    a.wall = { moment: wallM, screen, item, from: screenOf(m, edge?.from), upsellEl, declineEl, blockedCost: blocked?.amount,
      blockedIntent: humanizeAction(item?.blockedIntent ?? blocked?.action) || "Continue" };
  }

  const dec = of("decline").sort((x, y) => Number(y.edge === a.wall?.item?.declineEdge) - Number(x.edge === a.wall?.item?.declineEdge))[0];
  if (dec) {
    const screen = screenOf(m, dec.screen)!;
    const edge = m.edges.find(e => e.id === dec.edge);
    const to = edge && !edge.to.startsWith("ext:") ? screenOf(m, edge.to) : undefined;
    a.decline = { moment: dec, screen, to: to && !a.noOfferScreens.has(to.id) ? to : undefined, declineEl: screen.elements.find(e => e.id === edge?.el) ?? screen.elements.find(e => DECLINE.test(txt(e))) };
  }

  // Hub: prefer a tab that shows the resource balance.
  const hubs = of("hub").sort((x, y) => {
    const bx = screenOf(m, x.screen)?.bindings.some(b => b.resource === a.res?.id) ? 1 : 0;
    const by = screenOf(m, y.screen)?.bindings.some(b => b.resource === a.res?.id) ? 1 : 0;
    const tx = screenOf(m, x.screen)?.kind === "tab" ? 1 : 0, ty = screenOf(m, y.screen)?.kind === "tab" ? 1 : 0;
    return by - bx || ty - tx || byReach(x, y);
  });
  if (hubs[0]) {
    const screen = screenOf(m, hubs[0].screen)!;
    const bal = screen.bindings.find(b => b.resource === a.res?.id)?.el ?? screen.signals.find(s => s.kind === "balance")?.el;
    const balanceEl = screen.elements.find(e => e.id === bal) ?? screen.elements.find(e => e.role === "counter");
    const anchorEl = balanceEl ?? screen.elements.find(e => e.role === "text" && txt(e)) ?? screen.elements[0];
    a.hub = { moment: hubs[0], screen, balanceEl, anchorEl };
  }

  const post = of("post-reward").sort((x, y) => Number(y.resource === a.res?.id) - Number(x.resource === a.res?.id) || byReach(x, y))[0];
  if (post) {
    const screen = screenOf(m, post.screen)!;
    const source = m.economy.sources.find(s => s.screen === post.screen && (!post.resource || s.resource === post.resource));
    const claimEl = screen.elements.find(e => e.role === "button" && CLAIM.test(txt(e))) ?? screen.elements.find(e => e.role === "button");
    a.postReward = { moment: post, screen, parent: screenOf(m, screen.parent), source, claimEl };
  }

  const des = of("desire").sort((x, y) => Number(y.resource === a.res?.id) - Number(x.resource === a.res?.id) || byReach(x, y))[0];
  if (des) {
    const screen = screenOf(m, des.screen)!;
    const priceEl = screen.signals.find(s => s.kind === "price" && s.el)?.el;
    a.desire = { moment: des, screen, modeEl: screen.elements.find(e => e.id === priceEl) ?? screen.elements.find(e => e.role === "button" && /\d/.test(txt(e))) };
  }

  const chat = m.screens.filter(s => s.inScope && s.kind === "chat" && !a.noOfferScreens.has(s.id)).sort((x, y) => y.visits - x.visits)[0];
  if (chat) {
    const dev = { h: m.device.heightPx / (m.device.density || 1) };
    const persona = topBarTitle(chat.elements, dev.h);
    a.chat = { screen: chat, inputEl: chat.elements.find(e => e.role === "input"), titleEl: chat.elements.find(e => txt(e) === persona) ?? chat.elements.find(e => e.role === "text" && txt(e)), persona };
    if (persona) a.partner = persona;
  }
  return a;
}

export { txt as elText };
