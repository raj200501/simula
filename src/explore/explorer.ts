// The explorer (FINAL_PLAN §4.4 with BUILD_SPEC T1/T2/T3/T7/T8). It drives the app through the Device
// interface only, so the same code crawls an emulator, a web page, or our own generated mock.
//
//   PHASE 1  CRAWL      on the current state, do the best untried action (the annotator advises
//                       priorities; code decides). When the state is done, travel over known edges to
//                       the most valuable reachable state that still has untried actions.
//   PHASE 2  GAP CHECK  one strong-model call compares coverage with a monetization checklist and
//                       names <= 5 things to retry; a short bounded crawl retries them.
//   PHASE 3  DRAIN      repeat the costliest consume action (send a message) until a wall. Spending
//                       cannot be undone, so it runs last. When the balance is not visible where the
//                       action happens, it travels to a screen that shows it every 3 sends (T1).
//
// Every step is checkpointed to graph.json (atomic write), so a crashed run continues with --resume.
import fs from "node:fs";
import path from "node:path";
import type { Device } from "../device/types.ts";
import type { Paths } from "../core/config.ts";
import type { StageCtx } from "../core/run.ts";
import {
  ExploreGraph, type Action, type DeviceInfo, type Effect, type ExternalKind, type GraphEdge, type NormElement,
  type Observation, type State, type StopReason,
} from "../core/schema.ts";
import { ensureDir, load, nowIso, save, sleep, writeText } from "../core/io.ts";
import { summarize, trace, traceContext } from "../core/trace.ts";
import { llmStats } from "../core/llm.ts";
import {
  DEFAULT_TIMING, excludeText, excludeTyped, isExcluded, keyPrefix, newExclusions, normalize, observe, readCounters,
  replyLike, settleContent, settleUi, snapshot, type Counter, type Exclusions, type ObserveOpts, type Snapshot, type Timing,
} from "./observe.ts";
import { counterEffects, diffEffects, labelCounts, labelOf, matchState } from "./signature.ts";
import { annotate, toActions, toSignals, type Annotation, type AnnotateOut } from "./annotate.ts";
import { isInput } from "./heuristic.ts";
import { perform, type ActResult } from "./act.ts";
import { classifyForeground, escapeExternal, isInApp } from "./externals.ts";
import { WALL_KINDS } from "./signals.ts";
import { applyGapTargets, gapCheck } from "./gap.ts";

export { probe, type ProbeReport } from "./probe.ts";

export interface ExploreOpts {
  resume?: boolean;
  noConsume?: boolean;
  noGap?: boolean;
  steps?: number;
  annotator?: "llm" | "heuristic";
  /** Poll and wait times (tests use short ones; a real device needs the defaults). */
  timing?: Partial<Timing>;
}

const MAX_DEVICE_FAILURES = 5;     // consecutive device errors before stopReason "device_unhealthy"
const GAP_STEPS = 25;              // bounded crawl after each gap-check round
const AFTER_WALL_STEPS = 12;       // explore the wall's own actions (refill, decline) after the drain
const MAX_IDLE_MOVES = 8;          // travels in a row without an action: the frontier is not really reachable
const HUMAN_WAIT_MS = 10 * 60_000;
const MAX_FX = 60;
const MAX_VARIANTS = 8;
const OVERLAY_KINDS = new Set(["modal", "sheet", "dialog", "paywall"]);

/** out/<app>/explore/latest holds the runId of the newest exploration. */
export function latestGraphFile(p: Paths): string {
  const f = path.join(p.explore, "latest");
  if (!fs.existsSync(f)) throw new Error(`No exploration yet: ${f} is missing`);
  return path.join(p.explore, fs.readFileSync(f, "utf8").trim(), "graph.json");
}

class DeviceUnhealthy extends Error {}

interface Run {
  c: StageCtx;
  dev: Device;
  o: ExploreOpts;
  g: ExploreGraph;
  runDir: string;
  graphFile: string;
  info: DeviceInfo;
  timing: Timing;
  annotator: "llm" | "heuristic";
  ex: Exclusions;             // typed text and provoked replies: never identity (T2)
  variants: Map<string, string[][]>; // extra signatures per state: scrolled views, sameAs pages
  cur: State;                 // where we are
  last: Observation;          // what we last saw there (baseline for the next diff)
  t0: number;
  usd0: number;
  stepCap: number;
  deviceFailures: number;
  travelFailures: Map<string, number>;
  idleMoves: number;
  stop: StopReason | null;    // hard stops: interrupted, device_unhealthy
  usdHit: boolean;
}

interface CrawlOpts { stepCap: number; noConsume?: boolean; saturation?: boolean; grace?: boolean }

interface StepOut { next: State; edge?: GraphEdge; fx: Effect[]; external?: ExternalKind; wall?: boolean; failed?: boolean }

const pad = (n: number, w: number) => String(n).padStart(w, "0");
const msg = (e: unknown) => String((e as Error)?.message ?? e).slice(0, 300);
const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

