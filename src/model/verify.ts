// verify: deterministic grounding of the synthesized economy. An LLM (or the stub) may say anything;
// only what we can find on screen, or in a measured counter effect, is "observed".
//   - every evidence quote must appear (case- and whitespace-insensitive) in THAT observation's texts;
//   - every number in sinks / sources / offers must appear in a verified quote or in a counter effect;
//   - otherwise the item is kept but marked conf:"inferred" (the viewer highlights it).
// It also drops or repairs references to ids that do not exist (screens, edges, offers).
import type { Economy, Evidence, ExploreGraph } from "../core/schema.ts";
import { trace } from "../core/trace.ts";
import { redactText } from "./redact.ts";

export interface Corpus {
  texts: Map<string, string[]>;          // observation id | screen id | ext id -> visible texts
  elements: Map<string, Set<string>>;    // observation id -> element ids
  effects: { resource: string; delta: number }[];
}
export interface Ids { screens: Set<string>; edges: Set<string>; externals: Map<string, string> } // ext id -> a screen it is reached from

/** Texts are redacted exactly like the model's texts (and the synthesis prompt), so a quote that
 *  names "[email]" is found where the screen showed an address, and a raw address never verifies. */
export function buildCorpus(g: ExploreGraph, obsScreen: Map<string, string>): Corpus {
  const texts = new Map<string, string[]>();
  const elements = new Map<string, Set<string>>();
  const push = (k: string, xs: string[]) => texts.set(k, [...(texts.get(k) ?? []), ...xs.filter(Boolean).map(t => redactText(t))]);
  for (const o of g.observations) {
    const xs = [...o.texts, ...o.elements.flatMap(e => [e.text ?? "", e.label ?? ""])];
    push(o.id, xs);
    elements.set(o.id, new Set(o.elements.map(e => e.id)));
    const s = obsScreen.get(o.id);
    if (s) push(s, xs);
  }
  for (const v of g.externals) { push(v.obs, v.texts); push(`ext:${v.kind}`, v.texts); }
  const effects = g.edges.flatMap(e => e.effects.flatMap(f => (f.kind === "counter" ? [{ resource: f.resource, delta: f.delta }] : [])));
  return { texts, elements, effects };
}

const norm = (s: string) => s.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();

export function quoteFound(quote: string, texts: string[] | undefined): boolean {
  if (!texts?.length || !norm(quote)) return false;
  const q = norm(quote);
  return texts.some(t => norm(t).includes(q)) || norm(texts.join(" ")).includes(q);
}

/** Numbers as written on screen: "1,000" -> 1000, "$1.39" -> 1.39, "1.000" -> 1000, "+300" -> 300, "2K" -> 2000. */
export function numbersIn(s: string): number[] {
  const out: number[] = [];
  for (const m of s.matchAll(/(\d[\d.,]*)(\s?[kK]\b)?/g)) {
    let t = m[1].replace(/[.,]$/, "");
    const seps = [...t.matchAll(/[.,]/g)];
    if (seps.length) {
      const last = seps[seps.length - 1];
      // One kind of separator with 3-digit groups ("1,000", "1.234.567") is grouping; otherwise the last one is decimal.
      const grouping = new Set(seps.map(s => s[0])).size === 1 && t.split(/[.,]/).slice(1).every(p => p.length === 3);
      t = grouping ? t.replace(/[.,]/g, "") : t.slice(0, last.index).replace(/[.,]/g, "") + "." + t.slice(last.index! + 1);
    }
    const n = Number(t) * (m[2] ? 1000 : 1);
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

const same = (a: number, b: number) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a));

interface Num { value: number; sign?: 1 | -1; resource?: string }

