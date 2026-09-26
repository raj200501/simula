// out/index.html: the spine of the review. One self-contained page (no fetch; opens from file://)
// with the transfer scorecard across apps, the six "how you operate" answers, per-app links to
// every artifact, and pre-rendered HTML for the Markdown artifacts (candidates, judgments, judge
// eval, trajectory) under out/<app>/report/. Every input is optional: a stage that has not run
// shows as missing, and an app that could not be explored shows as "blocked" with the reason.
import fs from "node:fs";
import path from "node:path";
import { ROOT, loadApp, paths as appPaths } from "../core/config.ts";
import { escapeHtml as h, load, nowIso, writeText } from "../core/io.ts";
import { Candidates, Judgments, ProductModel } from "../core/schema.ts";
import { summarize } from "../core/trace.ts";
import { HOW_IT_WORKS, PRODUCTIONIZATION } from "./content.ts";
import { fmtInt, fmtTokens, fmtUsd, readJsonSafe, readQa, rollupCost, traceStats, type CostRollup, type QaDigest, type TraceStats } from "./data.ts";
import { renderMarkdown } from "./markdown.ts";
import { galleryMd } from "./gallery.ts";
import { numbersMd } from "./numbers.ts";

type State = "complete" | "partial" | "blocked" | "not run";

interface AppRow {
  id: string;
  name: string;
  profile: string;
  state: State;
  why: string;
  model: ProductModel | null;
  modelError: string;
  qa: QaDigest | null;
  verdicts: { SHIP: number; REVISE: number; REJECT: number } | null;
  ships: { id: string; title: string }[];
  cost: CostRollup;
  trace: TraceStats;
  notes: string[];
  stubs: string[];
  links: { label: string; href: string; ok: boolean }[];
  judgeEval: string;
}

