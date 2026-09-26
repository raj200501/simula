// Flows: the paths a person walks. The core flow is built from REAL edge sequences (the consume /
// drain path the explorer actually recorded: entry -> ... -> spend -> spend -> wall -> store), not
// from shortest paths, because "open, pick a mode, send, credits drop, wall, refill" is the loop a
// product team recognises. Monetization flows are shortest paths to each wall, store and paywall;
// secondary flows are shortest paths to the other tabs.
import type { Action, Edge, Flow, Screen } from "../core/schema.ts";
import { humanizeAction, midSentence } from "../core/humanize.ts";

export interface FlowGraph {
  screens: Screen[];
  edges: Edge[];
  launch: string;
  actionOf: Map<string, Action>;          // edge id -> action
  resourceName: (id: string) => string;
}
export interface WallTarget { screen: string; edge?: string }

const isExt = (id: string) => id.startsWith("ext:");

/** An edge that spends something: a consume/type-send action, or any forward action with a negative counter delta. */
export function isConsume(e: Edge, a: Action | undefined): boolean {
  if (a?.kind === "consume" || a?.kind === "type-send") return true;
  return a?.kind !== "back" && a?.kind !== "scroll" && e.effects.some(f => f.kind === "counter" && f.delta < 0);
}

/** BFS over in-app edges. Forward edges first; BACK edges only if nothing else connects; edges that
 *  failed more often than they worked only as a last resort (the path is real, just flaky). Among
 *  parallel edges the most reliable (most seen, fewest failures) wins. */
export function shortestPath(edges: Edge[], from: string, to: string): Edge[] | null {
  if (from === to) return [];
  for (const [allowBack, allowFlaky] of [[false, false], [true, false], [true, true]]) {
    const adj = new Map<string, Edge[]>();
    for (const e of edges) {
      if (isExt(e.to) || e.from === e.to || (!allowBack && e.transition === "back") || (!allowFlaky && e.failures > e.seen)) continue;
      adj.set(e.from, [...(adj.get(e.from) ?? []), e]);
    }
    for (const l of adj.values()) l.sort((a, b) => b.seen - a.seen || a.failures - b.failures || a.id.localeCompare(b.id));
    const prev = new Map<string, Edge>();
    const q = [from];
    const seen = new Set([from]);
    while (q.length) {
      const s = q.shift()!;
      for (const e of adj.get(s) ?? []) {
        if (seen.has(e.to)) continue;
        seen.add(e.to); prev.set(e.to, e); q.push(e.to);
        if (e.to === to) {
          const path: Edge[] = [];
          for (let cur = to; cur !== from; cur = prev.get(cur)!.from) path.unshift(prev.get(cur)!);
          return path;
        }
      }
    }
  }
  return null;
}

export function noteFor(g: FlowGraph, e: Edge): string {
  const a = g.actionOf.get(e.id);
  const fx = e.effects.flatMap(f => (f.kind === "counter" ? [`${g.resourceName(f.resource)} ${f.delta > 0 ? "+" : "−"}${Math.abs(f.delta)}`] : []));
  const ctx = e.context.selected.length ? ` while "${e.context.selected.join(" / ")}" is selected` : "";
  return `${humanizeAction(a?.intent) || e.action}${ctx}${fx.length ? ` (${fx.join(", ")})` : ""}${e.limitHit ? " → blocked" : ""}`;
}

const stepsOf = (g: FlowGraph, start: string, path: Edge[]) =>
  [{ screen: start, note: start === g.launch ? "launch" : "" }, ...path.map(e => ({ screen: e.to, edge: e.id, note: noteFor(g, e) }))];

