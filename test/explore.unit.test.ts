// Unit tests for the explorer's pure parts: normalization, identity, guards, externals, safe taps,
// the heuristic annotator, Send detection, effects, the wall test, the gap check stub, and probe.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { setLlmContext } from "../src/core/llm.ts";
import type { DeviceInfo, ExploreGraph, Observation, State } from "../src/core/schema.ts";
import { excludeTyped, newExclusions, normalize, readCounters, textsOf, type Exclusions } from "../src/explore/observe.ts";
import { diffEffects, jaccard, matchState, signatureOf, templateSame } from "../src/explore/signature.ts";
import { guardReason, isGuardSkip } from "../src/explore/guards.ts";
import { classifyForeground } from "../src/explore/externals.ts";
import { findSend, safeTap } from "../src/explore/act.ts";
import { heuristicAnnotation } from "../src/explore/heuristic.ts";
import { toActions } from "../src/explore/annotate.ts";
import { applyGapTargets, gapCheck } from "../src/explore/gap.ts";
import { isWall, probe } from "../src/explore/explorer.ts";
import { FakeCreditChat, H, NAV, STATUS, W, testCtx, tmpDir } from "./helpers/explore-fake-device.ts";

setLlmContext({ mode: "stub" });

const INFO: DeviceInfo = { widthPx: W, heightPx: H, density: 2.625, statusBarPx: STATUS, navBarPx: NAV, kind: "android" };

async function obsOf(fake: FakeCreditChat, ex: Exclusions = newExclusions(), id = "o0001"): Promise<Observation> {
  const els = normalize(await fake.elements(), INFO, ex);
  return { id, step: 0, ts: "", fg: await fake.foreground(), screenshot: "", elements: els, signature: signatureOf(els), dhash: "", scrollIndex: 0, counters: [], texts: textsOf(els) };
}

function stateOf(o: Observation, id = "s01", kind: State["kind"] = "page"): State {
  return { id, signature: o.signature, dhash: o.dhash, obs: [o.id], name: id, kind, purpose: "", inScope: true, scrollable: false, loginWall: false, annotatedBy: "heuristic", actions: [], signals: [], visits: 1, firstStep: 0 };
}

async function toChat(fake: FakeCreditChat): Promise<void> {
  fake.stack = ["home", "detail", "chat"];
}

test("normalize drops systemui, zero-area, off-screen and inset-row elements, and keys the rest", async () => {
  const fake = new FakeCreditChat();
  const raw = await fake.elements();
  const els = normalize(raw, INFO, newExclusions());
  assert.ok(raw.some(e => e.identifier?.startsWith("com.android.systemui:")));
  assert.ok(!els.some(e => e.identifier?.startsWith("com.android.systemui:")), "systemui dropped");
  assert.ok(!els.some(e => e.rect.w === 0 || e.rect.h === 0), "zero-area dropped");
  assert.deepEqual(els.map(e => e.id).slice(0, 3), ["e1", "e2", "e3"]);
  const bal = els.find(e => e.text?.endsWith("credits"))!;
  assert.equal(bal.key, "TextView|app:id/balance|# credits|0");
  assert.ok(bal.chrome, "balance chip in the top band is chrome");
  // detail page: the "Similar stories" row starts below the screen and is dropped; "More like this" is kept
  fake.stack = ["home", "detail"];
  const det = normalize(await fake.elements(), INFO, newExclusions());
  assert.ok(det.some(e => e.text === "More like this"));
  assert.ok(!det.some(e => e.text === "Similar stories"));
});

test("a native ad card with only a Sponsored badge is flagged, with everything inside it", async () => {
  const els = normalize(await new FakeCreditChat().elements(), INFO, newExclusions());
  const ads = els.filter(e => e.ad).map(e => e.text ?? e.identifier);
  assert.deepEqual(ads.sort(), ["SkyBank: open an account in minutes", "Sponsored", "app:id/promo_card"].sort());
  assert.ok(!els.find(e => e.text === "The Last Lighthouse")!.ad);
  // id-based containers are ads too (WebDevice reports data-ad elements this way)
  const web = normalize([{ type: "div", identifier: "web:id/ad_container", rect: { x: 0, y: 500, w: 1080, h: 300 } },
    { type: "a", text: "Learn more", rect: { x: 40, y: 600, w: 300, h: 80 } }], INFO, newExclusions());
  assert.ok(web.every(e => e.ad));
});

