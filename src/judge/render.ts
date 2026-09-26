// judgments.md: every candidate and every round, rejected ones included: gates, scores with their
// evidence, the verdict reasons computed in code, the required changes, and what changed between versions.
import type { Judgments, JudgmentRound, ProductModel, Proposal } from "../core/schema.ts";
import { rewardLine, screenName } from "../propose/render.ts";
import { THRESHOLDS, WEIGHTS } from "./verdict.ts";

const cell = (s: unknown) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");

function flatten(v: unknown, at: string, out: Map<string, string>): void {
  if (Array.isArray(v)) v.forEach((x, i) => flatten(x, `${at}[${i}]`, out));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) flatten(x, at ? `${at}.${k}` : k, out);
  else out.set(at, JSON.stringify(v));
}

/** Field-level diff between two versions (economics and verification flags excluded: code recomputes them). */
export function diffProposals(a: Proposal, b: Proposal, max = 30): string[] {
  const strip = (p: Proposal) => ({ ...p, economics: undefined, version: undefined, evidence: p.evidence.map(e => ({ ...e, verified: undefined })) });
  const fa = new Map<string, string>(), fb = new Map<string, string>();
  flatten(strip(a), "", fa);
  flatten(strip(b), "", fb);
  const keys = [...new Set([...fa.keys(), ...fb.keys()])];
  const short = (s: string | undefined) => (s === undefined ? "(none)" : s.length > 90 ? `${s.slice(0, 87)}..."` : s);
  const out = keys.filter(k => fa.get(k) !== fb.get(k)).map(k => `\`${k}\`: ${short(fa.get(k))} → ${short(fb.get(k))}`);
  return out.length > max ? [...out.slice(0, max), `... and ${out.length - max} more changes`] : out;
}

function roundMd(r: JudgmentRound): string[] {
  const L: string[] = [];
  L.push(`#### Round ${r.round} (v${r.version}): **${r.verdict}**${r.weighted !== null ? ` · weighted ${r.weighted}` : ""} · judged by ${r.judgedBy}${r.judgedBy === "stub" ? " (heuristic, no LLM)" : ""}`, "");
  L.push("| gate | by | severity | result | evidence |", "|---|---|---|---|---|");
  const by = (b: string) => (b === "llm" && r.judgedBy === "stub" ? "judge (stub)" : b);
  for (const g of r.gates) L.push(`| ${g.gate} | ${by(g.by)} | ${g.severity} | ${g.pass ? "pass" : "**FAIL**"} | ${cell(g.evidence)} |`);
  if (r.scores.length) {
    L.push("", "| criterion | weight | score | evidence |", "|---|---|---|---|");
    for (const w of WEIGHTS) {
      const s = r.scores.find(x => x.criterion === w.criterion);
      L.push(`| ${w.criterion} | ${w.weight} | ${s ? s.score : "—"} | ${cell(s?.evidence ?? "not scored")} |`);
    }
  }
  L.push("", `- **Verdict reasons (code):** ${r.reasons.join("; ") || "none"}`);
  if (r.requiredChanges.length) L.push(`- **Required changes:**`, ...r.requiredChanges.map(x => `  - ${x}`));
  L.push(`- **Top concern:** ${r.topConcern}`, "");
  return L;
}

export function judgmentsMd(j: Judgments, results: { rounds: JudgmentRound[]; versions: Proposal[]; final: Proposal }[], m: ProductModel): string {
  const L: string[] = [];
  L.push(`# Judgments: ${m.app.name}`, "");
  const by = new Set(j.rounds.map(r => r.judgedBy));
  if (by.has("stub")) L.push("> **Rounds marked `stub` were scored by the deterministic heuristic judge (no LLM).** See src/judge/stub.ts.", "");
  L.push(`Verdicts are computed in code: SHIP at weighted ≥ ${THRESHOLDS.ship} with every criterion ≥ ${THRESHOLDS.minCriterion} and every gate passing; REVISE between ${THRESHOLDS.revise} and ${THRESHOLDS.ship}, on any criterion ≤ 2, or on a fixable gate; REJECT below ${THRESHOLDS.revise}, on a policy gate, or still REVISE after round ${THRESHOLDS.maxRounds} (or when a revision stalls: < +${THRESHOLDS.minImprovement} and no gate fixed). Only SHIP goes to the slides.`, "");
  L.push("Weights: " + WEIGHTS.map(w => `${w.criterion} ${w.weight}`).join(", ") + ".", "");

  L.push("## Summary", "", "| proposal | title | final | weighted | versions | summary |", "|---|---|---|---|---|---|");
  for (const f of j.final) {
    const r = results.find(x => x.final.id === f.proposalId);
    L.push(`| ${f.proposalId} | ${cell(r?.final.title)} | **${f.verdict}** | ${f.weighted ?? "—"} | ${r?.versions.map(v => `v${v.version}`).join(" → ")} | ${cell(f.summary)} |`);
  }
  for (const r of results) {
    const f = j.final.find(x => x.proposalId === r.final.id)!;
    const p = r.final;
    L.push("", `## ${p.id}: ${p.title} — ${f.verdict}`, "");
    L.push(`> ${p.oneLiner}`, "");
    L.push(`- ${p.case} · ${p.archetype} · surface ${screenName(m, p.surface)} · reward ${rewardLine(p)} · caps ${p.caps.perDay}/day`, "");
    r.rounds.forEach((round, i) => {
      L.push(...roundMd(round));
      const next = r.versions[i + 1];
      if (next) {
        L.push(`#### Changes v${r.versions[i].version} → v${next.version} (revise() saw the required changes, never the scores)`, "");
        const d = diffProposals(r.versions[i], next);
        L.push(...(d.length ? d.map(x => `- ${x}`) : ["- (no field changed)"]), "");
      }
    });
  }
  return L.join("\n") + "\n";
}
