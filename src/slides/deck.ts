// deck.html: 1920x1080 sections in the order a product team reads them (FINAL_PLAN §10 as amended
// by CRITIQUE E5/D6/T10). Pure string rendering from typed inputs; images are files next to the
// deck (img/, fonts/), so the page opens from file:// and prints to PDF unchanged.
//
// Visual grammar (shared by the recommendation, money and flow slides): one short headline with a
// single accent-coloured key phrase, large phone frames on a soft gradient, a numbered circle on each
// phone's bottom-left corner joined to the phone by a thin elbow arrow that points at what matters on
// that screen, and a short bold caption under each circle.
import type { Candidates, Judgments, ProductModel, Proposal, ProposalEconomics } from "../core/schema.ts";
import { escapeHtml as h } from "../core/io.ts";
import { deriveEconomy, exchangeRateLine } from "../model/economics.ts";
import type { CostRollup, QaDigest } from "../report/data.ts";
import { fmtTokens, fmtUsd } from "../report/data.ts";
import { PRODUCTIONIZATION } from "../report/content.ts";
import type { Box, Frame } from "./capture.ts";
import {
  PHASE_LABEL, cheapestPack, clip, firstSentenceOf, headlineOf, ideaRows, latestFinals, moneyToday, num, recommendationHeadline, resourceOf, rewardText, screenName,
  shortCaption, spacing, undevelopedIdeas, unitOf,
  type EconRow, type Final, type Headline, type IdeaRow, type JudgeChange, type PhaseId, type WhyBullet,
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

const W = 1920, PAD_X = 64;
// Flow slide: five phones left of a light "why" rail. BR is the room an elbow bracket needs left of
// its phone; the trigger bracket sits in TRIG_H above phones 2 and 3.
const RAIL = 300, RAIL_GAP = 44, BR = 34, COL_GAP = 52, BEZEL = 8, TRIG_H = 92, STAGE_TOP = 232, MAX_PHONE_H = 560;
const PIN = 20; // pin diameter in slide px
const NEW_W = 40; // NEW tag width in slide px
const MK = 40;  // numbered circle diameter
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

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
    const geo = flowGeometry(f.frames[0] ? f.frames[0].vh / f.frames[0].vw : deviceRatio(m));
    const pins = flowPins(f, geo.pw - 2 * BEZEL);
    slides.push(flowSlide(d, f, i, geo, pins));
    slides.push(detailsSlide(d, f, i, pins, 3 + i * 2));
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
  const sentence = `Add ${words(n)} opt-in rewarded ${n === 1 ? "flow" : "flows"} to ${m.app.name} that ${n === 1 ? "trades" : "trade"} a short sponsored game for ${units.length ? `${units.join(" and ")} users already spend` : "something users already value"}.`;
  const cards = n
    ? `<div class="cards n${Math.min(n, 4)}" style="grid-template-columns:repeat(${Math.min(n, 4)},1fr)">${flows.map((f, i) => {
        // One flow: show what changed -> offer -> value; two: change -> offer; more: the offer only.
        const want: PhaseId[] = n === 1 ? ["change", "offer", "value"] : n === 2 ? ["change", "offer"] : ["offer"];
        const pw = n <= 2 ? 200 : n === 3 ? 188 : 142;
        const strip = want.map(ph => f.frames.find(x => x.phase === ph)).filter((x): x is Frame => !!x)
          .map(fr => phoneHtml(fr.img, `${PHASE_LABEL[fr.phase as PhaseId]}: ${fr.screen}`, pw, fr.vh / fr.vw, 6)).join(`<div class="mini-arrow">${chevron()}</div>`);
        return `<a class="card" href="#flow-${h(f.p.id)}"><div class="strip">${strip}</div><div class="card-body">
<div class="card-k"><span class="mk sm">${i + 1}</span>Flow ${i + 1} · slide ${3 + i * 2}</div><h3>${headlineHtml(headlineOf(f.p, m))}</h3><p>${h(clip(f.p.oneLiner, n >= 3 ? 130 : 170))}</p>
<div class="badges">${badge("SHIP", "ship")}${score(f.f.weighted, d.j)}${badge(f.p.case === "product-change" ? "Product change" : "Existing mechanic")}</div>
${n === 1 ? `<ul class="card-why">${f.why.map(b => `<li><div class="stat">${h(b.stat)}</div><p>${h(b.line || b.text)}</p></li>`).join("")}</ul>` : ""}</div></a>`;
      }).join("")}</div>`
    : `<div class="none"><p>${h(reviewed)}</p><p>No idea cleared the judge's bar (weighted score ≥ ${d.j.thresholds.ship} with every criterion ≥ ${d.j.thresholds.minCriterion} and every gate passed), so there is no flow to show. “Ideas we rejected, and why” lists what each one would need.</p></div>`;
  return slide("recommendation", `
<div class="kicker"><b>${h(m.app.name)}</b> · Rewarded ads recommendation</div>
<h1 class="lead">${headlineHtml(recommendationHeadline(m, flows.map(f => f.p)))}</h1>
<p class="sub">${n ? `${h(sentence)} ${h(reviewed)}` : "Nothing below is promoted from a weaker verdict: only SHIP proposals become flows."}</p>
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
<div class="panel"><div class="stat-k">Exchange rate</div><div class="stat-v">${h(line ? line.replace(/ at list price$/, "") : "Not computable")}</div>
<p>${line ? "At list price, from the app's own packs and a US rewarded eCPM range after a non-game haircut. This is what one completed ad view is worth to the user." : h(derived.notes[0] ?? "No priced packs observed.")}</p></div>
<div class="panel">${right}</div></div>`;
}

function moneySlide(d: DeckInput): string {
  const { m } = d;
  const stages = moneyToday(m);
  const derived = m.economy.derived ?? deriveEconomy(m.economy);
  const ratio = deviceRatio(m);
  // Five phones across the full width, each with its numbered circle and elbow (as on the flow slides).
  const area = W - 2 * PAD_X;
  let pw = 212;
  if (phoneH(pw, ratio, BEZEL) > 460) pw = Math.floor((460 - 2 * BEZEL) / ratio + 2 * BEZEL);
  const ph = phoneH(pw, ratio, BEZEL);
  // Every caption is pw + gap - 12 wide, the last one included, so the row ends inside the margin.
  const gap = Math.floor((area - BR - 5 * pw + 20) / 5);
  const cols = stages.map((s, i) => {
    const img = s.screen ? d.shots.get(s.screen) : undefined;
    const phone = img ? phoneHtml(img, screenName(m, s.screen), pw, ratio, BEZEL) : `<div class="noshot" style="width:${pw}px;height:${ph}px">No screen</div>`;
    const facts = s.facts.slice(0, 3).map(x => `<li>${h(clip(x, 84))}</li>`).join("") + (s.facts.length > 3 ? `<li class="more">+${s.facts.length - 3} more</li>` : "");
    return `<div class="m-col" style="left:${BR + i * (pw + gap)}px;width:${pw}px">${phone}
${elbow(Math.round(ph * 0.42), ph)}${marker(i + 1, ph)}<span class="ph" style="top:${ph + 2}px">${h(s.title)}</span>
<div class="cap-block" style="top:${ph + 40}px;width:${pw + gap - 12}px">${s.screen ? `<div class="scr">${h(screenName(m, s.screen))}</div>` : ""}<ul class="facts">${facts}</ul></div></div>`;
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
  const head: Headline = { text: `How ${m.app.name} makes money today`, accent: "makes money today" };
  return slide("money-today", `
<div class="kicker"><b>${h(m.app.name)}</b> · Today</div>
<h1>${headlineHtml(head)}</h1>
<p class="sub">${h(sentence(clip(m.brief.howItMakesMoney, 170)))} Real screens from the app; prices and costs as observed.</p>
<div class="money" style="height:${ph + 190}px">${cols}</div>
<div class="tiles">${tiles.map(([k, v]) => `<div class="tile"><div class="stat-k">${h(k)}</div><p>${h(clip(v, 120))}</p></div>`).join("")}</div>`, m);
}

export interface FlowGeo { pw: number; ph: number; gap: number; xs: number[]; area: number }

/** Phone width, height and x positions for the five flow frames (left of the rail). */
function flowGeometry(ratio: number): FlowGeo {
  const area = W - 2 * PAD_X - RAIL - RAIL_GAP;
  let pw = Math.floor((area - BR - 4 * COL_GAP) / 5);
  if (phoneH(pw, ratio, BEZEL) > MAX_PHONE_H) pw = Math.floor((MAX_PHONE_H - 2 * BEZEL) / ratio + 2 * BEZEL);
  const gap = Math.floor((area - BR - 5 * pw) / 4);
  return { pw, ph: phoneH(pw, ratio, BEZEL), gap, xs: [0, 1, 2, 3, 4].map(k => BR + k * (pw + gap)), area };
}

/** Where each frame's elbow points (px from the phone top): the Play button on the offer, else the first callout. */
function elbowTargets(f: FlowInput, g: FlowGeo, pins: PinSpot[][]): number[] {
  const sh = g.ph - 2 * BEZEL;
  return f.frames.map((fr, k) => {
    const focus = (fr.phase === "offer" ? fr.choices.play : null) ?? pins[k].find(p => p.box)?.box ?? fr.newBoxes[0] ?? null;
    const fy = focus ? focus.y + focus.h / 2 : fr.vh * (fr.phase === "ad" ? 0.45 : 0.5);
    return Math.round(BEZEL + Math.max(0.1, Math.min(0.86, fy / fr.vh)) * sh);
  });
}

function flowSlide(d: DeckInput, f: FlowInput, i: number, g: FlowGeo, pins: PinSpot[][]): string {
  const { m } = d;
  const hl = headlineOf(f.p, m);
  const cols: string[] = [];
  const targets = elbowTargets(f, g, pins);
  f.frames.forEach((fr, k) => {
    const target = targets[k];
    const zoom = fr.phase === "change" ? zoomInset(fr, pins[k], g, target, targets[k + 1] ?? null) : "";
    const cap = shortCaption(fr.caption);
    const decline = fr.phase === "offer"
      ? `<div class="decline"><span class="ret" aria-hidden="true">↩</span><span><b>${h(f.p.offer.decline || "No thanks")}</b> → back to ${h(f.declineTo)}, nothing lost</span></div>` : "";
    cols.push(`<div class="f-col" data-phase="${fr.phase}" style="left:${g.xs[k]}px;top:${TRIG_H}px;width:${g.pw}px">
${phoneHtml(fr.img, `${PHASE_LABEL[fr.phase as PhaseId]}: ${fr.screen}`, g.pw, fr.vh / fr.vw, BEZEL, pinOverlays(fr, pins[k], g.pw - 2 * BEZEL))}${zoom}
${elbow(target, g.ph)}${marker(k + 1, g.ph)}<span class="ph" style="top:${g.ph + 2}px">${h(PHASE_LABEL[fr.phase as PhaseId])}</span>
<div class="cap-block" style="top:${g.ph + 40}px;width:${g.pw + g.gap - 12}px"><div class="cap${cap.length > 50 ? " long" : ""}">${h(cap)}</div>${decline}</div></div>`);
    if (k === 1 && f.frames.length > 2) cols.push(triggerHtml(f, g));
  });
  const rail = `<aside class="rail" style="top:${STAGE_TOP}px">
<div class="badges">${badge("SHIP", "ship")}${score(f.f.weighted, d.j)}${badge(f.p.case === "product-change" ? "Product change" : "Existing mechanic")}</div>
<h3>Why this works</h3>
<ol class="why">${f.why.map(b => `<li><div class="stat">${h(b.stat)}</div><div class="txt">${h(b.line || b.text)}</div></li>`).join("")}</ol>
<a class="proto" href="${h(f.protoHref)}">Open the clickable prototype →</a>
<p class="fine">Simula ${h(f.p.simula.unit)} · ${h(f.p.simula.entry)} entry${f.p.simula.gamePartner ? ` · Game Partner: ${h(f.p.simula.gamePartner)}` : ""} · min play ${f.p.simula.minPlaySec}s · reward granted on REWARD_VERIFIED · frame callouts on slide ${3 + i * 2 + 1}</p>
</aside>`;
  return slide(`flow-${f.p.id}`, `
<div class="kicker"><b>${h(m.app.name)}</b> · Flow ${i + 1} of ${d.flows.length} · ${h(f.p.id)} · surface: ${h(f.surfaceName)}</div>
<h1 class="claim" style="font-size:${headSize(hl.text)}px">${headlineHtml(hl)}</h1>
<p class="sub one">${h(clip(f.p.oneLiner, 168))}</p>
<div class="stage" style="top:${STAGE_TOP}px;width:${g.area}px;height:${TRIG_H + g.ph + 150}px">${cols.join("")}</div>${rail}`, m, "flow");
}

/** The labelled trigger: a bracket arrow from the top of frame 2 into the top of frame 3. */
function triggerHtml(f: FlowInput, g: FlowGeo): string {
  const left = g.xs[1], width = g.xs[2] + g.pw - g.xs[1];
  const a = g.pw / 2, b = g.xs[2] - g.xs[1] + g.pw / 2, top = TRIG_H - 30, end = TRIG_H - 6, r = 8;
  const text = clip(firstSentenceOf(f.p.trigger).replace(/[.;:]+$/, ""), 118);
  return `<div class="trigger" style="left:${left}px;width:${width}px;height:${TRIG_H}px">
<div class="trig-label" style="bottom:${TRIG_H - top + 8}px"><div class="t">Trigger</div><p>${h(text)}</p></div>
<svg class="trig-arrow" width="${width}" height="${TRIG_H}" viewBox="0 0 ${width} ${TRIG_H}" aria-hidden="true"><path d="M${a} ${end - 2}V${top + r}Q${a} ${top} ${a + r} ${top}H${b - r}Q${b} ${top} ${b} ${top + r}V${end - 7}" stroke="var(--accent)" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M${b - 7} ${end - 9}L${b} ${end}L${b + 7} ${end - 9}Z" fill="var(--accent)"/><circle cx="${a}" cy="${end - 2}" r="4.5" fill="var(--accent)"/></svg></div>`;
}

const ZOOM = { scale: 2.2, minScale: 1.3, pad: 7, margin: 2, gap: 26, clear: 20 };

/**
 * "What changed" magnifier: the first new element at up to ZOOM.scale x its size on the slide, in a
 * rounded inset joined to the element by a thin line, so the new UI reads at slide scale. The inset
 * is the frame's own capture (DPR 2, so it stays sharp), cropped to the element. It sits over the
 * phone and may overhang its edges into the gaps (keeping ZOOM.clear from the neighbouring phone),
 * but never where an elbow runs (this frame's below its target on the left, the next frame's below
 * its target on the right), never over the element, another ring or a pin, and never outside the
 * phone's height (so no caption or trigger is covered). The largest scale that has such a place
 * wins, then the place nearest the element. None at ZOOM.minScale or more: no inset.
 */
export function zoomInset(fr: Frame, pins: PinSpot[], g: FlowGeo, ownTarget: number, nextTarget: number | null): string {
  const el = fr.newBoxes.find(b => b.w * b.h < 0.4 * fr.vw * fr.vh && b.w >= 8 && b.h >= 8);
  if (!el) return "";
  const sw = g.pw - 2 * BEZEL, sh = g.ph - 2 * BEZEL, k = sw / fr.vw;
  // The element (inside its dashed slide outline, which may touch a neighbour) in device px, then in phone px.
  const rx = Math.max(0, el.x - ZOOM.margin), ry = Math.max(0, el.y - ZOOM.margin);
  const rw = Math.min(fr.vw, el.x + el.w + ZOOM.margin) - rx, rh = Math.min(fr.vh, el.y + el.h + ZOOM.margin) - ry;
  const E = { x: BEZEL + rx * k, y: BEZEL + ry * k, w: rw * k, h: rh * k };
  // What the inset must not cover (phone px): the element and its NEW badge, other rings, every pin.
  const keep: Box[] = [{ x: E.x - 4, y: E.y - PIN - 2, w: E.w + 8, h: E.h + PIN + 6 }];
  const pinBoxes: Box[] = [];
  for (const p of pins) {
    if (p.box) keep.push({ x: BEZEL + p.box.x * k - 3, y: BEZEL + p.box.y * k - 3, w: p.box.w * k + 6, h: p.box.h * k + 6 });
    if (p.spot) {
      const hw = (p.isNew ? NEW_W : PIN) / 2 + 3, hh = PIN / 2 + 3, b = { x: BEZEL + p.spot.x * k - hw, y: BEZEL + p.spot.y * k - hh, w: 2 * hw, h: 2 * hh };
      keep.push(b);
      pinBoxes.push(b);
    }
  }
  const hit = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const freeGap = Math.max(0, g.gap - ZOOM.clear); // overhang that keeps clear of the neighbouring phone
  const elbowGap = Math.max(0, BR - 6 - 10);       // overhang that keeps clear of an elbow's vertical line
  // Words on the frame (phone px): an inset over fewer of them keeps more of the screen's context readable.
  const words = (fr.texts ?? []).map(t => ({ x: BEZEL + t.x * k, y: BEZEL + t.y * k, w: t.w * k, h: t.h * k }));
  const cx = E.x + E.w / 2, ey = E.y + E.h / 2;
  let best: { z: number; x: number; y: number; w: number; h: number; d: number } | null = null;
  for (let y = BEZEL + 8; y < g.ph - BEZEL - 8; y += 4) {
    for (const [ovL, ovR] of [[freeGap, freeGap], [freeGap, elbowGap], [elbowGap, freeGap], [elbowGap, elbowGap]]) {
      const z = Math.min(ZOOM.scale, Math.floor(((g.pw + ovL + ovR - 2 * ZOOM.pad) / (rw * k)) * 20) / 20);
      if (z < ZOOM.minScale) continue;
      const iw = rw * k * z + 2 * ZOOM.pad, ih = rh * k * z + 2 * ZOOM.pad;
      if (y + ih > g.ph - BEZEL - 8) continue;
      if (y + ih > E.y - ZOOM.gap && y < E.y + E.h + ZOOM.gap) continue; // off the element, with room for the line
      if (ovL > elbowGap && y + ih >= ownTarget - 12) continue;
      if (ovR > elbowGap && nextTarget != null && y + ih >= nextTarget - 12) continue;
      const x = Math.max(-ovL, Math.min(g.pw + ovR - iw, cx - iw / 2));
      if (x < 0 && y < ownTarget + 10 && y + ih > ownTarget - 10) continue; // this frame's elbow arrow tip
      const box = { x, y, w: iw, h: ih };
      if (keep.some(b => hit(box, b))) continue;
      const d = Math.abs(y + ih / 2 - ey) + 80 * words.filter(t => hit(box, t)).length;
      if (!best || z > best.z || (z === best.z && d < best.d)) best = { z, x, y, w: iw, h: ih, d };
    }
  }
  if (!best) return "";
  const { z, x, y, w: iw, h: ih } = best;
  const above = y + ih <= E.y;
  const y1 = above ? y + ih : y, y2 = above ? E.y - 2 : E.y + E.h + 2;
  // The line runs from the inset to a point on the element's edge that crosses no pin and the fewest
  // words on the way (the centre of a small element; along a wide one, its ends or quarters).
  const ys = [Math.min(y1, y2), Math.max(y1, y2)];
  const across = (bs: Box[], px: number) => bs.filter(b => px > b.x - 2 && px < b.x + b.w + 2 && ys[0] < b.y + b.h && ys[1] > b.y).length;
  const inset = (px: number) => Math.max(x + 16, Math.min(x + iw - 16, px));
  const spots = E.w > 0.5 * sw ? [E.x + Math.min(18, E.w / 4), E.x + E.w - Math.min(18, E.w / 4), E.x + E.w / 4, E.x + (3 * E.w) / 4, cx] : [cx, E.x + 12, E.x + E.w - 12];
  const cost = (px: number) => 100 * (across(pinBoxes, px) + across(pinBoxes, inset(px))) + across(words, px) + across(words, inset(px));
  const lx = spots.reduce((a, b) => (cost(b) < cost(a) ? b : a));
  const x1 = inset(lx);
  const line = `M${n1(x1)} ${n1(y1)}L${n1(lx)} ${n1(y2)}`;
  // The crop is clipped to the element; the pad around it is the inset's own white frame.
  const img = `<div class="zoom-crop" style="left:${ZOOM.pad}px;top:${ZOOM.pad}px;width:${n1(iw - 2 * ZOOM.pad)}px;height:${n1(ih - 2 * ZOOM.pad)}px">`
    + `<img src="${h(fr.img)}" alt="" style="width:${n1(sw * z)}px;height:${n1(sh * z)}px;left:${n1(-rx * k * z)}px;top:${n1(-ry * k * z)}px"></div>`;
  return `<svg class="zoom-link" width="${g.pw}" height="${g.ph}" viewBox="0 0 ${g.pw} ${g.ph}" aria-hidden="true"><path d="${line}" stroke="#fff" stroke-width="4.5" stroke-linecap="round" fill="none" opacity=".9"/><path d="${line}" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" fill="none"/><circle cx="${n1(lx)}" cy="${n1(y2)}" r="3.5" fill="var(--accent)" stroke="#fff" stroke-width="1.5"/></svg>`
    + `<div class="zoom" data-scale="${z}" style="left:${n1(x)}px;top:${n1(y)}px;width:${n1(iw)}px;height:${n1(ih)}px">${img}</div>`;
}

const n1 = (v: number) => String(Math.round(v * 10) / 10);

function detailsSlide(d: DeckInput, f: FlowInput, i: number, pins: PinSpot[][], flowNo: number): string {
  const { m } = d;
  const p = f.p, e = f.econ;
  const sc = e.scenario;
  const kv = (k: string, v: string) => `<div class="kv"><h4>${h(k)}</h4><p>${v}</p></div>`;
  // The flow slide's frame-by-frame legend: full captions and every callout pin.
  const frames = f.frames.map((fr, k) => {
    const items = pins[k].filter(x => x.text).map(x => `<li><span class="d${x.label ? (x.label === "NEW" ? " new" : "") : " off"}">${h(x.label ?? "")}</span><span>${h(clip(x.text, 80))}</span></li>`).join("");
    return `<li><div class="fr-h"><span class="mk xs">${k + 1}</span><b>${h(PHASE_LABEL[fr.phase as PhaseId])}</b> <span class="fr-c">${h(clip(fr.caption, 110))}</span></div>${items ? `<ul class="legend">${items}</ul>` : ""}</li>`;
  }).join("");
  const col1 = [
    kv("Trigger", h(clip(p.trigger, 200))),
    kv("Eligibility", h(clip(p.eligibility, 180))),
    kv("What the user sees", `<b>${h(clip(p.offer.title, 70))}</b> ${h(clip(p.offer.body, 140))}<br><span class="btn">${h(p.offer.cta)}</span> <span class="btn ghost">${h(p.offer.decline)}</span>`),
    kv("Reward and caps", `${h(clip(rewardText(p, m), 100))}${p.reward.duration ? `, ${h(p.reward.duration)}` : ""}; granted on REWARD_VERIFIED. At most ${p.caps.perDay} a day${spacing(p)}.`),
    `<div class="kv"><h4>Frame by frame (slide ${flowNo})</h4><ol class="frames">${frames}</ol></div>`,
  ].join("");
  const flags = e.flags.length ? `<ul class="flags">${e.flags.map(x => `<li>${h(clip(x, 140))}</li>`).join("")}</ul>` : "";
  const col2 = `<div class="kv"><h4>Economics (computed in code)</h4><table class="econ">${f.econRows.map(r => `<tr><td>${h(r.label)}</td><td>${h(r.value)}</td></tr>`).join("")}</table>${flags}</div>
<div class="scenario"><div class="tag">Scenario, not forecast</div>
<div class="sc-row"><div><b>${sc.impressionsPerDau}</b><span>views per DAU</span></div><div><b>$${sc.arpdauUsd}</b><span>ARPDAU</span></div><div><b>$${Math.round(sc.annualPer1mDauUsd).toLocaleString("en-US")}</b><span>per year per 1M DAU</span></div></div>
<p>${h(sc.label)}</p></div>
${kv("Cannibalization guard", h(clip(p.cannibalizationGuard, 200)))}
${kv("KPI and holdout", `<b>${h(clip(p.kpis.primary, 90))}</b>${p.kpis.guardrails.length ? `; guardrails: ${h(clip(p.kpis.guardrails.join(", "), 110))}` : ""}. ${h(clip(p.kpis.holdout, 110))}`)}
${kv("Risks", `<ul>${p.risks.slice(0, 3).map(r => `<li>${h(clip(r, 100))}</li>`).join("") || "<li>None listed</li>"}</ul>`)}`;
  // The snippet is the implementation ticket; precedents and the judge's history sit under it.
  const col3 = `<div class="kv"><h4>Integration (@simula/ads-react-native)</h4><pre class="code">${codeHtml(f.snippet)}</pre></div>
${f.changes ? kv("What the judge changed", `<ul>${f.changes.rounds.slice(0, 2).map(r => `<li>${h(clip(r, 170))}</li>`).join("")}${f.changes.diffs.slice(0, 3).map(x => `<li><b>${h(x.field)}</b>: “${h(x.before)}” → “${h(x.after)}”</li>`).join("")}</ul>`) : ""}
${kv("Precedents (knowledge base)", f.precedents.length ? `<ul>${f.precedents.slice(0, 4).map(x => `<li><b>${h(x.id)}</b> ${h(clip(x.title, 70))}</li>`).join("")}</ul>` : "None cited")}`;
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

/** A headline with its key phrase in the accent colour (first occurrence, case-sensitive). */
function headlineHtml(hl: Headline): string {
  const i = hl.accent ? hl.text.indexOf(hl.accent) : -1;
  if (i < 0) return h(hl.text);
  return `${h(hl.text.slice(0, i))}<em>${h(hl.accent)}</em>${h(hl.text.slice(i + hl.accent.length))}`;
}

/** One callout on a flow frame: `label` is its letter (or NEW), null when no free spot exists on screen. */
export interface PinSpot { label: string | null; text: string; box: Box | null; spot: { x: number; y: number } | null; isNew: boolean; choice?: boolean }

/**
 * Pins for every frame of a flow: the storyboard callouts, Play / No thanks on the offer frame, and
 * NEW on each added element of "What changed". A pin is placed only where it covers no control (a
 * button, tab or input measured in the capture), no other pin and no other target; otherwise the
 * element keeps its ring and the pin is listed on the details slide without a letter.
 */
export function flowPins(f: FlowInput, sw: number): PinSpot[][] {
  let letter = 0;
  const same = (a: Box, b: Box) => Math.abs(a.x - b.x) < 6 && Math.abs(a.y - b.y) < 6 && Math.abs(a.w - b.w) < 12;
  return f.frames.map(fr => {
    const out: PinSpot[] = [];
    for (const c of fr.callouts) if (c.box) out.push({ label: null, text: c.text, box: c.box, spot: null, isNew: false });
    if (fr.phase === "offer") {
      const near = (b: Box) => out.some(x => x.box && Math.abs(x.box.x - b.x) < 8 && Math.abs(x.box.y - b.y) < 8);
      if (fr.choices.play && !near(fr.choices.play)) out.push({ label: null, text: `${f.p.offer.cta}: starts a ${f.p.simula.minPlaySec}s sponsored game`, box: fr.choices.play, spot: null, isNew: false, choice: true });
      if (fr.choices.decline && !near(fr.choices.decline)) out.push({ label: null, text: `${f.p.offer.decline}: dismisses the offer`, box: fr.choices.decline, spot: null, isNew: false, choice: true });
    }
    if (fr.phase === "change") {
      for (const p of out) if (p.box && fr.newBoxes.some(b => same(p.box!, b))) { p.isNew = true; p.text = p.text.replace(/^new\b[:\s-]*/i, ""); }
      for (const b of fr.newBoxes) if (!out.some(p => p.box && same(p.box, b))) out.push({ label: null, text: "", box: b, spot: null, isNew: true });
    }
    const placed = out.filter(p => p.box);
    // Pin half-sizes in device px (NEW is a wider tag): the screen is `sw` slide px for `vw` device px.
    const k2d = fr.vw / sw;
    const r = (PIN / 2) * k2d + 1, rx = (placed.some(p => p.isNew) ? NEW_W / 2 : PIN / 2) * k2d + 1;
    const controls = fr.controls ?? [];
    const spots = placePins(placed.map(p => p.box!), fr.vw, fr.vh, r, fr.texts ?? [], controls, rx);
    const taken: { x: number; y: number }[] = [];
    placed.forEach((p, k) => {
      // Never on a control other than the pin's own element (a badge on its own edge is fine), never on another pin.
      if (controls.some(c => !sameBox(c, p.box!) && coversRect(spots[k].x, spots[k].y, rx, r, c))) return;
      if (taken.some(t => Math.abs(t.x - spots[k].x) < 2 * rx && Math.abs(t.y - spots[k].y) < 2 * r)) return;
      taken.push(spots[k]);
      p.spot = spots[k];
      p.label = p.isNew ? "NEW" : LETTERS[letter++ % LETTERS.length];
    });
    for (const c of fr.callouts) if (!c.box) out.push({ label: null, text: c.text, box: null, spot: null, isNew: false });
    return out;
  });
}

function pinOverlays(fr: Frame, pins: PinSpot[], sw: number): string {
  const pc = (v: number, of: number) => `${Math.max(0, Math.min(100, (v / of) * 100)).toFixed(2)}%`;
  const out: string[] = [];
  for (const p of pins) {
    // Play / No thanks carry a pin only: a ring would make the quiet No thanks read as an outlined button.
    if (!p.box || p.choice || (!p.text && !p.spot)) continue;
    out.push(`<span class="ring" style="left:${pc(p.box.x, fr.vw)};top:${pc(p.box.y, fr.vh)};width:${pc(p.box.w, fr.vw)};height:${pc(p.box.h, fr.vh)}"></span>`);
  }
  for (const p of pins) {
    if (!p.spot || !p.label) continue;
    const title = p.text ? ` title="${h(p.text)}"` : "";
    out.push(`<span class="pin"${p.isNew ? ' data-kind="new"' : ""}${title} style="left:${pc(p.spot.x, fr.vw)};top:${pc(p.spot.y, fr.vh)}">${h(p.label)}</span>`);
  }
  void sw;
  return out.join("");
}

/**
 * Where each pin goes: just outside its element's top-right corner when that is free, else the next
 * free spot around the element, else straddling its own element's top edge (a badge on the element,
 * never inside it).
 * A pin is a rectangle of half-size `rx` x `r` device px (a letter pin is square, the NEW tag wider).
 * Covering another control (button, tab, input) or another pin is never chosen while any other spot
 * exists; covering words or the pin's own element costs a little, so free space wins.
 */
export function placePins(boxes: Box[], vw: number, vh: number, r: number, texts: Box[] = [], controls: Box[] = [], rx = r): { x: number; y: number }[] {
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const covers = (x: number, y: number, b: Box) => coversRect(x, y, rx, r, b);
  const placed: { x: number; y: number }[] = [];
  boxes.forEach((b, i) => {
    const dx = rx + 1, dy = r + 1;
    const cands = [
      [b.x + b.w + dx * 0.7, b.y - dy * 0.7], // outside the top-right corner
      [b.x + b.w - rx, b.y - dy],             // above the top-right corner
      [b.x + b.w + dx, b.y + b.h / 2],        // right of the element
      [b.x - dx * 0.7, b.y - dy * 0.7],       // outside the top-left corner
      [b.x + b.w / 2, b.y - dy],              // above the middle
      [b.x + b.w + dx * 0.7, b.y + b.h + dy * 0.7],
      [b.x - dx, b.y + b.h / 2],
      [b.x + b.w / 2, b.y + b.h + dy],
      [b.x + rx, b.y - dy],                   // above the top-left corner
      [b.x - dx * 0.7, b.y + b.h + dy * 0.7],
      [b.x + b.w - rx - 4, b.y],              // a badge on the element's own top-right corner
      [b.x + rx + 4, b.y],                    // ... or top-left corner
    ].map(([x, y]) => ({ x: clamp(x, rx, vw - rx), y: clamp(y, r, vh - r) }));
    let best = cands[0], cost = Infinity;
    cands.forEach((c, k) => {
      let v = k * 0.1;
      if (placed.some(p => Math.abs(p.x - c.x) < 2 * rx + 2 && Math.abs(p.y - c.y) < 2 * r + 2)) v += 100;
      boxes.forEach((o, j) => { if (j !== i && covers(c.x, c.y, o)) v += 10; });
      if (covers(c.x, c.y, b)) v += 3;
      v += 60 * controls.filter(t => !sameBox(t, b) && covers(c.x, c.y, t)).length;
      // Words on screen: another element's words cost more than the edge of the pin's own element.
      const inside = (t: Box) => t.x >= b.x - 1 && t.y >= b.y - 1 && t.x + t.w <= b.x + b.w + 1 && t.y + t.h <= b.y + b.h + 1;
      v += texts.filter(t => covers(c.x, c.y, t)).reduce((a, t) => a + (inside(t) ? 2 : 4), 0);
      if (v < cost) { cost = v; best = c; }
    });
    placed.push(best);
  });
  return placed;
}

function coversRect(x: number, y: number, rx: number, ry: number, b: Box): boolean {
  return x + rx > b.x && x - rx < b.x + b.w && y + ry > b.y && y - ry < b.y + b.h;
}

const sameBox = (a: Box, b: Box) => Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2 && Math.abs(a.w - b.w) < 2 && Math.abs(a.h - b.h) < 2;

/** Headline size that keeps a flow headline on one line across the slide (display font ≈ 0.64 em per character). */
const headSize = (text: string) => Math.max(40, Math.min(60, Math.floor((W - 2 * PAD_X) / (Math.max(1, text.length) * 0.64))));

const phoneH = (width: number, ratio: number, bezel: number) => Math.round((width - 2 * bezel) * ratio) + 2 * bezel;

/** A rounded device frame around a screen image, with optional overlays (rings, pins). */
function phoneHtml(src: string, alt: string, width: number, ratio: number, bezel: number, overlays = ""): string {
  const sw = width - 2 * bezel;
  const rad = Math.round(width * 0.15);
  return `<div class="phone" style="width:${width}px;padding:${bezel}px;border-radius:${rad}px"><div class="screen" style="height:${Math.round(sw * ratio)}px;border-radius:${rad - bezel}px"><img src="${h(src)}" alt="${h(alt)}">${overlays}</div></div>`;
}

/** The numbered circle on a phone's bottom-left corner (positions are relative to the phone). */
function marker(n: number, ph: number): string {
  return `<span class="mk" style="left:${-MK / 2 + 6}px;top:${ph - MK / 2 + 10}px">${n}</span>`;
}

/** The thin elbow from the numbered circle up the phone's left side, pointing right at `target` (px from the phone top). */
function elbow(target: number, ph: number): string {
  const fromY = ph + 10, fromX = -MK / 2 + 6; // circle centre height and left edge, relative to the phone
  const top = target - 7, height = fromY - target + 14, x0 = fromX + BR, y0 = fromY - top, y1 = 7, r = 7, xl = 6, tip = BR - 2;
  if (height < 40) return "";
  return `<svg class="elbow" style="left:${-BR}px;top:${top}px" width="${BR}" height="${height}" viewBox="0 0 ${BR} ${height}" aria-hidden="true"><path d="M${x0} ${y0}H${xl + r}Q${xl} ${y0} ${xl} ${y0 - r}V${y1 + r}Q${xl} ${y1} ${xl + r} ${y1}H${tip - 6}" stroke="#A3ACBA" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M${tip - 7} ${y1 - 5}L${tip} ${y1}L${tip - 7} ${y1 + 5}Z" fill="#A3ACBA"/></svg>`;
}

function chevron(): string {
  return `<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M8 5l6 6-6 6" stroke="#A3ACBA" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function deviceRatio(m: ProductModel): number {
  return m.device.widthPx > 0 ? m.device.heightPx / m.device.widthPx : 2.2;
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

/** "#6C4DF6" -> "rgba(108,77,246,a)" (for the soft background and tints). */
function rgba(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const v = m ? parseInt(m[1], 16) : 0x4f46e5;
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
}

function css(a: { accent: string; ink: string }): string {
  const display = `"Deck Display","Deck Text",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif`;
  return `
@font-face{font-family:"Deck Display";src:url("fonts/montserrat.woff2") format("woff2");font-weight:100 900;font-display:block}
@font-face{font-family:"Deck Text";src:url("fonts/inter.woff2") format("woff2");font-weight:100 900;font-display:block}
:root{--accent:${a.accent};--accent-ink:${a.ink};--accent-soft:${rgba(a.accent, 0.1)};--accent-line:${rgba(a.accent, 0.28)};--ink:#0F172A;--muted:#64748B;--body:#334155;--line:#E2E8F0;--soft:#F1F5F9;--ship:#047857;--revise:#B45309;--reject:#B91C1C;--display:${display}}
*{box-sizing:border-box}
html,body{margin:0;background:#D9DCE1}
body{font-family:"Deck Text",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:var(--ink);-webkit-font-smoothing:antialiased;font-feature-settings:"cv11","ss01"}
@page{size:1920px 1080px;margin:0}
.slide{position:relative;width:1920px;height:1080px;overflow:hidden;padding:52px ${PAD_X}px 64px;margin:24px auto;box-shadow:0 6px 28px rgba(17,24,39,.12);zoom:var(--z,1);
  background:radial-gradient(1100px 760px at -6% -12%,${rgba(a.accent, 0.1)},transparent 62%),radial-gradient(1200px 820px at 106% 112%,rgba(96,165,250,.13),transparent 64%),#FBFCFE}
@media print{html,body{background:#fff}.slide{margin:0;box-shadow:none;zoom:1;break-after:page;page-break-after:always}.slide:last-of-type{break-after:auto;page-break-after:auto}}
a{color:inherit}
.kicker{font-size:15px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:600}
.kicker b{color:var(--ink);font-weight:700}
h1{font-family:var(--display);font-size:54px;line-height:1.1;margin:12px 0 0;font-weight:800;letter-spacing:-.02em;max-width:1640px;color:var(--ink)}
h1 em{font-style:normal;color:var(--accent)}
h1.lead{font-size:62px}
h1.claim{font-size:60px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:1792px}
h1.h2{font-size:40px}
.sub{font-size:22px;line-height:1.45;color:var(--muted);margin:14px 0 0;max-width:1500px}
.sub.one{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:1792px;margin-top:12px;font-size:21px}
.foot{position:absolute;left:${PAD_X}px;right:${PAD_X}px;bottom:24px;display:flex;justify-content:space-between;font-size:14px;color:#94A3B8}
.badges{display:flex;gap:8px;flex-wrap:wrap}
.badge{font-size:14px;font-weight:650;padding:6px 12px;border-radius:999px;border:1px solid var(--line);background:#fff;color:var(--ink)}
.badge.ship{background:#ECFDF5;color:var(--ship);border-color:#A7F3D0;font-weight:800;letter-spacing:.04em}
.stat-k{font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:700}
.stat-v{font-family:var(--display);font-size:34px;font-weight:800;margin-top:8px;letter-spacing:-.015em;color:var(--ink)}
/* phones, markers, elbows */
.phone{background:#0B0D12;box-shadow:inset 0 0 0 1.5px #2B2F38,0 30px 50px -22px rgba(15,23,42,.5),0 12px 22px -12px rgba(15,23,42,.28)}
.screen{position:relative;overflow:hidden;background:#fff}
.screen img{display:block;width:100%;height:100%;object-fit:cover;object-position:top}
.zoom{position:absolute;z-index:3;overflow:hidden;background:#fff;border-radius:14px;box-shadow:0 0 0 2.5px #fff,0 0 0 4px var(--accent),0 18px 34px -14px rgba(15,23,42,.55)}
.zoom-crop{position:absolute;overflow:hidden;border-radius:8px}
.zoom img{position:absolute;max-width:none;display:block}
.zoom-link{position:absolute;left:0;top:0;z-index:3;overflow:visible;pointer-events:none}
.ring{position:absolute;border:2px solid var(--accent);border-radius:9px;box-shadow:0 0 0 2px rgba(255,255,255,.9),0 0 0 6px ${rgba(a.accent, 0.18)}}
.pin{position:absolute;width:${PIN}px;height:${PIN}px;margin:-${PIN / 2}px 0 0 -${PIN / 2}px;border-radius:50%;background:#fff;color:var(--accent);font-size:11.5px;font-weight:800;line-height:${PIN - 4}px;text-align:center;border:2px solid var(--accent);box-shadow:0 2px 6px rgba(15,23,42,.28)}
.pin[data-kind="new"]{width:${NEW_W}px;margin-left:-${NEW_W / 2}px;border-radius:999px;background:var(--accent);color:var(--accent-ink);font-size:10px;letter-spacing:.08em;border-color:#fff}
.mk{position:absolute;width:${MK}px;height:${MK}px;border-radius:50%;background:var(--accent);color:var(--accent-ink);font-family:var(--display);font-size:19px;font-weight:800;display:grid;place-items:center;box-shadow:0 0 0 4px #fff,0 6px 14px -4px ${rgba(a.accent, 0.55)};z-index:2}
.mk.sm{position:static;width:26px;height:26px;font-size:13px;box-shadow:none;display:inline-grid;margin-right:10px;vertical-align:middle}
.mk.xs{position:static;width:22px;height:22px;font-size:12px;box-shadow:none;display:inline-grid;flex:none}
.elbow{position:absolute;overflow:visible}
.ph{position:absolute;left:${MK / 2 + 16}px;font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);white-space:nowrap}
.cap-block{position:absolute;left:${-MK / 2 + 6}px}
.cap{font-size:19px;line-height:1.32;font-weight:750;color:var(--ink);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;letter-spacing:-.012em}
.cap.long{font-size:17.5px}
.decline{display:flex;gap:8px;align-items:flex-start;margin-top:10px;font-size:14.5px;line-height:1.35;color:var(--body)}
.decline .ret{flex:none;width:20px;height:20px;border-radius:6px;background:var(--soft);color:var(--muted);font-size:12px;display:grid;place-items:center;margin-top:0}
.noshot{display:grid;place-items:center;background:var(--soft);border:2px dashed var(--line);border-radius:28px;color:var(--muted);font-size:15px}
/* recommendation */
.cards{display:grid;gap:28px;margin-top:40px}
.card{display:flex;gap:30px;align-items:center;text-decoration:none;background:#fff;border-radius:26px;padding:26px 28px;box-shadow:0 1px 0 var(--line),0 18px 40px -24px rgba(15,23,42,.28);border:1px solid #EEF2F7}
.strip{display:flex;align-items:center;gap:4px;flex:none}
.mini-arrow{display:flex}
.card-k{font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:700;display:flex;align-items:center}
.card h3{font-family:var(--display);font-size:28px;line-height:1.18;margin:14px 0 10px;font-weight:800;letter-spacing:-.015em}
.card h3 em{font-style:normal;color:var(--accent)}
.cards.n3 .card h3,.cards.n4 .card h3{font-size:25px}
.cards.n1 .card h3{font-size:40px}
.card-why{list-style:none;margin:26px 0 0;padding:22px 0 0;border-top:1px solid var(--line);display:grid;grid-template-columns:repeat(3,1fr);gap:28px}
.card-why .stat{font-family:var(--display);font-size:24px;font-weight:800;color:var(--accent);letter-spacing:-.015em;white-space:nowrap}
.card-why p{font-size:15.5px;line-height:1.45;color:var(--body);margin:6px 0 0}
.card p{font-size:17px;line-height:1.45;color:var(--body);margin:0 0 16px}
.none{margin-top:40px;background:#fff;border:1px solid var(--line);border-radius:22px;padding:32px 36px;font-size:24px;line-height:1.45;max-width:1500px}
.none p{margin:0 0 14px}
.band{position:absolute;left:${PAD_X}px;right:${PAD_X}px;bottom:74px;display:grid;grid-template-columns:1.2fr 1fr;gap:28px}
.panel{background:rgba(255,255,255,.78);border:1px solid #E8EDF4;border-radius:22px;padding:22px 28px 24px;position:relative;overflow:hidden}
.panel::before{content:"";position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--accent)}
.panel .stat-v{color:var(--accent)}
.band p{font-size:17px;line-height:1.45;color:var(--body);margin:10px 0 0;max-width:820px}
/* money today */
.money{position:relative;margin-top:44px}
.m-col{position:absolute;top:0}
.scr{font-size:15px;color:var(--muted);font-weight:600;margin-bottom:6px}
.facts{list-style:none;margin:0;padding:0;font-size:16px;line-height:1.38;color:var(--body)}
.facts li{margin-top:5px;padding-left:14px;position:relative}
.facts li::before{content:"";position:absolute;left:0;top:.58em;width:6px;height:6px;border-radius:50%;background:var(--accent)}
.facts li.more{color:var(--muted)}
.tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;position:absolute;left:${PAD_X}px;right:${PAD_X}px;bottom:70px}
.tiles.t3{position:static;grid-template-columns:repeat(3,1fr);margin:10px 0 18px}
.tile{background:rgba(255,255,255,.8);border:1px solid #E8EDF4;border-radius:18px;padding:16px 20px}
.tile p{font-size:17px;line-height:1.4;margin:8px 0 0;color:var(--ink)}
/* flow */
.stage{position:absolute;left:${PAD_X}px}
.f-col{position:absolute}
.trigger{position:absolute;top:0}
.trig-arrow{position:absolute;left:0;top:0;overflow:visible}
.trig-label{position:absolute;left:-40px;right:-40px;display:flex;gap:10px;align-items:flex-start;justify-content:center}
.trig-label .t{flex:none;background:var(--accent);color:var(--accent-ink);font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;padding:5px 10px;border-radius:7px;margin-top:1px}
.trig-label p{margin:0;font-size:16px;line-height:1.35;font-weight:600;color:var(--ink);max-width:470px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.rail{position:absolute;right:${PAD_X}px;width:${RAIL}px;display:flex;flex-direction:column;gap:16px}
.rail h3{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:14px 0 0;font-weight:700}
.why{list-style:none;margin:0;padding:0}
.why li{padding:16px 0 18px;border-top:1px solid var(--line)}
.why li:first-child{border-top:0;padding-top:4px}
.why .stat{font-family:var(--display);font-size:24px;white-space:nowrap;font-weight:800;line-height:1.15;letter-spacing:-.015em;color:var(--accent)}
.why .txt{font-size:15.5px;line-height:1.45;color:var(--body);margin-top:6px}
.proto{display:block;text-align:center;background:var(--accent);color:var(--accent-ink);padding:14px 16px;border-radius:14px;font-weight:750;text-decoration:none;font-size:17px;box-shadow:0 10px 22px -12px ${rgba(a.accent, 0.8)}}
.fine{font-size:13px;line-height:1.45;color:var(--muted);margin:0}
/* details */
.details{display:grid;grid-template-columns:1fr 1fr 1.15fr;gap:40px;margin-top:24px}
.kv{margin-bottom:16px}
.kv h4,.lbl{font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:0 0 6px}
.kv p{font-size:16.5px;line-height:1.42;margin:0}
.kv ul{margin:0;padding-left:18px;font-size:15.5px;line-height:1.4}
.btn{display:inline-block;margin-top:8px;background:var(--accent);color:var(--accent-ink);font-size:14px;font-weight:700;padding:5px 12px;border-radius:999px}
.btn.ghost{background:#fff;color:var(--ink);border:1px solid var(--line)}
.frames{list-style:none;margin:2px 0 0;padding:0}
.frames>li{margin-bottom:8px}
.fr-h{display:flex;gap:8px;align-items:baseline;font-size:15px;line-height:1.35}
.fr-h .mk.xs{align-self:flex-start;margin-top:-1px}
.fr-h b{white-space:nowrap}
.fr-c{color:var(--body)}
.legend{list-style:none;padding:0 0 0 30px;margin:3px 0 0;font-size:14px;line-height:1.3;color:var(--body)}
.legend li{display:flex;gap:6px;margin-top:3px}
.legend .d{flex:none;min-width:18px;height:18px;padding:0 3px;border-radius:9px;background:#fff;border:1.5px solid var(--accent);color:var(--accent);font-size:10.5px;font-weight:800;display:grid;place-items:center}
.legend .d.new{background:var(--accent);color:var(--accent-ink);border-color:var(--accent);font-size:9px;letter-spacing:.06em;padding:0 5px}
.legend .d.off{background:none;border:2px solid #CBD5E1;min-width:12px;width:12px;height:12px;margin:3px 3px 0}
table{border-collapse:collapse;width:100%}
.econ td{font-size:15px;padding:5px 0;border-bottom:1px solid var(--line);vertical-align:top}
.econ td:last-child{text-align:right;font-weight:650;padding-left:12px}
.flags{margin:8px 0 0;padding-left:18px;font-size:14px;color:var(--revise)}
.scenario{border:2px dashed #CBD5E1;border-radius:14px;padding:12px 16px;margin-bottom:16px;background:rgba(255,255,255,.6)}
.scenario .tag{display:inline-block;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--revise)}
.sc-row{display:flex;gap:24px;margin-top:6px}
.sc-row b{display:block;font-size:22px}
.sc-row span{font-size:13px;color:var(--muted)}
.scenario p{font-size:13.5px;line-height:1.35;color:var(--muted);margin:8px 0 0}
.code{background:#0F172A;color:#E2E8F0;border-radius:14px;padding:14px 16px;font:11.5px/1.42 ui-monospace,SFMono-Regular,Menlo,Consolas,"DejaVu Sans Mono",monospace;white-space:pre-wrap;word-break:break-word;margin:0;max-height:600px;overflow:hidden}
.code .c{color:#94A3B8}
/* ideas */
.ideas{margin-top:26px;font-size:18px;background:rgba(255,255,255,.7);border-radius:14px}
.ideas th{text-align:left;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);border-bottom:2px solid var(--line);padding:10px 12px}
.ideas td{border-bottom:1px solid var(--line);padding:13px 12px;vertical-align:top;line-height:1.35}
.ideas td.id{color:var(--muted);width:60px}
.ideas td.num,.small td.num{text-align:right;font-variant-numeric:tabular-nums}
.case{font-size:14px;color:var(--muted);margin-top:3px}
.v{display:inline-block;font-size:13px;font-weight:800;letter-spacing:.05em;padding:4px 10px;border-radius:999px;white-space:nowrap}
.v-ship{background:#ECFDF5;color:var(--ship)}.v-revise{background:#FFFBEB;color:var(--revise)}.v-reject{background:#FEF2F2;color:var(--reject)}.v-not-judged{background:var(--soft);color:var(--muted)}
.also{font-size:16px;line-height:1.4;color:var(--body);margin:14px 0 0}
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
.quad h3{margin:0 0 8px;font-size:22px;font-family:var(--display);font-weight:800}
.quad ul{margin:0;padding-left:20px;font-size:17px;line-height:1.45}
`;
}
