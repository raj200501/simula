// The judge (FINAL_PLAN §9, BUILD_SPEC D6/T9/T13). Per proposal:
//   code gates -> (unless a policy gate already failed) ONE LLM judge call -> verdict computed in code
//   -> on REVISE: revise() with the required changes and top concern (never the scores) -> a fresh,
//   blind judge call on the new version. At most 2 revision rounds; stop early when a revision
//   neither improves the weighted score by 0.2 nor removes a failing gate. A loop that ends in
//   REVISE is a REJECT: REVISE is never promoted to the slides.
import path from "node:path";
import { z } from "zod";
import { Candidates, Criterion, Judgments, Proposal, type GateResult, type JudgmentRound, type ProductModel } from "../core/schema.ts";
import { json } from "../core/llm.ts";
import { MODELS } from "../core/config.ts";
import { save, writeText } from "../core/io.ts";
import { trace } from "../core/trace.ts";
import type { StageCtx } from "../core/run.ts";
import { digest } from "../model/digest.ts";
import { proposalEconomics } from "../model/economics.ts";
import { kbSystemBlock } from "../propose/kb.ts";
import { revise } from "../propose/propose.ts";
import { economicsLines } from "../propose/render.ts";
import { codeGates } from "./gates.ts";
import { ANCHORS, LLM_GATES, LLM_GATE_IDS } from "./rubric.ts";
import { requiredChangesFor, stubJudge, type JudgeOut } from "./stub.ts";
import { THRESHOLDS, WEIGHTS, finalVerdict, stalled, verdictOf } from "./verdict.ts";
import { judgmentsMd } from "./render.ts";

const STAGE = "judge";

/** Structured output of one judge call. The verdict is NOT in it: code computes it. */
export const LlmJudge = z.object({
  gates: z.array(z.object({ gate: z.enum(LLM_GATE_IDS), pass: z.boolean(), evidence: z.string() })),
  scores: z.array(z.object({ criterion: Criterion, evidence: z.string(), score: z.number() })),
  requiredChanges: z.array(z.string()),
  topConcern: z.string(),
});

export const Revisions = z.object({ schema: z.literal("simula.revisions/1"), app: z.string(), proposals: z.array(Proposal) });

export const PROCEDURE = `<role>
You are an independent reviewer for Simula's solutions team. You did not write the proposal. You judge one
rewarded-ad proposal for one app against the knowledge base above, the app's digest, and numbers computed in code.
You do not decide the verdict: code computes it from your gate answers and scores.
</role>

<procedure>
1. LLM gates. For each gate answer pass = true or false, with a verbatim quote from the proposal (or the digest)
   as evidence. A gate passes only if the answer is clearly yes.
${LLM_GATES.map(g => `   - ${g.id} (${g.severity}): ${g.question}`).join("\n")}
2. Criteria. For each of the 9 criteria write the evidence first (quote the proposal and the digest), then the
   score, an integer 1-5, using the anchors below (3 = acceptable with a clear weakness).
3. Length is not evidence. A longer, more confident or more elaborate proposal earns nothing for its length.
4. Use only the economics computed in code (given with the proposal). Never recompute or estimate them.
5. Credit specificity only for nouns and ids that appear in the digest. Invented ids and copy that could be
   pasted into any app score low.
6. requiredChanges: the concrete changes that would make the proposal shippable, most important first (empty if
   none). topConcern: the single most important required change.
</procedure>

<criteria>
${WEIGHTS.map(w => `- ${w.criterion} (weight ${w.weight}): 5 = ${ANCHORS[w.criterion].five} 1 = ${ANCHORS[w.criterion].one}`).join("\n")}
</criteria>`;

function system(): string[] {
  return [kbSystemBlock("judge"), PROCEDURE];
}

/** What the judge sees of a proposal: no economics (shown separately), no version, no self-assessment. */
function blindJson(p: Proposal): string {
  const { economics: _e, version: _v, beyondBaseline: _b, ...rest } = p;
  return JSON.stringify(rest, null, 1);
}

function judgePrompt(p: Proposal, m: ProductModel, dig: string, gates: GateResult[]): string {
  return [
    "# Product model digest", "", dig, "",
    `# Proposal under review (${p.id})`, "", "```json", blindJson(p), "```", "",
    "# Economics computed in code (use these numbers only)", "", ...economicsLines(p, m), "",
    "# Code gate results", "", ...gates.map(g => `- ${g.pass ? "PASS" : "FAIL"} ${g.gate} [${g.severity}]: ${g.evidence}`), "",
    "# Task", "",
    `Answer every LLM gate (${LLM_GATES.map(g => g.id).join(", ")}), score all 9 criteria, then list the required changes and the top concern.`,
  ].join("\n");
}

const withEconomics = (p: Proposal, m: ProductModel): Proposal => ({ ...p, economics: proposalEconomics({ ...p, economics: undefined }, m) });

