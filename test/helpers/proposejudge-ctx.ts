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
