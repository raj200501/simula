// The ONLY module that calls an LLM (Claude, or Gemini with a free Google AI Studio key). Every call is:
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
import { z } from "zod";
import { ApiError, GoogleGenAI, ThinkingLevel, type Content, type GenerateContentConfig, type GenerateContentResponse, type Part } from "@google/genai";
import { ROOT, BUDGET_USD, MODELS, PROVIDER } from "./config.ts";
import { canonical, ensureDir, nowIso, sha256, sleep } from "./io.ts";
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
function anthropic(): Anthropic {
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
  const r = PROVIDER === "gemini" ? await callGemini(req, model, effort) : await callAnthropic(req, model, effort);
  record(req, model, effort, r.usage, t0, key, r.stop);
  const entry: CacheEntry = { purpose: req.purpose, model, effort, parsed: r.parsed, text: req.schema ? undefined : r.text, usage: r.usage, stop: r.stop, ts: nowIso() };
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(entry, null, 1));
  return { value: (req.schema ? r.parsed : r.text) as T | string, cached: false };
}

interface Usage { input: number; output: number; cacheRead: number; cacheWrite: number; thoughts: number }
interface CallResult { parsed?: unknown; text: string; usage: Usage; stop: string | null }

// ------------------------------------------------------------------ Anthropic (Claude)
async function callAnthropic<T>(req: LlmReq<T>, model: string, effort: Effort): Promise<CallResult> {
  const params = {
    model,
    max_tokens: req.maxTokens ?? (req.schema ? 16000 : 32000),
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default" as const,
    system: systemBlocks(req.system),
    messages: [{ role: "user" as const, content: content(req as LlmReq<unknown>) }],
  };
  const u = (x: Anthropic.Beta.BetaUsage): Usage => ({ input: x.input_tokens, output: x.output_tokens, cacheRead: x.cache_read_input_tokens ?? 0, cacheWrite: x.cache_creation_input_tokens ?? 0, thoughts: 0 });
  if (req.schema) {
    let maxTokens = params.max_tokens;
    for (let attempt = 0; ; attempt++) {
      const msg = await anthropic().beta.messages.parse({ ...params, max_tokens: maxTokens, output_config: { effort, format: betaZodOutputFormat(req.schema as never) } });
      if (msg.stop_reason === "refusal") throw new RefusalError(`${req.purpose}: refused (${msg.stop_details?.category ?? "?"})`);
      if (msg.parsed_output != null) return { parsed: msg.parsed_output, text: "", usage: u(msg.usage), stop: msg.stop_reason };
      if (attempt >= 1) throw new Error(`${req.purpose}: no parseable output after retry (stop=${msg.stop_reason})`);
      maxTokens *= 2;
      trace("failure", { where: `llm:${req.purpose}`, error: `unparseable output (stop=${msg.stop_reason}); retrying with max_tokens=${maxTokens}` });
    }
  }
  const msg = await anthropic().beta.messages.stream({ ...params, output_config: { effort } }).finalMessage();
  if (msg.stop_reason === "refusal") throw new RefusalError(`${req.purpose}: refused`);
  const text = msg.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map(b => b.text).join("");
  return { text, usage: u(msg.usage), stop: msg.stop_reason };
}

// ------------------------------------------------------------------ Gemini (Google AI Studio key; free tier works)
let gem: GoogleGenAI | null = null;
function gemini(): GoogleGenAI {
  if (!gem) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set (put it in .env). Or run with --llm stub / --llm replay.");
    gem = new GoogleGenAI({ apiKey });
  }
  return gem;
}

// Free-tier requests are rate limited per model. Space calls out instead of bursting into 429s;
// override with SIMULA_RPM if your key has higher limits.
const nextSlot = new Map<string, number>();
async function pace(model: string): Promise<void> {
  const rpm = Number(process.env.SIMULA_RPM || (/lite/.test(model) ? 14 : 9));
  const gap = 60_000 / Math.max(1, rpm);
  const now = Date.now();
  const at = Math.max(now, nextSlot.get(model) ?? 0);
  nextSlot.set(model, at + gap);
  if (at > now) await sleep(at - now);
}

const THINKING: Record<Effort, ThinkingLevel> = { low: ThinkingLevel.LOW, medium: ThinkingLevel.MEDIUM, high: ThinkingLevel.HIGH, xhigh: ThinkingLevel.HIGH, max: ThinkingLevel.HIGH };
const noThinking = new Set<string>(); // models that rejected thinkingConfig

/** zod -> JSON Schema for Gemini's responseJsonSchema (drop the $schema marker it doesn't need). */
function geminiSchema(schema: z.ZodType<unknown>): unknown {
  const js = z.toJSONSchema(schema, { unrepresentable: "any" }) as Record<string, unknown>;
  delete js.$schema;
  return js;
}

