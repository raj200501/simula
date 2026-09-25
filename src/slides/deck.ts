// deck.html: 1920x1080 sections in the order a product team reads them (FINAL_PLAN §10 as amended
// by CRITIQUE E5/D6/T10). Pure string rendering from typed inputs; images are files next to the
// deck (img/), so the page opens from file:// and prints to PDF unchanged.
import type { Candidates, Judgments, ProductModel, Proposal, ProposalEconomics } from "../core/schema.ts";
import { escapeHtml as h } from "../core/io.ts";
import { deriveEconomy, exchangeRateLine } from "../model/economics.ts";
import type { CostRollup, QaDigest } from "../report/data.ts";
import { fmtTokens, fmtUsd } from "../report/data.ts";
import { PRODUCTIONIZATION } from "../report/content.ts";
import type { Box, Frame } from "./capture.ts";
import {
  PHASE_LABEL, cheapestPack, clip, ideaRows, latestFinals, moneyToday, num, resourceOf, rewardText, screenName, undevelopedIdeas, unitOf,
  type EconRow, type Final, type IdeaRow, type JudgeChange, type PhaseId, type WhyBullet,
} from "./facts.ts";

export interface FlowInput {
  p: Proposal;
  f: Final;
  econ: ProposalEconomics;
  frames: Frame[];
  claim: string;
  declineTo: string;
  surfaceName: string;
  protoHref: string;
  snippet: string;
  changes: JudgeChange | null;
  why: WhyBullet[];
  econRows: EconRow[];
  precedents: { id: string; title: string }[];
}

export interface DeckInput {
  m: ProductModel;
  cands: Candidates;
  j: Judgments;
  flows: FlowInput[];
  accent: { accent: string; ink: string };
  /** screen id -> image path relative to the deck, for "how it makes money today". */
  shots: Map<string, string>;
  qa: QaDigest | null;
  cost: CostRollup;
}

const W = 1920, PAD_X = 72, RAIL = 360, GAP = 40, ARROW = 36, TRIG = 156, BEZEL = 7, LABEL_H = 34;

export function renderDeck(d: DeckInput): string {
  const { m } = d;
  const slides: string[] = [];
  const flowSlideOf = new Map<string, number>();
  // slide numbers: 1 recommendation, 2 money today, then flow + details per SHIP
  d.flows.forEach((f, i) => flowSlideOf.set(f.p.id, 3 + i * 2));
  const rows = ideaRows(d.cands, d.j, flowSlideOf);

  slides.push(recommendation(d, rows));
  slides.push(moneySlide(d));
  d.flows.forEach((f, i) => {
    slides.push(flowSlide(d, f, i));
    slides.push(detailsSlide(d, f, i));
  });
  const perPage = 9;
  for (let k = 0; k < Math.max(1, Math.ceil(rows.length / perPage)); k++) slides.push(ideasSlide(d, rows.slice(k * perPage, (k + 1) * perPage), k));
  slides.push(appendixMethod(d));
  slides.push(appendixCost(d));
  slides.push(appendixScale(d));

  const total = slides.length;
  const body = slides.map((s, i) => s.replace("{{PAGE}}", `${i + 1} / ${total}`)).join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${h(m.app.name)}: rewarded flows</title>
<style>${css(d.accent)}</style>
</head><body>
${body}
<script>
// Fit 1920px slides to the window on screen; print (PDF/PNG export) always renders at 1:1.
(function () { function fit() { var z = Math.min(1, (window.innerWidth - 32) / ${W}); document.documentElement.style.setProperty("--z", String(z)); } fit(); window.addEventListener("resize", fit); })();
</script>
</body></html>
`;
}

// ------------------------------------------------------------------------------------------------ slides
function recommendation(d: DeckInput, rows: IdeaRow[]): string {
  const { m, flows } = d;
  const n = flows.length;
  const count = (v: string) => rows.filter(r => r.verdict === v).length;
  const reviewed = `We reviewed ${rows.length} idea${rows.length === 1 ? "" : "s"}: ${count("SHIP")} ship, ${count("REVISE")} need revision, ${count("REJECT")} rejected.`;
  const units = [...new Set(flows.map(f => resourceOf(m, f.p.reward.resource)).filter(Boolean).map(r => unitOf(r!)))];
  const sentence = n
    ? `Add ${words(n)} opt-in rewarded ${n === 1 ? "flow" : "flows"} to ${m.app.name} that ${n === 1 ? "trades" : "trade"} a short sponsored game for ${units.length ? `${units.join(" and ")} users already spend` : "something users already value"}.`
    : `No rewarded flow for ${m.app.name} is ready to ship yet.`;
  const cards = n
    ? `<div class="cards" style="grid-template-columns:repeat(${Math.min(n, 4)},1fr)">${flows.map((f, i) => {
        // One flow: show what changed -> offer -> value; two: change -> offer; more: the offer only.
        const want: PhaseId[] = n === 1 ? ["change", "offer", "value"] : n === 2 ? ["change", "offer"] : ["offer"];
        const strip = want.map(ph => f.frames.find(x => x.phase === ph)).filter((x): x is Frame => !!x)
          .map(fr => phone(fr, n <= 2 ? 170 : n === 3 ? 150 : 120, { pins: false })).join(`<div class="mini-arrow">${arrowSvg(28, "#9CA3AF")}</div>`);
        return `<a class="card" href="#flow-${h(f.p.id)}"><div class="strip">${strip}</div><div class="card-body">
<div class="kicker">Flow ${i + 1} · slide ${3 + i * 2}</div><h3>${h(clip(f.claim, 90))}</h3><p>${h(clip(f.p.oneLiner, 150))}</p>
<div class="badges">${badge("SHIP", "ship")}${score(f.f.weighted, d.j)}${badge(f.p.case === "product-change" ? "Product change" : "Existing mechanic")}</div></div></a>`;
      }).join("")}</div>`
    : `<div class="none"><p>${h(reviewed)}</p><p>No idea cleared the judge's bar (weighted score ≥ ${d.j.thresholds.ship} with every criterion ≥ ${d.j.thresholds.minCriterion} and every gate passed), so there is no flow to show. “Ideas we rejected, and why” lists what each one would need.</p></div>`;
  return slide("recommendation", `
<div class="kicker"><b>${h(m.app.name)}</b> · Rewarded ads recommendation</div>
<h1 class="lead">${h(sentence)}</h1>
<p class="sub">${n ? h(reviewed) + " Every number here is computed from prices observed in the app." : "Nothing below is promoted from a weaker verdict: only SHIP proposals become flows."}</p>
${cards}
${exchangeBand(d)}`, m);
}

