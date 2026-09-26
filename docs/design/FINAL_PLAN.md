# Simula take-home: final plan

> The plan as written before the build. Where the code differs, the code and `docs/BUILD_SPEC.md` win. The research notes and design drafts it cites were working files and are not in this repo.

Written 2026-09-25, with about 48 hours left before the deadline.

**Sources.** This plan combines three proposals: `design-mvp-80-20.md`, `design-rigor.md` and `design-reviewer-impact.md`. I checked their claims against:
- `research/mobile-mcp.md`;
- `research/device-setup.md`;
- `research/rewarded_ads_kb.md`;
- `research/app-intel.md`;
- the `@simula/ads-react-native` 1.4.1 type definitions in `research/pkgs/`;
- the claude-api skill, for model IDs, prices, `effort`, structured outputs and image limits.

---

## 0. Verdict on the three proposals

### 0.1 Scores (1–10)

| | mvp-80-20 | rigor | reviewer-impact |
|---|---|---|---|
| Can be built end to end in 48 h | **8** | 4 | 6 |
| Technical maturity | 7 | **9** | 8 |
| Impact on the evaluators | 7 | 6 | **9** |
| Simplicity | **9** | 4 | 6 |
| Technical claims are correct | **9** | 7 | 8 |
| **Mean** | **8.0** | 6.0 | 7.4 |

### 0.2 Why

**mvp-80-20: 8 / 7 / 7 / 9 / 9**

- **Feasibility.** It is about 2,500 lines of code with a single judge. It builds a walking skeleton on a fixture app, and its cut list is realistic.
- **Maturity.** Its strengths:
  - a content-addressed LLM cache and a cost ledger;
  - one `Device` interface with a web driver;
  - the verdict is computed in code, and the judge is calibrated.

  Its weaknesses:
  - the LLM fills in the economics numbers itself, so arithmetic that ends up on slides comes from the model;
  - there is no test that enforces its "no app-specific code" claim;
  - there are no stage manifests.
- **Impact on the evaluators.** It is solid, but nothing in it protects against generic proposals. Slides and the recording come late in the plan.
- **Correctness.** It uses the right tool names and arguments. It taps by coordinates rather than by `ref`, parses errors from the response text, respects the working-directory rule for `save_screenshot`, and handles the Opus 5.5 constraints. It has these gaps:
  - it does not warn that pnpm breaks the lookup of the mobilecli binary;
  - it crops the status and navigation bars even though Android 15 apps draw edge to edge;
  - its "button-like types" rule for state signatures does not match React Native trees.

**rigor: 4 / 9 / 6 / 4 / 7**

- **Maturity.** It has the best engineering: typed artifacts, manifests, import-boundary tests, economics computed in code, and a check that each patch applies to the spec.
- **Scope.** It is too much for one person in 48 hours:
  - three Device drivers and a raw-tree side channel;
  - a panel of personas plus a chair plus pairwise ranking;
  - invariance tests, held-out tuning and inter-rater agreement (κ);
  - a round-trip check;
  - 25 mock screens.
- **Impact on the evaluators.** The brief says "extra complexity is not rewarded".
- **Correctness.** `mobilecli dump ui --format raw` exists, but its JSON shape has not been verified on a device, and it needs the path to the npm-installed binary. Reading the foreground package from the "top window" of the raw tree must skip the systemui windows. 300 steps in 75 minutes means about 15 seconds per step, which is tight when a single dump can wait up to 2 seconds for the UI to go idle.

**reviewer-impact: 6 / 8 / 9 / 6 / 8**

- **Impact on the evaluators.** This is the proposal that best maps to what the evaluators look for:
  - it treats the app as an economy, with an exchange rate computed in code;
  - it asks the proposer for the obvious ideas first, then for ideas beyond them;
  - it plans the recording from the start;
  - it frames transfer as four monetization regimes;
  - it uses the app's own character as the Game Partner;
  - it produces an integration spec.

  I checked the SDK calls it uses against the 1.4.1 type definitions: `SimulaAds.checkFrequencyCap`, `useRewardedAd(id).load({charId,charName,charImage,charDesc})`, `rewardVerified` and `no_fill`. They are correct. So is its arithmetic: one US view is worth about 6.5–10.8 OOC credits at list price.
- **Scope.** It still carries a persona panel, a cold-read test, a separate rediscovery eval, a capture phase, two Google accounts and a review UI.
- **Sequencing error.** Hours 7–9 of its plan have the human checking ground truth on the device while the deep exploration run is using the same emulator. Only one UiAutomation connection is allowed per device.

### 0.3 What this plan takes from each

- **Backbone: mvp-80-20.**
  - A deterministic explorer that makes one Sonnet call per new screen.
  - The product model as the only contract between stages.
  - Screen HTML plus a fixed runtime.
  - Proposals written as model patches.
  - A single judge whose verdict is computed in code.
  - `WebDevice` running on a fixture app.
  - Image screens for the long tail of screens.
- **From reviewer-impact:**
  - the economy, plus derived numbers computed in code (the exchange rate);
  - the list of moments;
  - the proposer's "obvious ideas first, then beyond" structure;
  - the app's own character as the Game Partner;
  - the integration snippet written against the real SDK;
  - recording segments captured as each stage starts working, with the report site as the backbone of the recording;
  - the transfer framing as monetization regimes;
  - a bounded gap-check call;
  - blind human labels written before the judge runs.
- **From rigor:**
  - economics computed as pure code;
  - a boundary test (no app strings, no device imports downstream);
  - a replay mode for the LLM cache;
  - minimal per-stage manifests;
  - no consume actions during dev runs;
  - a diversity validator for the proposal set;
  - calibration tuned on half the items and reported on the held-out half.

### 0.4 Errors in all three proposals, fixed in this plan

1. **The calibration set leaks into the judge's prompt.** All three give the judge the whole KB, or all of §8. §8 includes **[JUDGE-6]**, which is the calibration set itself: for example, "Watch an ad or your chat history is deleted" is listed with the answer REJECT. **Fix:** the judge's KB excludes JUDGE-6, and the negative calibration items are paraphrased and grounded in an app, never copied verbatim.
2. **Status and navigation bars are cropped.** All four apps target SDK 34–36, and on Android 15 an app targeting SDK 35 or later is drawn edge to edge, underneath the status bar. Cropping the bars and shrinking the viewport shifts every element rect. **Fix:** render the mock full-screen (411×914 dp at DPR 2.625), draw a static 09:41 status bar in the mock frame, and *mask* the inset rows when computing metrics.
3. **The chrome signature doesn't fit React Native trees.** OOC and Janitor expose buttons as `ViewGroup` elements with a content-desc, not as `Button`, so a rule based on type misses them. **Fix:** decide what counts as chrome by position band, by selected or checked state, and by short labels outside repeated groups.
4. **The dp viewport width is not a whole number.** 1080 / 2.625 = 411.43 dp, but Playwright takes a whole-number viewport. **Fix:** render at 411×914 and resize the mock capture to 1080×2400 with sharp before diffing. The error is under 0.2%.
5. **Image size limits are out of date.** The research note says images are shrunk to 1568 px anyway. That is stale: Opus 5.5 and Sonnet 5 accept images up to 2576 px on the long edge. **Fix:** send the full-resolution 1080×2400 PNG for screen generation and QA fixes, where coordinates then map 1:1. Keep the 1024 px JPEG only for the high-volume annotator.
6. **npm, not pnpm.** pnpm's strict layout breaks mobile-mcp's lookup of the mobilecli binary (mobile-mcp.md §1).
7. **The repository would be too large.** A full-resolution PNG is 1–3 MB, and a deep run produces hundreds of observations. **Fix:** don't commit raw observations. Commit only representative screens and the QA filmstrips, saved as JPEG except the best round.
8. **The daily check-in is lost on day 1.** The human's first login to OOC uses up the day-1 check-in modal. **Fix:** a short explorer run on the first app open of day 2 captures it.

---

## 1. Thesis and architecture

**The claim, in one sentence:** understand the app as an economy, write that understanding into one product model where every claim is backed by evidence, and compile everything else from that model.

- **The explorer maps the app's value system, not just its screens.** It records:
  - what users do;
  - what is scarce, and what each action costs, measured as the counter change after the action;
  - where free users hit walls;
  - what the app sells;
  - enough pixels and element data to rebuild each screen.
- **Agents never talk to each other.** They share context only through typed files on disk, which act as a blackboard: `graph.json` → `product-model.json` → `mock/` → `qa/` → `proposals/` → `judgments/` → `slides/`. Every stage can be re-run, cached and inspected on its own.
- **Code owns control flow, state identity, recovery and arithmetic.** Models answer narrow questions with output validated against a schema.
- **A proposal is a typed patch to the model.** So:
  - the mock renders it;
  - the judge checks it against the same model;
  - each slide is a screenshot of the patched mock.

```
apps/<id>.json (package, login, profile: the ONLY per-app input)
      │
Android emulator ⇄ mobile-mcp 1.0.5 (stdio) ⇄ EXPLORE ──► graph.json + obs/ + trace.jsonl
                                          │  code drives; Sonnet 5 once per NEW screen; Opus once for gap check
                                          ▼
                                   UNDERSTAND ──► product-model.json + digest.md + viewer
                                   compile (code) → synthesize (Opus) → verify + economics + moments (code)
            ┌──────────────────────┬──────────┴──────────────┐
            ▼                      ▼                         ▼
      MOCK (Opus HTML/screen   QA (Playwright render,    PROPOSE (KB in context, moments,
      + fixed runtime from     measured diffs → Opus     obvious-first then beyond; economics by code)
      edges, economy, chat)    fix, keep-best, flows)          ▼
            │                                          JUDGE (code gates → Opus rubric → verdict in code,
            │                                          ≤2 blind revision rounds)
            └──────────────► SLIDES ◄──────── SHIP proposals = model patches → patched mock → Playwright → PDF
                                  ▼
                   REPORT SITE out/index.html (the spine of the recording)
```

### What code decides and what models decide

| Code (deterministic) | Model (schema-bound) |
|---|---|
| Device I/O, settling, signatures and state matching, action choice, BFS and replay, guard rails, foreground classification, stop rules, drain probe, effect diffs | Screen name, kind, scope, action priorities, text to type, counter binding, monetization signals, borderline `sameAs` (Sonnet 5 `low`, once per new state); gap check (Opus, at most 2 calls) |
| Picking representative observations, dp conversion, colour and type tokens, asset crops, PII blur, edge→element resolution, flows, quote and number verification, **economy-derived numbers**, moments, digest | Brief, economy items, flow names (1 Opus call) |
| Mock runtime (router, transitions, counters, chat replay, wall guard, rewarded overlay, proposal patches), HTML validator | Design-system CSS, screen HTML, variant-screen HTML (Opus) |
| QA metrics, keep-best, stop rule, flow replay | Fixes from measured diffs (Opus) |
| Diversity validator, **proposal economics**, grounding and patch-apply checks, policy lint, verdict thresholds, calibration metrics | Candidates and revisions (Opus); gate answers and rubric scores with evidence (Opus judge) |
| Slide capture, callout placement, PDF, integration snippet | Nothing |

---

## 2. Repository, tooling, commands

- **Runtime:** Node 22, TypeScript with `"type":"module"`, run through `tsx`, tests with `node --test`.
- **Package manager: npm.** pnpm breaks the mobilecli lookup.
- **Pinned dependencies:**
  - `@anthropic-ai/sdk@^0.128`
  - `zod@^4`
  - `@modelcontextprotocol/sdk@1.30.1`
  - `@mobilenext/mobile-mcp@1.0.5`
  - `playwright@1.63` (Chromium)
  - `sharp`, `pngjs`, `pixelmatch`, `ssim.js`, `culori`
