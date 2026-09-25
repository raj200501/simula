# Critique of FINAL_PLAN.md (reviewed as the Simula panel plus a staff engineer)

**Inputs checked:** `assignment.txt` line by line; `FINAL_PLAN.md` §0–18; `research/mobile-mcp.md`; `device-setup.md`; `app-intel.md`; `ground-truth.json`; `rewarded_ads_kb.md`; `sota.md`; the claude-api skill (model IDs, prices, effort, structured outputs, caching, image limits); `npm view` for every pinned dependency.

## Verdict

The architecture is right for this brief: code controls the explorer, the product model is the only contract between stages, a proposal is a patch to that model, and the judge's verdict is computed in code. Almost every mobile-mcp and Claude API claim checks out. The plan can still fail in five places:

1. **Real data reaches propose, judge and slides late.** Those stages first run on a real OOC model at about H25.5.
2. **The explorer has bugs on exactly the moments the recording depends on.** These are the drain probe hitting the wall, chat-state identity, the send button, and ad taps.
3. **Goal 4 doesn't respect the judge's gate, and it only partly answers the brief's seven reader questions.**
4. **Reviewers can't reliably run it.** Replay depends on how images render on the local machine, and the mock uses `fetch` from `file://`.
5. **The evaluation claims don't hold up.** The "blind" Luzia test isn't blind, the calibration positives are circular, and AUC is computed on 17 items.

Cutting about 25% of scope (mostly evaluation work that only looks rigorous) frees roughly 6–8 hours. Those hours should go into fixing the five points above.

Status legend: **C** = covered · **W** = weak · **M** = missing · **X** = the plan contradicts the brief.

---

## 1. Requirement-by-requirement coverage

### A. Framing and "how you operate"

| # | Brief requirement | Plan | Status | Gap → fix |
|---|---|---|---|---|
| A1 | app → product model → 1:1 mock → proposal, with as little per-app work as possible | §1, `apps/*.json`, boundary test | C | – |
| A2 | Run on all 4 apps; go deepest on one; the rest prove transfer | §13 | C | – |
| A3 | AI does meaningful work throughout; log what you spent | §3 ledger, §14 | W | The ledger covers only pipeline LLM calls. Add one honest line for development-time AI spend (Claude Code sessions). The brief says "log what you spent", not "what the pipeline spent". |
| A4 | Explain your choice wherever the brief leaves something unspecified | ADRs, deterministic-vs-model table | C | – |
| A5 | Explain the six things evaluated: device control; how the agent decides what to explore; knowledge representation; **how agents share context**; deterministic vs model; failure handling | spread over §1, §4 and §16 | W | "How agents share context" (the file blackboard) is not a beat in the recording outline. Add one 20-second slide with 6 rows, one per question, each with a one-line answer. Evaluators are grading against that list. |
| A6 | If blocked, email instead of spinning | H2.5 go/no-go | C | – |

### B. Goal 1: Explore

