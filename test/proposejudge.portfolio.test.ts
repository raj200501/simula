// Portfolio check: near-duplicate SHIPs are detected in code; the better-scored one is kept and the
// other fails "portfolio-distinct", gets one ordinary revision round, and is rejected if still a duplicate.
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { Candidates, Judgments, Proposal } from "../src/core/schema.ts";
import { setLlmContext } from "../src/core/llm.ts";
import { propose } from "../src/propose/propose.ts";
import { stubCandidates } from "../src/propose/stub.ts";
import { judgeAll, Revisions } from "../src/judge/judge.ts";
import { load } from "../src/core/io.ts";
import { PORTFOLIO, archetypeFamily, nearDuplicate, offerJaccard, portfolioGate, portfolioOrder, rewardKey, surfaceKey } from "../src/judge/portfolio.ts";
import { sampleModel } from "./helpers/sample-model.ts";
import { ctx, tmpDir } from "./helpers/proposejudge-ctx.ts";

setLlmContext({ mode: "stub" });

describe("portfolio: near-duplicate detection (pure)", () => {
  const m = sampleModel();
  let base: Proposal;
  before(() => { base = stubCandidates(m, { candidates: 8, proposals: 4 }).proposals.find(p => p.archetype === "TAX-1")!; });
  const variant = (id: string, f: (p: Proposal) => void): Proposal => { const p = structuredClone(base); p.id = id; f(p); return p; };

  test("archetype families group the taxonomy with its AI-app instances", () => {
    assert.equal(archetypeFamily("TAX-1"), archetypeFamily("AI-2"));
    assert.equal(archetypeFamily("[AI-1] Out-of-messages refill"), "consumable refill");
    assert.equal(archetypeFamily("ai-15"), archetypeFamily("TAX-10"));
    assert.notEqual(archetypeFamily("TAX-1"), archetypeFamily("TAX-5"));
    assert.equal(archetypeFamily("custom mechanic"), "custom mechanic");
  });

  test("same surface + same reward + same family is a duplicate, even in different words", () => {
    const q = variant("P9", p => { p.archetype = "AI-1"; p.offer = { ...p.offer, title: "Keep chatting", body: "A short sponsored game tops you up right here." }; });
    assert.ok(offerJaccard(base, q) < PORTFOLIO.jaccard);
    const why = nearDuplicate(q, base);
    assert.match(why ?? "", /same surface \(s04\), same reward \(r1\) and same archetype family \(consumable refill\)/);
  });

  test("a different moment or a different reward is distinct", () => {
    const other = variant("P9", p => { p.surface = "s01"; p.offer = { ...p.offer, title: "Daily bonus", body: "Double today's check-in." }; });
    assert.equal(nearDuplicate(other, base), null);
    const entitlement = variant("P9", p => { p.reward = { ...p.reward, resource: undefined, what: "15 minutes of Premium mode" }; p.offer = { ...p.offer, title: "Try Premium", body: "Premium replies for 15 minutes." }; });
    assert.notEqual(rewardKey(entitlement), rewardKey(base));
    assert.equal(nearDuplicate(entitlement, base), null);
  });

  test("offer copy overlap >= 0.7 is a duplicate on any surface", () => {
    const q = variant("P9", p => { p.surface = "s01"; p.archetype = "TAX-9"; });
    assert.equal(offerJaccard(q, base), 1);
    assert.match(nearDuplicate(q, base) ?? "", /offer copy overlap 1 \(Jaccard >= 0\.7\)/);
  });

  test("a new sheet or modal counts as the screen it opens over", () => {
    const q = variant("P9", p => { p.surface = "N1"; p.patch.newScreens = [{ id: "N1", basedOn: "s04", kind: "sheet", change: "Sheet variant" }]; });
    assert.equal(surfaceKey(q), "s04");
    const page = variant("P9", p => { p.surface = "N1"; p.patch.newScreens = [{ id: "N1", basedOn: "s04", kind: "screen", change: "A new page" }]; });
    assert.equal(surfaceKey(page), "P9:N1", "a new full page is unique to its proposal");
  });

  test("the gate names the keeper and the change; the order is best score first, then id", () => {
    const q = variant("P9", () => {});
    const fail = portfolioGate(q, [base]);
    assert.equal(fail.keeper, base.id);
    assert.equal(fail.gate.gate, "portfolio-distinct");
    assert.equal(fail.gate.pass, false);
    assert.equal(fail.gate.severity, "fixable");
    assert.match(fail.gate.evidence, new RegExp(`^near-duplicate of ${base.id}: differentiate the moment or the reward`));
    assert.equal(portfolioGate(base, [base]).gate.pass, true, "never a duplicate of itself");
    assert.deepEqual(portfolioOrder([{ id: "P10", weighted: 4.2 }, { id: "P2", weighted: 4.2 }, { id: "P3", weighted: 4.6 }, { id: "P1", weighted: null }]).map(x => x.id), ["P3", "P2", "P10", "P1"]);
  });
});

