// Mock generator + runtime, offline (stub LLM): sampleModel() -> generateMock -> index.html driven in
// Playwright from file://. Covers navigation, counters, chat, the wall guard, externals, image screens,
// proposal patches and every rewarded phase.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser, type Page } from "playwright";
import { generateMock } from "../src/mock/generate.ts";
import { buildMock } from "../src/mock/build.ts";
import { makeFixture, readJson, sampleProposal, type MockQaFixture } from "./helpers/mockqa-fixture.ts";

let fx: MockQaFixture;
let indexHtml: string;
let browser: Browser;
let page: Page;
const errors: string[] = [];

const url = (q = "") => pathToFileURL(indexHtml).href + q;
async function open(q = ""): Promise<void> {
  await page.goto(url(q));
  await page.waitForFunction("document.documentElement.dataset.mockReady === '1'");
}
const ev = <T = unknown>(js: string) => page.evaluate(js) as Promise<T>;
const node = (screen: string, el: string) => page.locator(`[data-screen-layer="${screen}"] [data-node="${el}"]`).first();

describe("mock: stub generation and runtime", () => {
  before(async () => {
    // s06 (daily check-in) becomes an image screen so hotspots and the badge are exercised too.
    fx = await makeFixture("mock", m => { m.screens.find(s => s.id === "s06")!.render = "image"; });
    ({ indexHtml } = await generateMock(fx.c, fx.m, fx.modelDir));
    buildMock(fx.m, fx.modelDir, fx.c.paths.mock, { proposals: [sampleProposal()] });
    browser = await chromium.launch();
    page = await browser.newPage({ viewport: { width: 411, height: 914 } });
    page.on("pageerror", e => errors.push(e.message));
  });
  after(async () => { await browser?.close(); });

  test("writes stub-marked fragments, design CSS and a fetch-free page", () => {
    const mock = fx.c.paths.mock;
    const gen = readJson<{ designCss: string; screens: { screen: string; generatedBy: string; coverage: number; violations: string[] }[] }>(path.join(mock, "generation.json"));
    assert.equal(gen.designCss, "stub");
    assert.deepEqual(gen.screens.map(s => s.screen), ["s01", "s02", "s03", "s04", "s05"]);
    for (const s of gen.screens) {
      assert.equal(s.generatedBy, "stub");
      assert.equal(s.coverage, 1, s.screen);
      assert.deepEqual(s.violations, [], s.screen);
    }
    assert.match(fs.readFileSync(path.join(mock, "design.css"), "utf8"), /^\/\* generatedBy: stub/);
    assert.match(fs.readFileSync(path.join(mock, "screens", "s03.html"), "utf8"), /data-generated-by="stub"/);
    const index = fs.readFileSync(indexHtml, "utf8");
    assert.equal((index.match(/<template data-screen=/g) ?? []).length, 6);
    for (const f of ["index.html", "runtime.js", "rewarded.js", "data.js"]) assert.ok(!/\bfetch\(|XMLHttpRequest/.test(fs.readFileSync(path.join(mock, f), "utf8")), f);
    assert.ok(!/(src|href)="https?:/.test(index), "no network resources");
    assert.ok(fs.existsSync(path.join(mock, "assets", "screens", "s06.png")), "image screen screenshot copied");
    assert.ok(fs.existsSync(path.join(mock, "proposals", "P1.js")));
  });

  test("opens from file:// on the start screen; __mock.go / state / history work", async () => {
    await open();
    assert.equal(await ev("window.__mock.state()"), "s01");
    assert.ok(await page.isVisible(".mock-statusbar"), "framed page draws the status bar");
    assert.equal(await ev("window.__mock.go('s05')"), "s05");
    assert.equal(await ev("window.__mock.state()"), "s05");
    assert.deepEqual(await ev("window.__mock.history()"), ["s05"]);
    assert.equal(await ev("window.__mock.get('r1')"), 450);
    assert.equal(await ev("window.__mock.get('credits')"), 450, "resources resolve by name too");
    assert.equal(errors.length, 0, errors.join("\n"));
  });

  test("tapping the Store tab goes to s05, then back to Home", async () => {
    await open("?frame=0");
    await node("s01", "e8").click();
    assert.equal(await ev("window.__mock.state()"), "s05");
    await node("s05", "e7").click();
    assert.equal(await ev("window.__mock.state()"), "s01");
  });

  test("push navigation keeps a back stack; __appBack pops it", async () => {
    await open("?frame=0");
    await node("s01", "e3").click();
    await node("s02", "e2").click();
    assert.deepEqual(await ev("window.__mock.history()"), ["s01", "s02", "s03"]);
    assert.equal(await ev("window.__appBack()"), true);
    await page.waitForTimeout(300);
    assert.equal(await ev("window.__mock.state()"), "s02");
    assert.equal(await page.locator("[data-screen-layer]").count(), 1, "the popped layer is removed after the transition");
  });

  test("chat: Send spends 10 (Basic) / 30 (Premium) and appends the captured bot reply", async () => {
    await open("?frame=0&screen=s03");
    await page.fill('[data-screen-layer="s03"] [data-role="composer"]', "Hello there");
    await node("s03", "e5").click();
    assert.equal(await ev("window.__mock.get('r1')"), 440);
    assert.equal(await page.locator('[data-mock-message="user"]').last().innerText(), "Hello there");
    assert.equal(await page.locator(".mock-typing").count(), 1, "typing dots while the reply is pending");
    await page.waitForFunction(`[...document.querySelectorAll('[data-mock-message="bot"]')].some((n) => n.innerText === "The door creaks open.")`, undefined, { timeout: 2000 });
    assert.equal(await page.locator(".mock-typing").count(), 0);
    // The mode chip cycles to Premium (no observed edge on it), and the next send costs 30.
    await node("s03", "e2").click();
    assert.equal(await node("s03", "e2").innerText(), "Premium · 30");
    await node("s03", "e5").click();
    assert.equal(await ev("window.__mock.get('r1')"), 410);
    assert.equal(await ev("window.__mock.state()"), "s03");
  });

  test("wall guard: a send the balance cannot pay for opens the out-of-credits sheet (s04)", async () => {
    await open("?frame=0&screen=s03");
    await ev("window.__mock.select(['Premium · 30'])");
    await ev("window.__mock.set('r1', 20)");
    await node("s03", "e5").click();
    assert.equal(await ev("window.__mock.state()"), "s04");
    assert.equal(await ev("window.__mock.get('r1')"), 20, "nothing was spent");
    assert.equal(await page.locator("[data-screen-layer]").count(), 2, "the sheet sits over the chat");
    await node("s04", "e3").click(); // Not now -> back to chat
    await page.waitForTimeout(300);
    assert.equal(await ev("window.__mock.state()"), "s03");
    // Basic still fits in 20.
    await ev("window.__mock.select(['Basic · 10'])");
    await node("s03", "e5").click();
    assert.equal(await ev("window.__mock.get('r1')"), 10);
  });

  test("external edge: a pack opens the grey billing card; back closes it", async () => {
    await open("?frame=0&screen=s05");
    await node("s05", "e2").click();
    const card = page.locator('[data-external="billing"]');
    assert.ok(await card.isVisible());
    assert.match(await card.innerText(), /billing/i);
    assert.match(await card.innerText(), /\$1\.39/, "shows the texts captured on the external surface");
    assert.equal(await ev("window.__appBack()"), true);
    assert.equal(await card.count(), 0);
    assert.equal(await ev("window.__mock.state()"), "s05");
  });

  test("image screen: screenshot, badge and hotspots that navigate and apply effects", async () => {
    await open("?screen=s06");
    const layer = page.locator('[data-screen-layer="s06"]');
    assert.equal(await layer.locator("img.mock-shot").count(), 1);
    assert.equal((await layer.locator(".mock-badge").innerText()).toLowerCase(), "image screen");
    assert.equal(await layer.locator(".mock-hotspot[data-node]").count(), 3);
    await node("s06", "e3").click(); // Claim
    await page.waitForTimeout(250);
    assert.equal(await ev("window.__mock.state()"), "s01");
    assert.equal(await ev("window.__mock.get('r1')"), 750);
    assert.match(await node("s01", "e2").innerText(), /^750 credits$/, "bound counter repainted");
  });

  test("proposal patch: new element is marked, opens the rewarded invite, reward granted on verify", async () => {
    await open("?frame=0&screen=s04&proposal=P1");
    const pill = node("s04", "n1");
    assert.equal(await pill.getAttribute("data-new"), "");
    assert.match(await pill.innerText(), /Play a 15 s game/);
    await ev("window.__mock.set('r1', 0)");
    await pill.click();
    const rw = page.locator(".mock-rw");
    assert.equal(await rw.getAttribute("data-phase"), "invite");
    assert.match(await rw.innerText(), /~15 s/);
    assert.match(await rw.innerText(), /\+30 credits/);
    assert.equal(await rw.locator(".mock-rw-initial").innerText(), "M", "initial-letter avatar when no avatar asset exists");
    const [play, no] = [rw.locator('[data-rw="play"]'), rw.locator('[data-rw="decline"]')];
    assert.equal(await play.innerText(), "Play now");
    assert.equal(await no.innerText(), "No thanks");
    const [pb, nb] = [await play.boundingBox(), await no.boundingBox()];
    assert.ok(pb && nb && Math.abs(pb.width - nb.width) < 1 && Math.abs(pb.height - nb.height) < 1, "equally sized buttons");
    await play.click();
    assert.equal(await rw.getAttribute("data-phase"), "game");
    assert.match(await rw.innerText(), /sponsored/i);
    const c0 = Number(await rw.locator("[data-rw-count]").innerText());
    await page.waitForTimeout(1200);
    assert.ok(Number(await rw.locator("[data-rw-count]").innerText()) < c0, "countdown runs");
    assert.equal(await ev("window.__mock.get('r1')"), 0, "nothing granted before verification");
    await ev("window.__mock.openRewarded('verified')");
    assert.match(await rw.innerText(), /Reward verified/);
    assert.equal(await ev("window.__mock.get('r1')"), 30);
    await ev("window.__mock.openRewarded('verified')");
    assert.equal(await ev("window.__mock.get('r1')"), 30, "granted once per session");
    await ev("window.__mock.openRewarded('close')");
    assert.equal(await page.locator(".mock-rw").count(), 0);
    assert.equal(await ev("window.__mock.state()"), "s04");
  });

  test("No thanks returns to the saved screen and keeps the unsent draft; no-fill path", async () => {
    await open("?frame=0&screen=s03&proposal=P1");
    await page.fill('[data-screen-layer="s03"] [data-role="composer"]', "unsent draft");
    await ev("window.__mock.openRewarded('invite', 'P1')");
    await page.locator('.mock-rw [data-rw="decline"]').click();
    assert.equal(await page.locator(".mock-rw").count(), 0);
    assert.equal(await ev("window.__mock.state()"), "s03");
    assert.equal(await page.inputValue('[data-screen-layer="s03"] [data-role="composer"]'), "unsent draft");
    await ev("window.__mock.openRewarded('nofill')");
    assert.match(await page.locator(".mock-rw").innerText(), /No game available right now/);
    await page.locator('.mock-rw [data-rw="ok"]').click();
    assert.equal(await page.locator(".mock-rw").count(), 0);
  });

  test("?slide=1 outlines new elements and freezes the game; ?debug=1 tags every data-node", async () => {
    await open("?frame=0&screen=s04&proposal=P1&slide=1");
    const outline = await node("s04", "n1").evaluate(el => getComputedStyle(el).outlineStyle);
    assert.equal(outline, "dashed");
    await ev("window.__mock.openRewarded('game')");
    const c0 = await page.locator("[data-rw-count]").innerText();
    await page.waitForTimeout(400);
    assert.equal(await page.locator("[data-rw-count]").innerText(), c0, "frozen for a deterministic slide frame");
    assert.equal(c0, "9");
    // A new screen without a fragment is a clone of its base with a callout.
    await ev("window.__mock.go('N1')");
    assert.match(await page.locator('[data-screen-layer="N1"] .mock-callout').innerText(), /rewarded offer/);
    await open("?debug=1&screen=s01");
    assert.equal(await page.locator(".mock-debug-tag").count(), 8);
    assert.equal(errors.length, 0, errors.join("\n"));
  });
});
