// A small synthetic ExploreGraph shaped like a credit-metered chat app, with real PNG screenshots
// rendered by sharp from solid rects (so tokens, crops and redaction have pixels to work on).
// State ids are deliberately NOT sNN, and firstStep order differs from declaration order, to prove
// that compile maps them to s01.. by first appearance.
//
//   check-in modal (launch) --Claim +300--> Home --card--> Story --Start chat--> Chat
//   Chat --Send (-30 Premium / -10 Basic, inferred)--> Chat ; Chat --Send, LIMIT--> Out-of-credits sheet
//   sheet --Refill now--> Store ; sheet --Not now--> Chat ; Store --pack--> ext:billing
//   Home <-> Store tabs ; Home --> Profile (email, Log out skipped, Rate us -> ext:browser)
//
// Options reproduce what real explorer runs produce and the stub synthesis must survive:
//   adCard      the sponsored card is a flagged container whose every child is flagged too, with one
//               `ad` signal per child text, referenced by element KEY (not id)
//   unmeasured  no counter effects on the sends (the balance never showed a change) and no wall: the
//               cost is only quoted by the selected mode chip
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { ExploreGraph, type Action, type NormElement, type Observation } from "../../src/core/schema.ts";
import { mask } from "../../src/core/io.ts";

export const D = 1.5; // px per dp: 360x800 dp -> 540x1200 px (small, so tests stay fast)
const W = 360, H = 800;
const TYPES = { text: "android.widget.TextView", button: "android.widget.Button", image: "android.widget.ImageView", input: "android.widget.EditText", view: "android.view.View" };
export const PURPLE = "#6C4DF6";

interface Spec {
  t: keyof typeof TYPES; s?: string; l?: string; idf?: string; r: [number, number, number, number];
  sel?: boolean; group?: string; ad?: boolean; fill?: string; ink?: string;
}
const tabs = (selected: string): Spec[] => ["Home", "Store", "Profile"].map((s, i) => ({ t: "button", s, idf: `web:id/nav_${s.toLowerCase()}`, r: [i * 120, 752, 120, 48], sel: s === selected, fill: "#F9FAFB", ink: s === selected ? PURPLE : "#6B7280" }));

const px = (n: number) => Math.round(n * D);
function keyOf(sp: Spec): string {
  const short = TYPES[sp.t].split(".").pop()!.toLowerCase();
  return `${short}|${sp.idf ?? ""}|${mask(sp.s ?? sp.l)}|0`;
}

