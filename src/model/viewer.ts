// viewer.html: a static, self-contained page (no fetch, no scripts needed; opens from file://) for a
// human to audit the product model: screens, economy with evidence thumbnails (inferred items
// highlighted), edges, moments, flows, coverage, what was NOT explored, and hand overrides.
import type { Evidence, ProductModel } from "../core/schema.ts";
import { escapeHtml as h } from "../core/io.ts";
import { exchangeRateLine } from "./economics.ts";

export function renderViewer(m: ProductModel): string {
  const scr = new Map(m.screens.map(s => [s.id, s]));
  const name = (id: string) => (id.startsWith("ext:") ? id : scr.get(id)?.name ?? id);
  // Evidence thumbnails: an observation maps to its variant screenshot if it has one, else its screen's.
  const shotOf = new Map<string, string>();
  for (const s of m.screens) {
    for (const o of s.observations) shotOf.set(o, s.screenshot);
    for (const v of s.variants) shotOf.set(v.obs, v.screenshot);
    shotOf.set(s.id, s.screenshot);
  }
  for (const x of m.externals) if (x.screenshot) shotOf.set(x.id, x.screenshot);
  const res = (id?: string) => (id ? m.economy.resources.find(r => r.id === id)?.name ?? id : "");
  const conf = (c: string) => `<span class="badge ${c}">${c}</span>`;
  const evid = (xs: Evidence[]) => xs.map(e => {
    const img = shotOf.get(e.obs);
    return `<div class="ev">${img ? `<a href="${h(img)}"><img src="${h(img)}" alt="" loading="lazy"></a>` : ""}<span>${h(e.obs)}${e.el ? `/${h(e.el)}` : ""}${e.quote ? ` “${h(e.quote)}”` : ""} ${e.verified ? '<b class="ok">✓</b>' : '<b class="no">✗</b>'}</span></div>`;
  }).join("");
  const table = (title: string, head: string[], rows: { cells: string[]; inferred?: boolean }[]) =>
    rows.length ? `<h3>${h(title)}</h3><table><thead><tr>${head.map(x => `<th>${h(x)}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr${r.inferred ? ' class="inferred"' : ""}>${r.cells.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>` : "";
  const e = m.economy;
  const d = e.derived;

  const screens = m.screens.map(s => `<figure class="card${s.inScope ? "" : " out"}">
  <a href="${h(s.screenshot)}"><img src="${h(s.screenshot)}" alt="${h(s.name)}" loading="lazy"></a>
  <figcaption><b>${h(s.id)} ${h(s.name)}</b> <span class="kind">${h(s.kind)}</span> <span class="badge ${s.render}">${s.render}</span>
  <p>${h(s.purpose)}</p><small>${s.visits} visits · ${s.elements.length} elements${s.parent ? ` · over ${h(s.parent)}` : ""}${s.variants.length ? ` · ${s.variants.length} variant(s)` : ""}${s.signals.length ? ` · signals: ${s.signals.map(x => h(x.kind)).join(", ")}` : ""}</small></figcaption></figure>`).join("\n");

  const economy = [
    table("Resources", ["id", "name", "kind", "shown on", "values", "conf", "evidence"], e.resources.map(r => ({ inferred: r.conf === "inferred",
      cells: [h(r.id), h(r.name), h(r.kind), r.shownOn.map(x => h(name(x.screen))).join(", "), r.observedValues.join(", "), conf(r.conf), evid(r.evidence)] }))),
    table("Sinks (what actions cost)", ["id", "action", "amount", "context", "edges", "conf", "evidence"], e.sinks.map(k => ({ inferred: k.conf === "inferred",
      cells: [h(k.id), h(k.action), `${k.amount} ${h(res(k.resource))}`, h(k.context ?? ""), h(k.edges.join(", ")), conf(k.conf), evid(k.evidence)] }))),
    table("Sources (how it is earned)", ["id", "how", "amount", "cadence", "conf", "evidence"], e.sources.map(k => ({ inferred: k.conf === "inferred",
      cells: [h(k.id), h(k.how), `${k.amount ?? "?"} ${h(res(k.resource))}`, h(k.cadence), conf(k.conf), evid(k.evidence)] }))),
    table("Offers", ["id", "kind", "label", "price", "USD", "grants", "screen", "conf", "evidence"], e.offers.map(o => ({ inferred: o.conf === "inferred",
      cells: [h(o.id), h(o.kind), h(o.label), h(o.priceText), o.priceUsd != null ? `$${o.priceUsd}` : "?", `${o.grants.amount ?? ""} ${h(res(o.grants.resource))}${o.grants.period ? ` / ${h(o.grants.period)}` : ""}`, h(name(o.screen)), conf(o.conf), evid(o.evidence)] }))),
    table("Walls", ["id", "blocks", "shows", "offers", "decline edge", "conf", "evidence"], e.walls.map(w => ({ inferred: w.conf === "inferred",
      cells: [h(w.id), `${h(w.blockedIntent)}${w.edge ? ` <small>(${h(w.edge)})</small>` : ""}`, h(name(w.shows)), h(w.offers.join(", ")), h(w.declineEdge ?? ""), conf(w.conf), evid(w.evidence)] }))),
    table("Entitlements", ["plan", "benefits", "conf", "evidence"], e.entitlements.map(x => ({ inferred: x.conf === "inferred",
      cells: [h(x.plan), h(x.benefits.join("; ")), conf(x.conf), evid(x.evidence)] }))),
    table("Ads today (observed, never tapped)", ["format", "screen", "element", "conf", "evidence"], e.ads.map(a => ({ inferred: a.conf === "inferred",
      cells: [h(a.format), h(name(a.screen)), h(a.el ?? ""), conf(a.conf), evid(a.evidence)] }))),
  ].join("\n") || "<p>No economy observed.</p>";

  const derived = d ? `<h3>Derived numbers (computed in code)</h3><ul>
${d.unitPriceUsd.map(u => `<li>unit price ${h(res(u.resource))}: $${u.min.toPrecision(3)}–$${u.max.toPrecision(3)}</li>`).join("")}
${d.unitsPerView.map(u => `<li><b>${h(exchangeRateLine(m, u.resource) ?? "")}</b></li>`).join("")}
${d.actionCostUsd.map(a => `<li>action cost ${h(a.sink)}: $${a.min.toFixed(4)}–$${a.max.toFixed(4)}</li>`).join("")}
${d.freeDailyUnits.map(f => `<li>free daily ${h(res(f.resource))}: ${f.units} (buys ${h(f.buys)})</li>`).join("")}
<li>cheapest paid pack: ${d.cheapestPaidUnitUsd != null ? `$${d.cheapestPaidUnitUsd}` : "none observed"}</li>
${d.notes.map(n => `<li class="note">${h(n)}</li>`).join("")}</ul>` : "";

  const edges = table("Edges", ["id", "from", "to", "transition", "action", "context", "effects"], m.edges.map(g => {
    const a = scr.get(g.from)?.actions.find(x => x.id === g.action);
    const fx = g.effects.map(f => (f.kind === "counter" ? `${h(res(f.resource))} ${f.delta > 0 ? "+" : ""}${f.delta}${f.inferred ? " (inferred)" : ""}` : `${f.kind} “${h(f.text.slice(0, 40))}”`));
    return { cells: [h(g.id), h(name(g.from)), h(name(g.to)), h(g.transition), `${h(a?.intent ?? g.action)}${g.el ? ` <small>${h(g.el)}</small>` : ""}`, h(g.context.selected.join(" / ")), `${fx.join("<br>")}${g.limitHit ? ' <span class="badge inferred">limit hit</span>' : ""}`] };
  }));

  const moments = table("Moments", ["id", "type", "screen", "reach", "description"], m.moments.map(x => ({
    cells: [h(x.id), `${h(x.type)}${x.noOffer ? ' <span class="badge no-offer">no offer</span>' : ""}`, h(name(x.screen)), h(x.reach), h(x.description)] })));
  const flows = m.flows.map(f => `<div class="flow"><b>${h(f.id)} [${h(f.kind)}] ${h(f.name)}</b> <small>${h(f.goal)}</small><ol>${f.steps.map(s => `<li>${h(name(s.screen))}${s.note ? ` <small>${h(s.note)}</small>` : ""}</li>`).join("")}</ol></div>`).join("\n");
  const transcripts = m.transcripts.map(t => `<div class="flow"><b>${h(name(t.screen))}</b>${t.turns.map(x => `<p class="turn ${x.role}">${h(x.text)}</p>`).join("")}</div>`).join("");
  const c = m.coverage;
  const notExplored = table("Not explored (and why)", ["screen", "action", "intent", "why"], c.notExplored.map(n => ({ cells: [h(name(n.screen)), h(n.action), h(n.intent), h(n.why)] })));
  const design = `<div class="swatches">${m.design.palette.map(p => `<span style="background:${h(p.hex)}" title="${h(p.hex)} ${Math.round(p.share * 100)}%"></span>`).join("")}</div>
<p>Type scale (dp): ${m.design.typeScaleDp.join(", ") || "?"} · fonts: ${m.design.fonts.map(f => `${h(f.family)} (${f.source})`).join(", ")}</p>
<div class="assets">${m.design.assets.map(a => `<img src="${h(a.file)}" title="${h(a.id)} ${a.kind} ${h(a.label ?? "")}" alt="">`).join("")}</div>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${h(m.app.name)} model</title>
<style>
:root{--bg:#f7f7f8;--fg:#18181b;--muted:#6b7280;--card:#fff;--line:#e4e4e7;--warn:#fff4d6;--accent:#4f46e5}
@media (prefers-color-scheme:dark){:root{--bg:#111113;--fg:#ececef;--muted:#9ca3af;--card:#1b1b1f;--line:#2e2e33;--warn:#3a2f10;--accent:#a5b4fc}}
*{box-sizing:border-box}body{margin:0;padding:24px 16px;background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:1200px;margin:0 auto}h1{margin:0 0 4px}h2{margin:32px 0 8px;border-bottom:1px solid var(--line);padding-bottom:4px}h3{margin:20px 0 6px}
small,.kind{color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px}
.card{margin:0;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden}.card.out{opacity:.55}
.card img{width:100%;aspect-ratio:9/19;object-fit:cover;object-position:top;display:block;border-bottom:1px solid var(--line)}
.card figcaption{padding:8px}.card p{margin:4px 0}
table{width:100%;border-collapse:collapse;background:var(--card);font-size:13px;display:block;overflow-x:auto}
th,td{text-align:left;vertical-align:top;padding:6px 8px;border-bottom:1px solid var(--line)}tr.inferred td{background:var(--warn)}
.badge{display:inline-block;padding:0 6px;border-radius:9px;font-size:11px;border:1px solid var(--line)}.badge.inferred{background:#f59e0b33}.badge.observed{background:#10b98133}
.badge.html{background:#4f46e533}.badge.no-offer{background:#ef444433}.ev{display:flex;gap:6px;align-items:flex-start;margin:2px 0}
.ev img{width:36px;height:72px;object-fit:cover;object-position:top;border:1px solid var(--line);border-radius:4px}.ok{color:#059669}.no{color:#dc2626}
.flow{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:8px 12px;margin:8px 0}.flow ol{margin:6px 0 0;padding-left:20px}
.turn{margin:4px 0;padding:4px 8px;border-radius:8px;max-width:80%}.turn.user{margin-left:auto;background:#4f46e522}.turn.app{background:var(--bg)}
.swatches span{display:inline-block;width:36px;height:36px;border-radius:6px;margin-right:4px;border:1px solid var(--line)}
.assets img{height:40px;margin:2px;border:1px solid var(--line);border-radius:4px}dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 12px}dt{color:var(--muted)}dd{margin:0}
</style></head><body><main>
<h1>${h(m.app.name)}</h1>
<p><small>${h(m.app.package)} · captured ${h(m.app.capturedAt.slice(0, 19))} · run ${h(m.app.runId)} · account ${h(m.app.accountState)}</small></p>
<p>Regime: <b>${h(m.regime)}</b> · synthesized by <b>${h(m.provenance.synthesizedBy)}</b> · ${m.provenance.verifiedClaims} verified / ${m.provenance.inferredClaims} inferred claims · HTML screens ${m.screens.filter(s => s.render === "html").length}/${m.screens.length}</p>
<h2>Brief</h2><dl>
<dt>One-liner</dt><dd>${h(m.brief.oneLiner)}</dd><dt>Audience</dt><dd>${h(m.brief.audience)}</dd>
<dt>Core loop</dt><dd>${m.brief.coreLoop.map(h).join(" → ")}</dd><dt>Makes money</dt><dd>${h(m.brief.howItMakesMoney)}</dd>
<dt>Scarce</dt><dd>${m.brief.whatIsScarce.map(h).join("<br>")}</dd><dt>Ads today</dt><dd>${h(m.brief.adsToday)}</dd>
<dt>Open questions</dt><dd>${m.brief.openQuestions.map(h).join("<br>")}</dd></dl>
<h2>Screens (${m.screens.length})</h2><div class="grid">${screens}</div>
<h2>Economy</h2><p><small>Rows highlighted in yellow are <b>inferred</b>: a quote or number could not be found on screen or in a measured effect.</small></p>
${economy}
${derived}
<h2>Moments</h2>${moments}
<h2>Flows</h2>${flows || "<p>None.</p>"}
<h2>Navigation</h2>${edges}
${m.externals.length ? `<h3>Leaves the app</h3><ul>${m.externals.map(x => `<li>${h(x.id)} ${h(x.package)} from ${[...new Set(x.from.map(f => h(name(f.screen))))].join(", ")}${x.texts.length ? `: ${x.texts.slice(0, 6).map(h).join(" | ")}` : ""}${x.screenshot ? ` <a href="${h(x.screenshot)}">screenshot</a>` : ""}</li>`).join("")}</ul>` : ""}
${transcripts ? `<h2>Transcripts</h2>${transcripts}` : ""}
<h2>Design tokens</h2>${design}
<h2>Coverage</h2><p>${c.states} states, ${c.edges} edges, ${c.externals} external surfaces, ${c.steps} steps in ${c.minutes} min ($${c.usd.toFixed(2)}). Stop: <b>${h(c.stopReason)}</b>. Frontier left: ${c.frontierLeft}. Unreachable: ${c.unreachable}. Human interventions: ${c.humanInterventions}.</p>
${notExplored}
<h2>Human steps and overrides</h2>${m.human.length ? `<ul>${m.human.map(x => `<li><small>${h(x.ts.slice(0, 19))}</small> ${h(x.note)}</li>`).join("")}</ul>` : "<p>None.</p>"}
</main></body></html>
`;
}
