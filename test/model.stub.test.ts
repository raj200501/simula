// The stub synthesis on graphs shaped like real explorer output: a sponsored card whose every child is
// flagged (plus one `ad` signal per child text, by element key), and a chat whose sends never moved a
// visible counter (the cost is only quoted by the selected mode chip) with no wall observed.
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setLlmContext } from "../src/core/llm.ts";
import { loadProfile, paths } from "../src/core/config.ts";
import type { ProductModel } from "../src/core/schema.ts";
import type { StageCtx } from "../src/core/run.ts";
import { understand } from "../src/model/understand.ts";
import { regimeOf } from "../src/model/economics.ts";
import { writeSampleGraph } from "./helpers/model-sample-graph.ts";

setLlmContext({ mode: "stub" });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "simula-model-stub-"));

function ctx(outRoot: string): StageCtx {
  return {
    app: { id: "sample", package: "web.sample", name: "SampleChat", profile: "fixture", login: "none" },
    profile: loadProfile("fixture"), paths: paths("sample", { outRoot }), runId: "t", llm: "stub", opts: {},
  };
}

describe("stub synthesis on noisy / unmeasured graphs", () => {
  let m: ProductModel;
  before(async () => {
    const { graphFile } = await writeSampleGraph(path.join(tmp, "run"), { adCard: true, unmeasured: true });
    m = (await understand(ctx(path.join(tmp, "out")), graphFile)).model;
  });

  test("one ad placement per sponsored container, whatever the explorer flagged inside it", () => {
    const home = m.screens.find(s => s.name === "Home")!;
    const container = home.elements.find(e => e.identifier === "web:id/ad_container")!;
    assert.equal(home.elements.filter(e => e.ad).length, 5);
    assert.equal(m.economy.ads.length, 1, JSON.stringify(m.economy.ads));
    const ad = m.economy.ads[0];
    assert.equal(ad.screen, home.id);
    assert.equal(ad.el, container.id);
    assert.equal(ad.format, "native");
    assert.equal(ad.evidence[0].quote, "Sponsored");
    assert.equal(ad.conf, "observed");
    // Signals given by element KEY are re-pointed at element ids of the representative observation.
    const adSignals = home.signals.filter(s => s.kind === "ad");
    assert.equal(adSignals.length, 4);
    assert.ok(adSignals.every(s => s.el && home.elements.some(e => e.id === s.el && e.ad)), JSON.stringify(adSignals));
  });

  test("an unmeasured spend still yields one sink per selected mode, grounded in the quoted price", () => {
    const k = m.economy.sinks;
    assert.deepEqual(k.map(x => [x.context, x.amount, x.resource, x.conf]).sort(), [["Basic · 10", 10, "r1", "observed"], ["Premium · 30", 30, "r1", "observed"]]);
    const premium = k.find(x => x.amount === 30)!;
    assert.ok(premium.edges.includes("g0004"));
    assert.ok(premium.edges.every(id => m.edges.find(e => e.id === id)!.context.selected.includes("Premium · 30")));
    assert.ok(k.every(x => x.evidence.some(e => e.verified && e.quote && e.quote.includes(String(x.amount)))));
  });

  test("sinks + priced packs of the same resource make a consumable economy even without a wall", () => {
    assert.equal(m.economy.walls.length, 0);
    assert.ok(m.economy.offers.some(o => o.grants.resource === "r1" && o.priceUsd));
    assert.equal(m.regime, "consumable-economy");
    assert.equal(regimeOf({ ...m.economy, sinks: m.economy.sinks.map(s => ({ ...s, resource: "r9" })) }), "no-scarcity");
    assert.ok(m.economy.derived!.actionCostUsd.length === 2);
  });

  test("flows are contiguous: every step's edge leaves the previous step's screen", () => {
    assert.ok(m.flows.some(f => f.kind === "core"));
    for (const f of m.flows) {
      for (let i = 1; i < f.steps.length; i++) {
        const e = m.edges.find(x => x.id === f.steps[i].edge)!;
        assert.ok(e, `${f.id} step ${i} has an edge`);
        assert.equal(e.from, f.steps[i - 1].screen, `${f.id} step ${i}`);
        assert.equal(e.to, f.steps[i].screen, `${f.id} step ${i}`);
      }
    }
    const core = m.flows.find(f => f.kind === "core")!;
    assert.equal(m.screens.find(s => s.id === core.steps.at(-1)!.screen)!.name, "Chat"); // no wall: the loop ends at the spend
    // open -> ... -> send (Premium) -> pick the other mode (the recorded switch) -> send (Basic)
    assert.deepEqual(core.steps.slice(-3).map(s => s.edge), ["g0004", "g0015", "g0005"]);
  });
});