| # | Requirement | Plan | Status | Gap → fix |
|---|---|---|---|---|
| B1 | Drive the app through a mobile MCP on an emulator | §4.1 | C | Tool names and arguments verified (see §2). |
| B2 | Don't point the agent at websites; understanding comes from the app | web research is used only in `eval/`; Appendix T dropped | W | The pipeline is clean. But §8's "what a strong OOC run looks like" (90/20 credits, Refill Now, Challenges) is web-derived knowledge the human will tune prompts against. Disclose it in the README and recording, and tune prompts on Luzia or the fixture, never on OOC-specific expectations. |
| B3 | Screens and states | §4.2, §5.1 | C | – |
| B4 | Navigation graph **and core flows** | edges; flows = "shortest paths from launch to monetization or leaf states" | W | Shortest paths are navigation routes, not the core loop. Build the core-loop flow from real edge sequences: open story → pick mode → send → reply → credits drop → wall → store. The drain probe already produces this sequence, so emit it as `kind:"core"`. |
| B5 | Key UI elements and interactions | §4.3, `ActionRecord` | C | – |
| B6 | Modals **and transitions** | transition type classified in compile | W | Animations are off on the device (correct for settling), so motion is never observed and the mock uses generic 250 ms slides. Say "transition *type* observed, motion defaulted". Optionally record one core flow with animations on (`mobile_start_screen_recording`) as reference. |
| B7 | What changes after an action | effects, `context.selected` | C* | *Breaks when the counter isn't on the screen where the action happens (T1). |
| B8 | Existing monetization: paywalls, limits, currencies, entitlements | `Economy` | C | – |
| B9 | Visual detail and assets needed to rebuild each screen | tokens, crops, APK fonts, full-resolution PNG | C | Bundle the OFL font files locally (T15). |
| B10 | How the agent picks the next action; when a screen is done | §4.3–4.4 | C | – |
| B11 | What a state is; how two are diffed | §4.2 | W | Chat screens fragment into many states (T2). |
| B12 | Asset fidelity for icons, colours, type and copy | §5 compile | C | – |
| B13 | Camera, picker, OS settings, permission or browser: record it and move on | `handleExternal` | W | **Ads shown inside the app's own package are not guarded** (T3). |
| B14 | Settings and account screens only if they matter | guard regexes | C | – |
| B15 | **Could another agent mock the app from your output alone?** | Implied: mock reads only `model/` | W | This is asserted, never demonstrated. Add a "cold mock" test: copy `out/ooc/model/` to an empty directory and run `mock --model-dir` there. Also extend the boundary test to *file reads* (mock, QA, propose, judge and slides open nothing outside `--model-dir`), not only imports. Put this in the recording as the direct answer. |
| B16 | Install apps early; some need accounts | H0.5–2.5 | C | Onboarding is saved in the `fresh` snapshot but never explored (T18). |

### C. Goal 2: Recreate

| # | Requirement | Plan | Status | Gap → fix |
|---|---|---|---|---|
| C1 | High-fidelity interactive mock built from the product model | §6 | C | – |
| C2 | No real backend; simulate what's needed | runtime counters, chat replay, wall guard | C | – |
| C3 | Recognisable immediately; the important flows can be walked through | flow QA | C | Depends on the B4 fix, so that "important flows" means the core loop. |
| C4 | Fidelity: layout, typography, imagery, spacing, colours, **states**, navigation, modals, transitions | §6, §7 | W | "States" is thin: only the typing dots. Render 2–3 observed variant states per HTML screen from the model: disabled send, the insufficient-credits toast or sheet, the selected mode chip. They are already in the graph. |
| C5 | Mock substantially generated | Opus HTML per screen, plus image screens for the long tail | W | Put "% of in-scope screens rendered as HTML vs image" on the scorecard, and badge image screens in the mock UI. Otherwise a reviewer clicks a screenshot screen and concludes the mock wasn't generated. |
| C6 | QA loop: you choose what to compare and when to stop | §7 metrics, stop rule, flow QA | C | – |
| C7 | Continuous improvement | keep-best, rounds | C | Replay across machines breaks here (T4). |

### D. Goal 3: Propose and judge

| # | Requirement | Plan | Status | Gap → fix |
|---|---|---|---|---|
| D1 | Expertise via research, KB, specialists or examples | KB in cached context | C | – |
| D2 | Apply rewarded-ad knowledge to a new product, not generic best practice | baseline-first, moment sweep, specificity weight, diversity validator | C | – |
| D3 | Existing-opportunity case | `validateSet` requires at least 3 | C | – |
| D4 | Product-change case | at least 3 (at least 5 for no-scarcity apps) | C | – |
| D5 | Explicit review step that scores every candidate | code gates, Opus rubric, verdict in code | C | – |
| D6 | **The judge gates what goes on to Goal 4** | §9.2 "top 3–4 for the deep app, top 1 per transfer app; if fewer than 2 SHIP, add the best REVISE" | **X** | Promoting a REVISE into the flow deck defeats the gate. Truncating to the top N drops proposals that survived. Every SHIP gets a flow slide; non-SHIPs appear only in "Ideas we rejected". If too many ship, tighten the thresholds or add a stated *portfolio* step inside the judge, not a quiet cutoff in slides. |
| D7 | Criteria | 9-criterion rubric plus gates | C | – |
| D8 | Revision loop; how many rounds | at most 2 blind rounds | C | – |
| D9 | How do you know the judge is good? | §9.3 | W | Overbuilt and partly circular (T9). Replace with a single-fault confusion table. |