// =============================================================================================
// Entry point
// =============================================================================================
export async function explore(c: StageCtx, dev: Device, o: ExploreOpts = {}): Promise<{ graphFile: string; graph: ExploreGraph }> {
  const info = await dev.info();
  let g: ExploreGraph;
  let graphFile: string;
  if (o.resume) {
    graphFile = latestGraphFile(c.paths);
    g = load(ExploreGraph, graphFile);
    g.stopReason = undefined;
    g.finishedAt = undefined;
    g.stepsSinceNew = 0;
  } else {
    g = newGraph(c, info);
    graphFile = path.join(c.paths.explore, g.runId, "graph.json");
  }
  const runDir = path.dirname(graphFile);
  ensureDir(path.join(runDir, "obs"));
  writeText(path.join(c.paths.explore, "latest"), g.runId);
  const r = {
    c, dev, o, g, runDir, graphFile, info,
    timing: { ...DEFAULT_TIMING, ...o.timing },
    annotator: o.annotator ?? (dev.kind === "web" ? "heuristic" : "llm"),
    ex: exclusionsFrom(g),
    variants: variantsFrom(g),
    t0: Date.now(),
    usd0: g.usd,
    // --resume --steps N means N more steps; otherwise the profile's crawl budget
    stepCap: o.resume && o.steps ? g.steps + o.steps : (o.steps ?? c.profile.crawlSteps),
    deviceFailures: 0,
    travelFailures: new Map<string, number>(),
    idleMoves: 0,
    stop: null,
    usdHit: false,
  } as Run;

  const onSigint = () => { r.stop = "interrupted"; trace("info", { note: "SIGINT: stopping after the current step" }); };
  process.once("SIGINT", onSigint);
  let reason: StopReason = "done";
  let error: unknown = null;
  try {
    trace("info", { phase: "start", resume: !!o.resume, annotator: r.annotator, stepCap: r.stepCap, device: info }, g.steps);
    await guardedDevice(r, "launch", () => dev.launch({ cold: !o.resume }));
    await arriveInApp(r, "launch");
    g.launchState ??= r.cur.id;
    checkpoint(r);

    reason = await crawl(r, { stepCap: r.stepCap });
    trace("info", { phase: "crawl", end: reason }, g.steps);
    if (!r.stop && reason !== "budget_usd" && reason !== "budget_time") await gapPhase(r);
    if (!r.stop) {
      const end = await drainProbe(r);
      if (end === "wall" && !r.stop) {
        const after = await crawl(r, { stepCap: g.steps + AFTER_WALL_STEPS, noConsume: true, saturation: false, grace: true });
        trace("info", { phase: "after-wall", end: after }, g.steps);
      }
    }
  } catch (e) {
    if (!(e instanceof DeviceUnhealthy)) error = e;
    if (!r.stop) r.stop = e instanceof DeviceUnhealthy ? "device_unhealthy" : "interrupted";
    trace("failure", { where: "explore", error: msg(e) }, g.steps);
  } finally {
    process.off("SIGINT", onSigint);
  }
  finalize(r, r.stop ?? reason);
  if (error) throw error;
  return { graphFile, graph: g };
}

function newGraph(c: StageCtx, info: DeviceInfo): ExploreGraph {
  return {
    schema: "simula.explore-graph/1",
    app: { id: c.app.id, package: c.app.package, name: c.app.name },
    runId: c.runId, device: info, startedAt: nowIso(),
    states: [], edges: [], observations: [], resources: [], externals: [], typed: [],
    steps: 0, stepsSinceNew: 0, usd: 0, human: [],
  };
}

/** On resume, rebuild what must never count as identity from the graph itself. */
function exclusionsFrom(g: ExploreGraph): Exclusions {
  const ex = newExclusions();
  for (const t of g.typed) excludeTyped(ex, t);
  for (const e of g.edges) {
    const a = actionOf(g, e);
    if (a?.kind !== "consume") continue;
    for (const f of e.effects) if (f.kind === "appeared" && replyLike(f.text)) excludeText(ex, f.text);
  }
  return ex;
}

/** On resume, scrolled views are known variants of their state again. */
function variantsFrom(g: ExploreGraph): Map<string, string[][]> {
  const v = new Map<string, string[][]>();
  for (const s of g.states) {
    const scrolled = g.observations.filter(o => o.scrollIndex > 0 && s.obs.includes(o.id)).map(o => o.signature);
    if (scrolled.length) v.set(s.id, scrolled.slice(0, MAX_VARIANTS));
  }
  return v;
}

function addVariant(r: Run, st: State, sig: string[]): void {
  const list = r.variants.get(st.id) ?? [];
  const key = sig.join("\n");
  if (key === st.signature.join("\n") || list.some(v => v.join("\n") === key) || list.length >= MAX_VARIANTS) return;
  list.push(sig);
  r.variants.set(st.id, list);
}

function finalize(r: Run, reason: StopReason): void {
  const g = r.g;
  if (r.o.noConsume) {
    for (const s of g.states) for (const a of s.actions) {
      if (a.kind === "consume" && a.status === "untried") { a.status = "skipped"; a.skip = "consume disabled (--no-consume)"; }
    }
  }
  g.stopReason = reason;
  g.finishedAt = nowIso();
  g.usd = usd(r);
  trace("stop", {
    reason, steps: g.steps, states: g.states.length, edges: g.edges.length, externals: g.externals.length,
    walls: g.edges.filter(e => e.limitHit).length, minutes: round(minutes(r)), usd: g.usd,
  }, g.steps);
  save(ExploreGraph, r.graphFile, g);
  writeText(path.join(r.c.paths.explore, "latest"), g.runId);
  const tf = traceContext().file;
  if (tf && fs.existsSync(tf)) summarize(tf, path.join(r.runDir, "trajectory.md"));
}

function checkpoint(r: Run): void {
  r.g.usd = usd(r);
  save(ExploreGraph, r.graphFile, r.g);
}

const usd = (r: Run) => round(r.usd0 + llmStats().usd, 4);
const minutes = (r: Run) => (Date.now() - r.t0) / 60_000;

