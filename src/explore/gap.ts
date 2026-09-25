// Gap check (FINAL_PLAN §4.4 phase 2): after the crawl, one strong-model call reads a compact text of
// what was explored and compares it with a monetization checklist, then names at most 5 things to
// retry. Code applies them (never un-skipping a guard rail) and runs a short bounded crawl.
import { z } from "zod";
import { json } from "../core/llm.ts";
import { MODELS } from "../core/config.ts";
import { trace } from "../core/trace.ts";
import type { Action, ExploreGraph, State } from "../core/schema.ts";
import { isGuardSkip } from "./guards.ts";
import { DEFAULT_INPUT } from "./heuristic.ts";

export const CHECKLIST = [
  "currency or balance", "earn source", "spend cost per action", "wall (a limit is reached)", "store and prices",
  "subscription", "check-in or tasks", "ads", "entitlements (what paying unlocks)",
];

export const GapResult = z.object({
  checklist: z.array(z.object({ item: z.string(), found: z.boolean(), evidence: z.string() })),
  targets: z.array(z.object({
    state: z.string(),
    action: z.string().nullable(),   // an existing action id to retry
    scroll: z.boolean(),             // scroll the state to look further down
    input: z.string().nullable(),    // a different text to type into the state's input
    why: z.string(),
  })),
});
export type GapTarget = z.infer<typeof GapResult>["targets"][number];

const SYSTEM = [
  "You review the coverage of an autonomous mobile-app explorer. Its goal is to map the app's product and every part of its monetization.",
  "You get a compact text of the states it found, the actions on each (with status: done, no-effect, skipped + reason, unreachable, failed, untried), counters, signals, walls and external surfaces.",
  `Check this list: ${CHECKLIST.join("; ")}.`,
  "For each item say whether the graph already shows it, with the evidence. Then name at most 5 targets that would most likely reveal what is missing: an existing action to retry, a state to scroll, or a different short safe-for-work text to type.",
  "Never target actions skipped by a guard rail (reason starting with \"guard:\"), ads, log out, purchases or anything destructive.",
].join("\n");

const MAX_STATES = 60;
const MAX_ACTIONS = 25;

/** Deterministic compact text of the graph (no paths, timestamps or run ids: it is the cache key). */
export function compactGraph(g: ExploreGraph): string {
  const lines: string[] = [`App: ${g.app.name}`, ""];
  lines.push("Resources:");
  for (const r of g.resources) lines.push(`- ${r.id} "${r.name}" (${r.unit}) shown on ${[...new Set(r.bindings.map(b => b.state))].join(", ")}`);
  if (!g.resources.length) lines.push("(none found)");
  lines.push("", "States:");
  for (const s of g.states.slice(0, MAX_STATES)) {
    const sig = s.signals.slice(0, 6).map(x => `${x.kind}:"${x.text.slice(0, 40)}"`).join("; ");
    lines.push(`${s.id} [${s.kind}] "${s.name}" visits=${s.visits}${s.inScope ? "" : " (out of scope)"}${sig ? ` signals: ${sig}` : ""}`);
    for (const a of s.actions.slice(0, MAX_ACTIONS)) {
      lines.push(`  ${a.id} ${a.kind} p${a.priority} ${a.status}${a.skip ? ` (${a.skip})` : ""}: ${a.intent.slice(0, 70)}`);
    }
  }
  lines.push("", "Edges with effects:");
  for (const e of g.edges.filter(x => x.effects.length || x.limitHit).slice(0, 60)) {
    const fx = e.effects.slice(0, 4).map(f => (f.kind === "counter" ? `${f.resource} ${f.delta > 0 ? "+" : ""}${f.delta}${f.inferred ? " (inferred)" : ""}` : `${f.kind} "${f.text.slice(0, 40)}"`)).join("; ");
    lines.push(`${e.id} ${e.from} -${e.action}-> ${e.to}${e.limitHit ? " WALL" : ""} x${e.seen}: ${fx}`);
  }
  lines.push("", "External surfaces:");
  for (const x of g.externals.slice(0, 20)) lines.push(`- ${x.kind} from ${x.from} via ${x.action}: ${x.texts.slice(0, 6).map(t => `"${t.slice(0, 30)}"`).join(", ")}`);
  if (!g.externals.length) lines.push("(none)");
  return lines.join("\n");
}

export async function gapCheck(g: ExploreGraph, round: number): Promise<GapTarget[]> {
  try {
    const out = await json({
      stage: "explore",
      purpose: `gap:r${round}`,
      model: MODELS.main,
      effort: "high",
      system: [SYSTEM],
      prompt: compactGraph(g),
      schema: GapResult,
      maxTokens: 12_000,
      // stub: without a model there is no second opinion, so nothing to retry
      stub: () => ({ checklist: [], targets: [] }),
    });
    for (const c of out.checklist) trace("info", { phase: "gap", item: c.item, found: c.found, evidence: c.evidence.slice(0, 160) });
    return out.targets.slice(0, 5);
  } catch (e) {
    trace("failure", { where: "gap-check", error: String((e as Error)?.message ?? e).slice(0, 300) });
    trace("recovery", { how: "skipped the gap check" });
    return [];
  }
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function newActionId(s: State): string {
  const num = Number(s.id.replace(/\D/g, "")) || 0;
  const max = Math.max(0, ...s.actions.map(a => Number(a.id.split("_")[1]) || 0));
  return `a${pad2(num)}_${max + 1}`;
}

/** Boost the targets to priority 3 and make them untried again. Returns how many were applied. */
export function applyGapTargets(g: ExploreGraph, targets: GapTarget[]): number {
  let n = 0;
  for (const t of targets) {
    const s = g.states.find(x => x.id === t.state);
    if (!s) continue;
    const note = `gap check: ${t.why.slice(0, 120)}`;
    const a = t.action ? s.actions.find(x => x.id === t.action) : undefined;
    if (a && !isGuardSkip(a.skip) && a.kind !== "back") {
      Object.assign(a, { status: "untried", priority: 3, tries: 0, note });
      delete a.skip;
      n++;
    }
    if (t.scroll) {
      const sc = s.actions.find(x => x.kind === "scroll");
      if (sc) Object.assign(sc, { status: "untried", priority: 3, tries: 0, note });
      else s.actions.push({ id: newActionId(s), kind: "scroll", intent: "scroll down to reveal more", priority: 3, status: "untried", tries: 0, note });
      n++;
    }
    const field = s.actions.find(x => (x.kind === "consume" || x.kind === "type-send") && !isGuardSkip(x.skip));
    if (t.input && field) {
      const copy: Action = { ...field, id: newActionId(s), input: t.input.slice(0, 80) || DEFAULT_INPUT, priority: 3, status: "untried", tries: 0, note };
      delete copy.skip;
      s.actions.push(copy);
      n++;
    }
  }
  return n;
}
