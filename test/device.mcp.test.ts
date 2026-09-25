// McpDevice without an emulator:
//   1. pure parsers against the exact text shapes mobile-mcp 1.0.5 returns (docs/research/mobile-mcp.md);
//   2. the driver against a fake stdio server: tool/argument mapping, text-error retry, hang -> respawn;
//   3. the real mobile-mcp server with no device booted: doctor + a clear precondition error.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import {
  McpDevice, mcpDoctor, isErrorText, parseElements, parseForeground, parseScreenSize, parseDevices, pickDevice,
  parseDensity, parseInsets, planSwipe, type McpServerSpec,
} from "../src/device/mcp.ts";
import { DeviceError } from "../src/device/types.ts";
import { ROOT } from "../src/core/config.ts";
import { readTrace, setTraceContext } from "../src/core/trace.ts";
import type { FakeMcpConfig } from "./helpers/device-fake-mcp.ts";

process.env.SIMULA_LLM = "stub";
const require = createRequire(import.meta.url);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "simula-mcp-test-"));
const traceFile = path.join(tmp, "trace.jsonl");
setTraceContext({ app: "test", run: "t", stage: "device", file: traceFile, echo: false });

// ---------------------------------------------------------------------------------------------
describe("mobile-mcp text parsing (pure)", () => {
  test("isErrorText catches both failure styles and nothing else", () => {
    assert.equal(isErrorText('Device "X" not found. Use the mobile_list_available_devices tool to see available devices.. Please fix the issue and try again.'), true);
    assert.equal(isErrorText("Screenshot is invalid. Please try again.. Please fix the issue and try again.\n"), true);
    assert.equal(isErrorText("Error: Command failed: mobilecli io tap 1,2 --device X\nerror finding device"), true);
    assert.equal(isErrorText("Clicked on screen at coordinates: 540, 1200"), false);
    assert.equal(isErrorText('Found these elements on screen: [{"text":"Error: none"}]'), false);
  });

  test("parseElements strips the prefix, maps coordinates and states, drops refs, keeps order", () => {
    const text = 'Found these elements on screen: [' +
      '{"ref":"@e1","type":"android.widget.FrameLayout","text":"","identifier":"com.example:id/toolbar","coordinates":{"x":0,"y":63,"width":1080,"height":147}},' +
      '{"ref":"@e2","type":"android.widget.TextView","text":"Chats","coordinates":{"x":42,"y":100,"width":200,"height":70},"selected":true},' +
      '{"ref":"@e3","type":"android.widget.ImageButton","text":"","label":"Settings","coordinates":{"x":960,"y":95,"width":84,"height":84}},' +
      '{"ref":"@e4","type":"android.widget.EditText","identifier":"com.example:id/input","coordinates":{"x":30,"y":2200,"width":880,"height":120},"focused":true},' +
      '{"ref":"@e5","type":"android.view.View","text":"","coordinates":{"x":930,"y":2210,"width":110,"height":110},"enabled":false,"checked":true}]';
    const els = parseElements(text);
    assert.equal(els.length, 5);
    assert.deepEqual(els[0], { type: "android.widget.FrameLayout", identifier: "com.example:id/toolbar", rect: { x: 0, y: 63, w: 1080, h: 147 } });
    assert.deepEqual(els[1], { type: "android.widget.TextView", text: "Chats", rect: { x: 42, y: 100, w: 200, h: 70 }, selected: true });
    assert.equal(els[2].label, "Settings");
    assert.equal(els[2].text, undefined, "empty text is dropped so text || label works");
    assert.equal(els[3].focused, true);
    assert.deepEqual(els[4], { type: "android.view.View", rect: { x: 930, y: 2210, w: 110, h: 110 }, checked: true, disabled: true });
    assert.ok(els.every(e => !("ref" in e)), "refs are positional: never kept");
  });

  test("parseElements: empty screen, iOS name/value fallback, garbage", () => {
    assert.deepEqual(parseElements("Found these elements on screen: []"), []);
    const ios = parseElements('Found these elements on screen: [{"type":"Button","name":"Send","value":"","coordinates":{"x":1,"y":2,"width":3,"height":4}}]');
    assert.equal(ios[0].label, "Send");
    assert.throws(() => parseElements("mobilecli is not available"), DeviceError);
  });

  test("parseForeground / parseScreenSize", () => {
    assert.equal(parseForeground("Foreground app: Example App (com.example.app)"), "com.example.app");
    assert.equal(parseForeground("Foreground app: My App (Beta) (com.example.beta_2)\n"), "com.example.beta_2");
    assert.equal(parseForeground("Foreground app: unknown"), null);
    assert.deepEqual(parseScreenSize("Screen size is 1080x2400 pixels"), { width: 1080, height: 2400 });
    assert.throws(() => parseScreenSize("no size"), DeviceError);
  });

  test("device selection: no device is a non-retriable precondition error with the boot hint", () => {
    const none = parseDevices('{"devices":[]}');
    assert.deepEqual(none, []);
    assert.throws(() => pickDevice(none), (e: unknown) => e instanceof DeviceError && /boot the emulator: npm run device -- boot/.test(e.message) && e.retriable === false);
    const list = parseDevices(JSON.stringify({ devices: [
      { id: "iPhone-16", platform: "ios", type: "simulator" },
      { id: "emulator-5554", platform: "android", type: "emulator" },
      { id: "emulator-5556", platform: "android", type: "emulator" },
    ] }));
    assert.equal(pickDevice(list), "emulator-5554");
    assert.equal(pickDevice(list, "emulator-5556"), "emulator-5556");
    assert.throws(() => pickDevice(list, "emulator-9999"), /not online/);
    assert.throws(() => pickDevice([{ id: "iPhone-16", platform: "ios" }]), /No online Android device/);
  });

  test("density and insets from adb output", () => {
    assert.equal(parseDensity("Physical density: 420"), 2.625);
    assert.equal(parseDensity("Physical density: 420\nOverride density: 480"), 3);
    assert.equal(parseDensity(""), null);
    const a15 = "InsetsState: {mDisplayFrame=Rect(0, 0 - 1080, 2400), mSources= { " +
      "InsetsSource: {27 mType=displayCutout mFrame=[0,0][1080,136] mVisible=true mFlags=[]}, " +
      "InsetsSource: {3f2c0005 mType=statusBars mFrame=[0,0][1080,136] mVisible=true mFlags=[]}, " +
      "InsetsSource: {3f2c0001 mType=navigationBars mFrame=[0,2337][1080,2400] mVisible=true mFlags=[] mSideHint=BOTTOM}, " +
      "InsetsSource: {3f2c0006 mType=statusBars mFrame=[0,0][0,0] mVisible=false mFlags=[]} }";
    assert.deepEqual(parseInsets(a15), { statusBarPx: 136, navBarPx: 63 });
    const a12 = "InsetsSource type=ITYPE_STATUS_BAR frame=[0,0][1080,118] visible=true\nInsetsSource type=ITYPE_NAVIGATION_BAR frame=[0,2274][1080,2400] visible=true";
    assert.deepEqual(parseInsets(a12), { statusBarPx: 118, navBarPx: 126 });
    assert.deepEqual(parseInsets("nothing here"), { statusBarPx: null, navBarPx: null });
  });

  test("planSwipe keeps start and end inside 15-85% of the height and away from the side edges", () => {
    const W = 1080, H = 2400;
    for (const [dir, y, dist] of [["up", 2350, 1000], ["up", 100, 960], ["down", 300, 1000], ["down", 2300, 500], ["up", 1200, 5000]] as const) {
      const s = planSwipe(dir, 5, y, dist, W, H);
      const end = dir === "up" ? s.y - s.distance : s.y + s.distance;
      for (const v of [s.y, end]) assert.ok(v >= 0.15 * H - 1 && v <= 0.85 * H + 1, `${dir} ${y} ${dist}: ${v} out of band`);
      assert.ok(s.x >= 0.1 * W && s.x <= 0.9 * W);
      assert.ok(s.distance > 0);
    }
    assert.equal(planSwipe("up", 540, 1680, 960, W, H).distance, 960, "an in-band swipe is left alone");
    assert.equal(planSwipe("up", 540, 1680, 960, W, H).y, 1680);
  });
});

