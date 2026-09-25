// Deck rendering and slide facts, offline and without a browser: synthetic captures in, HTML out.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { proposalEconomics } from "../src/model/economics.ts";
import type { Frame } from "../src/slides/capture.ts";
import { phaseSteps } from "../src/slides/capture.ts";
import { renderDeck, type FlowInput } from "../src/slides/deck.ts";
import {
  accentOf, claimOf, clampWords, declineTarget, econTable, ideaRows, judgeChanges, normalizeStoryboard, shipped, whyBullets, PHASES,
} from "../src/slides/facts.ts";
import { integrationSnippet } from "../src/slides/integration.ts";
import type { CostRollup } from "../src/report/data.ts";
import { sampleModel } from "./helpers/sample-model.ts";
import { sampleCandidates, sampleJudgments } from "./helpers/slidesreport-fixtures.ts";

const m = sampleModel();
const noCost: CostRollup = { stage: "total", live: 0, cached: 0, usd: 0, tokensIn: 0, tokensOut: 0, thoughts: 0, providers: [], models: [], byStage: [] };

function fakeFrames(pid: string, story: ReturnType<typeof normalizeStoryboard>): Frame[] {
  return story.map((s, i) => ({
    phase: s.phase, screen: s.screen, img: `img/${pid}-${i + 1}-${s.phase}.png`, vw: 411, vh: 914,
    callouts: s.callouts.map(c => ({ text: c.text, box: { x: 40, y: 500, w: 300, h: 40 } })),
    newBoxes: s.phase === "change" ? [{ x: 16, y: 680, w: 379, h: 48 }] : [],
    choices: s.phase === "offer" ? { play: { x: 40, y: 700, w: 330, h: 48 }, decline: { x: 40, y: 760, w: 330, h: 40 } } : { play: null, decline: null },
    caption: clampWords(s.caption), source: "mock",
  }));
}

function flowsFor(j = sampleJudgments()): FlowInput[] {
  const cands = sampleCandidates();
  return shipped(cands, j).map(({ p, f }) => {
    const story = normalizeStoryboard(p, m);
    const econ = proposalEconomics(p, m);
    return {
      p, f, econ, frames: fakeFrames(p.id, story), claim: claimOf(p), declineTo: declineTarget(p, m, story[2].screen),
      surfaceName: "Out of credits", protoHref: `../mock/index.html?proposal=${p.id}`, snippet: integrationSnippet(p),
      changes: judgeChanges(p, cands, j), why: whyBullets(p, m, econ), econRows: econTable(p, m, econ), precedents: [{ id: "TAX-1", title: "Consumable refill" }],
    };
  });
}

const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

describe("slide facts", () => {
  test("only final SHIP proposals are selected, at their judged version", () => {
    const s = shipped(sampleCandidates(), sampleJudgments());
    assert.deepEqual(s.map(x => `${x.p.id}v${x.p.version}`), ["P1v2"]);
    assert.equal(shipped(sampleCandidates(), sampleJudgments({ shipVerdict: "REVISE" })).length, 0, "a REVISE is never promoted");
  });

  test("storyboard always has the five phases in order", () => {
    const p = sampleCandidates().proposals[1];
    const story = normalizeStoryboard({ ...p, storyboard: p.storyboard.filter(s => s.phase !== "ad") }, m);
    assert.deepEqual(story.map(s => s.phase), [...PHASES]);
    assert.match(story[3].caption, /15s sponsored game/);
  });

  test("captions are clamped to 12 words; the claim is the offer in the user's words", () => {
    assert.equal(clampWords("one two three four five six seven eight nine ten eleven twelve thirteen").split(" ").length, 12);
    assert.match(clampWords("one two three four five six seven eight nine ten eleven twelve thirteen"), /…$/);
    assert.equal(claimOf(sampleCandidates().proposals[1]), "Out of credits? Play a 15-second game with Mara and get 10 credits.");
  });

  test("why-rail bullets are built from code numbers: exchange rate, pack multiple, caps", () => {
    const p = sampleCandidates().proposals[1];
    const why = whyBullets(p, m, proposalEconomics(p, m));
    assert.equal(why.length, 3);
    assert.match(why[0].stat, /^1 view ≈ 6\.2–11 credits$/);
    assert.match(why[0].text, /1× send a chat message \(Basic mode\)/);
    assert.match(why[1].stat, /1 pack = 33 days of ads/); // 1,000-credit pack vs 3 x 10 credits a day
    assert.match(why[2].stat, /≤ 3 a day/);
  });

  test("decline returns to the screen the offer was shown on", () => {
    const p = sampleCandidates().proposals[1];
    assert.equal(declineTarget(p, m, "s04"), "Out of credits");
  });

  test("judge changes list the earlier round and the field diff between versions", () => {
    const c = sampleCandidates();
    const ch = judgeChanges(c.proposals[1], c, sampleJudgments())!;
    assert.match(ch.rounds[0], /Round 1 \(v1\) REVISE/);
    assert.ok(ch.diffs.some(d => d.field === "reward" && /60/.test(d.before) && /10/.test(d.after)));
  });

  test("accent is the saturated palette colour, with readable text on it", () => {
    assert.deepEqual(accentOf(m), { accent: "#6C4DF6", ink: "#FFFFFF" });
  });

  test("phase steps: offer = invite, ad = game, value = verified then close", () => {
    const p = sampleCandidates().proposals[1];
    const st = normalizeStoryboard(p, m);
    assert.deepEqual(st.map(s => phaseSteps(s.phase, s, p)), [[], [], ["invite"], ["game"], ["verified", "close"]]);
  });

  test("idea rows: SHIP first and linked, REJECT with its reason", () => {
    const rows = ideaRows(sampleCandidates(), sampleJudgments(), new Map([["P1", 3]]));
    assert.deepEqual(rows.map(r => [r.id, r.verdict, r.flowSlide ?? null]), [["P1", "SHIP", 3], ["P2", "REJECT", null]]);
    assert.match(rows[1].reason, /opt-in gate/);
  });
});