// A human note that says the app could not be explored ("exits on launch", "blocked by ...").
const BLOCKED_NOTE = /\b(blocked|could ?n[o']t (be )?explored?|cannot (be )?explored?|can'?t explore|not explorable|exits? on launch|crash(es|ed)? on (launch|start)|refuses to run|won'?t (run|launch|open))\b/i;

/** A human note as one readable line: whitespace collapsed, npm's log-file boilerplate cut. */
export function tidyNote(n: string): string {
  return n.replace(/\bnpm error To see a list of scripts[\s\S]*$/i, "npm: no such script.").replace(/\s*npm error A complete log of this run[\s\S]*$/i, "").replace(/\s+/g, " ").trim();
}

export async function buildReport(appIds: string[], outRoot?: string): Promise<string> {
  const root = outRoot ? path.resolve(outRoot) : path.join(ROOT, "out");
  const rows = appIds.map(id => collect(id, root));
  const file = path.join(root, "index.html");
  writeText(file, page(rows));
  writeText(path.join(root, "README.md"), galleryMd(rows, root));
  return file;
}

function collect(id: string, root: string): AppRow {
  const p = appPaths(id, { outRoot: root });
  const exists = (f: string) => fs.existsSync(f);
  const cfg = (() => { try { return loadApp(id); } catch { return null; } })();

  let model: ProductModel | null = null, modelError = "";
  const modelFile = path.join(p.model, "product-model.json");
  if (exists(modelFile)) {
    try { model = load(ProductModel, modelFile); } catch (e) { modelError = String((e as Error).message).split("\n")[0]; }
  }
  const cands = tryLoad(Candidates, path.join(p.proposals, "candidates.json"));
  const judgments = tryLoad(Judgments, path.join(p.proposals, "judgments.json"));
  const qa = readQa(path.join(p.qa, "summary.json"));
  const trace = traceStats(p.trace);
  const humanLog = exists(path.join(p.out, "HUMAN_LOG.md"))
    ? fs.readFileSync(path.join(p.out, "HUMAN_LOG.md"), "utf8").split("\n").map(l => l.replace(/^-\s*\S+Z?\s*/, "").trim()).filter(Boolean) : [];
  const notes = [...new Set([...trace.humanNotes, ...humanLog].map(tidyNote).filter(Boolean))];

  // Pre-render the Markdown artifacts to HTML pages next to this app's outputs.
  const rendered = (src: string, name: string, title: string) => {
    if (!exists(src)) return false;
    writeText(path.join(p.out, "report", `${name}.html`), mdPage(`${cfg?.name ?? id}: ${title}`, fs.readFileSync(src, "utf8")));
    return true;
  };
  const hasCands = rendered(path.join(p.proposals, "candidates.md"), "candidates", "candidates");
  const hasJudg = rendered(path.join(p.proposals, "judgments.md"), "judgments", "judgments");
  const evalMd = path.join(p.proposals, "judge-eval.md");
  const hasEval = rendered(evalMd, "judge-eval", "judge evaluation");
  let hasTraj = false;
  if (exists(p.trace)) {
    try {
      const md = summarize(p.trace, path.join(p.out, "trajectory.md"));
      writeText(path.join(p.out, "report", "trajectory.html"), mdPage(`${cfg?.name ?? id}: trajectory`, md));
      hasTraj = true;
    } catch { /* unreadable trace: the link shows as missing */ }
  }

  const final = judgments ? latest(judgments) : [];
  const verdicts = judgments ? { SHIP: 0, REVISE: 0, REJECT: 0, ...count(final.map(f => f.verdict)) } : null;
  const ships = final.filter(f => f.verdict === "SHIP").map(f => ({ id: f.proposalId, title: cands?.proposals.find(x => x.id === f.proposalId)?.title ?? f.proposalId }));
  const stubs = [
    model?.provenance.synthesizedBy === "stub" ? "model" : "",
    cands?.generatedBy === "stub" ? "proposals" : "",
    judgments?.rounds.some(r => r.judgedBy === "stub") ? "judge" : "",
  ].filter(Boolean);

  const rel = (...xs: string[]) => [id, ...xs].join("/");
  const L = (label: string, relPath: string, file: string) => ({ label, href: relPath, ok: exists(file) });
  const links = [
    L("Product model", rel("model", "viewer.html"), path.join(p.model, "viewer.html")),
    L("Mock", rel("mock", "index.html"), path.join(p.mock, "index.html")),
    { ...L("Mock (debug)", rel("mock", "index.html") + "?debug=1", path.join(p.mock, "index.html")) },
    L("QA report", rel("qa", "report.html"), path.join(p.qa, "report.html")),
    { label: "Candidates", href: rel("report", "candidates.html"), ok: hasCands },
    { label: "Judgments", href: rel("report", "judgments.html"), ok: hasJudg },
    { label: "Judge eval", href: rel("report", "judge-eval.html"), ok: hasEval },
    L("Slides", rel("slides", "deck.html"), path.join(p.slides, "deck.html")),
    L("Slides PDF", rel("slides", "deck.pdf"), path.join(p.slides, "deck.pdf")),
    { label: "Trajectory", href: rel("report", "trajectory.html"), ok: hasTraj },
  ];

  // State: blocked needs evidence (a note or a failed explore manifest); otherwise how far it got.
  const exploreMf = readJsonSafe(path.join(p.explore, "manifest.json")) as { status?: string; error?: string } | null;
  const blockedFile = ["BLOCKED.md", "BLOCKED.txt"].map(f => path.join(p.out, f)).find(exists);
  const blockedNote = notes.find(n => BLOCKED_NOTE.test(n));
  let state: State, why = "";
  if (!model && (blockedFile || blockedNote || exploreMf?.status === "failed")) {
    state = "blocked";
    why = blockedFile ? fs.readFileSync(blockedFile, "utf8").trim().split("\n")[0] : blockedNote ?? `explore failed: ${String(exploreMf?.error ?? "").split("\n")[0]}`;
  } else if (!model) {
    state = "not run";
    why = modelError || "no product model yet";
  } else {
    state = exists(path.join(p.slides, "deck.html")) ? "complete" : "partial";
    if (state === "partial") why = `furthest stage: ${judgments ? "judge" : cands ? "propose" : qa ? "qa" : exists(path.join(p.mock, "index.html")) ? "mock" : "understand"}`;
  }

  const cost = rollupCost(p.cost);
  const evalText = exists(evalMd) ? fs.readFileSync(evalMd, "utf8") : "";
  const name = model?.app.name ?? cfg?.name ?? id;
  if (model) {
    writeText(path.join(p.out, "NUMBERS.md"), numbersMd({ name, model, qa, cands, judgments, evalMd: evalText, cost, trace, notes, stubs }));
    links.unshift({ label: "Numbers", href: rel("NUMBERS.md"), ok: true });
  }

  return {
    id, name, profile: cfg?.profile ?? "", state, why, model, modelError, qa, verdicts, ships,
    cost, trace, notes, stubs, links,
    judgeEval: evalText ? renderMarkdown(evalText) : "",
  };
}

// ------------------------------------------------------------------------------------------------ page
function page(rows: AppRow[]): string {
  const total = rows.reduce((a, r) => ({ usd: a.usd + r.cost.usd, live: a.live + r.cost.live, tok: a.tok + r.cost.tokensIn + r.cost.tokensOut + r.cost.thoughts }), { usd: 0, live: 0, tok: 0 });
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Simula run report</title>
<style>${CSS}</style></head><body>
<header><div class="wrap">
<div class="eyebrow">Simula · App Monetization Agent</div>
<h1>Run report</h1>
<p class="lede">Mobile app → explorer agent → typed product model → generated mock → QA loop → rewarded-ad proposals → judge → slide flows. One row per app, produced by the same pipeline with no per-app code.</p>
<ol class="pipe">${["Explore", "Understand", "Mock", "QA", "Propose", "Judge", "Slides"].map(s => `<li>${s}</li>`).join("")}</ol>
</div></header>
<main class="wrap">
<section><h2>Transfer scorecard</h2>
<div class="scroll"><table class="score"><thead><tr><th>App</th><th>State</th><th>Explored</th><th>Regime</th><th>Mechanics found</th><th>QA</th><th>Verdicts</th><th>LLM</th><th>Human</th></tr></thead>
<tbody>${rows.map(scoreRow).join("") || `<tr><td colspan="9">No app outputs found.</td></tr>`}</tbody>
<tfoot><tr><td colspan="7">All apps</td><td>${fmtUsd(total.usd)} · ${fmtInt(total.live)} call${total.live === 1 ? "" : "s"} · ${fmtTokens(total.tok)} tok</td><td></td></tr></tfoot></table></div>
<p class="note">Explored: steps · states · edges · external surfaces, then why exploration stopped. Mechanics: resources · sinks · sources · offers · walls · ads, all with on-screen evidence in the model viewer. QA: mean composite similarity · navigation flows passing · share of screens rebuilt in HTML. “stub” marks outputs produced by deterministic fallbacks instead of a model.</p></section>

<section><h2>How it works</h2>
<table class="how"><tbody>${HOW_IT_WORKS.map(x => `<tr><th>${h(x.q)}</th><td>${h(x.a)}</td></tr>`).join("")}</tbody></table></section>

${rows.map(appSection).join("\n")}

<section><h2>Productionization sketch</h2><div class="grid4">${PRODUCTIONIZATION.map(s => `<div class="card"><h3>${h(s.title)}</h3><ul>${s.points.map(p => `<li>${h(p)}</li>`).join("")}</ul></div>`).join("")}</div></section>
<footer>Generated ${h(nowIso().slice(0, 16).replace("T", " "))} UTC from the artifacts under out/. Every page here opens from the file system.</footer>
</main></body></html>
`;
}

function scoreRow(r: AppRow): string {
  const m = r.model, c = m?.coverage, e = m?.economy;
  const dash = `<span class="muted">–</span>`;
  const explored = c ? `${c.steps} · ${c.states} · ${c.edges} · ${c.externals}<div class="muted">stop: ${h(c.stopReason)}</div>` : dash;
  const mech = e ? `${e.resources.length} · ${e.sinks.length} · ${e.sources.length} · ${e.offers.length} · ${e.walls.length} · ${e.ads.length}` : dash;
  const qa = r.qa ? `${r.qa.compositeMean != null ? r.qa.compositeMean.toFixed(2) : "–"} · ${r.qa.flowTotal ? `${r.qa.flowPassed}/${r.qa.flowTotal}` : "–"} · ${r.qa.htmlShare != null ? `${Math.round(r.qa.htmlShare * 100)}%` : "–"}` : dash;
  const v = r.verdicts ? `<span class="v ship">${r.verdicts.SHIP} SHIP</span> <span class="v revise">${r.verdicts.REVISE} REVISE</span> <span class="v reject">${r.verdicts.REJECT} REJECT</span>` : dash;
  const llm = r.cost.live + r.cost.cached
    ? `${fmtUsd(r.cost.usd)} · ${r.cost.live} call${r.cost.live === 1 ? "" : "s"}${r.cost.cached ? ` (+${r.cost.cached} cached)` : ""}<div class="muted">${fmtTokens(r.cost.tokensIn)} in · ${fmtTokens(r.cost.tokensOut + r.cost.thoughts)} out${r.cost.providers.includes("gemini") ? " · free tier" : ""}</div>`
    : `<span class="muted">no live calls</span>`;
  return `<tr class="st-${r.state.replace(" ", "-")}"><td><a href="#app-${h(r.id)}"><b>${h(r.name)}</b></a><div class="muted">${h(r.id)}${r.profile ? ` · ${h(r.profile)}` : ""}${r.stubs.length ? ` · <span class="stub">stub: ${h(r.stubs.join(", "))}</span>` : ""}</div></td>
<td><span class="state ${r.state.replace(" ", "-")}">${h(r.state)}</span>${r.why ? `<div class="muted why">${h(r.why)}</div>` : ""}</td>
<td>${explored}</td><td>${m ? h(m.regime) : dash}</td><td>${mech}</td><td>${qa}</td><td>${v}</td><td>${llm}</td><td class="num">${r.trace.human}${r.trace.skippedForHuman ? `<div class="muted">${r.trace.skippedForHuman} sign-in wall${r.trace.skippedForHuman === 1 ? "" : "s"} skipped</div>` : ""}</td></tr>`;
}

function appSection(r: AppRow): string {
  const m = r.model;
  const links = r.links.map(l => (l.ok ? `<a class="lnk" href="${h(l.href)}">${h(l.label)}</a>` : `<span class="lnk off" title="not built yet">${h(l.label)}</span>`)).join("");
  const ships = r.ships.length
    ? `<h3>Shipped flows</h3><ul>${r.ships.map(s => `<li><a href="${h(r.id)}/slides/deck.html#flow-${h(s.id)}">${h(s.id)}: ${h(s.title)}</a></li>`).join("")}</ul>` : "";
  const costRows = r.cost.byStage.map(s => `<tr><td>${h(s.stage)}</td><td class="num">${s.live}</td><td class="num">${s.cached}</td><td class="num">${fmtTokens(s.tokensIn)}</td><td class="num">${fmtTokens(s.tokensOut + s.thoughts)}</td><td class="num">${fmtUsd(s.usd)}</td></tr>`).join("");
  return `<section class="app" id="app-${h(r.id)}">
<h2>${h(r.name)} <span class="state ${r.state.replace(" ", "-")}">${h(r.state)}</span></h2>
${m ? `<p class="lede2">${h(m.brief.oneLiner)} <span class="muted">Regime: ${h(m.regime)}. ${h(m.brief.howItMakesMoney.replace(/([^.!?])$/, "$1."))}</span></p>` : `<p class="lede2">${h(r.why || "No outputs yet.")}</p>`}
<div class="links">${links}</div>
${ships}
${r.notes.length ? `<h3>Human notes</h3><ul class="notes">${r.notes.map(n => `<li>${h(n)}</li>`).join("")}</ul>` : ""}
<details><summary>Cost by stage (${fmtUsd(r.cost.usd)}, ${r.cost.live} live calls, ${r.cost.cached} cached)</summary>
${costRows ? `<table class="small"><thead><tr><th>Stage</th><th>Live</th><th>Cached</th><th>Tokens in</th><th>Tokens out</th><th>USD</th></tr></thead><tbody>${costRows}</tbody></table>` : `<p class="muted">No calls recorded in cost.jsonl (stub or replay runs record none).</p>`}
<p class="muted">Trace: ${r.trace.decisions} decisions, ${r.trace.failures} failures, ${r.trace.recoveries} recoveries, ${r.trace.human} human steps.</p></details>
${r.judgeEval ? `<details><summary>Judge evaluation (single-fault confusion table)</summary><div class="md">${r.judgeEval}</div></details>` : ""}
</section>`;
}

function mdPage(title: string, md: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${h(title)}</title><style>${CSS}</style></head><body>
<main class="wrap doc"><p><a href="../../index.html">← Run report</a></p><div class="md">${renderMarkdown(md)}</div></main></body></html>
`;
}

// ------------------------------------------------------------------------------------------------ helpers
function tryLoad<T>(schema: Parameters<typeof load<T>>[0], file: string): T | null {
  try { return fs.existsSync(file) ? load(schema, file) : null; } catch { return null; }
}

function latest(j: Judgments) {
  const by = new Map<string, Judgments["final"][number]>();
  for (const f of j.final) by.set(f.proposalId, f);
  return [...by.values()];
}

function count(xs: string[]): Record<string, number> {
  const o: Record<string, number> = {};
  for (const x of xs) o[x] = (o[x] ?? 0) + 1;
  return o;
}

const CSS = `
:root{--ink:#111827;--muted:#6B7280;--line:#E5E7EB;--soft:#F6F7F9;--accent:#4F46E5;--ship:#047857;--revise:#B45309;--reject:#B91C1C}
*{box-sizing:border-box}
body{margin:0;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:var(--ink);background:#fff}
.wrap{max-width:1280px;margin:0 auto;padding:0 24px}
header{background:var(--soft);border-bottom:1px solid var(--line);padding:36px 0 28px}
.eyebrow{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:700}
h1{font-size:36px;margin:6px 0 8px;letter-spacing:-.01em}
h2{font-size:24px;margin:40px 0 12px;display:flex;align-items:center;gap:12px}
h3{font-size:17px;margin:18px 0 6px}
.lede{font-size:18px;color:#374151;max-width:900px;margin:0}
.lede2{color:#374151;max-width:1000px}
.pipe{list-style:none;display:flex;flex-wrap:wrap;gap:6px;padding:0;margin:18px 0 0}
.pipe li{background:#fff;border:1px solid var(--line);border-radius:999px;padding:4px 12px;font-size:14px;font-weight:600}
.pipe li+li::before{content:"→";color:var(--muted);margin-right:8px}
.scroll{overflow-x:auto}
table{border-collapse:collapse;width:100%}
.score th,.small th{text-align:left;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);border-bottom:2px solid var(--line);padding:8px 10px;white-space:nowrap}
.score td,.small td{border-bottom:1px solid var(--line);padding:10px;vertical-align:top;font-size:15px}
.score tfoot td{font-weight:700;border-bottom:none}
.num{text-align:right;font-variant-numeric:tabular-nums}
.muted{color:var(--muted);font-size:13px}
.why{max-width:260px}
.note{font-size:14px;color:var(--muted);max-width:1000px}
.state{display:inline-block;font-size:12px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;padding:3px 9px;border-radius:999px;background:var(--soft);color:var(--muted)}
.state.complete{background:#ECFDF5;color:var(--ship)}.state.partial{background:#EFF6FF;color:#1D4ED8}.state.blocked{background:#FEF2F2;color:var(--reject)}
.v{display:inline-block;font-size:12px;font-weight:700;padding:2px 7px;border-radius:999px;margin:1px 0;white-space:nowrap}
.v.ship{background:#ECFDF5;color:var(--ship)}.v.revise{background:#FFFBEB;color:var(--revise)}.v.reject{background:#FEF2F2;color:var(--reject)}
.stub{background:#FFFBEB;color:var(--revise);border-radius:4px;padding:0 5px}
.how th{text-align:left;width:300px;padding:10px 16px 10px 0;border-bottom:1px solid var(--line);vertical-align:top;font-size:15px}
.how td{padding:10px 0;border-bottom:1px solid var(--line);color:#374151}
.app{border-top:1px solid var(--line);margin-top:28px}
.links{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.lnk{display:inline-block;border:1px solid var(--line);border-radius:10px;padding:7px 12px;font-weight:600;font-size:14px;text-decoration:none;color:var(--ink);background:#fff}
a.lnk:hover{border-color:var(--accent);color:var(--accent)}
.lnk.off{color:#9CA3AF;background:var(--soft);border-style:dashed}
details{margin:10px 0;border:1px solid var(--line);border-radius:10px;padding:10px 14px}
summary{cursor:pointer;font-weight:600}
.notes li{font-size:15px}
.grid4{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
.card{background:var(--soft);border-radius:14px;padding:16px 18px}
.card ul{padding-left:18px;margin:6px 0 0;font-size:15px}
footer{margin:48px 0 32px;font-size:13px;color:var(--muted)}
.doc{padding-top:24px;padding-bottom:48px}
.md table{margin:12px 0}
.md th,.md td{border:1px solid var(--line);padding:6px 9px;text-align:left;vertical-align:top;font-size:14px}
.md th{background:var(--soft)}
.md pre{background:#0F172A;color:#E2E8F0;padding:12px 14px;border-radius:10px;overflow-x:auto;font-size:13px}
.md code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.92em}
.md blockquote{border-left:3px solid var(--line);margin:8px 0;padding:2px 14px;color:#374151}
`;
