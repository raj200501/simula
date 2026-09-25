// buildReport over a synthetic out/ root (one complete app, one blocked app, one not run) and the
// tiny Markdown renderer it uses for candidates / judgments / judge eval / trajectory.
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { paths } from "../src/core/config.ts";
import { save } from "../src/core/io.ts";
import { Candidates, Judgments } from "../src/core/schema.ts";
import { setTraceContext, trace } from "../src/core/trace.ts";
import { buildReport } from "../src/report/report.ts";
import { renderMarkdown } from "../src/report/markdown.ts";
import { rollupCost } from "../src/report/data.ts";
import { sampleCandidates, sampleJudgments, writeModelDir } from "./helpers/slidesreport-fixtures.ts";

describe("buildReport", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "simula-report-test-"));
  let html = "";

  before(async () => {
    const p = paths("sample", { outRoot: root });
    await writeModelDir(p.model);
    fs.writeFileSync(path.join(p.model, "viewer.html"), "<!doctype html><title>viewer</title>");
    save(Candidates, path.join(p.proposals, "candidates.json"), sampleCandidates());
    save(Judgments, path.join(p.proposals, "judgments.json"), sampleJudgments());
    fs.writeFileSync(path.join(p.proposals, "candidates.md"), "# Candidates\n\n| id | title |\n|---|---|\n| P1 | Refill by play |\n\n- **baseline**: banner <script>x</script>\n");
    fs.writeFileSync(path.join(p.proposals, "judgments.md"), "# Judgments\n\nP1 **SHIP** 4.10\n");
    fs.writeFileSync(path.join(p.proposals, "judge-eval.md"), "# Judge eval\n\n| negative | caught by |\n|---|---|\n| no decline button | code |\n");
    fs.mkdirSync(p.qa, { recursive: true });
    fs.writeFileSync(path.join(p.qa, "summary.json"), JSON.stringify({
      screens: [{ id: "s01", name: "Home", render: "html", composite: 0.9, rounds: 2, mustFix: 0, best: "r2" }, { id: "s02", name: "Story", render: "html", composite: 0.8, rounds: 1, mustFix: 1, best: "r1" }, { id: "s03", name: "Chat", render: "image", composite: null, rounds: 0, mustFix: 0, best: "" }],
      flow: { total: 10, passed: 9, failures: [{ edge: "g07", reason: "wall not shown" }] }, htmlShare: 0.83,
    }));
    fs.writeFileSync(p.cost, [
      { stage: "understand", provider: "anthropic", model: "claude-opus-5", in: 12000, out: 3000, thoughts: 0, cacheRead: 0, cacheWrite: 0, usd: 0.135, cached: false },
      { stage: "propose", provider: "anthropic", model: "claude-opus-5", in: 20000, out: 6000, thoughts: 0, cacheRead: 5000, cacheWrite: 0, usd: 0.2875, cached: false },
      { stage: "propose", model: "claude-opus-5", usd: 0, cached: true },
    ].map(r => JSON.stringify(r)).join("\n") + "\n{torn line");
    setTraceContext({ app: "sample", run: "t", stage: "explore", file: p.trace });
    trace("decision", { state: "s01", action: "a01_1", priority: 3, why: "store tab" }, 1);
    trace("failure", { where: "explore:tap", error: "element moved" }, 2);
    trace("recovery", { how: "re-found by key" }, 2);
    trace("human", { note: "logged in with the test account" });
    fs.mkdirSync(p.slides, { recursive: true });
    fs.writeFileSync(path.join(p.slides, "deck.html"), "<!doctype html>");

    const b = paths("blockedapp", { outRoot: root });
    fs.mkdirSync(b.out, { recursive: true });
    fs.writeFileSync(path.join(b.out, "HUMAN_LOG.md"), "- 2026-09-25T05:55:00.000Z App exits on launch on the emulator; could not be explored\n");
    fs.mkdirSync(paths("emptyapp", { outRoot: root }).out, { recursive: true });

    const file = await buildReport(["sample", "blockedapp", "emptyapp"], root);
    assert.equal(file, path.join(root, "index.html"));
    html = fs.readFileSync(file, "utf8");
  });

  test("the scorecard has one row per app with the model, QA, verdict, cost and human numbers", () => {
    const row = html.split('<tr class="st-complete">')[1].split("</tr>")[0];
    assert.match(row, /SampleChat/);
    assert.match(row, /80 · 6 · 11 · 1<div class="muted">stop: frontier_empty/);
    assert.match(row, /consumable-economy/);
    assert.match(row, /1 · 2 · 2 · 3 · 1 · 1/, "resources · sinks · sources · offers · walls · ads");
    assert.match(row, /0\.85 · 9\/10 · 83%/);
    assert.match(row, /1 SHIP<\/span> <span class="v revise">0 REVISE<\/span> <span class="v reject">1 REJECT/);
    assert.match(row, /\$0\.42 · 2 calls \(\+1 cached\)/);
    assert.match(row, /stub: model, proposals, judge/);
    assert.match(row, /<td class="num">1<\/td>$/, "one human intervention from the trace");
  });

  test("a blocked app shows as blocked with the note; an app with no outputs as not run", () => {
    const blocked = html.split('<tr class="st-blocked">')[1].split("</tr>")[0];
    assert.match(blocked, /blockedapp/);
    assert.match(blocked, /exits on launch/);
    assert.match(html, /<tr class="st-not-run">[\s\S]*?emptyapp/);
  });

  test("per-app links point at existing artifacts; missing ones are marked, not linked", () => {
    assert.match(html, /<a class="lnk" href="sample\/model\/viewer\.html">Product model<\/a>/);
    assert.match(html, /<a class="lnk" href="sample\/slides\/deck\.html">Slides<\/a>/);
    assert.match(html, /<span class="lnk off"[^>]*>Mock \(debug\)<\/span>/);
    assert.match(html, /href="sample\/slides\/deck\.html#flow-P1">P1: Refill by play/);
  });

  test("Markdown artifacts and the trajectory are pre-rendered to HTML pages", () => {
    const out = path.join(root, "sample", "report");
    const cands = fs.readFileSync(path.join(out, "candidates.html"), "utf8");
    assert.match(cands, /<table><thead><tr><th>id<\/th><th>title<\/th><\/tr><\/thead>/);
    assert.match(cands, /&lt;script&gt;/, "HTML in Markdown is escaped");
    assert.doesNotMatch(cands, /<script>x/);
    const traj = fs.readFileSync(path.join(out, "trajectory.html"), "utf8");
    assert.match(traj, /Human interventions/);
    assert.match(traj, /logged in with the test account/);
    assert.ok(fs.existsSync(path.join(root, "sample", "trajectory.md")));
    assert.match(html, /Judge evaluation[\s\S]*no decline button/);
  });

  test("answers the six how-you-operate questions and stays self-contained", () => {
    for (const q of ["device controlled", "decide what to explore", "knowledge represented", "share context", "deterministic vs model-driven", "failures handled"])
      assert.match(html, new RegExp(q));
    assert.match(html, /blackboard/);
    assert.doesNotMatch(html, /fetch\(|<script src=|https?:\/\//);
  });

  test("cost roll-up counts live and cached calls, tokens and dollars, skipping torn lines", () => {
    const c = rollupCost(paths("sample", { outRoot: root }).cost);
    assert.equal(c.live, 2);
    assert.equal(c.cached, 1);
    assert.equal(c.tokensIn, 37000);
    assert.equal(c.tokensOut, 9000);
    assert.equal(Math.round(c.usd * 10000), 4225);
    assert.deepEqual(c.byStage.map(s => s.stage), ["understand", "propose"]);
  });
});

