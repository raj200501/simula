// understand: explore graph -> product model (THE contract for every later stage).
//   compile (deterministic) -> synthesize (one LLM call, or the heuristic stub) -> verify (deterministic)
//   -> derived economics + regime (pure code) -> flows -> moments -> render choice -> hand overrides
//   -> product-model.json + digest.md + viewer.html
import fs from "node:fs";
import path from "node:path";
import { ExploreGraph, ProductModel } from "../core/schema.ts";
import { load, save, writeText } from "../core/io.ts";
import { trace } from "../core/trace.ts";
import type { StageCtx } from "../core/run.ts";
import { compile, finalizeScreens } from "./compile.ts";
import { digest } from "./digest.ts";
import { deriveEconomy, regimeOf } from "./economics.ts";
import { buildFlows, flowKey, type FlowGraph } from "./flows.ts";
import { detectMoments } from "./moments.ts";
import { synthesize } from "./synthesize.ts";
import { buildCorpus, verifyEconomy } from "./verify.ts";
import { renderViewer } from "./viewer.ts";

export async function understand(c: StageCtx, graphFile: string): Promise<{ modelFile: string; model: ProductModel }> {
  const graph = load(ExploreGraph, graphFile);
  const modelDir = c.paths.model;
  const cm = await compile(graph, path.dirname(graphFile), modelDir);
  trace("info", { what: "compiled", screens: cm.screens.length, edges: cm.edges.length, externals: cm.externals.length, assets: cm.design.assets.length });

  // Candidate flows go into the synthesis prompt so the model can name them.
  const fg: FlowGraph = { screens: cm.screens, edges: cm.edges, launch: cm.launch, actionOf: cm.actionOf, resourceName: id => graph.resources.find(r => r.id === id)?.name ?? id };
  const limitWalls = cm.edges.filter(e => e.limitHit && !e.to.startsWith("ext:")).map(e => ({ screen: e.to, edge: e.id }));
  const pre = buildFlows(fg, limitWalls);

  const draft = await synthesize(cm, pre);
  const v = verifyEconomy(draft.economy, buildCorpus(graph, cm.obsScreen), {
    screens: new Set(cm.screens.map(s => s.id)),
    edges: new Set(cm.edges.map(e => e.id)),
    externals: new Map(cm.externals.filter(x => x.from.length).map(x => [x.id, x.from[0].screen])),
  });
  const economy = { ...v.economy, derived: deriveEconomy(v.economy) };

  // Final flows also target walls the synthesis found; names are carried over by flow key (ids may shift).
  const flows = buildFlows({ ...fg, resourceName: id => economy.resources.find(r => r.id === id)?.name ?? id },
    [...limitWalls, ...economy.walls.map(w => ({ screen: w.shows, edge: w.edge }))]);
  const names = new Map(draft.flowNames.map(n => [n.flow, n]));
  for (const f of flows) {
    const n = names.get(pre.find(p => flowKey(p) === flowKey(f))?.id ?? "");
    if (n) { f.name = n.name; f.goal = n.goal; }
  }
  const moments = detectMoments({ screens: cm.screens, edges: cm.edges, economy, flows }, cm.launch, draft.extraMoments);
  await finalizeScreens(cm, flows, economy, c.profile.htmlScreens);

  let model: ProductModel = {
    schema: "simula.product-model/1",
    app: {
      id: graph.app.id, package: graph.app.package, name: graph.app.name, versionName: graph.app.versionName,
      capturedAt: graph.finishedAt ?? graph.startedAt, runId: graph.runId,
      accountState: c.app.login === "manual" ? "logged-in" : c.app.login === "none" ? "guest" : "unknown",
    },
    device: graph.device,
    brief: draft.brief,
    regime: regimeOf(economy),
    screens: cm.screens,
    edges: cm.edges,
    externals: cm.externals,
    economy,
    moments,
    flows,
    design: cm.design,
    transcripts: cm.transcripts,
    coverage: cm.coverage,
    human: graph.human,
    provenance: { synthesizedBy: draft.by, inferredClaims: v.inferred, verifiedClaims: v.verified },
  };
  model = applyOverrides(model, modelDir);
  const modelFile = path.join(modelDir, "product-model.json");
  model = save(ProductModel, modelFile, model);
  writeText(path.join(modelDir, "digest.md"), digest(model));
  writeText(path.join(modelDir, "viewer.html"), renderViewer(model));
  trace("info", {
    what: "product model", regime: model.regime, synthesizedBy: model.provenance.synthesizedBy,
    sinks: economy.sinks.length, offers: economy.offers.length, walls: economy.walls.length, moments: moments.length, flows: flows.length,
    html: model.screens.filter(s => s.render === "html").length, verified: v.verified, inferred: v.inferred,
  });
  return { modelFile, model };
}

