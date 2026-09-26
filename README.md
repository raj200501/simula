# Simula App Monetization Agent

[![ci](https://github.com/raj200501/simula/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/raj200501/simula/actions/workflows/ci.yml) Every push runs the typecheck, the full offline test suite (including the whole pipeline end to end on a bundled fixture app) and the no-key demo.

**Thesis: understand the app as an economy.** The explorer drives a real Android app through mobile-mcp and measures what users do, what each action costs (when the app shows or meters it), where free users hit a wall and what the app sells. It writes that into **one evidence-backed product model**: every price, cost and wall is quoted from the screen or measured as a counter change, then verified in code. **Everything else is compiled from that model:**
- the 1:1 interactive mock and its QA loop;
- rewarded-ad proposals, as typed patches to the model;
- the judge, which checks each proposal against the same model;
- the slide flows, which are screenshots of the patched mock.

Code owns control flow, state identity, arithmetic and verdicts. Models answer narrow, schema-bound questions. Every call is cached and replayable, and falls back to a deterministic stub.

**What the economy model actually holds, per app.** The thesis is fully exercised only where the app meters something a guest can spend. On the real apps it was partly:

| App | Explored | Economy in the model | Spend measured by the drain probe |
|---|---|---|---|
| **Luzia** (deep) | 38 screens, 171 transitions, 175 steps | subscription-gated: Luzia+, account access and an AI usage quota; 6 walls, each quoted from its screen; no prices shown to guests | **no**: the final run never got back to a chat (see [Limitations](#limitations)) |
| Janitor | 16 screens, 60 steps (signed in) | subscription-gated: the Janitor Plus paywall; nothing consumable | no metered resource seen |
| AOL | 17 screens, 60 steps (guest) | no scarcity: 8 ad placements, no resources, so every idea must be a product change | nothing to spend |
| Fixture (ours) | 8 screens | a consumable economy: 3 priced packs, 2 sinks, the out-of-credits wall | **yes**: the probe spends the balance down to the wall |

So on Luzia, code prices rewards by what they cost to serve against what a view earns, not by an in-app exchange rate.

---

## Brief → artifact

`<app>` is `luzia` (deep), `janitor` or `aol` (transfer), or `fixture` (the bundled demo app).

| Assignment deliverable | Where it is |
|---|---|
| **Results at a glance** (browsable on GitHub, no clone) | [`out/README.md`](out/README.md): per app, the lead flow as a GIF played in the generated mock, the shipped flow slides, the real-app vs. mock screenshots with scores, and links to every artifact. `out/<app>/NUMBERS.md`: every figure (coverage, measured caps, exchange rate, verdicts with why the others failed, judge self-check, QA, cost) read from the artifacts |
| **Code**: explorer, mock generator, QA loop, proposer, judge. One command per stage | `src/explore`, `src/model`, `src/mock`, `src/qa`, `src/propose`, `src/judge`, `src/slides`. Run `npm run <stage> -- --app <app>` ([per-stage commands](#run-it-on-the-real-apps)) |
| Required models, keys, emulator, services | [Requirements](#requirements) |
| **Product model** (Goal 1): what was explored, what was learned, how it is represented | `out/<app>/model/product-model.json` (schema: `src/core/schema.ts`), `digest.md` (what the proposer and judge read), `viewer.html` (human view: economy with evidence, screens, flows, coverage and what was *not* explored) |
| "Could another agent mock the app from your output alone?" | Yes. Downstream stages read only the model directory (enforced by `test/boundaries.test.ts`); `--model-dir <dir>` runs the mock from a copied model |
| **Mock + QA evidence** (Goal 2) | `out/<app>/mock/index.html` (clickable, opens from `file://`). `out/<app>/qa/report.html`, with per screen and round: `mock.png`, `heat.png`, `metrics.json`, `diffs.json`, `changelog.md`. Flow QA replays every model edge on the mock |
| **Proposals** (Goal 3): existing opportunity vs product change | `out/<app>/proposals/candidates.md`: baseline ideas, moment sweep, all ideas, full proposals with `case: existing / product-change` |
| **Judge scores and reasoning for every candidate, rejected ones included** | `out/<app>/proposals/judgments.md` (gates, 9-criterion rubric, verdict, required changes, every revision round). The deck's "Ideas we rejected" slide |
| "How do you know the judge is good?" | `npm run eval:judge` writes `out/<app>/proposals/judge-eval.md`: a single-fault confusion table (known-good positives built from the KB precedents that fit the app, 3 on Luzia; each negative breaks one field of a positive), showing whether code or the LLM caught each fault |
| **Rewarded flows** (Goal 4): state → mechanic → ad → value | `out/<app>/slides/deck.pdf` / `deck.html` / `png/`. `flow-<Pn>.gif`: the lead flow played in the mock (the game runs, the reward lands in-app). Every SHIP gets a 5-frame flow slide (Today → What changed → Offer → Ad plays → Value received, with the trigger arrow and a "why" rail) plus a details slide (economics, KPI, holdout, SDK snippet) |
| **Trajectory**: what ran on its own, where it failed, what was fixed by hand | `out/<app>/trajectory.md` (rendered from `trace.jsonl`), `out/<app>/HUMAN_LOG.md`, `out/<app>/<stage>/manifest.json` (inputs by sha256, outputs, status, LLM calls) |
| **Cost** | `out/<app>/cost.jsonl` (one row per model call: stage, model that answered, tokens in/out/thinking, ms, cached). Rolled up in the deck appendix and on `out/index.html` |
| **Recording** (10–15 min) | Linked in the submission |
| **Productionization sketch** (Goal 5) | [Below](#productionization-sketch), plus the last slide of every deck |
| Test apps | Luzia deep. Janitor and AOL for transfer, with no per-app code. OOC is recorded as blocked (it kills itself on the emulator; see [Decisions](#decisions)). Scorecard across all apps: `out/index.html` |

---

## Quickstart: no device, no key (about 5 minutes)

```bash
npm ci
npx playwright install chromium
open out/index.html        # the committed results for Luzia, Janitor and AOL (Linux: xdg-open)
npm run demo               # the fixture app, end to end, stub LLM, into out/demo/
open out/demo/index.html
```

What `npm run demo` does:
- It runs every stage on `fixtures/credit-chat`, a small web app built to be adversarial: a hidden balance, a mic that turns into Send, a sponsored card, a "Log out" row, a billing sheet and an out-of-credits wall.
- It uses the same explorer, driven through Playwright instead of mobile-mcp.
- Every model call is replaced by its deterministic stub (`--llm stub`), and outputs are marked `stub`.
- It writes to `out/demo/`, which is git-ignored, and never touches the committed results in `out/`. Add `--out-root <dir>` to write elsewhere.
- Expected result: 8 screens, a `consumable-economy` model (3 packs, 2 sinks, 1 wall), flow QA 100%, 3 SHIP / 1 REJECT, a 12-slide deck.

Checks: `npm test` (offline, about 3 minutes, including a full pipeline run on the fixture) and `npm run typecheck`.

---

## Run it on the real apps

Emulator, app installs and account setup: **[docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md)**.

```bash
cp .env.example .env                      # put GEMINI_API_KEY (free) or ANTHROPIC_API_KEY in it
npm run doctor                            # node, key, adb, emulator, mobile-mcp, playwright
npm run probe -- --app luzia              # one-screen go / no-go on the device

npm run explore    -- --app luzia         # device -> out/luzia/explore/<run>/graph.json
npm run understand -- --app luzia         # graph -> product model (+ digest, viewer)
npm run mock       -- --app luzia         # model -> clickable HTML mock
npm run qa         -- --app luzia         # mock vs original: diff, fix, keep best; flow QA
npm run propose    -- --app luzia         # rewarded-ad candidates (KB-grounded)
npm run judge      -- --app luzia         # code gates -> rubric -> verdict in code -> <=2 revisions
npm run eval:judge -- --app luzia         # judge confusion table
npm run slides     -- --app luzia         # SHIP proposals -> patched mock -> deck.pdf
npm run report                            # out/index.html, out/README.md, out/<app>/NUMBERS.md

npm run all -- --app janitor              # every stage in order, then the report
npm run note -- --app ooc "OOC exits on launch (AppSecurity D11001); recorded as blocked"
```

Useful flags:

| Flag | Effect |
|---|---|
| `--llm record` (default) | Use the cache; call the model on a miss |
| `--llm replay` | Cache only, no key needed |
| `--llm stub` | No model calls at all |
| `--llm live` | Always call the model |
| `--out-root <dir>` | Write outputs under `<dir>` |
| `--model-dir <dir>` | Read the model from another directory (cold-mock test) |
| `--profile deep\|medium\|shallow` | Override the app's step and round budgets (`config/profiles.json`) |
| `explore --steps N` | Cap the number of explore steps |
| `explore --annotator heuristic` | Annotate screens without a model |
| `explore --resume` | Continue the last explore run |
| `explore --no-consume` | Never spend the app's currency |
| `all --from <stage>` | Start `all` at that stage |

---

## Requirements

| Need | What exactly |
|---|---|
| Node | **Node 22+ with npm.** Not pnpm: its layout breaks mobile-mcp's `mobilecli` lookup, and `npm run doctor` checks for this |
| LLM key (only for `--llm record/live`) | **`GEMINI_API_KEY`**: a free Google AI Studio key, which is what this submission ran on. **Or `ANTHROPIC_API_KEY`**. The provider is picked from whichever key is set (`SIMULA_PROVIDER` forces one) |
| Models | **Gemini:** configured as `gemini-3.8-flash` for synthesis, HTML, QA fixes, proposals and judging, and `gemini-3.5-flash-lite` for per-screen annotation. When a model is busy (503) or out of its daily quota, the call moves along `gemini-3.7-flash` → `gemini-3.6-flash` → `gemini-3.5-flash` → `gemini-3-flash-preview` → `gemini-2.5-flash` → `gemini-3.1-flash-lite` → Flash-Lite (each free model has its own daily quota). **In the committed runs the free Flash quotas were mostly spent, so about 9 in 10 live calls were answered by Flash-Lite** (`gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`); `cost.jsonl` names the model for every call. **Claude:** `claude-opus-5` for everything |
| Model overrides | `SIMULA_MODEL`, `SIMULA_MODEL_FAST`, `SIMULA_MODEL_FALLBACKS` (comma list), `SIMULA_RPM`, `SIMULA_BUDGET_USD`, `SIMULA_LLM` |
| Free-tier limits | About **20 requests per day per Flash model** (resets at midnight Pacific), plus per-minute limits. The ledger records the model that actually answered. When every model is out of quota, the stage falls back to its stub and marks it. Re-running the next day reuses every cached call |
| Android | Android SDK `platform-tools`, `emulator` and `system-images;android-35;google_apis_playstore;arm64-v8a`. AVD `simula_pixel_8_api35` (Pixel 8 profile, Android 15, Play Store). Java 17+. `bash scripts/device.sh setup\|boot\|install\|versions` |
| Accounts | A Google account with **no payment method** (for Play Store installs). Per-app logins: Janitor with Google sign-in; AOL is skipped (guest); Luzia needs none (guest). A person does every sign-in; the explorer never types credentials |
| Device control | `@mobilenext/mobile-mcp` **1.0.5**, pinned as an npm dependency and spawned over stdio |
| Browser | Playwright **1.56.1** Chromium (`npx playwright install chromium`), for the mock, QA renders, slide captures and PDF export |

---

## Architecture

```
apps/<id>.json  (package, login, profile: the ONLY per-app input)
      │
Android emulator ⇄ mobile-mcp 1.0.5 (stdio) ⇄ EXPLORE ──► graph.json + obs/*.png + trace.jsonl
   (fixture: Playwright WebDevice)          code drives: frontier, state identity, guard rails,
                                            drain probe to the wall; LLM annotates each NEW screen once
                                                   │
                                                   ▼
                                  UNDERSTAND ──► product-model.json + digest.md + viewer.html
                        compile (code) → synthesize (1 LLM call) → verify quotes & numbers (code)
                        → economics, regime, moments, flows (code)
               ┌──────────────────────────┬───────────┴───────────────┐
               ▼                          ▼                           ▼
     MOCK: LLM HTML per screen    QA: Playwright render vs      PROPOSE: KB in context; baseline →
     (spec renderer fallback) +   original → element diffs →    moment sweep → ideas → full proposals
     fixed runtime (router,       LLM fix → keep-best; flow     (economics computed in code)
     counters, chat, wall,        QA replays every edge                   │
     rewarded overlay, patches)                                           ▼
               │                                         JUDGE: code gates → LLM rubric → verdict in
               │                                         code → ≤ 2 blind revisions → portfolio check
               │                                         (near-duplicate SHIPs); eval-judge
               └────────────────► SLIDES ◄──── SHIP proposals = model patches → patched mock →
                                    │           Playwright captures → deck.html / .pdf / png
                                    ▼
                          REPORT: out/index.html (scorecard, links to every artifact)
```

Agents never message each other: stages share context only through typed, schema-validated files on disk.

| Deterministic code | Model (schema-bound, cached, with a stub fallback) |
|---|---|
| Device I/O, settling, signatures and state matching, frontier and action choice, guard rails (never log out, buy or tap an ad), drain probe, effect diffs, stop rules | Per new screen: name, kind, scope, action priorities, text to type, counters, monetization signals |
| Compile: representative observations, dp conversion, colour and type tokens, asset crops, PII blur. Quote and number verification. **All economics** (unit prices, exchange rate, cannibalization, cost to serve). Moments and flows | Brief, economy items with evidence, flow names (one call) |
| Mock runtime, HTML validation, spec renderer | Design CSS, HTML per screen, QA fixes, variant screens for slides |
| QA metrics (IoU, SSIM, text, ΔE), keep-best, stop rule, flow replay | — |
| Set validator, grounding, policy and economics gates, **verdict thresholds**, portfolio check (near-duplicate SHIPs), calibration counts | Ideas and proposals, rubric scores with evidence, required changes, revisions |
| Slide capture, callout placement, PDF, SDK snippet | — |

---

## Decisions

| Choice | Alternative | Why |
|---|---|---|
| Android emulator (Play image) | iOS Simulator | The Simulator can't install App Store apps. The Play image installs the real apps by package id |
| Code-driven explorer with an LLM advisor | An LLM driving mobile-mcp tool calls directly | Reproducible frontier, stop rules and guard rails. The model is asked one small question per new screen, not asked to steer. Cheaper and replayable |
| Accessibility tree + screenshot per state, chrome-token signatures | Screenshot-only states | Stable identity (chat content doesn't create new states), element rects for the mock, and text for verification |
| Drain probe: spend until the wall | Only read prices | The wall and the per-action cost are the monetization moment. Measuring them is what makes the model an economy, not a sitemap |
| Flat typed files on disk (a blackboard) | Agent-to-agent messaging | Every stage can be re-run, cached, inspected and diffed. The product model is the single contract |
| LLM HTML per screen + a deterministic spec renderer + a fixed runtime | Generating a React app | It opens from `file://` with no build. The runtime (router, counters, chat replay, wall, rewarded flow) is code, so navigation and QA always work; the model only paints |
| Economics in code | Let the model estimate revenue | Numbers on slides must trace to observed prices and cited constants. The model states assumptions only |
| Exchange rate at list price, or at cost to serve when the app shows no prices | Skip the number for apps without prices | A guest chat that caps free messages but never shows a price still gets a headline: one completed view is measured against what a message costs to serve (net of platform share), and rewards are sized to that break-even |
| Verdict in code from rubric scores and gates | The judge LLM says SHIP or REJECT | Thresholds are explicit and testable. Only SHIP becomes a slide; REVISE is never promoted |
| Gemini free tier, with a Claude path kept | A paid model only | $0 to run end to end. The fallback chain and cache absorb 503s and quotas. The same code runs on Claude by setting a key |
| Luzia as the deep app | OOC | OOC's AppSecurity module kills the process about 0.8 s after launch on the Google Play emulator (logcat `Kill Process … [D11001]`). That is documented as blocked, not bypassed. Luzia has the richest guest experience to go deep on: chat, image tools, services, and sign-up and subscription walls |

---

## Cost, trajectory, HUMAN_LOG

- **Cost.** Every model call appends a row to `out/<app>/cost.jsonl`:
  - stage and purpose;
  - requested model and the model that answered;
  - tokens in, out and thinking;
  - latency;
  - whether it came from cache.

  The Gemini free tier bills $0, but tokens are still logged, so the ledgers can be priced: at `claude-opus-5` list prices with no prompt caching, Luzia's ledger (every run, including the repeated proposal and judge runs) comes to about $47, Janitor's $22 and AOL's $20. Cached calls replay at no cost, so `--llm replay` reproduces a run without a key.
- **Trajectory.** `trace.jsonl` records every decision, failure, recovery, budget stop, human step and stop reason. `trajectory.md` renders it (phases, discovery over time, failures paired with recoveries, autonomy ratio). Each stage's `manifest.json` pins its inputs by sha256.
- **HUMAN_LOG.** Anything a person did goes into `out/<app>/HUMAN_LOG.md` and the trace, through `npm run note -- --app <id> "…"`: a sign-in, a blocked app, a re-run after a code fix. Edits to the product model would go through `model/overrides.json` (a JSON-merge patch keyed by item id, re-applied on every load and logged as a human step); none of the committed models has one. The only hand edits to artifacts are privacy redactions.

---

## Limitations

- **OOC could not be explored** on the emulator (self-termination, above). It is covered by a note, not a model.
- **Luzia's free-message cap was not measured in the final run.** In earlier runs the drain probe sent guest messages and got replies (about 5 in one run) with no cap showing, then lost the chat between sends: a composer that never exposes its text, keys scrambled by the keyboard, and flaky navigation back to the thread. Each cause is fixed and covered by a regression test (see the commit history), but in the final deep run the probe could not get back to a chat at all (0 sends). So Luzia's model is subscription- and sign-up-gated (six walls, all quoted from the screens), and the obvious Luzia flow, a refill when free messages run out, is not in this run. The capped case is exercised end to end on the fixture and in `test/proposejudge.entitlement.test.ts`.
- **Janitor was explored signed in.** The account's handle and join date are redacted in the current files (text replaced, screenshots blurred). AOL's run opened Chrome's first-run screen, which showed the device owner's name; that screenshot was removed and the name replaced in text.
- **Free-tier models.** Output quality depends on which Flash model answered; under quota pressure, calls fall back to Flash-Lite (which answered most calls in the committed runs) and then to stubs. `cost.jsonl` shows which model answered each call. The judge and the proposer are the same model family, so the judge has a shared blind spot. `eval:judge` measures the judge only on single-fault items built from KB precedents.
- **Only the most important screens are rebuilt as HTML.** The profile caps HTML generation (`htmlScreens` in `config/profiles.json`: 10 on the deep profile used for Luzia, 4 on the shallow profile used for Janitor and AOL), a free-tier budget; the rest are the real screenshots with tap areas, clickable but not editable, and not scored by QA. On Luzia that is 10 of 38, so its mean fidelity (0.72) is over those 10.
- **Sparse accessibility trees.** React Native and Compose apps expose sparse trees: unlabeled icons and merged text nodes. Some elements are found by vision tap points or not at all.
- **Mock fidelity** is judged by the QA metrics against one representative screenshot per screen. Animations, gestures and long lists beyond one scroll are not reproduced.
- **Economics are ranges from public eCPM benchmarks** with a non-game haircut, **priced at US rates.** Luzia's users are mostly in Latin America, where a view earns about $0.0015–$0.003 after the haircut (`ECON.grossPerViewUsd.LATAM` is $0.002–$0.004 gross), roughly a sixth of the US. At LATAM rates, the text rewards that pass the gate here would cost more to serve than a view nets, so a production version would price and cap rewards per region. The ARPDAU on the details slide is a labelled scenario, not a forecast.
- **The fixture is our own app.** It proves the pipeline end to end, but it is not evidence about the real apps. Without a key its QA fix loop has nothing to do (every screen's best round is the first); the loop at work is in Luzia's QA report (s21, Favorite messages: 0.50 → 0.80 → 0.82 over two rounds).
- **Cannibalization of a subscription is judged, not computed.** With packs, code compares a day of ad rewards with the cheapest pack. A subscription-only app (Luzia, Janitor) has no pack price, so that check falls to the rubric's cannibalization criterion.
- **English-only heuristics.** Wall, decline and sign-up detection, and several judge gates, use English keyword rules. Luzia's Spanish and Portuguese UI would need a shared lexicon per language.
- **Flow QA on image screens is mostly self-consistency.** On a screenshot screen the router is built from the same edges QA replays, so the flow score says more about the HTML screens than about the screenshots.
- **OOC's block is recorded by hand** (`out/ooc/HUMAN_LOG.md`, from the device's logcat); the raw log was not committed.

---

## How this was built

With AI coding agents (Claude Code), which the brief allows. `docs/design/FINAL_PLAN.md` is the plan written before the build and `docs/BUILD_SPEC.md` the interface spec the build followed. Device work (emulator setup, installs, explore runs) ran on a Mac through a local Claude Code session following `docs/LOCAL_SETUP.md`; a person did every sign-in. `cost.jsonl` logs the pipeline's own model calls; the time and tokens spent on the coding agents themselves are not in it.

## Productionization sketch

- **Storage and versioning:**
  - Blobs (screenshots, element lists, HTML) are content-addressed; artifact JSON references them by hash, and stage manifests pin their inputs.
  - Postgres holds `apps`, `versions`, `runs`, `artifacts`, `proposals`, `judgments` and `outcomes`.
  - A model version is keyed by package, version code and a UI fingerprint of the core flows, so over-the-air JS updates are caught too.
  - Diffs between model versions (screens, walls, prices, offers) are themselves a sales signal.
- **When to re-explore:**
  - a daily store-version poll;
  - a weekly no-LLM smoke replay of the core flows and the path to the wall. Drift above 10%, or any price change, triggers an incremental re-explore from the known graph at about 20% of the first-run cost;
  - a new ad format re-runs only propose and judge.
- **Where humans review:**

  | Step | Time |
  |---|---|
  | App onboarding and login | 15 min |
  | **Economy review**, the highest-leverage step | 10 min |
  | Deck approval before a customer sees it | 15–30 min |
  | Exception queue for blocked apps | as needed |
  | Monthly judge audit against real outcomes | 1 h |
- **Cost per app:**

  | Tier | Model calls | All-in |
  |---|---|---|
  | Prospect scan (explore, understand, judged proposals, no mock) | ≈ $12 | ≈ $15 |
  | Full pitch pack | ≈ $18, plus about 1.5 h of emulator time | ≈ $70–120, including 45–60 min of human review |

  Model costs are from Luzia's token ledger priced at `claude-opus-5` list prices, one run of each stage (the repeated proposal and judge runs divided out), no prompt caching; `claude-sonnet-5` is about 40% of that.

  People are the dominant cost, so product effort goes into faster review.
- **Sales and integration:**
  1. Scans rank apps by an opportunity index: has a wall or currency, how often users reach the moment, category fit.
  2. The deck, the clickable prototype and a sizing sheet (the prospect's DAU through `economics.ts`) attach to the CRM deal.
  3. Each SHIP's SDK snippet and spec becomes the implementation ticket: unit, eligibility, remote-config caps, grant on `REWARD_VERIFIED`, and a user-level holdout.
  4. Outcomes flow back to recalibrate the economics and the judge.

---

## Repo layout

```
apps/<id>.json          per-app config (package, login, profile): the only per-app input
config/profiles.json    step / round / proposal budgets per profile (deep, medium, shallow, fixture)
src/cli.ts              one command per stage (commander)
src/core/               schema (zod contracts), llm (the only model caller: cache, fallbacks, ledger), io, trace, run, config, humanize
src/device/             Device interface: mcp.ts (mobile-mcp over stdio), web.ts (Playwright, for the fixture)
src/explore/            explorer: observe, signatures, annotate (LLM or heuristic), act, guards, drain probe, externals, gap check
src/model/              understand: compile, synthesize, verify, economics, moments, flows, digest, viewer
src/mock/               mock generator: prompts, spec renderer, validation, build; runtime/ (router, counters, chat, rewarded overlay)
src/qa/                 compare (IoU / SSIM / text / ΔE), fix loop with keep-best, nudge fixer, flow QA, report
src/propose/            proposer: KB, anchors, stub templates, set validator, schemas
src/judge/              gates, rubric, verdict (pure), judge + revisions, calibration (eval-judge)
src/slides/             captures of the patched mock, deck, PDF/PNG export, SDK snippet
src/report/             out/index.html, the GitHub gallery (out/README.md), per-app NUMBERS.md and report pages
kb/rewarded_ads_kb.md   the rewarded-ads knowledge base (chunk ids cited by proposals and the judge)
eval/                   judge-cal/: calibration items (read by src/judge/calibrate.ts); app-intel.md, ground-truth.json: notes used to pick the deep app, never shown to the pipeline
fixtures/credit-chat/   the adversarial fixture app used by the demo and the tests
scripts/device.sh       Android SDK / AVD / boot / install / snapshot helper
test/                   node:test suites (offline, stub mode), incl. boundaries and the fixture end to end
cache/llm/              recorded model responses (replayable; no secrets)
out/<app>/              every artifact per app (`npm run demo` writes the fixture app to out/demo/)
docs/                   BUILD_SPEC (interfaces), design/FINAL_PLAN (the plan before the build), LOCAL_SETUP, research/ (mobile-mcp, device, prior art, Simula SDK)
```
