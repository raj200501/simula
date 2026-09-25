// The explorer end to end on an in-memory credit chat app (test/helpers/explore-fake-device.ts), offline,
// in stub mode: the drain probe must reach the wall with an inferred per-send cost although the balance
// is never shown in the chat, and the explorer must never tap Log out, the ad, or the gesture bar.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { setLlmContext } from "../src/core/llm.ts";
import { setTraceContext } from "../src/core/trace.ts";
import { load } from "../src/core/io.ts";
import { ExploreGraph } from "../src/core/schema.ts";
import { explore, latestGraphFile } from "../src/explore/explorer.ts";
import { FakeCreditChat, FAST_TIMING, H, NAV, STATUS, testCtx, tmpDir } from "./helpers/explore-fake-device.ts";

setLlmContext({ mode: "stub" });
const tmp = tmpDir();
setTraceContext({ app: "fakechat", run: "t1", stage: "explore", file: path.join(tmp, "trace.jsonl") });

const ctx = testCtx(tmp);
let fake: FakeCreditChat;
let g: ExploreGraph;
let graphFile: string;

before(async () => {
  fake = new FakeCreditChat({ balance: 120, cost: 10 });
  ({ graph: g, graphFile } = await explore(ctx, fake, { annotator: "heuristic", timing: FAST_TIMING }));
});

const stateById = (id: string) => g.states.find(s => s.id === id)!;
const actionOf = (id: string) => g.states.flatMap(s => s.actions).find(a => a.id === id)!;

test("the drain probe reaches the wall: limitHit on a consume edge, with an inferred per-send counter delta", () => {
  const wall = g.edges.find(e => e.limitHit);
  assert.ok(wall, "a limitHit edge exists");
  assert.equal(actionOf(wall.action).kind, "consume");
  assert.equal(stateById(wall.from).kind, "chat");
  assert.ok(["sheet", "dialog", "modal", "paywall"].includes(stateById(wall.to).kind), stateById(wall.to).kind);
  assert.ok(stateById(wall.to).signals.some(s => s.kind === "limit"));
  const drained = g.edges.find(e => e.action === wall.action && !e.limitHit)!;
  const inferred = drained.effects.filter(f => f.kind === "counter" && f.inferred);
  assert.ok(inferred.length >= 2, JSON.stringify(drained.effects.filter(f => f.kind === "counter")));
  for (const f of inferred) assert.equal(f.kind === "counter" && f.delta, -10);
  assert.equal(fake.balance, 0, "spent down to the wall");
  // the wall's own actions were explored afterwards: Refill leads to the store
  assert.ok(g.edges.some(e => e.from === wall.to && stateById(e.to)?.kind === "store"));
});

test("never taps Log out, the ad, or inside the status/navigation rows", () => {
  assert.equal(fake.logouts, 0);
  assert.equal(fake.adTaps, 0);
  assert.equal(fake.purchases, 0);
  assert.equal(fake.micTaps, 0);
  assert.ok(!fake.taps.some(t => t.label === "Log out" || t.label === "Sponsored" || t.label.startsWith("SkyBank")));
  assert.deepEqual(fake.taps.filter(t => t.y >= H - NAV || t.y < STATUS), []);
  // the half-hidden row was tapped on its visible half
  assert.ok(fake.taps.some(t => t.label === "More like this" && t.y < H - NAV));
  const logout = g.states.flatMap(s => s.actions).find(a => a.elKey?.includes("log out"))!;
  assert.equal(logout.status, "skipped");
});

test("a chat with a few and with many messages is one state; sends stay on it", () => {
  const chats = g.states.filter(s => s.kind === "chat");
  assert.equal(chats.length, 1, chats.map(s => s.name).join(", "));
  assert.ok(fake.maxMessages >= 20, `max messages ${fake.maxMessages}`);
  const sends = g.edges.filter(e => actionOf(e.action).kind === "consume" && !e.limitHit);
  assert.ok(sends.every(e => e.from === e.to), "consume edges are self-loops");
  assert.ok(sends.reduce((n, e) => n + e.seen, 0) >= 10);
  assert.ok(g.typed.includes("Hi! What happens next?"));
  // transcript: the replies are recorded as appeared texts on the consume edge
  assert.ok(sends[0].effects.some(f => f.kind === "appeared" && f.text.length > 30));
});