### E. Goal 4: Slides

| # | Requirement | Plan | Status | Gap → fix |
|---|---|---|---|---|
| E1 | Flows for **each** opportunity that survives the judge | top-N selection | X | See D6. |
| E2 | Existing state → proposed mechanic → rewarded interaction → user gets value | 4 phones | C | – |
| E3 | Mocked screens, arrows, annotations, concise copy | captures, callouts at DOM positions | C | – |
| E4 | The ad can be simulated | `rewarded.js` | C | – |
| E5a | Reader sees where the flow starts | phone 1 | C | – |
| E5b | …what changed in the product | phone 2 (`data-new` outline) | C | – |
| E5c | …**what triggers the offer** | only on the details slide | W | Put the trigger on the flow slide as a labelled arrow, e.g. "Trigger: balance < 90 and 'Refill Now' declined". |
| E5d | …**what the user sees and chooses** | invite and game share phone 3 | W | The decline path is invisible. Split into 5 frames: Today → What changed → **Offer (Play / No thanks, with No-thanks → back to the draft shown)** → Ad plays → Value received. |
| E5e | …where the ad plays | phone 3 | W | Fixed by the 5-frame split. |
| E5f | …what they get | phone 4 | C | – |
| E5g | …why the system thinks it's a good idea | "Why this works" rail | C | Build the rail on the exchange rate, not on ARPDAU (T10). |
| E6 | "Could we put this in front of the product team and have them understand it immediately?" | template polished once | W | The plan cut the cold-read test. Add a 5-minute version: someone who hasn't seen the deck looks at each flow slide for 10 s and says the 7 answers aloud. Fix whatever they miss. |

### F. Goal 5: Productionization (5 questions)

| # | Question | Plan | Status |
|---|---|---|---|
| F1 | How are product models and mocks stored and versioned? | §18: content-addressed blobs, `(package, versionCode, uiFingerprint)`, `simula diff` | C |
| F2 | What triggers a re-explore? | version poll, weekly smoke replay, new ad format, sales request | C |
| F3 | Where do humans review? | 5-row table | C |
| F4 | Cost per app? | 3 tiers | C |
| F5 | How does the output plug into sales and integration? | opportunity index, CRM pack, SDK ticket, outcomes loop | C |

Keep this to one README section and one slide. It is complete; the risk is spending recording time on it.

### G. Deliverables

| # | Deliverable | Plan | Status | Gap → fix |
|---|---|---|---|---|
| G1 | Code for explorer, mock, QA, proposer and judge; one command per stage | §2 | C | – |
| G2 | **List the required models, keys, simulators or emulators, and services** | "README: setup, requirements" | W | Not actually listed. Add a table: Node 22 + npm (not pnpm); `ANTHROPIC_API_KEY`; `claude-opus-5-5`, `claude-sonnet-5`, `claude-haiku-4-5`; Android SDK cmdline-tools, platform-tools and emulator; `system-images;android-35;google_apis_playstore;arm64-v8a`; AVD `pixel_8`; a Google account with no payment method; per-app login (OOC Google, Janitor Google or Discord, AOL account, Luzia guest); `@mobilenext/mobile-mcp@1.0.5` (bundles mobilecli); `npx playwright install chromium`; network access for Google Fonts, or bundled fonts. |
| G3 | Product model per app: what was explored, what was learned, how it's represented | model, viewer, digest, coverage | C | Add a short list of what was *not* explored and why (guarded, external, unreachable). The data is already in `ActionRecord.status`. |
| G4 | Mock plus QA evidence (diffs and corrections) | filmstrips, changelogs | C | – |
| G5 | Rewarded flows plus the judge's scores and reasoning for every candidate, rejected ones included | `judgments.{json,md}`, rejected-ideas slide | C | – |
| G6 | Trajectory: what ran autonomously, where it failed, what was fixed by hand, how key decisions were made | `trace.jsonl`, `trajectory.md`, `HUMAN_LOG`, overrides, ADRs | C | – |
| G7 | Cost log | `cost.jsonl` rollup | C | – |
| G8 | 10–15 minute recording covering explore → understand → mock → QA → propose → judge → flows, plus architecture, trade-offs, limitations and next steps | §16, 13:30 | W | Nine dense segments. **Open with the result:** 45 s of the OOC flow slide plus a click through the mock to the wall, then the architecture. Add the six-question slide from A5. Cut transfer to 60 s. |
| G9 | **"We can run it locally"** | `demo` plus `--llm replay` | W | Replay misses the cache on reviewers' machines (T4). The mock's `fetch` from `file://` fails (T5). The Playwright install step is missing. Test the reviewer path in a clean clone on the *other* OS. |
| G10 | Submit link and email Yizhen | H45–46 | C | – |

