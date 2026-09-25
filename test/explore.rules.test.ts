// Explorer rules added after the first fixture and real-device runs: label inheritance on a real Jetpack
// Compose screen, code-built candidate actions that the model can only re-rank, overlays and selection
// context in state identity, the T2 wall test on a mode switch, one ad signal per ad unit, the Send finder,
// --no-consume never typing, BACK from the root screen, the focus check before typing, and the probe gate.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setLlmContext } from "../src/core/llm.ts";
import { setTraceContext } from "../src/core/trace.ts";
import type { DeviceInfo, NormElement, Observation, RawElement, State } from "../src/core/schema.ts";
import { newExclusions, normalize, textsOf, type Timing } from "../src/explore/observe.ts";
import { labelOf, overlayOf, relabelOnly, signatureOf, templateSame } from "../src/explore/signature.ts";
import { adUnits, counterOf, heuristicAnnotation, isBalanceText } from "../src/explore/heuristic.ts";
import { mergeAnnotations, toActions, type Annotation } from "../src/explore/annotate.ts";
import { companionField, findSend, perform } from "../src/explore/act.ts";
import { explore, isWall, probe } from "../src/explore/explorer.ts";
import { FakeCreditChat, FAKE_PKG, FAST_TIMING, H, NAV, STATUS, W, testCtx, tmpDir } from "./helpers/explore-fake-device.ts";
import { T, TinyDevice, rect, type TinyEl } from "./helpers/explore-tiny-device.ts";

setLlmContext({ mode: "stub" });
const tmp = tmpDir("simula-explore-rules-");
setTraceContext({ app: "fakechat", run: "t-rules", stage: "explore", file: path.join(tmp, "trace.jsonl") });

const INFO: DeviceInfo = { widthPx: W, heightPx: H, density: 2.625, statusBarPx: STATUS, navBarPx: NAV, kind: "android" };

function obsFrom(raw: RawElement[], info: DeviceInfo, id = "o0001"): Observation {
  const els = normalize(raw, info, newExclusions());
  return { id, step: 0, ts: "", fg: "app", screenshot: "", elements: els, signature: signatureOf(els), dhash: "", scrollIndex: 0, counters: [], texts: textsOf(els) };
}

async function fakeObs(fake: FakeCreditChat, id = "o0001"): Promise<Observation> {
  return obsFrom(await fake.elements(), INFO, id);
}

function bare(id: string, kind: State["kind"], signature: string[], signals: State["signals"] = [], obs: string[] = []): State {
  return { id, signature, dhash: "", obs, name: id, kind, purpose: "", inScope: true, scrollable: false, loginWall: false, annotatedBy: "heuristic", actions: [], signals, visits: 1, firstStep: 0 };
}

// ---------------------------------------------------------------------------------------------------------
test("real Compose chat home: chips take the words drawn inside them; icons, the composer + and the input are candidates; audio is guarded", () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const real = JSON.parse(fs.readFileSync(path.join(here, "helpers", "explore-real-chat-home.json"), "utf8")) as { device: DeviceInfo; elements: RawElement[] };
  const obs = obsFrom(real.elements, real.device);
  const byText = (t: string) => obs.elements.find(e => e.text === t)!;
  // the unlabeled clickable View around "Create an image" is keyed by those words
  const chip = obs.elements.find(e => !e.text && !e.label && e.rect.x === 42 && e.rect.y === 1247)!;
  assert.equal(chip.key, "View||create an image|0");
  const ann = heuristicAnnotation(obs, { info: real.device });
  assert.equal(ann.kind, "chat");
  const acts = toActions(ann.actions, obs, 1);
  const elOf = (key?: string) => obs.elements.find(e => e.key === key);
  const chips = ["Create an image", "Edit a photo", "Animate a photo", "Help with math", "Talk about life"];
  for (const c of chips) {
    const a = acts.find(x => x.intent.includes(`"${c}"`));
    assert.ok(a, `chip "${c}" is a candidate`);
    assert.equal(elOf(a.elKey)?.type, "android.view.View", `"${c}" is tapped on the chip, not on its text`);
    assert.equal(a.status, "untried", `"${c}" is tried (all members of a small group of distinct labels)`);
  }
  // the text inside a chip is part of the chip, not a second action
  assert.ok(!acts.some(a => a.elKey === byText("Create an image").key));
  // unlabeled icon buttons in the bars: the menu at top-left and the composer "+"
  assert.ok(acts.some(a => /unlabeled icon at top-left/.test(a.intent) && a.status === "untried"));
  assert.ok(acts.some(a => /unlabeled icon at bottom-left \(button Add Composer\)/.test(a.intent)));
  // the hint drawn inside the field is part of the field; the field is a spending send on a chat
  assert.ok(!acts.some(a => a.elKey === byText("Ask Luzia").key));
  assert.ok(acts.some(a => a.kind === "consume" && elOf(a.elKey)?.type === "android.widget.EditText"));
  // the audio control (and its unlabeled container) is never tapped
  const audio = acts.filter(a => /audio button/i.test(a.intent));
  assert.ok(audio.length >= 1 && audio.every(a => a.status === "skipped" && /^guard: out of scope/.test(a.skip ?? "")));
  assert.ok(!acts.some(a => a.status === "untried" && elOf(a.elKey)?.rect.x === 933 && elOf(a.elKey)?.rect.y === 2133), "the audio container is not an untried icon");
});