- **Code to port** (already typechecked or tested):
  - `research/mobile-mcp/mobile-client.ts`
  - `research/sota-sketches/src/{explorer/state.ts (jaccard, dHash, diffEffects), explorer/actions.ts (classifyForeground, classifyRisk), recreate/tokens.ts, qa/compare.ts, judge/judge.ts}`
  - `research/simula-device.sh`, which becomes `scripts/device.sh`

```
simula/
  README.md                 setup, requirements, one command per stage, architecture, decisions (10 short ADRs),
                            deterministic-vs-model table, costs, limitations, time allocation, productionization
  HUMAN_LOG.md              every manual step (mirrors `human` trace events)
  package.json  tsconfig.json  .env.example (ANTHROPIC_API_KEY, ANDROID_HOME, ANDROID_SERIAL?)  .gitignore
  apps/{ooc,luzia,janitor,aol,fixture}.json      {id, package, name, login:"none"|"manual", profile}
  config/profiles.json      deep|medium|shallow budgets (below)
  config/device.json        written by `probe`: widthPx, heightPx, density, statusBarPx, navBarPx
  kb/rewarded_ads_kb.md
  scripts/device.sh         setup|boot|prep|install|versions|pull-apks|snapshot-save|snapshot-load|insets|doctor
  src/
    cli.ts
    core/    schema.ts config.ts llm.ts trace.ts run.ts
    device/  types.ts mcp.ts web.ts
    explore/ explorer.ts observe.ts signature.ts annotate.ts guards.ts externals.ts
    model/   compile.ts tokens.ts redact.ts synthesize.ts verify.ts economics.ts moments.ts digest.ts
    mock/    generate.ts build.ts validate.ts runtime/{runtime.js,rewarded.js,frame.css}
    qa/      render.ts compare.ts loop.ts flows.ts crawl.ts report.ts
    propose/ kb.ts propose.ts
    judge/   gates.ts judge.ts verdict.ts calibrate.ts
    slides/  slides.ts integration.ts deck.html
    report/  report.ts
    eval/    explorer-recall.ts                      (never imported by pipeline code)
  fixtures/credit-chat/     6-screen plain-HTML app: home(tab), chat (−30 credits/send), store, paywall on 0,
                            check-in modal, settings with "Log out"; plus fixtures/llm-stubs/<purpose>.json
  eval/     ground-truth.json (EVAL-ONLY)   judge-cal/{positives,negatives,invariance}.json
  test/     unit/*.test.ts  e2e-fixture.test.ts  boundaries.test.ts
  cache/llm/                committed LLM responses (replay)
  out/<app>/                stage outputs; committed EXCEPT out/*/explore/*/obs/ (raw observations)
  out/index.html            report site
```

**`config/profiles.json`:**

| Profile | Crawl steps | Minutes | $ | Consume retries per drain | HTML screens | QA rounds (top N) | Candidates |
|---|---|---|---|---|---|---|---|
| deep | 150 | 75 | 6 (explore) / 30 (all) | 10 | 14 | 3 (8), 1 for the rest | 10→6 |
| medium | 100 | 40 | 3 / 12 | 30 | 6 | 2 (4) | 10→6 |
| shallow | 60 | 25 | 2 / 8 | 10 | 4 | 1 | 8→4 |

### Commands (one per stage)

```
npm run device -- setup|boot|prep|install|snapshot-save simula_ready|...   # Mac only
npm run doctor                          # node, adb, emulator, key, mobile-mcp tools/list, playwright
npm run probe      -- --app ooc         # 1-screen go/no-go + insets → config/device.json
npm run explore    -- --app ooc [--profile deep] [--no-consume] [--no-gap] [--resume] [--steps N]
npm run understand -- --app ooc         # → out/ooc/model/{product-model.json,digest.md,viewer.html}
npm run mock       -- --app ooc         # → out/ooc/mock/index.html
npm run qa         -- --app ooc [--rounds 3] [--crawl]     # → out/ooc/qa/report.html
npm run propose    -- --app ooc         # → out/ooc/proposals/candidates.{json,md}
npm run judge      -- --app ooc         # gates + judge + ≤2 revisions → out/ooc/proposals/judgments.{json,md}
npm run slides     -- --app ooc         # → out/ooc/slides/{deck.html,deck.pdf,png/}
npm run all        -- --app ooc [--from understand|mock|qa|propose|judge|slides]
npm run report                          # → out/index.html (all apps)
npm run note       -- --app ooc "logged in with test account"
npm run eval:explorer -- --app ooc      npm run eval:judge [-- --make-negatives]
npm test                                npm run demo       # fixture end to end, no device, no key
global flags: --llm live|record|replay|stub (default record)   --budget-usd N   --model-dir <path>
```

**Replaying without a device or a key:** `npm run all -- --app ooc --from mock --llm replay`. It rebuilds the mock, QA, proposals, judgments and slides from the committed `out/ooc/model` and `cache/llm/`.

---

## 3. Shared plumbing (`src/core`, about 450 lines, built first)

### `schema.ts`

- Holds zod schemas for `Observation`, `ExploreGraph`, `ProductModel`, `Proposal`, `Judgment` and `CalItem`. Types come from `z.infer`.
- `load(schema, path)` and `save(schema, path, data)` validate on every read and every write.
- Structured-output schemas avoid features the API rejects, such as regex patterns and recursion. Count constraints (for example "at least 3 existing") are checked in code.

### `llm.ts`: the only code that calls Claude

```ts
json<T>(r: { stage: string; purpose: string; model: ModelId; effort?: Effort; system: Block[];
             content: Block[]; schema: z.ZodType<T>; maxTokens?: number }): Promise<T>
text(r: Omit<JsonReq, "schema">): Promise<string>        // streamed; stream.finalMessage()
```

- **JSON calls** use `client.messages.parse({ model, max_tokens, system, messages, output_config: { effort, format: zodOutputFormat(schema) } })` and return `parsed_output`.
- **Opus 5.5 constraints:**
  - thinking can't be disabled, so the `thinking` parameter is omitted (adaptive is the default);
  - forced `tool_choice` returns a 400;
  - there is no prefill;
  - `effort` defaults to `medium`, so it is always set explicitly.
- **Sampling:** Sonnet 5 and Opus 5.5 reject `temperature`, so it is never sent. **Haiku 4.5 rejects `effort`**, so it isn't sent to Haiku either.
- **Model IDs:** `claude-opus-5-5`, `claude-sonnet-5`, `claude-haiku-4-5`.
- **Prices ($/MTok: input / output / cache read):**

  | Model | Input | Output | Cache read |
  |---|---|---|---|
  | Opus 5.5 | 4 | 20 | 0.20 |
  | Sonnet 5 | 2 | 10 | 0.20 |
  | Haiku 4.5 | 1 | 5 | 0.10 |

  The Batch API costs 50%.
- **Prompt caching:** `cache_control: {type:"ephemeral"}` goes on the KB and system blocks. The minimum cacheable prefix is 512 tokens on Opus 5.5.
- **Cache key:** `sha256(canonical JSON of {model, effort, system, content, schemaJSON})`, with every image replaced by the sha256 of its bytes. Entries are stored at `cache/llm/<stage>/<key>.json` as `{content, parsed, usage, stop_reason}`.
- **Modes:**
  - `record` (the default): return on a hit; call live on a miss and write the result;
  - `replay`: a miss throws `ReplayMiss`;
  - `live`: always call;
  - `stub`: return `fixtures/llm-stubs/<purpose>.json`; used for tests only.
- **Failure handling:**
  - `stop_reason === "refusal"` throws `RefusalError`, and the caller falls back;
  - if `parsed_output` is null, retry once with `maxTokens × 2`;
  - SDK retries (429 and 5xx) are left at their defaults.
- **Budgets:** before each call, if the stage or global spend is at or above its cap, throw `BudgetExceeded`. The global cap is `SIMULA_BUDGET_USD=150`.
- **Ledger:** one line per call in `out/<app>/cost.jsonl`:

```json
{"ts":"2026-09-25T10:03:11Z","app":"ooc","stage":"mock","purpose":"screen:s07","model":"claude-opus-5-5","effort":"high",
 "in":9120,"out":11840,"cacheRead":3100,"cacheWrite":0,"usd":0.274,"ms":48211,"key":"9f3c…","cached":false,"stop":"end_turn"}
```

### `trace.ts`: the trajectory deliverable

`out/<app>/trace.jsonl` is append-only, one event per line:

```json
{"ts":"…","app":"ooc","run":"r0925-1003","stage":"explore","step":42,"type":"decision",
 "data":{"state":"s07","action":"a07_3","why":"p3 monetization: 'Refill Now'","alternatives":["a07_1:p2","a07_4:p1"]}}
```

| `type` | `data` |
|---|---|
| `mcp_call` | `{tool, args, ms, ok, digest}` |
| `llm_call` | `{purpose, key, cached, usd}` |
| `observe` | `{obs, state, isNew, jaccard, counters}` |
| `decision` | as in the example above |
| `effect` | `{edge, effects}` |
| `external` | `{kind, pkg}` |
| `failure` | `{where, error}` |
| `recovery` | `{how}` |
| `human` | `{note}` |
| `budget` | `{kind, used, cap}` |
| `stop` | `{reason}` |

`trace.summarize()` writes `trajectory.md`. It contains:
- a timeline of phases;
- states discovered over time;
- failures, each paired with its recovery;
- human interventions;
- the stop reason;
- the **autonomy ratio**: autonomous steps ÷ (autonomous steps + human interventions).

### `run.ts`

- `stage(app, name, fn)` writes `out/<app>/<stage>/manifest.json`: `{stage, runId, gitSha, startedAt, finishedAt, status, stopReason?, inputs:[{path,sha256}], llm:{calls, usd, byModel}, config}`.
- `all --from X` runs the stages in order.

### `test/boundaries.test.ts`

- Fails if any `id`, `name` or `package` from `apps/*.json` appears anywhere under `src/`, matched with word boundaries.
- Fails if `src/{model,mock,qa,propose,judge,slides}` imports `src/device/mcp.ts` or `src/explore/*`. `qa/crawl.ts` may import `device/web.ts` and `explore/explorer.ts`.
- Fails if `src/` reads `eval/`.

---

## 4. Explorer (`src/device`, `src/explore`, about 800 lines)

### 4.1 Device control

- Our Node process is the MCP client. It spawns the server as `node <require.resolve("@mobilenext/mobile-mcp/lib/index.js")> --stdio`:
  - `cwd` is the repo root, and screenshots are saved under `out/`;
  - `env` is `{...getDefaultEnvironment(), ANDROID_HOME, MOBILEMCP_DISABLE_TELEMETRY:"1", MOBILEMCP_ALLOW_UNSAFE_URLS:"1"}`;
  - `stderr` is `"pipe"`, and the output goes to `trace` as debug.
- Calls run strictly one at a time, one server per device.

| Need | mobile-mcp tool (exact) | Notes |
|---|---|---|
| Device id | `mobile_list_available_devices` | `{"devices":[]}` is a precondition failure. |
| Element list | `mobile_list_elements_on_screen {device, format:"json"}` | Strip the `"Found these elements on screen: "` prefix. The list is flat: `type, text, label(content-desc), identifier(resource-id), coordinates{x,y,width,height}` in px, and `focused/selected/checked/enabled:false`. It has **no** clickable, scrollable or hint information, and the annotator makes up for that. |
| Screenshot | `mobile_save_screenshot {device, saveTo:"<abs>/out/<app>/explore/<run>/obs/oNNNN.png"}` | Full-resolution lossless PNG. The 1024 px JPEG for the annotator is made locally with sharp. |
| Foreground | `mobile_get_foreground_app {device}` | Parse `/\(([\w.]+)\)\s*$/`. |
| Tap | `mobile_click_on_screen_at_coordinates {device, x, y}` | Always the centre of a rect we computed. **Never `ref`**: refs are positional, cost an extra dump, and can hit the wrong element. |
| Type | `mobile_type_keys {device, text, submit:false}`, then a tap on the Send element | ENTER is a newline in chat apps. Inputs are ASCII only. |
| Scroll | `mobile_swipe_on_screen {device, direction:"up", x:W/2, y:0.7H, distance:0.4H}` | Start and end are clamped to 15–85% of height, away from the gesture edges. |
| Back | `mobile_press_button {device, button:"BACK"}` | |
| (Re)launch | `mobile_terminate_app` / `mobile_launch_app {device, packageName}` | Force-stop keeps the login. |

