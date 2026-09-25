// One command per stage. Every stage reads typed artifacts from disk and writes its own, so each
// can be re-run, cached and inspected on its own:
//   explore -> graph.json -> understand -> product-model.json -> mock -> qa -> propose -> judge -> slides -> report
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { Command } from "commander";
import { ROOT, MODELS, PROVIDER, listApps, loadApp, loadProfile, paths, type AppConfig } from "./core/config.ts";
import { Candidates, Judgments } from "./core/schema.ts";
import { load, nowIso } from "./core/io.ts";
import { stage, type StageCtx } from "./core/run.ts";
import { setTraceContext, summarize, trace } from "./core/trace.ts";
import type { LlmMode } from "./core/llm.ts";
import type { Device } from "./device/types.ts";

type Base = Omit<StageCtx, "runId">;
interface GlobalOpts { app?: string; llm?: string; modelDir?: string; outRoot?: string; profile?: string }

const STAGES = ["explore", "understand", "mock", "qa", "propose", "judge", "slides"] as const;
type StageName = (typeof STAGES)[number];

function base(g: GlobalOpts, extra: Record<string, unknown> = {}): Base {
  if (!g.app) throw new Error(`--app is required. Known apps: ${listApps().join(", ")}`);
  const app = loadApp(g.app);
  const llm = (g.llm || process.env.SIMULA_LLM || "record") as LlmMode;
  if (!["record", "replay", "stub", "live"].includes(llm)) throw new Error(`--llm must be record|replay|stub|live`);
  return { app, profile: loadProfile(g.profile || app.profile), paths: paths(app.id, { modelDir: g.modelDir, outRoot: g.outRoot }), llm, opts: extra };
}

/** Stage modules are loaded lazily so a missing/broken downstream stage never blocks explore on a device. */
async function mod(rel: string): Promise<any> {
  const file = path.join(ROOT, "src", rel);
  if (!fs.existsSync(file)) throw new Error(`Stage module src/${rel} is not built yet.`);
  return import(pathToFileURL(file).href);
}

async function openDevice(app: AppConfig, opts: { resetState?: boolean } = {}): Promise<Device> {
  if (app.webUrl) {
    const { WebDevice } = await import("./device/web.ts");
    return WebDevice.open({ url: app.webUrl, appPackage: app.package, resetState: opts.resetState });
  }
  const { McpDevice } = await import("./device/mcp.ts");
  return McpDevice.connect({ appPackage: app.package, cwd: ROOT });
}

async function loadModelFrom(b: Base) {
  const { loadModel } = await import("./model/understand.ts");
  return loadModel(b.paths.model);
}

