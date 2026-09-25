// Entitlement-only apps (plans, tiers, accounts; nothing spent in units): rewards are samples of a
// named feature (a number of uses or a time box), never "+1 tier"; ads never stand in for sign-up.
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { setLlmContext } from "../src/core/llm.ts";
import { ROOT } from "../src/core/config.ts";
import type { Candidates, ProductModel, Proposal } from "../src/core/schema.ts";
import { proposalEconomics } from "../src/model/economics.ts";
import { loadModel } from "../src/model/understand.ts";
import { propose } from "../src/propose/propose.ts";
import { isConsumable, resolveAnchors } from "../src/propose/anchors.ts";
import { codeGates, rewardCoherence } from "../src/judge/gates.ts";
import { stubJudge } from "../src/judge/stub.ts";
import { judgeAll } from "../src/judge/judge.ts";
import { calibrationItems, evalJudge } from "../src/judge/calibrate.ts";
import { deriveEconomy, regimeOf } from "../src/model/economics.ts";
import { quotaFromLimits } from "../src/model/quota.ts";
import { detectMoments } from "../src/model/moments.ts";
import { headlineOf } from "../src/slides/facts.ts";
import { ctx, entitlementModel, tmpDir } from "./helpers/proposejudge-ctx.ts";

setLlmContext({ mode: "stub" });

/** Every string a user or product team reads. */
const userText = (p: Proposal) => [p.title, p.oneLiner, p.offer.title, p.offer.body, p.offer.cta, p.reward.what, ...p.storyboard.map(b => b.caption)].join("\n");
const PLUS_N_ENTITLEMENT = /\+\s?\d+\s*(tiers?|plans?|memberships?|subscriptions?|accounts?|profiles?|plus membership|user account)\b/i;

describe("entitlement-only model (stub)", () => {
  const m = entitlementModel();
  let cands: Candidates;
  before(async () => { cands = await propose(ctx(tmpDir("ent"), "deep"), m); });

  test("anchors: no consumable, one gated plan feature behind sign-up, one account wall", () => {
    const a = resolveAnchors(m);
    assert.equal(a.res, undefined);
    assert.equal(a.sized, undefined);
    assert.deepEqual(a.gated.map(g => [g.feature, g.plan, g.signup, g.perUse, g.cogs]), [["Deep reasoning", "Plus", true, true, "text-premium"]]);
    assert.deepEqual(a.accountWalls.map(x => x.id), ["m4"]);
    assert.ok(!isConsumable(m.economy.resources[0]));
  });

  test("no proposal grants an entitlement as an amount or says '+N <tier>'", () => {
    assert.ok(cands.proposals.length > 0);
    for (const p of cands.proposals) {
      const r = m.economy.resources.find(x => x.id === p.reward.resource);
      if (r) assert.equal(p.reward.amount, undefined, `${p.id}: ${p.reward.what}`);
      assert.doesNotMatch(userText(p), PLUS_N_ENTITLEMENT, p.id);
      assert.deepEqual(rewardCoherence(p, m), [], p.id);
      for (const e of p.patch.newEdges) assert.deepEqual(e.effects, [], `${p.id}: no counter effects on entitlements`);
    }
    for (const i of cands.ideas) assert.doesNotMatch(i.reward, PLUS_N_ENTITLEMENT, i.title);
  });

  test("the gated feature is sampled by name, sized to what a view can pay for", () => {
    const sample = cands.proposals.find(p => p.case === "existing" && /Deep reasoning/.test(p.reward.what))!;
    assert.ok(sample, cands.proposals.map(p => p.reward.what).join(" | "));
    assert.match(sample.reward.what, /^1 Deep reasoning answer/);
    assert.equal(sample.reward.duration, "today");
    assert.equal(sample.surface, "s03", "sampled where the feature is used, not on the sign-up sheet");
    assert.match(sample.offer.body, /two 15-second games/, "a disclosed 2-game bundle: one answer costs more than one view earns");
    assert.deepEqual(proposalEconomics(sample, m).flags, []);
  });

  test("sign-up walls: no ad-for-account swap; the guest sample is a flagged product change after decline", () => {
    for (const p of cands.proposals) {
      assert.notEqual(p.surface, "s06", "never on the account-only wall");
      assert.ok(!p.anchor.moments.includes("m4"), "account-only features get no rewarded exchange");
      assert.deepEqual(codeGates(p, m).filter(g => g.gate === "not-for-account-wall" && !g.pass), [], p.id);
    }
    const guest = cands.proposals.find(p => p.archetype === "TAX-10");
    if (guest) {
      assert.equal(guest.case, "product-change");
      assert.equal(guest.anchor.newMechanic?.removesFreeValue, false);
      assert.match(guest.risks.join(" "), /growth lever: sample only/);
    }
    assert.equal(cands.momentSweep.find(s => s.moment === "m4")?.viable, false);
  });
});