/** Check one item's evidence and numbers; returns the item's confidence and the evidence with `verified` set. */
function check(evidence: Evidence[], nums: Num[], c: Corpus): { conf: "observed" | "inferred"; evidence: Evidence[] } {
  const ev = evidence.map(x => ({
    ...x,
    verified: x.quote ? quoteFound(x.quote, c.texts.get(x.obs)) : !!(x.el && c.elements.get(x.obs)?.has(x.el)),
  }));
  const quoteNums = ev.filter(x => x.verified && x.quote).flatMap(x => numbersIn(x.quote!));
  const byEffect = (n: Num) => n.sign !== undefined && c.effects.some(f => (!n.resource || f.resource === n.resource) && same(f.delta, n.sign! * n.value));
  const numsOk = nums.every(n => quoteNums.some(q => same(q, n.value)) || byEffect(n));
  const quotesOk = ev.every(x => !x.quote || x.verified);
  const grounded = ev.some(x => x.verified) || nums.some(byEffect);
  return { conf: quotesOk && numsOk && grounded ? "observed" : "inferred", evidence: ev };
}

function uniqueIds<T extends { id: string }>(xs: T[]): T[] {
  const seen = new Set<string>();
  return xs.map(x => { let id = x.id, n = 2; while (seen.has(id)) id = `${x.id}_${n++}`; seen.add(id); return { ...x, id }; });
}

export function verifyEconomy(e: Economy, c: Corpus, ids: Ids): { economy: Economy; verified: number; inferred: number } {
  const drop = (what: string, why: string) => trace("failure", { where: "understand:verify", error: `dropped ${what}: ${why}` });
  const screenOr = (s: string) => (ids.screens.has(s) ? s : ids.externals.get(s));
  const resources = uniqueIds(e.resources).map(r => ({ ...r, shownOn: r.shownOn.filter(x => ids.screens.has(x.screen)), ...check(r.evidence, [], c) }));
  const resIds = new Set(resources.map(r => r.id));
  const sinks = uniqueIds(e.sinks).map(k => {
    const v = check(k.evidence, [{ value: k.amount, sign: -1, resource: k.resource }], c);
    return { ...k, edges: k.edges.filter(x => ids.edges.has(x)), ...v, conf: resIds.has(k.resource) ? v.conf : "inferred" as const };
  });
  const sources = uniqueIds(e.sources).map(s => ({
    ...s, screen: s.screen && ids.screens.has(s.screen) ? s.screen : undefined,
    ...check(s.evidence, s.amount != null ? [{ value: s.amount, sign: 1, resource: s.resource }] : [], c),
  }));
  const offers = uniqueIds(e.offers).flatMap(o => {
    const screen = screenOr(o.screen);
    if (!screen) { drop(`offer ${o.id}`, `unknown screen ${o.screen}`); return []; }
    const price = numbersIn(o.priceText)[0];
    const nums: Num[] = [...(price != null ? [{ value: price }] : []), ...(o.grants.amount != null ? [{ value: o.grants.amount }] : [])];
    return [{ ...o, screen, ...check(o.evidence, nums, c) }];
  });
  const offerIds = new Set(offers.map(o => o.id));
  const walls = uniqueIds(e.walls).flatMap(w => {
    if (!ids.screens.has(w.shows)) { drop(`wall ${w.id}`, `unknown screen ${w.shows}`); return []; }
    return [{ ...w, edge: w.edge && ids.edges.has(w.edge) ? w.edge : undefined, declineEdge: w.declineEdge && ids.edges.has(w.declineEdge) ? w.declineEdge : undefined,
      offers: w.offers.filter(x => offerIds.has(x)), ...check(w.evidence, [], c) }];
  });
  const entitlements = e.entitlements.map(x => ({ ...x, ...check(x.evidence, [], c) }));
  const ads = e.ads.flatMap(a => {
    const screen = screenOr(a.screen);
    if (!screen) { drop(`ad on ${a.screen}`, "unknown screen"); return []; }
    return [{ ...a, screen, ...check(a.evidence, [], c) }];
  });
  const economy: Economy = { resources, sinks, sources, offers, walls, entitlements, ads };
  const all = [...resources, ...sinks, ...sources, ...offers, ...walls, ...entitlements, ...ads];
  const verified = all.filter(x => x.conf === "observed").length;
  trace("decision", { what: "verify", verified, inferred: all.length - verified,
    inferredItems: [...resources, ...sinks, ...sources, ...offers, ...walls].filter(x => x.conf === "inferred").map(x => x.id) });
  return { economy, verified, inferred: all.length - verified };
}