// ------------------------------------------------------------------------------------------------ stages
async function runStage(name: StageName, b: Base): Promise<void> {
  const p = b.paths;
  switch (name) {
    case "explore": {
      const o = b.opts;
      await stage("explore", b, [], async c => {
        const { explore } = await import("./explore/explorer.ts");
        const dev = await openDevice(b.app, { resetState: !o.resume });
        try {
          const r = await explore(c, dev, {
            resume: !!o.resume, noConsume: !!o.noConsume, noGap: !!o.noGap,
            steps: o.steps ? Number(o.steps) : undefined, annotator: (o.annotator as "llm" | "heuristic") ?? undefined,
          });
          summarize(p.trace, path.join(p.out, "trajectory.md"));
          const g = r.graph;
          console.log(`explore: ${g.states.length} states, ${g.edges.length} edges, ${g.externals.length} external visits, ${g.steps} steps, stop=${g.stopReason}`);
          console.log(`  -> ${r.graphFile}`);
          return { outputs: [r.graphFile], stopReason: g.stopReason };
        } finally {
          await dev.close();
        }
      });
      return;
    }
    case "understand": {
      const { latestGraphFile } = await import("./explore/explorer.ts");
      const graphFile = (b.opts.graph as string) || latestGraphFile(p);
      await stage("understand", b, [graphFile], async c => {
        const { understand } = await import("./model/understand.ts");
        const r = await understand(c, graphFile);
        const m = r.model;
        console.log(`understand: ${m.screens.length} screens, regime=${m.regime}, economy: ${m.economy.resources.length} resources, ${m.economy.sinks.length} sinks, ${m.economy.sources.length} sources, ${m.economy.offers.length} offers, ${m.economy.walls.length} walls, ${m.economy.ads.length} ads; ${m.moments.length} moments, ${m.flows.length} flows`);
        console.log(`  -> ${r.modelFile}\n  -> ${path.join(p.model, "viewer.html")}`);
        return { outputs: [r.modelFile, path.join(p.model, "digest.md"), path.join(p.model, "viewer.html")] };
      });
      return;
    }
    case "mock": {
      await stage("mock", b, [path.join(p.model, "product-model.json")], async c => {
        const m = await loadModelFrom(b);
        const { generateMock } = await mod("mock/generate.ts");
        const r = await generateMock(c, m, p.model);
        console.log(`mock: -> ${r.indexHtml}`);
        return { outputs: [r.indexHtml] };
      });
      return;
    }
    case "qa": {
      await stage("qa", b, [path.join(p.model, "product-model.json"), path.join(p.mock, "index.html")], async c => {
        const m = await loadModelFrom(b);
        const { runQa } = await mod("qa/loop.ts");
        const s = await runQa(c, m, p.model, { rounds: b.opts.rounds ? Number(b.opts.rounds) : undefined });
        const html = s.screens.filter((x: { composite: number | null }) => x.composite != null);
        const mean = html.length ? html.reduce((a: number, x: { composite: number }) => a + x.composite, 0) / html.length : 0;
        console.log(`qa: ${s.screens.length} screens (html share ${(s.htmlShare * 100).toFixed(0)}%), mean composite ${mean.toFixed(3)}, flow QA ${s.flow.passed}/${s.flow.total}`);
        console.log(`  -> ${path.join(p.qa, "report.html")}`);
        return { outputs: [path.join(p.qa, "summary.json"), path.join(p.qa, "report.html")] };
      });
      return;
    }
    case "propose": {
      await stage("propose", b, [path.join(p.model, "product-model.json")], async c => {
        const m = await loadModelFrom(b);
        const { propose } = await mod("propose/propose.ts");
        const cands = await propose(c, m);
        console.log(`propose: ${cands.ideas.length} ideas -> ${cands.proposals.length} full proposals (${cands.generatedBy})`);
        console.log(`  -> ${path.join(p.proposals, "candidates.md")}`);
        return { outputs: [path.join(p.proposals, "candidates.json"), path.join(p.proposals, "candidates.md")] };
      });
      return;
    }
    case "judge": {
      const candFile = path.join(p.proposals, "candidates.json");
      await stage("judge", b, [candFile], async c => {
        const m = await loadModelFrom(b);
        const cands = load(Candidates, candFile);
        const { judgeAll } = await mod("judge/judge.ts");
        const j = await judgeAll(c, m, cands);
        const count = (v: string) => j.final.filter((f: { verdict: string }) => f.verdict === v).length;
        console.log(`judge: SHIP ${count("SHIP")}, REVISE ${count("REVISE")}, REJECT ${count("REJECT")} (${j.rounds.length} judgment rounds)`);
        console.log(`  -> ${path.join(p.proposals, "judgments.md")}`);
        return { outputs: [path.join(p.proposals, "judgments.json"), path.join(p.proposals, "judgments.md")] };
      });
      return;
    }
    case "slides": {
      const candFile = path.join(p.proposals, "candidates.json"), jFile = path.join(p.proposals, "judgments.json");
      await stage("slides", b, [candFile, jFile], async c => {
        const m = await loadModelFrom(b);
        const { buildSlides } = await mod("slides/slides.ts");
        const r = await buildSlides(c, m, p.model, load(Candidates, candFile), load(Judgments, jFile));
        console.log(`slides: -> ${r.deckHtml}\n        -> ${r.pdf}`);
        return { outputs: [r.deckHtml, r.pdf] };
      });
      return;
    }
  }
}

