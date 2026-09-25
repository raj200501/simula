# Build spec: authoritative interfaces and decisions

Read this first. `docs/design/FINAL_PLAN.md` holds the detailed design, and `docs/design/CRITIQUE.md` lists its known gaps. **Where they disagree, this file wins.** Where this file is silent, follow FINAL_PLAN as amended by CRITIQUE.

## Conventions (all modules)

- **Language and runtime:** TypeScript ESM on Node 22, run through `tsx`.
  - Relative imports must include the **`.ts` extension**, e.g. `import { load } from "../core/io.ts"`.
  - No enums and no parameter properties. Keep syntax erasable.
- **Types:** all artifact types come from `src/core/schema.ts`. Use `load(schema, file)` / `save(schema, file, data)` from `src/core/io.ts` for every artifact.
- **Claude calls:** only through `src/core/llm.ts`:
  - `json({ stage, purpose, system, prompt, images, schema, effort, stub, cacheKey })` or `text(...)`.
  - **Every call site must pass a deterministic `stub`.** Stub mode (`--llm stub`) runs the whole pipeline with no API key. That is `npm run demo`, and it is how tests run. A stub is a real, useful heuristic fallback, not a dummy: the heuristic annotator, the spec renderer, and so on.
  - Outputs produced by a stub must be marked as such in the artifact (`annotatedBy:"stub"`, `generatedBy:"stub"`, `judgedBy:"stub"`, `synthesizedBy:"stub"`), so nothing pretends to be model output.
  - Prompts must never contain absolute paths, timestamps or run ids, because that breaks replay caching. When images are derived (Playwright renders, composites), pass `cacheKey` built from stable inputs: the screen id, the round, the sha of the HTML, the sha of the diffs JSON, and the sha of the original screenshot.
  - Structured-output schemas must not use `z.record`, recursion or regex. Use arrays of `{key, value}`.
- **Tracing:** use `trace(type, data, step?)` from `src/core/trace.ts` for decisions, failures, recoveries, human steps and stop reasons. It is the trajectory deliverable.
- **No app-specific strings under `src/`.** That means no "OOC", "Luzia", "credits" literal logic keyed to one app, and no package names. The boundary test enforces it (`test/boundaries.test.ts`).
- **Stages downstream of `understand` read ONLY the model directory**, plus their own outputs. That covers mock, qa, propose, judge and slides.
  - The model directory is `paths.model`, overridable with `--model-dir`. This is how the cold-mock test answers "could another agent mock the app from your output alone".
  - They must never import `src/device/mcp.ts` or `src/explore/*`, and never read `eval/`.
- **Tests:** `node:test` + `node:assert/strict`, in `test/<module>.<name>.test.ts`. Tests must run offline with no API key, and each file should finish in under 30 s.
- **Playwright:** use `playwright` 1.56.1 `chromium.launch()`. In the cloud container its browsers are under `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`; locally, users run `npx playwright install chromium`.
- **Pages must work from `file://`:** no `fetch()` of local files. Embed data as `<script src="x.js">` files that assign globals (`window.MODEL = …`).

## Stage entry points (the CLI calls exactly these)

`StageCtx` is defined in `src/core/run.ts`: `{ app, profile, paths, runId, llm, opts }`.