describe("renderMarkdown", () => {
  test("headings, paragraphs, lists (nested), code, tables, inline spans", () => {
    const out = renderMarkdown([
      "# Title", "", "Some **bold** and *em* and `code <b>` and [a link](deck.html).", "",
      "- one", "  - nested", "- two", "", "1. first", "2. second", "",
      "```ts", "const x = 1 < 2;", "```", "",
      "| a | b |", "|:--|--:|", "| 1 | 2 |", "", "> quoted", "", "---",
    ].join("\n"));
    assert.match(out, /<h1 id="title">Title<\/h1>/);
    assert.match(out, /<strong>bold<\/strong> and <em>em<\/em> and <code>code &lt;b&gt;<\/code> and <a href="deck\.html">a link<\/a>/);
    assert.match(out, /<ul><li>one<ul><li>nested<\/li><\/ul><\/li><li>two<\/li><\/ul>/);
    assert.match(out, /<ol><li>first<\/li><li>second<\/li><\/ol>/);
    assert.match(out, /<pre><code class="lang-ts">const x = 1 &lt; 2;<\/code><\/pre>/);
    assert.match(out, /<th style="text-align:right">b<\/th>/);
    assert.match(out, /<blockquote><p>quoted<\/p><\/blockquote>/);
    assert.match(out, /<hr>/);
  });

  test("unsafe links are not linked", () => {
    assert.doesNotMatch(renderMarkdown("[x](javascript:alert(1))"), /href="javascript/);
  });
});