// =============================================================================================
// Phase 1: crawl
// =============================================================================================
function shouldStop(r: Run, co: CrawlOpts): StopReason | null {
  const p = r.c.profile;
  if (r.stop) return r.stop;
  if (r.usdHit || usd(r) >= p.exploreUsd) return "budget_usd";
  if (minutes(r) >= p.minutes * (co.grace ? 1.5 : 1)) return "budget_time";
  if (r.g.steps >= co.stepCap) return "budget_steps";
  if (co.saturation !== false && r.g.stepsSinceNew >= p.saturation) return "saturated";
  return null;
}

/** Untried, not skipped; a consume action only once during the crawl (the drain probe repeats it). */
function eligible(a: Action, allowConsume: boolean): boolean {
  return a.status === "untried" && (a.kind !== "consume" || (allowConsume && a.tries === 0));
}

/** Highest priority first; actions are stored in reading order, so ties go top to bottom. */
function nextAction(s: State, allowConsume: boolean): Action | undefined {
  return s.actions.filter(a => eligible(a, allowConsume)).sort((x, y) => y.priority - x.priority)[0];
}

async function crawl(r: Run, co: CrawlOpts): Promise<StopReason> {
  const allowConsume = !(co.noConsume || r.o.noConsume);
  for (;;) {
    const stop = shouldStop(r, co);
    if (stop) return stop;
    const a = nextAction(r.cur, allowConsume);
    if (a) {
      r.idleMoves = 0;
      await step(r, r.cur, a, "crawl");
      continue;
    }
    if (++r.idleMoves > MAX_IDLE_MOVES) {
      trace("failure", { where: "frontier", error: `${MAX_IDLE_MOVES} travels without reaching an untried action` }, r.g.steps);
      markUnreachable(r, s => s.actions.some(x => eligible(x, allowConsume)), allowConsume, "travel kept missing it");
      return "frontier_empty";
    }
    const moved = await toFrontier(r, allowConsume);
    if (moved === "empty") return "frontier_empty";
  }
}

/** One action: perform, observe, classify (external / state), diff, record the edge, checkpoint. */
async function step(r: Run, from: State, a: Action, phase: string): Promise<StepOut> {
  const g = r.g;
  g.steps++;
  g.stepsSinceNew++;
  a.tries++;
  trace("decision", {
    state: from.id, action: a.id, kind: a.kind, intent: a.intent, priority: a.priority, phase,
    why: `p${a.priority} ${a.intent}${a.note ? ` [${a.note}]` : ""}`,
    alternatives: from.actions.filter(x => x !== a && x.status === "untried").slice(0, 3).map(x => `${x.id}:p${x.priority}`),
  }, g.steps);
  const before = r.last;
  const res = await tryPerform(r, a, from);
  if (!res.ok) {
    a.status = res.skip ? "skipped" : a.tries >= 2 || !res.reason.startsWith("device") ? "failed" : "untried";
    if (res.skip) a.skip = res.reason;
    a.note = res.reason;
    trace("failure", { where: `act:${a.id}`, error: res.reason }, g.steps);
    await arriveInApp(r, "a failed action"); // resync: we may have scrolled or moved
    checkpoint(r);
    return { next: r.cur, fx: [], failed: true };
  }
  if (res.typed) noteTyped(r, res.typed);
  if (res.note) a.note = res.note;
  const consume = a.kind === "consume";
  const obs = await observeNow(r, { mode: consume || a.kind === "type-send" ? "content" : "ui", before, excludeAppeared: consume });
  if (!isInApp(obs.fg, g.app.package)) {
    const kind = await handleExternal(r, from, a, before, obs);
    checkpoint(r);
    return { next: r.cur, fx: [], external: kind };
  }
  const next = await arrive(r, obs, { prev: before, prevState: from, scrollOf: a.kind === "scroll" ? from : undefined });
  const fx = diffEffects(before, obs, boundKeys(r));
  // T2: only a consume that lands on a wall-like screen is a limit; a different state id is not enough
  const wall = consume && isWall(from, next);
  const edge = recordEdge(r, from, a, next.id, before, obs, fx, wall);
  // an action that ever did something stays "done" (a later repeat may change nothing)
  a.status = a.status === "done" || next.id !== from.id || fx.length > 0 ? "done" : "no-effect";
  checkpoint(r);
  return { next, edge, fx, wall };
}

async function tryPerform(r: Run, a: Action, owner: State): Promise<ActResult> {
  try {
    const res = await perform(actCtx(r), a, hintRect(r, owner, a));
    r.deviceFailures = 0;
    return res;
  } catch (e) {
    if (e instanceof DeviceUnhealthy) throw e;
    countFailure(r, `perform:${a.id}`, e);
    return { ok: false, reason: `device error: ${msg(e)}` };
  }
}

function actCtx(r: Run) {
  return { dev: r.dev, info: r.info, timing: r.timing, normalize: (raw: Parameters<typeof normalize>[0]) => normalize(raw, r.info, r.ex) };
}

/** Where the element was when the state was annotated: re-finding prefers the nearest same-key element. */
function hintRect(r: Run, owner: State, a: Action) {
  if (!a.elKey) return undefined;
  for (const id of owner.obs) {
    const o = r.g.observations.find(x => x.id === id);
    const el = o?.elements.find(e => e.key === a.elKey);
    if (el) return el.rect;
  }
  return undefined;
}

function noteTyped(r: Run, s: string): void {
  excludeTyped(r.ex, s);
  if (!r.g.typed.includes(s)) r.g.typed.push(s);
}

