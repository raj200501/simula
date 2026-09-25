// The ONLY module that calls Claude. Every call is:
//   - schema-bound when it returns data (structured outputs via betaZodOutputFormat -> parsed_output),
//   - cached on disk (cache/llm/<stage>/...) so runs are reproducible and replayable without a key,
//   - costed into out/<app>/cost.jsonl and traced,
//   - budget-checked before it is made.
//
// Modes (--llm / SIMULA_LLM):
//   record (default)  cache hit -> return it; miss -> call live and write the cache
//   replay            cache hit -> return it; miss -> throw ReplayMiss (no key needed)
//   stub              never call the API: return req.stub() (deterministic fallback). Used by `npm run demo` + tests
//   live              always call, then overwrite the cache
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { ROOT, BUDGET_USD, MODELS } from "./config.ts";
import { canonical, ensureDir, nowIso, sha256 } from "./io.ts";
import { trace } from "./trace.ts";

export type LlmMode = "record" | "replay" | "stub" | "live";
export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export interface Img {
  /** File path (preferred: its bytes are hashed for the cache key) or raw bytes. */
  path?: string;
  data?: Buffer;
  mediaType: "image/png" | "image/jpeg";
  /** Short caption placed before the image in the prompt. */
  label?: string;
}

export interface LlmReq<T> {
  stage: string;
  purpose: string;               // e.g. "annotate:s07", "screen-html:s03", "qa-fix:s03:r2"
  model?: string;                // default MODELS.main
  effort?: Effort;               // default "high"
  system: string[];              // stable blocks first (KB, rules) - cached with cache_control
  prompt: string;                // volatile user text
  images?: Img[];
  schema?: z.ZodType<T>;         // present => json() ; absent => text()
  maxTokens?: number;
  /** Stable cache-key parts that replace the default key (T4: derived images differ across machines). */
  cacheKey?: Record<string, unknown>;
  /** Deterministic fallback used in stub mode (and when the caller wants a no-LLM path). */
  stub?: () => T | Promise<T>;
}

export class ReplayMiss extends Error {}
export class BudgetExceeded extends Error {}
export class RefusalError extends Error {}
export class StubMissing extends Error {}

interface Ctx { mode: LlmMode; app: string; costFile: string | null; stageCaps: Record<string, number> }
const ctx: Ctx = { mode: (process.env.SIMULA_LLM as LlmMode) || "record", app: "-", costFile: null, stageCaps: {} };
const spent = { total: 0, byStage: new Map<string, number>() };
const stats = { calls: 0, cached: 0, usd: 0 };

export function setLlmContext(c: Partial<Ctx>): void {
  Object.assign(ctx, c);
  // include spend already recorded for this app so the global cap spans processes
  if (c.costFile && fs.existsSync(c.costFile)) {
    spent.total = 0; spent.byStage.clear();
    for (const l of fs.readFileSync(c.costFile, "utf8").split("\n").filter(Boolean)) {
      const r = JSON.parse(l);
      if (!r.cached) { spent.total += r.usd; spent.byStage.set(r.stage, (spent.byStage.get(r.stage) ?? 0) + r.usd); }
    }
  }
}
export function llmMode(): LlmMode { return ctx.mode; }
export function llmStats() { return { ...stats, mode: ctx.mode }; }
export function resetLlmStats() { stats.calls = 0; stats.cached = 0; stats.usd = 0; }

// $ per million tokens: input, output, cache read, cache write (5 min)
const PRICES: Record<string, [number, number, number, number]> = {
  "claude-opus-5": [5, 25, 0.5, 6.25],
  "claude-opus-5-5": [4, 20, 0.2, 5],
  "claude-sonnet-5": [2, 10, 0.2, 2.5],
  "claude-haiku-4-5": [1, 5, 0.1, 1.25],
  "claude-fable-5-1": [10, 50, 0.25, 12.5],
};
function price(model: string, u: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null }): number {
  const p = PRICES[model] ?? PRICES["claude-opus-5"];
  return (u.input_tokens * p[0] + u.output_tokens * p[1] + (u.cache_read_input_tokens ?? 0) * p[2] + (u.cache_creation_input_tokens ?? 0) * p[3]) / 1e6;
}

