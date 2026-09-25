// synthesize: ONE model call turns the compiled graph into the brief and the economy (resources,
// sinks, sources, offers, walls, entitlements, ads), names the flows and suggests extra moments.
// Every claim carries evidence {obs, el?, quote}; verify.ts checks it afterwards.
// The stub is the no-key path: a deterministic extraction from counters, effects and on-screen
// texts that yields a genuinely usable economy (it is what `npm run demo` and the tests run).
import sharp from "sharp";
import { z } from "zod";
import { AdPlacement, Brief, EconomyResource, MomentType, Offer, Source, type Action, type Economy, type Edge, type Evidence, type Flow, type GraphEdge, type Observation, type Screen } from "../core/schema.ts";
import { json, type Img } from "../core/llm.ts";
import { MODELS } from "../core/config.ts";
import { canonical, escapeHtml, sha256 } from "../core/io.ts";
import { trace } from "../core/trace.ts";
import type { Compiled } from "./compile.ts";
import { isConsume } from "./flows.ts";
import type { ExtraMoment } from "./moments.ts";
import { redactText } from "./redact.ts";
import { numbersIn } from "./verify.ts";
import path from "node:path";

export interface Draft {
  brief: Brief;
  economy: Economy;                                   // without `derived`; conf is set by verify
  flowNames: { flow: string; name: string; goal: string }[];
  extraMoments: ExtraMoment[];
  by: "llm" | "stub";
}

type Res = Economy["resources"][number];
type SinkT = Economy["sinks"][number];
type SourceT = Economy["sources"][number];
type OfferT = Economy["offers"][number];
type WallT = Economy["walls"][number];
type AdT = Economy["ads"][number];

// ------------------------------------------------------------------------------------------------
// Shared helpers
// ------------------------------------------------------------------------------------------------
const ev = (obs: string, quote?: string, el?: string): Evidence => ({ obs, quote: quote || undefined, el, verified: false });
const label = (e: { text?: string; label?: string }) => e.text || e.label || "";
const textsOf = (o: Observation | undefined) => (o ? [...new Set([...o.texts, ...o.elements.map(label)].filter(Boolean))] : []);
const uniq = <T>(xs: T[]) => [...new Set(xs)];

// Prices as written: "$1.39", "US$ 4.99", "1,39 €", "£2". Non-USD prices are converted with rough,
// fixed rates (relative economics only); the verbatim priceText is always kept.
const PRICE = /(US\$|[$€£])\s?(\d[\d.,]*\d|\d)|(\d[\d.,]*\d|\d)\s?([€£])/g;
const USD_PER: Record<string, number> = { "$": 1, "US$": 1, "€": 1.1, "£": 1.3 };
const SUBSCRIPTION = /\/\s?(mo|month|wk|week|yr|year)\b|per (month|week|year)|monthly|weekly|yearly|annual|subscri/i;
const DAILY = /daily|check.?in|today|streak|every day|tomorrow|day \d/i;
const TASK = /challenge|mission|quest|task|invite/i;
const DECLINE = /not now|no,? thanks|maybe later|later|cancel|close|dismiss|skip|×|✕/i;
const BENEFIT = /unlimited|no ads|ad.?free|remove ads|faster|priority|exclusive|early access|all (features|models|characters|content)|premium (features|models)|^[•✓✔\-–]\s/i;
const PLAN = /premium|\bpro\b|\bplus\b|\bvip\b|gold|unlimited|membership|subscription/i;

interface Price { text: string; value: number; usd: number; index: number; end: number }
export function pricesIn(s: string): Price[] {
  return [...s.matchAll(PRICE)].flatMap(m => {
    const value = numbersIn(m[2] ?? m[3])[0];
    const sym = m[1] ?? m[4];
    return value != null && value > 0 ? [{ text: m[0].trim(), value, usd: Math.round(value * USD_PER[sym] * 100) / 100, index: m.index!, end: m.index! + m[0].length }] : [];
  });
}

/** The pack size in a text (price already removed): the number right before a resource word, else the largest. */
function amountIn(s: string, words: string[]): number | undefined {
  const ms = [...s.matchAll(/(\d[\d.,]*\d|\d)(\s?[kK]\b)?(\s*%)?/g)].filter(m => !m[3]);
  if (!ms.length) return undefined;
  const lower = s.toLowerCase();
  const near = ms.find(m => words.some(w => lower.slice(m.index! + m[0].length).trimStart().startsWith(w)));
  const val = (m: RegExpMatchArray) => numbersIn(m[0])[0] ?? 0;
  const v = near ? val(near) : Math.max(...ms.map(val));
  return v > 0 ? v : undefined;
}