test("chat bubbles of varying width group by shared left or right edge, and 3 vs 30 messages is one signature", async () => {
  const fake = new FakeCreditChat();
  await toChat(fake);
  const ex = newExclusions();
  excludeTyped(ex, "Hi! What happens next?");
  fake.setMessages(3);
  const few = await obsOf(fake, ex);
  fake.setMessages(30);
  const many = await obsOf(fake, ex);
  const bubbles = many.elements.filter(e => e.identifier === "app:id/bubble");
  assert.ok(new Set(bubbles.map(b => b.rect.w)).size > 1, "widths vary");
  assert.ok(bubbles.filter(b => b.group).length >= 6, "bubbles are in repeated groups");
  assert.ok(bubbles.every(b => !b.chrome), "bubbles never carry identity");
  assert.deepEqual(few.signature, many.signature);
});

test("guard rails: destructive, out of scope, credentials and ads are vetoed", () => {
  assert.match(guardReason({ text: "Log out" }, 'tap "Log out"', "tap")!, /destructive/);
  assert.match(guardReason({ identifier: "app:id/btn_logout" }, "tap", "tap")!, /destructive/);
  assert.match(guardReason({ text: "Share" }, "tap", "tap")!, /out of scope/);
  assert.match(guardReason({ label: "Voice message" }, "tap", "tap")!, /out of scope/);
  assert.match(guardReason({ label: "Audio Button: Tap twice or hold to record." }, "tap", "tap")!, /out of scope/);
  // "Rate us" only opens the store or a browser: tapped, recorded as an external surface, and left
  assert.equal(guardReason({ text: "Rate us" }, 'tap "Rate us"', "tap"), undefined);
  assert.equal(guardReason({ text: "Edit a photo" }, 'tap "Edit a photo"', "tap"), undefined);
  assert.match(guardReason({ text: "Password" }, "type", "type-send")!, /credential/);
  assert.match(guardReason({ text: "Sponsored", ad: true }, "tap", "tap")!, /ad/);
  assert.equal(guardReason({ text: "Store" }, 'tap "Store"', "tap"), undefined);
  assert.equal(guardReason({ text: "Message" }, "type a short message and send it", "consume"), undefined);
  assert.ok(isGuardSkip(guardReason({ text: "Delete account" }, "", "tap")));
});

test("classifyForeground maps packages and passes WebDevice ext:<kind> through", () => {
  const app = "com.example.fakechat";
  assert.equal(classifyForeground(app, app), "in-app");
  assert.equal(classifyForeground("web", app), "in-app");
  assert.equal(classifyForeground("com.android.vending", app), "billing");
  assert.equal(classifyForeground("com.google.android.gms", app), "signin");
  assert.equal(classifyForeground("com.android.chrome", app), "browser");
  assert.equal(classifyForeground("com.google.android.permissioncontroller", app), "permission");
  assert.equal(classifyForeground("com.google.android.documentsui", app), "picker");
  assert.equal(classifyForeground("com.android.settings", app), "settings");
  assert.equal(classifyForeground("com.google.android.apps.nexuslauncher", app), "launcher");
  assert.equal(classifyForeground("android", app), "crash");
  assert.equal(classifyForeground("ext:billing", app), "billing");
  assert.equal(classifyForeground("ext:weird", app), "other");
});

test("safe taps: half-hidden rows are tapped on their visible part, mostly hidden ones need a scroll", () => {
  // centre at y=2284 is inside the 126 px navigation bar; 45% of the row is visible
  const half = safeTap({ x: 42, y: 2184, w: 996, h: 200 }, INFO);
  assert.ok(half.point && half.point.y < H - NAV && half.point.y > 2184);
  const hidden = safeTap({ x: 42, y: 2250, w: 996, h: 150 }, INFO);
  assert.equal(hidden.point, undefined);
  assert.equal(hidden.scroll, "up");
  assert.ok(hidden.visible < 0.4);
});