const boundKeys = (r: Run) => new Set(r.g.resources.flatMap(x => x.bindings.map(b => b.elKey)));

/**
 * T2 wall test for an action that spends: the next state differs AND it is an overlay (modal, sheet,
 * dialog, paywall), or a screen of a different kind (not another chat), or it carries a new
 * limit/price/upsell signal.
 */
export function isWall(from: State, next: State): boolean {
  if (next.id === from.id) return false;
  if (OVERLAY_KINDS.has(next.kind)) return true;
  if (next.kind !== "chat" && next.kind !== from.kind) return true;
  return next.signals.some(s => WALL_KINDS.has(s.kind) && !from.signals.some(f => f.kind === s.kind && f.text === s.text));
}

// =============================================================================================
// Observing and arriving
// =============================================================================================
async function observeNow(r: Run, o: ObserveOpts): Promise<Observation> {
  const id = `o${pad(r.g.observations.length + 1, 4)}`;
  for (let attempt = 1; ; attempt++) {
    try {
      const obs = await observe({ dev: r.dev, info: r.info, ex: r.ex, resources: r.g.resources, runDir: r.runDir, timing: r.timing }, id, r.g.steps, o);
      r.deviceFailures = 0;
      return obs;
    } catch (e) {
      if (e instanceof DeviceUnhealthy) throw e;
      countFailure(r, "observe", e);
      await sleep(Math.min(1000, r.timing.settleMaxMs));
      if (attempt >= 2) {
        await soft(guardedDevice(r, "launch", () => r.dev.launch({ cold: true })), undefined);
        trace("recovery", { how: "cold relaunch after repeated observe failures" }, r.g.steps);
      }
    }
  }
}

/** Observe; if another app is in front (after launch, a failure, a relaunch), escape it first. */
async function arriveInApp(r: Run, why: string): Promise<State> {
  for (let i = 0; i < 3; i++) {
    const obs = await observeNow(r, { mode: "ui" });
    if (isInApp(obs.fg, r.g.app.package)) return arrive(r, obs, {});
    const kind = classifyForeground(obs.fg, r.g.app.package) as ExternalKind;
    trace("external", { kind, pkg: obs.fg, during: why }, r.g.steps);
    const how = await soft(guardedDevice(r, "escape", () => escapeExternal(r.dev, kind, r.g.app.package, r.timing.pollMs)), "escape failed");
    trace("recovery", { how }, r.g.steps);
    if (i === 1) await soft(guardedDevice(r, "launch", () => r.dev.launch({ cold: true })), undefined);
  }
  r.stop = "device_unhealthy";
  throw new DeviceUnhealthy(`cannot get back into the app (${why})`);
}

/**
 * Attach an observation to a state: match it (exact -> Jaccard -> dHash -> annotator sameAs) or create
 * a new state, annotated once. A scrolled view is merged into the state it was scrolled from.
 */
async function arrive(r: Run, obs: Observation, ctx: { prev?: Observation | null; prevState?: State; scrollOf?: State }): Promise<State> {
  const g = r.g;
  g.observations.push(obs);
  const m = matchState(g.states, obs, r.variants);
  let st = m.state;
  let how: string = m.how;
  let isNew = false;
  let out: AnnotateOut | null = null;
  // a scroll stays on its state (unless it exactly matches another one); if the view moved, record the
  // scrolled view as a variant and add actions for what it revealed
  if (ctx.scrollOf && !(m.how === "exact" && st && st.id !== ctx.scrollOf.id)) {
    st = ctx.scrollOf;
    if (obs.signature.join("\n") !== st.signature.join("\n")) {
      how = "scroll";
      obs.scrollIndex = r.last && r.cur?.id === st.id ? r.last.scrollIndex + 1 : 1;
      addVariant(r, st, obs.signature);
      addRevealedActions(r, st, obs);
    }
  }
  if (!st && m.borderline.length) {
    out = await annotateObs(r, obs, ctx.prev ?? null, m.borderline);
    const same = out.ann.sameAs ? m.borderline.find(s => s.id === out!.ann.sameAs) : undefined;
    if (same) { st = same; how = "sameAs"; addVariant(r, st, obs.signature); }
  }
  if (!st) {
    out ??= await annotateObs(r, obs, ctx.prev ?? null, []);
    st = createState(r, obs, out);
    isNew = true;
    g.stepsSinceNew = 0;
  }
  st.obs.push(obs.id);
  st.visits++;
  obs.counters = readCounters(obs.elements, g.resources);
  r.cur = st;
  r.last = obs;
  trace("observe", { obs: obs.id, state: st.id, isNew, name: st.name, kind: st.kind, how, jaccard: round(m.score), counters: obs.counters }, g.steps);
  if (isNew && st.loginWall && (await humanHook(r, st)) === "resumed") {
    return arrive(r, await observeNow(r, { mode: "ui" }), { prev: obs, prevState: st });
  }
  return st;
}

async function annotateObs(r: Run, obs: Observation, prev: Observation | null, candidates: State[]): Promise<AnnotateOut> {
  const out = await annotate({ obs, runDir: r.runDir, info: r.info, appName: r.g.app.name, prev, candidates, mode: r.annotator });
  if (out.budgetHit) r.usdHit = true;
  return out;
}

