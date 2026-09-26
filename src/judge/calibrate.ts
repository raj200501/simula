// How we know the judge is any good (BUILD_SPEC D6/T9/T13): a single-fault confusion table.
//   - positives adapted from KB precedents (consumable: [EX-SERIAL], [EX-MUSIC], [EX-DUO], [TAX-10],
//     [TAX-9]; entitlement: sample, decline, tasks), written as Proposals grounded in THIS model's ids
//     (eval/judge-cal/positives.json); only those the model's economy supports are built;
//   - negatives, each changing exactly ONE field of an available positive (eval/judge-cal/negatives.json);
//   - every item is judged once (code gates + one judge call, no revision, no Batch API);
//   - the table says whether each negative was caught by code, by the judge, or by both.
// n is tiny: this is a smoke test of what each layer catches, not a statistical claim.
// This is the judge's eval harness, not a pipeline stage: it is the only judge code that reads eval/.
import fs from "node:fs";
import path from "node:path";
import { Proposal, type JudgmentRound, type ProductModel } from "../core/schema.ts";
import { ROOT, MODELS } from "../core/config.ts";
import { writeText } from "../core/io.ts";
import { servedModels } from "../core/llm.ts";
import { trace } from "../core/trace.ts";
import type { StageCtx } from "../core/run.ts";
import { digest } from "../model/digest.ts";
import { elText, resolveAnchors } from "../propose/anchors.ts";
import { sampleSize, useNoun, usesPhrase } from "../propose/stub.ts";
import { judgeOnce } from "./judge.ts";
import { THRESHOLDS, WEIGHTS } from "./verdict.ts";

export const CAL_DIR = path.join(ROOT, "eval", "judge-cal");

interface PositiveT { id: string; precedent: string; pattern: string; requires: string[]; proposal: unknown }
// A negative lists the positives it can be built from, in preference order (consumable-economy
// positives first, entitlement ones second); `alt` rephrases the fault for a given base when needed.
interface NegativeT {
  id: string; base: string | string[]; field: string; value: unknown; fault: string; expect: "code" | "judge"; expectWhat: string;
  alt?: Record<string, { field?: string; value?: unknown; fault?: string; expect?: "code" | "judge"; expectWhat?: string }>;
}
export interface CalItem { id: string; kind: "positive" | "negative"; base?: string; field?: string; label: string; expect: "SHIP" | "code" | "judge"; expectWhat: string; proposal: Proposal }