async function callGemini<T>(req: LlmReq<T>, model: string, effort: Effort): Promise<CallResult> {
  const parts: Part[] = [];
  for (const i of req.images ?? []) {
    if (i.label) parts.push({ text: i.label });
    parts.push({ inlineData: { mimeType: i.mediaType, data: imgBytes(i).toString("base64") } });
  }
  parts.push({ text: req.prompt });
  const contents: Content[] = [{ role: "user", parts }];
  const usage: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, thoughts: 0 };
  let maxOut = Math.min(req.maxTokens ?? (req.schema ? 16000 : 32000), 65536);
  let feedback = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const config: GenerateContentConfig = { systemInstruction: req.system.join("\n\n"), maxOutputTokens: maxOut };
    if (!noThinking.has(model)) config.thinkingConfig = { thinkingLevel: THINKING[effort] };
    if (req.schema) { config.responseMimeType = "application/json"; config.responseJsonSchema = geminiSchema(req.schema as z.ZodType<unknown>); }
    const turn: Content[] = feedback ? [...contents, { role: "user", parts: [{ text: feedback }] }] : contents;
    const res = await geminiWithRetry(req.purpose, model, { model, contents: turn, config });
    const um = res.usageMetadata;
    usage.input += um?.promptTokenCount ?? 0; usage.output += um?.candidatesTokenCount ?? 0;
    usage.thoughts += um?.thoughtsTokenCount ?? 0; usage.cacheRead += um?.cachedContentTokenCount ?? 0;
    const block = res.promptFeedback?.blockReason;
    const finish = res.candidates?.[0]?.finishReason ?? null;
    if (block || finish === "SAFETY" || finish === "PROHIBITED_CONTENT" || finish === "BLOCKLIST") throw new RefusalError(`${req.purpose}: blocked by Gemini (${block ?? finish})`);
    const text = res.text ?? "";
    if (!req.schema) return { text, usage, stop: finish };
    if (finish === "MAX_TOKENS") { maxOut = Math.min(maxOut * 2, 65536); trace("failure", { where: `llm:${req.purpose}`, error: `MAX_TOKENS; retrying with ${maxOut}` }); continue; }
    let raw: unknown;
    try { raw = JSON.parse(text); } catch { feedback = "Your previous reply was not valid JSON. Reply with JSON only, matching the schema."; continue; }
    const ok = req.schema.safeParse(raw);
    if (ok.success) return { parsed: ok.data, text: "", usage, stop: finish };
    const issues = ok.error.issues.slice(0, 12).map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
    trace("failure", { where: `llm:${req.purpose}`, error: `schema validation failed: ${issues.slice(0, 300)}` });
    feedback = `Your previous JSON failed validation: ${issues}. Return the complete corrected JSON.`;
  }
  throw new Error(`${req.purpose}: Gemini returned no valid output after 3 attempts`);
}

// Free-tier Flash models get overloaded (503) at busy times; each model has its own capacity and quota,
// so the fastest recovery is to move the call to the next Flash model rather than wait on the same one.
function fallbackChain(model: string): string[] {
  const extra = (process.env.SIMULA_MODEL_FALLBACKS ?? "gemini-3.5-flash,gemini-3.7-flash,gemini-3.6-flash")
    .split(",").map(x => x.trim()).filter(Boolean);
  return [model, ...extra.filter(m => m !== model)];
}

const MAX_GEMINI_ATTEMPTS = 8;

async function geminiWithRetry(purpose: string, model: string, params: { model: string; contents: Content[]; config: GenerateContentConfig }): Promise<GenerateContentResponse> {
  const chain = fallbackChain(model);
  let hop = 0;       // index into chain
  let backoffs = 0;  // how many times we slept after trying every model
  for (let attempt = 1; ; attempt++) {
    params.model = chain[hop % chain.length];
    await pace(params.model);
    try {
      return await gemini().models.generateContent(params);
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      const msg = String((e as Error)?.message ?? e);
      if (status === 400 && params.config.thinkingConfig && /think/i.test(msg)) {
        noThinking.add(params.model); delete params.config.thinkingConfig;   // model has no thinking controls
        continue;
      }
      const transient = status === 429 || status === 500 || status === 503;
      if (!transient) throw e;
      if (status === 429 && /per ?day|PerDay|daily/i.test(msg) && hop + 1 >= chain.length)
        throw new BudgetExceeded(`Gemini free-tier DAILY quota reached on every fallback model. Resume tomorrow (finished calls are cached), or set SIMULA_MODEL / SIMULA_MODEL_FALLBACKS.`);
      trace("failure", { where: `gemini:${purpose}`, error: `${status} on ${params.model} (attempt ${attempt}/${MAX_GEMINI_ATTEMPTS}): ${msg.slice(0, 140)}` });
      if (attempt >= MAX_GEMINI_ATTEMPTS) {
        trace("failure", { where: `gemini:${purpose}`, error: `gave up after ${attempt} attempts across ${[...new Set(chain)].join(", ")}` });
        throw e;
      }
      hop++;
      if (hop % chain.length !== 0) {
        trace("recovery", { how: `retrying on ${chain[hop % chain.length]} (next fallback model)` });
        continue;
      }
      // Every model in the chain failed once: back off before the next lap (honour a server retry hint).
      const hint = /retry(?:Delay"?:?\s*"?| in )(\d+(?:\.\d+)?)s/i.exec(msg);
      const wait = hint ? Math.ceil(Number(hint[1]) * 1000) + 500 : Math.min(40_000, 10_000 * 2 ** backoffs++);
      trace("recovery", { how: `all fallback models busy; waiting ${Math.round(wait / 1000)}s before another lap` });
      await sleep(wait);
    }
  }
}

function record(req: LlmReq<unknown>, model: string, effort: string, u: Usage, t0: number, key: string, stop: string | null): number {
  // Gemini free tier costs nothing; tokens are still logged so the ledger shows real usage.
  const usd = PROVIDER === "gemini" ? 0 : price(model, { input_tokens: u.input, output_tokens: u.output, cache_read_input_tokens: u.cacheRead, cache_creation_input_tokens: u.cacheWrite });
  spent.total += usd;
  spent.byStage.set(req.stage, (spent.byStage.get(req.stage) ?? 0) + usd);
  stats.calls++; stats.usd += usd;
  ledger({ ts: nowIso(), app: ctx.app, stage: req.stage, purpose: req.purpose, provider: PROVIDER, model, effort, in: u.input, out: u.output, thoughts: u.thoughts,
    cacheRead: u.cacheRead, cacheWrite: u.cacheWrite, usd: Number(usd.toFixed(5)), ms: Date.now() - t0, key, cached: false, stop });
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