**Hardening:**
- every call has a 45-second client timeout (`callTool(..., {timeout})`);
- errors are thrown when `isError` is set, or when the text matches `/Please fix the issue and try again\.$/` or `/^Error: /`;
- a failed call is retried once;
- after a timeout, kill and respawn the server; after two timeouts in a row, run `mobilecli daemon stop`;
- five consecutive device failures end the run with `stopReason:"device_unhealthy"`, after a checkpoint.

**Setup outside MCP** happens in `scripts/device.sh`. It is device preparation, not exploration:
- Android 15 Play image, Pixel 8 profile, `hw.keyboard=yes`;
- animations off, demo-mode status bar (09:41), stay awake, IME, autofill and spellcheck off;
- snapshots;
- `insets`, which parses `dumpsys window` for status and navigation bar heights.

Don't run `device.sh dump` while the explorer is running: only one UiAutomation connection is allowed per device.

**`Device` interface.** `McpDevice` drives the emulator. `WebDevice` drives Playwright over the fixture app or the generated mock: elements come from `[data-node],button,a,input,[role=button]` with boxes × DPR, and the foreground is `web` or `ext:<kind>` when the mock shows an external card.

```ts
interface RawElement { type: string; text?: string; label?: string; identifier?: string;
  rect: Rect /*px*/; selected?: true; checked?: true; focused?: true; disabled?: true }
interface Device {
  screen: { widthPx: number; heightPx: number; density: number };
  foreground(): Promise<string>; elements(): Promise<RawElement[]>; screenshot(absPath: string): Promise<void>;
  tap(x: number, y: number): Promise<void>; typeText(t: string): Promise<void>;
  swipe(dir: "up" | "down", x: number, y: number, distPx: number): Promise<void>;
  back(): Promise<void>; launch(opts?: { cold?: boolean }): Promise<void>;
}
```

### 4.2 Observations, state identity, diffs (`observe.ts`, `signature.ts`)

- **Normalizing an observation.** Drop elements that are:
  - systemui (`identifier` starts with `com.android.systemui:`);
  - in the inset rows;
  - zero-area;
  - off-screen.

  Then give each remaining element an id (`e1…eN`) and a **re-find key**: `shortType|identifier|maskedLabel|ordinal`, where `mask` lowercases, turns digits into `#`, and cuts to 40 characters.
- **Signature, the identity of a state.** It is the **set** of tokens over the normalized elements:
  - **Chrome elements** contribute `shortType|identifier|mask(text||label)`. An element counts as chrome if it:
    - sits in the top or bottom 15% band;
    - is `selected` or `checked`;
    - has a text or label of 24 characters or fewer and is not in a repeated group.
  - **Content elements** contribute only `shortType|identifier`.
  - A **repeated group** is 3 or more elements with the same type, x and width.

  Because it is a set and digits are masked, these give the **same** state:
  - a chat with 3 messages and with 30;
  - a refreshed feed;
  - "450 credits" and "360 credits".

  These give a **different** state:
  - another selected tab or mode;
  - another page title;
  - a modal opened on top.
- **Matching a new observation to a known state:**
  1. An exact match is the same state.
  2. Otherwise, a Jaccard score of 0.85 or more against the best known state is the same state.
  3. Otherwise, if the screen has fewer than 6 elements (a Skia canvas or WebView), a dHash Hamming distance of 10 or less against a known state is the same state. The dHash comes from `state.ts`, with list regions masked.
  4. Otherwise, if the best Jaccard score is between 0.6 and 0.85, the annotator gets thumbnails of the 3 nearest states and returns `sameAs`.
  5. Otherwise it is a new state.
- **Settling:**
  - Poll `elements()` every 400 ms. Stop when two consecutive signatures *and* counter values are equal, or after 4 seconds.
  - After a `consume` action, compare **all text** instead, every 1.5 seconds, for at most 25 seconds. This waits out streamed replies.
  - Take the screenshot *after* the screen has settled.
- **Diffs, "what changes after an action".** Each edge stores:
  - a **counter** effect for each bound numeric element: before, after and delta;
  - texts that **appeared** or **disappeared** (toasts, "+300", replies);
  - `context.selected`: the labels of selected or checked elements at the time of the action, which turns "−90" into "−90 while *Superb* is selected".

  A numeric change on an element that is not bound to a counter is recorded under the resource `auto:<elKey>`. The *identity* diff between two states is the symmetric difference of their signatures, and it is used in the trace.

### 4.3 Choosing actions: code decides, the model advises (`annotate.ts`)

The annotator runs **once per new state**: Sonnet 5 at effort `low`, about $0.02 per call.

- **Input:**
  - the 1024 px JPEG;
  - the element list with ids, rects, short types and text or label;
  - `appName`;
  - the names of the 3 nearest states.
- **Output** (zod):

```ts
{ sameAs: string | null, name: string, kind: ScreenKind, purpose: string, inScope: boolean, scrollable: boolean,
  loginWall: boolean,
  actions: { el: string | null; tapPoint?: { x: number; y: number }   // image coords; vision fallback for canvas
             intent: string; kind: "tap" | "type-send" | "consume" | "scroll";
             priority: 0 | 1 | 2 | 3; input?: string; sendEl?: string; skip?: string }[],
  counters: { name: string; unit: string; el: string }[],
  signals: { kind: "price" | "balance" | "limit" | "ad" | "upsell" | "reward" | "lock" | "timer"; text: string; el?: string }[] }
```

**Priority rules** (in the prompt):

| Priority | What it covers |
|---|---|
| 3 | Unexplored navigation, and anything to do with monetization: credits, store, premium, mode or model picker, limit, check-in, challenges, rewards, paywall, ads |
| 2 | Actions in the core loop |
| 1 | Secondary actions |
| 0 | Destructive or out-of-scope actions |

- `consume` marks actions that spend something (send a message, generate). Code also marks an action as `consume` after the fact if its edge showed a negative counter delta.
- Text to type is short and safe for work, for example "Hi! What happens next?".

**If the annotator fails** (refusal, or invalid output twice), the **heuristic annotator** takes over:
- every element with a label or text that isn't in a repeated group gets priority 1;
- 2 items per repeated group get priority 1;
- the name is the top-most text.

The heuristic annotator is also used for `WebDevice` crawls, where it costs nothing.

**Guard rails** (`guards.ts`) are regexes. The LLM can add skips but never remove these.
- **Destructive:** `/log ?out|sign ?out|delete|remove account|deactivate|report|block|unsubscribe|cancel (subscription|plan)/i`
- **Out of scope:** `/camera|gallery|photo|upload|attach|microphone|voice|record|share|rate us|review|privacy|terms|licen[cs]e/i`
- **Purchases** are protected by structure, not by a regex:
  - tapping a pack is allowed, because it opens the Play billing sheet, which is price evidence;
  - the explorer never acts inside another package;
  - the test account has no payment method.

**Lists:**
- in a repeated group, try 2 members;
- in a navigation group (6 or fewer members, all with different labels), try every member.
- BACK is an explicit action on every state, at priority 0. On the launch screen it exits to the launcher once, and that edge is recorded.

### 4.4 Algorithm (`explorer.ts`)

```ts
async function explore(app: AppCfg, dev: Device, prof: Profile, o: Opts) {
  const g = o.resume ? loadGraph(app) : newGraph(app, dev.screen)
  await dev.launch({ cold: !o.resume })                               // mobile_terminate_app + mobile_launch_app
  let cur = await arrive(g, await observeSettled(dev, "ui"))

  // PHASE 1 — CRAWL
  while (!shouldStop(g, prof)) {         // steps | minutes | usd | stepsSinceNewState >= 30 | device_unhealthy
    const a = nextAction(g, cur, o)      // untried, !guarded, highest priority, then reading order;
                                         // consume allowed only if !o.noConsume && a.tries === 0
    if (!a) {
      const path = bfsToNearestFrontier(g, cur)          // in-app edges with failures <= seen
      if (!path) { g.stopReason = "frontier_empty"; break }
      cur = await travel(g, dev, cur, path)              // verify signature per hop; mismatch → relaunch + replay
      continue                                           // from launch state; 2 failures → target "unreachable"
    }
    trace.decision(cur, a, alternatives(cur))
    const before = g.lastObs
    await perform(dev, g, cur, a)        // re-find el by key → tap centre | tap input, type, tap sendEl |
                                         // swipe (scrolled obs merged into same state) | BACK
    const obs = await observeSettled(dev, a.kind === "consume" ? "content" : "ui")
    if (obs.fg !== app.package) { await handleExternal(g, dev, cur, a, obs); cur = await arrive(g, await observeSettled(dev, "ui")); continue }
    if (cur.visits > 12) a.status = "skipped"            // loop guard
    const next = await arrive(g, obs)                    // match; annotate if new; pause if loginWall && app.login==="manual"
    const fx = diff(before, obs, g.counters)
    recordEdge(g, cur, a, next, fx)                      // effects, context.selected, transcripts for chat replies
    a.status = next.id === cur.id && fx.length === 0 ? "no-effect" : "done"
    cur = next; checkpoint(g)                            // atomic write of graph.json every step (→ --resume)
  }

  // PHASE 2 — GAP CHECK (Opus 5.5 high, ≤2 rounds; cut #2 if behind)
  if (!o.noGap) for (let r = 0; r < 2; r++) {
    const ask = await gapCheck(g)   // input: states + actions with statuses (incl. skipped) + counters + signals
                                    // + checklist {currency, earn source, spend cost, wall, store/prices, subscription,
                                    //   check-in/tasks, ads, entitlements}; output: ≤5 {actionId|stateId+scroll|input} to retry
    if (!ask.length) break
    boostToP3(g, ask); crawlLoop(g, { maxSteps: 25 })     // same loop as phase 1, bounded
  }

  // PHASE 3 — DRAIN PROBE (skipped with --no-consume). Server-side spend can't be undone, so it runs last.
  for (const e of consumeEdges(g).sort(byMostNegativeDelta)) {
    await travelTo(g, dev, e.from); let flat = 0
    for (let i = 0; i < prof.drainMax; i++) {
      await perform(dev, g, e.fromState, e.action)
      const obs = await observeSettled(dev, "content")
      if (obs.fg !== app.package) { await handleExternal(...); break }
      const next = await arrive(g, obs), fx = diff(g.lastObs, obs, g.counters)
      if (next.id !== e.from) { recordEdge(g, e.fromState, e.action, next, fx, { limitHit: true }); break }  // wall
      if (!fx.some(isCounter)) { if (++flat >= 2) break }                                                     // no longer spending
      recordEdge(g, e.fromState, e.action, next, fx)
    }
  }
  finalize(g)   // coverage, stopReason, graph.json, trajectory.md
}
```

**`handleExternal`.**
1. Classify the foreground package:

   | Package | Kind |
   |---|---|
   | `com.android.vending` | `billing` |
   | `com.google.android.gms`, `com.android.credentialmanager` | `signin` |
   | `com.android.chrome` and Custom Tabs | `browser` |
   | `*permissioncontroller*` | `permission` |
   | camera apps | `camera` |
   | `documentsui`, `providers.media` | `picker` |
   | `com.android.settings` | `settings` |
   | `*launcher*` | `launcher` |
   | `android` | `crash` |

2. Save the screenshot and element list. For `billing`, the prices are in the element text.
3. Record the edge `cur → ext:<kind>`.
4. Escape:
   - for `permission`, tap `/don.?t allow|deny/i`;
   - otherwise press BACK up to twice, then `mobile_launch_app`;
   - for `launcher` or `crash`, mark the action `failed` and relaunch.