```ts
// src/device/mcp.ts
export class McpDevice implements Device {
  static connect(o: { appPackage: string; serial?: string; cwd: string }): Promise<McpDevice>;
}
export async function mcpDoctor(): Promise<{ ok: boolean; lines: string[] }>; // spawn server, tools/list, list devices

// src/device/web.ts
export class WebDevice implements Device {
  static open(o: { url: string; appPackage: string; widthDp?: number; heightDp?: number; dpr?: number; headless?: boolean }): Promise<WebDevice>;
  readonly page: import("playwright").Page;
}

// src/explore/explorer.ts
export async function explore(c: StageCtx, dev: Device, o: ExploreOpts): Promise<{ graphFile: string; graph: ExploreGraph }>;
export interface ExploreOpts { resume?: boolean; noConsume?: boolean; noGap?: boolean; steps?: number; annotator?: "llm" | "heuristic" }
export function latestGraphFile(p: Paths): string; // reads out/<app>/explore/latest (a text file holding the runId)
export async function probe(c: StageCtx, dev: Device): Promise<ProbeReport>; // 1-screen go/no-go: element count, labelled
                                                            // actionables, readable numbers, insets, secs/step -> printed + saved

// src/model/understand.ts
export async function understand(c: StageCtx, graphFile: string): Promise<{ modelFile: string; model: ProductModel }>;
export function loadModel(modelDir: string): ProductModel;  // product-model.json + overrides.json (JSON-merge by id), validated
// src/model/digest.ts
export function digest(m: ProductModel): string;            // deterministic, 6-12k tokens; read by proposer + judge
// src/model/economics.ts   (PURE, fully unit-tested)
export function deriveEconomy(e: Economy): Derived;
export function regimeOf(e: Economy): Regime;
export function proposalEconomics(p: Proposal, m: ProductModel): ProposalEconomics;
export const ECON: { grossPerViewUsd: {US:[number,number];EU:[number,number];LATAM:[number,number]}; nonGameHaircut: number; cogsPerUnitUsd: Record<string, number> };

// src/mock/generate.ts
export async function generateMock(c: StageCtx, m: ProductModel, modelDir: string): Promise<{ indexHtml: string }>;
// src/mock/build.ts
export function buildMock(m: ProductModel, modelDir: string, outDir: string, o?: { proposals?: Proposal[] }): string; // deterministic assembly, returns index.html path

// src/qa/loop.ts
export async function runQa(c: StageCtx, m: ProductModel, modelDir: string, o: { rounds?: number; screens?: string[] }): Promise<QaSummary>;
export interface QaSummary { screens: { id: string; name: string; render: "html" | "image"; composite: number | null; rounds: number; mustFix: number; best: string }[];
  flow: { total: number; passed: number; failures: { edge: string; reason: string }[] }; htmlShare: number }
// writes out/<app>/qa/summary.json and out/<app>/qa/report.html

// src/propose/propose.ts
export async function propose(c: StageCtx, m: ProductModel): Promise<Candidates>;                  // writes proposals/candidates.{json,md}
export async function revise(c: StageCtx, m: ProductModel, p: Proposal, requiredChanges: string[], topConcern: string, round: number): Promise<Proposal>;

// src/judge/judge.ts
export async function judgeAll(c: StageCtx, m: ProductModel, cands: Candidates): Promise<Judgments>; // gates -> LLM rubric -> verdict (code) -> <=2 blind revisions
// src/judge/verdict.ts  (PURE)
export const WEIGHTS: { criterion: Criterion; weight: number }[]; export const THRESHOLDS: {...};
export function verdictOf(gates: GateResult[], scores: { criterion: Criterion; score: number }[], round: number): { verdict: Verdict; weighted: number | null; reasons: string[] };
// src/judge/calibrate.ts
export async function evalJudge(c: StageCtx, m: ProductModel): Promise<string>; // single-fault confusion table -> proposals/judge-eval.md

// src/slides/slides.ts
export async function buildSlides(c: StageCtx, m: ProductModel, modelDir: string, cands: Candidates, j: Judgments): Promise<{ deckHtml: string; pdf: string }>;

// src/report/report.ts
export async function buildReport(appIds: string[], outRoot?: string): Promise<string>; // out/index.html
```

## Output layout

```
out/<app>/explore/<runId>/{graph.json, obs/oNNNN.png, trajectory.md}   out/<app>/explore/latest
out/<app>/model/{product-model.json, overrides.json?, digest.md, viewer.html, screens/sNN.png, assets/*.png}
out/<app>/mock/{index.html, data.js, design.css, runtime.js, rewarded.js, frame.css, screens/sNN.html, assets/, proposals/Pn.js}
out/<app>/qa/{summary.json, report.html, <screen>/r<k>/{mock.png, heat.png, metrics.json, diffs.json, changelog.md}}
out/<app>/proposals/{candidates.json, candidates.md, judgments.json, judgments.md, judge-eval.md}
out/<app>/slides/{deck.html, deck.pdf, png/*.png}
out/<app>/{cost.jsonl, trace.jsonl, trajectory.md}      out/<app>/<stage>/manifest.json
out/index.html
```

## Decisions that override FINAL_PLAN (from the critique)

### Explorer (T1, T2, T3, T7, T8)

- **Chrome identity.**
  - Every string the explorer typed (`graph.typed`), and every text that appeared as an effect of a consume edge, is excluded from chrome tokens.
  - A **repeated group** is 3 or more elements of the same short type that share a left edge OR a right edge (±8 px) within a vertical run. This handles chat bubbles.
  - The chrome rule: the top/bottom 15% band, or selected/checked, or a short label (≤ 24 chars) that is not in a repeated group.
  - The annotator's `sameAs` prompt says: "same template, different content = same state".
- **Wall detection.** An edge is a wall only if one of these holds:
  - the next state is a new screen whose kind is not `chat`;
  - it carries a `limit`/`price`/`upsell` signal;
  - it is a modal, sheet or dialog.

  A different state id alone is not enough.
- **Drain probe.** For consume edges, stop only on:
  - a wall;
  - an external app;
  - `drainMax` reached;
  - 3 sends in a row that produced no reply and no counter change.

  If no counter is bound on the chat screen, then every 3 sends: travel to a state that shows the counter, read it, and back-fill a per-send delta `Δ/n` as `{kind:"counter", …, inferred:true}`. Drain on the context (selected mode) whose edge showed the largest cost.
- **Ads.** Never tap an ad element. An element is an ad if it matches any of these:
  - its type or identifier matches `/gms\.ads|AdView|NativeAd|taboola|prebid|adchoices|ad_container|sponsor/i`;
  - its label or text is exactly `Ad`, `Sponsored`, `AdChoices` or `Advertisement`;
  - it sits inside the rect of such a container.

  Record ads as `ad` signals / `economy.ads` evidence. Prompt wording: "observe ads, never click them". Close interstitials with a close control or BACK.
