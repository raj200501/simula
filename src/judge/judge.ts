// The judge (FINAL_PLAN §9, BUILD_SPEC D6/T9/T13). Per proposal:
//   code gates -> (unless a policy gate already failed) ONE LLM judge call -> verdict computed in code
//   -> on REVISE: revise() with the required changes and top concern (never the scores) -> a fresh,
//   blind judge call on the new version. At most 2 revision rounds; stop early when a revision
//   neither improves the weighted score by 0.2 nor removes a failing gate. A loop that ends in
//   REVISE is a REJECT: REVISE is never promoted to the slides.
// Then the portfolio check (portfolio.ts): a SHIP that near-duplicates a better-scored SHIP fails the
// "portfolio-distinct" code gate, gets the same revision loop once, and is rejected if still a duplicate.
import path from "node:path";
import { z } from "zod";
import { Candidates, Criterion, Judgments, Proposal, type GateResult, type JudgmentRound, type ProductModel } from "../core/schema.ts";
import { json, llmMode } from "../core/llm.ts";
import { MODELS } from "../core/config.ts";
import { save, writeText } from "../core/io.ts";
import { trace } from "../core/trace.ts";
import type { StageCtx } from "../core/run.ts";
import { digest } from "../model/digest.ts";
import { ECON, proposalEconomics } from "../model/economics.ts";
import { kbSystemBlock } from "../propose/kb.ts";
import { revise } from "../propose/propose.ts";
import { economicsLines } from "../propose/render.ts";
import { codeGates } from "./gates.ts";
import { ANCHORS, LLM_GATES, LLM_GATE_IDS } from "./rubric.ts";
import { requiredChangesFor, stubJudge, type JudgeOut } from "./stub.ts";
import { THRESHOLDS, WEIGHTS, finalVerdict, stalled, verdictOf } from "./verdict.ts";
import { judgmentsMd } from "./render.ts";
import { PORTFOLIO, duplicateChange, parseDuplicate, portfolioGate, portfolioOrder } from "./portfolio.ts";

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
7. Entitlements are not currencies. A plan, tier, membership or account is granted as a time box ("30 minutes
   of <feature>") or a number of uses of a named feature ("3 <feature> answers"), never as "+N <tier>" or
   "+1 <membership>". A reward that treats an entitlement as a currency scores value-moment-fit at most 2 and
   earns no specificity credit for that noun.
8. An ad never stands in for creating an account. On a sign-up wall the account stays the first path; at most a
   gated feature may be sampled after the user declines. Account-only features (saving, profile settings) are
   never rewards.
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
  // Economics only for a schema-valid proposal; an invalid one is stopped by the schema gate.
  const p = Proposal.safeParse(p0).success ? withEconomics(p0, m) : p0;
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
  const v0 = verdictOf(gates, scores, round);
  // A live judge call that failed and fell back to the heuristic can hold a proposal, never ship it.
  const v = stubbed && llmMode() !== "stub" && v0.verdict === "SHIP"
    ? { ...v0, verdict: "REVISE" as const, reasons: [...v0.reasons, "judged by the heuristic fallback after the model call failed: not shipped without a model's review"] }
    : v0;
  return { ...base, gates, scores, weighted: v.weighted, requiredChanges: out.requiredChanges, topConcern: out.topConcern, verdict: v.verdict, reasons: v.reasons, judgedBy: stubbed ? "stub" : "llm" };
}

export interface ProposalJudgment { rounds: JudgmentRound[]; versions: Proposal[]; final: Proposal; verdict: Judgments["final"][number]["verdict"]; note: string }

/** An extra code gate checked on every round the loop judges (the portfolio check uses it). */
type ExtraGate = (p: Proposal) => GateCheck | null;
interface GateCheck { gate: GateResult; change?: string; forceReject?: string }

/**
 * A round with one more code gate. The verdict is recomputed in code from the same scores; a failed
 * gate's change leads the required changes and becomes the top concern; `forceReject` (a failure
 * that already had its revision) makes the round a REJECT.
 */