describe("portfolio: judgeAll (stub)", () => {
  const m = sampleModel();

  test("distinct SHIPs each record a passing portfolio-distinct gate", async () => {
    const out = tmpDir("portfolio-ok");
    const c = ctx(out, "deep");
    const j = await judgeAll(c, m, await propose(c, m));
    const ships = j.final.filter(f => f.verdict === "SHIP");
    assert.ok(ships.length >= 2, j.final.map(f => `${f.proposalId}:${f.verdict}`).join(" "));
    for (const f of ships) {
      const last = j.rounds.filter(r => r.proposalId === f.proposalId).at(-1)!;
      const g = last.gates.find(x => x.gate === "portfolio-distinct");
      assert.ok(g?.pass, `${f.proposalId}: ${g?.evidence}`);
    }
    assert.ok(!j.rounds.some(r => r.gates.some(g => g.gate === "portfolio-distinct" && !g.pass)));
  });

  describe("a near-duplicate SHIP", () => {
    const out = tmpDir("portfolio-dup");
    const c = ctx(out, "deep");
    const dir = path.join(out, "sample", "proposals");
    let j: Judgments;
    let keeper = "", dup = "";
    before(async () => {
      // Judge once to find a SHIP, then add a copy of it under a new id with retitled copy (same moment, reward, family).
      const first = await propose(c, m);
      const j0 = await judgeAll(c, m, structuredClone(first));
      keeper = j0.final.filter(f => f.verdict === "SHIP").sort((a, b) => (b.weighted ?? 0) - (a.weighted ?? 0))[0].proposalId;
      const orig = first.proposals.find(p => p.id === keeper)!;
      dup = "P9";
      const copy: Proposal = { ...structuredClone(orig), id: dup, title: `${orig.title} (again)` };
      const cands: Candidates = { ...structuredClone(first), proposals: [...structuredClone(first.proposals), copy] };
      j = await judgeAll(c, m, cands);
    });

    test("the better-scored (here: equal score, lower id) one ships; the copy is revised once, then rejected", () => {
      assert.equal(j.final.find(f => f.proposalId === keeper)?.verdict, "SHIP");
      const f = j.final.find(f => f.proposalId === dup)!;
      assert.equal(f.verdict, "REJECT");
      const rounds = j.rounds.filter(r => r.proposalId === dup);
      const flagged = rounds.findIndex(r => r.gates.some(g => g.gate === "portfolio-distinct" && !g.pass));
      assert.ok(flagged >= 0, "the duplicate's round records the failed gate");
      const r0 = rounds[flagged];
      assert.equal(r0.verdict, "REVISE", "a SHIP that duplicates a kept SHIP becomes a REVISE");
      assert.equal(r0.topConcern, `near-duplicate of ${keeper}: differentiate the moment or the reward`);
      assert.equal(r0.requiredChanges[0], r0.topConcern);
      assert.ok(r0.reasons.includes("fixable gate failed: portfolio-distinct (code)"), r0.reasons.join("; "));
      // Exactly one more round: the revision, still a duplicate (the stub reviser keeps the idea) -> REJECT.
      assert.equal(rounds.length, flagged + 2);
      const r1 = rounds[flagged + 1];
      assert.equal(r1.version, r0.version + 1);
      assert.equal(r1.verdict, "REJECT");
      assert.ok(r1.gates.some(g => g.gate === "portfolio-distinct" && !g.pass));
      assert.ok(r1.reasons.some(x => x === `still a near-duplicate of ${keeper} after its revision`), r1.reasons.join("; "));
      assert.match(f.summary, new RegExp(`^REJECT after \\d+ revisions?: still a near-duplicate of ${keeper}, which scored higher and ships; same surface`));
      assert.ok(j.rounds.every(r => r.round <= j.thresholds.maxRounds));
    });

    test("judgments.md shows the gate; revisions.json keeps one version per round", () => {
      const md = fs.readFileSync(path.join(dir, "judgments.md"), "utf8");
      assert.match(md, new RegExp(`\\| portfolio-distinct \\| code \\| fixable \\| \\*\\*FAIL\\*\\* \\| near-duplicate of ${keeper}: differentiate the moment or the reward`));
      assert.match(md, /\| portfolio-distinct \| code \| fixable \| pass \|/);
      const revs = load(Revisions, path.join(dir, "revisions.json"));
      assert.equal(revs.proposals.length, j.rounds.length);
    });
  });
});