async function runEvalJudge(b: Base): Promise<void> {
  await stage("eval-judge", b, [path.join(b.paths.model, "product-model.json")], async c => {
    const m = await loadModelFrom(b);
    const { evalJudge } = await mod("judge/calibrate.ts");
    const file = await evalJudge(c, m);
    console.log(`eval-judge: -> ${file}`);
    return { outputs: [file] };
  });
}

async function runReport(g: GlobalOpts): Promise<string> {
  const outRoot = g.outRoot ? path.resolve(g.outRoot) : path.join(ROOT, "out");
  const apps = listApps().filter(a => fs.existsSync(path.join(outRoot, a)));
  for (const a of apps) {
    const t = path.join(outRoot, a, "trace.jsonl");
    if (fs.existsSync(t)) summarize(t, path.join(outRoot, a, "trajectory.md"));
  }
  const { buildReport } = await mod("report/report.ts");
  const file = await buildReport(apps, outRoot);
  console.log(`report: -> ${file}`);
  return file;
}

// ------------------------------------------------------------------------------------------------ doctor
async function doctor(): Promise<boolean> {
  const rows: [string, boolean, string][] = [];
  const add = (name: string, ok: boolean, detail: string) => rows.push([name, ok, detail]);
  const major = Number(process.versions.node.split(".")[0]);
  add("node >= 22", major >= 22, process.version);
  add("npm (not pnpm)", !fs.existsSync(path.join(ROOT, "pnpm-lock.yaml")), fs.existsSync(path.join(ROOT, "pnpm-lock.yaml")) ? "pnpm-lock.yaml found: pnpm breaks mobile-mcp's mobilecli lookup" : "ok");
  const key = PROVIDER === "gemini" ? !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) : !!process.env.ANTHROPIC_API_KEY;
  add(`LLM key (${PROVIDER})`, key, key ? `set (value not shown); models main=${MODELS.main} fast=${MODELS.fast}` : "missing: put GEMINI_API_KEY (free) or ANTHROPIC_API_KEY in .env (only needed for --llm record/live)");
  let adb = "";
  try { adb = execFileSync("adb", ["version"], { stdio: ["ignore", "pipe", "ignore"] }).toString().split("\n")[0]; } catch { /* not on PATH */ }
  add("adb on PATH", !!adb, adb || "not found: run `bash scripts/device.sh setup` and add the SDK exports to ~/.zshrc");
  if (adb) {
    const devs = execFileSync("adb", ["devices"]).toString().split("\n").filter(l => /\tdevice$/.test(l)).map(l => l.split("\t")[0]);
    add("device online", devs.length > 0, devs.join(", ") || "none: run `bash scripts/device.sh boot`");
  }
  try {
    const { mcpDoctor } = await import("./device/mcp.ts");
    const r = await mcpDoctor({ cwd: ROOT });
    add("mobile-mcp", r.ok, r.lines.join(" | ").slice(0, 300));
  } catch (e) {
    add("mobile-mcp", false, String((e as Error).message ?? e).slice(0, 300));
  }
  try {
    const { chromium } = await import("playwright");
    const br = await chromium.launch();
    await br.close();
    add("playwright chromium", true, "launches");
  } catch (e) {
    add("playwright chromium", false, `${String((e as Error).message ?? e).split("\n")[0]} (run: npx playwright install chromium)`);
  }
  for (const [n, ok, d] of rows) console.log(`${ok ? "✔" : "✘"} ${n.padEnd(22)} ${d}`);
  return rows.every(r => r[1] || r[0].startsWith("LLM key"));
}

// ------------------------------------------------------------------------------------------------ program
const program = new Command();
program.name("simula").description("app -> explore -> product model -> mock -> QA -> propose -> judge -> slides")
  .option("--app <id>", `app id (${listApps().join(", ")})`)
  .option("--llm <mode>", "record (default: cache + live on miss) | replay (cache only, no key) | stub (no LLM) | live")
  .option("--model-dir <path>", "read the product model from here (cold-mock test)")
  .option("--out-root <path>", "write outputs under this directory instead of ./out")
  .option("--profile <name>", "override the app's profile: deep | medium | shallow | fixture");
const G = () => program.opts() as GlobalOpts;

program.command("doctor").description("check node, key, adb, emulator, mobile-mcp, playwright")
  .action(async () => { process.exitCode = (await doctor()) ? 0 : 1; });

