// understand end to end, offline (stub LLM): synthetic explore graph -> product model directory.
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { setLlmContext } from "../src/core/llm.ts";
import { loadProfile, paths } from "../src/core/config.ts";
import { load } from "../src/core/io.ts";
import { ProductModel } from "../src/core/schema.ts";
import type { StageCtx } from "../src/core/run.ts";
import { loadModel, understand } from "../src/model/understand.ts";
import { compile } from "../src/model/compile.ts";
import { buildFlows } from "../src/model/flows.ts";
import { graphText, synthesize } from "../src/model/synthesize.ts";
import { D, EMAIL_RECT_DP, PURPLE, writeSampleGraph } from "./helpers/model-sample-graph.ts";

setLlmContext({ mode: "stub" });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "simula-model-test-"));

function ctx(outRoot: string): StageCtx {
  return {
    app: { id: "sample", package: "web.sample", name: "SampleChat", profile: "fixture", login: "none" },
    profile: loadProfile("fixture"), paths: paths("sample", { outRoot }), runId: "t", llm: "stub", opts: {},
  };
}

describe("understand (stub synthesis)", () => {
  let m: ProductModel;
  let modelDir: string;
  let graphFile: string;
  before(async () => {
    ({ graphFile } = await writeSampleGraph(path.join(tmp, "run")));
    const c = ctx(path.join(tmp, "out"));
    modelDir = c.paths.model;
    const r = await understand(c, graphFile);
    m = r.model;
    assert.equal(r.modelFile, path.join(modelDir, "product-model.json"));
  });

  test("writes a schema-valid model, digest and self-contained viewer", () => {
    const onDisk = load(ProductModel, path.join(modelDir, "product-model.json"));
    assert.equal(onDisk.schema, "simula.product-model/1");
    assert.equal(m.provenance.synthesizedBy, "stub");
    assert.ok(fs.readFileSync(path.join(modelDir, "digest.md"), "utf8").includes("EXCHANGE RATE"));
    const viewer = fs.readFileSync(path.join(modelDir, "viewer.html"), "utf8");
    assert.ok(viewer.includes("<h2>Economy</h2>") && viewer.includes("screens/s01.png"));
    assert.ok(!/fetch\(/.test(viewer), "viewer must not fetch");
    for (const s of m.screens) assert.ok(fs.existsSync(path.join(modelDir, s.screenshot)), s.screenshot);
  });

  test("maps states to s01.. by first appearance and picks a representative", () => {
    assert.deepEqual(m.screens.map(s => s.name), ["Daily check-in", "Home", "Story detail", "Chat", "Out of credits", "Store", "Profile"]);
    const chat = m.screens.find(s => s.name === "Chat")!;
    assert.equal(chat.representative, "o0005"); // most elements among unscrolled observations
    assert.deepEqual(chat.elements.find(e => e.text === "Send")!.rectDp, { x: 304, y: 740, w: 40, h: 44 });
  });

  test("economy: regime, sinks per mode, daily source, three priced packs, a wall, ads", () => {
    const e = m.economy;
    assert.equal(m.regime, "consumable-economy");
    const premium = e.sinks.find(k => k.context === "Premium · 30")!;
    assert.equal(premium.amount, 30);
    assert.equal(premium.resource, "r1");
    assert.equal(premium.conf, "observed");
    assert.equal(e.sinks.find(k => k.context === "Basic · 10")!.amount, 10);
    const daily = e.sources.find(s => s.cadence === "daily")!;
    assert.equal(daily.amount, 300);
    assert.ok(e.sources.some(s => s.cadence === "purchase"));
    assert.equal(e.offers.length, 3, JSON.stringify(e.offers.map(o => o.label))); // the billing sheet's pack is merged, not duplicated
    assert.deepEqual(e.offers.map(o => [o.priceUsd, o.grants.amount, o.grants.resource]), [[1.39, 1000, "r1"], [2.89, 2000, "r1"], [7.09, 5000, "r1"]]);
    assert.ok(e.offers.every(o => o.kind === "pack" && o.conf === "observed"));
    const sheet = m.screens.find(s => s.name === "Out of credits")!;
    assert.equal(e.walls.length, 1);
    const w = e.walls[0];
    assert.equal(w.shows, sheet.id);
    assert.deepEqual(w.offers, e.offers.map(o => o.id));
    assert.equal(m.edges.find(g => g.id === w.declineEdge)?.el, sheet.elements.find(x => x.text === "Not now")!.id);
    assert.deepEqual(e.ads.map(a => [a.format, m.screens.find(s => s.id === a.screen)!.name]), [["native", "Home"]]);
    assert.ok(e.derived!.unitsPerView.some(u => u.resource === "r1" && u.min > 0 && u.max >= u.min));
    assert.equal(m.provenance.inferredClaims, 0);
  });

  test("transitions: tab, sheet, dismissal back, self-loop replace, external", () => {
    const t = (id: string) => m.edges.find(e => e.id === id)!.transition;
    assert.equal(t("g0011"), "tab");
    assert.equal(t("g0006"), "sheet");
    assert.equal(t("g0008"), "back"); // "Not now" returns to the sheet's parent
    assert.equal(t("g0001"), "back"); // claiming the launch modal dismisses it onto Home
    assert.equal(t("g0004"), "replace");
    assert.equal(t("g0009"), "external");
    assert.equal(t("g0002"), "push");
    assert.equal(m.screens.find(s => s.name === "Out of credits")!.parent, m.screens.find(s => s.name === "Chat")!.id);
    const billing = m.externals.find(x => x.id === "ext:billing")!;
    assert.equal(billing.screenshot, "screens/ext-billing.png"); // found by file convention
  });

  test("flows: the core flow follows the real spend path through the wall to the store", () => {
    const core = m.flows.find(f => f.kind === "core")!;
    const names = core.steps.map(s => m.screens.find(x => x.id === s.screen)!.name);
    assert.deepEqual(names, ["Daily check-in", "Home", "Story detail", "Chat", "Chat", "Chat", "Out of credits", "Store"]);
    assert.ok(core.steps.some(s => s.edge === "g0006"));
    assert.ok(m.flows.some(f => f.kind === "monetization" && f.steps.at(-1)!.screen === m.screens.find(s => s.kind === "store")!.id));
    assert.ok(m.flows.some(f => f.kind === "secondary" && f.name.includes("Profile")));
  });

  test("moments: wall, decline, desire, post-reward, hub, and first-value without offers", () => {
    const types = new Set(m.moments.map(x => x.type));
    for (const t of ["wall", "decline", "desire", "post-reward", "hub", "first-value"]) assert.ok(types.has(t as never), t);
    const fv = m.moments.find(x => x.type === "first-value")!;
    assert.equal(fv.noOffer, true);
    assert.equal(m.screens.find(s => s.id === fv.screen)!.name, "Home");
    assert.equal(m.moments.find(x => x.type === "wall")!.reach, "core-loop");
  });

  test("design tokens, roles, asset crops", async () => {
    const checkin = m.screens.find(s => s.name === "Daily check-in")!;
    const claim = checkin.elements.find(e => e.text === "Claim")!;
    assert.equal(claim.role, "button");
    assert.equal(claim.style?.bg, PURPLE);
    assert.equal(claim.style?.fg, "#FFFFFF");
    const home = m.screens.find(s => s.name === "Home")!;
    assert.deepEqual(home.elements.filter(e => e.role === "tab").map(e => e.text), ["Home", "Store", "Profile"]);
    assert.equal(home.elements.find(e => e.text === "750 credits")!.role, "counter");
    assert.deepEqual(home.bindings, [{ resource: "r1", el: home.elements.find(e => e.text === "750 credits")!.id }]);
    assert.ok(m.design.palette.some(p => p.hex === "#FFFFFF" || p.hex === "#FEFEFE"));
    assert.ok(m.design.typeScaleDp.length > 0);
    const avatar = home.elements.find(e => e.label === "Author avatar")!;
    assert.equal(avatar.role, "image");
    const asset = m.design.assets.find(a => a.id === avatar.asset)!;
    assert.equal(asset.kind, "avatar");
    const meta = await sharp(path.join(modelDir, asset.file)).metadata();
    assert.deepEqual([meta.width, meta.height], [56 * D, 56 * D]);
  });

  test("PII: the email is masked in text and blurred in the copied screenshot", async () => {
    const profile = m.screens.find(s => s.name === "Profile")!;
    assert.ok(profile.elements.some(e => e.text === "[email]"));
    assert.ok(!JSON.stringify(m).includes("jane.doe@example.com"));
    const r = { left: EMAIL_RECT_DP.x * D, top: EMAIL_RECT_DP.y * D, width: EMAIL_RECT_DP.w * D, height: EMAIL_RECT_DP.h * D };
    const orig = await sharp(path.join(tmp, "run", "obs", "o0009.png")).extract(r).removeAlpha().raw().toBuffer();
    const copy = await sharp(path.join(modelDir, profile.screenshot)).extract(r).removeAlpha().raw().toBuffer();
    let diff = 0;
    for (let i = 0; i < orig.length; i++) diff += Math.abs(orig[i] - copy[i]);
    assert.ok(diff / orig.length > 10, `mean pixel change ${diff / orig.length}`);
  });

  test("render, variants, transcripts, coverage.notExplored", () => {
    assert.ok(m.screens.filter(s => s.render === "html").length <= loadProfile("fixture").htmlScreens);
    const chat = m.screens.find(s => s.name === "Chat")!;
    assert.equal(chat.render, "html");
    assert.ok(chat.variants.length >= 1 && chat.variants.length <= 3);
    assert.match(chat.variants[0].note, /selected: Basic · 10/);
    assert.ok(fs.existsSync(path.join(modelDir, chat.variants[0].screenshot)));
    assert.deepEqual(m.transcripts, [{ screen: chat.id, turns: [{ role: "user", text: "Hi! What happens next?" }, { role: "app", text: "The door creaks open." }] }]);
    const why = Object.fromEntries(m.coverage.notExplored.map(n => [n.intent, n.why]));
    assert.equal(why["Log out"], "guard: destructive");
    assert.equal(why["Terms"], "travel failed twice");
    assert.ok("Sponsored card" in why);
    assert.equal(m.coverage.stopReason, "frontier_empty");
    assert.equal(m.coverage.minutes, 4.5);
  });

  test("synthesis prompt is replay-safe: no paths, run ids or timestamps", async () => {
    const cm = await compile(load((await import("../src/core/schema.ts")).ExploreGraph, graphFile), path.dirname(graphFile), path.join(tmp, "prompt-model"));
    const p = graphText(cm, []);
    assert.ok(!p.includes(tmp) && !p.includes("r0925-100000") && !/\d{4}-\d{2}-\d{2}T\d{2}:/.test(p));
    assert.ok(p.includes('"1,000 credits $1.39"') && p.includes("LIMIT HIT"));
  });

  test("a replay miss falls back to the stub synthesis instead of failing the stage", async () => {
    const cm = await compile(load((await import("../src/core/schema.ts")).ExploreGraph, graphFile), path.dirname(graphFile), path.join(tmp, "replay-model"));
    setLlmContext({ mode: "replay" });
    try {
      const flows = buildFlows({ screens: cm.screens, edges: cm.edges, launch: cm.launch, actionOf: cm.actionOf, resourceName: id => id }, []);
      const d = await synthesize(cm, flows);
      assert.equal(d.by, "stub");
      assert.equal(d.economy.offers.length, 3);
    } finally {
      setLlmContext({ mode: "stub" });
    }
  });
});

describe("overrides.json", () => {
  test("merge by id on load and on understand, re-derive economics, record human notes once", async () => {
    const { graphFile } = await writeSampleGraph(path.join(tmp, "run2"));
    const c = ctx(path.join(tmp, "out2"));
    const { model: before } = await understand(c, graphFile);
    const k1 = before.economy.sinks.find(k => k.id === "k1")!;
    fs.writeFileSync(path.join(c.paths.model, "overrides.json"), JSON.stringify({
      screens: { s04: { name: "Story chat" } },
      economy: { sinks: { k1: { amount: 90 } }, ads: { "s02/e6": null } },
    }));
    const m = loadModel(c.paths.model);
    assert.equal(m.screens.find(s => s.id === "s04")!.name, "Story chat");
    assert.equal(m.economy.sinks.find(k => k.id === "k1")!.amount, 90);
    assert.equal(m.economy.ads.length, 0);
    const cost = m.economy.derived!.actionCostUsd.find(a => a.sink === "k1")!;
    assert.ok(Math.abs(cost.min - (before.economy.derived!.actionCostUsd.find(a => a.sink === "k1")!.min * 90) / k1.amount) < 1e-3, "derived numbers follow the override");
    assert.equal(m.human.length, 3);
    assert.ok(m.human.every(h => h.note.startsWith("override (overrides.json):")));
    // Re-running understand bakes the overrides in; loading again does not duplicate the notes.
    const { model: again } = await understand(c, graphFile);
    assert.equal(again.economy.sinks.find(k => k.id === "k1")!.amount, 90);
    assert.equal(loadModel(c.paths.model).human.length, 3);
  });

  test("an override that breaks the schema is rejected loudly", async () => {
    const c = ctx(path.join(tmp, "out2"));
    fs.writeFileSync(path.join(c.paths.model, "overrides.json"), JSON.stringify({ regime: "free-for-all" }));
    assert.throws(() => loadModel(c.paths.model));
    fs.rmSync(path.join(c.paths.model, "overrides.json"));
  });
});