class Ctx {
  scr: Map<string, Screen>;
  gEdge: Map<string, GraphEdge>;
  words: { id: string; words: string[] }[] = [];
  constructor(public cm: Compiled) {
    this.scr = new Map(cm.screens.map(s => [s.id, s]));
    this.gEdge = new Map(cm.graph.edges.map(g => [g.id, g]));
  }
  name(id: string): string { return this.scr.get(id)?.name ?? id; }
  action(e: Edge): Action | undefined { return this.cm.actionOf.get(e.id); }
  obsBefore(e: Edge): Observation | undefined { return this.cm.obs.get(this.gEdge.get(e.id)?.obsBefore ?? ""); }
  screenTexts(id: string): string[] { return uniq((this.scr.get(id)?.observations ?? []).flatMap(o => textsOf(this.cm.obs.get(o)))); }
  /** Resource named in a text ("credits", "credit"), by name or unit, singular or plural. */
  resFor(text: string): string | undefined {
    const t = text.toLowerCase();
    return this.words.find(r => r.words.some(w => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}s?([^a-z]|$)`).test(t)))?.id;
  }
  allWords(): string[] { return this.words.flatMap(r => r.words); }
}

const mode = (xs: number[]) => {
  const n = new Map<number, number>();
  xs.forEach(x => n.set(x, (n.get(x) ?? 0) + 1));
  return [...n].sort((a, b) => b[1] - a[1])[0][0]; // Map keeps insertion order, so ties go to the first seen
};

// ------------------------------------------------------------------------------------------------
// Stub: deterministic extraction
// ------------------------------------------------------------------------------------------------
function resources(x: Ctx): Res[] {
  const { cm } = x;
  const obsList = [...cm.obs.values()].sort((a, b) => a.step - b.step);
  const out: Res[] = cm.graph.resources.map(r => {
    const values = obsList.flatMap(o => o.counters.filter(c => c.resource === r.id).map(c => c.value));
    const evidence: Evidence[] = [];
    for (const b of r.bindings) {
      const s = cm.screenOf.get(b.state);
      for (const oid of (s && x.scr.get(s)?.observations) || []) {
        const el = cm.obs.get(oid)?.elements.find(e => e.key === b.elKey && label(e));
        if (el && evidence.length < 2 && !evidence.some(e => e.quote === label(el))) evidence.push(ev(oid, label(el), el.id));
      }
    }
    const t = `${r.name} ${r.unit}`.toLowerCase();
    return {
      id: r.id, name: r.name, unit: r.unit,
      kind: /min|hour|sec|\bday|time/.test(t) ? "time" : /message|question|generation|request|left|remaining|free|quota|image/.test(t) ? "quota" : "currency",
      shownOn: r.bindings.flatMap(b => {
        const s = cm.screenOf.get(b.state);
        const el = s && x.scr.get(s)?.bindings.find(k => k.resource === r.id)?.el;
        return s && el ? [{ screen: s, el }] : [];
      }),
      observedValues: values.filter((v, i) => i === 0 || v !== values[i - 1]).slice(0, 12),
      conf: "inferred", evidence,
    } satisfies Res;
  });
  // Numeric elements the explorer did not bind ("auto:<elKey>") count as a resource only if spending moves them.
  for (const e of cm.edges) {
    if (!isConsume(e, x.action(e))) continue;
    for (const f of e.effects) {
      if (f.kind !== "counter" || f.delta >= 0 || !f.resource.startsWith("auto:") || out.some(r => r.id === f.resource)) continue;
      const key = f.resource.slice(5);
      const nm = (key.split("|")[2] ?? "").replace(/#/g, "").trim() || "counter";
      const el = x.obsBefore(e)?.elements.find(k => k.key === key);
      out.push({ id: f.resource, name: nm, unit: nm.split(" ").pop() ?? nm, kind: "quota", shownOn: [], observedValues: [f.before, f.after],
        conf: "inferred", evidence: el ? [ev(x.obsBefore(e)!.id, label(el), el.id)] : [] });
    }
  }
  x.words = out.map(r => ({ id: r.id, words: uniq([r.name, r.unit].map(w => w.toLowerCase().trim().replace(/s$/, "")).filter(w => w.length >= 2)) }));
  return out;
}

/** Sinks: negative counter deltas grouped by (action, selection context, resource); amount = most common |delta|. */
function sinks(x: Ctx): SinkT[] {
  const groups = new Map<string, { e: Edge[]; deltas: number[]; resource: string }>();
  for (const e of x.cm.edges) {
    const a = x.action(e);
    if (a?.kind === "back" || a?.kind === "scroll") continue;
    for (const f of e.effects) {
      if (f.kind !== "counter" || f.delta >= 0) continue;
      const k = `${e.action}|${e.context.selected.join(" / ")}|${f.resource}`;
      const g = groups.get(k) ?? { e: [], deltas: [], resource: f.resource };
      g.e.push(e); g.deltas.push(-f.delta);
      groups.set(k, g);
    }
  }
  return [...groups.values()].map((g, i) => {
    const e0 = g.e[0], a = x.action(e0), o = x.obsBefore(e0);
    const amount = mode(g.deltas);
    const context = e0.context.selected.join(" / ") || undefined;
    const evidence: Evidence[] = [];
    if (o) {
      for (const sel of e0.context.selected) {
        const el = o.elements.find(k => label(k) === sel);
        if (el) evidence.push(ev(o.id, sel, el.id));
      }
      const act = a?.elKey ? o.elements.find(k => k.key === a.elKey) : undefined;
      if (act && label(act)) evidence.push(ev(o.id, label(act), act.id));
      const priced = textsOf(o).find(t => numbersIn(t).includes(amount) && !evidence.some(v => v.quote === t));
      if (priced) evidence.push(ev(o.id, priced));
    }
    return { id: `k${i + 1}`, resource: g.resource, amount, action: a?.intent ?? e0.action, edges: g.e.map(e => e.id), context, conf: "inferred" as const, evidence: evidence.slice(0, 3) };
  });
}

function cadence(texts: string[]): SourceT["cadence"] {
  const t = texts.join(" ");
  return DAILY.test(t) ? "daily" : TASK.test(t) ? "per-task" : "unknown";
}

/** Sources: positive deltas (grouped by action), reward signals not already explained by a delta, and purchases. */
function sources(x: Ctx, offers: OfferT[]): SourceT[] {
  const out: SourceT[] = [];
  const groups = new Map<string, { e: Edge[]; deltas: number[]; resource: string }>();
  for (const e of x.cm.edges) {
    const a = x.action(e);
    if (a?.kind === "back" || a?.kind === "scroll") continue;
    for (const f of e.effects) {
      if (f.kind !== "counter" || f.delta <= 0) continue;
      const k = `${e.action}|${f.resource}`;
      const g = groups.get(k) ?? { e: [], deltas: [], resource: f.resource };
      g.e.push(e); g.deltas.push(f.delta);
      groups.set(k, g);
    }
  }
  for (const g of groups.values()) {
    const e0 = g.e[0], o = x.obsBefore(e0), amount = mode(g.deltas);
    const texts = [...x.screenTexts(e0.from), ...e0.effects.flatMap(f => (f.kind === "appeared" ? [f.text] : []))];
    const quote = textsOf(o).find(t => numbersIn(t).includes(amount));
    const act = x.action(e0);
    const el = act?.elKey ? o?.elements.find(k => k.key === act.elKey) : undefined;
    out.push({ id: "", resource: g.resource, amount, cadence: cadence(texts), how: `${act?.intent ?? e0.action} on ${x.name(e0.from)}`, screen: e0.from,
      conf: "inferred", evidence: o ? [...(quote ? [ev(o.id, quote)] : []), ...(el && label(el) ? [ev(o.id, label(el), el.id)] : [])] : [] });
  }
  for (const s of x.cm.screens) {
    for (const sig of s.signals.filter(k => k.kind === "reward")) {
      const amount = numbersIn(sig.text)[0];
      if (amount == null || out.some(o => o.screen === s.id && o.amount === amount)) continue;
      const resource = x.resFor(sig.text) ?? x.words[0]?.id;
      if (!resource) continue;
      out.push({ id: "", resource, amount, cadence: cadence(x.screenTexts(s.id)), how: `"${sig.text}" on ${s.name}`, screen: s.id, conf: "inferred", evidence: [ev(s.representative, sig.text, sig.el)] });
    }
  }
  const sold = offers.filter(o => o.grants.resource);
  for (const r of uniq(sold.map(o => o.grants.resource!))) {
    const o = sold.find(k => k.grants.resource === r)!;
    out.push({ id: "", resource: r, amount: null, cadence: "purchase", how: `Buy a pack on ${x.name(o.screen)}`, screen: o.screen, conf: "inferred", evidence: o.evidence.slice(0, 1) });
  }
  return out.map((s, i) => ({ ...s, id: `src${i + 1}` }));
}

/** Offers: price texts on stores, paywalls, priced overlays and billing externals, each paired with the
 *  nearest number (same element first, then the adjacent one) as the amount granted. */
function offers(x: Ctx): OfferT[] {
  const { cm } = x;
  const found: OfferT[] = [];
  const addOffer = (screen: string, own: string, near: string | undefined, p: Price, evidence: Evidence[]) => {
    const rest = `${own.slice(0, p.index)} ${own.slice(p.end)}`.replace(/\s+/g, " ").replace(/^[\s·•|:,\-–]+|[\s·•|:,\-–]+$/g, "").trim();
    let amount = amountIn(rest, x.allWords());
    let lbl = rest;
    if (amount == null && near) { amount = amountIn(near, x.allWords()); lbl = lbl || near; }
    const ctx = `${own} ${near ?? ""}`;
    const sub = SUBSCRIPTION.test(ctx), trial = /trial/i.test(ctx);
    const resource = x.resFor(ctx);
    const kind: OfferT["kind"] = trial ? "trial" : sub ? "subscription" : amount != null ? "pack" : "one-off";
    const period = sub ? (/w(ee)?k/i.test(ctx) ? "week" : /y(ea)?r|annual/i.test(ctx) ? "year" : "month") : undefined;
    const dup = found.find(o => o.priceUsd === p.usd && (o.grants.amount ?? null) === (amount ?? null) && o.kind === kind);
    if (dup) { dup.evidence = [...dup.evidence, ...evidence].slice(0, 4); return; }
    found.push({ id: "", kind, label: lbl || p.text, priceText: p.text, priceUsd: p.usd,
      grants: { resource, amount: kind === "subscription" ? undefined : amount, period }, screen, conf: "inferred", evidence });
  };
  const priced = cm.screens.filter(s => s.kind === "store" || s.kind === "paywall" || s.signals.some(k => k.kind === "price")
    || (["sheet", "modal", "dialog"].includes(s.kind) && s.signals.some(k => k.kind === "upsell")));
  for (const s of priced) {
    for (const oid of s.observations) {
      const o = cm.obs.get(oid);
      if (!o) continue;
      for (const el of o.elements) {
        const t = label(el);
        for (const p of pricesIn(t)) {
          // Adjacent element: nearest one on the same row, or just above/below with horizontal overlap, that has a number and no price.
          const cy = el.rect.y + el.rect.h / 2;
          const nb = o.elements.filter(k => k !== el && label(k) && !pricesIn(label(k)).length && numbersIn(label(k)).length)
            .map(k => ({ k, d: Math.abs(k.rect.y + k.rect.h / 2 - cy), xo: Math.min(k.rect.x + k.rect.w, el.rect.x + el.rect.w) - Math.max(k.rect.x, el.rect.x) }))
            .filter(c => c.d <= Math.max(c.k.rect.h, el.rect.h) * 1.5 && (c.d <= el.rect.h / 2 || c.xo > 0))
            .sort((a, b) => a.d - b.d)[0]?.k;
          addOffer(s.id, t, nb && label(nb), p, [ev(o.id, t, el.id), ...(nb ? [ev(o.id, label(nb), nb.id)] : [])]);
        }
      }
    }
  }
  for (const v of cm.graph.externals.filter(k => k.kind === "billing")) {
    const screen = cm.screenOf.get(v.from);
    if (!screen) continue;
    v.texts.forEach((t, i) => {
      for (const p of pricesIn(t)) {
        const near = [v.texts[i - 1], v.texts[i + 1], v.texts[i - 2], v.texts[i + 2]].find(k => k && !pricesIn(k).length && numbersIn(k).length);
        addOffer(screen, t, near, p, [ev(v.obs, t), ...(near ? [ev(v.obs, near)] : [])]);
      }
    });
  }
  // Packs whose text names no resource ("2,000 $2.89") inherit it from sibling packs, else the only currency.
  const currencies = x.words.filter(w => !w.id.startsWith("auto:"));
  for (const o of found) {
    if (o.grants.resource || o.grants.amount == null || o.kind === "subscription") continue;
    const sib = found.filter(k => k.screen === o.screen && k.grants.resource).map(k => k.grants.resource!);
    o.grants.resource = sib.length ? mode(sib.map((_, i) => i)) !== undefined ? sib[0] : undefined : currencies.length === 1 ? currencies[0].id : undefined;
    if (o.grants.resource && o.kind === "one-off") o.kind = "pack";
  }
  const resName = (id?: string) => (id ? cm.graph.resources.find(r => r.id === id)?.name ?? "" : "");
  return found.map((o, i) => {
    const rn = resName(o.grants.resource);
    const lbl = rn && o.kind === "pack" && !o.label.toLowerCase().includes(rn.toLowerCase().replace(/s$/, "")) ? `${o.label} ${rn}` : o.label;
    return { ...o, id: `of${i + 1}`, label: lbl };
  });
}

/** Walls: where a spend was blocked (limitHit edges), plus screens carrying a `limit` signal. */
function walls(x: Ctx, sinkList: SinkT[], offerList: OfferT[]): WallT[] {
  const { cm } = x;
  const hits: { e: Edge; shows: string }[] = cm.edges.filter(e => e.limitHit && !e.to.startsWith("ext:")).map(e => ({ e, shows: e.to }));
  for (const s of cm.screens.filter(k => k.signals.some(g => g.kind === "limit"))) {
    const e = cm.edges.filter(k => k.to === s.id && k.from !== s.id && k.transition !== "back").sort((a, b) => a.id.localeCompare(b.id))[0];
    if (e) hits.push({ e, shows: s.id });
  }
  const out: WallT[] = [];
  for (const { e, shows } of hits) {
    if (out.some(w => w.shows === shows)) continue;
    const s = x.scr.get(shows)!;
    const hop = new Set([shows, ...cm.edges.filter(k => k.from === shows && !k.to.startsWith("ext:")).map(k => k.to)]);
    const exits = cm.edges.filter(k => k.from === shows && k.to !== shows && !k.to.startsWith("ext:"));
    const decline = exits.find(k => DECLINE.test(label(s.elements.find(el => el.id === k.el) ?? {}))) ?? exits.find(k => k.transition === "back");
    const sig = s.signals.find(k => k.kind === "limit") ?? s.signals.find(k => k.kind === "upsell");
    const quote = sig?.text ?? textsOf(cm.obs.get(s.representative))[0];
    const resource = sinkList.find(k => k.edges.some(id => cm.edges.find(g => g.id === id)?.action === e.action))?.resource
      ?? x.resFor(x.screenTexts(shows).join(" ")) ?? (x.words.length === 1 ? x.words[0].id : undefined);
    out.push({ id: `w${out.length + 1}`, edge: e.id, resource, blockedIntent: x.action(e)?.intent ?? e.action, shows,
      offers: offerList.filter(o => hop.has(o.screen)).map(o => o.id), declineEdge: decline?.id, conf: "inferred",
      evidence: [ev(s.representative, quote, sig?.el)] });
  }
  return out;
}

function entitlements(x: Ctx, offerList: OfferT[]): Economy["entitlements"] {
  const screens = uniq([...x.cm.screens.filter(s => s.kind === "paywall").map(s => s.id), ...offerList.filter(o => o.kind === "subscription" || o.kind === "trial").map(o => o.screen)]);
  return screens.flatMap(id => {
    const s = x.scr.get(id)!;
    const texts = x.screenTexts(id);
    const plan = texts.find(t => PLAN.test(t) && t.length <= 40 && !pricesIn(t).length);
    const benefits = texts.filter(t => BENEFIT.test(t) && t.length <= 80 && t !== plan && !pricesIn(t).length).slice(0, 8);
    if (!plan && !benefits.length) return [];
    return [{ plan: plan ?? s.name, benefits, conf: "inferred" as const, evidence: [ev(s.representative, plan ?? benefits[0])] }];
  });
}

/** Ads seen today (never tapped): placement format from geometry and screen kind. */
function ads(x: Ctx): AdT[] {
  const { cm } = x;
  const d = cm.graph.device.density || 1, W = cm.graph.device.widthPx / d, H = cm.graph.device.heightPx / d;
  const out: AdT[] = [];
  for (const s of cm.screens) {
    const els = s.elements.filter(e => e.ad);
    for (const sig of s.signals.filter(k => k.kind === "ad")) {
      const el = s.elements.find(e => e.id === sig.el);
      if (el && !els.includes(el)) els.push(el);
      if (!el && !els.length) out.push({ format: "unknown", screen: s.id, conf: "inferred", evidence: [ev(s.representative, sig.text)] });
    }
    for (const el of els) {
      const { w, h } = el.rectDp;
      const format: AdT["format"] = w * h >= 0.6 * W * H ? "interstitial" : w >= 0.9 * W && h <= 70 ? "banner"
        : s.kind === "chat" ? "sponsored-answer" : el.role === "list-item" || (w >= 0.8 * W && h > 70) ? "native" : "unknown";
      out.push({ format, screen: s.id, el: el.id, conf: "inferred", evidence: [ev(s.representative, label(el), el.id)] });
    }
  }
  for (const v of cm.graph.externals.filter(k => k.kind === "ad")) {
    const screen = cm.screenOf.get(v.from);
    if (screen) out.push({ format: "interstitial", screen, conf: "inferred", evidence: [ev(v.obs, v.texts[0])] });
  }
  return out;
}

function stubBrief(x: Ctx, e: Economy, flows: Flow[]): Brief {
  const { cm } = x;
  const resName = (id: string) => e.resources.find(r => r.id === id)?.name ?? id;
  const launch = x.scr.get(cm.launch);
  const core = flows.find(f => f.kind === "core");
  const money = (n: number) => `$${n.toFixed(2)}`;
  const packs = e.offers.filter(o => o.kind === "pack" && o.priceUsd != null);
  const subs = e.offers.filter(o => o.kind === "subscription" || o.kind === "trial");
  const sink = e.sinks[0];
  const range = (xs: number[]) => (Math.min(...xs) === Math.max(...xs) ? `${xs[0]}` : `${Math.min(...xs)}–${Math.max(...xs)}`);
  const how: string[] = [];
  if (packs.length) how.push(`${packs.length} ${uniq(packs.map(o => resName(o.grants.resource ?? ""))).filter(Boolean).join("/") || "item"} pack(s) from ${money(Math.min(...packs.map(o => o.priceUsd!)))} to ${money(Math.max(...packs.map(o => o.priceUsd!)))} on ${uniq(packs.map(o => x.name(o.screen))).join(", ")}`);
  for (const o of subs) how.push(`${o.kind} "${o.label}" at ${o.priceText}${o.grants.period ? ` per ${o.grants.period}` : ""}`);
  if (e.ads.length) how.push(`ads (${uniq(e.ads.map(a => `${a.format} on ${x.name(a.screen)}`)).join(", ")})`);
  const scarce = uniq(e.sinks.map(k => k.resource)).map(r => {
    const ks = e.sinks.filter(k => k.resource === r);
    return `${resName(r)}: ${ks.map(k => `${k.amount} per "${k.action}"${k.context ? ` (${k.context})` : ""}`).join(", ")}`;
  });
  for (const w of e.walls) scarce.push(`${x.name(w.shows)} blocks "${w.blockedIntent}"`);
  const open: string[] = [];
  if (!e.offers.length) open.push("No prices were observed: is anything sold?");
  if (e.sinks.length && !e.sources.some(s => s.cadence === "daily")) open.push("No free daily source was observed.");
  if (cm.edges.some(g => g.effects.some(f => f.kind === "counter" && f.inferred))) open.push("Some costs are per-action deltas back-filled from balance changes (inferred), not read next to the action.");
  if (cm.coverage.notExplored.length) open.push(`${cm.coverage.notExplored.length} action(s) were not explored (guard rails, unreachable or failed).`);
  open.push("Brief assembled heuristically (stub synthesis): audience and positioning need the LLM.");
  return {
    oneLiner: `${cm.graph.app.name}: ${launch?.purpose || launch?.name || "app"}${sink ? `; "${sink.action}" spends ${resName(sink.resource)} (${range(e.sinks.filter(k => k.resource === sink.resource).map(k => k.amount))} each)` : ""}${packs.length ? `, sold in ${packs.length} pack(s)` : ""}.`,
    audience: "Not inferred without the LLM (stub synthesis).",
    coreLoop: core ? core.steps.map((s, i) => (i === 0 || !s.note ? x.name(s.screen) : `${x.name(s.screen)}: ${s.note}`).slice(0, 90)) : [],
    howItMakesMoney: how.length ? how.join("; ") : "No monetization observed during exploration.",
    whatIsScarce: scarce,
    adsToday: e.ads.length ? e.ads.map(a => `${a.format} on ${x.name(a.screen)}${a.evidence[0]?.quote ? ` ("${a.evidence[0].quote}")` : ""}`).join("; ") : "None observed.",
    openQuestions: open,
  };
}

export function stubDraft(cm: Compiled, flows: Flow[]): Draft {
  const x = new Ctx(cm);
  const res = resources(x);
  const sinkList = sinks(x);
  const offerList = offers(x);
  const economy: Economy = {
    resources: res, sinks: sinkList, sources: sources(x, offerList), offers: offerList,
    walls: walls(x, sinkList, offerList), entitlements: entitlements(x, offerList), ads: ads(x),
  };
  return { brief: stubBrief(x, economy, flows), economy, flowNames: [], extraMoments: [], by: "stub" };
}

// ------------------------------------------------------------------------------------------------
// LLM path
// ------------------------------------------------------------------------------------------------
// Structured-output schema: no z.record, no recursion, no regex; optional fields are nullable.
const LEv = z.object({ obs: z.string(), el: z.string().nullable(), quote: z.string() });
const LlmOut = z.object({
  brief: Brief,
  economy: z.object({
    resources: z.array(z.object({ id: z.string(), name: z.string(), unit: z.string(), kind: EconomyResource.shape.kind,
      shownOn: z.array(z.object({ screen: z.string(), el: z.string() })), observedValues: z.array(z.number()), resets: z.string().nullable(), evidence: z.array(LEv) })),
    sinks: z.array(z.object({ id: z.string(), resource: z.string(), amount: z.number(), action: z.string(), edges: z.array(z.string()), context: z.string().nullable(), evidence: z.array(LEv) })),
    sources: z.array(z.object({ id: z.string(), resource: z.string(), amount: z.number().nullable(), cadence: Source.shape.cadence, how: z.string(), screen: z.string().nullable(), evidence: z.array(LEv) })),
    offers: z.array(z.object({ id: z.string(), kind: Offer.shape.kind, label: z.string(), priceText: z.string(), priceUsd: z.number().nullable(),
      grants: z.object({ resource: z.string().nullable(), amount: z.number().nullable(), period: z.string().nullable(), entitlements: z.array(z.string()) }), screen: z.string(), evidence: z.array(LEv) })),
    walls: z.array(z.object({ id: z.string(), edge: z.string().nullable(), resource: z.string().nullable(), blockedIntent: z.string(), shows: z.string(), offers: z.array(z.string()), declineEdge: z.string().nullable(), evidence: z.array(LEv) })),
    entitlements: z.array(z.object({ plan: z.string(), benefits: z.array(z.string()), evidence: z.array(LEv) })),
    ads: z.array(z.object({ format: AdPlacement.shape.format, screen: z.string(), el: z.string().nullable(), evidence: z.array(LEv) })),
  }),
  flowNames: z.array(z.object({ flow: z.string(), name: z.string(), goal: z.string() })),
  extraMoments: z.array(z.object({ type: MomentType, screen: z.string(), edge: z.string().nullable(), resource: z.string().nullable(), description: z.string(), evidence: z.array(LEv) })),
});
type LlmOut = z.infer<typeof LlmOut>;

const SYSTEM = [
  `You are a product analyst reverse-engineering how a mobile app works and makes money, from the log of an automated exploration.
You receive a compact text rendering of the exploration graph (screens with their visible texts per observation id, navigation edges with measured effects and selection context, external surfaces such as billing sheets, counters, signals, candidate flows) and key screenshots.

Return: the brief, the economy, a name and goal for each listed flow, and extra moments.

Evidence rules (enforced by code afterwards; violations are marked "inferred"):
- Every economy item carries evidence [{obs, el, quote}]. obs is an observation id (oNNNN) from the text; quote is copied VERBATIM from the texts listed for that observation (a substring is fine). Never paraphrase a quote. el is an element id or null.
- Every number (amounts, prices) must come from a quote or from a measured counter effect on an edge. Never compute, convert or guess numbers.
- Do not compute unit prices, exchange rates or revenue: code does that.

Economy rules:
- resources: things the app counts and the user spends or earns (currencies, quotas, time). Reuse the listed resource ids (r1, ...).
- sinks: what an action costs, one per action and selection context (e.g. a mode). amount is positive. List the edge ids that showed the cost.
- sources: how the resource is earned: cadence once | daily | per-task | purchase | unknown.
- offers: every priced item seen (packs, subscriptions, trials, one-offs). priceText verbatim; priceUsd only when the price is in USD, else null; grants.amount from the text.
- walls: where an action is blocked because a resource ran out or a paywall appears. shows = the blocking screen id; offers = offer ids it leads to; declineEdge = the edge id that dismisses it.
- entitlements: paid plans and their listed benefits.
- ads: ad placements visible today (they are observed, never clicked).
- Ids: screens sNN, edges gNNNN and resources rN as given; new items k1.. (sinks), src1.. (sources), of1.. (offers), w1.. (walls).

The brief is for a product team: concise and specific to what was observed. Put unknowns in openQuestions instead of guessing.
extraMoments: only moments where a value exchange could happen that walls, spends, rewards, tabs and stores do not already cover (types: wall, desire, decline, post-reward, hub, first-value).`,
];

export function graphText(cm: Compiled, flows: Flow[]): string {
  const g = cm.graph;
  const d = g.device.density || 1;
  const L: string[] = [];
  const q = (t: string) => JSON.stringify(redactText(t).slice(0, 80));
  const name = (id: string) => cm.screens.find(s => s.id === id)?.name ?? id;
  const res = (id: string) => g.resources.find(r => r.id === id)?.name ?? id;
  L.push(`APP ${g.app.name}; device ${Math.round(g.device.widthPx / d)}x${Math.round(g.device.heightPx / d)} dp; launch screen ${cm.launch}`);
  L.push("", "SCREENS (id [kind] name, visits: purpose; then visible texts per observation id)");
  for (const s of cm.screens) {
    L.push(`${s.id} [${s.kind}${s.inScope ? "" : ", out of scope"}${s.parent ? `, over ${s.parent}` : ""}] ${q(s.name)} visits=${s.visits}: ${s.purpose}`);
    let budget = 40;
    const seen = new Set<string>();
    for (const oid of uniq([s.representative, ...s.observations])) {
      const fresh = textsOf(cm.obs.get(oid)).filter(t => !seen.has(t)).slice(0, budget);
      if (!fresh.length) continue;
      fresh.forEach(t => seen.add(t));
      budget -= fresh.length;
      L.push(`  ${oid}: ${fresh.map(q).join(" | ")}`);
      if (budget <= 0) break;
    }
    if (s.signals.length) L.push(`  signals: ${s.signals.map(k => `${k.kind} ${q(k.text)}${k.el ? ` (${k.el})` : ""}`).join("; ")}`);
    if (s.bindings.length) L.push(`  counters: ${s.bindings.map(b => `${b.el} shows ${b.resource}`).join("; ")}`);
    const ads = s.elements.filter(e => e.ad);
    if (ads.length) L.push(`  ad elements: ${ads.map(e => `${e.id} ${q(label(e))}`).join("; ")}`);
    const skipped = s.actions.filter(a => a.status === "skipped" || a.status === "unreachable" || a.status === "failed");
    if (skipped.length) L.push(`  not explored: ${skipped.slice(0, 8).map(a => `${q(a.intent)} [${a.status}${a.skip ? `: ${a.skip}` : ""}]`).join("; ")}`);
  }
  L.push("", "RESOURCES (counters the explorer bound to on-screen numbers)");
  for (const r of g.resources) {
    const vals = uniq(g.observations.flatMap(o => o.counters.filter(c => c.resource === r.id).map(c => c.value))).slice(0, 10);
    L.push(`${r.id} ${q(r.name)} unit=${q(r.unit)} shown on ${uniq(r.bindings.map(b => cm.screenOf.get(b.state) ?? b.state)).join(", ")}; values seen: ${vals.join(", ") || "?"}`);
  }
  L.push("", "EDGES (id from -> to [transition] action intent (kind); selection context; effects; obs before -> after)");
  const gEdge = new Map(g.edges.map(e => [e.id, e]));
  for (const e of cm.edges.slice(0, 200)) {
    const a = cm.actionOf.get(e.id);
    const fx = e.effects.map(f => (f.kind === "counter" ? `${f.resource} ${f.delta > 0 ? "+" : ""}${f.delta}${f.inferred ? " (inferred per action)" : ""}` : `${f.kind} ${q(f.text)}`));
    const ge = gEdge.get(e.id);
    L.push(`${e.id} ${e.from} -> ${e.to} [${e.transition}] ${q(a?.intent ?? e.action)} (${a?.kind ?? "?"})${e.context.selected.length ? ` while ${e.context.selected.map(q).join(" / ")} selected` : ""}${fx.length ? `; effects: ${fx.join(", ")}` : ""}${e.limitHit ? "; LIMIT HIT" : ""}; seen ${e.seen}${ge ? `; ${ge.obsBefore} -> ${ge.obsAfter}` : ""}`);
  }
  if (g.externals.length) {
    L.push("", "EXTERNALS (surfaces outside the app; recorded, never acted in)");
    for (const v of g.externals) L.push(`ext:${v.kind} from ${cm.screenOf.get(v.from) ?? v.from} via ${v.action}, obs ${v.obs}: ${v.texts.slice(0, 20).map(q).join(" | ")}`);
  }
  if (flows.length) {
    L.push("", "FLOWS (name each: flowNames[].flow = id)");
    for (const f of flows) L.push(`${f.id} [${f.kind}] ${f.steps.map(s => `${name(s.screen)}${s.note ? ` (${s.note})` : ""}`).join(" -> ")}`);
  }
  void res;
  return L.join("\n");
}

/** Up to 12 key screenshots: tabs, walls, stores/paywalls, reward/check-in screens, billing sheets, the spend screen. */
async function keyImages(cm: Compiled): Promise<{ imgs: Img[]; shas: string[] }> {
  const s = cm.screens;
  const spendScreens = uniq(cm.edges.filter(e => isConsume(e, cm.actionOf.get(e.id))).map(e => e.from));
  const ids = uniq([
    ...s.filter(k => k.kind === "tab").map(k => k.id),
    ...cm.edges.filter(e => e.limitHit && !e.to.startsWith("ext:")).map(e => e.to),
    ...s.filter(k => k.signals.some(g => g.kind === "limit")).map(k => k.id),
    ...s.filter(k => k.kind === "store" || k.kind === "paywall").map(k => k.id),
    ...s.filter(k => k.signals.some(g => g.kind === "reward") || DAILY.test(k.name)).map(k => k.id),
    ...cm.externals.filter(x => x.kind === "billing" && x.screenshot).map(x => x.id),
    ...spendScreens,
  ]).slice(0, 12);
  const imgs: Img[] = [];
  const shas: string[] = [];
  for (const id of ids) {
    const x = cm.externals.find(k => k.id === id);
    const scr = s.find(k => k.id === id);
    const file = x?.screenshot ?? scr?.screenshot;
    if (!file) continue;
    // Downscaled copies keep the request small; the cache key uses the ORIGINAL screenshot sha.
    const data = await sharp(path.join(cm.modelDir, file)).resize({ width: 720, withoutEnlargement: true }).png().toBuffer();
    imgs.push({ data, mediaType: "image/png", label: x ? `${id} (outside the app)` : `${id} ${scr!.name} [${scr!.kind}]` });
    shas.push(cm.shotSha.get(id) ?? sha256(data));
  }
  return { imgs, shas };
}

const nn = <T>(v: T | null): T | undefined => (v === null ? undefined : v);
const toEv = (xs: LlmOut["economy"]["sinks"][number]["evidence"]): Evidence[] => xs.map(k => ({ obs: k.obs, el: nn(k.el), quote: k.quote || undefined, verified: false }));

function fromLlm(o: LlmOut): Draft {
  const e = o.economy;
  return {
    brief: o.brief,
    economy: {
      resources: e.resources.map(r => ({ ...r, resets: nn(r.resets), conf: "inferred", evidence: toEv(r.evidence) })),
      sinks: e.sinks.map(k => ({ ...k, amount: Math.abs(k.amount), context: nn(k.context), conf: "inferred", evidence: toEv(k.evidence) })),
      sources: e.sources.map(k => ({ ...k, screen: nn(k.screen), conf: "inferred", evidence: toEv(k.evidence) })),
      offers: e.offers.map(k => ({ ...k, grants: { resource: nn(k.grants.resource), amount: nn(k.grants.amount), period: nn(k.grants.period), entitlements: k.grants.entitlements.length ? k.grants.entitlements : undefined },
        conf: "inferred", evidence: toEv(k.evidence) })),
      walls: e.walls.map(k => ({ ...k, edge: nn(k.edge), resource: nn(k.resource), declineEdge: nn(k.declineEdge), conf: "inferred", evidence: toEv(k.evidence) })),
      entitlements: e.entitlements.map(k => ({ ...k, conf: "inferred", evidence: toEv(k.evidence) })),
      ads: e.ads.map(k => ({ ...k, el: nn(k.el), conf: "inferred", evidence: toEv(k.evidence) })),
    },
    flowNames: o.flowNames,
    extraMoments: o.extraMoments.map(m => ({ type: m.type, screen: m.screen, edge: nn(m.edge), resource: nn(m.resource), description: m.description, evidence: toEv(m.evidence) })),
    by: "llm",
  };
}

export async function synthesize(cm: Compiled, flows: Flow[]): Promise<Draft> {
  const prompt = graphText(cm, flows);
  const { imgs, shas } = await keyImages(cm);
  let stubbed = false;
  const stub = (): LlmOut => { stubbed = true; return {} as LlmOut; };
  try {
    const out = await json({
      stage: "understand", purpose: "synthesize", model: MODELS.main, effort: "high", maxTokens: 32000,
      system: SYSTEM, prompt, images: imgs, schema: LlmOut,
      cacheKey: { prompt: sha256(canonical({ SYSTEM, prompt })), images: shas },
      stub,
    });
    if (!stubbed) return fromLlm(out);
  } catch (e) {
    trace("failure", { where: "understand:synthesize", error: String((e as Error).message ?? e).slice(0, 300) });
    trace("recovery", { how: "heuristic (stub) synthesis of the economy from counters, effects and on-screen texts" });
  }
  return stubDraft(cm, flows);
}

void escapeHtml;