/** product-model.json + overrides.json, validated. What every downstream stage calls. */
export function loadModel(modelDir: string): ProductModel {
  return applyOverrides(load(ProductModel, path.join(modelDir, "product-model.json")), modelDir);
}

// ------------------------------------------------------------------------------------------------
// Hand overrides: <modelDir>/overrides.json is a JSON-merge patch in which arrays are addressed by
// item id, e.g. {"screens":{"s03":{"name":"Chat"}}, "economy":{"sinks":{"k1":{"amount":90}}}}.
// null deletes; an unknown id adds an item; id-less items use a natural key (see matchIndex).
// Applied on every load (idempotent) and recorded in model.human, so "what did a person fix by
// hand" has an answer. Economy edits re-derive the numbers.
// ------------------------------------------------------------------------------------------------
type J = unknown;
const isObj = (v: J): v is Record<string, J> => !!v && typeof v === "object" && !Array.isArray(v);

/** Items without an id are addressed by a natural key: entitlements by plan, ads by "screen/el"
 *  (or "screen"). Never by position: a positional delete would remove another item on every load. */
function matchIndex(arr: J[], key: string): number {
  const natural = (x: Record<string, J>) => x.id ?? x.plan ?? (typeof x.screen === "string" && !("id" in x) ? (x.el ? `${x.screen}/${x.el}` : x.screen) : undefined);
  return arr.findIndex(x => isObj(x) && natural(x) === key);
}

function merge(target: J, patch: J, at: string, log: string[]): J {
  if (Array.isArray(target) && isObj(patch)) {
    const out = [...target];
    for (const [key, sub] of Object.entries(patch)) {
      const i = matchIndex(out, key);
      if (sub === null) { if (i >= 0) { out.splice(i, 1); log.push(`${at}.${key} removed`); } continue; }
      if (i >= 0) out[i] = merge(out[i], sub, `${at}.${key}`, log);
      else { out.push(isObj(sub) ? { id: key, ...sub } : sub); log.push(`${at}.${key} added = ${JSON.stringify(sub).slice(0, 160)}`); }
    }
    return out;
  }
  if (isObj(target) && isObj(patch)) {
    const out: Record<string, J> = { ...target };
    for (const [key, sub] of Object.entries(patch)) {
      if (sub === null) { if (key in out) { delete out[key]; log.push(`${at}.${key} removed`); } continue; }
      out[key] = merge(out[key], sub, `${at}.${key}`, log);
    }
    return out;
  }
  if (JSON.stringify(target) !== JSON.stringify(patch)) log.push(`${at} = ${JSON.stringify(patch).slice(0, 160)}`);
  return patch;
}

export function applyOverrides(m: ProductModel, modelDir: string): ProductModel {
  const file = path.join(modelDir, "overrides.json");
  if (!fs.existsSync(file)) return ProductModel.parse(m);
  let patch: J;
  try { patch = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { throw new Error(`Invalid ${file}: ${(e as Error).message}`); }
  if (!isObj(patch)) throw new Error(`Invalid ${file}: expected a JSON object keyed like the product model`);
  const log: string[] = [];
  const merged = merge(m, patch, "model", log) as Record<string, J>;
  let out = ProductModel.parse(merged);
  // Numbers downstream stages quote must follow the corrected economy.
  if (log.some(l => l.startsWith("model.economy.") && !l.startsWith("model.economy.derived"))) {
    const economy = { ...out.economy, derived: deriveEconomy(out.economy) };
    out = { ...out, economy, regime: "regime" in patch ? out.regime : regimeOf(economy) };
  }
  // Every override that changed something is a human step; already-recorded ones are not logged twice.
  const ts = fs.statSync(file).mtime.toISOString();
  const known = new Set(out.human.map(x => x.note));
  const notes = log.map(l => `override (overrides.json): ${l.replace(/^model\./, "")}`);
  const fresh = notes.filter(n => !known.has(n));
  for (const note of fresh) trace("human", { note, source: "overrides.json" });
  return ProductModel.parse({ ...out, human: [...out.human, ...fresh.map(note => ({ ts, note }))] });
}