function createState(r: Run, obs: Observation, out: AnnotateOut): State {
  const g = r.g;
  const num = g.states.length + 1;
  const ann = out.ann;
  const st: State = {
    id: `s${pad(num, 2)}`, signature: obs.signature, dhash: obs.dhash, obs: [],
    name: ann.name.trim() || `Screen ${num}`, kind: ann.kind, purpose: ann.purpose, inScope: ann.inScope,
    scrollable: ann.scrollable, loginWall: ann.loginWall, annotatedBy: out.by,
    actions: toActions(ann.actions, obs, num, { tapScale: out.tapScale, scrollable: ann.scrollable }),
    signals: toSignals(ann, obs), visits: 0, firstStep: g.steps,
  };
  g.states.push(st);
  registerCounters(r, st, ann, obs);
  return st;
}

const resourceName = (s: string) => s.trim().toLowerCase().replace(/s$/, "");

/** Counters the annotator found become resources bound to (state, element key): read on every visit. */
function registerCounters(r: Run, st: State, ann: Annotation, obs: Observation): void {
  for (const k of ann.counters) {
    const el = obs.elements.find(e => e.id === k.el);
    if (!el || !k.name.trim()) continue;
    let res = r.g.resources.find(x => resourceName(x.name) === resourceName(k.name));
    if (!res) {
      res = { id: `r${r.g.resources.length + 1}`, name: k.name.trim().toLowerCase(), unit: k.unit.trim() || k.name.trim(), bindings: [] };
      r.g.resources.push(res);
    }
    if (!res.bindings.some(b => b.state === st.id && b.elKey === el.key)) res.bindings.push({ state: st.id, elKey: el.key });
  }
}

/** A scroll revealed new labelled elements: add tap actions for them (at most 3 per scroll). */
function addRevealedActions(r: Run, st: State, obs: Observation): void {
  // covered = same key, or the same type + resource id (the title of another item on this template)
  const typeId = (key: string) => { const [t, id] = key.split("|"); return id ? `${t}|${id}` : key; };
  const keys = st.actions.filter(a => a.elKey).map(a => a.elKey!);
  const covered = new Set([...keys.map(keyPrefix), ...keys.map(typeId)]);
  const screen = r.info.widthPx * r.info.heightPx;
  const fresh = obs.elements
    .filter(e => labelOf(e) && !e.ad && !isInput(e) && !covered.has(keyPrefix(e.key)) && !covered.has(typeId(e.key)) && e.rect.w * e.rect.h < 0.9 * screen)
    .sort((a, b) => Number(!!a.group) - Number(!!b.group))
    .slice(0, 3);
  if (!fresh.length) return;
  const num = Number(st.id.slice(1));
  const start = Math.max(0, ...st.actions.map(a => Number(a.id.split("_")[1]) || 0)) + 1;
  const added = toActions(fresh.map(e => ({ el: e.id, intent: `tap "${labelOf(e).slice(0, 40)}" (revealed by scrolling)`, kind: "tap" as const, priority: 1 })),
    obs, num, { startAt: start, withBack: false });
  st.actions.push(...added);
}

// =============================================================================================
// Edges and effects
// =============================================================================================
function selectedLabels(o: Observation): string[] {
  return [...new Set(o.elements.filter(e => (e.selected || e.checked) && labelOf(e)).map(labelOf))];
}

/**
 * One edge per (from, action, to, context, limitHit); repeats bump `seen` and add new effects, so the
 * drain's many sends stay one edge with all their counter readings and replies (the transcript).
 */
function recordEdge(r: Run, from: State, a: Action, to: string, before: Observation, after: Observation, fx: Effect[], limitHit = false): GraphEdge {
  const g = r.g;
  const selected = selectedLabels(before);
  let e = g.edges.find(x => x.from === from.id && x.action === a.id && x.to === to && !!x.limitHit === limitHit
    && x.context.selected.join("\n") === selected.join("\n"));
  if (e) {
    e.seen++;
    for (const f of fx) {
      if (e.effects.length >= MAX_FX) break;
      if (f.kind !== "counter" && e.effects.some(x => x.kind === f.kind && "text" in x && x.text === f.text)) continue;
      e.effects.push(f);
    }
  } else {
    e = {
      id: `g${pad(g.edges.length + 1, 4)}`, from: from.id, to, action: a.id, obsBefore: before.id, obsAfter: after.id,
      effects: fx.slice(0, MAX_FX), context: { selected }, seen: 1, failures: 0, firstStep: g.steps,
    };
    if (limitHit) e.limitHit = true;
    g.edges.push(e);
  }
  // an action that lowered a bound counter spends something: the drain probe may repeat it
  if (a.kind === "tap" && counterEffects(fx).some(f => f.delta < 0 && !f.resource.startsWith("auto:"))) {
    a.kind = "consume";
    a.note = "spends: a counter dropped after this action";
  }
  // T2: replies provoked by spending are conversation, never identity
  if (a.kind === "consume") for (const f of fx) if (f.kind === "appeared" && replyLike(f.text)) excludeText(r.ex, f.text);
  trace("effect", {
    edge: e.id, from: from.id, to, action: a.id, limitHit,
    effects: fx.slice(0, 8).map(f => (f.kind === "counter" ? `${f.resource} ${f.before}->${f.after}` : `${f.kind}: ${f.text.slice(0, 60)}`)),
  }, g.steps);
  return e;
}

