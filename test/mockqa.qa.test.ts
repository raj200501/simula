// QA loop, offline (stub LLM => the deterministic nudge fixer): originals are spec renders, the mock
// is generated in stub mode, and one screen's fragment is perturbed (a button shifted, resized and
// re-cased) so the loop has something real to find and fix.
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { generateMock } from "../src/mock/generate.ts";
import { buildMock, fragmentFile } from "../src/mock/build.ts";
import { runQa, type QaSummary } from "../src/qa/loop.ts";
import { makeFixture, readJson, type MockQaFixture } from "./helpers/mockqa-fixture.ts";

let fx: MockQaFixture;
let summary: QaSummary;
const qa = (...p: string[]) => path.join(fx.c.paths.qa, ...p);

describe("QA loop (stub nudge fixer) + flow QA + report", () => {
  before(async () => {
    fx = await makeFixture("qa");
    await generateMock(fx.c, fx.m, fx.modelDir);
    // Perturb s02: "Start chat" 60 dp too low, 40 dp too narrow, and with the wrong label.
    const f = fragmentFile(fx.c.paths.mock, "s02");
    const html = fs.readFileSync(f, "utf8");
    const bad = html.replace(/(<button type="button" data-node="e2"[^>]*?)top:780px;width:379px;/, "$1top:840px;width:339px;").replace(">Start chat</button>", ">Begin Chat</button>");
    assert.notEqual(bad, html, "perturbation applied");
    fs.writeFileSync(f, bad);
    buildMock(fx.m, fx.modelDir, fx.c.paths.mock);
    summary = await runQa(fx.c, fx.m, fx.modelDir, {});
  });

  test("an identical screen scores >= 0.95 and stops without fix rounds", () => {
    const s01 = summary.screens.find(s => s.id === "s01")!;
    assert.ok(s01.composite !== null && s01.composite >= 0.95, `s01 composite ${s01.composite}`);
    assert.equal(s01.rounds, 0);
    assert.equal(s01.mustFix, 0);
    const m0 = readJson(qa("s01", "r0", "metrics.json"));
    assert.ok(m0.iou > 0.97 && m0.ssim > 0.97 && m0.text === 1 && m0.color > 0.97, JSON.stringify(m0));
    for (const s of summary.screens) assert.ok(s.composite! >= 0.9, `${s.id} ${s.composite}`);
  });

  test("the perturbed screen is diagnosed, then improved by the nudge fixer and kept", () => {
    const r0 = readJson(qa("s02", "r0", "metrics.json"));
    const r1 = readJson(qa("s02", "r1", "metrics.json"));
    const d0 = readJson<{ worst: { node: string; phrase: string; mustFix: boolean }[] }>(qa("s02", "r0", "diffs.json"));
    const e2 = d0.worst.find(d => d.node === "e2")!;
    assert.match(e2.phrase, /^e2: 60dp too low; 40dp too narrow; bg #[0-9A-F]{6} vs #[0-9A-F]{6}; text 'Begin Chat' vs 'Start chat'$/);
    assert.ok(e2.mustFix, "a button with the wrong text is must-fix");
    assert.ok(r0.composite < 0.95, `r0 ${r0.composite}`);
    assert.ok(r1.composite > r0.composite + 0.005, `r0 ${r0.composite} -> r1 ${r1.composite}`);
    assert.equal(r1.kept, true);
    assert.equal(r1.by, "stub");
    assert.equal(r1.mustFix, 0);
    const s02 = summary.screens.find(s => s.id === "s02")!;
    assert.equal(s02.composite, r1.composite);
    assert.equal(s02.best, "s02/best.png");
    assert.ok(fs.existsSync(qa("s02", "best.png")));
    for (const f of ["mock.png", "heat.png", "metrics.json", "diffs.json", "changelog.md"]) assert.ok(fs.existsSync(qa("s02", "r1", f)), f);
    assert.match(fs.readFileSync(qa("s02", "r1", "changelog.md"), "utf8"), /e2: moved 0,-60dp; resized to 379x52dp; text -> 'Start chat'/);
    // Keep-best wrote the fixed fragment back into the mock.
    const fixed = fs.readFileSync(fragmentFile(fx.c.paths.mock, "s02"), "utf8");
    assert.match(fixed, /improved by QA round r1/);
    assert.match(fixed, />Start chat<\/button>/);
    assert.match(fs.readFileSync(path.join(fx.c.paths.mock, "index.html"), "utf8"), />Start chat<\/button>/);
  });

  test("flow QA passes 100% on the sample model", () => {
    assert.equal(summary.flow.total, 11);
    assert.deepEqual(summary.flow.failures, []);
    assert.equal(summary.flow.passed, 11);
  });

  test("summary.json and a self-contained report.html are written", () => {
    const onDisk = readJson<QaSummary>(qa("summary.json"));
    assert.deepEqual(onDisk, summary);
    assert.equal(summary.htmlShare, 1);
    assert.equal(summary.screens.length, 6);
    const report = fs.readFileSync(qa("report.html"), "utf8");
    assert.match(report, /data:image\/jpeg;base64,/);
    assert.match(report, /11\/11/);
    assert.match(report, /s02 · Story detail/);
    assert.ok(!/<script|https?:\/\//.test(report), "no scripts, no network");
  });
});
