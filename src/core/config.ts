// Configuration: per-app JSON (the ONLY per-app input), run profiles, paths, env.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");

// Load <repo>/.env before anything reads process.env (ESM imports are hoisted, so this has to
// live here rather than in cli.ts). Existing environment variables always win.
(function loadDotEnv() {
  const f = path.join(ROOT, ".env");
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trimStart().startsWith("#")) continue;
    const v = m[2].replace(/^(['"])(.*)\1$/, "$2");
    if (process.env[m[1]] === undefined && v !== "") process.env[m[1]] = v;
  }
})();

export const AppConfig = z.object({
  id: z.string(),
  package: z.string(),
  name: z.string(),
  profile: z.enum(["deep", "medium", "shallow", "fixture"]),
  login: z.enum(["none", "manual"]),
  webUrl: z.string().optional(), // web-driven apps (the fixture) use WebDevice instead of mobile-mcp
});
export type AppConfig = z.infer<typeof AppConfig>;

export const Profile = z.object({
  crawlSteps: z.number(), minutes: z.number(), exploreUsd: z.number(), totalUsd: z.number(),
  drainMax: z.number(), gapRounds: z.number(), htmlScreens: z.number(), qaRounds: z.number(),
  qaTopN: z.number(), qaUsd: z.number(), candidates: z.number(), proposals: z.number(), saturation: z.number(),
});
export type Profile = z.infer<typeof Profile>;

export function loadApp(id: string): AppConfig {
  const p = path.join(ROOT, "apps", `${id}.json`);
  if (!fs.existsSync(p)) throw new Error(`Unknown app "${id}". Known: ${listApps().join(", ")}`);
  return AppConfig.parse(JSON.parse(fs.readFileSync(p, "utf8")));
}

export function listApps(): string[] {
  return fs.readdirSync(path.join(ROOT, "apps")).filter(f => f.endsWith(".json")).map(f => f.replace(/\.json$/, "")).sort();
}

export function loadProfile(name: string): Profile {
  const all = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "profiles.json"), "utf8"));
  if (!all[name]) throw new Error(`Unknown profile ${name}`);
  return Profile.parse(all[name]);
}

/** Where every stage reads and writes. `modelDir` can be overridden (cold-mock test: --model-dir). */
export interface Paths {
  app: string;
  out: string;          // out/<app>
  explore: string;      // out/<app>/explore
  model: string;        // out/<app>/model (or --model-dir)
  mock: string;         // out/<app>/mock
  qa: string;           // out/<app>/qa
  proposals: string;    // out/<app>/proposals
  slides: string;       // out/<app>/slides
  cost: string;         // out/<app>/cost.jsonl
  trace: string;        // out/<app>/trace.jsonl
}

export function paths(appId: string, opts: { modelDir?: string; outRoot?: string } = {}): Paths {
  const outRoot = opts.outRoot ? path.resolve(opts.outRoot) : path.join(ROOT, "out");
  const out = path.join(outRoot, appId);
  return {
    app: appId,
    out,
    explore: path.join(out, "explore"),
    model: opts.modelDir ? path.resolve(opts.modelDir) : path.join(out, "model"),
    mock: path.join(out, "mock"),
    qa: path.join(out, "qa"),
    proposals: path.join(out, "proposals"),
    slides: path.join(out, "slides"),
    cost: path.join(out, "cost.jsonl"),
    trace: path.join(out, "trace.jsonl"),
  };
}

/**
 * Which LLM provider to call. Explicit SIMULA_PROVIDER wins; otherwise whichever key is present
 * (a Gemini key from Google AI Studio works on the free tier). Stub/replay modes need no key.
 */
export type Provider = "anthropic" | "gemini";
export const PROVIDER: Provider =
  (process.env.SIMULA_PROVIDER as Provider) ||
  (process.env.ANTHROPIC_API_KEY ? "anthropic" : process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY ? "gemini" : "anthropic");

const DEFAULT_MODELS: Record<Provider, { main: string; fast: string }> = {
  // Claude: the most capable general model for everything.
  anthropic: { main: "claude-opus-5", fast: "claude-opus-5" },
  // Gemini free tier: Flash models only (Pro models have no free quota). Flash-Lite is the
  // high-volume per-screen annotator; Flash does generation, proposals and judging.
  gemini: { main: "gemini-3.8-flash", fast: "gemini-3.5-flash-lite" },
};

export const MODELS = {
  main: process.env.SIMULA_MODEL || DEFAULT_MODELS[PROVIDER].main,
  fast: process.env.SIMULA_MODEL_FAST || DEFAULT_MODELS[PROVIDER].fast,
};

export const BUDGET_USD = Number(process.env.SIMULA_BUDGET_USD || 150);
