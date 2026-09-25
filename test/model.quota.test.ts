// Hidden allowances (a guest chat capped after N messages, no counter, no prices) become explicit
// economy items, and the exchange rate falls back to cost-to-serve so slides still get a number.
import { test } from "node:test";
import assert from "node:assert/strict";
import { sampleModel } from "./helpers/sample-model.ts";
import { quotaFromLimits, measuredCap } from "../src/model/quota.ts";
import { deriveEconomy, exchangeRateLine, regimeOf, ECON } from "../src/model/economics.ts";
import { sizeReward } from "../src/propose/anchors.ts";
import type { ProductModel } from "../src/core/schema.ts";

/** The sample app reshaped into a guest chat: no packs, no visible balance, capped after 5 sends. */
function guestCapModel(): ProductModel {
  const m = sampleModel();
  m.economy = { resources: [], sinks: [], sources: [], offers: [], walls: [], entitlements: [], ads: [] };
  m.edges = m.edges.map(e => {
    if (e.id === "g05" || e.id === "g06") return { ...e, effects: [{ kind: "appeared" as const, text: "The door creaks open." }] };
    if (e.id === "g07") return { ...e, effects: [{ kind: "appeared" as const, text: "limit after 5 sends" }] };
    return e;
  });
  m.screens = m.screens.map(s => s.id === "s03"
    ? { ...s, actions: [{ id: "a03_1", kind: "consume" as const, intent: "Type a short message and send it (may spend)", priority: 2, status: "done" as const, tries: 6 }] }
    : s);
  return m;
}

test("measuredCap reads the drain probe's count only from limit-hit edges", () => {
  const m = guestCapModel();
  assert.equal(measuredCap(m.edges.find(e => e.id === "g07")!), 5);
  assert.equal(measuredCap(m.edges.find(e => e.id === "g05")!), null);
});

test("a measured cap with no counter becomes a quota resource, a 1-unit sink, a free source and a wall", () => {
  const m = guestCapModel();
  const e = quotaFromLimits(m.economy, m.edges, m.screens);
  const r = e.resources.find(x => x.kind === "quota");
  assert.ok(r, "quota resource added");
  assert.equal(r!.name, "free messages");
  assert.deepEqual(r!.observedValues, [5]);
  const k = e.sinks.find(x => x.resource === r!.id)!;
  assert.equal(k.amount, 1);
  assert.equal(k.action, "Send a message");
  assert.ok(k.edges.includes("g05") && k.edges.includes("g06") && k.edges.includes("g07"), "all sends of that action are the sink's edges");
  assert.equal(e.sources.find(x => x.resource === r!.id)!.amount, 5);
  const w = e.walls.find(x => x.resource === r!.id)!;
  assert.equal(w.edge, "g07");
  assert.equal(w.shows, "s04");
  assert.equal(w.declineEdge, "g09");
  assert.equal(regimeOf(e), "consumable-economy");
});

test("a cap already explained by a visible counter is left alone", () => {
  const m = sampleModel(); // credits with counter effects on the sends
  const edges = m.edges.map(x => (x.id === "g07" ? { ...x, effects: [{ kind: "appeared" as const, text: "limit after 12 sends" }] } : x));
  const e = quotaFromLimits(m.economy, edges, m.screens);
  assert.equal(e.resources.length, m.economy.resources.length);
  assert.equal(e.sinks.length, m.economy.sinks.length);
});

test("with no prices, the exchange rate is measured at cost to serve", () => {
  const m = guestCapModel();
  m.economy = quotaFromLimits(m.economy, m.edges, m.screens);
  m.economy.derived = deriveEconomy(m.economy);
  const r = m.economy.resources.find(x => x.kind === "quota")!;
  const u = m.economy.derived.unitsPerView.find(x => x.resource === r.id)!;
  assert.equal(u.basis, "cost-to-serve");
  assert.equal(u.cogsKind, "text-cheap");
  const net = (x: number) => x * (1 - ECON.nonGameHaircut) * (1 - ECON.platformShare);
  assert.ok(Math.abs(u.min - net(ECON.grossPerViewUsd.US[0]) / ECON.cogsPerUnitUsd["text-cheap"]) < 0.05);
  assert.match(exchangeRateLine(m, r.id)!, /≈ 3\.5–5\.8 messages at cost to serve/);
  assert.match(m.economy.derived.notes.join(" "), /cost to serve/);
  // List-price basis is unchanged for apps that do sell packs.
  const priced = sampleModel();
  assert.equal(priced.economy.derived!.unitsPerView[0].basis, "list-price");
});

test("reward sizing with only a cost basis pays about the middle of the break-even range", () => {
  const m = guestCapModel();
  m.economy = quotaFromLimits(m.economy, m.edges, m.screens);
  m.economy.derived = deriveEconomy(m.economy);
  const r = m.economy.resources.find(x => x.kind === "quota")!;
  const s = sizeReward(m, r.id)!;
  assert.equal(s.amount, 4);
  assert.match(s.buys, /four messages/);
});
