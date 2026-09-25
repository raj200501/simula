// buildSlides end to end, offline (stub LLM): sample model dir with placeholder screenshots ->
// stub mock (buildMock) -> captures of the patched mock -> deck.html + deck.pdf + png/.
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { setLlmContext } from "../src/core/llm.ts";
import { loadProfile, paths } from "../src/core/config.ts";
import { readTrace, setTraceContext } from "../src/core/trace.ts";
import type { StageCtx } from "../src/core/run.ts";
import { sampleCandidates, sampleJudgments, writeModelDir } from "./helpers/slidesreport-fixtures.ts";

const BUILD = path.join(import.meta.dirname, "..", "src", "mock", "build.ts");
const ready = fs.existsSync(BUILD);
const skip = ready ? false : "src/mock/build.ts is not built yet (mock-qa module); re-run once it exists";

describe("buildSlides (stub LLM, real mock runtime)", { skip, timeout: 60_000 }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "simula-slides-test-"));
  const c: StageCtx = {
    app: { id: "sample", package: "web.sample", name: "SampleChat", profile: "fixture", login: "none" },
    profile: loadProfile("fixture"), paths: paths("sample", { outRoot: path.join(tmp, "out") }), runId: "t", llm: "stub", opts: {},
  };
  let deck = "", pdf = "";

  before(async () => {
    setLlmContext({ mode: "stub" });
    setTraceContext({ app: "sample", run: "t", stage: "slides", file: c.paths.trace });
    const { m, modelDir } = await writeModelDir(c.paths.model);
    const { buildMock } = await import("../src/mock/build.ts");
    buildMock(m, modelDir, c.paths.mock); // the mock stage's stub output (spec-rendered screens)
    const { buildSlides } = await import("../src/slides/slides.ts");
    ({ deckHtml: deck, pdf } = await buildSlides(c, m, modelDir, sampleCandidates(), sampleJudgments()));
  });

  test("deck.html has exactly one flow slide with five frames and a trigger label", () => {
    const html = fs.readFileSync(deck, "utf8");
    const flows = html.split('<section class="slide flow"').slice(1);
    assert.equal(flows.length, 1);
    const f = flows[0].split("</section>")[0];
    assert.equal((f.match(/class="f-col"/g) ?? []).length, 5);
    assert.match(f, /<div class="t">Trigger<\/div>/);
    for (let i = 1; i <= 5; i++) assert.ok(fs.existsSync(path.join(path.dirname(deck), "img", `P1-${i}-${["today", "change", "offer", "ad", "value"][i - 1]}.png`)));
  });

  test("callouts are pinned at real DOM positions, including Play and No thanks on the offer", () => {
    const f = fs.readFileSync(deck, "utf8").split('<section class="slide flow"')[1].split("</section>")[0];
    assert.match(f, /Play now: starts a 15s sponsored game/, "Play button found in the offer frame");
    assert.match(f, /No thanks: dismisses the offer/, "decline button found in the offer frame");
    assert.match(f, /No thanks<\/b> → back to Out of credits, nothing lost/);
    assert.match(f, />NEW</, "the new element was found in the What changed frame");
    assert.ok((f.match(/class="pin"/g) ?? []).length >= 4);
  });

  test("frames are DPR 2 captures of the patched mock, with no capture failures", async () => {
    const meta = await sharp(path.join(path.dirname(deck), "img", "P1-3-offer.png")).metadata();
    assert.deepEqual([meta.width, meta.height], [822, 1828]);
    const fails = readTrace(c.paths.trace).filter(e => e.type === "failure" && String(e.data.where ?? "").startsWith("slides:"));
    assert.deepEqual(fails.map(e => `${e.data.where}: ${e.data.error}`), []);
  });

  test("deck.pdf and one PNG per slide exist; the rejected idea is in the review table", () => {
    assert.ok(fs.statSync(pdf).size > 20_000);
    const html = fs.readFileSync(deck, "utf8");
    const slides = (html.match(/<section class="slide/g) ?? []).length;
    const pngs = fs.readdirSync(path.join(path.dirname(deck), "png")).filter(f => f.endsWith(".png"));
    assert.equal(pngs.length, slides);
    const pages = (fs.readFileSync(pdf, "latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    assert.equal(pages, slides, "one PDF page per slide");
    const ideas = html.split('id="ideas-1"')[1];
    assert.match(ideas, /Interstitial when the app opens/);
    assert.match(ideas, /REJECT/);
  });

  test("zero SHIPs: the deck still builds and exports, says so plainly, and has no flow slide", async () => {
    const { m, modelDir } = await writeModelDir(path.join(tmp, "zero", "model"));
    const c0: StageCtx = { ...c, paths: paths("sample", { outRoot: path.join(tmp, "zero-out"), modelDir }) };
    const { buildSlides } = await import("../src/slides/slides.ts");
    const r = await buildSlides(c0, m, modelDir, sampleCandidates(), sampleJudgments({ shipVerdict: "REVISE" }));
    const html = fs.readFileSync(r.deckHtml, "utf8");
    assert.equal(html.split('<section class="slide flow"').length - 1, 0);
    assert.match(html, /No rewarded flow for SampleChat is ready to ship yet/);
    assert.match(html.split('id="ideas-1"')[1], /REVISE/);
    assert.ok(fs.existsSync(r.pdf));
  });

  test("self-contained: images are files next to the deck, the prototype link points at the mock", () => {
    const html = fs.readFileSync(deck, "utf8");
    for (const [, src] of html.matchAll(/<img src="([^"]+)"/g)) assert.ok(fs.existsSync(path.join(path.dirname(deck), src)), src);
    assert.match(html, /href="\.\.\/mock\/index\.html\?proposal=P1"/);
    assert.doesNotMatch(html, /fetch\(|https?:\/\//);
  });
});