**A state is done** when every action on it is `done`, `no-effect`, `skipped`, `unreachable` or `failed`.

**The run stops** at the first of these, and the reason goes into `coverage.stopReason`:
- `frontier_empty`;
- `saturated` (30 steps with no new state);
- `budget_steps`, `budget_time` or `budget_usd`;
- `device_unhealthy`.

**Human hook.** If the annotator reports `loginWall` or a captcha:
1. write a `human` event and beep;
2. wait up to 10 minutes for Enter;
3. if nobody answers, skip the state.

**Output:** `out/<app>/explore/<runId>/`, containing `graph.json`, `obs/oNNNN.{png,json}`, `ext/`, `trace.jsonl`, and a `latest` pointer file. The `mock` stage never reads these; only `understand` does.

**Failure handling:**

| Failure | Detected by | Response |
|---|---|---|
| MCP call hangs | client timeout | retry, then respawn, then `mobilecli daemon stop`; logged as `failure` and `recovery` |
| Error returned as text | text regex | `DeviceError`, retried once |
| Empty or very sparse tree | fewer than 3 elements | the annotator's `tapPoint` vision fallback (scaled ×W/1024), and dHash identity |
| Unexpected screen during travel | signature check at each hop | relaunch and replay; after 2 failures, `unreachable` |
| Crash or ANR | launcher or `android` in the foreground | `ext:crash` edge, relaunch, action `failed` |
| Annotation refused or invalid | `RefusalError`, or null twice | heuristic annotator, logged |
| Process crash | – | `--resume` from the per-step checkpoint |

---

## 5. Understand → product model (`src/model`, about 550 lines)

`understand` runs five steps.

1. **`compile`** (deterministic). For each state:
   - Pick a **representative** observation: settled, not scrolled, with the most elements. Scrollable screens also keep one scrolled observation.
   - Write the representative screenshot to `model/screens/<id>.png`: full-screen PNG for `render:"html"` screens, JPEG q85 for the others.
   - Convert rects to dp: `dp = px / (density/160)`.
   - Measure style tokens with `tokens.ts`:
     - background: the mode of the 2 px ring just inside the rect;
     - text colour: the highest-contrast colour inside the rect;
     - screen palette: k-means, top 8;
     - font size: single-line height ÷ 1.2;
     - type scale.
   - Crop image-like elements to `model/assets/`, deduplicated by dHash.
   - Take font families from `assets/fonts/*` in the pulled APK. Commercial fonts get a free look-alike.
   - Resolve each edge's `elKey` to an element id in the representative observation.
   - Classify each transition:
     - **tab:** the selection in a group changed;
     - **modal or sheet:** at least 50% of the previous signature is kept behind a partial overlay; it is a sheet if anchored at the bottom;
     - **push, back or replace:** the rest.
   - Build flows as shortest paths from the launch state to every monetization or leaf state.
   - Build chat transcripts from consume edges.
   - **Redact PII:** blur elements whose text matches an email or phone regex.
   - Choose `render:"html"` for tabs, the screens in named flows, and every screen with signals or a wall. Take the top N by visits under the profile cap. The rest are `image`.
2. **`synthesize`**: one Opus 5.5 call at effort `high`, about $0.40.
   - **Input:**
     - a compact text version of the graph: for each screen, its name, kind, purpose and up to 40 texts; the edges with their effects and selection context; externals; counters; signals;
     - about 12 screenshots: every tab, the wall, the store and paywall, the billing sheet and the check-in.
   - **Output:** the `brief`, the `economy` (without `derived`), flow names, and extra `moments`. Every claim carries `evidence: {obs, el?, quote}`.
3. **`verify`** (deterministic):
   - every quote must appear, ignoring case and whitespace, in the texts of that observation;
   - every number must appear in a quote or in an observed effect;
   - anything that fails becomes `conf:"inferred"` and is flagged in the viewer.
4. **`economics.deriveEconomy`** (pure) and **`moments.detect`** (pure). See §5.2.
5. **Overrides.** Hand corrections go in `out/<app>/model/overrides.json` as a JSON-merge patch keyed by id. They are applied on every load and logged as `human` events, which is how the model answers "what did you fix by hand".

The stage then writes:
- `digest.md`, a deterministic text rendering of 6–12k tokens that the proposer and judge both read;
- `viewer.html`, with:
  - a grid of screens;
  - a table of edges;
  - the economy table with evidence thumbnails;
  - inferred items highlighted.

### 5.1 Types (`src/core/schema.ts`; zod is the source, this is the `z.infer` view)

```ts
export type Id = string;
export interface Rect { x: number; y: number; w: number; h: number }
export type Confidence = "observed" | "inferred";
export interface Evidence { obs: Id; el?: Id; quote?: string; verified: boolean }

export interface ProductModel {
  schema: "simula.product-model/1";
  app: { id: string; package: string; name: string; versionName: string; versionCode: number; capturedAt: string;
         runId: string; accountState: "guest" | "logged-in";
         uiStack: "react-native" | "compose" | "views" | "webview-heavy" | "unknown" };   // from element class names
  device: { widthPx: number; heightPx: number; density: number; statusBarPx: number; navBarPx: number };
  brief: { oneLiner: string; audience: string; coreLoop: string[]; howItMakesMoney: string;
           whatIsScarce: string[]; adsToday: string; openQuestions: string[] };
  regime: "consumable-economy" | "subscription-gated" | "no-scarcity";   // computed from economy (below)
  screens: Screen[];
  edges: Edge[];
  externals: External[];
  economy: Economy;
  moments: Moment[];
  flows: Flow[];
  design: DesignSystem;
  transcripts: { screen: Id; turns: { role: "user" | "app"; text: string }[] }[];
  coverage: Coverage;
  human: { ts: string; note: string }[];
}

export type ScreenKind = "tab" | "page" | "chat" | "modal" | "sheet" | "dialog" | "paywall" | "store" | "webview" | "login" | "other";
export interface Screen {
  id: Id; name: string; purpose: string; kind: ScreenKind; inScope: boolean;
  parent?: Id;                                   // modal/sheet: screen underneath
  signature: string[]; phash?: string;
  observations: Id[]; representative: Id; screenshot: string; scrolledScreenshot?: string;
  scrollable: boolean; visits: number;
  elements: UiElement[];                         // from representative observation, measured
  actions: ActionRecord[];
  bindings: { resource: Id; el: Id }[];          // "e7 displays credits"
  signals: { kind: "price" | "balance" | "limit" | "ad" | "upsell" | "reward" | "lock" | "timer"; text: string; el?: Id }[];
  render: "html" | "image";
}
export interface UiElement {
  id: Id;                                        // "e12" → data-node="e12"
  key: string;                                   // shortType|identifier|maskedLabel|ordinal
  role: "button" | "tab" | "text" | "image" | "input" | "list-item" | "counter" | "toggle" | "container";
  type: string; text?: string; label?: string; identifier?: string;
  rectPx: Rect; rectDp: Rect;                    // full-screen coordinates (edge-to-edge; insets masked in QA)
  style?: { bg?: string; fg?: string; fontDp?: number };
  asset?: Id; flags?: { selected?: true; checked?: true; disabled?: true; focused?: true };
}
export interface ActionRecord {
  id: Id; elKey?: string; kind: "tap" | "type-send" | "consume" | "scroll" | "back";
  intent: string; input?: string; priority: 0 | 1 | 2 | 3; tries: number;
  status: "untried" | "done" | "no-effect" | "skipped" | "unreachable" | "failed"; note?: string;
}
export interface Edge {
  id: Id; from: Id; to: Id | `ext:${ExternalKind}`; action: Id; el?: Id;
  transition: "push" | "tab" | "modal" | "sheet" | "back" | "replace" | "external";
  effects: Effect[]; context: { selected: string[] };
  limitHit?: boolean; seen: number; failures: number; firstStep: number;
}
export type Effect =
  | { kind: "counter"; resource: Id; before: number; after: number; delta: number }
  | { kind: "appeared" | "disappeared"; text: string };
export type ExternalKind = "billing" | "signin" | "browser" | "permission" | "camera" | "picker" | "settings" | "launcher" | "crash" | "other";
export interface External { id: `ext:${ExternalKind}`; package: string; screenshot: string; texts: string[];
                            from: { screen: Id; action: Id }[] }

export interface Economy {
  resources: { id: Id; name: string; unit: string; kind: "currency" | "quota" | "time" | "entitlement";
               shownOn: { screen: Id; el: Id }[]; observedValues: number[]; resets?: string; conf: Confidence; evidence: Evidence[] }[];
  sinks:     { id: Id; resource: Id; amount: number; action: string; edges: Id[]; context?: string; conf: Confidence; evidence: Evidence[] }[];
  sources:   { id: Id; resource: Id; amount: number | null; cadence: "once" | "daily" | "per-task" | "purchase" | "unknown";
               how: string; screen?: Id; conf: Confidence; evidence: Evidence[] }[];
  offers:    { id: Id; kind: "pack" | "subscription" | "trial" | "one-off"; label: string; priceText: string; priceUsd: number | null;
               grants: { resource?: Id; amount?: number; period?: string; entitlements?: string[] }; screen: Id; evidence: Evidence[] }[];
  walls:     { id: Id; edge: Id; resource?: Id; blockedIntent: string; shows: Id; offers: Id[]; declineEdge?: Id; evidence: Evidence[] }[];
  entitlements: { plan: string; benefits: string[]; evidence: Evidence[] }[];
  ads:       { format: "banner" | "interstitial" | "native" | "rewarded" | "sponsored-answer" | "unknown"; screen: Id; el?: Id; evidence: Evidence[] }[];
  derived: {                                     // economics.ts — never an LLM
    unitPriceUsd: Record<Id, { min: number; max: number }>;
    actionCostUsd: { sink: Id; min: number; max: number }[];
    freeDailyUnits: { resource: Id; units: number; buys: string }[];
    viewValueUsd: { US: [number, number]; EU: [number, number]; LATAM: [number, number] };
    unitsPerView: Record<Id, [number, number]>;  // "1 US view ≈ 6.5–10.8 credits at list price"
  };
}
export interface Moment {
  id: Id; type: "wall" | "desire" | "decline" | "post-reward" | "wait" | "hub" | "session-end" | "first-value";
  screen: Id; edge?: Id; resource?: Id; description: string;
  reach: "core-loop" | "frequent" | "occasional" | "rare"; evidence: Evidence[];
}
export interface Flow { id: Id; name: string; kind: "core" | "monetization" | "secondary"; goal: string;
                        steps: { screen: Id; edge?: Id; note: string }[] }
export interface DesignSystem {
  fonts: { family: string; source: "apk" | "lookalike"; file?: string }[];
  palette: { hex: string; share: number }[]; typeScaleDp: number[];
  assets: { id: Id; file: string; fromObs: Id; rectPx: Rect; kind: "icon" | "avatar" | "illustration" | "logo" | "photo"; label?: string }[];
  css?: string;                                  // path of generated design-system CSS
}
export type StopReason = "frontier_empty" | "saturated" | "budget_steps" | "budget_time" | "budget_usd" | "device_unhealthy" | "interrupted";
export interface Coverage { steps: number; minutes: number; usd: number; states: number; edges: number; externals: number;
                            frontierLeft: number; unreachable: number; stopReason: StopReason; humanInterventions: number }
```

### 5.2 Economics and moments (pure functions, fully unit-tested)

**Constants** (`economics.ts`), each citing its KB id:

| Constant | Value | Source |
|---|---|---|
| Gross revenue per view | US $0.012–0.020, EU $0.005–0.009, LATAM $0.002–0.004 | [TRIG-4]/[CORE-4] |
| Non-game haircut | 0.25 | [MEAS-3] |
| Platform share | 0.30 | [inf] |
| COGS: `none` | $0 | [TRIG-4] |
| COGS: `text-cheap` | $0.0018 per message | [TRIG-4] |
| COGS: `text-premium` | $0.009 per message | [inf] |
| COGS: `image` | $0.025 | [TRIG-4] |
| COGS: `voice` | $0.03 per minute | [TRIG-4] |

