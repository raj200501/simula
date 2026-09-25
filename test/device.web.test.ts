// WebDevice driving the adversarial fixture app (fixtures/credit-chat) the way the explorer will:
// only through the Device interface (elements, taps in device px, typing, back, foreground).
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WebDevice, resolveUrl, withParam } from "../src/device/web.ts";
import { ROOT } from "../src/core/config.ts";
import type { RawElement } from "../src/core/schema.ts";

process.env.SIMULA_LLM = "stub";
const APP = "web.fixture.creditchat";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "simula-web-test-"));

const labelOf = (e: RawElement) => e.text ?? e.label ?? "";
async function find(dev: WebDevice, re: RegExp): Promise<RawElement | undefined> {
  return (await dev.elements()).find(e => re.test(labelOf(e)));
}
async function must(dev: WebDevice, re: RegExp): Promise<RawElement> {
  const els = await dev.elements();
  const e = els.find(x => re.test(labelOf(x)));
  assert.ok(e, `no element matching ${re} among: ${els.map(labelOf).filter(Boolean).join(" | ")}`);
  return e;
}
async function tapEl(dev: WebDevice, e: RawElement): Promise<void> {
  await dev.tap(e.rect.x + e.rect.w / 2, e.rect.y + e.rect.h / 2);
}
const fixture = (dev: WebDevice, fn: "state" | "audit" | "screen") => dev.page.evaluate(`window.__fixture.${fn}()`) as Promise<any>;

describe("url helpers", () => {
  test("resolveUrl turns repo-relative paths into file URLs and keeps queries; withParam adds or replaces", () => {
    assert.equal(resolveUrl("fixtures/credit-chat/index.html"), "file://" + path.join(ROOT, "fixtures/credit-chat/index.html"));
    assert.ok(resolveUrl("out/x/mock/index.html?screen=s01").endsWith("/out/x/mock/index.html?screen=s01"));
    assert.equal(resolveUrl("http://localhost:3000/a"), "http://localhost:3000/a");
    assert.equal(withParam("file:///a/index.html", "reset", "1"), "file:///a/index.html?reset=1");
    assert.equal(withParam("file:///a/index.html?screen=s01#x", "reset", "1"), "file:///a/index.html?screen=s01&reset=1#x");
    assert.equal(withParam("file:///a/index.html?reset=0", "reset", "1"), "file:///a/index.html?reset=1");
  });
});