/** Judge ONE version of ONE proposal: code gates, then (unless policy-rejected) one blind judge call. */
export async function judgeOnce(m: ProductModel, p0: Proposal, round: number, dig: string, purpose: string): Promise<JudgmentRound> {
  const p = withEconomics(p0, m);
  const code = codeGates(p, m);
  const base = { proposalId: p.id, version: p.version, round };
  if (code.some(g => !g.pass && g.severity === "policy")) {
    // Policy failures are final; there is nothing for a model to weigh.
    const v = verdictOf(code, [], round);
    return { ...base, gates: code, scores: [], weighted: null, ...requiredChangesFor(code, [], []), verdict: v.verdict, reasons: v.reasons, judgedBy: "code-only" };
  }
  let stubbed = false;
  let out: JudgeOut;
  try {
    out = await json({
      stage: STAGE, purpose, model: MODELS.main, effort: "high", maxTokens: 16000,
      system: system(), prompt: judgePrompt(p, m, dig, code), schema: LlmJudge,
      stub: () => { stubbed = true; return stubJudge(p, m, code); },
    });
  } catch (e) {
    trace("failure", { where: `judge:${purpose}`, error: String((e as Error)?.message ?? e).slice(0, 300) });
    trace("recovery", { how: "heuristic (stub) judge for this round" });
    stubbed = true;
    out = stubJudge(p, m, code);
  }
  // Severity comes from our gate table, never from the model; unanswered gates fail (conservative).
  const llmGates: GateResult[] = LLM_GATES.map(def => {
    const a = out.gates.find(x => x.gate === def.id);
    return { gate: def.id, pass: a?.pass ?? false, by: "llm", severity: def.severity, evidence: a?.evidence ?? "not answered by the judge" };
  });
  const scores = WEIGHTS.flatMap(w => {
    const s = out.scores.find(x => x.criterion === w.criterion);
    return s ? [{ criterion: w.criterion, evidence: s.evidence, score: Math.max(1, Math.min(5, Math.round(s.score))) }] : [];
  });
  const gates = [...code, ...llmGates];
  const v = verdictOf(gates, scores, round);
  return { ...base, gates, scores, weighted: v.weighted, requiredChanges: out.requiredChanges, topConcern: out.topConcern, verdict: v.verdict, reasons: v.reasons, judgedBy: stubbed ? "stub" : "llm" };
}

export interface ProposalJudgment { rounds: JudgmentRound[]; versions: Proposal[]; final: Proposal; verdict: Judgments["final"][number]["verdict"]; note: string }

async function judgeProposal(c: StageCtx, m: ProductModel, p0: Proposal, dig: string): Promise<ProposalJudgment> {
  const rounds: JudgmentRound[] = [];
  const versions: Proposal[] = [p0];
  let p = p0;
  for (let round = 0; ; round++) {
    const r = await judgeOnce(m, p, round, dig, `judge:${p.id}:v${p.version}`);
    rounds.push(r);
    trace("judge", { proposal: p.id, version: p.version, round, verdict: r.verdict, weighted: r.weighted, judgedBy: r.judgedBy, failed: r.gates.filter(g => !g.pass).map(g => g.gate) });
    if (r.verdict !== "REVISE") break;
    if (round > 0 && stalled(rounds[round - 1], r)) {
      trace("stop", { proposal: p.id, reason: `revision stalled: weighted ${rounds[round - 1].weighted} -> ${r.weighted}` });
      break;
    }
    // "existing" without an observed anchor is relabelled before revision (FINAL_PLAN §9.1).
    const relabel = p.case === "existing" && r.gates.some(g => g.gate === "label" && !g.pass);
    p = await revise(c, m, relabel ? { ...p, case: "product-change" } : p, r.requiredChanges, r.topConcern, round + 1);
    versions.push(p);
  }
  const f = finalVerdict(rounds);
  return { rounds, versions, final: versions[versions.length - 1], verdict: f.verdict, note: f.note };
}

function summary(j: ProposalJudgment): string {
  const last = j.rounds[j.rounds.length - 1];
  const revs = j.versions.length - 1;
  const after = revs ? ` after ${revs} revision${revs > 1 ? "s" : ""}` : "";
  if (j.verdict === "SHIP") return `SHIP at ${last.weighted} (v${j.final.version}${after}).`;
  if (last.judgedBy === "code-only") return `REJECT by code gate${after}: ${last.reasons[0] ?? ""}.`;
  return `REJECT${after}: ${j.note || last.reasons.join("; ")}. Top concern: ${last.topConcern}`;
}

export async function judgeAll(c: StageCtx, m: ProductModel, cands: Candidates): Promise<Judgments> {
  const dig = digest(m);
  const results = await Promise.all(cands.proposals.map(p => judgeProposal(c, m, p, dig)));
  const j: Judgments = {
    schema: "simula.judgments/1", app: m.app.id,
    rubricWeights: WEIGHTS,
    thresholds: { ship: THRESHOLDS.ship, revise: THRESHOLDS.revise, minCriterion: THRESHOLDS.minCriterion, maxRounds: THRESHOLDS.maxRounds },
    rounds: results.flatMap(r => r.rounds),
    final: results.map(r => ({ proposalId: r.final.id, version: r.final.version, verdict: r.verdict, weighted: r.rounds[r.rounds.length - 1].weighted, summary: summary(r) })),
  };
  const dir = c.paths.proposals;
  save(Judgments, path.join(dir, "judgments.json"), j);
  // Slides must show what was judged: candidates.json now holds each proposal's final version
  // (judgments.final[].version), and every version of this run is kept in revisions.json.
  cands.proposals = results.map(r => r.final);
  save(Candidates, path.join(dir, "candidates.json"), cands);
  save(Revisions, path.join(dir, "revisions.json"), { schema: "simula.revisions/1", app: m.app.id, proposals: results.flatMap(r => r.versions) });
  writeText(path.join(dir, "judgments.md"), judgmentsMd(j, results, m));
  trace("decision", { what: "judgments written", final: j.final.map(f => `${f.proposalId}v${f.version}:${f.verdict}:${f.weighted}`) });
  return j;
}