**`deriveEconomy`:**
- `unitPriceUsd = priceUsd / amount` over the offers that grant the resource;
- `actionCostUsd = sink.amount × unitPrice`;
- `freeDailyUnits` = the sum of daily sources;
- `viewValueUsd` = gross per view × 0.75;
- `unitsPerView = viewValue.US / unitPrice`.

**Regime:**
- `consumable-economy` if there are sinks *and* (walls *or* offers of the resource);
- otherwise `subscription-gated` if there are entitlements or subscription offers;
- otherwise `no-scarcity`.

**`proposalEconomics(p, model)`:**

| Output | Formula |
|---|---|
| gross per view | Σ geoMix × midpoint × 0.75 |
| net per view | gross × 0.7 |
| COGS per view | COGS table × `cogsUnitsPerView` |
| `cogsRatio` | COGS ÷ net |
| impressions per DAU | engagedShare × viewsPerEngager |
| ARPDAU | impressions per DAU × gross |
| annual revenue per 1M DAU | ARPDAU × 1M × 365 |
| `maxDailyEarnUsdAtList` | caps.perDay × reward amount × unitPrice.min |
| `cheapestPaidUnitUsd` | the lowest offer price |

Flags:
- `cogsRatio > 0.6` → "resize reward";
- `cogsRatio > 1` → "COGS exceeds revenue";
- `maxDailyEarn ≥ cheapestPaidUnit` → "cannibalizes cheapest pack".

**`moments.detect`:**

| Moment | Detected from |
|---|---|
| `wall` | edges with `limitHit`, and paywalls reached from a consume edge |
| `desire` | sink action screens, and `lock`/`upsell`/`price` signals outside the store |
| `decline` | BACK or "not now" edges out of a paywall or store |
| `post-reward` | source screens (check-in, challenge complete) |
| `wait` | `timer` signals |
| `hub` | tab screens and the store |
| `session-end` | back edges out of chat |
| `first-value` | the first screen after onboarding. It is **marked as a place where no offer may appear.** |

`reach` comes from flow membership plus visit counts.

---

## 6. Mock generator (`src/mock`, about 600 lines including a 300-line runtime)

**Output.** One static `out/<app>/mock/index.html`, plus `assets/`, which opens from `file://`. It contains:
- the design-system CSS;
- one `<template data-screen="sNN">` per screen;
- `runtime.js` and `rewarded.js`;
- `window.MODEL`, the subset of the model the runtime needs: edges, bindings, counters, transcripts and walls.

There is no framework and no build step. Playwright, QA and the slides all use it directly.

**What the LLM generates:**
1. **The design system.** One Opus call at effort `high`.
   - **Input:** 5 representative screenshots, plus the palette, type scale, radii and fonts.
   - **Output:** CSS variables and component classes for the app bar, tab bar, buttons, cards, list rows, chat bubbles (in and out), composer, modal, sheet, paywall and store tile.
2. **Screen HTML.** One streamed Opus call at effort `high` for each `render:"html"` screen.
   - **Input:**
     - the **full-resolution full-screen PNG**, which is under 2576 px so the coordinates are 1:1;
     - an element spec, one line per element: `id role type text|label rectDp bg fg fontDp asset`;
     - the design CSS and the asset manifest;
     - special roles: counters, messages, composer and send.
   - **Output:** one HTML fragment inside an ```html fence.
   - **Rules in the prompt:**
     - every spec element gets `data-node`;
     - text is copied verbatim;
     - boxes are within 2 dp of the spec;
     - counters get `data-bind="<resource>"`;
     - chat parts get `data-role="messages|composer|send"` and `data-template="user|bot"`;
     - no `<script>` and no `on*` attributes;
     - no status bar, because the frame draws it;
     - no shadows or radii that aren't in the screenshot.

**`validate.ts`** checks each fragment in Playwright:
- no scripts or handlers;
- the only external URLs are Google Fonts;
- at least 90% of the spec's `data-node` ids are present;
- bound counters are bound;
- chat screens have their templates.

If validation fails, the screen is regenerated once with the list of violations, and the best version is kept.

**What `build.ts` and `runtime.js` add deterministically.** The LLM never writes interactions.

- **Navigation.** Each in-scope edge sets `data-go="<to>"` on `[data-node=<edge.el>]`. The transition follows `edge.transition`: push slides in over 250 ms, tabs swap, modals fade, sheets slide up. BACK uses a history stack.
- **External edges** open a grey card, for example "Opens Google Play billing", so the edge of the mock's scope is visible.
- **Simulated backend:**
  - counters start at their observed values, and each edge applies its counter effects;
  - **chat:** Send clones the user template, shows typing dots, and after 800 ms appends the next captured bot reply;
  - **wall guard:** if a consume action would push a counter below its observed cost, the runtime goes to `wall.shows` instead. The mock therefore reproduces the credit wall.
- **Image screens.** The long tail of screens is shown as the screenshot plus invisible hotspots at the element rects. They cost no LLM calls and keep navigation complete. QA labels them as image screens.
- **`rewarded.js`.** Fixed code, configured per proposal. It moves through these states:
  1. **Invite.** The Game Partner's avatar is **the app's own character crop from `design.assets`**. The card shows the reward and "~15 s", with equally sized **Play now** and **No thanks** buttons.
  2. **Game.** A 15-second tap-the-target game with a countdown and a "Sponsored" label.
  3. **Verified.** "Reward verified": grant the reward and return to the saved screen, keeping any unsent draft.

  There is also a **no-fill** path: "No game available right now".
- **Test and slide API.** `window.__mock = {go, state, get, set, applyPatch, openRewarded}`.
  - `?proposal=P3` loads `proposals/P3.patch.json` and its variant templates.
  - `?debug=1` outlines every `data-node` and shows its evidence id on hover.

---

## 7. QA loop (`src/qa`, about 350 lines)

**Rendering.**
- Playwright uses a 411×914 viewport with `deviceScaleFactor: 2.625`. The screenshot is resized to 1080×2400 with sharp.
- DOM boxes are read from `[data-node]` and scaled ×2.625.
- The status and navigation rows (`config/device.json`) are **masked** in every metric, not cropped.

**Metrics** (`compare.ts`, ported from the sketch), for each HTML screen:
- **Per element, matched by `data-node`:**
  - `IoU` of the DOM box against the original rect (a missing element scores 0);
  - text Sørensen–Dice;
  - background ΔE (CIEDE2000), sampled from the ring inside the rect in both images, turned into `colorScore = max(0, 1 − ΔE/20)`.
- **Grayscale SSIM** over the unmasked area.
- **A pixelmatch heatmap.**

**Composite** = 0.35·meanIoU + 0.25·SSIM + 0.20·meanText + 0.20·meanColor.

The composite is used **only** to decide when to stop and which version to keep, because it is lenient: in the sketch simulation, a 60 px shift cost only 0.018. Fixes are driven by the list of measured differences. **Must-fix** differences are:
- a missing element covering at least 1% of the screen;
- a missing or wrong button, tab or counter (Dice below 0.9);
- an unbound counter.

**Loop** (`loop.ts`), one Opus 5.5 call per screen per round at effort `high`.
- **Input:**
  - one sharp composite image with the original, the mock and the heatmap side by side;
  - the 12 worst element differences, ranked by area × error, for example `e14: 18 dp too low; bg #F4F4F6 vs #FFFFFF; "Refill Now" vs "Refill now"`;
  - the current HTML.
- **Output:** the revised HTML, plus a changelog of at most 8 lines.
- A new version is kept only if its composite is at least 0.005 better than the best so far.

**Stop rule.** Stop at the first of:
- composite ≥ 0.90 **and** no must-fix differences;
- a round that improves on the best by less than 0.01;
- the round cap: 3 for the 8 screens that appear in slides, 1 for the rest;
- the QA dollar cap: $10 for the deep app, $2 for the others.

**Flow QA** (`flows.ts`, no LLM). For every in-scope edge:
1. `__mock.go(from)`;
2. click `[data-node=el]`;
3. assert `__mock.state() === to` and that the counter changes equal the edge's effects.

It reports the pass rate and the failures. A failure caused by a missing handler is a compiler bug, fixed in code. A failure caused by a missing element sends that screen back through the fix loop.

**Second agent, optional** (`qa --crawl`, first on the cut list). The same `explore()` runs through `WebDevice` with the heuristic annotator over the mock. The two graphs are then compared: state recall, edge recall, dead ends, and interactions the mock invented. It costs nothing in LLM calls.

**Evidence.**
- `qa/<screen>/r{0..3}/{mock.jpg, heat.jpg, metrics.json, diffs.json, changelog.md}`, with `best.png` saved as PNG.
- `qa/report.html`: one filmstrip per screen (original | r0 | r1 | … | best | heatmap), the metric changes per round, and what each fix changed.

---

## 8. Proposer (`src/propose`, about 200 lines)

**Where its expertise comes from:**
1. **The rewarded-ads KB in full**, in a cached system block of about 16k tokens. There is no retrieval: at this size, putting the whole thing in context beats retrieving chunks. Every chunk has an id that proposals must cite.
   - `kb.ts` **always drops Appendix T**.
   - When the target app is Luzia, `kb.ts` also removes every line that mentions Luzia. That makes Luzia a blind rediscovery test at no extra cost.
2. **The app, only through `digest.md`:**
   - the brief and regime;
   - the economy, including **the derived table**;
   - the moments;
   - the flows;
   - the screen catalogue with ids.

   It also gets 6–8 key screenshots: the wall, the store and paywall, the check-in, the main chat and home. `eval/` is never read.
3. **Simula's vocabulary:** from [POL-8], plus the React Native SDK names.

**Call 1, breadth** (Opus 5.5 `high`). The system prompt is the KB plus these rules:
- use this app's nouns;
- cite KB ids;
- never do arithmetic, only state assumptions;
- never propose on a `first-value` moment;
- keep to SFW surfaces;
- a product change must not remove anything free users get today, unless the proposal flags that as high risk ([AI-X], Duolingo Energy).

The user message contains the digest and screenshots, and asks for three sections, all as structured output:
- **(a) The obvious baseline.** "The 3 ideas a generic ad-ops person would propose here."
- **(b) The moment sweep.** One line per moment: is there a real value exchange here?
- **(c) 10–12 one-line candidates**, each `{title, case, archetype, moment, reward, beyondBaseline}`.

`validateSet()` checks the candidates and retries once with the violations if any check fails:
- at least 3 `existing` and at least 3 `product-change`. When the regime is `no-scarcity`, at least 5 `product-change` are required and none are forced to be `existing`;
- at least 4 distinct archetypes;
- at least 1 reactive surface (wall, desire or decline) and at least 1 proactive one (hub or post-reward);
- at least half with `beyondBaseline`;
- no two candidates with the same (moment, reward).

**Call 2, depth.** It picks the 6 best candidates (4 for the shallow profile), states why, and writes each one out as a full `Proposal`.

**Proposal type:**