### H. "What we're looking for"

| Criterion | Status | Note |
|---|---|---|
| Curiosity beyond obvious placements | C | Baseline-first then "beyond" is the right device. |
| Judgment / 80-20 / deep on one | W | The 55/15/15/15 split is right, but the plan's size (96 KB, about 3,800 LOC, 15+ commands, 6 eval suites) contradicts "extra complexity is not rewarded". See §3. |
| Technical maturity (end to end, runnable) | W | The schedule doesn't run real data end to end until day 2; see improvement #1. Runnability: T4 and T5. |
| Clarity | W | Add a "brief → artifact → recording timestamp" traceability table at the top of the README. |

---

## 2. Technical errors and risky assumptions

### 2.0 Checked and correct (no action)

**mobile-mcp** (against `mobile-mcp.md`):
- tool names and parameters; Android coordinates in device pixels;
- tap by rect centre rather than `ref`, because refs are positional;
- `mobile_save_screenshot` is full-resolution PNG and may only write under the server's cwd, so cwd is set to the repo root;
- the prefix is stripped before parsing JSON elements;
- the element list has no clickable, scrollable or hint information;
- errors come back as text without `isError`;
- hangs because of `execFileSync`, so a client timeout, respawn and `daemon stop` are needed;
- `getDefaultEnvironment()` passes `ANDROID_HOME` and telemetry is turned off;
- npm, not pnpm, because pnpm breaks the mobilecli lookup;
- ENTER inserts a newline in chat apps, so the plan taps Send;
- swipe end points are not clamped, so the plan clamps them;
- only one UiAutomation connection per device;
- `{"devices":[]}` is treated as a precondition failure;
- installs come from the Play Store because `mobile_install_app` takes a single APK only.

**Claude API** (against the claude-api skill):
- model IDs `claude-opus-5-5`, `claude-sonnet-5` and `claude-haiku-4-5` (the alias is valid);
- prices $4/$20, $2/$10 and $1/$5, with cache reads at 0.1×;
- Opus 5.5: thinking can't be disabled, effort defaults to `medium`, forced `tool_choice` returns 400, no prefill;
- `temperature` is rejected on Sonnet 5 and Opus 5.5; Haiku 4.5 rejects `effort`;
- the minimum cacheable prefix on Opus 5.5 is 512 tokens;
- images up to 2576 px on the long edge are accepted, and a 1080×2400 PNG costs about 3.3k tokens;
- `messages.parse` + `zodOutputFormat` from `@anthropic-ai/sdk/helpers/zod` → `parsed_output`.

**Dependencies:** all pinned versions exist on npm today: playwright 1.63.0, @anthropic-ai/sdk 0.128.0, zod 4.6.5, @modelcontextprotocol/sdk 1.30.1, mobile-mcp 1.0.5, sharp 0.35.4, pixelmatch 7.2.0 (ESM-only; fine with `"type":"module"`), ssim.js 3.5.0, culori 4.0.2, pngjs 7.0.0, tsx 4.23.15.

**Device setup:** Pixel 8 AVD at 1080×2400, 420 dpi, density 2.625 (411×914 dp). AOL targets SDK 34, so it is *not* forced edge to edge; masking instead of cropping handles both cases.

### 2.1 Errors and risks, most severe first