function withGate(r: JudgmentRound, x: GateCheck): JudgmentRound {
  const gates = [...r.gates.filter(g => g.gate !== x.gate.gate), x.gate];
  const v = verdictOf(gates, r.scores, r.round);
  const out: JudgmentRound = { ...r, gates, verdict: v.verdict, reasons: v.reasons };
  if (!x.gate.pass && x.change) {
    out.requiredChanges = [x.change, ...r.requiredChanges.filter(c => c !== x.change)];
    out.topConcern = x.change;
  }
  if (!x.gate.pass && x.forceReject) {
    out.verdict = "REJECT";
    out.reasons = [...v.reasons.filter(s => !/^still REVISE after round/.test(s)), x.forceReject];
  }
  return out;
}

/**
 * The revision loop, from the last round of `j`: while it is REVISE, revise() with the required
 * changes and top concern (never the scores) and judge the new version blind. Stops on SHIP / REJECT,
 * after round maxRounds (verdictOf rejects a REVISE there), or when a revision stalls. `fresh` skips
 * the stall check for the first revision (a new failure, e.g. the portfolio gate, deserves one).
 */
async function reviseLoop(c: StageCtx, m: ProductModel, j: ProposalJudgment, dig: string, extra?: ExtraGate, fresh = false): Promise<void> {
  for (let first = true; ; first = false) {
    const r = j.rounds[j.rounds.length - 1];
    if (r.verdict !== "REVISE") break;
    const prev = j.rounds[j.rounds.length - 2];
    if (prev && !(fresh && first) && stalled(prev, r)) {
      trace("stop", { proposal: r.proposalId, reason: `revision stalled: weighted ${prev.weighted} -> ${r.weighted}` });
      break;
    }
    const p = j.versions[j.versions.length - 1];
    // "existing" without an observed anchor is relabelled before revision (FINAL_PLAN §9.1).
    const relabel = p.case === "existing" && r.gates.some(g => g.gate === "label" && !g.pass);
    const next = lockCost(p, await revise(c, m, relabel ? { ...p, case: "product-change" } : p, r.requiredChanges, r.topConcern, r.round + 1));
    j.versions.push(next);
    let r2 = await judgeOnce(m, next, r.round + 1, dig, `judge:${next.id}:v${next.version}`);
    const x = extra?.(next);
    if (x) r2 = withGate(r2, x);
    j.rounds.push(r2);
    trace("judge", { proposal: next.id, version: next.version, round: r2.round, verdict: r2.verdict, weighted: r2.weighted, judgedBy: r2.judgedBy, failed: r2.gates.filter(g => !g.pass).map(g => g.gate) });
  }
  j.final = j.versions[j.versions.length - 1];
  const f = finalVerdict(j.rounds);
  j.verdict = f.verdict;
  j.note = f.note;
}

async function judgeProposal(c: StageCtx, m: ProductModel, p0: Proposal, dig: string): Promise<ProposalJudgment> {
  const r = await judgeOnce(m, p0, 0, dig, `judge:${p0.id}:v${p0.version}`);
  trace("judge", { proposal: p0.id, version: p0.version, round: 0, verdict: r.verdict, weighted: r.weighted, judgedBy: r.judgedBy, failed: r.gates.filter(g => !g.pass).map(g => g.gate) });
  const j: ProposalJudgment = { rounds: [r], versions: [p0], final: p0, verdict: r.verdict, note: "" };
  await reviseLoop(c, m, j, dig);
  return j;
}

/**
 * Portfolio check, after every proposal is judged: SHIPs claim their place best score first; a SHIP
 * that near-duplicates one already kept fails the "portfolio-distinct" code gate in its last round
 * (so it becomes a REVISE like any other), gets the ordinary revision loop, and is rejected if it is
 * still a duplicate after that revision. Every kept SHIP records the gate as passed.
 */