function render(specs: Spec[], bg: string): string {
  const rects = specs.map(sp => {
    const [x, y, w, h] = sp.r.map(px);
    let out = sp.fill ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${sp.fill}"/>` : "";
    if (sp.t === "image") out += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${sp.fill ?? "#F97316"}"/><rect x="${x + w / 4}" y="${y + h / 4}" width="${w / 2}" height="${h / 3}" fill="#1D4ED8"/>`;
    else if (sp.s || sp.l) out += `<rect x="${x + 4}" y="${Math.round(y + h * 0.2)}" width="${Math.round(w * 0.6)}" height="${Math.round(h * 0.6)}" fill="${sp.ink ?? "#111111"}"/>`;
    return out;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px(W)}" height="${px(H)}"><rect width="100%" height="100%" fill="${bg}"/>${rects}</svg>`;
}

interface ObsDef { id: string; step: number; specs: Spec[]; bg?: string; counters?: { resource: string; value: number }[] }
const shots: { file: string; svg: string }[] = [];

function observation(d: ObsDef): Observation {
  const elements: NormElement[] = d.specs.map((sp, i) => ({
    id: `e${i + 1}`, key: keyOf(sp), type: TYPES[sp.t], text: sp.s, label: sp.l, identifier: sp.idf,
    rect: { x: px(sp.r[0]), y: px(sp.r[1]), w: px(sp.r[2]), h: px(sp.r[3]) },
    selected: sp.sel || undefined, chrome: (sp.s ?? sp.l ?? "").length <= 24 && !sp.group, group: sp.group, ad: sp.ad || undefined,
  }));
  shots.push({ file: `obs/${d.id}.png`, svg: render(d.specs, d.bg ?? "#FFFFFF") });
  const signature = [...new Set(elements.map(e => (e.chrome ? `${e.key.split("|").slice(0, 3).join("|")}` : e.key.split("|").slice(0, 2).join("|"))))].sort();
  return {
    id: d.id, step: d.step, ts: "2026-09-25T10:00:00Z", fg: "web.sample", screenshot: `obs/${d.id}.png`, elements, signature, dhash: "0000000000000000",
    scrollIndex: 0, counters: d.counters ?? [], texts: [...new Set(d.specs.flatMap(sp => [sp.s ?? "", sp.l ?? ""]).filter(Boolean))],
  };
}

// ---- screens -------------------------------------------------------------------------------------
const checkin: Spec[] = [
  { t: "view", r: [24, 280, 312, 230], fill: "#FFFFFF" },
  { t: "text", s: "Daily check-in", r: [40, 300, 280, 32] },
  { t: "text", s: "+300 credits", r: [40, 340, 280, 40], ink: "#16A34A" },
  { t: "text", s: "Come back every day for more", r: [40, 390, 280, 24] },
  { t: "button", s: "Claim", r: [40, 440, 280, 48], fill: PURPLE, ink: "#FFFFFF" },
];
export const AD_CARD: Spec[] = [
  { t: "view", idf: "web:id/ad_container", r: [16, 300, 328, 110], ad: true, fill: "#FEF3C7" },
  { t: "text", s: "Sponsored", r: [28, 308, 120, 18], ad: true },
  { t: "text", s: "SkyBank", r: [28, 330, 200, 24], ad: true },
  { t: "text", s: "Get 3% back on groceries", r: [28, 356, 280, 20], ad: true },
  { t: "button", s: "Learn more", r: [28, 378, 120, 28], ad: true, fill: "#1D4ED8", ink: "#FFFFFF" },
];
let adCard = false;
const home = (balance: number): Spec[] => [
  { t: "text", s: "Stories", r: [16, 40, 200, 32] },
  { t: "button", s: `${balance} credits`, idf: "web:id/balance_chip", r: [240, 40, 104, 32], fill: "#EEF2FF", ink: "#4F46E5" },
  { t: "view", s: "The Last Lighthouse", r: [16, 100, 328, 90], group: "g1", fill: "#F3F4F6" },
  { t: "image", l: "Author avatar", r: [24, 116, 56, 56] },
  { t: "view", s: "Neon Detective", r: [16, 200, 328, 90], group: "g1", fill: "#F3F4F6" },
  ...(adCard ? AD_CARD : [{ t: "view", s: "Sponsored · SkyBank", idf: "web:id/ad_container", r: [16, 300, 328, 90], group: "g1", ad: true, fill: "#FEF3C7" } as Spec]),
  ...tabs("Home"),
];
const story: Spec[] = [
  { t: "text", s: "The Last Lighthouse", r: [16, 60, 328, 32] },
  { t: "text", s: "A keeper, a storm, and a voice on the radio that knows her name.", r: [16, 100, 328, 48] },
  { t: "image", l: "Cover image", r: [0, 160, 360, 200], fill: "#0EA5E9" },
  { t: "button", s: "Start chat", r: [16, 680, 328, 52], fill: PURPLE, ink: "#FFFFFF" },
];
const chat = (mode: string, extra: Spec[] = []): Spec[] => [
  { t: "text", s: "Mara", r: [60, 40, 160, 32] },
  { t: "button", s: mode, r: [240, 40, 104, 32], sel: true, fill: "#EDE9FE", ink: PURPLE },
  { t: "text", s: "The lamp flickers. Who's there?", r: [16, 120, 260, 48], fill: "#F3F4F6" },
  ...extra,
  { t: "input", l: "Message input", r: [16, 740, 280, 44], fill: "#F3F4F6" },
  { t: "button", s: "Send", r: [304, 740, 40, 44], fill: PURPLE, ink: "#FFFFFF" },
];
const sheet: Spec[] = [
  ...chat("Premium · 30"),
  { t: "view", r: [0, 520, 360, 280], fill: "#FFFFFF" },
  { t: "text", s: "Out of credits", r: [16, 540, 328, 32] },
  { t: "text", s: "You need 30 credits to send this message", r: [16, 580, 328, 40] },
  { t: "button", s: "Refill now", r: [16, 660, 328, 52], fill: PURPLE, ink: "#FFFFFF" },
  { t: "button", s: "Not now", r: [16, 720, 328, 44] },
];
const store: Spec[] = [
  { t: "text", s: "Store", r: [16, 40, 200, 32] },
  { t: "button", s: "1,000 credits $1.39", r: [16, 100, 328, 64], group: "g2", fill: "#F3F4F6" },
  { t: "button", s: "2,000 $2.89", r: [16, 176, 328, 64], group: "g2", fill: "#F3F4F6" },
  { t: "button", s: "5,000 $7.09", r: [16, 252, 328, 64], group: "g2", fill: "#F3F4F6" },
  ...tabs("Store"),
];
const profile: Spec[] = [
  { t: "text", s: "Profile", r: [16, 40, 200, 32] },
  { t: "text", s: "jane.doe@example.com", r: [16, 90, 328, 24] },
  { t: "button", s: "Rate us", r: [16, 140, 328, 48] },
  { t: "button", s: "Terms", r: [16, 196, 328, 48] },
  { t: "button", s: "Log out", r: [16, 252, 328, 48], ink: "#DC2626" },
  ...tabs("Profile"),
];

const act = (id: string, kind: Action["kind"], intent: string, el?: Spec, extra: Partial<Action> = {}): Action =>
  ({ id, kind, intent, elKey: el ? keyOf(el) : undefined, priority: 2, status: "done", tries: 1, ...extra });
const find = (specs: Spec[], s: string) => specs.find(x => x.s === s || x.l === s)!;

export const EMAIL_RECT_DP = { x: 16, y: 90, w: 328, h: 24 };

export interface SampleOpts { adCard?: boolean; unmeasured?: boolean }

export async function writeSampleGraph(dir: string, o: SampleOpts = {}): Promise<{ graphFile: string; graph: ExploreGraph }> {
  shots.length = 0;
  adCard = !!o.adCard;
  const reply: Spec[] = [
    { t: "text", s: "Hi! What happens next?", r: [100, 180, 244, 40], fill: "#EDE9FE" },
    { t: "text", s: "The door creaks open.", r: [16, 230, 260, 40], fill: "#F3F4F6" },
  ];
  const obs = [
    observation({ id: "o0001", step: 0, specs: checkin, bg: "#9CA3AF" }),
    observation({ id: "o0002", step: 1, specs: home(750), counters: [{ resource: "r1", value: 750 }] }),
    observation({ id: "o0003", step: 2, specs: story }),
    observation({ id: "o0004", step: 3, specs: chat("Premium · 30") }),
    observation({ id: "o0005", step: 5, specs: chat("Premium · 30", reply) }),
    observation({ id: "o0006", step: 6, specs: chat("Basic · 10") }),
    observation({ id: "o0007", step: 8, specs: sheet, bg: "#FFFFFF" }),
    observation({ id: "o0008", step: 9, specs: store }),
    observation({ id: "o0009", step: 14, specs: profile }),
    observation({ id: "o0010", step: 12, specs: home(690), counters: [{ resource: "r1", value: 690 }] }),
  ];
  // The billing sheet is only saved as a file (not listed in observations): compile must find it by convention.
  shots.push({ file: "obs/o0020.png", svg: render([{ t: "text", s: "Google Play", r: [16, 500, 200, 32] }, { t: "button", s: "Buy", r: [16, 700, 328, 52], fill: "#01875F", ink: "#FFFFFF" }], "#FFFFFF") });

  const sendBtn = find(chat("Premium · 30"), "Send");
  const states: ExploreGraph["states"] = [
    { id: "st-chat", signature: obs[3].signature, dhash: "0", obs: ["o0004", "o0005", "o0006"], name: "Chat", kind: "chat", purpose: "Chat with the story character; each message costs credits",
      inScope: true, scrollable: true, loginWall: false, annotatedBy: "heuristic", visits: 12, firstStep: 3, signals: [{ kind: "price", text: "Premium · 30", el: "e2" }],
      actions: [act("a_chat_1", "consume", "Send a message", sendBtn, { input: "Hi! What happens next?", priority: 3 }), act("a_chat_2", "tap", "Change mode", find(chat("Premium · 30"), "Premium · 30")), act("a_chat_3", "back", "Go back")] },
    { id: "st-checkin", signature: obs[0].signature, dhash: "0", obs: ["o0001"], name: "Daily check-in", kind: "modal", purpose: "Claim free daily credits",
      inScope: true, scrollable: false, loginWall: false, annotatedBy: "heuristic", visits: 1, firstStep: 0, signals: [{ kind: "reward", text: "+300 credits", el: "e3" }],
      actions: [act("a_ci_1", "tap", "Claim", find(checkin, "Claim"), { priority: 3 })] },
    { id: "st-home", signature: obs[1].signature, dhash: "0", obs: ["o0002", "o0010"], name: "Home", kind: "tab", purpose: "Browse stories; shows the balance",
      inScope: true, scrollable: true, loginWall: false, annotatedBy: "heuristic", visits: 9, firstStep: 1,
      signals: [{ kind: "balance", text: "750 credits", el: "e2" },
        ...(adCard ? AD_CARD.filter(sp => sp.s).map(sp => ({ kind: "ad" as const, text: sp.s!, el: keyOf(sp) })) : [{ kind: "ad" as const, text: "Sponsored · SkyBank", el: "e6" }])],
      actions: [
        act("a_home_1", "tap", "Open balance", find(home(750), "750 credits"), { status: "untried", tries: 0 }),
        act("a_home_2", "tap", "Open story", find(home(750), "The Last Lighthouse")),
        act("a_home_3", "tap", "Open Store tab", find(home(750), "Store")),
        act("a_home_4", "tap", "Open Profile tab", find(home(750), "Profile")),
        act("a_home_5", "tap", "Sponsored card", adCard ? AD_CARD[4] : find(home(750), "Sponsored · SkyBank"), { status: "skipped", tries: 0, skip: "ad: observe, never click" }),
      ] },
    { id: "st-story", signature: obs[2].signature, dhash: "0", obs: ["o0003"], name: "Story detail", kind: "page", purpose: "Story synopsis and start chat",
      inScope: true, scrollable: false, loginWall: false, annotatedBy: "heuristic", visits: 3, firstStep: 2, signals: [],
      actions: [act("a_story_1", "tap", "Start chat", find(story, "Start chat"))] },
    { id: "st-sheet", signature: obs[6].signature, dhash: "0", obs: ["o0007"], name: "Out of credits", kind: "sheet", purpose: "Blocks sending when the balance is too low",
      inScope: true, scrollable: false, loginWall: false, annotatedBy: "heuristic", visits: 2, firstStep: 8,
      signals: o.unmeasured ? [{ kind: "upsell", text: "Refill now", el: "e9" }] : [{ kind: "limit", text: "Out of credits", el: "e7" }, { kind: "upsell", text: "Refill now", el: "e9" }],
      actions: [act("a_sheet_1", "tap", "Refill now", find(sheet, "Refill now")), act("a_sheet_2", "tap", "Not now", find(sheet, "Not now"))] },
    { id: "st-store", signature: obs[7].signature, dhash: "0", obs: ["o0008"], name: "Store", kind: "store", purpose: "Buy credit packs",
      inScope: true, scrollable: false, loginWall: false, annotatedBy: "heuristic", visits: 4, firstStep: 9, signals: [{ kind: "price", text: "$1.39", el: "e2" }],
      actions: [act("a_store_1", "tap", "Buy 1,000 credits", find(store, "1,000 credits $1.39")), act("a_store_2", "tap", "Open Home tab", find(store, "Home"))] },
    { id: "st-profile", signature: obs[8].signature, dhash: "0", obs: ["o0009"], name: "Profile", kind: "tab", purpose: "Account and settings",
      inScope: true, scrollable: false, loginWall: false, annotatedBy: "heuristic", visits: 1, firstStep: 14, signals: [],
      actions: [
        act("a_prof_1", "tap", "Rate us", find(profile, "Rate us")),
        act("a_prof_2", "tap", "Terms", find(profile, "Terms"), { status: "unreachable", note: "travel failed twice" }),
        act("a_prof_3", "tap", "Log out", find(profile, "Log out"), { status: "skipped", priority: 0, tries: 0, skip: "guard: destructive" }),
      ] },
  ];
  const edge = (id: string, from: string, to: string, action: string, obsBefore: string, obsAfter: string, firstStep: number, extra: Partial<ExploreGraph["edges"][number]> = {}) =>
    ({ id, from, to, action, obsBefore, obsAfter, firstStep, effects: [], context: { selected: [] }, seen: 1, failures: 0, ...extra });
  const graph: ExploreGraph = ExploreGraph.parse({
    schema: "simula.explore-graph/1",
    app: { id: "sample", package: "web.sample", name: "SampleChat" },
    runId: "r0925-100000",
    device: { widthPx: px(W), heightPx: px(H), density: D, statusBarPx: px(24), navBarPx: px(48), kind: "web" },
    startedAt: "2026-09-25T10:00:00Z", finishedAt: "2026-09-25T10:04:30Z", launchState: "st-checkin",
    states, observations: obs,
    edges: [
      edge("g0001", "st-checkin", "st-home", "a_ci_1", "o0001", "o0002", 1, { effects: [{ kind: "counter", resource: "r1", before: 450, after: 750, delta: 300 }] }),
      edge("g0002", "st-home", "st-story", "a_home_2", "o0002", "o0003", 2, { seen: 3 }),
      edge("g0003", "st-story", "st-chat", "a_story_1", "o0003", "o0004", 3, { seen: 3 }),
      edge("g0004", "st-chat", "st-chat", "a_chat_1", "o0004", "o0005", 4, { seen: 5, context: { selected: ["Premium · 30"] },
        effects: [...(o.unmeasured ? [] : [{ kind: "counter" as const, resource: "r1", before: 750, after: 720, delta: -30, inferred: true }]), { kind: "appeared", text: "The door creaks open." }] }),
      edge("g0005", "st-chat", "st-chat", "a_chat_1", "o0006", "o0006", 6, { seen: 2, context: { selected: ["Basic · 10"] },
        effects: o.unmeasured ? [] : [{ kind: "counter", resource: "r1", before: 720, after: 710, delta: -10, inferred: true }] }),
      edge("g0006", "st-chat", "st-sheet", "a_chat_1", "o0005", "o0007", 8, { limitHit: !o.unmeasured || undefined, context: { selected: ["Premium · 30"] } }),
      edge("g0007", "st-sheet", "st-store", "a_sheet_1", "o0007", "o0008", 9),
      edge("g0008", "st-sheet", "st-chat", "a_sheet_2", "o0007", "o0004", 10),
      edge("g0009", "st-store", "ext:billing", "a_store_1", "o0008", "o0020", 11),
      edge("g0010", "st-store", "st-home", "a_store_2", "o0008", "o0010", 12, { seen: 2 }),
      edge("g0011", "st-home", "st-store", "a_home_3", "o0010", "o0008", 13, { seen: 2 }),
      edge("g0012", "st-home", "st-profile", "a_home_4", "o0010", "o0009", 14),
      edge("g0013", "st-profile", "ext:browser", "a_prof_1", "o0009", "o0021", 15),
      edge("g0014", "st-chat", "st-story", "a_chat_3", "o0004", "o0003", 16),
    ],
    resources: [{ id: "r1", name: "credits", unit: "credits", bindings: [{ state: "st-home", elKey: keyOf(find(home(750), "750 credits")) }] }],
    externals: [
      { kind: "billing", package: "com.android.vending", from: "st-store", action: "a_store_1", obs: "o0020", texts: ["Google Play", "1,000 credits", "$1.39", "Buy"] },
      { kind: "browser", package: "com.android.chrome", from: "st-profile", action: "a_prof_1", obs: "o0021", texts: ["Rate SampleChat"] },
    ],
    typed: ["Hi! What happens next?"], steps: 40, usd: 0, stopReason: "frontier_empty", human: [],
  });
  fs.mkdirSync(path.join(dir, "obs"), { recursive: true });
  for (const s of shots) await sharp(Buffer.from(s.svg)).png().toFile(path.join(dir, s.file));
  const graphFile = path.join(dir, "graph.json");
  fs.writeFileSync(graphFile, JSON.stringify(graph, null, 2));
  return { graphFile, graph };
}