test("the model advises, code decides: its actions re-rank, rename or skip code's candidates, never remove them", () => {
  const code: Annotation = {
    sameAs: null, name: "Home", kind: "page", purpose: "", inScope: true, scrollable: false, loginWall: false, counters: [], signals: [],
    actions: [
      { el: "e1", intent: 'tap "A"', kind: "tap", priority: 1 },
      { el: "e2", intent: 'tap "B"', kind: "tap", priority: 3 },
      { el: "e3", intent: "type a short text and submit it", kind: "type-send", priority: 2, input: "Hi" },
      { el: "e4", intent: "tap the unlabeled icon at top-left", kind: "tap", priority: 1 },
    ],
  };
  const model: Annotation = {
    ...code, name: "Recipes", kind: "tab",
    actions: [
      { el: "e2", intent: "open the premium store", kind: "tap", priority: 0, skip: "looks like a purchase button" },
      { el: "e3", intent: "send a chat message", kind: "consume", priority: 3 },
      { el: null, intent: "tap the canvas play button", kind: "tap", priority: 2, tapPoint: { x: 10, y: 20 } },
    ],
  };
  const m = mergeAnnotations(code, model);
  assert.equal(m.name, "Recipes");
  assert.equal(m.actions.length, 5, "every code candidate stays, plus the model's extra tap point");
  assert.deepEqual(m.actions.find(a => a.el === "e2"), { el: "e2", intent: "open the premium store", kind: "tap", priority: 0, skip: "looks like a purchase button" });
  const field = m.actions.find(a => a.el === "e3")!;
  assert.equal(field.kind, "consume");
  assert.equal(field.priority, 3);
  assert.equal(field.input, "Hi");
  assert.ok(m.actions.find(a => a.el === "e1") && m.actions.find(a => a.el === "e4"), "elements the model left out are still tried");
});

test("overlays: what sits on top of a screen (opened, or in reverse closed); replies below the last message are not overlays", async () => {
  const fake = new FakeCreditChat();
  fake.stack = ["home", "detail", "chat"];
  const chat = await fakeObs(fake);
  fake.wall = true;
  const wall = await fakeObs(fake, "o0002");
  // overlayOf(top, base): after an action, overlayOf(after, before) = what opened; overlayOf(before, after) = what closed
  const sheet = overlayOf(wall, chat, INFO);
  assert.ok(sheet, "the Out of credits sheet sits on top of the chat");
  assert.deepEqual(sheet.map(e => e.text ?? e.identifier).sort(), ["Not now", "Out of credits", "Refill now", "You need 10 credits to send a message.", "app:id/sheet"].sort());
  assert.equal(overlayOf(chat, wall, INFO), null, "the chat does not sit on top of the sheet");
  fake.wall = false;
  fake.messages.push({ me: true, text: "Hi! What happens next?" }, { me: false, text: "The lamp goes out. Somebody is on the stairs." });
  assert.equal(overlayOf(await fakeObs(fake, "o0003"), chat, INFO), null, "a reply is not an overlay");
});

test("templateSame: another item (label swaps) and labels scrolled away are the same template; labels added on top are not", () => {
  const chatA = ["Button||back", "TextView||ml", "TextView||the midnight library", "TextView||today", "Button|web:id/composer_action|voice input", "EditText|web:id/chat_input", "TextView|"];
  const chatB = ["Button||back", "TextView||ll", "TextView||the last lighthouse", "TextView||today", "Button|web:id/composer_action|voice input", "EditText|web:id/chat_input", "TextView|"];
  assert.ok(templateSame(chatA, chatB), "another story's chat: title and avatar swapped");
  const scrolledDraft = chatA.filter(t => t !== "TextView||today").map(t => (t.endsWith("voice input") ? "Button|web:id/composer_action|send" : t));
  assert.ok(templateSame(chatA, scrolledDraft), "the date separator scrolled away, the mic became Send");
  assert.ok(!templateSame(chatA, [...chatA, "TextView||choose a mode"]), "a sheet title added on top");
  assert.ok(!templateSame(["Button|x|home|sel", "Button|x|store"], ["Button|x|home", "Button|x|store|sel"]), "another selected tab");
  // the wall test's looser question: a relabelled control on the same element is the same screen
  const basic = ["Button||back", "Button|web:id/mode_chip|basic · #", "TextView||ml"];
  const premium = ["Button||back", "Button|web:id/mode_chip|premium · #", "TextView||ml"];
  assert.ok(!templateSame(basic, premium), "premium is wall vocabulary: not the same item for identity");
  assert.ok(relabelOnly(basic, premium), "but the same screen with its chip relabelled");
  assert.ok(!relabelOnly(basic, [...premium, "TextView||out of credits"]));
});