/** The headline number (T10): the exchange rate, next to the cannibalization check vs the cheapest pack. */
function exchangeBand(d: DeckInput): string {
  const { m } = d;
  const derived = m.economy.derived ?? deriveEconomy(m.economy);
  const resId = d.flows.map(f => f.p.reward.resource).find(r => r && derived.unitsPerView.some(u => u.resource === resourceOf(m, r)?.id))
    ?? derived.unitsPerView[0]?.resource;
  const res = resourceOf(m, resId);
  const line = res ? exchangeRateLine(m, res.id) : null;
  const pack = res ? cheapestPack(m, res.id) : cheapestPack(m);
  const daily = d.flows.filter(f => res && resourceOf(m, f.p.reward.resource)?.id === res.id && f.p.reward.amount != null)
    .reduce((a, f) => a + (f.p.reward.amount as number) * f.p.caps.perDay, 0);
  const right = pack && daily && pack.grants.amount
    ? `<div class="stat-k">Cannibalization check</div><div class="stat-v">1 pack = ${h(num(pack.grants.amount / daily))} days of ads</div><p>The cheapest pack (${h(pack.label)}, ${h(pack.priceText)}) equals ${h(num(pack.grants.amount / daily))} days of the most a user can earn from ads (${daily} ${h(res ? unitOf(res) : "")} a day across ${d.flows.length === 1 ? "this flow" : "all flows"}, at the caps).</p>`
    : pack
      ? `<div class="stat-k">Cheapest pack</div><div class="stat-v">${h(pack.priceText)}</div><p>${h(pack.label)}. Rewards are capped per day so a full day of ads stays well below it.</p>`
      : `<div class="stat-k">Cheapest pack</div><p>No priced pack was observed, so there is no paid path to cannibalize in currency terms.</p>`;
  return `<div class="band">
<div class="band-l"><div class="stat-k">Exchange rate</div><div class="stat-v">${h(line ? line.replace(/ at list price$/, "") : "Not computable")}</div>
<p>${line ? "At list price, from the app's own packs and a US rewarded eCPM range after a non-game haircut. This is what one completed ad view is worth to the user." : h(derived.notes[0] ?? "No priced packs observed.")}</p></div>
<div class="band-r">${right}</div></div>`;
}

function moneySlide(d: DeckInput): string {
  const { m } = d;
  const stages = moneyToday(m);
  const derived = m.economy.derived ?? deriveEconomy(m.economy);
  const MW = 176;
  const mh = Math.round((MW - 2 * BEZEL) * deviceRatio(m)) + 2 * BEZEL;
  const cols = stages.map((s, i) => {
    const img = s.screen ? d.shots.get(s.screen) : undefined;
    const ph = img ? phoneImg(img, MW, deviceRatio(m), `${screenName(m, s.screen)}`) : `<div class="noshot" style="width:${MW}px;height:${mh}px">No screen</div>`;
    return `${i ? `<div class="m-arrow" style="padding-top:${Math.round(LABEL_H + mh / 2 - 12)}px">${arrowSvg(ARROW, "#9CA3AF")}</div>` : ""}<div class="m-col">
<div class="step"><span class="n">${i + 1}</span>${h(s.title)}</div>${ph}
${s.screen ? `<div class="scr">${h(screenName(m, s.screen))}</div>` : ""}
<ul class="facts">${s.facts.slice(0, 4).map(x => `<li>${h(clip(x, 90))}</li>`).join("")}${s.facts.length > 4 ? `<li class="more">+${s.facts.length - 4} more</li>` : ""}</ul></div>`;
  }).join("");
  const uname = (id: string) => unitOf(resourceOf(m, id) ?? { unit: id, name: id });
  const unit = derived.unitPriceUsd.map(u => `$${u.min.toPrecision(3)}–$${u.max.toPrecision(3)} per ${singular(uname(u.resource))}`).join("; ");
  const free = derived.freeDailyUnits.map(f => `${f.units} ${uname(f.resource)} a day = ${f.buys}`).join("; ");
  const tiles = [
    ["Price per unit", unit || "No priced packs observed"],
    ["Free every day", free || "No daily free source observed"],
    ["Cheapest pack", derived.cheapestPaidUnitUsd != null ? `$${derived.cheapestPaidUnitUsd}` : "None observed"],
    ["Ads today", m.brief.adsToday || (m.economy.ads.length ? `${m.economy.ads.length} placement(s)` : "None observed")],
  ];
  return slide("money-today", `
<div class="kicker"><b>${h(m.app.name)}</b> · Today</div>
<h1>How ${h(m.app.name)} makes money today</h1>
<p class="sub">${h(sentence(clip(m.brief.howItMakesMoney, 180)))} Real screens from the app; prices and costs as observed.</p>
<div class="money">${cols}</div>
<div class="tiles">${tiles.map(([k, v]) => `<div class="tile"><div class="stat-k">${h(k)}</div><p>${h(clip(v, 130))}</p></div>`).join("")}</div>`, m);
}