function coreFlow(g: FlowGraph, name: (id: string) => string): Flow | null {
  const spend = g.edges.filter(e => !isExt(e.to) && isConsume(e, g.actionOf.get(e.id)));
  if (!spend.length) return null;
  // The drain screen: where the explorer spent the most (limit hits first, then repetitions).
  const by = new Map<string, Edge[]>();
  for (const e of spend) by.set(e.from, [...(by.get(e.from) ?? []), e]);
  const [hub, hubEdges] = [...by].sort(([, a], [, b]) => Number(b.some(e => e.limitHit)) - Number(a.some(e => e.limitHit))
    || b.reduce((s, e) => s + e.seen, 0) - a.reduce((s, e) => s + e.seen, 0))[0];
  // The way in from launch; if the explorer never recorded one, the flow starts at the drain screen
  // rather than jumping from launch straight into it.
  const lead = shortestPath(g.edges, g.launch, hub);
  const start = lead ? g.launch : hub;
  const cost = (e: Edge) => Math.min(0, ...e.effects.map(f => (f.kind === "counter" ? f.delta : 0)));
  // Up to two spends in distinct selection contexts (e.g. a cheap and an expensive mode).
  const sends: Edge[] = [];
  for (const e of hubEdges.filter(e => e.to === hub && !e.limitHit).sort((a, b) => cost(a) - cost(b) || b.seen - a.seen || a.id.localeCompare(b.id))) {
    if (sends.length < 2 && !sends.some(s => s.context.selected.join("|") === e.context.selected.join("|"))) sends.push(e);
  }
  const wall = hubEdges.find(e => e.limitHit) ?? g.edges.find(e => e.from === hub && e.limitHit && !isExt(e.to));
  // "Pick a mode" before a send whose selection differs from the one before it: the recorded edge that
  // made the new selection appear, either in place or through an overlay (hub -> mode sheet -> hub).
  const bySeen = (a: Edge, b: Edge) => b.seen - a.seen || a.id.localeCompare(b.id);
  const plain = (e: Edge) => !isExt(e.to) && e.transition !== "back" && !isConsume(e, g.actionOf.get(e.id));
  const pickFor = (sel: string[], prev: string[]): Edge[] => {
    const want = sel.filter(t => !prev.includes(t));
    const shows = (e: Edge) => e.effects.some(f => f.kind === "appeared" && want.includes(f.text));
    if (!want.length) return [];
    const inPlace = g.edges.filter(e => e.from === hub && e.to === hub && plain(e) && shows(e)).sort(bySeen)[0];
    if (inPlace) return [inPlace];
    for (const back of g.edges.filter(e => e.to === hub && e.from !== hub && !isConsume(e, g.actionOf.get(e.id)) && shows(e)).sort(bySeen)) {
      const open = g.edges.filter(e => e.from === hub && e.to === back.from && plain(e)).sort(bySeen)[0];
      if (open) return [open, back];
    }
    return [];
  };
  const path = [...(lead ?? [])];
  sends.forEach((e, i) => path.push(...pickFor(e.context.selected, i ? sends[i - 1].context.selected : []), e));
  if (!sends.length && !wall) path.push(hubEdges[0]);
  if (wall) {
    path.push(wall);
    // After the wall: the way to buying, i.e. a store or paywall at most two taps away. Leaving the
    // wall any other way (back, another tab) is the decline moment, not part of the loop.
    const kind = (id: string) => g.screens.find(s => s.id === id)?.kind;
    const shops = g.screens.filter(s => s.kind === "store" || s.kind === "paywall").map(s => s.id);
    const direct = g.edges.filter(e => e.from === wall.to && !isExt(e.to) && e.transition !== "back" && (kind(e.to) === "store" || kind(e.to) === "paywall"))
      .sort((a, b) => b.seen - a.seen || a.id.localeCompare(b.id))[0];
    const viaForward = direct ? [direct] : shops.map(s => shortestPath(g.edges.filter(e => e.transition !== "back"), wall.to, s))
      .filter((p): p is Edge[] => !!p && p.length > 0 && p.length <= 2).sort((a, b) => a.length - b.length)[0];
    if (viaForward) path.push(...viaForward);
  }
  const intent = humanizeAction(g.actionOf.get((sends[0] ?? wall ?? hubEdges[0]).id)?.intent) || "Use the app";
  return {
    id: "", kind: "core", name: wall ? `Core loop: ${midSentence(intent)} until ${name(wall.to)}` : `Core loop: ${midSentence(intent)}`,
    goal: wall ? `Reach ${name(hub)} and ${midSentence(intent)} until the resource runs out` : `Reach ${name(hub)} and ${midSentence(intent)}`,
    steps: stepsOf(g, start, path),
  };
}

export function buildFlows(g: FlowGraph, walls: WallTarget[]): Flow[] {
  const name = (id: string) => g.screens.find(s => s.id === id)?.name ?? id;
  const flows: Flow[] = [];
  const core = coreFlow(g, name);
  if (core) flows.push(core);
  else {
    // No spend observed: the main path is the way to the most visited in-scope screen.
    const top = g.screens.filter(s => s.inScope && s.id !== g.launch).sort((a, b) => b.visits - a.visits)[0];
    const p = top && shortestPath(g.edges, g.launch, top.id);
    if (p?.length) flows.push({ id: "", kind: "core", name: `Main path to ${top.name}`, goal: `Reach ${top.name}`, steps: stepsOf(g, g.launch, p) });
  }
  const targets = new Set<string>();
  for (const w of walls) {
    if (targets.has(w.screen) || w.screen === g.launch) continue;
    const via = w.edge ? g.edges.find(e => e.id === w.edge) : undefined;
    const lead = via ? shortestPath(g.edges, g.launch, via.from) : null;
    const path = via && lead ? [...lead, via] : shortestPath(g.edges, g.launch, w.screen);
    if (!path?.length) continue;
    targets.add(w.screen);
    flows.push({ id: "", kind: "monetization", name: `Hit the wall: ${name(w.screen)}`, goal: `Reach the point where ${name(w.screen)} blocks the user`, steps: stepsOf(g, g.launch, path) });
  }
  for (const s of g.screens.filter(s => s.kind === "store" || s.kind === "paywall")) {
    if (targets.has(s.id) || s.id === g.launch) continue;
    const path = shortestPath(g.edges, g.launch, s.id);
    if (!path?.length) continue;
    targets.add(s.id);
    flows.push({ id: "", kind: "monetization", name: `Open ${s.name}`, goal: `See what ${s.name} sells and for how much`, steps: stepsOf(g, g.launch, path) });
  }
  for (const s of g.screens.filter(s => s.kind === "tab" && s.inScope)) {
    if (targets.has(s.id) || s.id === g.launch) continue;
    const path = shortestPath(g.edges, g.launch, s.id);
    if (!path?.length) continue;
    targets.add(s.id);
    flows.push({ id: "", kind: "secondary", name: `Open ${s.name}`, goal: `Navigate to the ${s.name} tab`, steps: stepsOf(g, g.launch, path) });
  }
  return flows.map((f, i) => ({ ...f, id: `f${i + 1}` }));
}

/** Stable identity of a flow across rebuilds (ids may shift when a new wall target is added). */
export const flowKey = (f: Flow) => `${f.kind}:${f.steps[f.steps.length - 1]?.screen ?? ""}`;