test("wall test (T2): a mode switch is never a wall, even when the new label says Premium; an overlay or a new limit is", () => {
  const els = (chip: string): NormElement[] => [
    { type: "android.widget.Button", text: chip, identifier: "web:id/mode_chip", rect: rect(752, 95, 296, 84), id: "e1", key: `Button|web:id/mode_chip|${chip.toLowerCase()}|0`, chrome: true },
    { type: "android.widget.TextView", text: "ML", rect: rect(147, 89, 95, 95), id: "e2", key: "TextView||ml|0", chrome: true },
  ];
  const o = (id: string, chip: string): Observation => ({ id, step: 0, ts: "", fg: "web", screenshot: "", elements: els(chip), signature: signatureOf(els(chip)), dhash: "", scrollIndex: 0, counters: [], texts: [] });
  const ob = o("o1", "Basic · 10");
  const op = o("o2", "Premium · 30");
  const basic = bare("s05", "chat", ob.signature, [], ["o1"]);
  const premium = bare("s06", "chat", op.signature, [{ kind: "upsell", text: "Premium · 30", el: "e1" }], ["o2"]);
  assert.equal(isWall(basic, premium, { fromObs: ob, nextObs: op }), false, "the upsell sits on the chip the chat already had");
  assert.equal(isWall(basic, bare("s07", "sheet", [...ob.signature, "TextView||out of credits"], [{ kind: "limit", text: "Out of credits" }])), true);
  assert.equal(isWall(basic, bare("s08", "chat", ["x"], [{ kind: "limit", text: "Daily limit reached" }])), true);
  assert.equal(isWall(basic, bare("s09", "page", ["TextView||plans"], [{ kind: "price", text: "$4.99 / month" }])), true, "a new screen with prices");
  assert.equal(isWall(basic, bare("s10", "page", ["TextView||your image"])), false, "a result page with no limit, price or gate is not a wall");
});

test("one ad signal per ad unit (the Sponsored marker), however many texts it holds", async () => {
  const home = await fakeObs(new FakeCreditChat());
  assert.deepEqual(adUnits(home.elements).map(u => u.text), ["Sponsored"]);
  const ann = heuristicAnnotation(home, { info: INFO });
  assert.deepEqual(ann.signals.filter(s => s.kind === "ad").map(s => s.text), ["Sponsored"]);
  assert.equal(home.elements.find(e => e.id === ann.signals.find(s => s.kind === "ad")!.el)!.identifier, "app:id/promo_card", "the unit, not a text inside it");
});

test("findSend: only on the field's row; a named control first, else the control that appeared with the typing", () => {
  const el = (id: string, type: string, r: ReturnType<typeof rect>, extra: Partial<NormElement> = {}): NormElement => ({ type: T(type), rect: r, id, key: id, chrome: true, ...extra });
  const field = el("f", "EditText", rect(42, 2028, 850, 126), { text: "Hi!" });
  const avatar = el("a", "ImageButton", rect(147, 153, 105, 105), { label: "Send a gift" });
  const plus = el("p", "Button", rect(21, 2133, 126, 126), { identifier: "buttonAddComposer" });
  const mic = el("m", "View", rect(933, 2040, 126, 126), { label: "Record audio" });
  const arrow = el("s", "View", rect(933, 2040, 126, 126));
  assert.equal(findSend([avatar, field, plus, mic], field, "Hi!", [avatar, field, plus, mic]), undefined, "never the header, never the mic; nothing new: press ENTER");
  const before = [avatar, field, plus, mic];
  assert.equal(findSend([avatar, field, plus, arrow], field, "Hi!", before)?.id, "s", "the unlabeled control that replaced the mic");
  const named = el("n", "ImageButton", rect(933, 2040, 126, 126), { label: "Send" });
  assert.equal(findSend([avatar, field, plus, named], field, "Hi!", before)?.id, "n");
  // a standalone tap on a Send control next to a field is not a candidate on its own (it would send a draft)
  const obs = { id: "o1", step: 0, ts: "", fg: "x", screenshot: "", elements: [field, named].map((e, i) => ({ ...e, id: `e${i + 1}`, key: `k${i}` })), signature: [], dhash: "", scrollIndex: 0, counters: [], texts: [] } as Observation;
  const [send] = toActions([{ el: "e2", intent: 'tap "Send"', kind: "tap", priority: 2 }], obs, 1, { withBack: false });
  assert.equal(send.status, "skipped");
  assert.match(send.skip!, /send control/);
});