async function portfolioCheck(c: StageCtx, m: ProductModel, results: ProposalJudgment[], dig: string): Promise<void> {
  const ships = portfolioOrder(results.filter(r => r.verdict === "SHIP").map(r => ({ id: r.final.id, weighted: r.rounds[r.rounds.length - 1].weighted, r })));
  const kept: ProposalJudgment[] = [];
  const keptProposals = () => kept.map(k => k.final);
  for (const { r: res } of ships) {
    const last = res.rounds.length - 1;
    const check = portfolioGate(res.final, keptProposals());
    res.rounds[last] = withGate(res.rounds[last], { gate: check.gate, change: check.keeper ? duplicateChange(check.keeper) : undefined });
    if (check.gate.pass) { kept.push(res); continue; }
    trace("decision", { what: "portfolio duplicate", proposal: res.final.id, keeper: check.keeper, verdict: res.rounds[last].verdict, evidence: check.gate.evidence });
    await reviseLoop(c, m, res, dig, p => {
      const again = portfolioGate(p, keptProposals());
      if (again.gate.pass) return { gate: again.gate };
      return { gate: again.gate, change: duplicateChange(again.keeper!), forceReject: `still a near-duplicate of ${again.keeper} after its revision` };
    }, true);
    // A loop that could not run (no revision rounds left) ends as REJECT like any REVISE.
    if (res.verdict === "SHIP") kept.push(res);
  }
}

/**
 * A revision may change the reward, but not relabel what it costs to serve: the cost class and units per
 * view never get cheaper than the previous version said for the same reward kind. (Otherwise the reviser
 * could pass the economics gate by calling an agentic task "text-cheap".)
 */
export function lockCost(prev: Proposal, next: Proposal): Proposal {
  const rate = (k: string) => ECON.cogsPerUnitUsd[k] ?? 0;
  const a = prev.assumptions, b = next.assumptions;
  if (!a || !b) return next;
  const sameKind = (prev.reward.resource ?? "") === (next.reward.resource ?? "") && !!prev.reward.duration === !!next.reward.duration;
  if (!sameKind) return next;
  const cogs = rate(b.cogs) < rate(a.cogs) ? a.cogs : b.cogs;
  const smaller = (next.reward.amount ?? 1) < (prev.reward.amount ?? 1);
  const units = smaller ? b.cogsUnitsPerView : Math.max(a.cogsUnitsPerView, b.cogsUnitsPerView);
  if (cogs === b.cogs && units === b.cogsUnitsPerView) return next;
  trace("decision", { what: "cost locked across revision", proposal: next.id, from: `${b.cogs}x${b.cogsUnitsPerView}`, to: `${cogs}x${units}` });
  return { ...next, assumptions: { ...b, cogs, cogsUnitsPerView: units }, economics: undefined };
}

function summary(j: ProposalJudgment): string {
  const last = j.rounds[j.rounds.length - 1];
  const revs = j.versions.length - 1;
  const after = revs ? ` after ${revs} revision${revs > 1 ? "s" : ""}` : "";
  if (j.verdict === "SHIP") return `SHIP at ${last.weighted} (v${j.final.version}${after}).`;
  const dup = last.gates.find(g => g.gate === PORTFOLIO.gate && !g.pass);
  const d = dup && parseDuplicate(dup.evidence);
  if (d) return `REJECT${after}: still a near-duplicate of ${d.keeper}, which scored higher and ships; ${d.why}.`;
  if (last.judgedBy === "code-only") return `REJECT by code gate${after}: ${last.reasons[0] ?? ""}.`;
  const gate = last.gates.find(g => !g.pass);
  const concern = gate ? `${gate.gate} (${gate.by}): ${gate.evidence}` : last.topConcern;
  return `REJECT${after}: ${j.note || last.reasons.join("; ")}. Top concern: ${concern}`;
}

export async function judgeAll(c: StageCtx, m: ProductModel, cands: Candidates): Promise<Judgments> {
  const dig = digest(m);
  const results = await Promise.all(cands.proposals.map(p => judgeProposal(c, m, p, dig)));
  await portfolioCheck(c, m, results, dig);
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