test("heuristic annotator: tab + balance, store, chat with a consume action, and the wall sheet", async () => {
  const fake = new FakeCreditChat();
  const home = await obsOf(fake);
  const h = heuristicAnnotation(home, { info: INFO });
  assert.equal(h.kind, "tab");
  assert.equal(h.name, "Stories");
  assert.deepEqual(h.counters.map(c => c.name), ["credits"]);
  assert.ok(h.signals.some(s => s.kind === "ad" && s.text === "Sponsored"));
  assert.ok(!h.actions.some(a => a.el && home.elements.find(e => e.id === a.el)?.ad), "no ad actions");
  const storeTab = h.actions.find(a => a.intent.includes('"Store"'))!;
  assert.equal(storeTab.priority, 3);

  fake.stack = ["store"];
  assert.equal(heuristicAnnotation(await obsOf(fake), { info: INFO }).kind, "store");

  fake.stack = ["profile"];
  const prof = await obsOf(fake);
  const profActs = toActions(heuristicAnnotation(prof, { info: INFO }).actions, prof, 3);
  const logout = profActs.find(a => a.elKey?.includes("log out"))!;
  assert.equal(logout.status, "skipped");
  assert.match(logout.skip!, /^guard: destructive/);
  assert.equal(profActs[profActs.length - 1].kind, "back");

  await toChat(fake);
  const chat = await obsOf(fake);
  const c = heuristicAnnotation(chat, { info: INFO });
  assert.equal(c.kind, "chat");
  assert.equal(c.name, "Mara");
  const consume = c.actions.find(a => a.kind === "consume")!;
  assert.equal(chat.elements.find(e => e.id === consume.el)!.identifier, "app:id/input");
  const mic = toActions(c.actions, chat, 5).find(a => a.elKey?.includes("voice message"))!;
  assert.equal(mic.status, "skipped");

  fake.wall = true;
  const wall = await obsOf(fake);
  const w = heuristicAnnotation(wall, { info: INFO, prev: chat });
  assert.equal(w.kind, "sheet");
  assert.equal(w.name, "Out of credits");
  assert.ok(w.signals.some(s => s.kind === "limit"));
  assert.ok(w.actions.every(a => !a.el || /sheet|refill|dismiss/.test(wall.elements.find(e => e.id === a.el)!.identifier ?? "")), "only the sheet's own elements");
});

test("identity: another item on the same template matches via sameAs; a sheet on top does not", async () => {
  const fake = new FakeCreditChat();
  fake.stack = ["home", "detail"];
  fake.story = 0;
  const a = await obsOf(fake);
  fake.story = 1;
  const b = await obsOf(fake);
  const s1 = stateOf(a);
  const m = matchState([s1], b);
  assert.equal(m.how, "none");
  assert.deepEqual(m.borderline.map(s => s.id), ["s01"]);
  assert.ok(templateSame(a.signature, b.signature));
  assert.equal(heuristicAnnotation(b, { info: INFO, candidates: m.borderline }).sameAs, "s01");

  await toChat(fake);
  const chat = await obsOf(fake);
  fake.wall = true;
  const wall = await obsOf(fake);
  assert.ok(!templateSame(chat.signature, wall.signature));
  const mw = matchState([stateOf(chat, "s05", "chat")], wall);
  assert.equal(mw.state, undefined);
  assert.ok(jaccard(new Set(chat.signature), new Set(wall.signature)) < 0.85);
});

test("Send is found only after typing (mic before), never the mic", async () => {
  const fake = new FakeCreditChat();
  await toChat(fake);
  const before = await obsOf(fake);
  const field = before.elements.find(e => e.identifier === "app:id/input")!;
  assert.equal(findSend(before.elements, field, "Hi!"), undefined, "the mic is not a send button");
  fake.focused = true;
  await fake.typeText("Hi!");
  const after = await obsOf(fake);
  const typed = after.elements.find(e => e.identifier === "app:id/input")!;
  assert.equal(findSend(after.elements, typed, "Hi!")!.label, "Send");
});

test("effects: a repeated reply still counts as appeared; bound counters give deltas", async () => {
  const fake = new FakeCreditChat();
  await toChat(fake);
  fake.setMessages(12);
  const before = await obsOf(fake);
  fake.messages.push({ me: true, text: "Hi! What happens next?" }, { me: false, text: fake.messages[fake.messages.length - 2].text });
  const after = await obsOf(fake, newExclusions(), "o0002");
  const fx = diffEffects(before, after, new Set());
  assert.ok(fx.some(f => f.kind === "appeared"), JSON.stringify(fx));

  const home = new FakeCreditChat();
  const h1 = await obsOf(home);
  const res = [{ id: "r1", name: "credits", unit: "credits", bindings: [{ state: "s01", elKey: "TextView|app:id/balance|# credits|0" }] }];
  h1.counters = readCounters(h1.elements, res);
  home.balance = 90;
  const h2 = await obsOf(home, newExclusions(), "o0002");
  h2.counters = readCounters(h2.elements, res);
  assert.deepEqual(diffEffects(h1, h2, new Set(["TextView|app:id/balance|# credits|0"])).filter(f => f.kind === "counter"),
    [{ kind: "counter", resource: "r1", before: 120, after: 90, delta: -30 }]);
});

