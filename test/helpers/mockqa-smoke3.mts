// scratch: fixture app -> explore (heuristic) -> understand -> mock -> qa (all stub)
import fs from "node:fs";
import path from "node:path";
import { setLlmContext } from "../../src/core/llm.ts";
import { setTraceContext } from "../../src/core/trace.ts";
import { loadApp, loadProfile, paths } from "../../src/core/config.ts";
import type { StageCtx } from "../../src/core/run.ts";
import { WebDevice } from "../../src/device/web.ts";
import { explore } from "../../src/explore/explorer.ts";
import { understand } from "../../src/model/understand.ts";
import { generateMock } from "../../src/mock/generate.ts";
import { runQa } from "../../src/qa/loop.ts";
setLlmContext({ mode: "stub" });
const tmp = "/tmp/claude-0/-home-user-simula/25c848c5-fa91-54b9-9b9c-b7d1ed4ee763/scratchpad/mockqa/fixture";
const app = loadApp("fixture");
const c: StageCtx = { app, profile: loadProfile("fixture"), paths: paths("fixture", { outRoot: path.join(tmp, "out") }), runId: "fx1", llm: "stub", opts: {} };
setTraceContext({ app: "fixture", run: "fx1", stage: "explore", file: path.join(tmp, "trace.jsonl") });
let graphFile = process.argv[2];
if (!graphFile) {
  fs.rmSync(tmp, { recursive: true, force: true });
  const dev = await WebDevice.open({ url: app.webUrl!, appPackage: app.package, resetState: true });
  const t0 = Date.now();
  ({ graphFile } = await explore(c, dev, { annotator: "heuristic" }));
  await (dev as any).close?.();
  console.log("explore", Date.now() - t0, graphFile);
}
const { model } = await understand(c, graphFile);
console.log(model.screens.map(s => `${s.id} ${s.name} ${s.kind} ${s.render} inScope=${s.inScope} els=${s.elements.length} bind=${JSON.stringify(s.bindings)}`).join("\n"));
console.log(model.edges.map(e => `${e.id} ${e.from}->${e.to} el=${e.el} ${e.transition} ${JSON.stringify(e.effects.filter(f=>f.kind==="counter").map((f:any)=>f.delta))} ctx=${e.context.selected} lim=${e.limitHit??""}`).join("\n"));
const t1 = Date.now();
await generateMock(c, model, c.paths.model);
console.log("mock", Date.now() - t1);
const sum = await runQa(c, model, c.paths.model, {});
console.log(JSON.stringify({ ...sum, screens: sum.screens.map(s => `${s.id} ${s.render} ${s.composite} r${s.rounds} mf${s.mustFix}`) }, null, 1));
console.log("qa", Date.now() - t1);
process.exit(0);
