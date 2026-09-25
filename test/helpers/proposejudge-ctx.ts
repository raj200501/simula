// Shared fixtures for the propose/judge tests: a StageCtx writing into a temp dir, and a
// no-scarcity variant of the sample model (nothing is spent or sold: product changes only).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadProfile, paths } from "../../src/core/config.ts";
import { ProductModel } from "../../src/core/schema.ts";
import type { StageCtx } from "../../src/core/run.ts";
import { deriveEconomy, regimeOf } from "../../src/model/economics.ts";
import { sampleModel } from "./sample-model.ts";

export function tmpDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `simula-${prefix}-`));
}

export function ctx(outRoot: string, profile: "fixture" | "deep" | "shallow" = "fixture"): StageCtx {
  return {
    app: { id: "sample", package: "web.sample", name: "SampleChat", profile: "fixture", login: "none" },
    profile: loadProfile(profile), paths: paths("sample", { outRoot }), runId: "t", llm: "stub", opts: {},
  };
}

export function noScarcityModel(): ProductModel {
  const m = structuredClone(sampleModel());
  const economy = { ...m.economy, sinks: [], offers: [], walls: [], sources: [], derived: undefined };
  const out = {
    ...m,
    economy: { ...economy, derived: deriveEconomy(economy) },
    regime: regimeOf(economy),
    moments: m.moments.filter(x => x.type === "hub" || x.type === "first-value"),
  };
  return ProductModel.parse(out);
}

/**
 * An entitlement-only app shaped like a guest-mode AI chat: nothing is spent in units; a plan
 * ("Plus") gates Deep reasoning behind a sign-up sheet, and a profile feature needs an account.
 */
export function entitlementModel(): ProductModel {
  const m = structuredClone(sampleModel());
  const ev = (obs: string, quote?: string) => [{ obs, quote, verified: !!quote }];
  const economy = {
    resources: [
      { id: "r1", name: "Plus Membership", unit: "tier", kind: "entitlement" as const, shownOn: [], observedValues: [], conf: "observed" as const, evidence: ev("o0031", "To enjoy Plus you need to create an account") },
      { id: "r2", name: "User Account", unit: "profile", kind: "entitlement" as const, shownOn: [], observedValues: [], conf: "observed" as const, evidence: ev("o0002") },
    ],
    sinks: [
      { id: "k1", resource: "r1", amount: 1, action: "Use deep reasoning", edges: ["g07"], context: "Deep reasoning toggle", conf: "inferred" as const, evidence: ev("o0015") },
      { id: "k2", resource: "r2", amount: 1, action: "Save favorite messages", edges: ["g10"], conf: "inferred" as const, evidence: ev("o0002") },
    ],
    sources: [], offers: [],
    walls: [
      { id: "w1", edge: "g07", resource: "r1", blockedIntent: "Toggle deep reasoning mode", shows: "s04", offers: [], declineEdge: "g09", conf: "observed" as const, evidence: ev("o0031", "To enjoy Plus you need to create an account") },
      { id: "w2", edge: "g10", resource: "r2", blockedIntent: "Save favorite messages", shows: "s06", offers: [], conf: "observed" as const, evidence: ev("o0002") },
    ],
    entitlements: [{ plan: "Plus", benefits: ["Smarter answers", "Deep reasoning"], conf: "observed" as const, evidence: [] }],
    ads: [],
  };
  const s04 = m.screens.find(s => s.id === "s04")!;
  s04.name = "Create Account Sheet";
  s04.elements = [
    { ...s04.elements[0], text: "To enjoy Plus you need to create an account" },
    { ...s04.elements[1], text: "Create your account" },
    { ...s04.elements[2], text: "Maybe later" },
  ];
  s04.signals = [{ kind: "upsell", text: "To enjoy Plus you need to create an account", el: "e1" }];
  const s06 = m.screens.find(s => s.id === "s06")!;
  s06.name = "Favorites Sheet";
  s06.elements = [{ ...s06.elements[0], text: "Sign up to start saving your favorites" }, { ...s06.elements[2], text: "Sign up" }];
  s06.signals = [{ kind: "lock", text: "Sign up to start saving your favorites", el: "e1" }];
  const out = {
    ...m,
    economy: { ...economy, derived: deriveEconomy(economy) },
    regime: regimeOf(economy),
    moments: [
      { id: "m1", type: "wall" as const, screen: "s04", edge: "g07", resource: "r1", description: "Toggle deep reasoning mode is blocked: Create Account Sheet appears", reach: "frequent" as const, noOffer: false, evidence: ev("o0031", "To enjoy Plus you need to create an account") },
      { id: "m2", type: "decline" as const, screen: "s04", edge: "g09", resource: "r1", description: "The user dismisses Create Account Sheet", reach: "frequent" as const, noOffer: false, evidence: [] },
      { id: "m3", type: "hub" as const, screen: "s01", description: "Home tab", reach: "core-loop" as const, noOffer: false, evidence: [] },
      { id: "m4", type: "wall" as const, screen: "s06", edge: "g10", resource: "r2", description: "Save favorite messages needs an account", reach: "occasional" as const, noOffer: false, evidence: [] },
      { id: "m5", type: "desire" as const, screen: "s03", resource: "r1", description: "Each Use deep reasoning on Chat costs 1 Plus Membership", reach: "core-loop" as const, noOffer: false, evidence: [] },
      { id: "m6", type: "first-value" as const, screen: "s02", description: "First story opened", reach: "rare" as const, noOffer: true, evidence: [] },
    ],
  };
  return ProductModel.parse(out);
}
