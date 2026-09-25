// Flow QA (no LLM): every in-scope edge is replayed in the mock the way a user would take it.
//   __mock.go(from); select the edge's mode context; click [data-node=el];
//   assert __mock.state() === to (externals: [data-external=<kind>] visible) and that each counter
//   changed by exactly the edge's counter effects. Limit-hit edges start from an empty balance so the
//   wall guard has to fire. A failure caused by a missing handler is a runtime/build bug; one caused
//   by a missing element points at that screen's fragment.
import type { Browser, Page } from "playwright";
import type { Edge, ProductModel } from "../core/schema.ts";
import { launchBrowser, newMockPage, openMock, viewportOf } from "./render.ts";

export interface FlowCheck { edge: string; from: string; to: string; el: string; ok: boolean; reason: string }
export interface FlowQa {
  total: number; passed: number;
  failures: { edge: string; reason: string }[];
  skipped: { edge: string; reason: string }[];
  checks: FlowCheck[];
}

/** An edge is in scope when both ends are (an external target counts as in scope: it is the mock's boundary). */
export function inScopeEdges(m: ProductModel): { test: Edge[]; skipped: { edge: string; reason: string }[] } {
  const scope = new Map(m.screens.map(s => [s.id, s.inScope]));
  const test: Edge[] = [], skipped: { edge: string; reason: string }[] = [];
  for (const e of m.edges) {
    if (!scope.get(e.from) || !(e.to.startsWith("ext:") || scope.get(e.to))) continue;
    if (!e.el) { skipped.push({ edge: e.id, reason: "no element to tap (system back / scroll)" }); continue; }
    test.push(e);
  }
  return { test, skipped };
}

const counterDeltas = (e: Edge) => {
  const out = new Map<string, number>();
  for (const f of e.effects) if (f.kind === "counter") out.set(f.resource, (out.get(f.resource) ?? 0) + f.delta);
  return out;
};

async function checkEdge(page: Page, indexHtml: string, m: ProductModel, e: Edge): Promise<FlowCheck> {
  const base = { edge: e.id, from: e.from, to: e.to, el: e.el! };
  const fail = (reason: string): FlowCheck => ({ ...base, ok: false, reason });
  await openMock(page, indexHtml, { screen: e.from, frame: "0" });
  if (e.context.selected.length) await page.evaluate(`window.__mock.select(${JSON.stringify(e.context.selected)})`);

  const deltas = counterDeltas(e);
  if (e.limitHit) {
    // Reproduce the wall: empty the resource this action spends.
    const sibling = m.edges.find(x => x.from === e.from && x.el === e.el && x.effects.some(f => f.kind === "counter" && f.delta < 0));
    const res = m.economy.walls.find(w => w.edge === e.id)?.resource
      ?? sibling?.effects.flatMap(f => (f.kind === "counter" && f.delta < 0 ? [f.resource] : []))[0];
    if (res) await page.evaluate(`window.__mock.set(${JSON.stringify(res)}, 0)`);
  } else {
    for (const [res, d] of deltas) if (d < 0) await page.evaluate(`(() => { const v = window.__mock.get(${JSON.stringify(res)}); if (typeof v !== "number" || v < ${-d}) window.__mock.set(${JSON.stringify(res)}, ${-d}); })()`);
  }
  const resources = [...new Set([...deltas.keys(), ...m.economy.resources.map(r => r.id)])];
  const read = async () => (await page.evaluate(`(${JSON.stringify(resources)}).map((r) => window.__mock.get(r))`)) as (number | undefined)[];
  const before = await read();

  const loc = page.locator(`[data-screen-layer="${e.from}"] [data-node="${e.el}"]`).first();
  if (!(await loc.count())) return fail(`element ${e.el} is not in the mock's ${e.from}`);
  try { await loc.click({ force: true, timeout: 2000 }); } catch (err) { return fail(`click on ${e.el} failed: ${String((err as Error).message).split("\n")[0]}`); }

  if (e.to.startsWith("ext:")) {
    const kind = m.externals.find(x => x.id === e.to)?.kind ?? e.to.slice(4);
    const ok = await page.waitForSelector(`[data-external="${kind}"]`, { state: "visible", timeout: 1500 }).then(() => true, () => false);
    if (!ok) return fail(`no [data-external="${kind}"] card after tapping ${e.el}; state ${await page.evaluate("window.__mock.state()")}`);
  } else {
    const ok = await page.waitForFunction(`window.__mock.state() === ${JSON.stringify(e.to)}`, undefined, { timeout: 1500 }).then(() => true, () => false);
    if (!ok) return fail(`expected ${e.to} after tapping ${e.el}, got ${await page.evaluate("window.__mock.state()")}`);
  }
  const after = await read();
  for (let i = 0; i < resources.length; i++) {
    const want = deltas.get(resources[i]) ?? 0;
    const got = (after[i] ?? 0) - (before[i] ?? 0);
    if (got !== want) return fail(`counter ${resources[i]} changed by ${got}, expected ${want}`);
  }
  return { ...base, ok: true, reason: "" };
}

export async function runFlowQa(indexHtml: string, m: ProductModel, o: { browser?: Browser } = {}): Promise<FlowQa> {
  const { test, skipped } = inScopeEdges(m);
  const browser = o.browser ?? (await launchBrowser());
  const checks: FlowCheck[] = [];
  try {
    const page = await newMockPage(browser, viewportOf(m));
    for (const e of test) {
      try { checks.push(await checkEdge(page, indexHtml, m, e)); }
      catch (err) { checks.push({ edge: e.id, from: e.from, to: e.to, el: e.el!, ok: false, reason: `error: ${String((err as Error).message).split("\n")[0]}` }); }
    }
    await page.close();
  } finally {
    if (!o.browser) await browser.close();
  }
  const failures = checks.filter(c => !c.ok).map(c => ({ edge: c.edge, reason: c.reason }));
  return { total: checks.length, passed: checks.length - failures.length, failures, skipped, checks };
}