/** Record the external surface, then escape back into the app (FINAL_PLAN §4.4 handleExternal). */
async function handleExternal(r: Run, from: State, a: Action, before: Observation, obs: Observation): Promise<ExternalKind> {
  const g = r.g;
  const kind = classifyForeground(obs.fg, g.app.package) as ExternalKind;
  g.observations.push(obs);
  g.externals.push({ kind, package: obs.fg, from: from.id, action: a.id, obs: obs.id, texts: obs.texts.slice(0, 60) });
  recordEdge(r, from, a, `ext:${kind}`, before, obs, []);
  trace("external", { kind, pkg: obs.fg, from: from.id, action: a.id, obs: obs.id, texts: obs.texts.slice(0, 8) }, g.steps);
  // BACK on a root screen leaving to the launcher is how Android works (recorded once per state);
  // a tap that lands on the launcher or a crash is a failure
  const expectedExit = a.kind === "back" && kind === "launcher";
  a.status = (kind === "launcher" || kind === "crash") && !expectedExit ? "failed" : "done";
  if (a.status === "failed") trace("failure", { where: `external:${kind}`, error: `${a.id} left the app (${obs.fg})` }, g.steps);
  const how = await soft(guardedDevice(r, "escape", () => escapeExternal(r.dev, kind, g.app.package, r.timing.pollMs)), "escape failed");
  trace("recovery", { how, from: `ext:${kind}` }, g.steps);
  await arriveInApp(r, `escaping ext:${kind}`);
  return kind;
}

// =============================================================================================
// Travel (BFS over known in-app edges, signature check per hop, relaunch + replay on mismatch)
// =============================================================================================
interface Reach { state: State; path: GraphEdge[] }

function actionOf(g: ExploreGraph, e: GraphEdge): Action | undefined {
  return g.states.find(s => s.id === e.from)?.actions.find(a => a.id === e.action);
}

/** Edges we can replay: in-app taps and BACKs that have not failed more than they worked, plus walls. */
function travelable(g: ExploreGraph, e: GraphEdge): boolean {
  if (e.to.startsWith("ext:") || e.to === e.from || e.failures > e.seen) return false;
  const a = actionOf(g, e);
  if (!a || a.status === "skipped") return false;
  // a consume edge that hit a wall is safe to replay: the wall blocks the spend
  return a.kind === "tap" || a.kind === "back" || (a.kind === "consume" && !!e.limitHit);
}

function reachable(r: Run, from: string, want: (s: State) => boolean): Reach[] {
  const g = r.g;
  const byId = new Map(g.states.map(s => [s.id, s]));
  const via = new Map<string, GraphEdge | null>([[from, null]]);
  const queue = [from];
  const out: Reach[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    const s = byId.get(id);
    if (!s) continue;
    if (want(s)) {
      const path: GraphEdge[] = [];
      for (let e = via.get(id); e; e = via.get(e.from)) path.unshift(e);
      out.push({ state: s, path });
    }
    for (const e of g.edges) {
      if (e.from !== id || via.has(e.to) || !travelable(g, e)) continue;
      via.set(e.to, e);
      queue.push(e.to);
    }
  }
  return out;
}

const topPriority = (s: State, allowConsume: boolean) => Math.max(-1, ...s.actions.filter(a => eligible(a, allowConsume)).map(a => a.priority));

function markUnreachable(r: Run, which: (s: State) => boolean, allowConsume: boolean, why: string): void {
  for (const s of r.g.states.filter(which)) for (const a of s.actions) {
    if (eligible(a, allowConsume)) { a.status = "unreachable"; a.note = why; }
  }
}

/** Travel to the reachable state with the highest-priority untried action (nearest on ties). */
async function toFrontier(r: Run, allowConsume: boolean): Promise<"moved" | "retry" | "empty"> {
  const want = (s: State) => s.actions.some(a => eligible(a, allowConsume));
  const pick = () => reachable(r, r.cur.id, want)
    .sort((x, y) => topPriority(y.state, allowConsume) - topPriority(x.state, allowConsume) || x.path.length - y.path.length)[0];
  let target = pick();
  if (!target && r.cur.id !== r.g.launchState) {
    await relaunch(r, "no known path to untried actions from here");
    target = pick();
  }
  if (!target) {
    markUnreachable(r, want, allowConsume, "no known path from the launch screen");
    return "empty";
  }
  if (!target.path.length) return "moved";
  trace("info", { travel: target.state.id, via: target.path.map(e => e.id), why: `untried p${topPriority(target.state, allowConsume)} actions on ${target.state.id}` }, r.g.steps);
  if (await travel(r, target.path)) return "moved";
  const n = (r.travelFailures.get(target.state.id) ?? 0) + 1;
  r.travelFailures.set(target.state.id, n);
  if (n >= 2) markUnreachable(r, s => s.id === target.state.id, allowConsume, "travel failed twice");
  return "retry";
}

/** Travel to any state matching `want`, relaunching when there is no known path from here. */
async function travelTo(r: Run, want: (s: State) => boolean): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (want(r.cur)) return true;
    const target = reachable(r, r.cur.id, want).sort((x, y) => x.path.length - y.path.length)[0];
    if (!target) {
      if (attempt > 0 && r.cur.id === r.g.launchState) return false;
      await relaunch(r, "no known path to the target");
      continue;
    }
    await travel(r, target.path);
  }
  return want(r.cur);
}