/** Placeholder values resolved from the model's anchors. Undefined keys drop optional fields. */
export function calibrationDict(m: ProductModel): Record<string, unknown> {
  const a = resolveAnchors(m);
  const d: Record<string, unknown> = {};
  const put = (k: string, v: unknown) => { if (v !== undefined && v !== null && v !== "") d[k] = v; };
  const res = m.economy.resources.find(r => r.id === a.res?.id);
  put("res.id", a.res?.id); put("res.name", a.res?.name); put("res.unit", a.res?.unit); put("res.evidence", res?.evidence.slice(0, 2));
  put("reward.amount", a.sized?.amount); put("reward.buys", a.sized?.buys); put("reward.cogs", a.sized?.cogs ?? "none"); put("reward.cogsUnits", a.sized?.cogsUnits ?? 0);
  put("session.cogsUnits", a.sized ? 2 : 0); // the session is "up to 2" of the cheapest action, whatever the sized reward
  put("cheap.id", a.cheapSink?.id); put("cheap.label", a.cheapSink?.context ?? a.cheapSink?.action);
  const off = a.cheapestOffer;
  put("offer.cheapest", off ? `${off.label} for ${off.priceText}` : "the cheapest pack"); put("offer.cheapestAmount", off?.grants.amount);
  // Fallbacks keep the templates usable when a model lacks a moment type: use the nearest offer-allowed moment.
  const w = a.wall;
  const wallMoment = w?.moment ?? a.decline?.moment ?? a.desire?.moment;
  const wallScreen = w?.screen ?? a.decline?.screen ?? a.desire?.screen;
  put("wall.moment", wallMoment?.id); put("wall.screen", wallScreen?.id); put("wall.screenName", wallScreen?.name);
  put("wall.from", (w?.from ?? wallScreen)?.id); put("wall.intent", w?.blockedIntent ?? "the next action"); put("wall.upsellEl", w?.upsellEl?.id);
  put("wall.item", w?.item?.id); put("wall.evidence", wallMoment?.evidence.slice(0, 2) ?? []);
  const dec = a.decline;
  const decTo = dec?.to ?? dec?.screen;
  put("decline.moment", dec?.moment.id); put("decline.screen", dec?.screen.id); put("decline.screenName", dec?.screen.name);
  put("decline.label", elText(dec?.declineEl) || "Not now"); put("decline.to", decTo?.id); put("decline.toName", decTo?.name);
  put("decline.toInputEl", decTo && a.chat && decTo.id === a.chat.screen.id ? a.chat.inputEl?.id : undefined);
  const hub = a.hub;
  put("hub.moment", hub?.moment.id); put("hub.screen", hub?.screen.id); put("hub.screenName", hub?.screen.name); put("hub.balanceEl", (hub?.balanceEl ?? hub?.anchorEl)?.id);
  const des = a.desire;
  put("desire.moment", des?.moment.id); put("desire.screen", des?.screen.id); put("desire.screenName", des?.screen.name); put("desire.modeEl", des?.modeEl?.id);
  put("desire.modeLabel", des?.modeEl ? `the "${elText(des.modeEl)}" chip` : "the mode selector"); put("desire.evidence", des?.moment.evidence.slice(0, 2) ?? []);
  const amt = a.sized?.amount ?? 0;
  const low = Math.max(0, (w?.blockedCost ?? amt) - amt);
  put("balance.low", low); put("balance.after", low + amt); put("balance.threshold", a.premiumSink?.amount ?? w?.blockedCost ?? amt * 3);
  let n = 99;
  while (m.screens.some(s => s.id === `s${n}`)) n--;
  put("missing.screen", `s${n}`);

  // Entitlement apps: a plan feature behind a paywall or sign-up wall, sampled (never "+1 tier").
  const g = a.gated.find(x => x.perUse) ?? a.gated[0];
  if (g) {
    const size = sampleSize(m, g.cogs);
    const noun = useNoun(g);
    const words = ["zero", "one", "two", "three"];
    const phrase = (k: number) => (g.perUse ? usesPhrase(g.feature, noun, k) : `${g.cogs === "none" ? 30 : 10} minutes of ${g.feature}`);
    const units = (k: number) => (g.cogs === "none" ? 0 : Math.round(((g.perUse ? k : 1) / size.views) * 100) / 100);
    const to = g.decline?.to ?? (g.decline ? g.useScreen : undefined);
    put("gated.feature", g.feature); put("gated.plan", g.plan ?? "the paid plan"); put("gated.resource", g.resource?.id); put("gated.unit", g.resource?.unit);
    put("gated.moment", g.moment.id); put("gated.item", g.item?.id); put("gated.evidence", g.moment.evidence.slice(0, 2));
    put("gated.useMoment", g.useMoment.id); put("gated.useScreen", (g.signup ? g.useScreen : g.screen)?.id); put("gated.useScreenName", (g.signup ? g.useScreen : g.screen)?.name);
    put("gated.useEl", g.useEl && (g.signup ? g.useScreen : g.screen)?.elements.some(e => e.id === g.useEl!.id) ? g.useEl.id : undefined);
    put("gated.sample", phrase(size.uses)); put("gated.sampleOne", phrase(1)); put("gated.cogs", g.cogs);
    put("gated.units", units(size.uses)); put("gated.unitsOne", units(1)); put("gated.unitsTask", g.cogs === "none" ? 0 : 0.33);
    put("gated.games", size.views === 1 ? "a 15-second game" : `${words[size.views]} 15-second games`); put("gated.views", size.views);
    put("gated.eligibility", g.signup ? "Signed-in non-subscribers from their second session on; guests keep seeing the account sheet first; never subscribers."
      : "Non-payers only, returning users from their second session on; never shown to subscribers.");
    if (g.decline && to) {
      put("gated.declineMoment", g.decline.moment.id); put("gated.declineScreen", g.screen.id); put("gated.declineScreenName", g.screen.name);
      put("gated.declineTo", to.id); put("gated.declineToName", to.name); put("gated.declineLabel", elText(g.decline.el) || "Not now");
      put("gated.declineCase", g.signup ? "product-change" : "existing");
      put("gated.declineMechanic", g.signup ? { name: `Guest sample of ${g.feature}`, description: `${phrase(1)} for guests who dismiss ${g.screen.name}, once a day.`,
        whyNeeded: `Guests meet ${g.screen.name} before they can feel ${g.feature}; one sample shows its value without replacing sign-up.`, removesFreeValue: false } : undefined);
      put("gated.declineEligibility", g.signup ? "Guests who just declined the account sheet (never payers or subscribers), from their second session on, once a day."
        : `Only non-payers who just declined ${g.plan ?? "the paid plan"}, from their second session on; never subscribers.`);
    }
  }
  const acct = a.accountWalls[0];
  put("account.feature", acct ? m.economy.walls.find(w => w.shows === acct.screen)?.blockedIntent : undefined);
  return d;
}