program.command("probe").description("one-screen go/no-go on the device; writes config/device.json")
  .action(async () => {
    const b = base(G());
    await stage("probe", b, [], async c => {
      const { probe } = await import("./explore/explorer.ts");
      const dev = await openDevice(b.app);
      try {
        const r = await probe(c, dev);
        for (const ch of r.checks) console.log(`${ch.pass ? "✔" : "✘"} ${ch.name.padEnd(28)} ${ch.detail}`);
        console.log(r.go ? "GO" : "NO-GO");
        process.exitCode = r.go ? 0 : 2;
        return { outputs: [r.deviceFile, r.screenshot] };
      } finally {
        await dev.close();
      }
    });
  });

program.command("explore").description("drive the app and build graph.json")
  .option("--no-consume", "never perform actions that spend a resource (dev runs)")
  .option("--no-gap", "skip the gap-check phase")
  .option("--resume", "continue the latest run from its checkpoint")
  .option("--steps <n>", "override the profile's step budget")
  .option("--annotator <kind>", "llm | heuristic (heuristic needs no key)")
  .action(async o => { await runStage("explore", base(G(), { ...o, noConsume: o.consume === false, noGap: o.gap === false })); });

program.command("understand").description("graph.json -> product model").option("--graph <file>", "explicit graph.json")
  .action(async o => { await runStage("understand", base(G(), o)); });
program.command("mock").description("product model -> interactive HTML mock").action(async () => { await runStage("mock", base(G())); });
program.command("qa").description("compare mock vs original and fix; flow QA").option("--rounds <n>")
  .action(async o => { await runStage("qa", base(G(), o)); });
program.command("propose").description("rewarded-ad candidates from the model").action(async () => { await runStage("propose", base(G())); });
program.command("judge").description("gates + rubric + revisions").action(async () => { await runStage("judge", base(G())); });
program.command("eval-judge").description("judge confusion table on single-fault negatives").action(async () => { await runEvalJudge(base(G())); });
program.command("slides").description("slide flows for every SHIP proposal").action(async () => { await runStage("slides", base(G())); });
program.command("report").description("out/index.html across all apps").action(async () => { await runReport(G()); });

program.command("all").description("run every stage in order (explore .. slides), then the report")
  .option("--from <stage>", `start at: ${STAGES.join(" | ")}`, "explore")
  .option("--no-consume").option("--no-gap").option("--annotator <kind>")
  .action(async o => {
    const i = STAGES.indexOf(o.from as StageName);
    if (i < 0) throw new Error(`--from must be one of ${STAGES.join(", ")}`);
    const b = base(G(), { ...o, noConsume: o.consume === false, noGap: o.gap === false });
    for (const s of STAGES.slice(i)) {
      await runStage(s, b);
      if (s === "judge") await runEvalJudge(b).catch(e => console.error(`eval-judge skipped: ${(e as Error).message}`));
    }
    await runReport(G());
  });

program.command("note").description("log a manual step (goes into the trajectory)").argument("<text...>")
  .action((words: string[]) => {
    const b = base(G());
    setTraceContext({ app: b.app.id, run: "manual", stage: "human", file: b.paths.trace });
    const note = words.join(" ");
    trace("human", { note });
    fs.mkdirSync(b.paths.out, { recursive: true });
    fs.appendFileSync(path.join(b.paths.out, "HUMAN_LOG.md"), `- ${nowIso()} ${note}\n`);
    console.log(`noted: ${note}`);
  });

program.command("demo").description("fixture app end to end with no device and no key (--llm stub unless given)")
  .action(async () => {
    const g = { ...G(), app: "fixture", llm: G().llm || "stub" };
    const b = base(g, { annotator: "heuristic" });
    for (const s of STAGES) {
      await runStage(s, b);
      if (s === "judge") await runEvalJudge(b);
    }
    const file = await runReport(g);
    console.log(`\nDemo done. Open ${file}`);
  });

program.parseAsync(process.argv).catch(e => {
  console.error(`\n✘ ${(e as Error).message ?? e}`);
  process.exitCode = 1;
});