```ts
export interface Proposal {
  id: Id; title: string; oneLiner: string;
  case: "existing" | "product-change"; archetype: string /* KB TAX-*|AI-* */; beyondBaseline: boolean;
  anchor: { moments: Id[]; economy: Id[];
            newMechanic?: { name: string; description: string; whyNeeded: string; removesFreeValue: boolean } };
  surface: Id; trigger: string; eligibility: string;        // "non-payers; only after 'Refill Now' is declined"
  offer: { title: string; body: string; cta: string; decline: string };
  simula: { unit: "SIM-RWD" | "SIM-INT" | "SIM-NAT"; entry: "button" | "invitation" | "interstitial";
            gamePartner?: { name: string; asset?: Id }; minPlaySec: number };
  reward: { what: string; resource?: Id; amount?: number; duration?: string; grantOn: "REWARD_VERIFIED" };
  caps: { perDay: number; cooldownMin: number };
  cannibalizationGuard: string;
  assumptions: { geoMix: { US: number; EU: number; LATAM: number }; engagedShare: number; viewsPerEngager: number;
                 cogs: "none" | "text-cheap" | "text-premium" | "image" | "voice"; cogsUnitsPerView: number };
  economics?: { grossPerViewUsd: number; netPerViewUsd: number; cogsPerViewUsd: number; cogsRatio: number;
                impressionsPerDau: number; arpdauUsd: number; annualPer1mDauUsd: number;
                maxDailyEarnUsdAtList?: number; cheapestPaidUnitUsd?: number; flags: string[] };   // CODE fills this
  kpis: { primary: string; guardrails: string[]; holdout: string };
  precedents: string[]; risks: string[]; evidence: Evidence[];
  patch: {
    newScreens:  { id: Id; basedOn?: Id; kind: "modal" | "sheet" | "screen"; change: string }[];
    newElements: { id: Id; in: Id; near: Id; place: "before" | "after" | "overlay"; change: string }[];
    newEdges:    { from: Id; el: Id; to: Id | "rwd"; effects?: Effect[]; guard?: { resource: Id; lt: number } }[];
  };
  storyboard: { phase: "existing" | "mechanic" | "rewarded" | "value"; screen: Id; counters?: Record<Id, number>;
                overlay?: "invite" | "game" | "verified"; callouts: { node: Id; text: string }[]; caption: string }[];
}
```

`propose` then runs `proposalEconomics` on each proposal. It writes `candidates.json` and `candidates.md`. The Markdown file has an empty `label` column so the human can label the candidates **blind**, into `labels.json`, before `judge` runs.

**What a strong OOC run should look like.** This is an eval expectation, never given to the pipeline. The baseline "watch an ad for credits" should survive only in a changed form: a Game Partner game with the story's own character. Its reward should be sized with the exchange rate: one Premium reply (20 credits), not one Superb message (90 credits). Ideas beyond the baseline:
- 2× Daily Check-in;
- sponsored Challenges with a limited badge;
- a Refill Station shown after "Refill Now" is declined;
- "Hear this reply in Premium" as a sample.

The judge should reject or send back "watch an ad to keep credits from expiring", which is loss framing ([ANTI-10]).

---

## 9. Judge (`src/judge`, about 300 lines)

### 9.1 Stage 1: code gates (free, and they run first)