/** Resolve {{key}} placeholders: an exact placeholder keeps the raw value (number, array); embedded ones interpolate. */
export function resolvePlaceholders(v: unknown, dict: Record<string, unknown>, missing: Set<string>): unknown {
  if (typeof v === "string") {
    const exact = /^\{\{([\w.]+)\}\}$/.exec(v);
    if (exact) { if (!(exact[1] in dict)) missing.add(exact[1]); return dict[exact[1]]; }
    return v.replace(/\{\{([\w.]+)\}\}/g, (_, k: string) => { if (!(k in dict)) { missing.add(k); return ""; } return String(dict[k]); });
  }
  if (Array.isArray(v)) return v.map(x => resolvePlaceholders(x, dict, missing)).filter(x => x !== undefined);
  if (v && typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) { const r = resolvePlaceholders(x, dict, missing); if (r !== undefined) o[k] = r; }
    return o;
  }
  return v;
}

function setPath(obj: Record<string, unknown>, dotted: string, value: unknown): void {
  const keys = dotted.split(".");
  let cur = obj;
  for (const k of keys.slice(0, -1)) cur = cur[k] as Record<string, unknown>;
  cur[keys[keys.length - 1]] = value;
}

/** Build the calibration items for this model; items whose anchors are missing are skipped with a reason. */
export function calibrationItems(m: ProductModel, dir = CAL_DIR): { items: CalItem[]; skipped: { id: string; why: string }[] } {
  const pos = JSON.parse(fs.readFileSync(path.join(dir, "positives.json"), "utf8")).items as PositiveT[];
  const neg = JSON.parse(fs.readFileSync(path.join(dir, "negatives.json"), "utf8")).items as NegativeT[];
  const dict = calibrationDict(m);
  const items: CalItem[] = [];
  const skipped: { id: string; why: string }[] = [];
  const base = new Map<string, Record<string, unknown>>();
  for (const t of pos) {
    const lacking = t.requires.filter(k => !(k in dict));
    if (lacking.length) { skipped.push({ id: t.id, why: `model lacks ${lacking.join(", ")}` }); continue; }
    const raw = resolvePlaceholders(t.proposal, dict, new Set()) as Record<string, unknown>;
    const r = Proposal.safeParse(raw);
    if (!r.success) { skipped.push({ id: t.id, why: `template does not resolve to a valid Proposal: ${r.error.issues[0]?.path.join(".")} ${r.error.issues[0]?.message}` }); continue; }
    base.set(t.id, raw);
    items.push({ id: t.id, kind: "positive", label: `${t.precedent}: ${t.pattern}`, expect: "SHIP", expectWhat: "SHIP", proposal: r.data });
  }
  for (const t of neg) {
    const bases = Array.isArray(t.base) ? t.base : [t.base];
    let built: CalItem | undefined;
    const why: string[] = [];
    for (const id of bases) {
      const b = base.get(id);
      if (!b) { why.push(`base ${id} not available`); continue; }
      const o = t.alt?.[id] ?? {};
      const field = o.field ?? t.field;
      const raw = structuredClone(b);
      const missing = new Set<string>();
      setPath(raw, field, resolvePlaceholders(o.value !== undefined ? o.value : t.value, dict, missing));
      raw.id = t.id;
      if (missing.size) { why.push(`${id}: model lacks ${[...missing].join(", ")}`); continue; }
      // A single-fault negative may break the schema on purpose; codeGates reports that as the schema gate.
      built = { id: t.id, kind: "negative", base: id, field, label: o.fault ?? t.fault, expect: o.expect ?? t.expect, expectWhat: o.expectWhat ?? t.expectWhat, proposal: raw as unknown as Proposal };
      break;
    }
    if (built) items.push(built);
    else skipped.push({ id: t.id, why: why.join("; ") || "no base" });
  }
  return { items, skipped };
}

