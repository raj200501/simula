// Code gates catch each single-fault type; the verdict thresholds are exact.
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import type { Criterion, GateResult, Proposal } from "../src/core/schema.ts";
import { setLlmContext } from "../src/core/llm.ts";
import { proposalEconomics } from "../src/model/economics.ts";
import { stubCandidates } from "../src/propose/stub.ts";
import { codeGates } from "../src/judge/gates.ts";
import { stubJudge, unnegated } from "../src/judge/stub.ts";
import { THRESHOLDS, WEIGHTS, finalVerdict, stalled, verdictOf, weightedScore } from "../src/judge/verdict.ts";
import { sampleModel } from "./helpers/sample-model.ts";

setLlmContext({ mode: "stub" });

describe("code gates", () => {
  const m = sampleModel();
  let base: Proposal;
  before(() => { base = stubCandidates(m, { candidates: 8, proposals: 4 }).proposals.find(p => p.archetype === "TAX-1")!; });

  const mutate = (f: (p: Proposal) => void): Proposal => {
    const p = structuredClone(base);
    f(p);
    return { ...p, economics: proposalEconomics({ ...p, economics: undefined }, m) };
  };
  const failed = (p: Proposal) => codeGates(p, m).filter(g => !g.pass);
  const failsOnly = (p: Proposal, gate: string, severity: GateResult["severity"], re?: RegExp) => {
    const f = failed(p);
    assert.deepEqual(f.map(g => g.gate), [gate], f.map(g => `${g.gate}: ${g.evidence}`).join(" | "));
    assert.equal(f[0].severity, severity);
    if (re) assert.match(f[0].evidence, re);
  };

  test("the positive passes every code gate", () => assert.deepEqual(failed(base), []));

  test("decline removed -> structure (fixable)", () => failsOnly(mutate(p => { p.offer.decline = " "; }), "structure", "fixable", /no decline/));
  test("gift-card reward -> policy lint (policy)", () => failsOnly(mutate(p => { p.reward.what = "A $1 gift card every 10 games"; }), "policy-lint", "policy", /gift card/));
  test("'tap the ad' copy -> policy lint", () => failsOnly(mutate(p => { p.offer.body = "Tap the ad to get 50 credits"; }), "policy-lint", "policy"));
  test("risks may say 'never reward installs' without tripping the lint", () => assert.deepEqual(failed(mutate(p => { p.risks = ["Never reward installs or clicks."]; })), []));
  test("an observed ad placement may be cited by its digest label or its element; an unseen one fails grounding", () => {
    assert.deepEqual(failed(mutate(p => { p.anchor.economy = [...p.anchor.economy, "AD TODAY native on Home (e6)", "Sponsored: SkyBank (e6)"]; })), []);
    failsOnly(mutate(p => { p.anchor.economy = [...p.anchor.economy, "AD TODAY banner on Store (e9)"]; }), "grounding", "fixable", /e9/);
  });
  test("unknown surface -> grounding", () => failsOnly(mutate(p => { p.surface = "s99"; }), "grounding", "fixable", /s99/));
  test("undeclared new element -> grounding", () => failsOnly(mutate(p => { p.patch.newEdges[0].el = "ne7"; }), "grounding", "fixable", /ne7/));
  test("unknown moment and economy ids -> grounding", () => failsOnly(mutate(p => { p.anchor.moments.push("m42"); }), "grounding", "fixable", /m42/));
  test("reward far larger than a view -> economics", () => failsOnly(mutate(p => { p.reward.amount = 1000; }), "economics", "fixable", /cannibalization/));
  test("reward that costs more to serve than a view earns -> economics", () => failsOnly(mutate(p => { p.assumptions.cogs = "image"; }), "economics", "fixable", /Cost to serve/));
  test("4 storyboard phases -> structure", () => failsOnly(mutate(p => { p.storyboard = p.storyboard.slice(0, 4); }), "structure", "fixable", /storyboard phases/));
  test("caps.perDay 0 -> structure", () => failsOnly(mutate(p => { p.caps.perDay = 0; }), "structure", "fixable", /perDay/));
  test("first-value surface -> structure", () => {
    const p = mutate(q => { q.surface = "s02"; q.patch.newElements[0].in = "s02"; q.patch.newElements[0].near = undefined; q.patch.newEdges[0].from = "s02"; });
    failsOnly(p, "structure", "fixable", /first-value/);
  });
  test("existing without an observed economy item -> label (relabel)", () => failsOnly(mutate(p => { p.anchor.economy = []; }), "label", "fixable", /relabel/));
  test("product change without a new mechanic -> label", () => failsOnly(mutate(p => { p.case = "product-change"; }), "label", "fixable", /newMechanic/));
  test("a format that already runs on that surface -> already-exists", () => {
    const p = mutate(q => { q.simula.unit = "SIM-NAT"; q.surface = "s01"; q.patch.newElements[0].in = "s01"; q.patch.newElements[0].near = "e2"; q.patch.newEdges[0].from = "s01"; });
    failsOnly(p, "already-exists", "fixable", /native/);
  });
  test("an invalid proposal stops at the schema gate", () => {
    const g = codeGates({ ...base, reward: { ...base.reward, grantOn: "EARNED_REWARD" } } as unknown as Proposal, m);
    assert.deepEqual(g.map(x => [x.gate, x.pass, x.severity]), [["schema", false, "policy"]]);
  });

  test("stub judge gates: auto-play, loss framing, subscribers are caught; negations are not", () => {
    const fails = (p: Proposal) => stubJudge(p, m, codeGates(p, m)).gates.filter(g => !g.pass).map(g => g.gate);
    assert.deepEqual(fails(base), []);
    assert.ok(fails(mutate(p => { p.trigger = "Auto-plays mid-response while the reply is still streaming."; })).includes("no-loss-framing"));
    assert.ok(fails(mutate(p => { p.offer.body = "Watch now or lose your chat history."; })).includes("no-loss-framing"));
    assert.ok(fails(mutate(p => { p.eligibility = "All users, including subscribers, on every app open."; })).includes("not-for-subscribers"));
    assert.equal(unnegated("never mid-stream", /mid-?stream/), null);
    assert.equal(unnegated("Non-payers only", /\bpayers\b/), null);
    assert.equal(unnegated("[No thanks]\nIt auto-plays", /auto-?plays/), "auto-plays");
  });
});