function flowSlide(d: DeckInput, f: FlowInput, i: number): string {
  const { m } = d;
  const ratio = f.frames[0] ? f.frames[0].vh / f.frames[0].vw : deviceRatio(m);
  // Five phones, three plain arrows and one wider trigger column share the space left of the rail.
  const avail = W - 2 * PAD_X - RAIL - GAP;
  let pw = Math.floor((avail - 3 * ARROW - TRIG) / 5);
  const maxPhoneH = 500;
  if ((pw - 2 * BEZEL) * ratio + 2 * BEZEL > maxPhoneH) pw = Math.floor((maxPhoneH - 2 * BEZEL) / ratio + 2 * BEZEL);
  const phoneH = Math.round((pw - 2 * BEZEL) * ratio + 2 * BEZEL);
  const arrowTop = LABEL_H + phoneH / 2;
  let pinNo = 0;
  const cols: string[] = [];
  f.frames.forEach((fr, k) => {
    const pins = numberPins(fr, f, () => ++pinNo);
    // On "What changed", a pin on a new element says so (its NEW tag is replaced by the pin).
    if (fr.phase === "change") for (const p of pins) {
      const isNew = p.box && fr.newBoxes.some(b => Math.abs(p.box!.x - b.x) < 6 && Math.abs(p.box!.y - b.y) < 6 && Math.abs(p.box!.w - b.w) < 12);
      if (isNew && !/^new\b/i.test(p.text)) p.text = `NEW: ${p.text}`;
    }
    const legend = pins.filter(x => x.text).map(x => `<li><span class="d${x.n == null ? " off" : ""}">${x.n ?? ""}</span><span>${h(clip(x.text, 70))}</span></li>`).join("");
    const decline = fr.phase === "offer"
      ? `<div class="decline"><b>${h(f.p.offer.decline || "No thanks")}</b> → back to ${h(f.declineTo)}, nothing lost</div>` : "";
    cols.push(`<div class="f-col" data-phase="${fr.phase}">
<div class="step"><span class="n">${k + 1}</span>${h(PHASE_LABEL[fr.phase as PhaseId])}</div>
${phone(fr, pw, { pins: true, numbered: pins })}
<div class="cap">${h(fr.caption)}</div>
${legend ? `<ol class="legend">${legend}</ol>` : ""}${decline}</div>`);
    if (k === 1) {
      cols.push(`<div class="trigger" style="height:${LABEL_H + phoneH}px"><div class="trig-label" style="bottom:${Math.round(LABEL_H + phoneH - arrowTop + 20)}px"><div class="t">Trigger</div><p>${h(clip(f.p.trigger, 150))}</p></div>
<div class="trig-arrow" style="top:${Math.round(arrowTop - 14)}px">${arrowSvg(TRIG - 12, "var(--accent)", 4)}</div></div>`);
    } else if (k < f.frames.length - 1) {
      cols.push(`<div class="arrow" style="padding-top:${Math.round(arrowTop - 12)}px">${arrowSvg(ARROW, "#9CA3AF")}</div>`);
    }
  });
  const grid = [pw, ARROW, pw, TRIG, pw, ARROW, pw, ARROW, pw].map(x => `${x}px`).join(" ");
  const rail = `<aside class="rail">
<div class="badges">${badge("SHIP", "ship")}${score(f.f.weighted, d.j)}${badge(f.p.case === "product-change" ? "Product change" : "Existing mechanic")}</div>
<h3>Why this works</h3>
<ol class="why">${f.why.map(b => `<li><div class="stat">${h(b.stat)}</div><div class="txt">${h(b.text)}</div></li>`).join("")}</ol>
<a class="proto" href="${h(f.protoHref)}">Open the clickable prototype →</a>
<p class="fine">Simula ${h(f.p.simula.unit)} · ${h(f.p.simula.entry)} entry${f.p.simula.gamePartner ? ` · Game Partner: ${h(f.p.simula.gamePartner)}` : ""} · min play ${f.p.simula.minPlaySec}s · reward granted on REWARD_VERIFIED</p>
</aside>`;
  return slide(`flow-${f.p.id}`, `
<div class="kicker"><b>${h(m.app.name)}</b> · Flow ${i + 1} of ${d.flows.length} · ${h(f.p.id)} · surface: ${h(f.surfaceName)}</div>
<h1 class="claim">${h(f.claim)}</h1>
<p class="sub one">${h(clip(f.p.oneLiner, 170))}</p>
<div class="flow-main"><div class="flowrow" style="grid-template-columns:${grid}">${cols.join("")}</div>${rail}</div>`, m, "flow");
}

function detailsSlide(d: DeckInput, f: FlowInput, i: number): string {
  const { m } = d;
  const p = f.p, e = f.econ;
  const sc = e.scenario;
  const kv = (k: string, v: string) => `<div class="kv"><h4>${h(k)}</h4><p>${v}</p></div>`;
  const col1 = [
    kv("Trigger", h(clip(p.trigger, 200))),
    kv("Eligibility", h(clip(p.eligibility, 200))),
    kv("What the user sees", `<b>${h(clip(p.offer.title, 70))}</b> ${h(clip(p.offer.body, 140))}<br><span class="btn">${h(p.offer.cta)}</span> <span class="btn ghost">${h(p.offer.decline)}</span>`),
    kv("Reward and caps", `${h(clip(rewardText(p, m), 100))}${p.reward.duration ? `, ${h(p.reward.duration)}` : ""}; granted on REWARD_VERIFIED. At most ${p.caps.perDay} a day, ${p.caps.cooldownMin} min apart.`),
    kv("Risks", `<ul>${p.risks.slice(0, 4).map(r => `<li>${h(clip(r, 110))}</li>`).join("") || "<li>None listed</li>"}</ul>`),
    kv("Precedents (knowledge base)", f.precedents.length ? `<ul>${f.precedents.slice(0, 4).map(x => `<li><b>${h(x.id)}</b> ${h(clip(x.title, 80))}</li>`).join("")}</ul>` : "None cited"),
  ].join("");
  const flags = e.flags.length ? `<ul class="flags">${e.flags.map(x => `<li>${h(clip(x, 140))}</li>`).join("")}</ul>` : "";
  const col2 = `<div class="kv"><h4>Economics (computed in code)</h4><table class="econ">${f.econRows.map(r => `<tr><td>${h(r.label)}</td><td>${h(r.value)}</td></tr>`).join("")}</table>${flags}</div>
<div class="scenario"><div class="tag">Scenario, not forecast</div>
<div class="sc-row"><div><b>${sc.impressionsPerDau}</b><span>views per DAU</span></div><div><b>$${sc.arpdauUsd}</b><span>ARPDAU</span></div><div><b>$${Math.round(sc.annualPer1mDauUsd).toLocaleString("en-US")}</b><span>per year per 1M DAU</span></div></div>
<p>${h(sc.label)}</p></div>
${kv("Cannibalization guard", h(clip(p.cannibalizationGuard, 220)))}
${kv("KPI and holdout", `<b>${h(clip(p.kpis.primary, 90))}</b>${p.kpis.guardrails.length ? `; guardrails: ${h(clip(p.kpis.guardrails.join(", "), 120))}` : ""}. ${h(clip(p.kpis.holdout, 120))}`)}
${f.changes ? kv("What the judge changed", `<ul>${f.changes.rounds.slice(0, 2).map(r => `<li>${h(r)}</li>`).join("")}${f.changes.diffs.slice(0, 3).map(x => `<li><b>${h(x.field)}</b>: “${h(x.before)}” → “${h(x.after)}”</li>`).join("")}</ul>`) : ""}`;
  // The snippet gets the whole third column: it is the implementation ticket.
  const col3 = `<div class="kv"><h4>Integration (@simula/ads-react-native)</h4><pre class="code">${codeHtml(f.snippet)}</pre></div>`;
  return slide(`details-${p.id}`, `
<div class="kicker"><b>${h(m.app.name)}</b> · Flow ${i + 1} details · ${h(p.id)} v${p.version}</div>
<h1 class="h2">${h(p.title)}</h1>
<div class="details"><div>${col1}</div><div>${col2}</div><div>${col3}</div></div>`, m);
}

