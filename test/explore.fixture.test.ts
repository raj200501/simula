// The explorer end to end on the REAL adversarial fixture app (fixtures/credit-chat) through WebDevice
// (Playwright), offline, stub mode, heuristic annotator. Unlike the in-memory fake, this is the page the
// acceptance run crawls: a daily check-in dialog over Home, the balance shown on Home only, a mode chip
// that opens a picker sheet (Basic 10 / Premium 30), Send only after typing, a 1.2 s bot reply, an
// "Out of credits" sheet, a sponsored card, store packs that open an external billing card, "Rate us"
// (external browser) and "Log out" (never to be tapped).
//
// To keep the file short, the stored balance starts at 0 (+300 from the check-in), so the drain reaches
// the wall after a dozen sends instead of thirty.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { setLlmContext } from "../src/core/llm.ts";
import { setTraceContext } from "../src/core/trace.ts";
import { load } from "../src/core/io.ts";
import { ExploreGraph, type Action, type GraphEdge } from "../src/core/schema.ts";
import { loadApp, paths } from "../src/core/config.ts";
import type { StageCtx } from "../src/core/run.ts";
import { WebDevice } from "../src/device/web.ts";
import { explore } from "../src/explore/explorer.ts";
import { testProfile, tmpDir } from "./helpers/explore-fake-device.ts";

setLlmContext({ mode: "stub" });
const tmp = tmpDir("simula-explore-fixture-");
setTraceContext({ app: "fixture", run: "t-fixture", stage: "explore", file: path.join(tmp, "trace.jsonl") });

const app = loadApp("fixture");
const ctx: StageCtx = {
  app, paths: paths(app.id, { outRoot: tmp }), runId: "ex-fixture-test", llm: "stub", opts: {},
  profile: testProfile({ crawlSteps: 70, saturation: 20, minutes: 4, drainMax: 30 }),
};
// a local page answers fast; the reply still takes the fixture's 1.2 s, so contentMinMs stays above it
const TIMING = { pollMs: 60, settleMaxMs: 1500, contentPollMs: 200, contentMinMs: 1600, contentMaxMs: 6000, clearMaxMs: 800 };

let dev: WebDevice;
let g: ExploreGraph;
let graphFile: string;
let ms = 0;
let audit: { logouts: number; adTaps: number; purchasesAttempted: number };
let finalState: { balance: number };

before(async () => {
  dev = await WebDevice.open({ url: app.webUrl!, appPackage: app.package, resetState: true });
  // a fresh account with an empty balance whose daily check-in has not been shown yet
  await dev.page.evaluate(`localStorage.setItem("creditchat.state.v1", JSON.stringify({ balance: 0, mode: "basic", checkinDay: null, notifications: true, chats: {} }))`);
  await dev.page.reload();
  const t0 = Date.now();
  ({ graph: g, graphFile } = await explore(ctx, dev, { annotator: "heuristic", timing: TIMING }));
  ms = Date.now() - t0;
  audit = (await dev.page.evaluate("window.__fixture.audit()")) as typeof audit;
  finalState = (await dev.page.evaluate("window.__fixture.state()")) as typeof finalState;
});

