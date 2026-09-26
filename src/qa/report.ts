// qa/report.html: one self-contained page (thumbnails embedded as data URIs, full-size files linked
// relatively). Per screen: a filmstrip original | r0 | r1 .. | best | heatmap, the metrics of every
// round with keep/discard, what each fix changed, and the remaining differences. Then flow QA
// (pass rate + failures) and the HTML vs image share of in-scope screens.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { ProductModel } from "../core/schema.ts";
import { escapeHtml as esc, writeText } from "../core/io.ts";
import type { FlowQa } from "./flows.ts";
import type { QaSummary, ScreenQa } from "./loop.ts";
import { THRESH } from "./loop.ts";

async function thumb(file: string, width = 150): Promise<string | null> {
  if (!fs.existsSync(file)) return null;
  const b = await sharp(file).resize({ width }).flatten({ background: "#ffffff" }).jpeg({ quality: 72 }).toBuffer();
  return `data:image/jpeg;base64,${b.toString("base64")}`;
}

const f3 = (v: number | null | undefined) => (typeof v === "number" ? v.toFixed(3) : "–");
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");

const CSS = `
:root { --bg:#F6F7F9; --card:#FFFFFF; --text:#14161A; --muted:#5B616E; --line:#E3E6EB; --good:#15803D; --warn:#B45309; --bad:#B91C1C; --accent:#3B5BDB; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 14px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
main { max-width: 1180px; margin: 0 auto; padding: 28px 20px 60px; }
h1 { font-size: 24px; margin: 0 0 4px; } h2 { font-size: 18px; margin: 32px 0 12px; } h3 { font-size: 16px; margin: 0; }
.sub { color: var(--muted); margin: 0 0 20px; }
.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; }
.tile { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; }
.tile b { display: block; font-size: 24px; font-variant-numeric: tabular-nums; }
.tile span { color: var(--muted); font-size: 12px; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 18px; margin: 16px 0; }
.head { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: baseline; margin-bottom: 12px; }
.pill { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #EEF1F5; color: var(--muted); }
.pill.good { background: #DCFCE7; color: var(--good); } .pill.warn { background: #FEF3C7; color: var(--warn); } .pill.bad { background: #FEE2E2; color: var(--bad); }
.strip { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 6px; }
.strip figure { margin: 0; flex: none; width: 150px; }
.strip img { width: 150px; border-radius: 8px; border: 1px solid var(--line); display: block; }
.strip figure.best img { outline: 3px solid var(--good); outline-offset: -1px; }
.strip figure.drop img { opacity: 0.55; }
.strip figcaption { font-size: 12px; color: var(--muted); margin-top: 4px; font-variant-numeric: tabular-nums; }
table { border-collapse: collapse; width: 100%; margin-top: 12px; font-size: 13px; font-variant-numeric: tabular-nums; }
th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { color: var(--muted); font-weight: 600; font-size: 12px; }
.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px; }
.cols h4 { margin: 0 0 6px; font-size: 13px; color: var(--muted); }
ul.tight { margin: 0; padding-left: 18px; } ul.tight li { margin: 2px 0; }
code { font: 12px ui-monospace, Menlo, monospace; background: #F1F3F6; padding: 1px 4px; border-radius: 4px; }
a { color: var(--accent); }
@media (max-width: 720px) { .cols { grid-template-columns: 1fr; } }
`;