describe("reward-coherence and account-wall gates", () => {
  const m = entitlementModel();
  let base: Proposal;
  before(async () => { base = (await propose(ctx(tmpDir("ent-gates"), "deep"), m)).proposals.find(p => p.case === "existing")!; });
  const plant = (f: (p: Proposal) => void) => { const p = structuredClone(base); f(p); return { ...p, economics: proposalEconomics({ ...p, economics: undefined }, m) }; };
  const failed = (p: Proposal) => codeGates(p, m).filter(g => !g.pass).map(g => g.gate);

  test("a planted '+1 tier' reward fails reward-coherence (fixable) and caps the stub judge's value and specificity", () => {
    const p = plant(q => { q.reward = { what: "+1 tier", resource: "r1", amount: 1, grantOn: "REWARD_VERIFIED" }; q.offer.body = "Play a 15-second game to get +1 tier."; });
    const gates = codeGates(p, m);
    const rc = gates.find(g => g.gate === "reward-coherence")!;
    assert.equal(rc.pass, false);
    assert.equal(rc.severity, "fixable");
    assert.match(rc.evidence, /entitlement/);
    const scores = stubJudge(p, m, gates).scores;
    assert.ok(scores.find(s => s.criterion === "value-moment-fit")!.score <= 2);
    assert.ok(scores.find(s => s.criterion === "specificity")!.score <= 2);
  });

  test("'+1 Plus Membership' in the copy fails even without an amount; a time box on the entitlement passes", () => {
    assert.ok(failed(plant(q => { q.offer.title = "Get +1 Plus Membership"; })).includes("reward-coherence"));
    assert.ok(!failed(plant(q => { q.reward = { what: "30 minutes of Deep reasoning", resource: "r1", duration: "30 minutes", grantOn: "REWARD_VERIFIED" }; })).includes("reward-coherence"));
    assert.ok(failed(plant(q => { q.reward = { what: "Plus", resource: "r1", grantOn: "REWARD_VERIFIED" }; })).includes("reward-coherence"), "no duration and no use count");
  });

  test("an account, an account-only feature, or skipping sign-up for an ad fails not-for-account-wall", () => {
    assert.ok(failed(plant(q => { q.reward = { what: "A free account for today", resource: "r2", duration: "today", grantOn: "REWARD_VERIFIED" }; })).includes("not-for-account-wall"));
    assert.ok(failed(plant(q => { q.reward = { what: "Save favorite messages without an account today", duration: "today", grantOn: "REWARD_VERIFIED" }; })).includes("not-for-account-wall"));
    const onSheet = plant(q => {
      q.surface = "s04"; q.anchor.moments = ["m1"];
      q.patch.newElements = [{ id: "ne1", in: "s04", near: "e3", place: "after", change: "Button" }];
      q.patch.newEdges = [{ from: "s04", el: "ne1", to: "rwd", effects: [] }];
      q.offer.body = "Watch a 15-second video to continue as a guest without an account.";
    });
    assert.ok(failed(onSheet).includes("not-for-account-wall"));
  });

  test("a reward in a consumable unit never counts as an account-only feature, whatever words they share", () => {
    // Luzia-like: guests are capped on free messages, and saving favorite messages needs an account.
    const mq: ProductModel = structuredClone(m);
    mq.economy.resources.push({ id: "rq9", name: "free messages", unit: "messages", kind: "quota", shownOn: [], observedValues: [10], conf: "observed", evidence: [] });
    assert.ok(mq.economy.walls.some(w => /favorite messages/i.test(w.blockedIntent)), "the account-only wall shares the word 'messages'");
    const p = plant(q => { q.reward = { what: "+3 messages", resource: "rq9", amount: 3, grantOn: "REWARD_VERIFIED" }; q.offer.body = "Play a 15-second game to get +3 messages."; });
    assert.ok(!codeGates(p, mq).filter(g => !g.pass).map(g => g.gate).includes("not-for-account-wall"));
    // A time-boxed session of messages names the unit, not the account feature.
    const session = plant(q => { q.reward = { what: "Up to 2 messages at no cost for 10 minutes", duration: "10 minutes", grantOn: "REWARD_VERIFIED" }; });
    assert.ok(!codeGates(session, mq).filter(g => !g.pass).map(g => g.gate).includes("not-for-account-wall"));
    // The account-only feature itself still fails.
    const q2 = plant(q => { q.reward = { what: "Save favorite messages today", duration: "today", grantOn: "REWARD_VERIFIED" }; });
    assert.ok(codeGates(q2, mq).filter(g => !g.pass).map(g => g.gate).includes("not-for-account-wall"));
  });

  test("consumable rewards are unaffected", async () => {
    const { sampleModel } = await import("./helpers/sample-model.ts");
    const sm = sampleModel();
    const c = await propose(ctx(tmpDir("ent-cons"), "deep"), sm);
    for (const p of c.proposals) assert.deepEqual(rewardCoherence(p, sm), [], p.id);
  });

  test("calibration builds entitlement positives and catches '+1 tier' in code", async () => {
    const { items, skipped } = calibrationItems(m);
    assert.deepEqual(items.filter(i => i.kind === "positive").map(i => i.id), ["pos-ent-sample", "pos-ent-decline", "pos-ent-tasks"]);
    assert.ok(items.some(i => i.id === "neg-entitlement-amount") && items.some(i => i.id === "neg-account-swap"));
    assert.ok(skipped.every(s => /^pos-(serial|music|duo|decline|tasks)$/.test(s.id)), skipped.map(s => s.id).join());
    const md = fs.readFileSync(await evalJudge(ctx(tmpDir("ent-cal")), m), "utf8");
    assert.match(md.split("\n").find(l => l.startsWith("| neg-entitlement-amount |"))!, /REVISE|REJECT/);
    assert.match(md.split("\n").find(l => l.startsWith("| neg-entitlement-amount |"))!, /reward-coherence \(code\)/);
    assert.match(md, /Negatives caught \(verdict is not SHIP\): \*\*(\d+) \/ \1\*\*/);
  });
});

