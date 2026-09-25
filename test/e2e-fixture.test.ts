// The whole pipeline on the fixture app (fixtures/credit-chat), offline and in stub mode, exactly as
// `npm run demo` runs it: explore (real WebDevice + explorer) -> understand -> mock -> qa -> propose ->
// judge -> slides -> report, each through the same stage runner the CLI uses, into a temp out-root.
// It checks the things the recording depends on: the explorer reaches the out-of-credits wall, never
// logs out or taps the ad, records the billing sheet; the model is a consumable economy with its packs
// and sinks; flow QA passes; the judge ships something; the deck and the report exist.
import { before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadApp, loadProfile, paths } from "../src/core/config.ts";
import { load } from "../src/core/io.ts";
import { stage, type StageCtx } from "../src/core/run.ts";
import { Candidates, Judgments, Proposal, type ExploreGraph, type ProductModel } from "../src/core/schema.ts";
import { WebDevice } from "../src/device/web.ts";
import { explore } from "../src/explore/explorer.ts";
import { understand } from "../src/model/understand.ts";
import { generateMock } from "../src/mock/generate.ts";
import { runQa, type QaSummary } from "../src/qa/loop.ts";
import { propose } from "../src/propose/propose.ts";
import { judgeAll } from "../src/judge/judge.ts";
import { buildSlides } from "../src/slides/slides.ts";
import { buildReport } from "../src/report/report.ts";

const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "simula-e2e-"));
const app = loadApp("fixture");
const base: Omit<StageCtx, "runId"> = { app, profile: loadProfile(app.profile), paths: paths(app.id, { outRoot }), llm: "stub", opts: {} };
// The fixture answers in ~1.2 s and runs locally: shorter waits than a phone needs keep the test fast.
const TIMING = { pollMs: 120, settleMaxMs: 1500, contentPollMs: 300, contentMinMs: 1500, contentMaxMs: 6000, clearMaxMs: 800 };

let g: ExploreGraph;
let audit: { logouts: number; adTaps: number; purchasesAttempted: number } | null = null;
let m: ProductModel;
let qa: QaSummary;
let cands: Candidates;
let j: Judgments;
let deck: { deckHtml: string; pdf: string };
let reportFile: string;

before(async () => {
  await stage("explore", base, [], async c => {
    const dev = await WebDevice.open({ url: app.webUrl!, appPackage: app.package, resetState: true });
    try {
      const r = await explore(c, dev, { annotator: "heuristic", timing: TIMING });
      g = r.graph;
      // The fixture keeps an audit of what an explorer must never do (log out, tap an ad).
      audit = await dev.page.evaluate(() => {
        const w = window as unknown as { __fixture?: { audit?: () => unknown } };
        return (w.__fixture?.audit ? w.__fixture.audit() : null) as never;
      });
      return { outputs: [r.graphFile] };
    } finally {
      await dev.close();
    }
  });
  await stage("understand", base, [], async c => {
    const graphFile = fs.readdirSync(c.paths.explore).map(d => path.join(c.paths.explore, d, "graph.json")).filter(f => fs.existsSync(f)).sort().at(-1)!;
    m = (await understand(c, graphFile)).model;
    return { outputs: [] };
  });
  await stage("mock", base, [], async c => { await generateMock(c, m, c.paths.model); return { outputs: [] }; });
  await stage("qa", base, [], async c => { qa = await runQa(c, m, c.paths.model, { rounds: 1 }); return { outputs: [] }; });
  await stage("propose", base, [], async c => { cands = await propose(c, m); return { outputs: [] }; });
  await stage("judge", base, [], async c => {
    j = await judgeAll(c, m, cands);
    cands = load(Candidates, path.join(c.paths.proposals, "candidates.json")); // revisions are appended there
    return { outputs: [] };
  });
  await stage("slides", base, [], async c => { deck = await buildSlides(c, m, c.paths.model, cands, j); return { outputs: [] }; });
  reportFile = await buildReport(["fixture"], outRoot);
}, { timeout: 8 * 60_000 });

const actionById = (id: string) => g.states.flatMap(s => s.actions).find(a => a.id === id);
const labelOf = (e: { text?: string; label?: string }) => e.text || e.label || "";

test("explore: the drain probe reaches the out-of-credits wall (a limitHit consume edge)", () => {
  const wall = g.edges.find(e => e.limitHit && !e.to.startsWith("ext:"));
  assert.ok(wall, "a limitHit edge exists: the explorer spent the balance down to the wall");
  const a = actionById(wall.action);
  assert.ok(a && (a.kind === "consume" || a.kind === "type-send"), `the wall edge is a spend (${a?.kind})`);
  assert.ok(g.states.find(s => s.id === wall.to)?.signals.some(x => x.kind === "limit" || x.kind === "upsell"), "the wall screen carries a limit / upsell signal");
});

test("explore: Log out is never tapped", () => {
  const logout = g.states.flatMap(s => s.actions).filter(a => /log ?out|sign ?out/i.test(a.intent));
  assert.ok(logout.length >= 1, "the Log out control was seen");
  for (const a of logout) assert.notEqual(a.status, "done", `${a.id} ${a.intent}: ${a.status}`);
  assert.ok(!g.edges.some(e => logout.some(a => a.id === e.action)), "no edge follows a Log out action");
  if (audit) assert.equal(audit.logouts, 0, "the fixture recorded no logout");
});