function ideasSlide(d: DeckInput, rows: IdeaRow[], page: number): string {
  const { m } = d;
  const pill = (v: string) => `<span class="v v-${v.replace(/\s+/g, "-").toLowerCase()}">${h(v)}</span>`;
  const body = rows.map(r => `<tr><td class="id">${h(r.id)}</td><td><b>${h(clip(r.title, 70))}</b><div class="case">${h(r.case)}</div></td><td>${pill(r.verdict)}</td>
<td class="num">${r.weighted != null ? r.weighted.toFixed(2) : "–"}</td><td>${h(r.reason)}${r.flowSlide ? ` <a href="#flow-${h(r.id)}">See slide ${r.flowSlide}.</a>` : ""}</td></tr>`).join("");
  const extra = page === 0 ? undevelopedIdeas(d.cands) : [];
  const baseline = page === 0 ? d.cands.baseline : [];
  return slide(`ideas-${page + 1}`, `
<div class="kicker"><b>${h(m.app.name)}</b> · Review${page ? ` (continued)` : ""}</div>
<h1>Ideas we rejected, and why</h1>
<p class="sub">Every candidate the judge scored, with its final verdict. Only SHIP becomes a flow; REVISE is never promoted. Weighted score out of 5.</p>
<table class="ideas"><thead><tr><th>ID</th><th>Idea</th><th>Verdict</th><th>Score</th><th>Why</th></tr></thead><tbody>${body || `<tr><td colspan="5">No candidates were judged.</td></tr>`}</tbody></table>
${extra.length ? `<p class="also"><b>Brainstormed, not developed:</b> ${h(clip(extra.join(" · "), 300))}</p>` : ""}
${baseline.length ? `<p class="also"><b>Obvious baseline the proposer had to go beyond:</b> ${h(clip(baseline.join(" · "), 300))}</p>` : ""}`, m);
}

function appendixMethod(d: DeckInput): string {
  const { m, cands, j, qa } = d;
  const c = m.coverage;
  const finals = latestFinals(j);
  const judgedBy = [...new Set(j.rounds.map(r => r.judgedBy))].join(", ") || "n/a";
  const steps = [
    ["Explore", `${plural(c.steps, "step")}, ${plural(c.states, "state")}, ${plural(c.edges, "edge")}, ${plural(c.externals, "external surface")} in ${Math.round(c.minutes)} min; stopped: ${c.stopReason.replace(/_/g, " ")}. ${plural(c.notExplored.length, "action")} deliberately not explored.`],
    ["Understand", `${plural(m.screens.length, "screen")} in the product model; ${plural(m.provenance.verifiedClaims, "claim")} verified against on-screen text, ${m.provenance.inferredClaims} inferred. Synthesized by ${m.provenance.synthesizedBy}.`],
    ["Mock + QA", qa ? `${qa.htmlShare != null ? `${Math.round(qa.htmlShare * 100)}% of screens rebuilt in HTML; ` : ""}${qa.flowTotal ? `${qa.flowPassed}/${qa.flowTotal} navigation flows pass` : "no flow replay"}.` : "QA summary not available for this run."],
    ["Propose", `${cands.ideas.length} ideas, ${cands.proposals.length} developed into typed proposals (patch, storyboard, assumptions). Generated by ${cands.generatedBy}.`],
    ["Judge", `${j.rounds.length} judgment rounds for ${finals.length} proposals: code gates first, then a rubric scored by ${judgedBy}; the verdict is computed in code (ship ≥ ${j.thresholds.ship}, every criterion ≥ ${j.thresholds.minCriterion}, ≤ ${j.thresholds.maxRounds} rounds).`],
    ["Slides", "Every frame is a screenshot of the patched mock driven through its runtime API; callouts sit on measured DOM positions; numbers come from economics code."],
  ];
  const qaRows = qa?.screens.slice(0, 12).map(s => `<tr><td>${h(clip(s.name, 28))}</td><td>${h(s.render)}</td><td class="num">${s.composite != null ? s.composite.toFixed(2) : "–"}</td><td class="num">${s.rounds}</td><td class="num">${s.mustFix}</td></tr>`).join("") ?? "";
  return slide("appendix-method", `
<div class="kicker"><b>${h(m.app.name)}</b> · Appendix</div>
<h1>Method and mock fidelity</h1>
<div class="two"><div><ol class="method">${steps.map(([k, v]) => `<li><b>${h(k)}.</b> ${h(v)}</li>`).join("")}</ol></div>
<div>${qa ? `<h4 class="lbl">QA fidelity (mock vs the real screenshots)</h4>
<div class="tiles t3"><div class="tile"><div class="stat-k">Mean composite</div><div class="stat-v">${qa.compositeMean != null ? qa.compositeMean.toFixed(2) : "–"}</div></div>
<div class="tile"><div class="stat-k">Flow pass rate</div><div class="stat-v">${qa.flowRate != null ? `${Math.round(qa.flowRate * 100)}%` : "–"}</div></div>
<div class="tile"><div class="stat-k">HTML screens</div><div class="stat-v">${qa.htmlShare != null ? `${Math.round(qa.htmlShare * 100)}%` : "–"}</div></div></div>
<table class="small"><thead><tr><th>Screen</th><th>Render</th><th>Composite</th><th>Rounds</th><th>Must-fix</th></tr></thead><tbody>${qaRows}</tbody></table>`
    : `<h4 class="lbl">QA fidelity</h4><p>No QA summary was found for this run (qa/summary.json), so fidelity is not reported here.</p>`}</div></div>`, m);
}