// The real guest-mode model from an actual run, when present in this checkout.
const LUZIA = path.join(ROOT, "out", "luzia", "model");
describe("real entitlement-only model (out/luzia/model)", { skip: !fs.existsSync(path.join(LUZIA, "product-model.json")) && "no out/luzia/model in this checkout" }, () => {
  let m: ProductModel;
  before(() => { m = loadModel(LUZIA); });

  test("stub proposals are coherent and the stub verdicts are mixed", async () => {
    const c = ctx(tmpDir("luzia"), "deep");
    const cands = await propose({ ...c, paths: { ...c.paths, model: LUZIA } }, m);
    for (const p of cands.proposals) {
      assert.doesNotMatch(userText(p), PLUS_N_ENTITLEMENT, p.id);
      assert.deepEqual(rewardCoherence(p, m), [], p.id);
    }
    const j = await judgeAll({ ...c, paths: { ...c.paths, model: LUZIA } }, m, cands);
    const verdicts = j.final.map(f => f.verdict);
    assert.ok(verdicts.includes("SHIP"), verdicts.join());
    assert.ok(verdicts.some(v => v !== "SHIP"), `not all SHIP: ${verdicts.join()}`);
  });
});

describe("guest message cap that ends on a sign-up sheet (stub)", () => {
  // Luzia-shaped: guests get N free messages, then a "Create your account" sheet; saving favorite
  // messages needs an account. The cap is a quota wall, so a short game for a few more messages is
  // a legitimate exchange (the sign-up stays first); the account-only feature is never a reward.
  function guestCapOnSignup(): ProductModel {
    const m = structuredClone(entitlementModel());
    m.economy = { resources: [], sinks: [], sources: [], offers: [], walls: [], entitlements: m.economy.entitlements, ads: [] };
    m.edges = m.edges.map(e => {
      if (e.id === "g05" || e.id === "g06") return { ...e, effects: [{ kind: "appeared" as const, text: "Hmm, let me think." }] };
      if (e.id === "g07") return { ...e, limitHit: true, effects: [{ kind: "appeared" as const, text: "limit after 10 sends" }] };
      return e;
    });
    m.screens = m.screens.map(s => s.id === "s03"
      ? { ...s, actions: [{ id: "a03_1", kind: "consume" as const, intent: "Send a message to the assistant", priority: 2, status: "done" as const, tries: 11 }] }
      : s);
    m.economy = quotaFromLimits(m.economy, m.edges, m.screens);
    // The account-only feature next to it.
    m.economy.resources.push({ id: "r2", name: "User Account", unit: "profile", kind: "entitlement", shownOn: [], observedValues: [], conf: "observed", evidence: [] });
    m.economy.sinks.push({ id: "k2", resource: "r2", amount: 1, action: "Save favorite messages", edges: ["g10"], conf: "inferred", evidence: [] });
    m.economy.walls.push({ id: "w2", edge: "g10", resource: "r2", blockedIntent: "Save favorite messages", shows: "s06", offers: [], conf: "observed", evidence: [] });
    m.economy.derived = deriveEconomy(m.economy);
    m.regime = regimeOf(m.economy);
    m.moments = detectMoments({ screens: m.screens, edges: m.edges, economy: m.economy, flows: m.flows }, "s01");
    return m;
  }

  test("the refill at the cap ships, sized under what a view nets, named by what ran out", async () => {
    const m = guestCapOnSignup();
    const quota = m.economy.resources.find(r => r.kind === "quota")!;
    assert.equal(quota.name, "free messages");
    assert.equal(m.regime, "consumable-economy");
    const dir = tmpDir("guestcap");
    const c = ctx(dir, "deep");
    const cands = await propose(c, m);
    const j = await judgeAll(c, m, cands);
    const final = new Map(j.final.map(f => [f.proposalId, f]));
    const refill = cands.proposals.find(p => p.reward.resource === quota.id && p.surface === "s04");
    assert.ok(refill, cands.proposals.map(p => `${p.id} ${p.title}`).join(" | "));
    assert.equal(final.get(refill!.id)!.verdict, "SHIP", JSON.stringify(j.rounds.filter(r => r.proposalId === refill!.id).map(r => r.reasons)));
    assert.match(refill!.title, /when free messages run out/);
    assert.doesNotMatch(`${refill!.oneLiner} ${refill!.offer.body}`, /enough for \w+ messages?/, "no '+2 messages, enough for two messages'");
    assert.match(refill!.trigger, /\(1 message\)/);
    assert.equal(headlineOf(refill!, m).text.split(":")[0], "Out of free messages");
    // No quota reward ever trips the account gate on the shared word "messages".
    for (const r of j.rounds) {
      const p = cands.proposals.find(x => x.id === r.proposalId)!;
      if (p.reward.resource === quota.id) assert.ok(!r.gates.some(g => g.gate === "not-for-account-wall" && !g.pass), `${p.id} round ${r.round}`);
    }
    assert.ok(!cands.baseline.join(" ").includes("free free"));
  });
});