// ---------------------------------------------------------------------------------------------
describe("McpDevice against a fake mobile-mcp server", () => {
  const fake = path.join(ROOT, "test", "helpers", "device-fake-mcp.ts");
  const spec = (cfg: FakeMcpConfig): McpServerSpec => ({ command: process.execPath, args: ["--import", "tsx", fake, JSON.stringify(cfg)] });
  const calls = (log: string) => fs.existsSync(log) ? fs.readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map(l => JSON.parse(l) as { tool: string; args: Record<string, unknown> }) : [];
  const traceSince = (n: number) => readTrace(traceFile).slice(n);

  test("every Device method maps to the right tool and arguments", async () => {
    const log = path.join(tmp, "map.log");
    const dev = await McpDevice.connect({ appPackage: "com.example.fake", cwd: ROOT, server: spec({ log }), timeoutMs: 10_000 });
    try {
      assert.equal(dev.serial, "emulator-5554");
      const els = await dev.elements();
      assert.deepEqual(els.map(e => e.text ?? e.label), ["Home", "Send", undefined]);
      assert.equal(els[1].disabled, true);
      assert.equal(await dev.foreground(), "com.example.fake");
      const info = await dev.info();
      assert.equal(info.widthPx, 1080);
      assert.equal(info.heightPx, 2400);
      assert.ok(info.density > 0);
      await dev.tap(540.6, 1200.2);
      await dev.typeText("hello");
      await dev.pressEnter();
      await dev.back();
      await dev.swipe("up", 540, 2380, 1000);
      await dev.launch({ cold: true });
      await dev.launch();
      const shot = path.join(tmp, "shots", "o0001.png");
      await dev.screenshot(shot);
      assert.ok(fs.statSync(shot).size > 0);
      // Concurrent callers are serialized, in order.
      await Promise.all([dev.tap(1, 1), dev.tap(2, 2), dev.tap(3, 3)]);
    } finally {
      await dev.close();
    }
    const c = calls(log);
    const by = (tool: string) => c.filter(x => x.tool === tool);
    assert.ok(c.filter(x => x.tool !== "mobile_list_available_devices").every(x => x.args.device === "emulator-5554"));
    assert.deepEqual(by("mobile_list_elements_on_screen")[0].args.format, "json");
    assert.deepEqual(by("mobile_click_on_screen_at_coordinates")[0].args, { device: "emulator-5554", x: 541, y: 1200 });
    assert.equal(by("mobile_click_on_screen_at_coordinates")[0].args.ref, undefined, "never taps by ref");
    assert.deepEqual(by("mobile_type_keys")[0].args, { device: "emulator-5554", text: "hello", submit: false });
    assert.deepEqual(by("mobile_press_button").map(x => x.args.button), ["ENTER", "BACK"]);
    const sw = by("mobile_swipe_on_screen")[0].args as { direction: string; y: number; distance: number };
    assert.equal(sw.direction, "up");
    assert.ok(sw.y <= 2040 && sw.y - sw.distance >= 360, "swipe clamped to 15-85% of the height");
    const launches = c.filter(x => x.tool === "mobile_terminate_app" || x.tool === "mobile_launch_app").map(x => x.tool);
    assert.deepEqual(launches, ["mobile_terminate_app", "mobile_launch_app", "mobile_launch_app"], "cold = terminate + launch; warm = launch");
    assert.deepEqual(by("mobile_click_on_screen_at_coordinates").slice(1).map(x => x.args.x), [1, 2, 3]);
    assert.ok(readTrace(traceFile).some(e => e.type === "mcp_call" && e.data.tool === "mobile_get_screen_size" && e.data.ok === true && typeof e.data.ms === "number"));
  });

  test("an actionable text error (no isError) is detected and retried once", async () => {
    const n = readTrace(traceFile).length;
    const log = path.join(tmp, "flaky.log");
    const dev = await McpDevice.connect({ appPackage: "com.example.fake", cwd: ROOT, server: spec({ log, flakyTool: "mobile_press_button" }), timeoutMs: 10_000 });
    try {
      await dev.back();
    } finally {
      await dev.close();
    }
    assert.equal(calls(log).filter(x => x.tool === "mobile_press_button").length, 2);
    const ev = traceSince(n);
    assert.ok(ev.some(e => e.type === "mcp_call" && e.data.tool === "mobile_press_button" && e.data.ok === false));
    assert.ok(ev.some(e => e.type === "recovery" && e.data.where === "mcp:mobile_press_button"));
  });

  test("a hung server is killed and respawned, and the call still succeeds", async () => {
    const n = readTrace(traceFile).length;
    const hangMarker = path.join(tmp, "hung-once");
    const dev = await McpDevice.connect({ appPackage: "com.example.fake", cwd: ROOT, server: spec({ hangMarker }), timeoutMs: 1500 });
    try {
      assert.equal(await dev.foreground(), "com.example.fake");
      assert.ok(fs.existsSync(hangMarker), "the first attempt really hung");
      assert.equal((await dev.elements()).length, 3, "the respawned server keeps working");
    } finally {
      await dev.close();
    }
    const ev = traceSince(n).filter(e => e.data.tool === "mobile_get_foreground_app" || e.type === "recovery");
    assert.deepEqual(ev.filter(e => e.type === "mcp_call").map(e => e.data.ok), [false, true]);
    assert.ok(ev.some(e => e.type === "recovery" && /respawn/.test(String(e.data.how))));
  });

  test("two timeouts in a row: daemon stop, then a DeviceError", async () => {
    const n = readTrace(traceFile).length;
    const prev = process.env.MOBILECLI_PATH;
    process.env.MOBILECLI_PATH = process.platform === "win32" ? "cmd" : "true"; // stand-in binary: "daemon stop" succeeds
    const dev = await McpDevice.connect({ appPackage: "com.example.fake", cwd: ROOT, server: spec({ hangTool: "mobile_get_foreground_app" }), timeoutMs: 1000 });
    try {
      await assert.rejects(dev.foreground(), (e: unknown) => e instanceof DeviceError && /mobile_get_foreground_app/.test(e.message));
      assert.equal((await dev.elements()).length, 3, "other tools still work after the respawn");
    } finally {
      await dev.close();
      if (prev === undefined) delete process.env.MOBILECLI_PATH; else process.env.MOBILECLI_PATH = prev;
    }
    assert.ok(traceSince(n).some(e => e.type === "recovery" && e.data.how === "mobilecli daemon stop"));
  });

  test("no device online: connect fails with the boot hint and closes the server", async () => {
    await assert.rejects(
      McpDevice.connect({ appPackage: "com.example.fake", cwd: ROOT, server: spec({ devices: '{"devices":[]}' }), timeoutMs: 10_000 }),
      /boot the emulator: npm run device -- boot/,
    );
  });

  test("mcpDoctor passes against a server that has every tool and an Android device", async () => {
    const r = await mcpDoctor({ server: spec({}) });
    assert.equal(r.ok, true, r.lines.join("\n"));
    assert.ok(r.lines.some(l => /11 tools, all required tools present/.test(l)));
    assert.ok(r.lines.some(l => l.startsWith("device: emulator-5554 android")));
  });
});

