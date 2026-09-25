// The trajectory deliverable: an append-only JSONL of everything that ran, failed, recovered,
// or was done by a human. `summarize()` renders trajectory.md from it.
import fs from "node:fs";
import path from "node:path";
import { ensureDir, nowIso } from "./io.ts";

export type TraceType =
  | "stage" | "mcp_call" | "llm_call" | "observe" | "decision" | "effect" | "external"
  | "failure" | "recovery" | "human" | "budget" | "stop" | "qa" | "judge" | "info";

export interface TraceEvent {
  ts: string; app: string; run: string; stage: string; step?: number; type: TraceType; data: Record<string, unknown>;
}

interface Ctx { app: string; run: string; stage: string; file: string | null; echo: boolean }
const ctx: Ctx = { app: "-", run: "-", stage: "-", file: null, echo: !!process.env.SIMULA_TRACE_ECHO };

export function setTraceContext(c: Partial<Ctx>): void {
  Object.assign(ctx, c);
  if (ctx.file) ensureDir(path.dirname(ctx.file));
}

export function traceContext(): Readonly<Ctx> {
  return ctx;
}

export function trace(type: TraceType, data: Record<string, unknown>, step?: number): void {
  const ev: TraceEvent = { ts: nowIso(), app: ctx.app, run: ctx.run, stage: ctx.stage, step, type, data };
  if (ctx.file) fs.appendFileSync(ctx.file, JSON.stringify(ev) + "\n");
  if (ctx.echo || type === "failure" || type === "human" || type === "stop") {
    const s = step !== undefined ? `#${step} ` : "";
    process.stderr.write(`[${ctx.stage}] ${s}${type} ${short(data)}\n`);
  }
}

function short(d: Record<string, unknown>): string {
  const s = JSON.stringify(d);
  return s.length > 220 ? s.slice(0, 217) + "..." : s;
}

export function readTrace(file: string): TraceEvent[] {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l) as TraceEvent);
}

/** Render trajectory.md: phases, discovery over time, failures + recoveries, human steps, stop reasons, autonomy ratio. */
export function summarize(file: string, outMd: string): string {
  const evs = readTrace(file);
  const byStage = new Map<string, TraceEvent[]>();
  for (const e of evs) byStage.set(`${e.stage}::${e.run}`, [...(byStage.get(`${e.stage}::${e.run}`) ?? []), e]);
  const fails = evs.filter(e => e.type === "failure");
  const recov = evs.filter(e => e.type === "recovery");
  const human = evs.filter(e => e.type === "human");
  const decisions = evs.filter(e => e.type === "decision");
  const autonomous = decisions.length;
  const ratio = autonomous + human.length ? autonomous / (autonomous + human.length) : 1;
  const lines: string[] = [];
  lines.push(`# Trajectory: ${evs[0]?.app ?? "?"}`, "");
  lines.push(`Autonomous decisions: **${autonomous}**. Human interventions: **${human.length}**. Autonomy ratio: **${(ratio * 100).toFixed(1)}%**.`, "");
  lines.push("## Stage runs", "", "| stage | run | start | end | events | failures | stop |", "|---|---|---|---|---|---|---|");
  for (const [k, list] of byStage) {
    const [stage, run] = k.split("::");
    const stop = list.find(e => e.type === "stop");
    lines.push(`| ${stage} | ${run} | ${list[0].ts.slice(11, 19)} | ${list[list.length - 1].ts.slice(11, 19)} | ${list.length} | ${list.filter(e => e.type === "failure").length} | ${stop ? String(stop.data.reason ?? "") : ""} |`);
  }
  const obs = evs.filter(e => e.type === "observe" && e.data.isNew);
  if (obs.length) {
    lines.push("", "## New states discovered over time", "");
    for (const e of obs) lines.push(`- step ${e.step ?? "?"} (${e.ts.slice(11, 19)}): **${e.data.state}** ${e.data.name ? `"${e.data.name}"` : ""}`);
  }
  lines.push("", "## Failures and recoveries", "");
  if (!fails.length) lines.push("None recorded.");
  for (const f of fails) {
    const r = recov.find(x => x.ts >= f.ts && x.stage === f.stage);
    lines.push(`- [${f.stage}] ${f.ts.slice(11, 19)} **${String(f.data.where ?? "")}**: ${String(f.data.error ?? "").slice(0, 200)}${r ? `\n  - recovered by: ${String(r.data.how ?? "")}` : ""}`);
  }
  lines.push("", "## Human interventions", "");
  if (!human.length) lines.push("None recorded.");
  for (const h of human) lines.push(`- ${h.ts.slice(0, 19)} [${h.stage}] ${String(h.data.note ?? "")}`);
  const keyDecisions = decisions.filter(d => (d.data.priority as number) >= 3).slice(0, 40);
  if (keyDecisions.length) {
    lines.push("", "## Key exploration decisions (priority 3)", "");
    for (const d of keyDecisions) lines.push(`- step ${d.step}: ${d.data.state} -> ${d.data.action}: ${String(d.data.why ?? "")}`);
  }
  const md = lines.join("\n") + "\n";
  ensureDir(path.dirname(outMd));
  fs.writeFileSync(outMd, md);
  return md;
}