**T1 · HIGH: the drain probe assumes the credit counter is visible where you send messages.**

Phase 3 breaks after 2 sends with no counter effect (`if (!fx.some(isCounter)) { if (++flat >= 2) break }`). OOC shows the balance through a **credit icon at the top of Home** (app-intel.md l.35). Ground truth lists the session screen as "message list, input, Suggested Replies", with no balance. If the chat screen has no counter, the probe stops after 2 messages and never reaches "insufficient credits". That is the moment the plan calls "the strongest 30 seconds of the recording".

There are two more problems:
- The `profiles.json` limits are inverted: deep 10 retries against medium 30.
- Ten Superb sends cost about 900 credits, against roughly 500 (signup) plus 300 (daily) minus whatever the crawl already spent. Reaching the wall is borderline.

**Fix:**
- For consume edges, stop only on a wall signal, an external app, or `drainMax`. A reply appearing counts as progress.
- Every 3 sends, travel to the screen that shows the counter, read it, and back-fill the per-send delta as Δbalance ÷ n.
- Set deep `drainMax` to 30 or more.
- Drain on the mode whose `context.selected` edge showed the largest cost.
- Make the fixture adversarial: counter only on Home.
- Add "Is the balance visible in-session?" to the H3 probe.

**T2 · HIGH: chat screens split into many states, and the drain probe can report a false wall.**

The chrome rule treats any text of 24 characters or fewer that isn't in a repeated group as identity. Two things go wrong:
- The explorer's own input, "Hi! What happens next?" (22 characters), and any short reply become chrome tokens.
- A repeated group needs the same type, x **and** width. Chat bubbles have variable widths, and user bubbles are right-aligned, so they never qualify. The sketch's tree-based sibling collapse (`sota-sketches/.../state.ts`) doesn't port to mobile-mcp's flat list.

As a result, each send can yield a "new" state. The drain probe's wall test is `next.id !== e.from`, so it then records a **false `limitHit`**, and the moment detector turns that into a fake wall.

**Fix:**
- Exclude from chrome every string the explorer typed and every text in an `appeared` effect of a consume edge.
- Group elements by the same type plus the same left *or* right edge within a vertical run.
- Define a wall as a new screen that is not a chat, or that carries a `limit`/`price`/`upsell` signal, or a modal or sheet. "Different id" is not enough.
- Tell the annotator's `sameAs` prompt: "same template, different content instance = same state". This matters for per-story chat titles.

**T3 · HIGH: the explorer will click live ads.**

Luzia (Google Mobile Ads, plus Koah sponsored answers in chat) and AOL (AdMob, Prebid, Taboola, Verizon) render ads **inside their own package**, so the foreground check never fires. Priority 3 explicitly includes "anything to do with … ads". Automated clicks on real ads are invalid traffic. That is a network ToS violation, and a bad look in an ad-tech take-home.

**Fix:**
- Add a guard rail that never taps elements whose type or identifier matches `/gms\.ads|AdView|NativeAd|taboola|prebid|adchoices/i`, whose label is `Ad`, `Sponsored` or `AdChoices`, or which sit inside the rect of such a container. Record them only as `economy.ads` evidence.
- Close interstitials with their close control or BACK.
- Change the prompt to "observe ads, never click them".

**T4 · HIGH: reviewer replay will miss the cache.**

The cache key hashes image bytes. QA fix calls send a composite of Playwright's render and a heatmap. Those bytes depend on the OS font rasteriser and the Chromium build, so on a reviewer's Mac or Linux box `--llm replay` throws `ReplayMiss` partway through QA.

**Fix:**
- For calls whose images are derived deterministically, key on stable inputs: screen id, round, HTML sha, diffs JSON, and the sha of the original screenshot.
- Alternatively, add a "tape" replay: ordered responses per (stage, purpose, screen, round).
- Prove it works by replaying the Mac-recorded run in this Linux container.

**T5 · MED: `fetch` from `file://`.**

`?proposal=P3` "loads `proposals/P3.patch.json`", and the report tabs render `trajectory.md`. Chromium blocks `fetch` and XHR of local files on `file://` pages, both in Playwright and in reviewers' browsers.