export async function writeQaReport(qaDir: string, m: ProductModel, results: ScreenQa[], flow: FlowQa, summary: QaSummary): Promise<string> {
  const measured = results.filter(r => r.best >= 0);
  const bests = measured.map(r => r.rounds[r.best].metrics);
  const meanBest = bests.length ? bests.reduce((a, b) => a + b.composite, 0) / bests.length : null;
  const meanR0 = measured.length ? measured.reduce((a, r) => a + r.rounds[0].metrics.composite, 0) / measured.length : null;
  const good = bests.filter(b => b.composite >= THRESH.good && b.mustFix === 0).length;
  const inScope = m.screens.filter(s => s.inScope);

  const cards: string[] = [];
  for (const r of results) {
    const s = r.screen;
    const dir = path.join(qaDir, s.id);
    if (r.best < 0) {
      cards.push(`<section class="card"><div class="head"><h3>${esc(s.id)} · ${esc(s.name)}</h3><span class="pill bad">${esc(r.stop)}</span></div><p class="sub">${esc(r.error ?? "Not measured.")}</p></section>`);
      continue;
    }
    const best = r.rounds[r.best].metrics;
    const frames: string[] = [];
    const orig = await thumb(path.join(dir, "original.png"));
    if (orig) frames.push(`<figure><a href="${esc(s.id)}/original.png"><img src="${orig}" alt="original"></a><figcaption>original</figcaption></figure>`);
    for (const rd of r.rounds) {
      const t = await thumb(path.join(dir, `r${rd.k}`, "mock.png"));
      if (!t) continue;
      const cls = rd.k === r.best ? "best" : rd.kept ? "" : "drop";
      frames.push(`<figure class="${cls}"><a href="${esc(s.id)}/r${rd.k}/mock.png"><img src="${t}" alt="r${rd.k}"></a><figcaption>r${rd.k} · ${f3(rd.metrics.composite)}${rd.k > 0 ? (rd.kept ? " kept" : " dropped") : ""}</figcaption></figure>`);
    }
    const heat = await thumb(path.join(dir, `r${r.best}`, "heat.png"));
    if (heat) frames.push(`<figure><a href="${esc(s.id)}/r${r.best}/heat.png"><img src="${heat}" alt="heatmap"></a><figcaption>difference (best r${r.best})</figcaption></figure>`);

    const rows = r.rounds.map(rd => `<tr><td>r${rd.k}</td><td>${esc(rd.by)}</td><td><b>${f3(rd.metrics.composite)}</b></td><td>${f3(rd.metrics.iou)}</td><td>${f3(rd.metrics.ssim)}</td><td>${f3(rd.metrics.text)}</td><td>${f3(rd.metrics.color)}</td><td>${rd.metrics.missing}</td><td>${rd.metrics.mustFix}</td><td>${rd.k === 0 ? "baseline" : rd.kept ? "kept" : "dropped"}</td></tr>`).join("");
    const changes = r.rounds.filter(rd => rd.k > 0).map(rd => `<li><b>r${rd.k}</b> (${esc(rd.by)}): ${rd.changelog.length ? `<ul class="tight">${rd.changelog.map(l => `<li>${esc(l)}</li>`).join("")}</ul>` : "no changes"}</li>`).join("");
    const bestRound = r.rounds[r.best];
    const tone = best.composite >= THRESH.good && best.mustFix === 0 ? "good" : best.composite >= 0.8 ? "warn" : "bad";
    cards.push(`<section class="card" id="${esc(s.id)}">
<div class="head"><h3>${esc(s.id)} · ${esc(s.name)}</h3><span class="pill">${esc(s.kind)}</span><span class="pill ${tone}">best r${r.best}: ${f3(best.composite)}</span><span class="pill">stop: ${esc(r.stop)}</span><span class="pill">${r.rounds.length - 1}/${r.cap} fix round(s)</span>${best.mustFix ? `<span class="pill bad">${best.mustFix} must-fix</span>` : ""}</div>
<div class="strip">${frames.join("")}</div>
<table><thead><tr><th>round</th><th>by</th><th>composite</th><th>IoU</th><th>SSIM</th><th>text</th><th>colour</th><th>missing</th><th>must-fix</th><th>decision</th></tr></thead><tbody>${rows}</tbody></table>
<div class="cols"><div><h4>What each round changed</h4>${changes ? `<ul class="tight">${changes}</ul>` : "<p class=\"sub\">No fix rounds (already good enough, or capped).</p>"}</div>
<div><h4>Remaining differences (best round)</h4>${bestRound.mustFix.length ? `<p><b>Must fix:</b></p><ul class="tight">${bestRound.mustFix.map(d => `<li>${esc(d)}</li>`).join("")}</ul>` : ""}${bestRound.worst.length ? `<ul class="tight">${bestRound.worst.slice(0, 8).map(d => `<li><code>${esc(d)}</code></li>`).join("")}</ul>` : "<p class=\"sub\">None above tolerance.</p>"}</div></div>
</section>`);
  }

  const fails = flow.failures.length
    ? `<table><thead><tr><th>edge</th><th>from → to</th><th>element</th><th>reason</th></tr></thead><tbody>${flow.checks.filter(c => !c.ok).map(c => `<tr><td>${esc(c.edge)}</td><td>${esc(c.from)} → ${esc(c.to)}</td><td>${esc(c.el)}</td><td>${esc(c.reason)}</td></tr>`).join("")}</tbody></table>`
    : `<p class="sub">Every in-scope edge reproduces its target screen and counter effects in the mock.</p>`;
  const images = m.screens.filter(s => s.render === "image");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>QA report · ${esc(m.app.name)}</title><style>${CSS}</style></head>
<body><main>
<h1>Mock QA · ${esc(m.app.name)}</h1>
<p class="sub">Each HTML screen is rendered at the device's size and compared with the original screenshot element by element (IoU, text, background colour) and pixel by pixel (SSIM, heatmap). Composite = 0.35 IoU + 0.25 SSIM + 0.20 text + 0.20 colour; a fix round is kept only if it gains ≥ ${THRESH.keep}. Status and navigation bars are masked.</p>
<div class="tiles">
<div class="tile"><b>${f3(meanR0)} → ${f3(meanBest)}</b><span>mean composite, first render → best</span></div>
<div class="tile"><b>${good}/${measured.length}</b><span>screens ≥ ${THRESH.good} with no must-fix</span></div>
<div class="tile"><b>${flow.passed}/${flow.total}</b><span>in-scope edges pass flow QA (${pct(flow.passed, flow.total)})</span></div>
<div class="tile"><b>${Math.round(summary.htmlShare * 100)}%</b><span>of ${inScope.length} in-scope screens rendered as HTML</span></div>
</div>
<h2>Screens</h2>
${cards.join("\n") || `<p class="sub">No HTML screens were measured.</p>`}
${images.length ? `<h2>Image screens</h2><p class="sub">Rendered as the screenshot plus invisible hotspots (badged “image screen” in the mock): ${images.map(s => `${esc(s.id)} ${esc(s.name)}`).join(", ")}.</p>` : ""}
<h2>Flow QA</h2>
<p>${flow.passed} of ${flow.total} in-scope edges pass (${pct(flow.passed, flow.total)}).${flow.skipped.length ? ` ${flow.skipped.length} edge(s) have no element to tap and were not replayed.` : ""}</p>
${fails}
</main></body></html>
`;
  const file = path.join(qaDir, "report.html");
  writeText(file, html);
  return file;
}
