// The verdict is computed in code, never by the model (FINAL_PLAN §9.2). PURE: no I/O, no clock.
//   SHIP    weighted >= 3.8, every criterion >= 3, every gate passes
//   REVISE  3.0 <= weighted < 3.8, or any criterion <= 2, or a fixable gate failure
//   REJECT  weighted < 3.0, or a policy gate failure, or still REVISE after round 2
// Rounds are 0-based: round 0 judges the original, rounds 1 and 2 judge revisions.
import type { Criterion, GateResult, JudgmentRound, Verdict } from "../core/schema.ts";

// [JUDGE-2] weights, except specificity raised 5 -> 10 and frequency lowered 10 -> 5: generic
// proposals are the most common failure of this kind of system (FINAL_PLAN §9.2).
export const WEIGHTS: { criterion: Criterion; weight: number }[] = [
  { criterion: "value-moment-fit", weight: 20 },
  { criterion: "product-integrity", weight: 15 },
  { criterion: "cannibalization-safety", weight: 15 },
  { criterion: "unit-economics", weight: 10 },
  { criterion: "reach", weight: 10 },
  { criterion: "feasibility", weight: 10 },
  { criterion: "specificity", weight: 10 },
  { criterion: "frequency-fatigue", weight: 5 },
  { criterion: "measurability", weight: 5 },
];

export const THRESHOLDS = {
  ship: 3.8,
  revise: 3.0,
  minCriterion: 3,     // SHIP needs every criterion >= 3; <= 2 forces REVISE
  maxRounds: 2,        // revision rounds; a REVISE at round 2 becomes REJECT
  minImprovement: 0.2, // a revision that improves the weighted score by less than this stops the loop
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function weightedScore(scores: { criterion: Criterion; score: number }[]): number | null {
  let num = 0, den = 0;
  for (const w of WEIGHTS) {
    const s = scores.find(x => x.criterion === w.criterion);
    if (s) { num += w.weight * s.score; den += w.weight; }
  }
  return den ? r2(num / den) : null;
}

export function verdictOf(gates: GateResult[], scores: { criterion: Criterion; score: number }[], round: number): { verdict: Verdict; weighted: number | null; reasons: string[] } {
  const weighted = weightedScore(scores);
  const reasons: string[] = [];
  const failed = gates.filter(g => !g.pass);
  const policy = failed.filter(g => g.severity === "policy");
  const fixable = failed.filter(g => g.severity === "fixable");
  const missing = WEIGHTS.filter(w => !scores.some(s => s.criterion === w.criterion)).map(w => w.criterion);
  const low = scores.filter(s => s.score < THRESHOLDS.minCriterion);

  for (const g of policy) reasons.push(`policy gate failed: ${g.gate} (${g.by})`);
  if (policy.length) return { verdict: "REJECT", weighted, reasons };

  if (weighted !== null && weighted < THRESHOLDS.revise) {
    reasons.push(`weighted ${weighted} < ${THRESHOLDS.revise}`);
    return { verdict: "REJECT", weighted, reasons };
  }
  if (weighted !== null && weighted >= THRESHOLDS.ship && !low.length && !missing.length && !fixable.length) {
    reasons.push(`weighted ${weighted} >= ${THRESHOLDS.ship}, every criterion >= ${THRESHOLDS.minCriterion}, all gates pass`);
    return { verdict: "SHIP", weighted, reasons };
  }

  for (const g of fixable) reasons.push(`fixable gate failed: ${g.gate} (${g.by})`);
  for (const s of low) reasons.push(`${s.criterion} scored ${s.score} (< ${THRESHOLDS.minCriterion})`);
  if (missing.length) reasons.push(`not scored: ${missing.join(", ")}`);
  if (weighted === null) reasons.push("no rubric scores");
  else if (weighted < THRESHOLDS.ship) reasons.push(`weighted ${weighted} < ${THRESHOLDS.ship}`);
  if (round >= THRESHOLDS.maxRounds) {
    reasons.push(`still REVISE after round ${THRESHOLDS.maxRounds}`);
    return { verdict: "REJECT", weighted, reasons };
  }
  return { verdict: "REVISE", weighted, reasons };
}

type RoundLike = Pick<JudgmentRound, "verdict" | "weighted" | "gates">;
const failedGates = (r: RoundLike) => r.gates.filter(g => !g.pass).length;

/**
 * Stop revising when a revision neither raised the weighted score by minImprovement nor removed a
 * failing gate. (A revision that fixes a gate at an unchanged score is progress, so it continues.)
 */
export function stalled(prev: RoundLike, cur: RoundLike): boolean {
  if (cur.verdict !== "REVISE") return false;
  const gain = prev.weighted !== null && cur.weighted !== null ? cur.weighted - prev.weighted : 0;
  return gain < THRESHOLDS.minImprovement && failedGates(cur) >= failedGates(prev);
}

/** The outcome of a proposal's rounds: a loop that ends while still REVISE is a REJECT (REVISE is never promoted). */
export function finalVerdict(rounds: RoundLike[]): { verdict: Verdict; note: string } {
  const last = rounds[rounds.length - 1];
  if (!last) return { verdict: "REJECT", note: "not judged" };
  if (last.verdict !== "REVISE") return { verdict: last.verdict, note: "" };
  const prev = rounds[rounds.length - 2];
  const gain = prev && prev.weighted !== null && last.weighted !== null ? r2(last.weighted - prev.weighted) : null;
  return { verdict: "REJECT", note: `revision stalled${gain !== null ? ` (weighted ${gain >= 0 ? "+" : ""}${gain}, below +${THRESHOLDS.minImprovement})` : ""} with the same gate failures` };
}