test("wall test (T2): a different chat state is not a wall; a sheet or a screen showing a limit, price or gate is", () => {
  const base = { signature: [], dhash: "", obs: [], name: "", purpose: "", inScope: true, scrollable: false, loginWall: false, annotatedBy: "heuristic" as const, actions: [], visits: 1, firstStep: 0 };
  const chat: State = { ...base, id: "s05", kind: "chat", signals: [{ kind: "upsell", text: "Premium · 30" }] };
  const chat2: State = { ...base, id: "s07", kind: "chat", signals: [{ kind: "upsell", text: "Premium · 30" }] };
  const sheet: State = { ...base, id: "s08", kind: "sheet", signature: ["TextView||out of credits"], signals: [{ kind: "limit", text: "Out of credits" }] };
  const limited: State = { ...base, id: "s09", kind: "chat", signals: [{ kind: "limit", text: "Daily limit reached" }] };
  const gate: State = { ...base, id: "s10", kind: "sheet", name: "Create your account to keep chatting", signature: ["TextView||create your account"], signals: [] };
  const photo: State = { ...base, id: "s11", kind: "sheet", name: "Add a photo", signature: ["TextView||add a photo", "Button||take photo"], signals: [] };
  assert.equal(isWall(chat, chat), false);
  assert.equal(isWall(chat, chat2), false);
  assert.equal(isWall(chat, sheet), true);
  assert.equal(isWall(chat, limited), true);
  assert.equal(isWall(chat, gate), true, "an account gate after a send is a wall");
  assert.equal(isWall(chat, photo), false, "a sheet asking for a photo is where the action leads, not a wall");
});

test("gap check: the stub asks for nothing, and targets never un-skip a guard rail", async () => {
  const g: ExploreGraph = {
    schema: "simula.explore-graph/1", app: { id: "x", package: "p", name: "X" }, runId: "r", device: INFO, startedAt: "",
    states: [{
      id: "s03", signature: [], dhash: "", obs: [], name: "Profile", kind: "tab", purpose: "", inScope: true, scrollable: false, loginWall: false,
      annotatedBy: "heuristic", visits: 1, firstStep: 0, signals: [],
      actions: [
        { id: "a03_1", kind: "tap", intent: "tap Log out", priority: 0, status: "skipped", tries: 0, skip: "guard: destructive" },
        { id: "a03_2", kind: "tap", intent: "tap Settings", priority: 1, status: "no-effect", tries: 1 },
      ],
    }],
    edges: [], observations: [], resources: [], externals: [], typed: [], steps: 0, stepsSinceNew: 0, usd: 0, human: [],
  };
  assert.deepEqual(await gapCheck(g, 1), []);
  const n = applyGapTargets(g, [
    { state: "s03", action: "a03_1", scroll: false, input: null, why: "try" },
    { state: "s03", action: "a03_2", scroll: true, input: null, why: "look further" },
  ]);
  assert.equal(n, 2);
  assert.equal(g.states[0].actions[0].status, "skipped");
  const retried = g.states[0].actions[1] as { status: string; priority: number };
  assert.equal(retried.status, "untried");
  assert.equal(retried.priority, 3);
  assert.ok(g.states[0].actions.some(a => a.kind === "scroll" && a.id === "a03_3"));
});

test("probe: one-screen go/no-go, insets saved to the device file", async () => {
  const tmp = tmpDir();
  const deviceFile = path.join(tmp, "device.json");
  const rep = await probe(testCtx(tmp), new FakeCreditChat(), { deviceFile });
  assert.equal(rep.inApp, true);
  assert.ok(rep.elements >= 10);
  assert.ok(rep.counters.some(c => c.name === "credits"));
  assert.deepEqual(JSON.parse(fs.readFileSync(deviceFile, "utf8")), { widthPx: W, heightPx: H, density: 2.625, statusBarPx: STATUS, navBarPx: NAV });
  assert.ok(fs.existsSync(path.join(tmp, "fakechat", "explore", "probe", "probe.json")));
  assert.ok(rep.labelledActionable >= 10, `${rep.labelledActionable} labelled actionables`);
  assert.equal(rep.go, true);
});
