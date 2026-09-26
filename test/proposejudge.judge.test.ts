// The judge loop and the calibration table in stub mode.
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { setLlmContext } from "../src/core/llm.ts";
import { load } from "../src/core/io.ts";
import { Candidates, Judgments } from "../src/core/schema.ts";
import { propose } from "../src/propose/propose.ts";
import { judgeAll, Revisions } from "../src/judge/judge.ts";
import { calibrationItems, evalJudge } from "../src/judge/calibrate.ts";
import { sampleModel } from "./helpers/sample-model.ts";
import { ctx, tmpDir } from "./helpers/proposejudge-ctx.ts";

setLlmContext({ mode: "stub" });

describe("judgeAll (stub)", () => {
  const m = sampleModel();
  const out = tmpDir("judge");
  const c = ctx(out, "deep");
  const dir = path.join(out, "sample", "proposals");
  let j: Judgments;
  let cands: Candidates;
  before(async () => {
    cands = await propose(c, m);
    j = await judgeAll(c, m, cands);
  });

  test("writes schema-valid judgments with a mix of verdicts", () => {
    const disk = load(Judgments, path.join(dir, "judgments.json"));
    assert.deepEqual(disk.final, j.final);
    const verdicts = j.final.map(f => f.verdict);
    assert.ok(verdicts.includes("SHIP"), verdicts.join());
    assert.ok(verdicts.some(v => v !== "SHIP"), verdicts.join());
    assert.equal(j.final.length, c.profile.proposals);
    assert.ok(j.rounds.every(r => r.judgedBy === "stub" || r.judgedBy === "code-only"));
  });

  test("a REVISE is revised blind, re-judged, and ships when the fix works", () => {
    const revised = j.final.filter(f => f.version > 1);
    assert.ok(revised.length >= 1);
    const shipped = revised.find(f => f.verdict === "SHIP");
    assert.ok(shipped, "at least one REVISE -> SHIP");
    const rounds = j.rounds.filter(r => r.proposalId === shipped.proposalId);
    assert.deepEqual(rounds.map(r => r.verdict), ["REVISE", "SHIP"]);
    assert.deepEqual(rounds.map(r => r.version), [1, 2]);
  });

  test("REVISE is never final and never promoted; rejected rounds are kept", () => {
    assert.ok(j.final.every(f => f.verdict !== "REVISE"));
    const rejected = j.final.filter(f => f.verdict === "REJECT");
    assert.ok(rejected.length >= 1);
    for (const f of rejected) assert.ok(j.rounds.some(r => r.proposalId === f.proposalId && r.scores.length === 9));
    assert.ok(j.rounds.every(r => r.round <= j.thresholds.maxRounds));
  });

  test("final versions flow back into candidates.json; every version is kept", () => {
    const disk = load(Candidates, path.join(dir, "candidates.json"));
    for (const f of j.final) assert.equal(disk.proposals.find(p => p.id === f.proposalId)?.version, f.version);
    const revs = load(Revisions, path.join(dir, "revisions.json"));
    assert.equal(revs.proposals.length, j.rounds.length, "one version per judged round");
  });

  test("judgments.md shows every round with gates, scores, reasons and version diffs", () => {
    const md = fs.readFileSync(path.join(dir, "judgments.md"), "utf8");
    assert.match(md, /deterministic heuristic judge/);
    for (const f of j.final) assert.ok(md.includes(`## ${f.proposalId}:`), f.proposalId);
    assert.match(md, /\| criterion \| weight \| score \| evidence \|/);
    assert.match(md, /Verdict reasons \(code\)/);
    assert.match(md, /#### Changes v1 → v2/);
    assert.match(md, /`reward\.amount`: 300 → 10/);
  });
});

describe("evalJudge (stub)", () => {
  const m = sampleModel();
  const out = tmpDir("judge-cal");

  test("builds 5 positives and 8 single-fault negatives grounded in the model", () => {
    const { items, skipped } = calibrationItems(m);
    // Only the entitlement items do not apply to a consumable-economy model.
    assert.deepEqual(skipped.map(x => x.id).sort(), ["neg-account-swap", "neg-entitlement-amount", "pos-ent-decline", "pos-ent-sample", "pos-ent-tasks"]);
    assert.equal(items.filter(i => i.kind === "positive").length, 5);
    assert.equal(items.filter(i => i.kind === "negative").length, 8);
    const serial = items.find(i => i.id === "pos-serial")!.proposal;
    assert.equal(serial.surface, "s04");
    assert.equal(serial.reward.amount, 10);
    assert.equal(items.find(i => i.id === "neg-oversized")!.proposal.reward.amount, 1000);
    assert.equal(items.find(i => i.id === "neg-bad-surface")!.proposal.surface, "s99");
  });

  test("writes judge-eval.md: every negative caught, positives ship", async () => {
    const file = await evalJudge(ctx(out), m);
    assert.equal(file, path.join(out, "sample", "proposals", "judge-eval.md"));
    const md = fs.readFileSync(file, "utf8");
    assert.match(md, /## Confusion table/);
    assert.match(md, /Negatives caught \(verdict is not SHIP\): \*\*8 \/ 8\*\*/);
    assert.match(md, /Positives that SHIP: \*\*5 \/ 5\*\*/);
    assert.match(md, /not a statistical estimate/);
    assert.ok(!/p ?[<=] ?0\.0|significan/i.test(md), "no significance claims");
    const row = (id: string) => md.split("\n").find(l => l.startsWith(`| ${id} |`))!;
    assert.match(row("neg-gift-card"), /REJECT.*\| code \|/);
    assert.match(row("neg-bad-surface"), /\| code \|/);
    assert.match(row("neg-loss-framing"), /REJECT.*\| judge \|/);
    assert.match(row("neg-autoplay"), /REJECT/);
  });
});