test("probe: a sparse first screen (a greeting, a few chips, an input, no number) is GO, with warnings", async () => {
  const d = new TinyDevice(FAKE_PKG, {
    home: () => [
      { type: T("TextView"), text: "What are we doing today?", rect: rect(184, 772, 712, 73) },
      { type: T("TextView"), text: "Create an image", rect: rect(158, 1287, 280, 46) },
      { type: T("TextView"), text: "Help with math", rect: rect(158, 1436, 280, 46) },
      { type: T("TextView"), text: "Talk about life", rect: rect(158, 1585, 280, 46) },
      { type: T("EditText"), rect: rect(42, 2028, 996, 126) },
    ],
  }, "home");
  const dir = tmpDir();
  const rep = await probe(testCtx(dir), d, { deviceFile: path.join(dir, "device.json") });
  assert.equal(rep.go, true);
  assert.ok(rep.checks.some(k => !k.gate && !k.pass && /10 labelled/.test(k.name)), "fewer than 10 actionables is a warning");
  assert.ok(rep.checks.some(k => !k.gate && !k.pass && /number/.test(k.name)), "no number is a warning");
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, "device.json"), "utf8")).statusBarPx, STATUS, "insets written from dev.info()");
});

// ---------------------------------------------------------------------------------------------------------
// Behaviour on tiny scripted devices
// ---------------------------------------------------------------------------------------------------------
function searchApp(): TinyDevice {
  const focus = { on: false };
  const d: TinyDevice = new TinyDevice(FAKE_PKG, {
    search: dev => [
      { type: T("TextView"), text: "Recipes", rect: rect(42, 110, 400, 100) },
      { type: T("EditText"), text: dev.typed.at(-1) ?? "Search recipes", identifier: "app:id/q", rect: rect(42, 300, 800, 130), ...(focus.on ? { focused: true } : {}), tap: () => { focus.on = true; } },
      { type: T("Button"), text: "Go", identifier: "app:id/go", rect: rect(870, 300, 168, 130) },
      { type: T("TextView"), text: "Popular this week", rect: rect(42, 600, 600, 80) },
      { type: T("TextView"), text: "Tomato soup", rect: rect(42, 720, 600, 80), tap: () => { dev.screen = "soup"; } },
    ],
    soup: dev => [
      { type: T("ImageButton"), label: "Navigate up", rect: rect(0, 70, 147, 147), tap: () => { dev.screen = "search"; } },
      { type: T("TextView"), text: "Tomato soup", rect: rect(189, 100, 600, 100) },
      { type: T("TextView"), text: "Ingredients", rect: rect(42, 400, 600, 80) },
    ],
  }, "search");
  d.onBack = dev => { dev.screen = "search"; };
  return d;
}

test("--no-consume never types: a type-and-submit on a search field is skipped too", async () => {
  const d = searchApp();
  const { graph } = await explore(testCtx(tmpDir(), "ex-rules-nc"), d, { annotator: "heuristic", noConsume: true, steps: 12, timing: FAST_TIMING });
  assert.deepEqual(d.typed, [], "nothing typed");
  const fields = graph.states.flatMap(s => s.actions).filter(a => a.kind === "type-send" || a.kind === "consume");
  assert.ok(fields.length >= 1);
  for (const a of fields) { assert.equal(a.status, "skipped"); assert.match(a.skip ?? "", /^no-consume/); }
  // and without --no-consume the same field is typed into (after it took the focus) and submitted
  const d2 = searchApp();
  await explore(testCtx(tmpDir(), "ex-rules-c"), d2, { annotator: "heuristic", steps: 12, timing: FAST_TIMING });
  assert.ok(d2.typed.length >= 1, "typed when spending is allowed");
});