let client: Anthropic | null = null;
function api(): Anthropic {
  if (!client) client = new Anthropic({ maxRetries: 3, timeout: 15 * 60_000 });
  return client;
}

function imgBytes(i: Img): Buffer {
  if (i.data) return i.data;
  if (i.path) return fs.readFileSync(i.path);
  throw new Error("Img needs path or data");
}

function keyFor<T>(req: LlmReq<T>, model: string, effort: Effort): string {
  const base = req.cacheKey
    ? { model, effort, purpose: req.purpose, k: req.cacheKey, schema: req.schema ? "json" : "text" }
    : {
        model, effort, system: req.system, prompt: req.prompt,
        images: (req.images ?? []).map(i => ({ l: i.label ?? "", h: sha256(imgBytes(i)) })),
        schema: req.schema ? sha256(JSON.stringify(betaZodOutputFormat(req.schema as never))) : "text",
      };
  return sha256(canonical(base)).slice(0, 24);
}

function cachePath(stage: string, purpose: string, key: string): string {
  const safe = purpose.replace(/[^a-zA-Z0-9_.-]+/g, "_").slice(0, 60);
  return path.join(ROOT, "cache", "llm", stage, `${safe}__${key}.json`);
}

function ledger(row: Record<string, unknown>): void {
  if (!ctx.costFile) return;
  ensureDir(path.dirname(ctx.costFile));
  fs.appendFileSync(ctx.costFile, JSON.stringify(row) + "\n");
}

function checkBudget(stage: string): void {
  if (spent.total >= BUDGET_USD) {
    trace("budget", { kind: "global", used: spent.total, cap: BUDGET_USD });
    throw new BudgetExceeded(`Global LLM budget reached: $${spent.total.toFixed(2)} >= $${BUDGET_USD}`);
  }
  const cap = ctx.stageCaps[stage];
  const used = spent.byStage.get(stage) ?? 0;
  if (cap !== undefined && used >= cap) {
    trace("budget", { kind: "stage", stage, used, cap });
    throw new BudgetExceeded(`Stage ${stage} budget reached: $${used.toFixed(2)} >= $${cap}`);
  }
}

function content(req: LlmReq<unknown>): Anthropic.Beta.BetaContentBlockParam[] {
  const blocks: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const i of req.images ?? []) {
    if (i.label) blocks.push({ type: "text", text: i.label });
    blocks.push({ type: "image", source: { type: "base64", media_type: i.mediaType, data: imgBytes(i).toString("base64") } });
  }
  blocks.push({ type: "text", text: req.prompt });
  return blocks;
}

function systemBlocks(sys: string[]): Anthropic.Beta.BetaTextBlockParam[] {
  // cache_control on the last stable block caches the whole system prefix
  return sys.map((text, i) => (i === sys.length - 1 ? { type: "text" as const, text, cache_control: { type: "ephemeral" as const } } : { type: "text" as const, text }));
}

interface CacheEntry { purpose: string; model: string; effort: string; parsed?: unknown; text?: string; usage?: unknown; stop?: string | null; ts: string }