**Fix:** emit data as `<script src="proposals/P3.js">`, which assigns `window.__PATCHES`. Pre-render Markdown to HTML at build time. Optionally add `npm run serve`.

**T6 · MED: structured-output schemas.**

- `storyboard[].counters?: Record<Id, number>` is generated by the LLM. A zod record compiles to `additionalProperties: {schema}`, and structured outputs only accept `additionalProperties: false`. Use `{resource, value}[]` instead.
- The "depth" call writes six full `Proposal`s, with patches and storyboards, in one response at effort `high`. Adaptive thinking counts toward `max_tokens`, so this is fragile. Make one call per proposal, in parallel, streamed, with `maxTokens` of 32k or more. That also isolates failures.
- Add a one-call schema smoke test to `doctor` for each model. The skill confirms structured outputs on Opus 5 and says Opus 5.5 has the same feature set, but verify on the first call.

**T7 · MED: the Send button may not exist before typing.**

React Native composers often show a microphone and swap it for Send once text is entered, so the `sendEl` key from the pre-typing dump can be absent.

**Fix:**
1. After `mobile_type_keys`, dump the screen again.
2. Pick Send by label (`/send|submit/i`) or as the rightmost clickable element on the input's row.
3. Fall back to `submit:true`.
4. Before settling on the reply, verify that the input cleared.

**T8 · MED: unsafe tap points.**

The plan drops only elements that are *entirely* off-screen or inside the inset rows. Partly hidden list rows are tapped at the centre of their rect. That point can land in the gesture-navigation zone (the bottom 48 px means Home), which gets misread as `ext:launcher` and the action marked `failed`.

**Fix:** tap the centre of the rect intersected with the safe area. If less than 40% of the element is visible, scroll it into view first.

**T9 · MED: the judge evaluation is partly circular, and the "blind rediscovery" claim is false.**

- KB [AI-1], [AI-2] and [AI-3] are Simula's three Luzia slide ideas. Line 286 ("Simula's reference set does exactly this…") and line 389 don't contain the word "Luzia", so the `kb.ts` step that strips lines naming Luzia leaves them in. The proposer is not blind.
- The calibration positives are those same patterns, which the judge's KB recommends outright.
- AUC on 5 positives and 12 negatives, "tuning on half, reporting on the other half" of about 8 items, and a flip rate over 2 runs are not statistically meaningful.

Simula wrote those slides and will spot the leak.

**Fix:**
- Drop the "blind" claim. Present Luzia as "applies known patterns to Luzia's real UI, plus what it proposes beyond them".
- Report calibration as a single-fault confusion table: each negative, the expected catch, and whether code or the LLM caught it.
- Use the KB-precedent positives (Tapas, Pandora, Duolingo) rather than the Luzia slides.

**T10 · MED: the economics look computed but rest on guesses.**

`proposalEconomics` does the arithmetic in code, but its inputs come from the LLM: `engagedShare`, `viewsPerEngager` and `geoMix`. The eCPM, platform-share and COGS constants are partly tagged `[inf]`. Putting "impact per 1M DAU" on the *recommendation* slide invites an ad-tech audience to take it apart.

**Fix:** make the headline the exchange rate ("1 US view ≈ 6.5–10.8 credits at list price, so the reward is one Premium reply") plus the cannibalization check against the cheapest pack. Move ARPDAU to the details slide as a labelled scenario.

**T11 · LOW-MED: timing assumptions.**

Polling `elements()` "every 400 ms" can't happen. Every dump waits for 500 ms of UI idle (up to 2 s), and `get_foreground_app` can retry `dumpsys` for up to 5 s. Expect 3–8 s per step, plus up to 25 s for consume settles and time for travel hops. The deep profile's 150 steps in 75 minutes (30 s per step) still fits. Measure seconds per step in `probe` and set step budgets from that.

**T12 · LOW-MED: the stderr pipe must be drained.**

mobile-mcp logs every call's *full* response to stderr, and element lists are large. If the pipe isn't read continuously, it fills and the server blocks, which looks like a device hang. The plan routes stderr to the trace; make sure that reader always runs and caps its buffer.