| Check | On failure |
|---|---|
| Schema is valid | REJECT |
| **Grounding:** every screen, element, moment, economy and evidence id resolves; every new id is declared in the patch; the patch applies to the model (the runtime's `applyPatch` runs headless) | REVISE, listing the missing ids |
| **Label:** an `existing` proposal cites at least one `observed` economy item | relabel as `product-change`, then REVISE |
| **Already exists:** the same surface and format are already in `economy.ads` | REVISE |
| **Policy lint:** `/gift card|cash|paypal|crypto|support us|rate (us\|5)|install|tap the ad|click the ad/i` | REJECT |
| **Economics sanity:** `cogsRatio > 1`, or `maxDailyEarn ≥ cheapestPaidUnit` | REVISE |
| **Structure:** `grantOn` is `REWARD_VERIFIED`, `offer.decline` is not empty, `caps.perDay ≥ 1`, there are 4 storyboard phases, and `surface` is not a `first-value` moment | REVISE |

### 9.2 Stage 2: one Opus 5.5 judge call (effort `high`), separate from the proposer

**System block (cached):**
- **Role:** an independent reviewer for Simula's solutions team.
- **KB:** the KB **without Appendix T and without [JUDGE-6]**, and with Luzia lines removed when the target is Luzia.
- **Procedure:**
  1. For each LLM gate, answer yes or no with a quote as evidence.
  2. For each criterion, write the evidence first and the score (1–5) second, using the anchors at 1 and 5 from [JUDGE-2].
  3. Length is not evidence.
  4. Use only the economics computed by code.
  5. Credit specificity only for nouns and ids that exist in the digest.
  6. Name the single most important required change.

**User message:**
- the digest;
- the proposal JSON, which contains no proposer reasoning;
- the computed `economics`;
- the results of the code gates.

**Output:** `{gates:[{gate, pass, evidence}], scores:[{criterion, evidence, score}], requiredChanges:string[], topConcern}`.

**LLM gates** (from [POL-9] and [JUDGE-1]). Each one passes only if the answer is yes. The first three are *policy* gates; a failure on those means REJECT. A failure on the others is *fixable* and means REVISE.
- the surface is SFW, age-appropriate and away from sensitive topics;
- there is no reward for clicks or installs, and the reward is not cash-like;
- the proposal contains no hostage or loss framing and no dark patterns;
- there is an explicit tap to opt in;
- the reward and the required action are disclosed before the ad;
- declining is free and leaves the user where they were;
- it never interrupts a streaming generation;
- it is not offered to subscribers for things they already have.

**Rubric.** Weights follow [JUDGE-2], except that specificity is raised from 5 to 10 and frequency lowered from 10 to 5. Generic proposals are the most common way this kind of system fails, and "go beyond the obvious" is one of the grading criteria.

| # | Criterion | Weight |
|---|---|---|
| 1 | Value and moment fit | 20 |
| 2 | Product and narrative integrity | 15 |
| 3 | Cannibalization safety | 15 |
| 4 | Unit economics (reads the computed numbers) | 10 |
| 5 | Reach and inventory | 10 |
| 6 | Feasibility (SIM-RWD/INT/NAT, SSV, remote config) | 10 |
| 7 | Specificity and originality (this app's nouns and numbers; not obvious) | 10 |
| 8 | Frequency and fatigue | 5 |
| 9 | Measurability (KPI, guardrails, holdout) | 5 |

**Verdict** (`verdict.ts`, a pure function):
- **SHIP:** weighted score ≥ 3.8, every criterion ≥ 3, and every gate passes.
- **REVISE:** 3.0 ≤ weighted score < 3.8, or any criterion ≤ 2, or a fixable gate or grounding failure.
- **REJECT:** weighted score < 3.0, or a policy gate failure, or still REVISE after round 2.

**Revision loop.**
1. A REVISE sends that one proposal back to the proposer's `revise()` call with `requiredChanges` and `topConcern`, but **not the score**.
2. The revised proposal goes through the code gates again.
3. A **fresh** judge call scores it without seeing the earlier score.
4. There are at most 2 rounds. The loop stops early if the weighted score improves by less than 0.2.

Every round is saved to `judgments.json` and `judgments.md`, rejected candidates included. Each record holds the gates, the scores with their evidence, the reasons and the diff between versions.

**Ranking for slides:**
- among SHIP proposals, order by weighted score, with reach as the tie-break;
- take the top 3–4 for the deep app and the top 1 for each transfer app;
- if fewer than 2 are SHIP, add the best REVISE and label it as such.

### 9.3 How we know the judge is good (`npm run eval:judge`, Batch API, about $3)

1. **Calibration on Luzia**, grounded in the Luzia model built overnight.
   - **Positives (5):** Simula's 3 reference patterns (in-chat game when messages run out, the Refills hub, Daily Tasks), plus 2 KB precedents adapted to Luzia (Tapas-style rate-limited unlocks, a Pandora-style session unlock). All are written as `Proposal`s against our model.
   - **Negatives (12):** `--make-negatives` changes exactly one field of a positive, and the human checks each result:

     | Negative | What it tests |
     |---|---|
     | auto-plays in the middle of a response | a gate |
     | the decline option is removed | a gate |
     | a gift-card reward | a gate |
     | "watch or lose your chat history" | a gate |
     | 7 days of Luzia+ per view | cannibalization |
     | offered to subscribers on every app open | eligibility |
     | 20 premium messages per view | economics |
     | a surface that doesn't exist | grounding |
     | **an OOC proposal transplanted onto Luzia** | grounding |
     | a generic "watch a video for coins" | specificity |
     | the entry point buried in Settings › About | reach |
     | a bad proposal padded to 3× its length | verbosity bias |
   - **Invariance items (3):** paraphrased positives. Their score should move by less than 0.2.
   - **Targets and how results are reported:**

     | Metric | Target |
     |---|---|
     | Negatives that SHIP | 0 |
     | Positives that SHIP | at least 4 of 5 |
     | AUC of the weighted score | at least 0.9 |
     | The changed criterion is the lowest score, or its gate fails | at least 80% |
     | Invariance | \|Δ\| < 0.2 |
     | Verdict flips across 2 runs | at most 10% |

     - Report **"caught by code gates" separately from "caught by the LLM judge"**, so the table doesn't overstate what the model does.
     - Tune the rubric wording on half the items and report the other half. Never edit the items.
2. **Human agreement.** Compare `labels.json`, written blind, against the verdicts on the OOC candidates. Report the agreement and discuss every disagreement. The sample is n ≈ 6–8, and the recording should say so.
3. **Rediscovery.** The Luzia run is blind to Simula's slides. Count how many of the 3 slide ideas it found, and what it proposed beyond them. This takes 10 minutes by hand.
4. **Known limitation.** The proposer and the judge are both Opus 5.5. The mitigations:
   - code gates and a code verdict;
   - blind re-judging;
   - economics computed by code;
   - the perturbation test.

   A cross-model judge is listed as a next step.

---

## 10. Slides (`src/slides`, about 300 lines)

1. **Variant screens.** For each SHIP proposal, one Opus edit call per `newScreens` or `newElements` entry.
   - **Input:** the `basedOn` HTML plus `change`, with `design-system.css`.
   - **Output:** new elements carry `data-new`.
   - The mock's validator runs on the result, which is written to `mock/proposals/<pid>/`.
2. **Captures.** Deterministic, in Playwright. For each storyboard phase:
   1. `index.html?proposal=<pid>&slide=1`, where NEW elements get a dashed outline;
   2. `__mock.set(counters)`;
   3. `__mock.go(screen)`;
   4. `openRewarded(invite|game|verified)` when the phase needs it;
   5. a screenshot at DPR 2;
   6. `boundingBox()` of each callout node.
3. **The deck.** `deck.html` has 1920×1080 sections and is exported with `page.pdf()` and as PNGs. There is no PowerPoint.

**Flow slide** (one per SHIP proposal). It answers the brief's 7 questions in the order they are read.
- **Title:** the claim in the user's words, for example "Out of credits mid-story? Play 15 s with Mika, get a Premium reply".
- **Four phones:**
  1. Today: the wall;
  2. What changes: the NEW element;
  3. The offer and the ad: the invite, then the game;
  4. What the user gets: the counter updated, the user back in the story, the draft kept.
- **Arrows and callouts:** SVG arrows between the phones. Numbered callouts sit at the real DOM positions. Captions are at most 12 words.
- **Right-hand rail, "Why this works".** 3 bullets, each built on a number from the model or from `economics.ts`, for example:
  - "every free user hits it after about N Superb messages";
  - "1 US view ≈ 7–11 credits at list price, so the reward is 1 Premium reply";
  - "shown only after 'Refill Now' is declined; at most 3 a day".
- **Badges:** SHIP, the weighted score, and a link to the clickable prototype.

**Details slide** (one per proposal). It covers:
- the trigger and eligibility;
- the reward and caps;
- the economics table;
- the cannibalization guard;
- the KPI and holdout;
- the KB precedent;
- the risks;
- "what the judge changed", when the proposal was revised;
- an **integration snippet** from `integration.ts`, filled from the real `@simula/ads-react-native` 1.4.1 API:

```ts
if (await SimulaAds.checkFrequencyCap("SIM-RWD-<unit>", userId)) return;      // capped → hide surface
const rwd = useRewardedAd("SIM-RWD-<unit>");
rwd.load({ charId, charName, charImage, charDesc });                         // Game Partner = the story's character
// "Play now" → rwd.show(); grant only when rwd.rewardVerified (send rwd.rewardToken to server); on error.code==="no_fill" show fallback
```

**Deck order, per app:**
1. **Recommendation:** one sentence, thumbnails of the 3 flows, and the impact per 1M DAU with its assumptions.
2. **How {app} makes money today:** sources → balance → sinks → wall → store, using real screenshots and observed prices.
3. **Where the moments are:** candidates plotted as existing versus product change, against their scores.
4. **A flow slide and a details slide** for each shipped proposal.
5. **"Ideas we rejected, and why":** every candidate, its verdict and a one-line reason.
6. **Appendix:** method, QA fidelity, cost, limitations.

---

## 11. Report site, trajectory, cost

`npm run report` writes `out/index.html`, one page with a tab per app:

| Tab | Contents |
|---|---|
| Model | `viewer.html` |
| Mock | a link to the clickable mock, plus `?debug=1` |
| QA | `qa/report.html` |
| Proposals and judgments | every candidate and round, rejected ones included |
| Deck | the slides |
| Trajectory | `trajectory.md` rendered, with the failures and recoveries |
| Cost | `cost.jsonl` rolled up by stage and model |

On top of the tabs sit the **transfer scorecard** and the **judge report card**. The recording walks through this page.

**Transfer scorecard** (one row per app):
- steps, states, edges and externals, with the stop reason;
- **explorer recall** against `eval/ground-truth.json`, P0 and weighted;
- mechanics found, and the **regime the system chose**;
- QA composite and flow pass rate;
- SHIP, REVISE and REJECT counts;
- dollars, minutes and human touches;
- "what broke → which generic fix (commit)".

**How recall is scored.** `eval:explorer` runs one Haiku call per app to match ground-truth items against the digest. Items the explorer missed are then checked by hand on the device, once the device is free, and items that don't exist on the device are dropped.

---

## 12. What runs without a device or an API key (this container, CI)

**Verified here:**
- Playwright's Chromium renders at 411×914 dp and DPR 2.625, and bounding boxes come back correct;
- mobile-mcp 1.0.5 installs, and `tools/list` works.

| Test | What it covers | Needs |
|---|---|---|
| unit | `signature` (3 vs 30 messages are the same state; a different tab is a different state; RN `ViewGroup` labels count as chrome), `jaccard`, dHash, `diff`, guards, `classifyForeground`, the MCP error-text parser (with a fake transport), `deriveEconomy` and `proposalEconomics` (checked against the hand-calculated OOC numbers), `moments`, `verify`, `validateSet`, gates, the policy lint, `verdict` thresholds, `compare` (synthetic PNGs), and `kb.ts` (no Appendix T; no JUDGE-6 in the judge's KB; no "Luzia" for the Luzia target) | nothing |
| boundaries | no app strings in `src/`; no device imports downstream; `src/` never reads `eval/` | nothing |
| e2e fixture (`npm run demo`) | `explore` on `fixtures/credit-chat` through `WebDevice` with the heuristic annotator; the **drain probe must reach the paywall** and the explorer must **never tap "Log out"** → understand → mock → flow QA at 100% → propose → judge → slides PDF | `--llm stub` (canned JSON). Once the Mac has recorded one live fixture run: `--llm replay` |
| replay of real deliverables | `npm run all -- --app ooc --from mock --llm replay` | the committed `out/ooc/model` and `cache/llm` |
| Not testable here | live `McpDevice`, live LLM output quality | the Mac |

---

## 13. Which app goes deep, and transfer

**Deep: OOC**, with a hard go/no-go at H3. **Luzia is the fallback.** Switching only changes which `apps/*.json` has `profile:"deep"`, which also demonstrates that there is no app-specific code.

**Why OOC:**
- every message visibly lowers a credit counter, so effects, economy, simulated backend, exchange rate and proposals are all exercised end to end;
- the drain probe hitting "insufficient credits" and landing in the refill store *on its own* is the strongest 30 seconds of the recording;
- OOC has no ads today and is not the app in Simula's slides;
- it is Simula's core category;
- it makes about $7M a month from IAP (a press figure), so cannibalization is a real question for the judge.

**Go/no-go at H3** (`probe` plus a manual check). All of these must be true:
1. Google login works, with no integrity block.
2. The home and session screens each have at least 10 labelled actionable elements.
3. The credit balance can be read as text.
4. Sending one message lowers the balance within 30 seconds.

**Transfer: four apps, four monetization regimes, the same commands:**

| App | Profile | Regime the system should reach on its own | Output |
|---|---|---|---|
| OOC | deep | `consumable-economy`: credits, mode prices, packs, check-in, no ads | full: 14-screen mock, 3 QA rounds on 8 screens, 6 proposals judged, 3–4 flows |
| Luzia | medium | caps, plus a subscription, plus ads already running: `consumable-economy` or `subscription-gated`. Also the judge-calibration app and the blind rediscovery test | 6 screens, 1–2 flows |
| JanitorAI (Safe Mode) | shallow | free chat is unlimited and the paid plan sells perks: `subscription-gated`. Key evidence is the drain probe finding **no wall**, so most ideas should be product changes | 4 screens, 1 flow |
| AOL (inbox blurred, low priority) | shallow | an ad-supported portal: `no-scarcity`, product change required | 4 screens, 1 flow |

**Proof that there is no per-app rework:**
- the boundary test;
- 6-line app JSON files;
- the git log for the transfer window, which contains only generic fixes, each re-checked on OOC in replay.

---

## 14. Model routing and cost

| Purpose | Model | Effort | Calls (deep) | Est. $ |
|---|---|---|---|---|
| Annotate a new state | `claude-sonnet-5` | low | ~70 | 1.4 |
| Gap check | `claude-opus-5-5` | high | 1–2 | 0.3 |
| Synthesize (understand) | opus 5.5 | high | 1 | 0.4 |
| Design system | opus 5.5 | high | 1 | 0.35 |
| Screen HTML | opus 5.5 | high | 14 | 4.0 |
| QA fix | opus 5.5 | high | ~30 | 9.0 |
| Proposer (breadth, depth, ~4 revisions) | opus 5.5 | high | ~6 | 1.2 |
| Judge (6 candidates plus revisions) | opus 5.5 | high | ~10 | 1.2 |
| Slide variant screens | opus 5.5 | high | ~8 | 2.0 |
| **Deep app total** | | | | **≈ $20** |

**Totals:**

| Item | Cost |
|---|---|
| Each transfer app | ≈ $7 |
| Judge calibration (Batch API, 20 items × 2 runs) | ≈ $3 |
| Explorer-recall matcher (`claude-haiku-4-5`, no effort parameter) | ≈ $0.05 |
| **Pipeline** | **≈ $45** |
| **Take-home including development iterations** | **$100–150** (hard cap `SIMULA_BUDGET_USD=150`) |

The ledger replaces these estimates with measured figures.

---

## 15. Hour-by-hour plan (H0 = now; submit by H46; sleep H14.5–21.5 and H37.5–43.5)

**Two tracks:**
- **L** is the Mac: the human, a local Claude Code session and the emulator. Real runs, prompt tuning, reviews and recording happen here.
- **C** is Claude Code sessions in the cloud container. They build modules that don't need a device, test them against the fixture with `--llm stub` or replay, and push to `origin`. **At H0, check that the container can push.** If it can't, C becomes a second local Claude Code session in a git worktree.

The human reviews every merge.

### Day 1: device, explorer, model, first mock

| Hours | L (Mac) | C (cloud) |
|---|---|---|
| H0–0.5 | Write the recording storyboard (§16) against the grading criteria. Create a dedicated adult US Google account with no payment method. Start `npm run device -- setup` (45 minutes of downloads). | Check that git push works. Scaffold `package.json` with npm pins and `tsconfig`. Write `core/{schema,config,llm,trace,run}.ts`, `device/types.ts`, `device/mcp.ts` (ported from `mobile-client.ts`), the unit and boundary tests. |
| H0.5–2.5 | Boot and sign in to Play. Install the 4 apps, turn auto-update off, run `versions` and `pull-apks`, then `snapshot-save fresh`. Log in to OOC, Janitor (Safe Mode) and AOL. Luzia uses limited access. `snapshot-save simula_ready`. **Start OBS recording for every real run from now on.** | `fixtures/credit-chat` and `device/web.ts`. `explore/*`: signature, `arrive`, frontier, settle, `travel`/relaunch, guards, externals, budgets, drain, checkpoint/resume, heuristic annotator. **Exit:** the fixture e2e reaches the paywall and never taps "Log out". |
| **H2.5–3** | **GO/NO-GO:** `npm run probe` on all 4 apps, then the 4 manual checks on OOC. Record the decision with `npm run note`. If an app is blocked, email Yizhen and Athreya in one line. | `annotate.ts` (Sonnet schema and prompt), `gapCheck`. |
| H3–7 | Wire the annotator to live calls. Run 40-step OOC explorations with `--no-consume`, and fix what breaks: timeouts, settle, element keys, escaping from other apps, the chrome rule on the RN tree. **Record S1:** about 60 s of the explorer and the trace. | `model/*`: compile, tokens, redact, synthesize (stubbed), verify, economics, moments, digest, `viewer.html`. |
| H7–8.5 | **Deep OOC run** in the background, about 60–75 minutes: crawl, gap check, drain. Meanwhile, draft the README skeleton and prepare the Luzia calibration positives from Simula's slide text. Keep your hands off the device. | `mock/build.ts`, `runtime.js`, `rewarded.js`, image screens, `validate.ts`. **Exit:** fixture flow QA at 100%. |
| H8.5–10 | `npm run understand -- --app ooc`. **Review the economy by hand (15 minutes)** and put corrections in `overrides.json`. If a P0 item is missing, run a targeted `--resume`. **Record S2:** the drain probe hitting the wall, and the economy table with the exchange rate. | `mock/generate.ts`: design-system and screen prompts, stub tests. |
| H10–13 | `npm run mock -- --app ooc`. Iterate the design-system and screen prompts on 3 screens (home, session, store or wall). Then generate all 14 and click through them. | `qa/{render,compare,flows}.ts` on the fixture. |
| H13–14.5 | Commit and push. **Night batch:** `for a in luzia janitor aol; do npm run explore -- --app $a && npm run understand -- --app $a; done` under `caffeinate -i`. Add a `HUMAN_LOG` note. | Overnight work against the committed OOC model, with stubs: `qa/loop.ts`, `qa/report.ts`; `propose/*`; `judge/*`, including `calibrate.ts` and `--make-negatives`; `slides/*` and `deck.html`; `report.ts`. |

**Day 1 exit:**
- a real OOC model in which the wall and prices were found autonomously;
- every command exists;
- the fixture passes end to end;
- the OOC mock renders;
- segments S1 and S2 are recorded.

### Day 2: QA, propose, judge, slides, transfer, main recording

| Hours | L (Mac) | C (cloud) |
|---|---|---|
| H21.5–22.5 | **First, before anything else opens OOC:** `npm run explore -- --app ooc --resume --steps 15 --no-consume` to capture the first-open-of-day check-in modal, then re-run `understand`. Triage the night runs from `trajectory.md`, and re-run any that crashed. | Fix what the triage finds. |
| H22.5–25.5 | `npm run qa -- --app ooc`. **Record S3:** the QA filmstrip, and a side-by-side click-through where credits drop and then the wall appears. | Finish `report.ts`: tabs, scorecard, cost roll-up. |
| H25.5–27.5 | `npm run propose`. Read every candidate and tune the prompt **once**. **Blind-label** the candidates (10 minutes). Then `npm run judge`. **Record S4:** one REVISE→SHIP and one REJECT. | Write the 5 Luzia calibration positives against the night Luzia model. Generate the negatives. |
| H27.5–29.5 | Hand-check the negatives. Run `npm run eval:judge` (Batch). Tune the rubric wording on the dev half and report the held-out half. | `slides/integration.ts`, and polish the deck template. |
| H29.5–32 | `npm run slides -- --app ooc`. Polish the template by hand **once**. **Record S5:** walk through 2 flows and click through one prototype. | Prepare the transfer runs. |
| H32–34.5 | Transfer: `npm run all -- --app <a> --from mock` for Luzia, Janitor and AOL **in parallel** (no device needed). Run `eval:explorer` for each app, and check the misses by hand on the now-free device. Fill in the scorecard. Compare the blind Luzia output with Simula's slides. Make generic fixes only. **Record S6.** | README, the ADRs, the cost roll-up, the trajectory summaries. |
| H34.5–35.5 | Freeze. Run `npm test`, then a fresh clone with `npm ci && npm run demo && npm run all -- --app ooc --from mock --llm replay`. Commit `cache/llm` and `out/`. | Check the README line by line against the brief's list of deliverables. |
| H35.5–37.5 | **Main take:** rehearse once, then record 13–14 minutes, cutting S1–S6 into the walkthrough of the report site. | – |

### Final morning

| Hours | Work |
|---|---|
| H43.5–45 | Watch the take at 1.5× with the grading criteria next to it. Re-record the 1–2 weakest segments. Fix factual slips. |
| H45–46 | Final push, tag `submission`, submit through the link, email Yizhen. |
| H46–48 | Buffer. |

**Time allocation** (stated in the README):

| Share | Work |
|---|---|
| ~55% | OOC end to end |
| 15% | transfer |
| 15% | judge evaluation and the deck |
| 15% | README, trajectory, recording |

---

## 16. Recording outline (target 13:30; the report site is the spine)

| Time | Segment | On screen | The point it makes |
|---|---|---|---|
| 0:00–0:40 | Thesis | "Understand the app as an economy; one product model; compile everything else from it" | the architecture in one sentence |
| 0:40–1:40 | Architecture | The pipeline diagram and the table of what code and models decide. Why Android: the iOS Simulator can't install App Store apps. Why the explorer is code plus an LLM per screen rather than an LLM calling MCP tools: cost, replay and debugging. LLM-Explorer reported $0.11 against $16 for DroidAgent. | technical maturity |
| 1:40–3:40 | **Explore** (S1, S2) | A sped-up OOC run with the trace alongside. The chosen action and the reason for it. State identity: 3 messages and 30 are the same state. The **gap check** finding the earning source. **The drain probe hitting "insufficient credits" and landing in the store.** The billing sheet recorded as an external and escaped. One real failure and its recovery. The stop reason. | how the agent decides what to explore |
| 3:40–4:40 | **Understand** | The viewer: the economy with evidence thumbnails; "−90 while Superb is selected"; **the exchange-rate line**; one item downgraded to "inferred"; the human override. | what was learned, and how it is represented |
| 4:40–6:30 | **Mock and QA** (S3) | The original and the mock side by side. A click-through that reaches the wall. `?debug=1`. The QA filmstrip and one fix changelog. The flow pass rate. Where fidelity is still weak. | the mock is generated from the model |
| 6:30–7:30 | **Propose** | The moments. The obvious baseline written out, then the sweep beyond it. One proposal with numbers computed by code. | curiosity |
| 7:30–9:30 | **Judge** (S4) | Code gates, then the judge's evidence and scores. REVISE→SHIP with the diff. A REJECT and its reason. **The report card**, including what code caught versus what the LLM caught. Human agreement and disagreements. | judgment, and a judge that is shown to be good |
| 9:30–11:00 | **Flows** (S5) | 2 OOC flow slides, read at the pace of a product team. A click-through of the prototype. The integration snippet in Simula's own SDK. | "put this in front of the product team" |
| 11:00–12:15 | **Transfer** (S6) | The scorecard: 4 apps, 4 regimes. An AOL or Janitor product-change flow. The Luzia blind rediscovery compared with Simula's slides. `git grep` finding no app names in `src/`. | a system, not a demo |
| 12:15–13:30 | Honest wrap-up | The cost ledger, the autonomy ratio, `HUMAN_LOG`. Limitations: manual logins, emulator only, sparse Skia trees, the same model family judging, a small human sample. Productionization. Next steps: iOS through the same `Device` interface, incremental re-explore, a cross-model judge, learning from deal outcomes. | clarity |

---

## 17. Risk register

| # | Risk | Likelihood / impact | Mitigation | Trigger |
|---|---|---|---|---|
| 1 | OOC or Janitor refuses the emulator or login (Play Integrity, App Check) | M/H | Go/no-go at H3. Luzia is the deep fallback and needs no login. Physical phone over USB via `ANDROID_SERIAL`. Email early. Never spoof. | the probe fails |
| 2 | Sparse RN/Skia trees cause missed actions or merged screens | M/M | Annotator `tapPoint` vision fallback; dHash tie-break; asset crops from pixels. If annotator names differ for one signature, split the state by adding the title token. | fewer than 3 elements on a key screen |
| 3 | Streaming replies and animations stop the screen from settling | H/M | Animations off; content-aware settle of 25 s; the on-device server dumps anyway after 2 s. Slow settles are flagged in the trace. | settle timeouts in the trace |
| 4 | Credits are drained and can't be restored; the check-in appears once a day | H/M | `--no-consume` on dev runs; drain once, last; day-2 first-open capture; daily check-in refill; a spare account only if needed. | balance below 200 |
| 5 | mobile-mcp hangs (`execFileSync`, no timeout on most calls) | M/M | 45 s client timeout, respawn, `daemon stop`, sequential calls. | timeouts |
| 6 | **Proposals read as generic**, the top risk with the evaluators | M/VH | Economy-first numbers; baseline stated first; moment sweep; specificity at 10%; the diversity validator; a manual check against the OOC expectations in §8 before the judge runs. | a candidate without app nouns |
| 7 | The judge looks like a rubber stamp | M/H | Verdict computed in code; JUDGE-6 excluded; single-fault negatives; code and LLM catches reported separately; rejected ideas shown in the deck; human disagreements discussed. | all candidates SHIP |
| 8 | Mock fidelity is mediocre on art-heavy screens | M/M | Measured tokens and native crops; full-resolution input; keep-best; effort on the 8 slide screens; image screens for the long tail, labelled honestly. | composite below 0.8 |
| 9 | The slides aren't ready for a product team | M/H | Template polished once by hand; the recommendation first; captions of 12 words or fewer; callouts at real DOM positions. | – |
| 10 | Time runs out on the last mile | H/H | Downstream stages are built overnight against fixtures; segments are recorded as they work; a fixed 2-hour recording block plus a morning re-take; the cut order below. | behind at H24 |
| 11 | The container can't push to GitHub | M/M | Checked at H0. Fall back to a second local session. | push fails |
| 12 | Cost overrun or refusals (Janitor content) | L/M | Per-stage and global caps; the cache; refusals become typed events with a fallback; Safe Mode. | ledger above $120 |
| 13 | PII, NSFW content or a real purchase in the deliverables | L/H | Dedicated account with no payment method; never act inside `com.android.vending`; generic PII blur; Safe Mode; review before commit. | – |
| 14 | The UI changes mid-run (Play auto-update, OTA JavaScript updates) | L/M | Auto-update off; `versionName`, `versionCode` and `capturedAt` recorded in the model; drift noted as a production trigger. | – |
| 15 | The flat MCP element list is too lossy (no clickable, scrollable or hint) | M/M | The annotator infers what is actionable and scrollable. Contingency, **only if the probe shows it's needed:** a read-only `mobilecli dump ui --format raw` source through the ported `fromMobilecliJson`, verified at H3. | probe element counts |

**Cut order if behind** (cut the first item first):
1. `qa --crawl`
2. the gap check
3. AOL reduced to model, proposals and judge, with no mock or slides
4. QA rounds reduced from 3 to 2
5. the calibration set trimmed to 12 items and 1 run
6. Janitor reduced to model, proposals and judge

**Never cut:**
- OOC end to end;
- rejected candidates with their reasons;
- the judge report card;
- the transfer scorecard for at least 3 apps;
- the trajectory, cost ledger and `HUMAN_LOG`;
- the recording.

**Simulated:**
- the ad itself (invite, 15-second game, verified);
- chat replies, which are the captured replies replayed;
- the backend (counters, effects, the wall guard);
- revenue, from an explicit table of assumptions.

**Done by hand, and logged:**
- accounts, logins and installs;
- the go/no-go decision;
- the 15-minute economy review, stored as overrides;
- the blind labels;
- the calibration positives and the check of the negatives;
- one pass of polish on the deck template;
- checking recall misses on the device.

**Deliberately cut:**
- iOS;
- agent frameworks;
- a vector database or RAG;
- the persona panel and pairwise tournament;
- the cold-read test;
- APE refinement;
- DCGen region repair;
- React or Vite mocks;
- `.pptx` output.

---

## 18. Productionization sketch (README section and the last slide)

- **Storage and versioning.**
  - Blobs (screenshots, element lists, assets, HTML) are content-addressed in S3 or GCS and deduplicated across runs.
  - Artifact JSON references blobs by hash, and each stage manifest records the hashes of its inputs, so a stage re-runs only when its inputs change.
  - Postgres holds `apps`, `versions`, `runs`, `artifacts`, `proposals`, `judgments` and `outcomes`.
  - A model version is keyed by `(package, versionCode, uiFingerprint)`, where the fingerprint is the set of signatures along the core flows. This catches over-the-air JavaScript updates, which OOC and Janitor ship without changing `versionCode`.
  - `simula diff` between two model versions shows screens, walls, prices and offers that were added, removed or changed. That diff is itself a sales signal.
  - Human overrides are keyed by stable element keys, so they survive re-exploration.
- **What triggers a re-explore:**
  1. a daily poll of Play's `versionCode`;
  2. a weekly smoke replay: no LLM, about 3 minutes, replaying the core flows and the path to the store and wall. Drift above 10%, or any price change, triggers an **incremental** re-explore that starts from the known graph and annotates only new signatures, at about 20% of the first-run cost;
  3. a new Simula ad format, which triggers re-proposing only;
  4. a request from sales.
- **Where humans review:**

  | Step | Time |
  |---|---|
  | App onboarding: account, login, snapshot | 15 min |
  | **Economy review**, the highest-leverage step | 10 min |
  | Deck approval before any customer sees it | 15–30 min |
  | Exception queue: blocked apps, `device_unhealthy` runs | as needed |
  | Monthly judge audit: 20 labels plus live outcomes | 1 h |

- **Cost per app:**

  | Tier | LLM | Emulator time | Human time | All-in |
  |---|---|---|---|---|
  | Prospect scan (60 steps, understand, 4 proposals judged, no mock) | $3–5 | ~0.5 h | 0 (login pool) | ≈ $5 |
  | Pitch pack | ≈ $20–25 | ~1.5 h on KVM Linux, $1–2 | 45–60 min | ≈ $80–120 |
  | Refresh | ≈ $3–6 | | | ≈ $10 |

  People are the dominant cost, so product effort goes into faster review.
- **Sales and integration.**
  1. Scans rank hundreds of apps by an opportunity index: has a wall or currency, how often users reach the key moment, category fit, installs. Each app gets a one-line hook, for example "free users hit a 90-credit wall with only a $1.39 pack as the way out".
  2. The deck, the clickable prototype and a sizing sheet (the prospect's DAU and geo mix run through `economics.ts`) are attached to the CRM deal.
  3. Each SHIP proposal's integration snippet and spec becomes the implementation ticket. It covers:
     - the unit and entry point;
     - eligibility;
     - caps in remote config;
     - SSV on `REWARD_VERIFIED`;
     - a user-randomized holdout with IAP and subscription guardrails ([MEAS-5]).
  4. After launch, opt-in, completion, ARPDAU and the IAP guardrail flow back as `outcomes`. They update the economics priors and add labelled items to the judge's calibration set.
