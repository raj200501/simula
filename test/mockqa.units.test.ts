// Mock + QA building blocks: sanitizer, metrics, model-derived roles, the fragment validator, and the
// recovery paths when the LLM has no answer (replay miss): spec-render fallback for generation and the
// nudge fixer for QA rounds.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import { setLlmContext } from "../src/core/llm.ts";
import { sanitizeFragment, sanitizeCss } from "../src/mock/sanitize.ts";
import { chatParts, contextGroups, counterBindings, deviceDp, edgeDeltas, initialCounters, startScreen } from "../src/mock/roles.ts";
import { accentOf, stubDesignCss } from "../src/mock/designCss.ts";
import { specRender } from "../src/mock/specRender.ts";
import { validateFragment } from "../src/mock/validate.ts";
import { parseFix } from "../src/mock/prompts.ts";
import { generateMock } from "../src/mock/generate.ts";
import { buildMock, fragmentFile, mockData } from "../src/mock/build.ts";
import { dice, iou } from "../src/qa/compare.ts";
import { inScopeEdges } from "../src/qa/flows.ts";
import { rankScreens, runQa } from "../src/qa/loop.ts";
import { sampleModel } from "./helpers/sample-model.ts";
import { makeFixture, readJson } from "./helpers/mockqa-fixture.ts";

const m = sampleModel();
const screen = (id: string) => m.screens.find(s => s.id === id)!;