async function run<T>(req: LlmReq<T>): Promise<{ value: T | string; cached: boolean }> {
  const model = req.model ?? MODELS.main;
  const effort = req.effort ?? "high";
  if (ctx.mode === "stub") {
    if (!req.stub) throw new StubMissing(`No stub for ${req.stage}/${req.purpose}`);
    const v = await req.stub();
    trace("llm_call", { purpose: req.purpose, mode: "stub", cached: false, usd: 0 });
    stats.calls++;
    return { value: v, cached: false };
  }
  const key = keyFor(req, model, effort);
  const file = cachePath(req.stage, req.purpose, key);
  if (ctx.mode !== "live" && fs.existsSync(file)) {
    const e = JSON.parse(fs.readFileSync(file, "utf8")) as CacheEntry;
    stats.calls++; stats.cached++;
    ledger({ ts: nowIso(), app: ctx.app, stage: req.stage, purpose: req.purpose, model, effort, usd: 0, cached: true, key });
    trace("llm_call", { purpose: req.purpose, key, cached: true, usd: 0 });
    const v = req.schema ? req.schema.parse(e.parsed) : (e.text ?? "");
    return { value: v as T | string, cached: true };
  }
  if (ctx.mode === "replay") throw new ReplayMiss(`No cached response for ${req.stage}/${req.purpose} (key ${key}). Run with --llm record and an API key.`);
  checkBudget(req.stage);

  const t0 = Date.now();
  const params = {
    model,
    max_tokens: req.maxTokens ?? (req.schema ? 16000 : 32000),
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default" as const,
    system: systemBlocks(req.system),
    messages: [{ role: "user" as const, content: content(req as LlmReq<unknown>) }],
  };
  let parsed: unknown; let text = ""; let usage: Anthropic.Beta.BetaUsage; let stop: string | null;
  if (req.schema) {
    let maxTokens = params.max_tokens;
    for (let attempt = 0; ; attempt++) {
      const msg = await api().beta.messages.parse({ ...params, max_tokens: maxTokens, output_config: { effort, format: betaZodOutputFormat(req.schema as never) } });
      usage = msg.usage; stop = msg.stop_reason;
      if (stop === "refusal") { record(req, model, effort, usage, t0, key, stop); throw new RefusalError(`${req.purpose}: refused (${msg.stop_details?.category ?? "?"})`); }
      parsed = msg.parsed_output;
      if (parsed != null) break;
      record(req, model, effort, usage, t0, key, stop);
      if (attempt >= 1) throw new Error(`${req.purpose}: no parseable output after retry (stop=${stop})`);
      maxTokens *= 2;
      trace("failure", { where: `llm:${req.purpose}`, error: `unparseable output (stop=${stop}); retrying with max_tokens=${maxTokens}` });
    }
  } else {
    const stream = api().beta.messages.stream({ ...params, output_config: { effort } });
    const msg = await stream.finalMessage();
    usage = msg.usage; stop = msg.stop_reason;
    if (stop === "refusal") { record(req, model, effort, usage, t0, key, stop); throw new RefusalError(`${req.purpose}: refused`); }
    text = msg.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map(b => b.text).join("");
  }
  const usd = record(req, model, effort, usage!, t0, key, stop!);
  const entry: CacheEntry = { purpose: req.purpose, model, effort, parsed, text: req.schema ? undefined : text, usage: usage!, stop: stop!, ts: nowIso() };
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(entry, null, 1));
  void usd;
  return { value: (req.schema ? parsed : text) as T | string, cached: false };
}

function record(req: LlmReq<unknown>, model: string, effort: string, u: Anthropic.Beta.BetaUsage, t0: number, key: string, stop: string | null): number {
  const usd = price(model, u);
  spent.total += usd;
  spent.byStage.set(req.stage, (spent.byStage.get(req.stage) ?? 0) + usd);
  stats.calls++; stats.usd += usd;
  ledger({ ts: nowIso(), app: ctx.app, stage: req.stage, purpose: req.purpose, model, effort, in: u.input_tokens, out: u.output_tokens,
    cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0, usd: Number(usd.toFixed(5)), ms: Date.now() - t0, key, cached: false, stop });
  trace("llm_call", { purpose: req.purpose, key, cached: false, usd: Number(usd.toFixed(4)), stop });
  return usd;
}

/** Structured call: returns the schema-validated object. */
export async function json<T>(req: LlmReq<T> & { schema: z.ZodType<T> }): Promise<T> {
  return (await run(req)).value as T;
}

/** Free-text call (streamed): used for HTML/CSS generation. */
export async function text(req: Omit<LlmReq<string>, "schema">): Promise<string> {
  return (await run(req as LlmReq<string>)).value as string;
}

/** Extract the first ```lang fenced block (or the whole text if none). */
export function fenced(s: string, lang = "html"): string {
  const m = new RegExp("```" + lang + "\\s*\\n([\\s\\S]*?)```", "i").exec(s) ?? /```\w*\s*\n([\s\S]*?)```/.exec(s);
  return (m ? m[1] : s).trim();
}

export function totalSpent(): number { return spent.total; }
