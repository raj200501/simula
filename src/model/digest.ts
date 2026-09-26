// Deterministic text rendering of the product model. The proposer and the judge both read exactly
// this (plus a few screenshots), so they reason about the same facts with the same ids.
import type { ProductModel } from "../core/schema.ts";
import { ECON, exchangeRateLine, maxUnitsAtCost } from "./economics.ts";

export function digest(m: ProductModel): string {
  const L: string[] = [];
  const e = m.economy;
  const d = e.derived;
  const scr = (id: string) => m.screens.find(s => s.id === id)?.name ?? id;
  L.push(`# ${m.app.name} — product model digest`, "");
  L.push(`Captured ${m.app.capturedAt.slice(0, 10)}, account state: ${m.app.accountState}. Regime (computed): **${m.regime}**.`, "");
  L.push("## Brief", "");
  L.push(`- One-liner: ${m.brief.oneLiner}`);
  L.push(`- Audience: ${m.brief.audience}`);
  L.push(`- Core loop: ${m.brief.coreLoop.join(" → ")}`);
  L.push(`- How it makes money today: ${m.brief.howItMakesMoney}`);
  L.push(`- What is scarce: ${m.brief.whatIsScarce.join("; ") || "nothing observed"}`);
  L.push(`- Ads today: ${m.brief.adsToday}`);
  if (m.brief.openQuestions.length) L.push(`- Open questions: ${m.brief.openQuestions.join("; ")}`);
  L.push("", "## Economy (every item has evidence; conf=inferred means not verified on screen)", "");
  const ev = (xs: { obs: string; quote?: string; verified: boolean }[]) =>
    xs.slice(0, 2).map(x => `${x.obs}${x.quote ? ` "${x.quote.slice(0, 60)}"` : ""}${x.verified ? "" : " (unverified)"}`).join("; ");
  for (const r of e.resources) L.push(`- RESOURCE ${r.id} ${r.name} [${r.kind}, unit=${r.unit}] shown on ${r.shownOn.map(s => scr(s.screen)).join(", ") || "?"}; observed values ${r.observedValues.slice(0, 6).join(", ") || "?"}${r.resets ? `; resets ${r.resets}` : ""} (${r.conf}) — ${ev(r.evidence)}`);
  for (const s of e.sinks) L.push(`- SINK ${s.id}: ${s.action} costs ${s.amount} ${s.resource}${s.context ? ` when ${s.context}` : ""} (${s.conf}) — ${ev(s.evidence)}`);
  for (const s of e.sources) L.push(`- SOURCE ${s.id}: ${s.how} gives ${s.amount ?? "?"} ${s.resource} [${s.cadence}]${s.screen ? ` on ${scr(s.screen)}` : ""} (${s.conf}) — ${ev(s.evidence)}`);
  for (const o of e.offers) L.push(`- OFFER ${o.id} [${o.kind}] "${o.label}" ${o.priceText}${o.priceUsd != null ? ` ($${o.priceUsd})` : ""} grants ${o.grants.amount ?? ""} ${o.grants.resource ?? ""}${o.grants.period ? ` per ${o.grants.period}` : ""}${o.grants.entitlements?.length ? ` + ${o.grants.entitlements.join(", ")}` : ""} on ${scr(o.screen)}`);
  for (const w of e.walls) L.push(`- WALL ${w.id}: blocks "${w.blockedIntent}"${w.resource ? ` when ${w.resource} runs out` : ""}; shows ${scr(w.shows)}; offers ${w.offers.join(", ") || "none"}${w.declineEdge ? `; decline edge ${w.declineEdge}` : ""}`);
  for (const en of e.entitlements) L.push(`- ENTITLEMENT plan "${en.plan}": ${en.benefits.join("; ")}`);
  for (const a of e.ads) L.push(`- AD TODAY ${a.format} on ${scr(a.screen)}${a.el ? ` (${a.el})` : ""}`);
  if (!e.ads.length) L.push("- AD TODAY: none observed");
  if (d) {
    L.push("", "## Derived numbers (computed in code from observed prices and cited constants — use these, do not recompute)", "");
    for (const u of d.unitPriceUsd) L.push(`- unit price ${u.resource}: $${u.min.toPrecision(3)}–$${u.max.toPrecision(3)} per unit`);
    for (const a of d.actionCostUsd) L.push(`- action cost ${a.sink}: $${a.min.toFixed(4)}–$${a.max.toFixed(4)}`);
    for (const f of d.freeDailyUnits) L.push(`- free daily ${f.resource}: ${f.units} (buys ${f.buys})`);
    L.push(`- value of one completed rewarded view (after non-game haircut): US $${d.viewValueUsd.US.join("–")}, EU $${d.viewValueUsd.EU.join("–")}, LATAM $${d.viewValueUsd.LATAM.join("–")}`);
    for (const u of d.unitsPerView) {
      L.push(`- EXCHANGE RATE: ${exchangeRateLine(m, u.resource)}`);
      // No list price: the ceiling is what serving the reward costs against what a view nets.
      if (u.basis === "cost-to-serve") {
        const unit = e.resources.find(r => r.id === u.resource)?.unit ?? u.resource;
        L.push(`- REWARD SIZE for ${u.resource}: at most ${maxUnitsAtCost(u)} ${unit} per view, so serving the reward costs at most ~${Math.round(ECON.cogsTargetShare * 100)}% of what a view nets at the low end [TRIG-4]`);
      }
    }
    L.push(`- cheapest paid pack: ${d.cheapestPaidUnitUsd != null ? `$${d.cheapestPaidUnitUsd}` : "none observed"}`);
    for (const n of d.notes) L.push(`- note: ${n}`);
  }
  L.push("", "## Moments (where a value exchange could happen)", "");
  for (const mo of m.moments) L.push(`- ${mo.id} [${mo.type}${mo.noOffer ? ", NO OFFERS ALLOWED" : ""}] on ${mo.screen} (${scr(mo.screen)}), reach=${mo.reach}: ${mo.description}`);
  L.push("", "## Flows", "");
  for (const f of m.flows) L.push(`- ${f.id} [${f.kind}] ${f.name}: ${f.steps.map(s => `${scr(s.screen)}${s.note ? ` (${s.note})` : ""}`).join(" → ")}`);
  L.push("", "## Screens (id, kind, name — purpose; key texts; actions)", "");
  for (const s of m.screens.filter(s => s.inScope)) {
    const texts = [...new Set(s.elements.map(x => x.text || x.label || "").filter(Boolean))].slice(0, 25).map(t => t.slice(0, 50));
    const acts = s.actions.filter(a => a.status !== "skipped").slice(0, 10).map(a => `${a.intent}${a.status !== "done" ? ` [${a.status}]` : ""}`);
    const sig = s.signals.map(x => `${x.kind}:"${x.text.slice(0, 40)}"`);
    L.push(`### ${s.id} [${s.kind}] ${s.name}`, `${s.purpose}`);
    L.push(`- texts: ${texts.map(t => `"${t}"`).join(", ")}`);
    if (sig.length) L.push(`- signals: ${sig.join(", ")}`);
    if (acts.length) L.push(`- actions: ${acts.join("; ")}`);
    L.push(`- element ids available for callouts: ${s.elements.filter(x => x.text || x.label).slice(0, 20).map(x => `${x.id}="${(x.text || x.label || "").slice(0, 24)}"`).join(", ")}`);
    L.push("");
  }
  L.push("## Navigation edges (from → to via action; effects)", "");
  for (const g of m.edges.slice(0, 120)) {
    const fx = g.effects.map(f => (f.kind === "counter" ? `${f.resource} ${f.delta > 0 ? "+" : ""}${f.delta}${f.inferred ? " (inferred)" : ""}` : `${f.kind} "${f.text.slice(0, 30)}"`)).join(", ");
    L.push(`- ${g.id}: ${g.from} → ${g.to} [${g.transition}] via ${g.action}${g.el ? ` (${g.el})` : ""}${g.context.selected.length ? ` while ${g.context.selected.join("/")} selected` : ""}${fx ? `; ${fx}` : ""}${g.limitHit ? "; LIMIT HIT" : ""}`);
  }
  if (m.externals.length) {
    L.push("", "## Leaves the app (recorded, not explored)", "");
    for (const x of m.externals) L.push(`- ${x.id} (${x.package}) from ${[...new Set(x.from.map(f => scr(f.screen)))].join(", ")}${x.texts.length ? `: ${x.texts.slice(0, 6).join(" | ")}` : ""}`);
  }
  L.push("", `## Coverage`, "", `${m.coverage.states} states, ${m.coverage.edges} edges, ${m.coverage.steps} steps, stop: ${m.coverage.stopReason}. Not explored: ${m.coverage.notExplored.length} actions.`);
  // What was deliberately or unavoidably left alone: nothing may be claimed about what is behind these.
  for (const n of m.coverage.notExplored.slice(0, 15)) L.push(`- not explored on ${scr(n.screen)}: ${n.intent} (${n.why})`);
  if (m.coverage.notExplored.length > 15) L.push(`- ... and ${m.coverage.notExplored.length - 15} more (see viewer.html)`);
  return L.join("\n") + "\n";
}