describe("sanitizer", () => {
  test("strips scripts, handlers, javascript: and remote URLs, and wraps a root", () => {
    const raw = "Here you go:\n```html\n<div class=\"x\" onclick=\"steal()\"><script>alert(1)</script><a href=\"javascript:void(0)\">a</a><img src=\"https://cdn.example.com/a.png\"><span style=\"background:url(https://x.io/b.png)\">t</span></div>\n```";
    const r = sanitizeFragment(raw, "s09");
    assert.ok(!/script|onclick|javascript:|https:/.test(r.html), r.html);
    assert.match(r.html, /^<div data-screen-root="s09"/);
    assert.equal(r.removed.length, 6, r.removed.join(" | ")); // 5 removals + the added root
  });
  test("keeps a clean fragment untouched; element fragments are not wrapped", () => {
    const clean = '<div data-screen-root="s01" style="position:relative"><b data-node="e1">Hi</b></div>';
    assert.deepEqual(sanitizeFragment(clean, "s01"), { html: clean, removed: [] });
    assert.equal(sanitizeFragment('<button data-node="n1">Play</button>', "n1", { wrap: false }).html, '<button data-node="n1">Play</button>');
  });
  test("CSS: no imports, no remote url()", () => {
    const r = sanitizeCss("```css\n@import url('https://fonts.googleapis.com/css?family=Inter');\n:root{--c-accent:#123456}\n.a{background:url(//cdn.x.com/i.png)}\n```");
    assert.ok(!/@import|cdn\.x\.com/.test(r.css), r.css);
    assert.match(r.css, /--c-accent:#123456/);
    assert.equal(r.removed.length, 2);
  });
});

describe("metrics", () => {
  test("Sørensen–Dice and IoU", () => {
    assert.equal(dice("refill now", "refill now"), 1);
    assert.ok(dice("begin chat", "start chat") < 0.5);
    assert.equal(dice("a", "b"), 0);
    assert.equal(iou({ x: 0, y: 0, w: 10, h: 10 }, { x: 0, y: 0, w: 10, h: 10 }), 1);
    assert.equal(iou({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 0, w: 10, h: 10 }), 50 / 150);
    assert.equal(iou({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 0, w: 10, h: 10 }), 0);
  });
  test("fixer answers split into HTML and at most 8 changelog lines", () => {
    const a = "```html\n<div data-screen-root=\"s01\"></div>\n```\nCHANGELOG:\n" + Array.from({ length: 10 }, (_, i) => `- e${i}: moved`).join("\n");
    const r = parseFix(a);
    assert.equal(r.html, '<div data-screen-root="s01"></div>');
    assert.equal(r.changelog.length, 8);
    assert.equal(r.changelog[0], "e0: moved");
  });
});

describe("model-derived roles and runtime data", () => {
  test("device size, start screen, counters, bindings", () => {
    assert.deepEqual(deviceDp(m), { w: 411, h: 914, density: 2.625, statusDp: 24, navDp: 48, widthPx: 1080, heightPx: 2400 });
    assert.equal(startScreen(m), "s01");
    assert.deepEqual(initialCounters(m), [{ id: "r1", name: "credits", unit: "credits", initial: 450 }]);
    assert.deepEqual(counterBindings(screen("s01"), m), [{ el: "e2", resource: "r1" }]);
  });
  test("chat parts: composer, send (from the consume edges) and the message area", () => {
    const c = chatParts(screen("s03"), m)!;
    assert.equal(c.composer, "e4");
    assert.equal(c.send, "e5");
    assert.ok(c.messages.y >= 72 && c.messages.y + c.messages.h <= 846, JSON.stringify(c.messages));
    assert.equal(c.lastMessageBottom, 180);
    assert.equal(chatParts(screen("s01"), m), null);
    // Type-and-send: when the consume edges start at the input itself, Send is the control next to it.
    const typed = sampleModel();
    for (const e of typed.edges) if (e.el === "e5") e.el = "e4";
    const t = chatParts(typed.screens.find(s => s.id === "s03")!, typed)!;
    assert.deepEqual([t.composer, t.send], ["e4", "e5"]);
  });
  test("an edge taken repeatedly spends its per-traversal delta, not the sum of its observations", () => {
    const e = { ...m.edges.find(x => x.id === "g06")! };
    e.effects = [...e.effects, ...e.effects, { kind: "counter" as const, resource: "r1", before: 90, after: 0, delta: -90, inferred: true }];
    assert.deepEqual(edgeDeltas(e), [{ resource: "r1", delta: -30 }]);
  });
  test("mode contexts form one group; the chip's label is the initial selection", () => {
    const g = contextGroups(m);
    assert.deepEqual(g.groups, [{ labels: ["Basic · 10", "Premium · 30"], screens: ["s03"] }]);
    assert.deepEqual(g.initial, ["Basic · 10"]);
  });
  test("window.MODEL carries edges with counter deltas, walls and externals", () => {
    const d = mockData(m);
    const g05 = d.edges.find(e => e.id === "g05")!;
    assert.deepEqual(g05.deltas, [{ resource: "r1", delta: -10 }]);
    assert.deepEqual(g05.appeared, ["The door creaks open."]);
    assert.equal(d.edges.find(e => e.id === "g07")!.limitHit, true);
    assert.deepEqual(d.walls, [{ id: "w1", edge: "g07", resource: "r1", shows: "s04" }]);
    assert.deepEqual(d.externals, [{ id: "ext:billing", kind: "billing", texts: ["Buy 1,000 credits", "$1.39"] }]);
    assert.equal(d.accent, accentOf(m));
    assert.equal(d.accent, "#6C4DF6");
  });
  test("stub design CSS defines the variables the runtime and prompts rely on", () => {
    const css = stubDesignCss(m);
    for (const v of ["--c-bg", "--c-accent", "--c-on-accent", "--font-body", "--fs-md", "--r-md"]) assert.ok(css.includes(v), v);
    assert.match(css, /^\/\* generatedBy: stub/);
  });
  test("QA ranks flow / wall screens first; flow QA tests every in-scope edge with an element", () => {
    assert.deepEqual(rankScreens(m).slice(0, 3), ["s03", "s04", "s05"]);
    assert.equal(inScopeEdges(m).test.length, 11);
  });
});

describe("validator (Playwright)", () => {
  let browser: Browser, page: Page;
  before(async () => { browser = await chromium.launch(); page = await browser.newPage(); });
  after(async () => { await browser.close(); });

  test("the spec render passes", async () => {
    for (const s of m.screens) {
      const v = await validateFragment(page, specRender(s, m), s, m);
      assert.deepEqual(v.violations, [], s.id);
      assert.equal(v.coverage, 1);
    }
  });
  test("spec render fits text to its rect: a long body is shrunk to its floor and line-clamped, a short label shrinks to one line", async () => {
    const s = structuredClone(screen("s04"));
    const body = "Premium messages cost 30 credits. Refill to keep the conversation going.";
    s.elements = [
      { ...s.elements[0], id: "e1", role: "button", text: body, label: undefined, rectDp: { x: 20, y: 686, w: 371, h: 41.9 }, style: { bg: "#FFFFFF", fg: "#6E6A85", fontDp: 20 } },
      { ...s.elements[0], id: "e2", role: "text", text: `${body} ${body} ${body}`, label: undefined, rectDp: { x: 20, y: 740, w: 371, h: 40 }, style: { fg: "#111111", fontDp: 16 } },
      { ...s.elements[0], id: "e3", role: "list-item", text: "Interesting.", label: undefined, rectDp: { x: 12, y: 800, w: 111.6, h: 38.9 }, style: { bg: "#8D8B96", fg: "#120F24", fontDp: 20 } },
    ];
    const html = specRender(s, m);
    const tag = (id: string) => html.split("\n").find(l => l.includes(`data-node="${id}"`))!;
    assert.match(tag("e1"), /-webkit-line-clamp:2/);
    assert.match(tag("e2"), /-webkit-line-clamp:2/);
    assert.match(tag("e2"), /font-size:12px/, "a long paragraph stops at its floor (80% of 16 px, at most 12 px) and is clamped, never shrunk to 8 px");
    assert.doesNotMatch(tag("e3"), /line-clamp/, "a one-line label shrinks to fit instead");
    assert.match(tag("e3"), /white-space:nowrap/);
    await page.setViewportSize({ width: 411, height: 914 });
    await page.setContent(`<div style="position:relative;width:411px;height:914px">${html}</div>`);
    const fit = await page.evaluate(`[...document.querySelectorAll('[data-node]')].map(n => {
      const r = n.getBoundingClientRect(), inner = n.querySelector('span') || n;
      const cs = getComputedStyle(n), ics = getComputedStyle(inner), clamp = parseInt(ics.webkitLineClamp, 10);
      // A clamped text shows exactly its clamp's lines; any other text shows all of its content.
      const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      const text = clamp > 0 ? clamp * parseFloat(ics.lineHeight) + (inner === n ? pad : 0) : inner === n ? n.scrollHeight : inner.getBoundingClientRect().height;
      return { id: n.getAttribute('data-node'), boxH: r.height, textH: text, overflowX: n.scrollWidth > n.clientWidth + 1 && cs.textOverflow !== 'ellipsis' };
    })`) as { id: string; boxH: number; textH: number; overflowX: boolean }[];
    for (const f of fit) {
      assert.ok(f.textH <= f.boxH + 0.5, `${f.id}: text ${f.textH.toFixed(1)} px tall in a ${f.boxH.toFixed(1)} px box`);
      assert.equal(f.overflowX, false, f.id);
    }
  });
  test("reports scripts, handlers, missing ids, unbound counters and missing chat parts", async () => {
    const bad = `<div data-screen-root="s03"><script>x()</script><div data-node="e1" onclick="x()">Mara</div><img data-node="e2" src="https://x.io/a.png"></div>`;
    const v = await validateFragment(page, bad, screen("s03"), m);
    assert.equal(v.ok, false);
    const all = v.violations.join("\n");
    for (const re of [/<script>/, /on\* handler/, /external URL/, /coverage 40%/, /data-role="messages"/, /data-template="bot"/]) assert.match(all, re);
    const home = await validateFragment(page, `<div data-screen-root="s01">${screen("s01").elements.map(e => `<div data-node="${e.id}">${e.text}</div>`).join("")}</div>`, screen("s01"), m);
    assert.deepEqual(home.violations, ["counters without data-bind: e2 -> r1"]);
  });
});

describe("no LLM answer (replay miss): deterministic recoveries", () => {
  test("generation falls back to the spec renderer; a QA round falls back to the nudge fixer", async () => {
    const fx = await makeFixture("replay");
    setLlmContext({ mode: "replay" });
    try {
      await generateMock(fx.c, fx.m, fx.modelDir);
      const gen = readJson<{ designCss: string; screens: { generatedBy: string }[] }>(path.join(fx.c.paths.mock, "generation.json"));
      assert.equal(gen.designCss, "stub");
      assert.ok(gen.screens.every(s => s.generatedBy === "fallback"), JSON.stringify(gen.screens));
      // Perturb one screen, then QA only that screen: the fix call misses, the nudge fixer takes the round.
      const f = fragmentFile(fx.c.paths.mock, "s05");
      // A tab with the wrong label is must-fix, so the loop has to run a round.
      fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace(/(data-node="e2"[^>]*?)top:100px;/, "$1top:130px;").replace(">Home</div>", ">Homes</div>"));
      buildMock(fx.m, fx.modelDir, fx.c.paths.mock);
      const sum = await runQa(fx.c, fx.m, fx.modelDir, { screens: ["s05"] });
      const r1 = readJson(path.join(fx.c.paths.qa, "s05", "r1", "metrics.json"));
      assert.equal(r1.by, "nudge-fallback");
      assert.equal(r1.kept, true);
      assert.ok(sum.screens.find(s => s.id === "s05")!.composite! > 0.95);
      assert.equal(sum.screens.find(s => s.id === "s01")!.composite, null, "screens outside --screens are not measured");
    } finally {
      setLlmContext({ mode: "stub" });
    }
  });
});