test("BACK on the root screen that brings another app to the front: ext:launcher once, relaunch, never BACK inside the other app", async () => {
  const d = new TinyDevice(FAKE_PKG, {
    home: dev => [
      { type: T("TextView"), text: "Kitchen", rect: rect(42, 110, 400, 100) },
      { type: T("Button"), text: "Recipes", rect: rect(42, 500, 400, 140), tap: () => { dev.screen = "list"; } },
    ],
    list: dev => [
      { type: T("ImageButton"), label: "Navigate up", rect: rect(0, 70, 147, 147), tap: () => { dev.screen = "home"; } },
      { type: T("TextView"), text: "All recipes", rect: rect(189, 100, 600, 100) },
    ],
  }, "home");
  d.onBack = dev => { if (dev.screen === "home") dev.fg = "com.example.news"; else dev.screen = "home"; };
  const { graph } = await explore(testCtx(tmpDir(), "ex-rules-back"), d, { annotator: "heuristic", steps: 12, timing: FAST_TIMING });
  const left = graph.edges.filter(e => e.to === "ext:launcher");
  assert.equal(left.length, 1, JSON.stringify(graph.edges.map(e => `${e.from}-${e.action}->${e.to}`)));
  assert.equal(left[0].seen, 1);
  const back = graph.states.flatMap(s => s.actions).find(a => a.id === left[0].action)!;
  assert.equal(back.kind, "back");
  assert.equal(back.status, "done");
  assert.ok(graph.externals.some(x => x.kind === "launcher" && x.package === "com.example.news"));
  assert.equal(d.backsOutsideApp, 0, "never pressed BACK inside the other app");
  assert.ok(d.launches >= 2, "relaunched the app");
  assert.equal(d.fg, FAKE_PKG);
});

test("type-and-send checks that the field took the focus: if the tap opened something else, nothing is typed", async () => {
  const d = new TinyDevice(FAKE_PKG, {
    chat: dev => [
      { type: T("TextView"), text: "Assistant", rect: rect(189, 100, 600, 100) },
      { type: T("TextView"), text: "Hello there! I am here for you whenever you want.", rect: rect(42, 600, 800, 160) },
      // tapping the field opens a profile sheet instead of focusing it
      { type: T("EditText"), text: "Message", rect: rect(42, 2028, 850, 126), tap: () => { dev.screen = "profile"; } },
    ],
    profile: dev => [
      { type: T("TextView"), text: "Character profile", rect: rect(42, 1500, 800, 100) },
      { type: T("EditText"), text: "Nickname", focused: true, rect: rect(42, 1700, 996, 126) },
      { type: T("Button"), text: "Close", rect: rect(42, 1900, 400, 126), tap: () => { dev.screen = "chat"; } },
    ],
  }, "chat");
  d.onBack = dev => { dev.screen = "chat"; };
  // one step: the send on the chat (the sheet it opened has a field of its own, explored as its own state later)
  const { graph } = await explore(testCtx(tmpDir(), "ex-rules-focus"), d, { annotator: "heuristic", steps: 1, timing: FAST_TIMING });
  assert.deepEqual(d.typed, [], "never typed into the sheet's field");
  const send = graph.states.flatMap(s => s.actions).find(a => a.kind === "consume")!;
  assert.equal(send.status, "failed");
  assert.match(send.note ?? "", /gave the focus to another text field/);
});