describe("verdict (pure)", () => {
  const all = (score: number) => WEIGHTS.map(w => ({ criterion: w.criterion, score }));
  const pass: GateResult[] = [{ gate: "grounding", pass: true, by: "code", severity: "fixable", evidence: "" }];
  const fail = (severity: GateResult["severity"]): GateResult[] => [{ gate: "x", pass: false, by: "code", severity, evidence: "" }];
  const withScore = (c: Criterion, s: number, rest = 4) => all(rest).map(x => (x.criterion === c ? { ...x, score: s } : x));

  test("weights sum to 100 and the table matches the spec", () => {
    assert.equal(WEIGHTS.reduce((a, w) => a + w.weight, 0), 100);
    assert.deepEqual(Object.fromEntries(WEIGHTS.map(w => [w.criterion, w.weight])), {
      "value-moment-fit": 20, "product-integrity": 15, "cannibalization-safety": 15, "unit-economics": 10, reach: 10, feasibility: 10, specificity: 10, "frequency-fatigue": 5, measurability: 5,
    });
    assert.deepEqual(THRESHOLDS, { ship: 3.8, revise: 3.0, minCriterion: 3, maxRounds: 2, minImprovement: 0.2 });
  });

  test("SHIP at >= 3.8 with every criterion >= 3 and all gates passing", () => {
    const s = withScore("value-moment-fit", 3, 4).map(x => (x.criterion === "product-integrity" ? { ...x, score: 4 } : x));
    // 3*20 + 4*80 = 380 -> 3.8 exactly
    assert.equal(weightedScore(s), 3.8);
    assert.equal(verdictOf(pass, s, 0).verdict, "SHIP");
  });

  test("REVISE just below 3.8, on any criterion <= 2, or on a fixable gate", () => {
    const below = withScore("value-moment-fit", 3, 4).map(x => (x.criterion === "measurability" ? { ...x, score: 3 } : x)); // 3.75
    assert.equal(verdictOf(pass, below, 0).verdict, "REVISE");
    const lowOne = withScore("measurability", 2, 5); // 4.85 but a criterion <= 2
    assert.equal(verdictOf(pass, lowOne, 0).verdict, "REVISE");
    assert.match(verdictOf(pass, lowOne, 0).reasons.join(" "), /measurability scored 2/);
    assert.equal(verdictOf(fail("fixable"), all(5), 0).verdict, "REVISE");
  });

  test("REJECT below 3.0, on a policy gate, or still REVISE after round 2", () => {
    assert.equal(verdictOf(pass, all(2.9), 0).verdict, "REJECT");
    assert.equal(verdictOf(fail("policy"), all(5), 0).verdict, "REJECT");
    assert.equal(verdictOf(fail("policy"), [], 0).weighted, null);
    assert.equal(verdictOf(fail("fixable"), all(5), 1).verdict, "REVISE");
    assert.equal(verdictOf(fail("fixable"), all(5), 2).verdict, "REJECT");
    assert.equal(verdictOf(pass, all(3.5), 2).verdict, "REJECT");
  });

  test("missing criteria cannot SHIP", () => {
    const r = verdictOf(pass, all(5).slice(1), 0);
    assert.equal(r.verdict, "REVISE");
    assert.match(r.reasons.join(" "), /not scored: value-moment-fit/);
  });

  test("stalled revisions stop the loop and end as REJECT; progress continues it", () => {
    const round = (verdict: "SHIP" | "REVISE", weighted: number, failedGates: number) => ({ verdict, weighted, gates: Array.from({ length: failedGates }, () => fail("fixable")[0]) });
    assert.ok(stalled(round("REVISE", 3.5, 1), round("REVISE", 3.6, 1)));
    assert.ok(!stalled(round("REVISE", 3.5, 1), round("REVISE", 3.7, 1)));
    assert.ok(!stalled(round("REVISE", 3.5, 2), round("REVISE", 3.5, 1)), "fixing a gate is progress");
    assert.ok(!stalled(round("REVISE", 3.5, 1), round("SHIP", 3.9, 0)));
    assert.equal(finalVerdict([round("REVISE", 3.5, 1), round("REVISE", 3.5, 1)]).verdict, "REJECT");
    assert.equal(finalVerdict([round("REVISE", 3.5, 1), round("SHIP", 4, 0)]).verdict, "SHIP");
  });
});