**T13 · LOW: the Batch API doesn't fit a 2-hour slot.**

Batch latency is unbounded (usually minutes, up to 24 hours), and the saving is about $3. Run `eval:judge` live with some concurrency.

**T14 · LOW: the cloud track may be impossible as described.**

From this container github.com returns 403, and there is no API key. Decide at H0: either give the cloud environment GitHub access and a separate, spend-capped key, or run track C as a second local worktree from the start.

**T15 · LOW: fonts.**

The mock loads Google Fonts over the network. A reviewer who runs it offline gets fallback fonts and a visible fidelity drop. Bundle the OFL files (Inter and Lora for OOC; Plus Jakarta Sans for Luzia).

**T16 · LOW: annotator caching.**

Sonnet 5's minimum cacheable prefix is 1024 tokens, so a short annotator system prompt won't cache. The cost impact is negligible; just don't claim caching for that call.

**T17 · LOW: secure payment sheets.**

`FLAG_SECURE` windows (some payment sheets) screenshot as black. For billing, rely on element text, which the plan already does, and keep black frames off the slides.

**T18 · LOW: onboarding is never explored.**

Logging in at H0.5–2.5 uses up the first-run screens. The `fresh` snapshot keeps them, but nothing explores from it. Either run 20 steps from `fresh` on OOC (onboarding and the login wall are evidence for the `first-value` moment), or state that onboarding is out of scope.

**T19 · LOW: repository contents.**

The repo will hold third-party screenshots, character art and test-account data. Keep it private and share it with the reviewers.

---

## 3. Unnecessary complexity to cut

| Cut or shrink | Replace with | Saves |
|---|---|---|
| Judge calibration statistics: AUC, invariance items, flip rate over 2 runs, split into tuning and held-out halves, Batch API | 5 KB-precedent positives and about 8 single-fault negatives, one live run. Report a confusion table and "caught by code / caught by the LLM" | about 2.5 h |
| "Blind Luzia rediscovery" and Luzia-line stripping | Drop the claim (T9) | about 0.5 h, plus credibility |
| Economics beyond the exchange rate: ARPDAU, annual revenue per 1M DAU, geo mix, a 5-tier COGS table | `unitPriceUsd`, `actionCostUsd`, `unitsPerView`, and the cheapest-pack cannibalization flag. Keep a COGS flag only for image and voice rewards | about 1 h |
| `qa --crawl` second agent | Cut (it is already first on the cut list); flow QA covers behaviour | about 1.5 h |
| Gap check with 2 rounds | 1 round, at most 5 targets | about 0.3 h |
| Report site with 7 tabs, transfer scorecard and judge report card | One static `index.html`: the scorecard table plus links to the viewer, mock, QA report, judgments, deck and trajectory, all pre-rendered | about 1 h |
| Deck extras: the "where the moments are" scatter and a details slide per proposal | One appendix table for all proposals, and one integration-snippet slide | about 1 h |
| `eval:explorer` with a Haiku matcher and manual device re-checks | A P0 checklist per app, filled in by hand from the viewer (15 minutes); ground truth stays eval-only | about 1 h |
| Ten ADRs | One decisions table (choice, alternative, why) | about 0.5 h |
| 4 LLM modes | 3: `record` (the default; live on a miss), `replay`, and `stub` for e2e only | small |
| 8 moment types plus computed `reach`; the `uiStack` field | 5 moments (wall, desire, decline, hub, post-reward) plus the `first-value` rule. Keep `regime`, since it carries the transfer story | about 0.5 h |
| A human review of every cloud merge | Fewer, larger merges on fixed boundaries: `core`, `explore`, `model`, `mock`/`qa`, `propose`/`judge`, `slides` | attention |

In total this frees about 6–8 hours and removes the parts most likely to draw "extra complexity is not rewarded" or a statistical challenge. **Keep:** the fixture app with `WebDevice`, the boundary test, overrides, stage manifests (small), and code gates with a code verdict. These are cheap and each is a point in the recording.

---

## 4. The five highest-leverage improvements

### 1. A real-data walking skeleton on OOC by about H10, before the deep run matters