/** Replay edges hop by hop, checking at each hop that we landed where the edge says. */
async function travel(r: Run, path: GraphEdge[]): Promise<boolean> {
  const g = r.g;
  let prevEls = r.last.elements;
  for (const e of path) {
    const a = actionOf(g, e)!;
    const owner = g.states.find(s => s.id === e.from)!;
    const res = await tryPerform(r, a, owner);
    if (!res.ok) return hopFailed(r, e, res.reason);
    if (res.typed) noteTyped(r, res.typed);
    const seen = await lightObserve(r, a.kind === "consume" ? "content" : "ui", prevEls);
    if (!seen) return hopFailed(r, e, "device error while observing");
    if (!isInApp(seen.fg, g.app.package)) return hopFailed(r, e, `left the app (${seen.fg})`);
    const m = matchState(g.states, { signature: seen.snap.sig, dhash: "", elements: seen.snap.els }, r.variants);
    const ok = m.state?.id === e.to || (m.how === "none" && m.borderline[0]?.id === e.to);
    if (!ok) return hopFailed(r, e, `expected ${e.to}, saw ${m.state?.id ?? "an unknown screen"}`);
    e.seen++;
    prevEls = seen.snap.els;
  }
  await arrive(r, await observeNow(r, { mode: "ui" }), {});
  return true;
}

async function hopFailed(r: Run, e: GraphEdge, why: string): Promise<false> {
  e.failures++;
  trace("failure", { where: `travel:${e.id}`, error: why }, r.g.steps);
  await relaunch(r, `travel hop ${e.id} failed`);
  return false;
}

/** Settle and read the screen without a screenshot: enough to verify a travel hop. */
async function lightObserve(r: Run, mode: "ui" | "content", prevEls: NormElement[]): Promise<{ snap: Snapshot; fg: string } | null> {
  try {
    const look = (raw: Parameters<typeof normalize>[0]) => snapshot(raw, r.info, r.ex, r.g.resources);
    const snap = mode === "content"
      ? await settleContent(r.dev, look, r.timing, labelCounts(prevEls), s => isExcluded(r.ex, s))
      : await settleUi(r.dev, look, r.timing);
    const fg = await r.dev.foreground();
    r.deviceFailures = 0;
    return { snap, fg };
  } catch (e) {
    if (e instanceof DeviceUnhealthy) throw e;
    countFailure(r, "observe (travel)", e);
    return null;
  }
}

async function relaunch(r: Run, why: string): Promise<void> {
  trace("recovery", { how: `cold relaunch: ${why}` }, r.g.steps);
  await soft(guardedDevice(r, "launch", () => r.dev.launch({ cold: true })), undefined);
  await arriveInApp(r, "relaunch");
}

// =============================================================================================
// Device failure accounting
// =============================================================================================
function countFailure(r: Run, where: string, e: unknown): void {
  r.deviceFailures++;
  trace("failure", { where, error: msg(e), consecutive: r.deviceFailures }, r.g.steps);
  if (r.deviceFailures >= MAX_DEVICE_FAILURES) {
    r.stop = "device_unhealthy";
    checkpoint(r);
    throw new DeviceUnhealthy(`${MAX_DEVICE_FAILURES} consecutive device failures (last: ${msg(e)})`);
  }
}

/** Swallow a device call that already failed (counted and traced), but never the device_unhealthy stop. */
async function soft<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof DeviceUnhealthy) throw e;
    return fallback;
  }
}

/** Run a device call, retrying once; failures count toward device_unhealthy. */
async function guardedDevice<T>(r: Run, where: string, fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      const v = await fn();
      r.deviceFailures = 0;
      return v;
    } catch (e) {
      if (e instanceof DeviceUnhealthy) throw e;
      countFailure(r, where, e);
      if (attempt >= 2) throw e;
      await sleep(Math.min(1000, r.timing.settleMaxMs));
      trace("recovery", { how: `retrying ${where}` }, r.g.steps);
    }
  }
}

// =============================================================================================
// Human hook (login walls, phone checks, CAPTCHAs)
// =============================================================================================
async function humanHook(r: Run, st: State): Promise<"resumed" | "skipped"> {
  const tty = !!process.stdin.isTTY;
  const note = `"${st.name}" (${st.id}) needs a human: sign in or pass the phone check / CAPTCHA on the device (the explorer never types passwords, codes or phone numbers)${tty ? ", then press Enter here" : ""}.`;
  process.stderr.write("\x07");
  trace("human", { note, state: st.id, waiting: tty }, r.g.steps);
  if (tty && (await waitForEnter(HUMAN_WAIT_MS))) {
    r.g.human.push({ ts: nowIso(), note: `human completed the login or verification on "${st.name}"` });
    trace("info", { human: "done", state: st.id }, r.g.steps);
    return "resumed";
  }
  for (const a of st.actions) if (a.status === "untried" && a.kind !== "back") { a.status = "skipped"; a.skip = "login wall: no human available"; }
  trace("info", { human: "nobody answered; state skipped", state: st.id }, r.g.steps);
  return "skipped";
}

function waitForEnter(ms: number): Promise<boolean> {
  return new Promise(resolve => {
    const done = (v: boolean) => { clearTimeout(timer); process.stdin.off("data", onData); process.stdin.pause(); resolve(v); };
    const onData = () => done(true);
    const timer = setTimeout(() => done(false), ms);
    process.stdin.resume();
    process.stdin.once("data", onData);
  });
}

// =============================================================================================
// Phase 2: gap check
// =============================================================================================
async function gapPhase(r: Run): Promise<void> {
  const rounds = Math.min(2, r.c.profile.gapRounds);
  if (r.o.noGap || rounds <= 0) return;
  for (let round = 1; round <= rounds; round++) {
    const targets = await gapCheck(r.g, round);
    const applied = applyGapTargets(r.g, targets);
    trace("info", { phase: "gap", round, targets, applied }, r.g.steps);
    if (!applied) return;
    r.g.stepsSinceNew = 0;
    const end = await crawl(r, { stepCap: r.g.steps + GAP_STEPS, saturation: false });
    trace("info", { phase: `gap-${round}`, end }, r.g.steps);
    if (r.stop || end === "budget_usd" || end === "budget_time") return;
  }
}

