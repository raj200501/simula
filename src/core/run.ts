// Stage runner: sets trace/LLM context, writes out/<app>/<stage>/manifest.json with inputs (sha256),
// outputs, status, LLM calls/cost. Every stage is independently re-runnable and inspectable.
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { Manifest } from "./schema.ts";
import { fileSha, nowIso, runId as mkRunId, save } from "./io.ts";
import { setTraceContext, trace } from "./trace.ts";
import { llmStats, resetLlmStats, setLlmContext, type LlmMode } from "./llm.ts";
import type { AppConfig, Paths, Profile } from "./config.ts";

export interface StageCtx {
  app: AppConfig;
  profile: Profile;
  paths: Paths;
  runId: string;
  llm: LlmMode;
  opts: Record<string, unknown>;
}

function gitSha(): string | undefined {
  try { return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return undefined; }
}

export async function stage<T>(
  name: string,
  base: Omit<StageCtx, "runId">,
  inputs: string[],
  fn: (c: StageCtx) => Promise<{ outputs: string[]; stopReason?: string; result?: T }>,
): Promise<T | undefined> {
  const runId = mkRunId(name.slice(0, 2));
  const c: StageCtx = { ...base, runId };
  setTraceContext({ app: base.app.id, run: runId, stage: name, file: base.paths.trace });
  setLlmContext({ app: base.app.id, mode: base.llm, costFile: base.paths.cost, stageCaps: stageCaps(base.profile) });
  resetLlmStats();
  const mfFile = path.join(base.paths.out, name, "manifest.json");
  const mf: Manifest = {
    stage: name, app: base.app.id, runId, gitSha: gitSha(), startedAt: nowIso(), status: "running",
    inputs: inputs.filter(p => fs.existsSync(p) && fs.statSync(p).isFile()).map(p => ({ path: path.relative(base.paths.out, p), sha256: fileSha(p) })),
    outputs: [],
  };
  save(Manifest, mfFile, mf);
  trace("stage", { event: "start", stage: name, llm: base.llm });
  const t0 = Date.now();
  try {
    const r = await fn(c);
    const s = llmStats();
    save(Manifest, mfFile, { ...mf, finishedAt: nowIso(), status: "ok", stopReason: r.stopReason, outputs: r.outputs.map(o => path.relative(base.paths.out, o)), llm: { calls: s.calls, cached: s.cached, usd: Number(s.usd.toFixed(4)), mode: s.mode } });
    trace("stage", { event: "end", stage: name, ms: Date.now() - t0, llm: s });
    process.stderr.write(`[${name}] ok in ${((Date.now() - t0) / 1000).toFixed(1)}s  llm: ${s.calls} calls (${s.cached} cached) $${s.usd.toFixed(3)} [${s.mode}]\n`);
    return r.result;
  } catch (e) {
    const s = llmStats();
    save(Manifest, mfFile, { ...mf, finishedAt: nowIso(), status: "failed", error: String((e as Error)?.stack ?? e).slice(0, 2000), llm: { calls: s.calls, cached: s.cached, usd: Number(s.usd.toFixed(4)), mode: s.mode } });
    trace("failure", { where: `stage:${name}`, error: String((e as Error)?.message ?? e) });
    throw e;
  }
}

function stageCaps(p: Profile): Record<string, number> {
  return { explore: p.exploreUsd, qa: p.qaUsd };
}
