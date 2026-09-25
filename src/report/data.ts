// Read-only roll-ups of the run artifacts that both the deck appendix and the report site show:
// the cost ledger, the QA summary and the trace. Every reader tolerates a missing or partial file
// (a stage that has not run yet is normal), and never throws on one bad line.
import fs from "node:fs";
import { readTrace } from "../core/trace.ts";

export interface CostRow { stage: string; live: number; cached: number; usd: number; tokensIn: number; tokensOut: number; thoughts: number }
export interface CostRollup extends CostRow { providers: string[]; models: string[]; byStage: CostRow[] }

/** Roll up out/<app>/cost.jsonl. Cached rows carry no tokens; stub calls are never written to it. */
export function rollupCost(file: string): CostRollup {
  const total: CostRollup = { stage: "total", live: 0, cached: 0, usd: 0, tokensIn: 0, tokensOut: 0, thoughts: 0, providers: [], models: [], byStage: [] };
  const by = new Map<string, CostRow>();
  for (const r of jsonl(file)) {
    const stage = String(r.stage ?? "?");
    const row = by.get(stage) ?? { stage, live: 0, cached: 0, usd: 0, tokensIn: 0, tokensOut: 0, thoughts: 0 };
    for (const x of [row, total]) {
      if (r.cached) x.cached++; else x.live++;
      x.usd += num(r.usd);
      x.tokensIn += num(r.in) + num(r.cacheRead) + num(r.cacheWrite);
      x.tokensOut += num(r.out);
      x.thoughts += num(r.thoughts);
    }
    by.set(stage, row);
    if (r.provider && !total.providers.includes(String(r.provider))) total.providers.push(String(r.provider));
    if (r.model && !r.cached && !total.models.includes(String(r.model))) total.models.push(String(r.model));
  }
  total.byStage = [...by.values()];
  return total;
}

export interface QaDigest {
  screens: { id: string; name: string; render: string; composite: number | null; rounds: number; mustFix: number }[];
  compositeMean: number | null;
  flowTotal: number;
  flowPassed: number;
  flowRate: number | null;
  htmlShare: number | null;
  failures: { edge: string; reason: string }[];
}

/** Parse qa/summary.json (shape: QaSummary in src/qa/loop.ts) without importing the QA module. */
export function readQa(file: string): QaDigest | null {
  const raw = readJsonSafe(file) as Record<string, any> | null;
  if (!raw || !Array.isArray(raw.screens)) return null;
  const screens = raw.screens.map((s: Record<string, any>) => ({
    id: String(s.id ?? "?"), name: String(s.name ?? s.id ?? "?"), render: String(s.render ?? "?"),
    composite: typeof s.composite === "number" ? s.composite : null, rounds: num(s.rounds), mustFix: num(s.mustFix),
  }));
  const scored = screens.map((s: { composite: number | null }) => s.composite).filter((x: number | null): x is number => x != null);
  const flowTotal = num(raw.flow?.total), flowPassed = num(raw.flow?.passed);
  return {
    screens,
    compositeMean: scored.length ? scored.reduce((a: number, b: number) => a + b, 0) / scored.length : null,
    flowTotal, flowPassed, flowRate: flowTotal ? flowPassed / flowTotal : null,
    htmlShare: typeof raw.htmlShare === "number" ? raw.htmlShare : null,
    failures: Array.isArray(raw.flow?.failures) ? raw.flow.failures.map((f: Record<string, unknown>) => ({ edge: String(f.edge ?? ""), reason: String(f.reason ?? "") })) : [],
  };
}

export interface TraceStats { human: number; humanNotes: string[]; failures: number; recoveries: number; decisions: number }

export function traceStats(file: string): TraceStats {
  const evs = safe(() => readTrace(file), []);
  const human = evs.filter(e => e.type === "human");
  return {
    human: human.length,
    humanNotes: human.map(e => String(e.data.note ?? "")).filter(Boolean),
    failures: evs.filter(e => e.type === "failure").length,
    recoveries: evs.filter(e => e.type === "recovery").length,
    decisions: evs.filter(e => e.type === "decision").length,
  };
}

export function readJsonSafe(file: string): unknown {
  try {
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
  } catch {
    return null;
  }
}

function jsonl(file: string): Record<string, unknown>[] {
  if (!fs.existsSync(file)) return [];
  const out: Record<string, unknown>[] = [];
  for (const l of fs.readFileSync(file, "utf8").split("\n")) {
    if (!l.trim()) continue;
    try { out.push(JSON.parse(l)); } catch { /* a torn last line from a crash: skip it */ }
  }
  return out;
}

function safe<T>(f: () => T, fallback: T): T {
  try { return f(); } catch { return fallback; }
}

const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : 0);

export const fmtUsd = (x: number) => (x === 0 ? "$0" : x < 0.01 ? `$${x.toFixed(4)}` : `$${x.toFixed(2)}`);
export const fmtInt = (x: number) => Math.round(x).toLocaleString("en-US");
export function fmtTokens(x: number): string {
  if (x >= 1e6) return `${(x / 1e6).toFixed(1)}M`;
  if (x >= 1e3) return `${(x / 1e3).toFixed(1)}k`;
  return String(Math.round(x));
}