test("explore: the ad is never tapped", () => {
  const obs = new Map(g.observations.map(o => [o.id, o]));
  const tappedAds = g.edges.flatMap(e => {
    const a = actionById(e.action);
    const el = a?.elKey ? obs.get(e.obsBefore)?.elements.find(k => k.key === a.elKey) : undefined;
    return el?.ad ? [`${e.id} ${labelOf(el)}`] : [];
  });
  assert.deepEqual(tappedAds, []);
  assert.ok(g.observations.some(o => o.elements.some(e => e.ad)), "the sponsored card was seen and flagged as an ad");
  if (audit) assert.equal(audit.adTaps, 0, "the fixture recorded no ad tap");
});

test("explore: the billing sheet is recorded as an external surface (ext:billing)", () => {
  assert.ok(g.externals.some(x => x.kind === "billing"), g.externals.map(x => x.kind).join(", "));
  assert.ok(g.edges.some(e => e.to === "ext:billing"));
});

test("understand: consumable economy with 3 priced packs and at least 2 sinks, named for people", () => {
  assert.equal(m.regime, "consumable-economy");
  const priced = m.economy.offers.filter(o => o.priceUsd != null);
  assert.equal(priced.length, 3, priced.map(o => `${o.label} ${o.priceText}`).join(" | "));
  assert.ok(m.economy.sinks.length >= 2, `${m.economy.sinks.length} sinks`);
  for (const k of m.economy.sinks) assert.doesNotMatch(k.action, /\(|may spend|type a short/i, `sink action is user-facing: "${k.action}"`);
  assert.ok(m.economy.walls.length >= 1, "the wall is in the economy");
});

test("qa: every flow edge replays on the mock (flow QA 100%)", () => {
  assert.ok(qa.flow.total > 0);
  assert.equal(qa.flow.passed, qa.flow.total, JSON.stringify(qa.flow.failures.slice(0, 5)));
});

test("propose: candidates are schema-valid and every id they cite exists", () => {
  const onDisk = load(Candidates, path.join(base.paths.proposals, "candidates.json"));
  assert.ok(onDisk.proposals.length >= 1);
  const screens = new Set(m.screens.map(s => s.id)), moments = new Set(m.moments.map(x => x.id));
  for (const p of onDisk.proposals) {
    Proposal.parse(p);
    const declared = new Set([...screens, ...p.patch.newScreens.map(s => s.id)]);
    assert.ok(declared.has(p.surface), `${p.id} surface ${p.surface}`);
    for (const id of p.anchor.moments) assert.ok(moments.has(id), `${p.id} moment ${id}`);
    assert.equal(p.storyboard.map(b => b.phase).join(","), "today,change,offer,ad,value", p.id);
  }
});

test("judge: at least one proposal ships", () => {
  const ships = j.final.filter(f => f.verdict === "SHIP");
  assert.ok(ships.length >= 1, j.final.map(f => `${f.proposalId}:${f.verdict}`).join(" "));
});

test("slides + report: deck.pdf, the flow PNGs and out/index.html exist", () => {
  assert.ok(fs.existsSync(deck.pdf) && fs.statSync(deck.pdf).size > 10_000, deck.pdf);
  const pngs = fs.readdirSync(path.join(base.paths.slides, "png"));
  assert.ok(pngs.some(f => /flow-P\d+\.png$/.test(f)), pngs.join(", "));
  assert.equal(reportFile, path.join(outRoot, "index.html"));
  assert.ok(fs.existsSync(reportFile));
  // The numbers card: every figure a recording needs, read from the artifacts.
  const numbers = fs.readFileSync(path.join(outRoot, "fixture", "NUMBERS.md"), "utf8");
  assert.match(numbers, /\d+ screens, \d+ transitions/);
  assert.match(numbers, /\d+ SHIP \/ \d+ REVISE \/ \d+ REJECT/);
  assert.match(numbers, /Exchange rate: \*\*1 completed US view/);
  assert.match(numbers, /Flow QA: \*\*\d+ \/ \d+\*\*/);
  assert.match(fs.readFileSync(reportFile, "utf8"), /fixture\/NUMBERS\.md/);
  // The GitHub-rendered gallery: shipped flow slides and QA side-by-sides, relative paths only.
  const gallery = fs.readFileSync(path.join(outRoot, "README.md"), "utf8");
  assert.match(gallery, /### Shipped flows[\s\S]*!\[P\d+: [^\]]+\]\(fixture\/slides\/png\/\d+-flow-P\d+\.png\)/);
  assert.match(gallery, /<img src="fixture\/qa\/s\d+\/original\.png"/);
  // The lead flow as an animated GIF, embedded in the gallery.
  const gifs = fs.readdirSync(base.paths.slides).filter(f => /^flow-P\d+\.gif$/.test(f));
  assert.equal(gifs.length, 1, gifs.join(", "));
  const gifBytes = fs.readFileSync(path.join(base.paths.slides, gifs[0]));
  assert.equal(gifBytes.subarray(0, 6).toString("latin1"), "GIF89a");
  assert.ok(gifBytes.length > 50_000 && gifBytes.length < 3_000_000, String(gifBytes.length));
  assert.match(gallery, new RegExp(`<img src="fixture/slides/${gifs[0]}"`));
  const html = fs.readFileSync(deck.deckHtml, "utf8");
  assert.doesNotMatch(html, /may spend|type a short message/i, "no explorer wording on the slides");
});