// ---------------------------------------------------------------------------------------------
describe("the real mobile-mcp 1.0.5 server (no emulator needed)", () => {
  let resolvable = true;
  before(() => {
    try { require.resolve("@mobilenext/mobile-mcp/lib/index.js"); } catch { resolvable = false; }
  });

  test("mcpDoctor spawns it, lists its tools and reports the devices", async t => {
    if (!resolvable) return t.skip("@mobilenext/mobile-mcp not installed");
    const r = await mcpDoctor();
    const tools = r.lines.find(l => /^mobile-mcp: \d+ tools/.test(l));
    assert.ok(tools, r.lines.join("\n"));
    assert.match(tools!, /all required tools present/);
    const android = r.lines.some(l => l.startsWith("device:") && / android /.test(l));
    assert.equal(r.ok, android);
    if (!android) assert.ok(r.lines.some(l => /boot the emulator/.test(l)));
  });

  test("with no emulator booted, connect() is a clear precondition error", async t => {
    if (!resolvable) return t.skip("@mobilenext/mobile-mcp not installed");
    const r = await mcpDoctor();
    if (r.ok) return t.skip("an Android device is online here");
    await assert.rejects(McpDevice.connect({ appPackage: "com.example.app", cwd: ROOT }), /boot the emulator: npm run device -- boot/);
  });
});

after(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});