function appendixCost(d: DeckInput): string {
  const { m, cost, cands, j } = d;
  const stub = [
    m.provenance.synthesizedBy === "stub" ? "product model synthesis" : "",
    cands.generatedBy === "stub" ? "proposals" : "",
    j.rounds.some(r => r.judgedBy === "stub") ? "judge scores" : "",
  ].filter(Boolean);
  const free = cost.providers.includes("gemini");
  const rows = cost.byStage.map(r => `<tr><td>${h(r.stage)}</td><td class="num">${r.live}</td><td class="num">${r.cached}</td><td class="num">${fmtTokens(r.tokensIn)}</td><td class="num">${fmtTokens(r.tokensOut + r.thoughts)}</td><td class="num">${fmtUsd(r.usd)}</td></tr>`).join("");
  const lim = [
    `Explored on ${m.device.kind === "web" ? "a web build driven by Playwright" : "an Android emulator"} (${m.app.accountState} account); ${plural(m.coverage.notExplored.length, "action")} left unexplored by guard rails or scope, listed in the model viewer.`,
    `${plural(m.provenance.inferredClaims, "product-model claim")} inferred rather than observed; the economy review is the human checkpoint for them.`,
    "Revenue per view uses KB eCPM ranges with a non-game haircut; some constants are inferred. ARPDAU appears only as a labelled scenario.",
    "The ad in the frames is simulated by the mock; real fill, creatives and completion rates vary by market.",
    "The judge is a separate call of the same model family as the proposer; its single-fault calibration table is in judge-eval.md.",
    ...(stub.length ? [`This run used deterministic stubs instead of model output for: ${stub.join(", ")}.`] : []),
  ];
  return slide("appendix-cost", `
<div class="kicker"><b>${h(m.app.name)}</b> · Appendix</div>
<h1>Cost and limitations</h1>
<div class="two"><div><h4 class="lbl">Model spend for this app (from cost.jsonl)</h4>
<table class="small"><thead><tr><th>Stage</th><th>Live calls</th><th>Cached</th><th>Tokens in</th><th>Tokens out</th><th>USD</th></tr></thead>
<tbody>${rows || `<tr><td colspan="6">No model calls recorded (stub or replay run).</td></tr>`}</tbody>
<tfoot><tr><td>Total</td><td class="num">${cost.live}</td><td class="num">${cost.cached}</td><td class="num">${fmtTokens(cost.tokensIn)}</td><td class="num">${fmtTokens(cost.tokensOut + cost.thoughts)}</td><td class="num">${fmtUsd(cost.usd)}</td></tr></tfoot></table>
<p class="fine">${free ? "Gemini free tier: calls cost $0; tokens are still logged. " : ""}${cost.models.length ? `Models: ${h(cost.models.join(", "))}. ` : ""}Cached calls replay from disk at no cost.</p></div>
<div><h4 class="lbl">Limitations</h4><ul class="lim">${lim.map(x => `<li>${h(x)}</li>`).join("")}</ul></div></div>`, m);
}

function appendixScale(d: DeckInput): string {
  return slide("appendix-scale", `
<div class="kicker"><b>${h(d.m.app.name)}</b> · Appendix</div>
<h1>How this runs across hundreds of apps</h1>
<div class="quad">${PRODUCTIONIZATION.map(s => `<div class="tile"><h3>${h(s.title)}</h3><ul>${s.points.map(p => `<li>${h(p)}</li>`).join("")}</ul></div>`).join("")}</div>`, d.m);
}

// ------------------------------------------------------------------------------------------------ parts
function slide(id: string, inner: string, m: ProductModel, cls = ""): string {
  return `<section class="slide ${cls}" id="${h(id)}">${inner}
<div class="foot"><span>${h(m.app.name)} · rewarded flows · generated from the product model</span><span>{{PAGE}}</span></div></section>`;
}

/** n is null for a callout whose node the DOM did not show: it gets a legend bullet but no pin. */
interface Pin { n: number | null; text: string; box: Box | null }

/** Numbered pins for one frame: the storyboard callouts, plus Play / No thanks on the offer frame. */
function numberPins(fr: Frame, f: FlowInput, next: () => number): Pin[] {
  const pins: Pin[] = [];
  for (const c of fr.callouts) if (c.box) pins.push({ n: next(), text: c.text, box: c.box });
  if (fr.phase === "offer") {
    const near = (b: Box) => pins.some(x => x.box && Math.abs(x.box.x - b.x) < 8 && Math.abs(x.box.y - b.y) < 8);
    if (fr.choices.play && !near(fr.choices.play)) pins.push({ n: next(), text: `${f.p.offer.cta}: starts a ${f.p.simula.minPlaySec}s sponsored game`, box: fr.choices.play });
    if (fr.choices.decline && !near(fr.choices.decline)) pins.push({ n: next(), text: `${f.p.offer.decline}: dismisses the offer`, box: fr.choices.decline });
  }
  for (const c of fr.callouts) if (!c.box) pins.push({ n: null, text: c.text, box: null });
  return pins;
}