// =============================================================================================
// Phase 3: drain probe (T1)
// =============================================================================================
function pickDrainEdge(r: Run): { edge: GraphEdge; action: Action; cost: number } | null {
  const cost = (e: GraphEdge) => Math.min(0, ...counterEffects(e.effects).filter(f => !f.resource.startsWith("auto:")).map(f => f.delta));
  const cands = r.g.edges
    .filter(e => !e.to.startsWith("ext:") && !e.limitHit)
    .map(e => ({ edge: e, action: actionOf(r.g, e), cost: cost(e) }))
    .filter((x): x is { edge: GraphEdge; action: Action; cost: number } => x.action?.kind === "consume")
    .sort((x, y) => x.cost - y.cost || x.edge.firstStep - y.edge.firstStep);
  return cands[0] ?? null;
}

const showsCounter = (r: Run) => (s: State) => r.g.resources.some(x => x.bindings.some(b => b.state === s.id));

/** Travel to the nearest state that shows a counter and read it. */
async function readCounter(r: Run): Promise<Map<string, number> | null> {
  if (!r.g.resources.length || !(await travelTo(r, showsCounter(r)))) return null;
  const m = new Map(r.last.counters.map((k: Counter) => [k.resource, k.value]));
  trace("info", { phase: "drain", read: r.last.counters, at: r.cur.id }, r.g.steps);
  return m.size ? m : null;
}

/** Per-send cost from two balance readings n sends apart: {kind:"counter", ..., inferred:true}. */
function backfill(r: Run, edge: GraphEdge, base: Map<string, number>, now: Map<string, number>, n: number): void {
  for (const [res, b] of base) {
    const v = now.get(res);
    if (v === undefined || v === b || n <= 0) continue;
    const delta = round((v - b) / n);
    edge.effects.push({ kind: "counter", resource: res, before: b, after: v, delta, inferred: true });
    trace("effect", { edge: edge.id, inferred: true, resource: res, before: b, after: v, sends: n, perSend: delta }, r.g.steps);
  }
  checkpoint(r);
}

/**
 * Repeat the costliest consume action. Stop only on a wall, an external app, drainMax, or 3 sends in a
 * row with no reply and no counter change (T1). If the balance is not shown where we send, read it on
 * another screen every 3 sends and back-fill the inferred per-send delta.
 */
async function drainProbe(r: Run): Promise<string> {
  const g = r.g;
  if (r.o.noConsume) return "skipped: --no-consume";
  if (g.edges.some(e => e.limitHit)) return "skipped: a wall was already observed";
  const pick = pickDrainEdge(r);
  if (!pick) { trace("info", { phase: "drain", end: "no consume action observed" }, g.steps); return "none"; }
  const { edge: e0, action: a } = pick;
  trace("info", {
    phase: "drain", edge: e0.id, action: a.id, from: e0.from, context: e0.context.selected,
    why: pick.cost < 0 ? `largest observed cost (${pick.cost} per action)` : "the first consume action (no cost measured yet)",
  }, g.steps);
  const atFrom = (s: State) => s.id === e0.from;
  if (!(await travelTo(r, atFrom))) return "unreachable";
  const counterHere = showsCounter(r)(r.cur);
  let base = counterHere ? null : await readCounter(r);
  if (base && !(await travelTo(r, atFrom))) return "unreachable";

  let n = 0;          // sends since the last balance reading
  let flat = 0;       // sends in a row with no reply and no counter change
  let sends = 0;
  let last: GraphEdge | null = null;
  let end = "drainMax";
  const grace = r.c.profile.minutes * 1.5;
  while (sends < r.c.profile.drainMax) {
    if (r.stop) { end = r.stop; break; }
    if (minutes(r) > grace) { end = "time"; break; }
    const from = r.cur;
    const act = from.id === e0.from ? a : from.actions.find(x => x.kind === "consume" && x.elKey === a.elKey);
    if (!act) {
      if (!(await travelTo(r, atFrom))) { end = "unreachable"; break; }
      continue;
    }
    const out = await step(r, from, act, "drain");
    if (out.failed) { end = "the action failed"; break; }
    if (out.external) { end = `external:${out.external}`; break; }
    if (out.wall) { end = "wall"; break; }
    sends++;
    n++;
    if (out.edge) last = out.edge;
    const replied = out.fx.some(f => f.kind === "appeared" && !isExcludedTyped(r, f.text));
    flat = counterEffects(out.fx).length || replied ? 0 : flat + 1;
    if (flat >= 3) { end = "3 sends with no reply and no counter change"; break; }
    if (base && n >= 3 && last) {
      const now = await readCounter(r);
      if (now) { backfill(r, last, base, now, n); base = now; n = 0; }
      if (!(await travelTo(r, atFrom))) { end = "unreachable"; break; }
    }
  }
  if (base && n > 0 && last) {
    const now = await readCounter(r);
    if (now) backfill(r, last, base, now, n);
  }
  trace("info", { phase: "drain", end, sends, walls: g.edges.filter(e => e.limitHit).map(e => e.id) }, g.steps);
  return end;
}

/** Our own typed text echoed back is not a reply. */
function isExcludedTyped(r: Run, text: string): boolean {
  return r.g.typed.some(t => text.toLowerCase().includes(t.toLowerCase()));
}