- **Send after typing.** After `typeText`, re-read the elements. Pick Send by label or identifier `/send|submit|arrow/i`, or else the rightmost clickable element on the input's row. If neither exists, press ENTER through `mobile_press_button` (the device driver exposes `pressEnter?()` as optional). Then verify the input cleared.
- **Safe taps.** Tap the centre of the element's rect intersected with the safe area (inside the status/nav insets). If less than 40% of the element is visible, scroll it into view first, or skip it.

### Model (B4, C4, C5)

- **Flows.** Emit a `core` flow built from real edge sequences, the drain/consume sequence in particular: open → mode → send → reply → counter drops → wall → store. Monetization flows are shortest paths to walls, stores and paywalls.
- **Variants.** Keep 2–3 observed variant states per HTML screen in `screen.variants`.
- **Coverage.** `coverage.notExplored` lists every action left `skipped`, `unreachable` or `failed`, with the reason.

### Mock and QA (T4, T5, T15, C5)

- The mock opens from `file://`, with no fetch.
- Image-rendered screens show a small "image screen" badge. The QA summary reports `htmlShare`.
- Fonts: use the family from the model when it is bundled. Otherwise fall back to a system stack. Never depend on the network.
- Keep-best across QA rounds. The stop rule is FINAL_PLAN §7.

### Economics (T10)

- The headline is the **exchange rate**: 1 US completed view ≈ X–Y units at list price. Next to it goes the cannibalization check against the cheapest pack.
- ARPDAU is a labelled **scenario** on the details slide only.

### Judge (D6, T9, T13)

- **Every SHIP gets a flow slide. REVISE is never promoted.** If too many proposals ship, raise the thresholds rather than cutting a list.
- **Judge evaluation** is a single-fault confusion table:
  - 5 positives from KB precedents (not Simula's Luzia slides);
  - about 8 negatives, each made by changing one field of a positive;
  - one live run, no Batch API;
  - it reports whether each negative was caught by code or by the LLM.
- No "blind rediscovery" claims.

### Slides (E5)

- **Five frames:**
  1. Today;
  2. What changed (NEW elements outlined);
  3. Offer, showing Play / No thanks, with No thanks returning the user to where they were;
  4. Ad plays;
  5. Value received.
- A labelled **trigger arrow** runs between frames 2 and 3.
- The "Why" rail is built on the exchange rate and the cannibalization guard.

## Module ownership (parallel build)

Each builder edits only its own paths and writes tests under `test/<module>.*`. Shared files (`src/core/*`, `docs/BUILD_SPEC.md`) are read-only for builders. If a core change is truly needed, the builder writes it down in their final report instead of making it.

| Builder | Owns |
|---|---|
| device | `src/device/mcp.ts`, `src/device/web.ts`, `fixtures/credit-chat/**` |
| explore | `src/explore/**` |
| model | `src/model/**` |
| mock-qa | `src/mock/**`, `src/qa/**` |
| propose-judge | `src/propose/**`, `src/judge/**`, `eval/judge-cal/**` |
| slides-report | `src/slides/**`, `src/report/**` |
| integrator | `src/cli.ts`, `test/boundaries.test.ts`, `test/e2e-fixture.test.ts`, README |

## The fixture app (`fixtures/credit-chat/`): adversarial on purpose

This is a plain HTML/JS phone app, 411×914 CSS px, with no framework and no network. It is built so that the known failure modes are exercised.

**Screens:**

| Screen | Contents |
|---|---|
| Home (tab) | Balance chip at the top ("450 credits"). A feed of story cards with variable heights, one of them a fake **"Sponsored"** card (`data-ad`). A bottom tab bar: Home / Store / Profile. |
| Story detail | Opened from a story card. Has "Start chat". |
| Chat | Mode chip: Basic 10 / Premium 30 (a sheet opens to choose). **The balance is not shown on the chat screen.** Composer with a mic icon that turns into a **Send** button only after typing. User bubbles are right-aligned, bot bubbles left-aligned, with variable widths. The bot reply arrives after 1.2 s. Each send costs the selected mode's price. |
| Insufficient-credits sheet | Appears when the balance is below the cost: "Out of credits", "Refill now" → Store, "Not now". |
| Store (tab) | Packs "1,000 credits $1.39", "2,000 $2.89", "5,000 $7.09". Tapping a pack opens an **external billing card** (`data-external="billing"`, which `WebDevice.foreground()` reports as `ext:billing`). |
| Daily check-in modal | Shown on the first open of Home: "+300 credits", "Claim". |
| Profile (tab) | Settings, with **"Log out"** (must never be tapped), "Rate us" (external `browser`), "Terms". |

Also:
- One list row is **half hidden under a 48 px bottom nav bar**.
- State persists in `localStorage` under a key the tests can reset via `?reset=1`.