after(async () => {
  await dev?.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

const stateOf = (id: string) => g.states.find(s => s.id === id)!;
const actionOf = (e: GraphEdge): Action => stateOf(e.from).actions.find(a => a.id === e.action)!;
const counters = (e: GraphEdge) => e.effects.filter((f): f is Extract<typeof f, { kind: "counter" }> => f.kind === "counter");

test("1. the drain reaches the real Out of credits sheet: that consume edge is the only limitHit edge", () => {
  const walls = g.edges.filter(e => e.limitHit);
  assert.equal(walls.length, 1, walls.map(e => `${e.id} ${e.from}->${e.to}`).join(", "));
  const wall = walls[0];
  assert.equal(actionOf(wall).kind, "consume");
  assert.equal(stateOf(wall.from).kind, "chat");
  const sheet = stateOf(wall.to);
  assert.equal(sheet.kind, "sheet");
  assert.equal(sheet.name, "Out of credits");
  assert.ok(sheet.signals.some(s => s.kind === "limit" && /out of credits/i.test(s.text)));
  assert.ok(finalState.balance < 30, `spent down to the wall (balance ${finalState.balance})`);
  // the wall's own actions were explored afterwards: Refill now leads to the store
  assert.ok(g.edges.some(e => e.from === wall.to && stateOf(e.to)?.kind === "store"), "refill -> store");
});

test("2. per-send costs for both modes, inferred from Home, told apart by context.selected", () => {
  const byMode = new Map<string, number[]>();
  for (const e of g.edges.filter(x => actionOf(x).kind === "consume" && !x.limitHit)) {
    for (const f of counters(e)) byMode.set(e.context.selected.join(" / "), [...(byMode.get(e.context.selected.join(" / ")) ?? []), f.delta]);
    assert.ok(counters(e).every(f => f.inferred), "the chat never shows the balance: every send cost is back-filled");
  }
  const basic = [...byMode].find(([k]) => /Basic · 10/.test(k));
  const premium = [...byMode].find(([k]) => /Premium · 30/.test(k));
  assert.ok(basic && premium, JSON.stringify([...byMode]));
  assert.ok(basic[1].every(d => d === -10), `basic ${basic[1]}`);
  assert.ok(premium[1].every(d => d === -30), `premium ${premium[1]}`);
  // one chat state: the mode is selection context, not identity
  assert.equal(g.states.filter(s => s.kind === "chat").length, 1, g.states.map(s => `${s.id}:${s.kind}`).join(" "));
});

test("3. never taps Log out or the ad; billing and Rate us are recorded as externals and escaped", () => {
  assert.equal(audit.logouts, 0);
  assert.equal(audit.adTaps, 0);
  assert.equal(audit.purchasesAttempted, 0);
  const logout = g.states.flatMap(s => s.actions).filter(a => /log out/i.test(a.intent));
  assert.ok(logout.length >= 1);
  for (const a of logout) { assert.equal(a.status, "skipped"); assert.match(a.skip ?? "", /^guard: destructive/); }
  const adSignals = g.states.map(s => s.signals.filter(x => x.kind === "ad").length);
  assert.ok(adSignals.some(n => n > 0) && adSignals.every(n => n <= 1), `one ad signal per ad unit: ${adSignals}`);
  const billing = g.edges.filter(e => e.to === "ext:billing");
  assert.ok(billing.length >= 1);
  assert.ok(g.externals.some(x => x.kind === "billing" && x.texts.some(t => /\$\d/.test(t))), "billing prices recorded");
  const rate = g.edges.find(e => e.to === "ext:browser");
  assert.ok(rate && /rate us/i.test(actionOf(rate).intent), "Rate us -> ext:browser");
  // every external visit was escaped: the next observation is back in the app
  for (const x of g.externals) {
    const i = g.observations.findIndex(o => o.id === x.obs);
    assert.equal(g.observations[i + 1]?.fg, app.package, `escaped ext:${x.kind}`);
  }
});

test("4. the daily check-in claim is a +300 counter effect from the check-in dialog", () => {
  const claim = g.edges.find(e => counters(e).some(f => f.delta === 300));
  assert.ok(claim, "a +300 counter effect");
  assert.ok(["dialog", "modal", "sheet"].includes(stateOf(claim.from).kind), stateOf(claim.from).kind);
  assert.match(actionOf(claim).intent, /claim/i);
  assert.equal(g.launchState, claim.from, "the dialog greeted the first launch");
});

test("5. walls only where BUILD_SPEC T2 says: mode switches and the picker are never walls", () => {
  const chat = g.states.find(s => s.kind === "chat")!;
  const picker = g.states.find(s => s.kind === "sheet" && s.name === "Choose a mode");
  assert.ok(picker, "the mode picker is its own state");
  assert.ok(g.edges.some(e => e.from === chat.id && e.to === picker.id), "the chip opens the picker");
  const choices = g.edges.filter(e => e.from === picker.id && e.to === chat.id);
  assert.ok(choices.length >= 2, "both modes were picked");
  assert.ok(!choices.some(e => e.limitHit));
  const sends = g.edges.filter(e => actionOf(e).kind === "consume" && !e.limitHit);
  assert.ok(sends.every(e => e.from === chat.id && e.to === chat.id), "sends stay on the chat");
  assert.ok(sends.reduce((n, e) => n + e.seen, 0) >= 8);
});

test("6. stop reason, a valid graph.json on disk, and a bounded run", () => {
  assert.ok(g.stopReason);
  const disk = load(ExploreGraph, graphFile);
  assert.equal(disk.stopReason, g.stopReason);
  assert.equal(disk.edges.length, g.edges.length);
  assert.ok(disk.observations.every(o => fs.existsSync(path.join(path.dirname(graphFile), o.screenshot))));
  assert.ok(ms < 5 * 60_000, `${Math.round(ms / 1000)} s`);
});