describe("WebDevice on the credit-chat fixture", () => {
  let dev: WebDevice;
  before(async () => {
    dev = await WebDevice.open({ url: "fixtures/credit-chat/index.html", appPackage: APP, resetState: true });
  });
  after(async () => {
    await dev?.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test("info, foreground and a device-resolution screenshot", async () => {
    const info = await dev.info();
    assert.deepEqual(info, { widthPx: 1079, heightPx: 2399, density: 2.625, statusBarPx: 63, navBarPx: 126, kind: "web" });
    assert.equal(await dev.foreground(), APP);
    const shot = path.join(tmp, "obs", "o0001.png");
    await dev.screenshot(shot);
    const png = fs.readFileSync(shot);
    assert.equal(png.readUInt32BE(16), info.widthPx);
    assert.equal(png.readUInt32BE(20), info.heightPx);
    assert.ok(!dev.url.includes("reset"), "the reset flag is only used for the first load");
  });

  test("home: balance chip reads 450, the sponsored card is an ad container, rects are on screen in device px", async () => {
    const els = await dev.elements();
    const chip = els.find(e => e.identifier === "web:id/balance_chip");
    assert.ok(chip);
    assert.match(chip.text ?? "", /450/);
    assert.equal(chip.type, "android.widget.Button");
    const ad = els.find(e => e.identifier === "web:id/ad_container");
    assert.ok(ad, "the data-ad card is reported with the generic ad identifier");
    assert.ok(els.some(e => e.text === "Sponsored"));
    const { widthPx, heightPx } = await dev.info();
    for (const e of els) {
      assert.ok(e.rect.w > 0 && e.rect.h > 0 && e.rect.x >= 0 && e.rect.y >= 0, JSON.stringify(e));
      assert.ok(e.rect.x + e.rect.w <= widthPx + 1 && e.rect.y + e.rect.h <= heightPx + 1, JSON.stringify(e));
    }
    const home = els.find(e => e.identifier === "web:id/tab_home");
    assert.equal(home?.selected, true);
    assert.equal(home?.text, "Home", "a button merges its children's text");
    assert.ok(!els.some(e => e.text === "Dragon Tutor"), "feed items scrolled out of their container are not reported");
  });

  test("the daily check-in modal shows on the first Home open; BACK closes it", async () => {
    assert.ok(await find(dev, /^Claim$/));
    assert.ok(await find(dev, /\+300 credits/));
    await dev.back();
    assert.equal(await find(dev, /^Claim$/), undefined);
    assert.equal(await find(dev, /Daily check-in/), undefined);
  });

  test("swiping up scrolls the feed", async () => {
    assert.equal(await find(dev, /^Dragon Tutor$/), undefined);
    for (let i = 0; i < 4 && !(await find(dev, /^Dragon Tutor$/)); i++) await dev.swipe("up", 540, 1600, 800);
    assert.ok(await find(dev, /^Dragon Tutor$/));
    await dev.swipe("down", 540, 800, 3000);
    assert.ok(await find(dev, /^For you$/));
  });

  test("tapping the Store tab changes the elements", async () => {
    const before = (await dev.elements()).map(labelOf).join("|");
    await tapEl(dev, await must(dev, /^Store$/));
    const els = await dev.elements();
    assert.notEqual(els.map(labelOf).join("|"), before);
    assert.equal(els.find(e => e.identifier === "web:id/tab_store")?.selected, true);
    assert.ok(els.some(e => /1,000 credits.*\$1\.39/.test(e.text ?? "")));
    assert.ok(!els.some(e => e.identifier === "web:id/balance_chip"), "the balance is only on Home");
  });

  test("tapping a pack opens the external billing card; BACK closes it", async () => {
    await tapEl(dev, await must(dev, /2,000 credits/));
    assert.equal(await dev.foreground(), "ext:billing");
    assert.ok(await find(dev, /^\$2\.89$/));
    await dev.back();
    assert.equal(await dev.foreground(), APP);
    assert.equal(await fixture(dev, "screen"), "store");
  });

  test("story detail: one list row is half hidden under the navigation bar", async () => {
    await tapEl(dev, await must(dev, /^Home$/));
    await tapEl(dev, await must(dev, /^The Midnight Library$/));
    assert.ok(await find(dev, /^Start chat$/));
    const { heightPx, navBarPx } = await dev.info();
    const navTop = heightPx - navBarPx;
    const row = (await dev.elements()).find(e => e.type === "android.widget.Button" && e.rect.y < navTop && e.rect.y + e.rect.h > navTop);
    assert.ok(row, "a row straddles the nav bar");
    const visible = (navTop - row.rect.y) / row.rect.h;
    assert.ok(visible > 0.3 && visible < 0.7, `visible fraction ${visible}`);
    // Its centre is under the nav bar, which swallows the tap (a real system bar would too).
    await dev.tap(row.rect.x + row.rect.w / 2, row.rect.y + row.rect.h * 0.8);
    assert.equal(await fixture(dev, "screen"), "detail");
  });

  test("chat: the mic becomes a Send button only after typing", async () => {
    await tapEl(dev, await must(dev, /^Start chat$/));
    assert.equal(await find(dev, /^Send$/), undefined);
    assert.ok(await find(dev, /^Voice input$/));
    const input = (await dev.elements()).find(e => e.type === "android.widget.EditText");
    assert.ok(input);
    assert.equal(input.text, undefined, "the placeholder is not reported, like mobile-mcp drops Android hints");
    await tapEl(dev, input);
    await dev.typeText("Hello there");
    const send = await must(dev, /^Send$/);
    assert.equal(send.type, "android.widget.Button");
    assert.equal((await dev.elements()).find(e => e.type === "android.widget.EditText")?.text, "Hello there");
    await tapEl(dev, send);
    assert.ok(await find(dev, /^Hello there$/), "the user bubble appears");
    await new Promise(r => setTimeout(r, 1400));
    assert.ok(await find(dev, /^Interesting\.$/), "the bot replies after 1.2 s");
    assert.equal((await fixture(dev, "state")).balance, 440);
  });

  test("sending with Premium until the balance runs out shows Out of credits", async () => {
    await tapEl(dev, await must(dev, /^Basic · 10$/));
    await tapEl(dev, await must(dev, /^Premium/));
    assert.ok(await find(dev, /^Premium · 30$/));
    const chat = await dev.elements();
    assert.ok(!chat.some(e => /^[\d,]+ credits$/.test(labelOf(e))), "the balance is not shown in chat");
    let sends = 0;
    while (sends < 40) {
      // Like the explorer: focus the field, type, re-read the screen, tap Send.
      await tapEl(dev, await must(dev, /^Message$/));
      await dev.typeText(`message ${sends}`);
      await tapEl(dev, await must(dev, /^Send$/));
      if (await find(dev, /^Out of credits$/)) break;
      sends++;
    }
    assert.equal(sends, 14, "440 credits buy 14 Premium messages; the 15th hits the wall");
    assert.ok(await find(dev, /^Refill now$/));
    assert.ok(await find(dev, /^Not now$/));
    await tapEl(dev, await must(dev, /^Refill now$/));
    assert.equal((await dev.elements()).find(e => e.identifier === "web:id/tab_store")?.selected, true);
  });

  test("a cold launch returns to Home and keeps the balance (no second check-in today)", async () => {
    await dev.launch({ cold: true });
    const chip = await must(dev, /credits$/);
    assert.equal(chip.identifier, "web:id/balance_chip");
    assert.match(chip.text ?? "", /^20 credits$/);
    assert.equal(await find(dev, /^Claim$/), undefined);
    assert.deepEqual(await fixture(dev, "audit"), { logouts: 0, adTaps: 0, purchasesAttempted: 0 });
  });

  test("profile: Rate us is an external browser; Log out wipes the account (the trap the explorer must avoid)", async () => {
    await tapEl(dev, await must(dev, /^Profile$/));
    await tapEl(dev, await must(dev, /^Rate us$/));
    assert.equal(await dev.foreground(), "ext:browser");
    await dev.back();
    assert.equal(await dev.foreground(), APP);
    await tapEl(dev, await must(dev, /^Log out$/));
    assert.equal((await fixture(dev, "audit")).logouts, 1);
    assert.match((await must(dev, /credits$/)).text ?? "", /^450 credits$/);
    assert.ok(await find(dev, /^Claim$/), "a fresh account gets the check-in again");
  });

  test("BACK on the Home root is a no-op", async () => {
    await dev.back();
    await dev.back();
    assert.equal(await fixture(dev, "screen"), "home");
    assert.equal(await dev.foreground(), APP);
    assert.deepEqual(dev.pageErrors, []);
  });
});
