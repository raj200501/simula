// Moments: the places where a value exchange could happen (FINAL_PLAN §5.2). Pure function of the
// model, so the proposer and the judge argue about the same, reproducible list.
//   wall         the user is blocked (limit hit, paywall after a spend)
//   desire       the user spends, or sees something locked / upsold outside the store
//   decline      the user says no to a wall, store or paywall
//   post-reward  the user just received something (check-in, task reward)
//   hub          a tab or store the user keeps returning to
//   first-value  the first core-content screen after launch: offers are FORBIDDEN here (noOffer)
import type { Economy, Edge, Evidence, Flow, Moment, Screen } from "../core/schema.ts";
import { isConsume } from "./flows.ts";
import { humanizeAction } from "../core/humanize.ts";

export interface ExtraMoment { type: Moment["type"]; screen: string; edge?: string; resource?: string; description: string; evidence: Evidence[] }

const DECLINE = /not now|no,? thanks|maybe later|later|cancel|close|dismiss|skip|×|✕/i;
const NOT_CONTENT = new Set(["onboarding", "login", "modal", "sheet", "dialog", "paywall", "store", "webview"]);

export function detectMoments(m: { screens: Screen[]; edges: Edge[]; economy: Economy; flows: Flow[] }, launch: string, extra: ExtraMoment[] = []): Moment[] {
  const scr = new Map(m.screens.map(s => [s.id, s]));
  const name = (id: string) => scr.get(id)?.name ?? id;
  const resName = (id?: string) => m.economy.resources.find(r => r.id === id)?.name ?? id ?? "";
  const actionOf = (e: Edge) => scr.get(e.from)?.actions.find(a => a.id === e.action);
  const core = new Set(m.flows.filter(f => f.kind === "core").flatMap(f => f.steps.map(s => s.screen)));
  const money = new Set(m.flows.filter(f => f.kind === "monetization").flatMap(f => f.steps.map(s => s.screen)));
  // Reach: on the core loop, else how often people get there.
  const reach = (id: string): Moment["reach"] => {
    const v = scr.get(id)?.visits ?? 0;
    return core.has(id) ? "core-loop" : v >= 5 || money.has(id) ? "frequent" : v >= 2 ? "occasional" : "rare";
  };
  const out: Omit<Moment, "id">[] = [];
  const has = (type: Moment["type"], screen: string, edge?: string) => out.some(o => o.type === type && o.screen === screen && (edge === undefined || o.edge === edge));
  const add = (o: Omit<Moment, "id" | "reach" | "noOffer"> & { noOffer?: boolean }) => {
    if (!scr.has(o.screen) || has(o.type, o.screen, o.edge)) return;
    out.push({ ...o, reach: reach(o.screen), noOffer: o.noOffer ?? false });
  };

  for (const w of m.economy.walls) {
    add({ type: "wall", screen: w.shows, edge: w.edge, resource: w.resource,
      description: `"${w.blockedIntent}" is blocked${w.resource ? ` when ${resName(w.resource)} run out` : ""}: ${name(w.shows)} appears${w.offers.length ? ` and points to ${w.offers.length} offer(s)` : ""}`, evidence: w.evidence });
    if (w.declineEdge) {
      const d = m.edges.find(e => e.id === w.declineEdge);
      const el = d && scr.get(d.from)?.elements.find(x => x.id === d.el);
      add({ type: "decline", screen: w.shows, edge: w.declineEdge, resource: w.resource,
        description: `The user dismisses ${name(w.shows)}${el ? ` ("${el.text || el.label}")` : ""} without buying and returns to ${d ? name(d.to) : "the app"}`, evidence: [] });
    }
  }
  // Paywalls reached straight from a spend are walls even when the drain probe did not flag them.
  for (const e of m.edges) {
    const to = scr.get(e.to);
    if (to?.kind === "paywall" && !m.economy.walls.some(w => w.shows === to.id) && isConsume(e, actionOf(e)))
      add({ type: "wall", screen: to.id, edge: e.id, description: `${humanizeAction(actionOf(e)?.intent) || "An action"} leads straight to the paywall ${to.name}`, evidence: [] });
  }
  // Declines out of stores and paywalls: BACK, or a "not now" style control.
  for (const e of m.edges) {
    const from = scr.get(e.from);
    if (!from || (from.kind !== "store" && from.kind !== "paywall") || e.to.startsWith("ext:") || e.to === e.from) continue;
    const el = from.elements.find(x => x.id === e.el);
    if (e.transition === "back" || DECLINE.test(el?.text || el?.label || ""))
      add({ type: "decline", screen: from.id, edge: e.id, description: `The user leaves ${from.name} without buying`, evidence: [] });
  }

  // Desire: every spend (grouped per screen and resource), then locks / upsells / prices outside the store.
  const bySink = new Map<string, Economy["sinks"]>();
  for (const k of m.economy.sinks) {
    const e = m.edges.find(x => k.edges.includes(x.id));
    const key = `${e?.from ?? ""}|${k.resource}`;
    if (e) bySink.set(key, [...(bySink.get(key) ?? []), k]);
  }
  for (const [key, ks] of bySink) {
    const [screen, resource] = key.split("|");
    const amounts = [...new Set(ks.map(k => k.amount))].sort((a, b) => a - b);
    const amt = amounts.length > 1 ? `${amounts[0]}–${amounts[amounts.length - 1]}` : `${amounts[0]}`;
    add({ type: "desire", screen, resource, edge: ks[0].edges[0],
      description: `Each "${ks[0].action}" on ${name(screen)} costs ${amt} ${resName(resource)}${ks.some(k => k.context) ? ` depending on ${ks.map(k => k.context).filter(Boolean).join(" / ")}` : ""}`,
      evidence: ks.flatMap(k => k.evidence).slice(0, 3) });
  }
  for (const s of m.screens) {
    if (s.kind === "store" || s.kind === "paywall" || has("desire", s.id) || has("wall", s.id)) continue;
    const sig = s.signals.find(x => x.kind === "lock" || x.kind === "upsell" || x.kind === "price");
    if (sig) add({ type: "desire", screen: s.id, description: `${s.name} shows ${sig.kind === "lock" ? "a locked feature" : sig.kind === "upsell" ? "an upsell" : "a price"}: "${sig.text}"`,
      evidence: [{ obs: s.representative, el: sig.el, quote: sig.text, verified: false }] });
  }

  for (const src of m.economy.sources) {
    if (!src.screen || src.cadence === "purchase") continue;
    add({ type: "post-reward", screen: src.screen, resource: src.resource,
      description: `Right after ${src.how}${src.amount != null ? ` (+${src.amount} ${resName(src.resource)})` : ""}${src.cadence !== "unknown" ? `, ${src.cadence}` : ""}`, evidence: src.evidence });
  }

  for (const s of m.screens) {
    if (s.inScope && (s.kind === "tab" || s.kind === "store"))
      add({ type: "hub", screen: s.id, description: `${s.name} (${s.kind}) is a place users return to (${s.visits} visits during exploration)`, evidence: [] });
  }

  // First value: BFS from launch past onboarding, login and overlays to the first core-content screen.
  const seen = new Set<string>([launch]);
  const q = [launch];
  while (q.length) {
    const id = q.shift()!;
    const s = scr.get(id);
    if (s && s.inScope && !NOT_CONTENT.has(s.kind)) {
      add({ type: "first-value", screen: id, noOffer: true, description: `${s.name} is the first screen with core content after launch: no offer may appear here`, evidence: [] });
      break;
    }
    for (const e of m.edges.filter(x => x.from === id && !x.to.startsWith("ext:")).sort((a, b) => a.id.localeCompare(b.id)))
      if (!seen.has(e.to)) { seen.add(e.to); q.push(e.to); }
  }

  for (const x of extra) add({ ...x, noOffer: x.type === "first-value" });
  return out.map((o, i) => ({ ...o, id: `m${i + 1}` }));
}
