// Shared fixtures for the slides/report tests: the sample model written to a model directory with
// placeholder screenshots, and hand-made Candidates + Judgments (one SHIP that went through a
// revision round, one REJECT).
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { Candidates, Judgments, ProductModel, type Proposal } from "../../src/core/schema.ts";
import { save } from "../../src/core/io.ts";
import { sampleModel } from "./sample-model.ts";

const COLORS = ["#EEF2FF", "#FDF2F8", "#ECFDF5", "#FFFBEB", "#F0F9FF", "#FEF2F2"];

/** Write product-model.json and one labelled placeholder PNG per screen (411x914 dp at 2x). */
export async function writeModelDir(dir: string): Promise<{ m: ProductModel; modelDir: string }> {
  const m = sampleModel();
  fs.mkdirSync(path.join(dir, "screens"), { recursive: true });
  save(ProductModel, path.join(dir, "product-model.json"), m);
  for (const [i, s] of m.screens.entries()) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="822" height="1828"><rect width="100%" height="100%" fill="${COLORS[i % COLORS.length]}"/>` +
      `<text x="411" y="914" font-size="64" font-family="sans-serif" text-anchor="middle" fill="#374151">${s.name}</text></svg>`;
    await sharp(Buffer.from(svg)).png().toFile(path.join(dir, s.screenshot));
  }
  return { m, modelDir: dir };
}

const counters = (v: number) => [{ resource: "r1", value: v }];

export function shipProposal(version = 2): Proposal {
  const reward = version >= 2 ? 10 : 60;
  return {
    id: "P1", version, title: "Refill by play at the out-of-credits wall",
    oneLiner: "When free users run out of credits mid-chat, offer a 15-second sponsored game for a small credit top-up next to the store.",
    case: "existing", archetype: "TAX-1", beyondBaseline: false,
    anchor: { moments: ["m1", "m2"], economy: ["r1", "w1", "k2"] },
    surface: "s04",
    trigger: "Balance below 30 after tapping Send with Premium selected (the Out of credits sheet opens)",
    eligibility: "Free users who have not bought a pack in the last 7 days; never in the first session",
    offer: { title: "Out of credits?", body: `Play a 15-second game with Mara and get ${reward} credits. Your message stays in the composer.`, cta: "Play now", decline: "No thanks" },
    simula: { unit: "SIM-RWD", entry: "invitation", gamePartner: "Mara", minPlaySec: 15 },
    reward: { what: `${reward} credits`, resource: "r1", amount: reward, grantOn: "REWARD_VERIFIED" },
    caps: { perDay: 3, cooldownMin: 30 },
    cannibalizationGuard: "Shown only after Refill now is declined; three a day is far below the cheapest pack.",
    assumptions: { engagedShare: 0.2, viewsPerEngager: 1.5, cogs: "text-premium", cogsUnitsPerView: 0.3 },
    kpis: { primary: "Opt-in rate at the wall", guardrails: ["pack conversion", "D7 retention"], holdout: "10% user-level holdout keeps today's sheet." },
    precedents: ["TAX-1", "TAX-10"],
    risks: ["Some buyers may wait for ads instead of buying a pack", "Game partner tone must match the story"],
    evidence: [{ obs: "o0031", quote: "Out of credits", verified: true }],
    patch: {
      newScreens: [],
      newElements: [{ id: "n1", in: "s04", near: "e2", place: "before", change: `Add a “Play a game for ${reward} credits” button above Refill now` }],
      newEdges: [{ from: "s04", el: "n1", to: "rwd", effects: [{ resource: "r1", delta: reward }] }],
    },
    storyboard: [
      { phase: "today", screen: "s04", counters: counters(20), overlay: "none", callouts: [{ node: "e1", text: "Free users hit this wall mid-story" }], caption: "Today: out of credits, and only the store helps" },
      { phase: "change", screen: "s04", counters: counters(20), overlay: "none", callouts: [{ node: "n1", text: "New opt-in option" }], caption: "A play-for-credits option sits above Refill now" },
      { phase: "offer", screen: "s04", counters: counters(20), overlay: "invite", callouts: [], caption: "The reward is stated before the user chooses" },
      { phase: "ad", screen: "s04", counters: counters(20), overlay: "game", callouts: [], caption: "A 15-second sponsored game with Mara" },
      { phase: "value", screen: "s03", counters: counters(20 + reward), overlay: "verified", callouts: [{ node: "e2", text: "Back in the chat, draft kept" }],
        caption: "Credits granted on verification and the user is right back in the story where they left off" },
    ],
  };
}

export function rejectProposal(): Proposal {
  const p = shipProposal(1);
  return {
    ...p, id: "P2", version: 1, title: "Interstitial when the app opens", case: "product-change", archetype: "AI-9",
    oneLiner: "Show a full-screen sponsored game every time the app opens.",
    surface: "s01", trigger: "App open", eligibility: "Everyone",
    offer: { title: "Sponsored", body: "Watch this to continue.", cta: "Continue", decline: "Skip" },
    simula: { unit: "SIM-INT", entry: "interstitial", minPlaySec: 15 },
    reward: { what: "Nothing", grantOn: "REWARD_VERIFIED" },
    patch: { newScreens: [], newElements: [], newEdges: [] },
  };
}

export function sampleCandidates(): Candidates {
  return Candidates.parse({
    schema: "simula.candidates/1", app: "sample",
    baseline: ["Rewarded video for credits in the store", "Banner in the chat", "Interstitial between stories"],
    momentSweep: [{ moment: "m1", exchange: "credits for a game", viable: true }],
    ideas: [
      { title: "Refill by play at the out-of-credits wall", case: "existing", archetype: "TAX-1", moment: "m1", reward: "credits", beyondBaseline: false },
      { title: "Interstitial when the app opens", case: "product-change", archetype: "AI-9", moment: "m3", reward: "none", beyondBaseline: false },
      { title: "Sponsored story chapters", case: "product-change", archetype: "TAX-3", moment: "m5", reward: "chapter", beyondBaseline: true },
    ],
    selected: [{ index: 0, why: "core-loop wall" }, { index: 1, why: "baseline contrast" }],
    proposals: [shipProposal(1), shipProposal(2), rejectProposal()],
    generatedBy: "stub",
  });
}

export function sampleJudgments(opts: { shipVerdict?: "SHIP" | "REVISE" } = {}): Judgments {
  const v = opts.shipVerdict ?? "SHIP";
  const round = (proposalId: string, version: number, round: number, verdict: "SHIP" | "REVISE" | "REJECT", weighted: number | null, topConcern: string, requiredChanges: string[] = []) => ({
    proposalId, version, round, gates: [], scores: [], weighted, requiredChanges, topConcern, verdict, reasons: [topConcern], judgedBy: "stub" as const,
  });
  return Judgments.parse({
    schema: "simula.judgments/1", app: "sample",
    rubricWeights: [{ criterion: "value-moment-fit", weight: 0.3 }, { criterion: "cannibalization-safety", weight: 0.3 }, { criterion: "unit-economics", weight: 0.4 }],
    thresholds: { ship: 3.8, revise: 3.0, minCriterion: 3, maxRounds: 2 },
    rounds: [
      round("P1", 1, 1, "REVISE", 3.4, "Reward of 60 credits is worth 5.6x one view at list price", ["Cut the reward to 10 credits"]),
      round("P1", 2, 2, v, v === "SHIP" ? 4.1 : 3.5, v === "SHIP" ? "Minor: copy length" : "Trigger still fires before the wall"),
      round("P2", 1, 1, "REJECT", null, "Fails the opt-in gate: nothing is exchanged and there is no working decline"),
    ],
    final: [
      { proposalId: "P1", version: 2, verdict: v, weighted: v === "SHIP" ? 4.1 : 3.5, summary: v === "SHIP" ? "Anchored on the core-loop wall with a reward sized below one view" : "Needs the trigger moved to the wall" },
      { proposalId: "P2", version: 1, verdict: "REJECT", weighted: null, summary: "Fails the opt-in gate: an interstitial on open is not a value exchange" },
    ],
  });
}