// ------------------------------------------------------------------------------------------------
// Scoring the table
// ------------------------------------------------------------------------------------------------
export interface CalRow { item: CalItem; round: JudgmentRound; code: boolean; judge: boolean; caught: boolean; lowest: string }

export function scoreRow(item: CalItem, r: JudgmentRound): CalRow {
  const code = r.gates.some(g => !g.pass && g.by === "code");
  const judge = r.gates.some(g => !g.pass && g.by === "llm")
    || (r.scores.length > 0 && ((r.weighted ?? 0) < THRESHOLDS.ship || r.scores.some(s => s.score < THRESHOLDS.minCriterion)));
  const weight = new Map(WEIGHTS.map(w => [w.criterion, w.weight]));
  const low = [...r.scores].sort((a, b) => a.score - b.score || (weight.get(b.criterion) ?? 0) - (weight.get(a.criterion) ?? 0))[0];
  return { item, round: r, code, judge, caught: r.verdict !== "SHIP", lowest: low ? `${low.criterion} ${low.score}` : "—" };
}

const cell = (s: unknown) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");

export function judgeEvalMd(m: ProductModel, rows: CalRow[], skipped: { id: string; why: string }[]): string {
  const by = new Set(rows.map(r => r.round.judgedBy));
  const judgeName = by.has("llm") ? `LLM judge (${servedModels().join(", ") || MODELS.main})` : "judge (stub heuristic, no LLM)";
  const layer = (row: CalRow) => {
    if (!row.caught) return "**missed**";
    const j = row.round.judgedBy === "code-only" ? false : row.judge;
    return row.code && j ? "code + judge" : row.code ? "code" : j ? "judge" : "verdict only";
  };
  const L: string[] = [];
  L.push(`# Judge calibration: ${m.app.name}`, "");
  if (by.has("stub")) L.push("> **Judged by the deterministic stub heuristic (no LLM).** Re-run with `--llm record` for the LLM judge.", "");
  const nPos = rows.filter(r => r.item.kind === "positive").length;
  L.push(`Single-fault confusion table. ${nPos} positive${nPos === 1 ? "" : "s"} adapted from the KB precedents that fit this app's economy, grounded in its ids; each negative changes exactly one field of a positive. Every item is judged once: code gates, then one ${judgeName} call (skipped when a policy gate already failed). No revision rounds, no Batch API.`, "");
  L.push(rows.length
    ? `n = ${rows.length} items from one run: this shows what each layer catches; it is not a statistical estimate of judge accuracy.`
    : "n = 0: no KB precedent fits this app's economy, so there is no known-good proposal to break here. The list under Counts says what each item needs.", "");

  L.push("## Confusion table", "", "| item | kind | fault (field changed) | expected catch | verdict | weighted | caught by | lowest criterion | failed gates |", "|---|---|---|---|---|---|---|---|---|");
  for (const row of rows) {
    const it = row.item, r = row.round;
    const failed = r.gates.filter(g => !g.pass).map(g => `${g.gate} (${g.by === "llm" ? "judge" : "code"})`).join(", ") || "none";
    const exp = it.kind === "positive" ? "SHIP" : `${it.expect}: ${it.expectWhat}`;
    const verdictCell = it.kind === "positive" ? `${r.verdict}${r.verdict === "SHIP" ? " ✓" : " ✗"}` : `${r.verdict}${row.caught ? " ✓" : " ✗"}`;
    const caughtCell = it.kind === "positive" ? (row.caught ? "false alarm" : "—") : layer(row);
    L.push(`| ${it.id} | ${it.kind} | ${cell(it.kind === "positive" ? it.label : `${it.label} (\`${it.field}\` of ${it.base})`)} | ${cell(exp)} | ${verdictCell} | ${r.weighted ?? "—"} | ${caughtCell} | ${row.lowest} | ${cell(failed)} |`);
  }

  const negs = rows.filter(r => r.item.kind === "negative");
  const pos = rows.filter(r => r.item.kind === "positive");
  const caught = negs.filter(r => r.caught);
  const judgeOn = (r: CalRow) => r.round.judgedBy !== "code-only" && r.judge;
  const codeOnly = caught.filter(r => r.code && !judgeOn(r)).length;
  const judgeOnly = caught.filter(r => !r.code && judgeOn(r)).length;
  const both = caught.filter(r => r.code && judgeOn(r)).length;
  const asExpected = negs.filter(r => r.caught && (r.item.expect === "code" ? r.code : judgeOn(r))).length;
  L.push("", "## Counts", "");
  L.push(`- Negatives caught (verdict is not SHIP): **${caught.length} / ${negs.length}** — code only ${codeOnly}, judge only ${judgeOnly}, both ${both}.`);
  L.push(`- Caught by the layer expected to catch it: ${asExpected} / ${negs.length}.`);
  L.push(`- Negatives that would SHIP: ${negs.length - caught.length}${negs.filter(r => !r.caught).map(r => ` (${r.item.id})`).join("")}.`);
  L.push(`- Positives that SHIP: **${pos.filter(r => !r.caught).length} / ${pos.length}**${pos.filter(r => r.caught).map(r => `; ${r.item.id} got ${r.round.verdict} (${r.round.reasons.slice(0, 2).join("; ")})`).join("")}.`);
  if (skipped.length) L.push(`- Not applicable to this model: ${skipped.map(s => `${s.id} (${s.why})`).join("; ")}.`);
  L.push("", "## Top concern per item", "");
  for (const row of rows) L.push(`- **${row.item.id}** (${row.round.verdict}): ${cell(row.round.topConcern)}`);
  return L.join("\n") + "\n";
}

export async function evalJudge(c: StageCtx, m: ProductModel): Promise<string> {
  const { items, skipped } = calibrationItems(m);
  const dig = digest(m);
  const rounds = await Promise.all(items.map(it => judgeOnce(m, it.proposal, 0, dig, `judge-cal:${it.id}`)));
  const rows = items.map((it, i) => scoreRow(it, rounds[i]));
  const file = path.join(c.paths.proposals, "judge-eval.md");
  writeText(file, judgeEvalMd(m, rows, skipped));
  trace("decision", { what: "judge calibration", rows: rows.map(r => `${r.item.id}:${r.round.verdict}:${r.caught ? "caught" : "passed"}`), skipped });
  return file;
}