// ---------------------------------------------------------------------------------------------------------
// A guest AI chat: no balance anywhere, a free-message cap shown in the conversation after CAP sends, a
// sign-up sheet behind a "Deep reasoning" chip (a non-consume tap), and an image tool whose send meets a
// sign-up gate (a wall on ANOTHER spending action). The drain must still repeat the chat's send and find the cap.
// ---------------------------------------------------------------------------------------------------------
const CAP = 4;
function guestChat(): TinyDevice & { sends: number; msgs: { me: boolean; text: string }[] } {
  const st = { draft: "", focused: false, overlay: "" as "" | "reasoning" | "imagegate", sends: 0, msgs: [{ me: false, text: "Hi there, I am your assistant for anything at all." }] as { me: boolean; text: string }[] };
  const REPLIES = ["That sounds like a plan, tell me a little more about it.", "Here is an idea: start with the smallest useful piece first.", "Good question, it mostly depends on your goal for today.", "I would begin by writing down the three most important steps."];
  const sheet = (lines: TinyEl[]): TinyEl[] => [{ type: "android.view.View", rect: rect(0, 1400, 1080, 874) }, ...lines];
  const composer = (dev: TinyDevice, hint: string, onSend: () => void): TinyEl[] => [
    { type: T("EditText"), text: st.draft || hint, rect: rect(42, 2028, 850, 126), ...(st.focused ? { focused: true } : {}), tap: () => { st.focused = true; } },
    st.draft
      ? { type: T("ImageButton"), label: "Send", rect: rect(900, 2028, 140, 126), tap: () => { onSend(); st.draft = ""; } }
      : { type: T("ImageButton"), label: "Voice message", rect: rect(900, 2028, 140, 126) },
  ];
  const d = new TinyDevice(FAKE_PKG, {
    chat: dev => {
      const bubbles: TinyEl[] = st.msgs.slice(-6).map((m, i) => ({ type: T("TextView"), text: m.text, rect: rect(m.me ? 1038 - 600 : 42, 520 + i * 200, 600, 160) }));
      const els: TinyEl[] = [
        { type: T("TextView"), text: "Assistant", rect: rect(189, 100, 400, 100) },
        { type: T("Button"), text: "Deep reasoning", rect: rect(700, 105, 340, 90), tap: () => { st.overlay = "reasoning"; } },
        { type: T("Button"), text: "Create image", rect: rect(42, 300, 400, 110), tap: () => { dev.screen = "image"; st.focused = false; } },
        ...bubbles,
        ...composer(dev, "Message", () => {
          st.sends++;
          st.msgs.push({ me: true, text: st.draft });
          st.msgs.push({ me: false, text: st.sends <= CAP ? REPLIES[(st.sends - 1) % REPLIES.length] : "You've used your free messages. Sign up to keep chatting." });
        }),
      ];
      if (st.overlay === "reasoning") els.push(...sheet([
        { type: T("TextView"), text: "Sign up to use deep reasoning", rect: rect(60, 1500, 960, 100) },
        { type: T("Button"), text: "Create your account", rect: rect(60, 1650, 960, 140) },
        { type: T("Button"), text: "Maybe later", rect: rect(60, 1820, 960, 120), tap: () => { st.overlay = ""; } },
      ]));
      return els;
    },
    image: dev => {
      const els: TinyEl[] = [
        { type: T("ImageButton"), label: "Navigate up", rect: rect(0, 70, 147, 147), tap: () => { dev.screen = "chat"; st.overlay = ""; st.focused = false; } },
        { type: T("TextView"), text: "Image studio", rect: rect(189, 100, 600, 100) },
        { type: T("TextView"), text: "Popular styles this week", rect: rect(42, 900, 700, 90) },
        ...composer(dev, "Describe your image", () => { st.overlay = "imagegate"; }),
      ];
      if (st.overlay === "imagegate") els.push(...sheet([
        { type: T("TextView"), text: "Sign up to create images", rect: rect(60, 1500, 960, 100) },
        { type: T("Button"), text: "Create your account", rect: rect(60, 1650, 960, 140) },
        { type: T("Button"), text: "Not now", rect: rect(60, 1820, 960, 120), tap: () => { st.overlay = ""; } },
      ]));
      return els;
    },
  }, "chat") as TinyDevice & { sends: number; msgs: typeof st.msgs };
  d.onBack = dev => { if (st.overlay) st.overlay = ""; else if (dev.screen === "image") dev.screen = "chat"; st.focused = false; };
  const type = d.typeText.bind(d);
  d.typeText = async (text: string) => { await type(text); if (st.focused) st.draft += text; };
  Object.defineProperty(d, "sends", { get: () => st.sends });
  Object.defineProperty(d, "msgs", { get: () => st.msgs });
  return d;
}

test("guest chat: walls on other actions do not stop the drain, which sends until the free-message cap and records after how many sends", async () => {
  const d = guestChat();
  const { graph: g } = await explore(testCtx(tmpDir(), "ex-rules-cap", { crawlSteps: 30 }), d, { annotator: "heuristic", timing: FAST_TIMING });
  const actionOf = (e: { from: string; action: string }) => g.states.find(s => s.id === e.from)!.actions.find(a => a.id === e.action)!;
  const stateOf = (id: string) => g.states.find(s => s.id === id)!;
  assert.equal(g.resources.length, 0, "no balance anywhere");
  // the image tool's send met a sign-up gate: a wall on that action
  const imageWall = g.edges.find(e => e.limitHit && stateOf(e.from).name === "Image studio");
  assert.ok(imageWall, "the image tool's gate is a wall");
  // the deep-reasoning chip opened a sign-up sheet by a plain tap: not a limit
  assert.ok(g.edges.some(e => actionOf(e).kind === "tap" && /deep reasoning/i.test(actionOf(e).intent) && !e.limitHit
    && ["sheet", "dialog", "login"].includes(stateOf(e.to)?.kind)), "the sign-up sheet behind the chip");
  // ...and the chat's own send was still drained until the cap showed in the conversation
  const chat = g.states.find(s => s.name === "Assistant")!;
  const cap = g.edges.find(e => e.limitHit && e.from === chat.id);
  assert.ok(cap, JSON.stringify(g.edges.filter(e => e.limitHit)));
  assert.equal(actionOf(cap).kind, "consume");
  assert.equal(cap.to, chat.id, "the cap is a message in the chat itself");
  assert.ok(cap.effects.some(f => f.kind === "appeared" && f.text === `limit after ${CAP} sends`), JSON.stringify(cap.effects));
  assert.match(actionOf(cap).note ?? "", new RegExp(`limit after ${CAP} sends`));
  assert.equal(d.sends, CAP + 1, "stopped at the first blocked send");
});

