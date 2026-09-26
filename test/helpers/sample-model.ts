// A hand-written, schema-valid ProductModel for a small credit-based chat app (shaped like the
// fixture). Shared by downstream module tests (mock, qa, propose, judge, slides) so they can be
// built in parallel before the explorer + understand stages produce a real one.
// Screenshots referenced here do not exist; tests that need pixels must render their own.
import { ProductModel, type UiElement } from "../../src/core/schema.ts";
import { deriveEconomy, regimeOf } from "../../src/model/economics.ts";

const D = 2.625;
function el(id: string, role: UiElement["role"], text: string, x: number, y: number, w: number, h: number, extra: Partial<UiElement> = {}): UiElement {
  return {
    id, key: `${role}||${text.toLowerCase().replace(/\d+/g, "#")}|0`, role, type: role === "button" ? "android.widget.Button" : "android.widget.TextView",
    text, rectDp: { x, y, w, h }, rectPx: { x: Math.round(x * D), y: Math.round(y * D), w: Math.round(w * D), h: Math.round(h * D) },
    style: { bg: role === "button" ? "#6C4DF6" : "#FFFFFF", fg: role === "button" ? "#FFFFFF" : "#111111", fontDp: role === "text" ? 16 : 15 },
    ...extra,
  };
}
const ev = (obs: string, quote?: string) => [{ obs, quote, verified: !!quote }];