function phone(fr: Frame, width: number, o: { pins: boolean; numbered?: Pin[] }): string {
  const sw = width - 2 * BEZEL;
  const sh = Math.round(sw * (fr.vh / fr.vw));
  const pc = (v: number, of: number) => `${Math.max(0, Math.min(100, (v / of) * 100)).toFixed(2)}%`;
  const overlays: string[] = [];
  if (o.pins) {
    const shown = (o.numbered ?? []).filter((p): p is Pin & { box: Box; n: number } => !!p.box && p.n != null);
    // A new element that already has a numbered pin is labelled "NEW" in its legend line; a separate tag
    // would only cover its neighbours.
    const pinned = (b: Box) => shown.some(p => Math.abs(p.box.x - b.x) < 6 && Math.abs(p.box.y - b.y) < 6 && Math.abs(p.box.w - b.w) < 12);
    if (fr.phase === "change") for (const b of fr.newBoxes.filter(x => !pinned(x))) overlays.push(`<span class="newtag" style="left:${pc(b.x, fr.vw)};top:${pc(b.y, fr.vh)}">NEW</span>`);
    // Pin radius in device px (the pin is 26 slide px wide; the screen is `sw` slide px for `vw` device px).
    const spots = placePins(shown.map(p => p.box), fr.vw, fr.vh, (13 * fr.vw) / sw + 1);
    shown.forEach((p, k) => {
      overlays.push(`<span class="ring" style="left:${pc(p.box.x, fr.vw)};top:${pc(p.box.y, fr.vh)};width:${pc(p.box.w, fr.vw)};height:${pc(p.box.h, fr.vh)}"></span>`);
      overlays.push(`<span class="pin" style="left:${pc(spots[k].x, fr.vw)};top:${pc(spots[k].y, fr.vh)}">${p.n}</span>`);
    });
  }
  return `<div class="phone" style="width:${width}px"><div class="screen" style="height:${sh}px"><img src="${h(fr.img)}" alt="${h(PHASE_LABEL[fr.phase as PhaseId] ?? fr.phase)}: ${h(fr.screen)}">${overlays.join("")}</div></div>`;
}

/**
 * Where each numbered pin goes: just outside its element's top-right corner when that is free, else
 * the next free spot around the element. A spot is "free" when the pin covers no other pin and no
 * other callout target (the offer's Play / No thanks included), and preferably not its own element.
 */
export function placePins(boxes: Box[], vw: number, vh: number, r: number): { x: number; y: number }[] {
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const covers = (x: number, y: number, b: Box) => {
    const nx = clamp(x, b.x, b.x + b.w), ny = clamp(y, b.y, b.y + b.h);
    return (x - nx) ** 2 + (y - ny) ** 2 < r * r;
  };
  const placed: { x: number; y: number }[] = [];
  boxes.forEach((b, i) => {
    const d = r + 1;
    const cands = [
      [b.x + b.w + d * 0.7, b.y - d * 0.7], // outside the top-right corner
      [b.x + b.w - r, b.y - d],             // above the top-right corner
      [b.x + b.w + d, b.y + b.h / 2],       // right of the element
      [b.x - d * 0.7, b.y - d * 0.7],       // outside the top-left corner
      [b.x + b.w / 2, b.y - d],             // above the middle
      [b.x + b.w + d * 0.7, b.y + b.h + d * 0.7],
      [b.x - d, b.y + b.h / 2],
      [b.x + b.w / 2, b.y + b.h + d],
      [b.x + b.w - r, b.y + r],             // last resort: inside the top-right corner
    ].map(([x, y]) => ({ x: clamp(x, r, vw - r), y: clamp(y, r, vh - r) }));
    let best = cands[0], cost = Infinity;
    cands.forEach((c, k) => {
      let v = k * 0.1;
      if (placed.some(p => (p.x - c.x) ** 2 + (p.y - c.y) ** 2 < (2 * r + 2) ** 2)) v += 100;
      boxes.forEach((o, j) => { if (j !== i && covers(c.x, c.y, o)) v += 10; });
      if (covers(c.x, c.y, b)) v += 3;
      if (v < cost) { cost = v; best = c; }
    });
    placed.push(best);
  });
  return placed;
}

function phoneImg(src: string, width: number, ratio: number, alt: string): string {
  const sw = width - 2 * BEZEL;
  return `<div class="phone" style="width:${width}px"><div class="screen" style="height:${Math.round(sw * ratio)}px"><img src="${h(src)}" alt="${h(alt)}"></div></div>`;
}

function deviceRatio(m: ProductModel): number {
  return m.device.widthPx > 0 ? m.device.heightPx / m.device.widthPx : 2.2;
}