test("typing: text that does not land in the field is never sent (BACK hides the keyboard, the action fails)", async () => {
  const st = { search: "" };
  const d = new TinyDevice(FAKE_PKG, {
    chat: () => [
      { type: T("TextView"), text: `Recent: ${st.search || "none"}`, rect: rect(42, 250, 996, 110) },
      { type: T("TextView"), text: "Assistant", rect: rect(189, 100, 400, 100) },
      { type: T("TextView"), text: "Hello there! I am here for you whenever you want.", rect: rect(42, 600, 800, 160) },
      // the composer never reports focus and never receives the keys: they show up at the top instead
      { type: T("EditText"), text: "Message", rect: rect(42, 2028, 850, 126) },
      { type: T("ImageButton"), label: "Send", rect: rect(900, 2028, 140, 126) },
    ],
  }, "chat");
  const type = d.typeText.bind(d);
  d.typeText = async (text: string) => { await type(text); st.search += text; };
  const { graph } = await explore(testCtx(tmpDir(), "ex-rules-land"), d, { annotator: "heuristic", steps: 1, timing: FAST_TIMING });
  const send = graph.states.flatMap(s => s.actions).find(a => a.kind === "consume" && /message/i.test(a.elKey ?? ""))!;
  assert.equal(send.status, "failed");
  assert.match(send.note ?? "", /did not land in the field/);
  assert.equal(d.backs, 1, "BACK once, to hide the keyboard");
  assert.equal(d.enters, 0);
  assert.ok(!d.taps.some(t => t.label === "Send"), "never sent");
});

