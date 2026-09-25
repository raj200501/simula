// Test fixture for the mock + QA tests: a temp model directory holding sampleModel() and "original"
// screenshots. The originals are the spec renderer's output rendered by Playwright at device size, so
// an unmodified mock screen must score ~1.0 and any perturbation is a known, measurable difference.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ProductModel, Proposal } from "../../src/core/schema.ts";
import { loadProfile, paths } from "../../src/core/config.ts";
import { save, writeText } from "../../src/core/io.ts";
import { setLlmContext } from "../../src/core/llm.ts";
import type { StageCtx } from "../../src/core/run.ts";
import { buildMock } from "../../src/mock/build.ts";
import { launchBrowser, newMockPage, renderScreen, viewportOf } from "../../src/qa/render.ts";
import { sampleModel } from "./sample-model.ts";

export interface MockQaFixture { tmp: string; m: ProductModel; modelDir: string; c: StageCtx }

export async function makeFixture(name: string, mutate?: (m: ProductModel) => void): Promise<MockQaFixture> {
  setLlmContext({ mode: "stub" });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `simula-mockqa-${name}-`));
  const modelDir = path.join(tmp, "model");
  // Originals come from the unmodified model (every screen spec-rendered as HTML).
  const base = sampleModel();
  const origIndex = buildMock(base, modelDir, path.join(tmp, "originals-mock"));
  const v = viewportOf(base);
  const browser = await launchBrowser();
  try {
    const page = await newMockPage(browser, v);
    for (const s of base.screens) writeText(path.join(modelDir, s.screenshot), (await renderScreen(page, origIndex, s.id, v)).png);
  } finally {
    await browser.close();
  }
  const m = sampleModel();
  mutate?.(m);
  save(ProductModel, path.join(modelDir, "product-model.json"), m);
  const c: StageCtx = {
    app: { id: "sample", package: "web.sample", name: "SampleChat", profile: "fixture", login: "none" },
    profile: loadProfile("fixture"), paths: paths("sample", { outRoot: path.join(tmp, "out"), modelDir }), runId: "t", llm: "stub", opts: {},
  };
  return { tmp, m, modelDir, c };
}

/** A schema-valid proposal: a pill on the out-of-credits sheet that opens the rewarded flow for +30. */
export function sampleProposal(): Proposal {
  return Proposal.parse({
    id: "P1", title: "Play for credits at the wall", oneLiner: "Offer a 15 s game for 30 credits when the balance runs out.",
    case: "existing", archetype: "TAX-RWD-WALL", beyondBaseline: false,
    anchor: { moments: ["m1"], economy: ["w1", "r1"] },
    surface: "s04", trigger: "balance below the Premium cost when tapping Send", eligibility: "free users, max 3 per day",
    offer: { title: "Out of credits? Play for 30 more", body: "A short sponsored game refills you without paying.", cta: "Play now", decline: "No thanks" },
    simula: { unit: "SIM-RWD", entry: "button", gamePartner: "Mara", minPlaySec: 15 },
    reward: { what: "+30 credits", resource: "r1", amount: 30, grantOn: "REWARD_VERIFIED" },
    caps: { perDay: 3, cooldownMin: 30 },
    cannibalizationGuard: "Reward stays below the cheapest pack per unit.",
    assumptions: { engagedShare: 0.2, viewsPerEngager: 1.5, cogs: "text-premium", cogsUnitsPerView: 1 },
    kpis: { primary: "rewarded views per DAU", guardrails: ["pack revenue"], holdout: "10%" },
    precedents: [], risks: [], evidence: [{ obs: "o0031", quote: "Out of credits", verified: true }],
    patch: {
      newScreens: [{ id: "N1", basedOn: "s04", kind: "sheet", change: "Sheet variant with a rewarded offer" }],
      newElements: [{ id: "n1", in: "s04", near: "e2", place: "before", change: "Play a 15 s game for +30 credits" }],
      newEdges: [{ from: "s04", el: "n1", to: "rwd", effects: [{ resource: "r1", delta: 30 }] }],
    },
    storyboard: [],
  });
}

/** Read a JSON file. */
export const readJson = <T = any>(f: string): T => JSON.parse(fs.readFileSync(f, "utf8")) as T;