The brief's top technical criterion is "explorer, mock, QA, and judge have to work together end to end". The plan builds propose, judge and slides overnight against stubs, and first runs them on real data at about H25.5. Change this:

- **Around H8.5–10:** take the first 40-step OOC model and run `understand → mock (3 screens) → qa (1 round) → propose → judge → slides` live, even if the output is ugly. Commit the `cache/llm` recordings.
- Overnight, the cloud sessions then work against **real recorded responses** in `--llm replay`, or against live calls if the cloud environment gets a spend-capped key. They are no longer working against hand-written stubs.
- Day 2 then iterates on quality rather than on integration. It also produces a recording segment ("first end-to-end run, day 1") that shows how the work was operated.

### 2. Make the explorer correct on the three moments the demo depends on

These are the wall, the price per mode, and escaping external surfaces. Fix T1 (drain without a visible counter; `drainMax`), T2 (chat identity and the false-wall test), T3 (never click ads), T7 (Send appears after typing) and T8 (safe tap points). Encode each as a fixture case with a unit test. Make `fixtures/credit-chat` adversarial:
- the counter appears on Home only;
- Send appears after typing;
- chat bubbles have variable widths;
- a fake "Sponsored" card is in the feed;
- one element is half-hidden under the nav bar.

Most of these are 10–30-line changes. Without them, the deep run's headline evidence could be wrong, or missing, on camera.

### 3. Rebuild Goal 4 around the brief's seven reader questions and the judge's gate

- **Five frames per flow slide:** Today → What changed → Offer (Play / No thanks, with the decline returning to the draft) → Ad plays → Value received.
- **Labelled trigger arrow**, e.g. "balance < 90 and Refill declined".
- **"Why" rail** built on the exchange rate and cannibalization. ARPDAU is not the headline.
- **Every SHIP gets a flow slide.** No REVISE is promoted.
- **Cold read:** one 10-second test per slide by someone who hasn't seen it.

This is the artifact Simula would actually show a customer ("could we put this in front of the app's product team…"), and the reference slides set a bar the plan should visibly beat.

### 4. Make "we can run it locally" hold on someone else's machine, and prove "another agent could mock it from the model"

- Replay keyed on stable inputs, or a tape (T4).
- No `fetch` from `file://` (T5).
- Bundled fonts (T15).
- `npx playwright install chromium` in `doctor` and the README.
- A concrete requirements table (G2).
- A 5-minute quickstart, tested in a clean clone on the *other* OS: `npm ci && npx playwright install chromium && npm run demo && npm run all -- --app ooc --from mock --llm replay && open out/index.html`.
- **The cold-mock test:** copy `out/ooc/model/` to an empty directory and run `mock --model-dir` there with a live call on 2 screens (about $1). This answers the brief's explicit Goal-1 question with evidence rather than an assertion.

### 5. Replace evaluation that only looks rigorous, and the overclaims, with honesty; reinvest the time in the recording

- Drop the "blind" Luzia claim, the AUC and held-out statistics, and the headline ARPDAU (T9, T10).
- Report the judge through a single-fault confusion table that says what code caught and what the LLM caught.
- Spend the recovered time on the recording, which the brief says Simula cares about most:
  - open with 45 s of the result (the OOC flow slide, then a click-through of the mock to the wall);
  - show one slide answering the six "how you operate" questions;
  - show one real failure and its generic fix;
  - end with limitations stated plainly (manual logins, emulator only, sparse Skia trees, same-model judge, n≈8 human labels).
- Add a **brief → artifact → timestamp** table at the top of the README so a reviewer can check every requirement in two minutes.

### Suggested schedule changes (everything else as in §15)

- **H8.5–10:** the real-data skeleton from improvement #1, alongside `understand`.
- **H13–14.5:** commit the recorded cache so the overnight cloud work replays real responses.
- **H27.5–29.5:** was judge calibration. Now the trimmed confusion table (30 minutes), then **start transfer 2 hours earlier**.
- **H29.5–32:** slides with the 5-frame layout, the cold read, and the gate fix.
- **H34.5–35.5:** add the cross-OS clean-clone replay test and the cold-mock test to the freeze checklist.