test("the billing surface is recorded as an external and escaped", () => {
  const billing = g.externals.filter(x => x.kind === "billing");
  assert.ok(billing.length >= 1);
  assert.ok(billing[0].texts.includes("$1.39"));
  assert.ok(g.edges.some(e => e.to === "ext:billing"));
  assert.equal(fake.external, null, "back in the app");
  const obsIds = g.observations.map(o => o.id);
  const after = g.observations[obsIds.indexOf(billing[0].obs) + 1];
  assert.equal(after.fg, "com.example.fakechat");
});

test("stop reason, graph.json on disk, latest pointer, screenshots and trajectory", () => {
  assert.ok(g.stopReason);
  const disk = load(ExploreGraph, graphFile);
  assert.equal(disk.stopReason, g.stopReason);
  assert.equal(latestGraphFile(ctx.paths), graphFile);
  assert.ok(disk.observations.every(o => fs.existsSync(path.join(path.dirname(graphFile), o.screenshot))));
  assert.ok(fs.existsSync(path.join(path.dirname(graphFile), "trajectory.md")));
  assert.ok(disk.states.every(s => s.annotatedBy === "heuristic"));
  assert.equal(disk.launchState, "s01");
  assert.ok(disk.resources.some(r => r.bindings.length && r.name === "credits"));
});

test("--resume after a finished run keeps the same run and a valid graph", async () => {
  const beforeSteps = g.steps;
  const beforeObs = g.observations.length;
  const again = await explore(ctx, new FakeCreditChat({ balance: 0 }), { resume: true, steps: 3, annotator: "heuristic", timing: FAST_TIMING });
  assert.equal(again.graphFile, graphFile);
  assert.equal(again.graph.runId, g.runId);
  assert.ok(again.graph.steps >= beforeSteps && again.graph.steps <= beforeSteps + 3 + 12);
  assert.ok(again.graph.observations.length > beforeObs);
  assert.ok(again.graph.states.length >= g.states.length);
  assert.ok(again.graph.stopReason);
  load(ExploreGraph, graphFile);
});

test("a device that dies ends the run with device_unhealthy after a checkpoint; --resume continues it", async () => {
  const tmp3 = tmpDir();
  const c3 = testCtx(tmp3, "ex-test-3");
  const first = await explore(c3, new FakeCreditChat({ failAfter: 80 }), { annotator: "heuristic", noConsume: true, timing: FAST_TIMING });
  assert.equal(first.graph.stopReason, "device_unhealthy");
  const saved = load(ExploreGraph, first.graphFile);
  assert.equal(saved.stopReason, "device_unhealthy");
  assert.ok(saved.steps > 0);
  const resumed = await explore(c3, new FakeCreditChat(), { resume: true, steps: 10, annotator: "heuristic", noConsume: true, timing: FAST_TIMING });
  assert.equal(resumed.graphFile, first.graphFile);
  assert.equal(resumed.graph.runId, saved.runId);
  assert.ok(resumed.graph.steps > saved.steps, `${saved.steps} -> ${resumed.graph.steps}`);
  assert.ok(resumed.graph.states.length >= saved.states.length);
  assert.notEqual(resumed.graph.stopReason, "device_unhealthy");
  assert.ok(resumed.graph.observations.slice(0, saved.observations.length).every((o, i) => o.id === saved.observations[i].id), "history kept");
});

test("the LLM annotator path in stub mode marks states annotatedBy stub; --no-consume never sends", async () => {
  const tmp2 = tmpDir();
  const f = new FakeCreditChat();
  const { graph } = await explore(testCtx(tmp2, "ex-test-2"), f, { annotator: "llm", noConsume: true, steps: 25, timing: FAST_TIMING });
  assert.ok(graph.states.length >= 2);
  assert.ok(graph.states.every(s => s.annotatedBy === "stub"));
  assert.equal(f.sends, 0);
  assert.equal(graph.stopReason, "budget_steps");
  assert.ok(!graph.states.flatMap(s => s.actions).some(a => a.kind === "consume" && a.status === "untried"));
});