test("trajectory: a failure pairs with the later recovery of the same `where`, per run; others read 'no recovery (continued)'", async () => {
  const { summarize } = await import("../src/core/trace.ts");
  const dir = tmpDir();
  const file = path.join(dir, "trace.jsonl");
  const ev = (run: string, type: string, data: Record<string, unknown>, s: number) =>
    JSON.stringify({ ts: `2026-09-25T10:00:${String(s).padStart(2, "0")}.000Z`, app: "x", run, stage: "explore", step: s, type, data });
  fs.writeFileSync(file, [
    ev("r1", "failure", { where: "travel:g0007", error: "expected s03, landed on s05" }, 1),
    ev("r1", "decision", { state: "s05", action: "a05_1", priority: 1 }, 2),
    ev("r1", "recovery", { where: "travel:g0007", how: "re-planned from s05 (no relaunch)" }, 3),
    ev("r1", "failure", { where: "act:a02_3", error: "element not found on screen" }, 4),
    ev("r1", "recovery", { where: "observe", how: "cold relaunch after repeated observe failures" }, 5),
    ev("r2", "failure", { where: "annotate", error: "refusal" }, 6),
    ev("r2", "recovery", { how: "heuristic annotator" }, 7),
  ].join("\n") + "\n");
  const md = summarize(file, path.join(dir, "trajectory.md"));
  assert.match(md, /### explore · run r1/);
  assert.match(md, /### explore · run r2/);
  assert.match(md, /travel:g0007\*\*: expected s03, landed on s05\n {2}- recovered: re-planned from s05/);
  assert.match(md, /act:a02_3\*\*: element not found on screen\n {2}- no recovery \(continued\)/, "an unrelated recovery is not paired");
  assert.match(md, /annotate\*\*: refusal\n {2}- recovered: heuristic annotator/, "the very next event, a recovery without a where of its own");
});

// ---------------------------------------------------------------------------------------------------------
// Spending buttons: an annotator may call a button "consume" (Claim, Start chat, Generate). It is tapped,
// not typed into; a Generate button under an empty prompt field gets the field filled first.
// ---------------------------------------------------------------------------------------------------------
const TINY_INFO: DeviceInfo = { widthPx: 1080, heightPx: 2400, density: 2.625, statusBarPx: 63, navBarPx: 126, kind: "android" };
const actCtxOf = (dev: TinyDevice) => ({ dev, info: TINY_INFO, timing: { ...FAST_TIMING, pollMs: 1 } as Timing, normalize: (raw: RawElement[]) => normalize(raw, TINY_INFO, newExclusions()) });
async function tinyObs(dev: TinyDevice): Promise<Observation> {
  return obsFrom(await dev.elements(), TINY_INFO);
}
const consumeOn = (obs: Observation, label: string, input?: string) => {
  const el = obs.elements.find(e => labelOf(e) === label)!;
  const ann: Annotation["actions"] = [{ el: el.id, intent: `tap "${label}"`, kind: "consume", priority: 3, ...(input ? { input } : {}) }];
  return toActions(ann, obs, 1, { withBack: false })[0];
};

test("a button the annotator marked consume (Claim) is tapped, never typed into", async () => {
  const st = { claimed: false };
  const d = new TinyDevice(FAKE_PKG, {
    home: () => [
      { type: T("TextView"), text: "Daily check-in", rect: rect(147, 1064, 785, 74) },
      { type: T("TextView"), text: "+300 credits", rect: rect(147, 1154, 785, 110) },
      { type: T("Button"), text: "Claim", rect: rect(147, 1377, 785, 137), tap: () => { st.claimed = true; } },
    ],
  }, "home");
  const a = consumeOn(await tinyObs(d), "Claim");
  assert.equal(a.kind, "consume");
  const res = await perform(actCtxOf(d), a);
  assert.ok(res.ok, JSON.stringify(res));
  assert.equal(st.claimed, true);
  assert.deepEqual(d.typed, []);
  assert.equal(d.enters, 0);
});

test("a Generate button under a prompt field: the empty field gets the action's text first, then the button is tapped", async () => {
  const st = { prompt: "", focused: false, generated: [] as string[] };
  const d = new TinyDevice(FAKE_PKG, {
    studio: () => [
      { type: T("TextView"), text: "Image studio", rect: rect(189, 100, 600, 100) },
      { type: T("EditText"), text: st.prompt, rect: rect(42, 1500, 996, 200), ...(st.focused ? { focused: true } : {}), tap: () => { st.focused = true; } },
      { type: T("Button"), text: "Generate", rect: rect(42, 1760, 996, 140), tap: () => { st.generated.push(st.prompt); } },
    ],
  }, "studio");
  const type = d.typeText.bind(d);
  d.typeText = async (text: string) => { await type(text); if (st.focused) st.prompt += text; };
  const a = consumeOn(await tinyObs(d), "Generate", "a red fox in the snow");
  const res = await perform(actCtxOf(d), a);
  assert.ok(res.ok, JSON.stringify(res));
  assert.deepEqual(st.generated, ["a red fox in the snow"], "tapped after the text landed");
  assert.equal(res.ok && res.typed, "a red fox in the snow");
  // a field that already holds text is left alone: just tap
  const again = await perform(actCtxOf(d), a);
  assert.ok(again.ok);
  assert.deepEqual(d.typed, ["a red fox in the snow"], "typed once");
  assert.deepEqual(st.generated, ["a red fox in the snow", "a red fox in the snow"]);
  // and the field is found for a button just below it, not for one far away or without a field
  const obs = await tinyObs(d);
  const gen = obs.elements.find(e => labelOf(e) === "Generate")!;
  assert.equal(companionField(obs.elements, gen)?.type, "android.widget.EditText");
  assert.equal(companionField(obs.elements, obs.elements.find(e => labelOf(e) === "Image studio")!), undefined);
});

test("a balance is a standalone amount: mode names with prices and rates are never counters", () => {
  for (const t of ["450 credits", "450", "Coins 120", "Balance: 1,250", "120 💎"]) assert.ok(isBalanceText(t), t);
  for (const t of ["Basic · 10", "Premium 30", "10 credits/msg", "30 credits per message", "Premium · 30", "$4.99", "2 of 5", "x3 boost"]) assert.ok(!isBalanceText(t), t);
  const chip = (text: string): NormElement => ({ type: T("Button"), text, rect: rect(700, 105, 340, 90), id: "e1", key: "k", chrome: true });
  assert.equal(counterOf(chip("Premium 30"), INFO), null, "a mode chip in the top bar is not a balance");
  assert.deepEqual(counterOf(chip("450 credits"), INFO), { name: "credits", unit: "credits" });
});

test("wall test: a spending tap that opens a chat showing its mode chip (Premium · 30) is not a wall", () => {
  const detail = bare("s05", "page", ["TextView||the midnight library", "Button||start chat"], [{ kind: "upsell", text: "Messages cost credits: Basic 10, Premium 30" }]);
  const chat = bare("s06", "chat", ["Button||back", "Button|web:id/mode_chip", "EditText|web:id/chat_input"], [{ kind: "upsell", text: "Premium · 30" }]);
  assert.equal(isWall(detail, chat), false);
  assert.equal(isWall(detail, bare("s07", "sheet", ["TextView||go premium"], [{ kind: "upsell", text: "Go Premium" }, { kind: "price", text: "$4.99" }])), true, "a paywall sheet");
});