export function sampleModel(): ProductModel {
  const economy = {
    resources: [{ id: "r1", name: "credits", unit: "credits", kind: "currency" as const, shownOn: [{ screen: "s01", el: "e2" }], observedValues: [450, 750, 720, 690], conf: "observed" as const, evidence: ev("o0001", "450 credits") }],
    sinks: [
      { id: "k1", resource: "r1", amount: 10, action: "send a chat message", edges: ["g05"], context: "Basic mode", conf: "observed" as const, evidence: ev("o0012") },
      { id: "k2", resource: "r1", amount: 30, action: "send a chat message", edges: ["g06"], context: "Premium mode", conf: "observed" as const, evidence: ev("o0015") },
    ],
    sources: [
      { id: "src1", resource: "r1", amount: 300, cadence: "daily" as const, how: "Daily check-in modal on Home", screen: "s06", conf: "observed" as const, evidence: ev("o0002", "+300 credits") },
      { id: "src2", resource: "r1", amount: null, cadence: "purchase" as const, how: "Buy a pack in the Store", screen: "s05", conf: "observed" as const, evidence: ev("o0020") },
    ],
    offers: [
      { id: "of1", kind: "pack" as const, label: "1,000 credits", priceText: "$1.39", priceUsd: 1.39, grants: { resource: "r1", amount: 1000 }, screen: "s05", conf: "observed" as const, evidence: ev("o0020", "1,000 credits") },
      { id: "of2", kind: "pack" as const, label: "2,000 credits", priceText: "$2.89", priceUsd: 2.89, grants: { resource: "r1", amount: 2000 }, screen: "s05", conf: "observed" as const, evidence: ev("o0020", "2,000 credits") },
      { id: "of3", kind: "pack" as const, label: "5,000 credits", priceText: "$7.09", priceUsd: 7.09, grants: { resource: "r1", amount: 5000 }, screen: "s05", conf: "observed" as const, evidence: ev("o0020", "5,000 credits") },
    ],
    walls: [{ id: "w1", edge: "g07", resource: "r1", blockedIntent: "send a chat message", shows: "s04", offers: ["of1", "of2", "of3"], declineEdge: "g09", conf: "observed" as const, evidence: ev("o0031", "Out of credits") }],
    entitlements: [],
    ads: [{ format: "native" as const, screen: "s01", el: "e6", conf: "observed" as const, evidence: ev("o0001", "Sponsored") }],
  };
  const m = {
    schema: "simula.product-model/1" as const,
    app: { id: "sample", package: "web.sample", name: "SampleChat", capturedAt: "2026-09-25T10:00:00Z", runId: "r0925-100000", accountState: "logged-in" as const },
    device: { widthPx: 1080, heightPx: 2400, density: D, statusBarPx: 63, navBarPx: 126, kind: "web" as const },
    brief: {
      oneLiner: "Story chat app where every message costs credits.", audience: "Interactive-fiction fans", coreLoop: ["pick a story", "chat", "spend credits", "refill"],
      howItMakesMoney: "Credit packs in the Store", whatIsScarce: ["credits (10 per Basic message, 30 per Premium)"], adsToday: "One native sponsored card in the Home feed", openQuestions: [],
    },
    regime: regimeOf(economy),
    screens: [
      { id: "s01", name: "Home", purpose: "Browse stories; shows balance", kind: "tab" as const, inScope: true, signature: ["tab|home"], observations: ["o0001"], representative: "o0001", screenshot: "screens/s01.png", scrollable: true, visits: 9, render: "html" as const,
        elements: [el("e1", "text", "Stories", 16, 40, 200, 32), el("e2", "counter", "450 credits", 280, 40, 115, 32), el("e3", "list-item", "The Last Lighthouse", 16, 100, 379, 120), el("e4", "list-item", "Neon Detective", 16, 232, 379, 120), el("e6", "list-item", "Sponsored: SkyBank", 16, 364, 379, 90, { ad: true }), el("e7", "tab", "Home", 0, 858, 137, 56, { flags: { selected: true } }), el("e8", "tab", "Store", 137, 858, 137, 56), el("e9", "tab", "Profile", 274, 858, 137, 56)],
        actions: [], bindings: [{ resource: "r1", el: "e2" }], signals: [{ kind: "balance" as const, text: "450 credits", el: "e2" }, { kind: "ad" as const, text: "Sponsored", el: "e6" }], variants: [] },
      { id: "s02", name: "Story detail", purpose: "Story synopsis and start chat", kind: "page" as const, inScope: true, signature: ["page|story"], observations: ["o0003"], representative: "o0003", screenshot: "screens/s02.png", scrollable: false, visits: 3, render: "html" as const,
        elements: [el("e1", "text", "The Last Lighthouse", 16, 60, 379, 40), el("e2", "button", "Start chat", 16, 780, 379, 52)], actions: [], bindings: [], signals: [], variants: [] },
      { id: "s03", name: "Chat", purpose: "Chat with the story character; each message costs credits", kind: "chat" as const, inScope: true, signature: ["chat"], observations: ["o0010"], representative: "o0010", screenshot: "screens/s03.png", scrollable: true, visits: 14, render: "html" as const,
        elements: [el("e1", "text", "Mara", 60, 40, 200, 32), el("e2", "button", "Basic · 10", 280, 40, 115, 32), el("e3", "text", "The lamp flickers. Who's there?", 16, 120, 300, 60), el("e4", "input", "Message", 16, 846, 320, 48), el("e5", "button", "Send", 344, 846, 51, 48)],
        actions: [], bindings: [], signals: [{ kind: "price" as const, text: "Basic · 10", el: "e2" }], variants: [] },
      { id: "s04", name: "Out of credits", purpose: "Blocks sending when balance is too low", kind: "sheet" as const, inScope: true, parent: "s03", signature: ["sheet|out of credits"], observations: ["o0031"], representative: "o0031", screenshot: "screens/s04.png", scrollable: false, visits: 2, render: "html" as const,
        elements: [el("e1", "text", "Out of credits", 16, 560, 379, 32), el("e2", "button", "Refill now", 16, 740, 379, 52), el("e3", "button", "Not now", 16, 800, 379, 44)], actions: [], bindings: [], signals: [{ kind: "limit" as const, text: "Out of credits", el: "e1" }, { kind: "upsell" as const, text: "Refill now", el: "e2" }], variants: [] },
      { id: "s05", name: "Store", purpose: "Buy credit packs", kind: "store" as const, inScope: true, signature: ["tab|store"], observations: ["o0020"], representative: "o0020", screenshot: "screens/s05.png", scrollable: false, visits: 4, render: "html" as const,
        elements: [el("e1", "text", "Store", 16, 40, 200, 32), el("e2", "list-item", "1,000 credits $1.39", 16, 100, 379, 72), el("e3", "list-item", "2,000 credits $2.89", 16, 184, 379, 72), el("e4", "list-item", "5,000 credits $7.09", 16, 268, 379, 72), el("e7", "tab", "Home", 0, 858, 137, 56), el("e8", "tab", "Store", 137, 858, 137, 56, { flags: { selected: true } }), el("e9", "tab", "Profile", 274, 858, 137, 56)],
        actions: [], bindings: [], signals: [{ kind: "price" as const, text: "$1.39", el: "e2" }], variants: [] },
      { id: "s06", name: "Daily check-in", purpose: "Claim free daily credits", kind: "modal" as const, inScope: true, parent: "s01", signature: ["modal|check-in"], observations: ["o0002"], representative: "o0002", screenshot: "screens/s06.png", scrollable: false, visits: 1, render: "html" as const,
        elements: [el("e1", "text", "Daily check-in", 40, 330, 331, 32), el("e2", "text", "+300 credits", 40, 380, 331, 40), el("e3", "button", "Claim", 40, 470, 331, 52)], actions: [], bindings: [], signals: [{ kind: "reward" as const, text: "+300 credits", el: "e2" }], variants: [] },
    ],
    edges: [
      { id: "g01", from: "s01", to: "s02", action: "a01_1", el: "e3", transition: "push" as const, effects: [], context: { selected: [] }, seen: 3, failures: 0 },
      { id: "g02", from: "s02", to: "s03", action: "a02_1", el: "e2", transition: "push" as const, effects: [], context: { selected: [] }, seen: 3, failures: 0 },
      { id: "g03", from: "s01", to: "s05", action: "a01_3", el: "e8", transition: "tab" as const, effects: [], context: { selected: [] }, seen: 2, failures: 0 },
      { id: "g04", from: "s05", to: "s01", action: "a05_1", el: "e7", transition: "tab" as const, effects: [], context: { selected: [] }, seen: 2, failures: 0 },
      { id: "g05", from: "s03", to: "s03", action: "a03_1", el: "e5", transition: "replace" as const, effects: [{ kind: "counter" as const, resource: "r1", before: 450, after: 440, delta: -10, inferred: true }, { kind: "appeared" as const, text: "The door creaks open." }], context: { selected: ["Basic · 10"] }, seen: 8, failures: 0 },
      { id: "g06", from: "s03", to: "s03", action: "a03_1", el: "e5", transition: "replace" as const, effects: [{ kind: "counter" as const, resource: "r1", before: 440, after: 410, delta: -30, inferred: true }], context: { selected: ["Premium · 30"] }, seen: 5, failures: 0 },
      { id: "g07", from: "s03", to: "s04", action: "a03_1", el: "e5", transition: "sheet" as const, effects: [], context: { selected: ["Premium · 30"] }, limitHit: true, seen: 1, failures: 0 },
      { id: "g08", from: "s04", to: "s05", action: "a04_1", el: "e2", transition: "push" as const, effects: [], context: { selected: [] }, seen: 1, failures: 0 },
      { id: "g09", from: "s04", to: "s03", action: "a04_2", el: "e3", transition: "back" as const, effects: [], context: { selected: [] }, seen: 1, failures: 0 },
      { id: "g10", from: "s06", to: "s01", action: "a06_1", el: "e3", transition: "back" as const, effects: [{ kind: "counter" as const, resource: "r1", before: 450, after: 750, delta: 300 }], context: { selected: [] }, seen: 1, failures: 0 },
      { id: "g11", from: "s05", to: "ext:billing", action: "a05_2", el: "e2", transition: "external" as const, effects: [], context: { selected: [] }, seen: 1, failures: 0 },
    ],
    externals: [{ id: "ext:billing", kind: "billing" as const, package: "web.billing", texts: ["Buy 1,000 credits", "$1.39"], from: [{ screen: "s05", action: "a05_2" }] }],
    economy: { ...economy, derived: deriveEconomy(economy) },
    moments: [
      { id: "m1", type: "wall" as const, screen: "s04", edge: "g07", resource: "r1", description: "Free users run out of credits mid-chat", reach: "core-loop" as const, noOffer: false, evidence: ev("o0031", "Out of credits") },
      { id: "m2", type: "decline" as const, screen: "s04", edge: "g09", description: "User taps Not now on the refill sheet", reach: "frequent" as const, noOffer: false, evidence: [] },
      { id: "m3", type: "hub" as const, screen: "s01", description: "Home tab with balance chip", reach: "core-loop" as const, noOffer: false, evidence: [] },
      { id: "m4", type: "post-reward" as const, screen: "s06", description: "Daily check-in claimed", reach: "frequent" as const, noOffer: false, evidence: ev("o0002", "+300 credits") },
      { id: "m5", type: "desire" as const, screen: "s03", description: "Premium mode costs 3x Basic", reach: "core-loop" as const, noOffer: false, evidence: [] },
      { id: "m6", type: "first-value" as const, screen: "s02", description: "First story opened", reach: "rare" as const, noOffer: true, evidence: [] },
    ],
    flows: [
      { id: "f1", name: "Chat until the wall", kind: "core" as const, goal: "Spend credits chatting", steps: [{ screen: "s01", note: "" }, { screen: "s02", edge: "g01", note: "open story" }, { screen: "s03", edge: "g02", note: "start chat" }, { screen: "s03", edge: "g06", note: "send (-30)" }, { screen: "s04", edge: "g07", note: "out of credits" }, { screen: "s05", edge: "g08", note: "refill" }] },
    ],
    design: { fonts: [{ family: "Inter", source: "system" as const }], palette: [{ hex: "#FFFFFF", share: 0.6 }, { hex: "#6C4DF6", share: 0.15 }, { hex: "#111111", share: 0.1 }], typeScaleDp: [12, 14, 16, 20, 24], radiiDp: [8, 16], assets: [] },
    transcripts: [{ screen: "s03", turns: [{ role: "user" as const, text: "Hi! What happens next?" }, { role: "app" as const, text: "The door creaks open." }] }],
    coverage: { steps: 80, minutes: 4, usd: 0, states: 6, edges: 11, externals: 1, frontierLeft: 0, unreachable: 0, stopReason: "frontier_empty" as const, humanInterventions: 0, notExplored: [{ screen: "s01", action: "a01_9", intent: "Log out", why: "guard: destructive" }] },
    human: [],
    provenance: { synthesizedBy: "stub" as const, inferredClaims: 0, verifiedClaims: 6 },
  };
  return ProductModel.parse(m);
}