describe("deck.html", () => {
  const html = renderDeck({ m, cands: sampleCandidates(), j: sampleJudgments(), flows: flowsFor(), accent: accentOf(m), shots: new Map([["s04", "img/model-s04.png"]]), qa: null, cost: noCost });
  const flowSlides = html.split('<section class="slide flow"').slice(1);

  test("exactly one flow slide with five frames and a labelled trigger between frames 2 and 3", () => {
    assert.equal(flowSlides.length, 1);
    const f = flowSlides[0].split("</section>")[0];
    assert.equal(count(f, /class="f-col"/g), 5);
    assert.deepEqual([...f.matchAll(/data-phase="(\w+)"/g)].map(x => x[1]), ["today", "change", "offer", "ad", "value"]);
    const order = ["data-phase=\"change\"", 'class="trigger"', "data-phase=\"offer\""].map(s => f.indexOf(s));
    assert.ok(order[0] < order[1] && order[1] < order[2], "trigger sits between What changed and Offer");
    assert.match(f, /<div class="t">Trigger<\/div><p>Balance below 30/);
    assert.equal(count(f, /<svg /g), 4, "four arrows between five frames");
  });

  test("offer frame shows Play and No thanks, and the decline note", () => {
    const f = flowSlides[0];
    assert.match(f, /Play now: starts a 15s sponsored game/);
    assert.match(f, /No thanks<\/b> → back to Out of credits, nothing lost/);
    assert.match(f, /class="pin"/);
    assert.match(f, />NEW</);
  });

  test("right rail: why this works, SHIP badge, score, prototype link", () => {
    const f = flowSlides[0];
    assert.match(f, /Why this works/);
    assert.match(f, /badge ship">SHIP/);
    assert.match(f, /Score 4\.10 \/ 5/);
    assert.match(f, /href="\.\.\/mock\/index\.html\?proposal=P1"/);
  });

  test("recommendation leads with the exchange rate, not ARPDAU", () => {
    const rec = html.split("</section>")[0];
    assert.match(rec, /Exchange rate/);
    assert.match(rec, /1 completed US view ≈ 6\.2–11 credits/);
    assert.match(rec, /1 pack = 33 days of ads/);
    assert.doesNotMatch(rec, /ARPDAU/);
    assert.match(html, /Scenario, not forecast/);
    assert.match(html, /ARPDAU/, "ARPDAU lives on the details slide as a scenario");
  });

  test("the rejected idea appears in the review table with its reason", () => {
    const ideas = html.split('id="ideas-1"')[1].split("</section>")[0];
    assert.match(ideas, /Ideas we rejected, and why/);
    assert.match(ideas, /Interstitial when the app opens/);
    assert.match(ideas, /v-reject">REJECT/);
    assert.match(ideas, /Sponsored story chapters/, "undeveloped ideas are listed too");
  });

  test("details slide: judge changes, integration snippet, precedents", () => {
    const d = html.split('id="details-P1"')[1].split("</section>")[0];
    assert.match(d, /What the judge changed/);
    assert.match(d, /useRewardedAd/);
    assert.match(d, /TAX-1/);
  });

  test("self-contained: no fetch, no external URLs", () => {
    assert.doesNotMatch(html, /fetch\(/);
    assert.doesNotMatch(html, /(src|href)="https?:/);
  });

  test("zero SHIPs: the deck says so plainly and the best REVISE is only in the table", () => {
    const j = sampleJudgments({ shipVerdict: "REVISE" });
    const h0 = renderDeck({ m, cands: sampleCandidates(), j, flows: flowsFor(j), accent: accentOf(m), shots: new Map(), qa: null, cost: noCost });
    assert.equal(h0.split('<section class="slide flow"').length - 1, 0);
    assert.match(h0, /No rewarded flow for SampleChat is ready to ship yet\./);
    const ideas = h0.split('id="ideas-1"')[1];
    assert.match(ideas, /v-revise">REVISE/);
    assert.doesNotMatch(h0.split('id="ideas-1"')[0], /Refill by play/, "the REVISE is not named before the review table");
  });
});