function arrowSvg(width: number, color: string, stroke = 3): string {
  const y = 12 + stroke;
  return `<svg width="${width}" height="${2 * y}" viewBox="0 0 ${width} ${2 * y}" aria-hidden="true"><path d="M3 ${y}H${width - 6}" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" fill="none"/><path d="M${width - 14} ${y - 8}L${width - 4} ${y}L${width - 14} ${y + 8}" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
}

function badge(text: string, kind = ""): string {
  return `<span class="badge ${kind}">${h(text)}</span>`;
}

function score(w: number | null, j: Judgments): string {
  return w != null ? badge(`Score ${w.toFixed(2)} / 5 (ship ≥ ${j.thresholds.ship})`) : "";
}

function codeHtml(src: string): string {
  return src.split("\n").map(l => {
    const i = l.indexOf("//");
    return i >= 0 ? `${h(l.slice(0, i))}<span class="c">${h(l.slice(i))}</span>` : h(l);
  }).join("\n");
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const sentence = (s: string) => (s && !/[.!?…]$/.test(s) ? `${s}.` : s);
/** "credits" -> "credit" for "per <unit>"; leaves "pass", "gems"->"gem" style plurals sensible. */
const singular = (u: string) => (/[^s]s$/i.test(u) && u.length > 3 ? u.slice(0, -1) : u);

function words(n: number): string {
  return ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"][n] ?? String(n);
}

function css(a: { accent: string; ink: string }): string {
  return `
:root{--accent:${a.accent};--accent-ink:${a.ink};--ink:#111827;--muted:#6B7280;--line:#E5E7EB;--soft:#F5F6F8;--ship:#047857;--revise:#B45309;--reject:#B91C1C}
*{box-sizing:border-box}
html,body{margin:0;background:#D9DCE1}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:var(--ink);-webkit-font-smoothing:antialiased}
@page{size:1920px 1080px;margin:0}
.slide{position:relative;width:1920px;height:1080px;overflow:hidden;background:#fff;padding:56px ${PAD_X}px 64px;margin:24px auto;box-shadow:0 6px 28px rgba(17,24,39,.12);zoom:var(--z,1)}
.slide::before{content:"";position:absolute;left:0;top:0;right:0;height:6px;background:var(--accent)}
@media print{html,body{background:#fff}.slide{margin:0;box-shadow:none;zoom:1;break-after:page;page-break-after:always}.slide:last-of-type{break-after:auto;page-break-after:auto}}
a{color:inherit}
.kicker{font-size:17px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:600}
.kicker b{color:var(--ink)}
h1{font-size:50px;line-height:1.12;margin:12px 0 0;font-weight:750;letter-spacing:-.015em;max-width:1600px}
h1.lead{font-size:58px;max-width:1500px}
h1.claim{font-size:44px;max-width:1700px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
h1.h2{font-size:40px}
.sub{font-size:22px;line-height:1.4;color:var(--muted);margin:14px 0 0;max-width:1450px}
.sub.one{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:1700px;margin-top:10px;font-size:20px}
.foot{position:absolute;left:${PAD_X}px;right:${PAD_X}px;bottom:24px;display:flex;justify-content:space-between;font-size:14px;color:#9CA3AF}
.badges{display:flex;gap:8px;flex-wrap:wrap}
.badge{font-size:14px;font-weight:700;padding:6px 11px;border-radius:999px;border:1px solid var(--line);background:#fff;color:var(--ink)}
.badge.ship{background:#ECFDF5;color:var(--ship);border-color:#A7F3D0}
.stat-k{font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:700}
.stat-v{font-size:34px;font-weight:750;margin-top:6px;letter-spacing:-.01em}
/* phones */
.phone{background:#0B0B0F;border-radius:30px;padding:${BEZEL}px;box-shadow:0 12px 28px rgba(17,24,39,.2)}
.screen{position:relative;border-radius:23px;overflow:hidden;background:#fff}
.screen img{display:block;width:100%;height:100%;object-fit:cover;object-position:top}
.ring{position:absolute;border:2.5px solid var(--accent);border-radius:8px;box-shadow:0 0 0 2px rgba(255,255,255,.85)}
.pin{position:absolute;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:var(--accent);color:var(--accent-ink);font-size:14px;font-weight:800;line-height:26px;text-align:center;box-shadow:0 0 0 3px #fff,0 2px 8px rgba(0,0,0,.3)}
.newtag{position:absolute;transform:translateY(-100%);margin-top:-2px;background:var(--accent);color:var(--accent-ink);font-size:11px;font-weight:800;letter-spacing:.08em;padding:3px 6px;border-radius:4px}
.noshot{display:grid;place-items:center;background:var(--soft);border:2px dashed var(--line);border-radius:24px;color:var(--muted);font-size:15px}
/* recommendation */
.cards{display:grid;gap:28px;margin-top:40px}
.card{display:flex;gap:28px;align-items:flex-start;text-decoration:none;background:var(--soft);border-radius:20px;padding:22px}
.strip{display:flex;align-items:center;gap:6px;flex:none}
.mini-arrow{display:flex}
.card-body{padding-top:8px}
.card h3{font-size:24px;line-height:1.25;margin:8px 0 8px}
.card p{font-size:17px;line-height:1.4;color:#4B5563;margin:0 0 12px}
.card .kicker{font-size:13px}
.none{margin-top:40px;background:var(--soft);border-radius:20px;padding:32px 36px;font-size:24px;line-height:1.45;max-width:1500px}
.none p{margin:0 0 14px}
.band{position:absolute;left:${PAD_X}px;right:${PAD_X}px;bottom:72px;display:grid;grid-template-columns:1.25fr 1fr;gap:28px}
.band>div{border-top:4px solid var(--accent);padding-top:18px}
.band p{font-size:18px;line-height:1.45;color:#4B5563;margin:10px 0 0;max-width:820px}
/* money today */
.money{display:flex;align-items:flex-start;justify-content:space-between;margin-top:34px}
.m-col{width:300px;display:flex;flex-direction:column;align-items:center}
.m-col .step{align-self:flex-start}
.scr{font-size:14px;color:var(--muted);margin-top:10px}
.facts{list-style:none;margin:10px 0 0;padding:0;font-size:16px;line-height:1.35;width:100%}
.facts li{margin-top:6px;padding-left:14px;position:relative}
.facts li::before{content:"";position:absolute;left:0;top:.55em;width:6px;height:6px;border-radius:50%;background:var(--accent)}
.facts li.more{color:var(--muted)}
.tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;position:absolute;left:${PAD_X}px;right:${PAD_X}px;bottom:70px}
.tiles.t3{position:static;grid-template-columns:repeat(3,1fr);margin:10px 0 18px}
.tile{background:var(--soft);border-radius:16px;padding:16px 20px}
.tile p{font-size:17px;line-height:1.4;margin:8px 0 0}
/* flow */
.step{font-size:16px;font-weight:700;height:${LABEL_H}px;display:flex;gap:8px;align-items:center;white-space:nowrap}
.step .n{width:24px;height:24px;border-radius:50%;background:var(--ink);color:#fff;font-size:13px;display:grid;place-items:center;flex:none}
.flow-main{display:grid;grid-template-columns:1fr ${RAIL}px;gap:${GAP}px;margin-top:26px}
.flowrow{display:grid;align-items:start}
.cap{font-size:17px;line-height:1.3;margin-top:14px;font-weight:650}
.legend{list-style:none;padding:0;margin:8px 0 0;font-size:14px;line-height:1.3;color:#4B5563}
.legend li{display:flex;gap:6px;margin-top:5px}
.legend .d{flex:none;width:18px;height:18px;border-radius:50%;background:var(--accent);color:var(--accent-ink);font-size:11px;font-weight:800;display:grid;place-items:center;margin-top:1px}
.legend .d.off{background:none;border:2px solid #D1D5DB;width:12px;height:12px;margin:4px 3px 0}
.decline{margin-top:10px;font-size:14px;line-height:1.3;background:var(--soft);border:1px solid var(--line);border-radius:10px;padding:7px 9px}
.arrow{display:flex;justify-content:center}
.trigger{position:relative}
.trig-label{position:absolute;left:4px;right:4px;text-align:left}
.trig-label .t{display:inline-block;background:var(--accent);color:var(--accent-ink);font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:4px 8px;border-radius:5px}
.trig-label p{font-size:15px;line-height:1.3;margin:8px 0 0;font-weight:600;display:-webkit-box;-webkit-line-clamp:8;-webkit-box-orient:vertical;overflow:hidden}
.trig-arrow{position:absolute;left:4px}
.rail{background:var(--soft);border-radius:20px;padding:26px 26px;display:flex;flex-direction:column;gap:14px;align-self:start}
.rail h3{font-size:24px;margin:6px 0 0}
.why{list-style:none;margin:0;padding:0;counter-reset:w}
.why li{margin-top:14px;padding-left:34px;position:relative;counter-increment:w}
.why li::before{content:counter(w);position:absolute;left:0;top:2px;width:24px;height:24px;border-radius:50%;background:var(--ink);color:#fff;font-size:13px;font-weight:800;display:grid;place-items:center}
.why .stat{font-size:21px;font-weight:750;line-height:1.2}
.why .txt{font-size:15px;line-height:1.4;color:#4B5563;margin-top:4px}
.proto{display:block;text-align:center;background:var(--accent);color:var(--accent-ink);padding:13px 16px;border-radius:12px;font-weight:750;text-decoration:none;font-size:17px;margin-top:6px}
.fine{font-size:13px;line-height:1.4;color:var(--muted);margin:0}
/* details */
.details{display:grid;grid-template-columns:1fr 1fr 1.2fr;gap:40px;margin-top:26px}
.kv{margin-bottom:18px}
.kv h4,.lbl{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 0 6px}
.kv p{font-size:17px;line-height:1.42;margin:0}
.kv ul{margin:0;padding-left:18px;font-size:16px;line-height:1.4}
.btn{display:inline-block;margin-top:8px;background:var(--accent);color:var(--accent-ink);font-size:14px;font-weight:700;padding:5px 12px;border-radius:999px}
.btn.ghost{background:#fff;color:var(--ink);border:1px solid var(--line)}
table{border-collapse:collapse;width:100%}
.econ td{font-size:15.5px;padding:6px 0;border-bottom:1px solid var(--line);vertical-align:top}
.econ td:last-child{text-align:right;font-weight:650;padding-left:12px}
.flags{margin:8px 0 0;padding-left:18px;font-size:14px;color:var(--revise)}
.scenario{border:2px dashed #D1D5DB;border-radius:14px;padding:12px 16px;margin-bottom:18px}
.scenario .tag{display:inline-block;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--revise)}
.sc-row{display:flex;gap:24px;margin-top:6px}
.sc-row b{display:block;font-size:22px}
.sc-row span{font-size:13px;color:var(--muted)}
.scenario p{font-size:13.5px;line-height:1.35;color:var(--muted);margin:8px 0 0}
.code{background:#0F172A;color:#E2E8F0;border-radius:12px;padding:14px 16px;font:12px/1.42 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-word;margin:0;max-height:820px;overflow:hidden}
.code .c{color:#94A3B8}
/* ideas */
.ideas{margin-top:26px;font-size:18px}
.ideas th{text-align:left;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);border-bottom:2px solid var(--line);padding:10px 12px}
.ideas td{border-bottom:1px solid var(--line);padding:13px 12px;vertical-align:top;line-height:1.35}
.ideas td.id{color:var(--muted);width:60px}
.ideas td.num,.small td.num{text-align:right;font-variant-numeric:tabular-nums}
.case{font-size:14px;color:var(--muted);margin-top:3px}
.v{display:inline-block;font-size:13px;font-weight:800;letter-spacing:.05em;padding:4px 10px;border-radius:999px;white-space:nowrap}
.v-ship{background:#ECFDF5;color:var(--ship)}.v-revise{background:#FFFBEB;color:var(--revise)}.v-reject{background:#FEF2F2;color:var(--reject)}.v-not-judged{background:var(--soft);color:var(--muted)}
.also{font-size:16px;line-height:1.4;color:#4B5563;margin:14px 0 0}
/* appendix */
.two{display:grid;grid-template-columns:1fr 1fr;gap:56px;margin-top:30px}
.method{margin:0;padding-left:22px;font-size:18px;line-height:1.45}
.method li{margin-bottom:12px}
.small{font-size:15px}
.small th{text-align:left;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);border-bottom:2px solid var(--line);padding:7px 8px}
.small td{border-bottom:1px solid var(--line);padding:7px 8px}
.small tfoot td{font-weight:750;border-bottom:none}
.lim{font-size:18px;line-height:1.45;padding-left:20px;margin:0}
.lim li{margin-bottom:10px}
.quad{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:30px}
.quad h3{margin:0 0 8px;font-size:22px}
.quad ul{margin:0;padding-left:20px;font-size:17px;line-height:1.45}
`;
}
