# Techniques worth adopting for explore, recreate, QA and judge

Written 2026-09-25 for the Simula "App Monetization Agent" take-home. This is not a literature review. For each stage it lists what the published work offers and what to take from it, then gives a specific design with parameters and a TypeScript sketch.

**Code:** `research/sota-sketches/` (absolute path: `/tmp/claude-0/-home-user-simula/25c848c5-fa91-54b9-9b9c-b7d1ed4ee763/scratchpad/research/sota-sketches/`). About 1,350 lines in 11 files. Typecheck is clean (`tsc --noEmit`, strict). Two offline test suites pass:
- `selftest.ts` covers state hashing, candidate extraction, effect diffing, Hungarian matching, token measurement, screen comparison and dHash masking.
- `simtest.ts` runs the real `Explorer` loop against a simulated credit-based chat app. It ends with `frontier_empty` after 44 steps and finds 9 states: 7 in-app plus 2 external surfaces (the Play billing sheet and the launcher). It never taps "Log out". It records the Play billing sheet as an external surface and attributes −30 credits to each sent message. It reaches the out-of-credits paywall through the drain probe.

**Not verified:** anything that calls Claude, Playwright rendering, or a real emulator. Those files typecheck against `@anthropic-ai/sdk` 0.128 and `playwright` 1.63, and nothing more.

Related sibling notes: `research/mobile-mcp.md` (quirks of the mobile-mcp tools; the element list is flattened and lossy) and `research/app-intel.md` (the four apps; OOC as the deep app, Luzia as the judge calibration app).

---

## 0. Decisions at a glance

| Area | Decision |
|---|---|
| **State** | The main key is a structural hash of the accessibility tree. Each node contributes its class, resource-id, interaction flags, selected/checked state, and short UI labels with digits masked. Repeated siblings collapse to one. Long text and user text are dropped. The fallback test: Jaccard ≥ 0.9 on the set of node paths **and** dHash distance ≤ 10 on a screenshot with list and video regions masked. So a chat with 3 or 30 messages, a refreshed feed, timestamps and credit values all give the **same** state, while a different selected tab gives a **different** one. |
| **Action selection** | The LLM-Explorer pattern. One Sonnet 5 call per *new* abstract state returns the screen name, kind, whether it is in scope, a priority for each candidate, skip reasons, values for text inputs, and monetization signals. The choice itself is deterministic: untried candidates first, then highest priority, then smallest group. |
| **When a screen is done** | No untried candidates remain; each is tried, ineffective, skipped or unreachable. |
| **When to stop** | The frontier is empty, **or** 40 steps pass with no new state, **or** the step, dollar or time budget runs out. Before accepting saturation, do one LLMDroid-style escalation: ask Opus "what's missing?" |
| **Backtracking** | BACK is an explicit action whose result the explorer learns. Navigation is BFS over known in-app edges. If that fails, relaunch (force-stop + launch, which keeps the login) and replay the path from the launch state, checking each hop. Elements are re-found by structural key, never by coordinates. After 2 failures a target is marked unreachable. |
| **Leaving the app** | Check the foreground package after **every** action and classify it: permission dialog, camera, photo picker, browser or Custom Tab, Play billing, Google sign-in, OS settings, launcher. Record it as a terminal edge with a screenshot, press BACK twice, then relaunch. The explorer never acts inside other apps, so a real purchase cannot happen. |
| **Limits and paywalls** | A generic **drain probe**: an action that lowers a counter on the same screen is repeated until the counter stops falling or a new state (limit modal or paywall) appears. This finds OOC's insufficient-credits state and Luzia's daily-limit state without app-specific code. |
| **Recreate** | Generate one HTML fragment per abstract state and pair it with a hand-written runtime that works for any app. The runtime routes over `flows.json`, plays modal and sheet transitions, and simulates counters and chat. Opus 5.5 gets the screenshot, a *measured* element spec (dp bounds, colours, font sizes) and cropped assets. The design system is generated once per app. Every element keeps `data-node=<a11y node id>`. |
| **QA** | Render at the device's dp viewport × DPR so the pixel grids match 1:1. Score with Design2Code-style metrics using the accessibility tree as ground truth, plus SSIM and pixelmatch. A vision-model critic turns the *measured* diffs into at most 8 concrete fixes. Keep the best version. Stop at composite ≥ 0.90, on a plateau, or after 4 iterations. Flow QA replays every recorded edge in Playwright. |
| **Judge** | An 8-criterion rubric that writes evidence before each score. Three gates are yes/no checklists (CheckEval). A deterministic check confirms every cited state id exists. A panel of 3 Sonnet 5 personas scores; the median wins, and Opus 5.5 adjudicates only when they disagree. Revisions are re-judged blind, at most 2 rounds. Survivors are ranked pairwise, counting only wins that hold when the order is swapped. The judge is calibrated on Luzia, using Simula's slides as known-good and single-criterion perturbations as known-bad. |

---

## 1. Explorer: LLM-guided Android GUI exploration

### 1.1 What prior work offers, and what to take

| Work | Core idea | Take / skip |
|---|---|---|
| **DroidBot** (ICSE-C 2017) | State = hash of foreground activity + sorted view signatures (class, resource-id, text, enabled/checked/selected). A separate "content-free" hash drops text. Builds a UI transition graph (UTG). | **Take** content-free hashing and the UTG. On its own it over-splits on lists and dynamic text. |
| **APE** (ICSE 2019) | Dynamic abstraction. Start coarse, then refine the attributes used for identity (type → resource-id → text → index) when one abstract action leads to different results (non-determinism). Coarsen when one screen splits into too many states. | **Take the rule as a v2 fix-up.** If one abstract action reaches ≥ 3 distinct targets, add text to the signature for that subtree. Skip the full refinement machinery. |
| **LLM-Explorer** (MobiCom 2025, [2505.10593](https://arxiv.org/abs/2505.10593)) | The LLM is used only to *maintain knowledge*: it merges functionally similar elements into abstract actions and generates text inputs. Selection is a random unexplored abstract action across the whole app. Navigation uses shortest paths on an abstract interaction graph; on failure it restarts, and infeasible edges are removed. It stops when all abstract actions are explored. About 157 LLM queries per app, **$0.11 versus $16.31 for DroidAgent**, with the highest coverage. | **Take almost the whole control design.** We replace random selection with LLM priorities (one call per state) so exploration goes toward monetization surfaces. |
| **LLMDroid** (FSE 2025, [ACM](https://dl.acm.org/doi/10.1145/3715763)) | Run a cheap explorer and call the LLM for guidance only when coverage growth slows. +26% coverage on average. | **Take** the plateau escalation. |
| **AutoDroid** (MobiCom 2024, [2308.15272](https://arxiv.org/abs/2308.15272)) | Offline random exploration builds a UTG. The LLM writes a "simulated task" for each element. Screens are serialized as HTML-like text in prompts. | **Take** compact HTML-ish serialization. The UTG is our navigation graph. |
| **GPTDroid** (ICSE 2024, [2310.15780](https://arxiv.org/abs/2310.15780)) | An LLM question-and-answer turn at every step, with memory of which functions have been covered. | **Skip** the per-step LLM (cost and latency). **Take** the functionality-coverage memo, which becomes our monetization checklist. |
| **DroidAgent** (ICST 2024, [2311.08649](https://arxiv.org/abs/2311.08649)) | Planner, actor, observer and reflector; task goals; long- and short-term memory. 61% activity coverage, but expensive. | **Take** only the idea of "intents" for the plateau escalation, where Opus proposes goals. |
| **AppAgent** ([2312.13771](https://arxiv.org/abs/2312.13771)) / **Mobile-Agent** ([2401.16158](https://arxiv.org/abs/2401.16158), v2 [2406.01014](https://arxiv.org/abs/2406.01014), v3.5 [2602.16855](https://arxiv.org/abs/2602.16855)) | An exploration phase writes documentation per element. Set-of-marks numbered overlays on screenshots. Vision-only perception (OCR + icon detection). | **Fallback only**, for screens with an empty accessibility tree (canvas, Unity, Flutter without semantics). Our per-candidate `intent` labels play the role of the element docs. |
| **QTypist** (ICSE 2023) | LLM-generated text inputs that fit the context. | **Take**: input values come from the one annotation call per state. |
| **UI tarpit escaping** (2026, [2604.06763](https://arxiv.org/abs/2604.06763)) | Detects that exploration is cycling (state similarity over a sliding window) and uses an LLM to escape. | **Take** the detector: the steps-since-new-state counter plus a per-state visit cap. |

### 1.2 Recommended design

**Observation, per step.** Get the tree from `mobilecli dump ui --format raw` (full JSON tree with clickable, scrollable, hint, children) or from `adb exec-out uiautomator dump /dev/tty`. mobile-mcp's `mobile_list_elements_on_screen` is flattened and drops `clickable`, `scrollable` and hint text (see `mobile-mcp.md` §2.1). Use mobile-mcp for actions, `mobile_get_foreground_app`, and `mobile_save_screenshot` as a full-resolution PNG. The explorer is **our code acting as an MCP client**, not an LLM agent loop that calls tools. That keeps it deterministic, cheap and replayable.

**Normalization.** `uitree.ts` `finalize()` drops system UI and keyboard windows, zero-area and off-screen nodes, and "pure wrappers" (no text, id or flags, and exactly one child). This is Prototype2Code's "design lint" applied to accessibility trees. It makes the hash robust to wrapper churn in Compose and React Native.

**Settling.** Poll the dump every 400 ms until two structural hashes in a row agree (maximum 6 s). After sending a chat message, settle on *content*: include text in the hash, poll every 1.5 s, up to 45 s. This waits for streamed replies.

**State identity.** Implemented in `state.ts`. The node signature is
`class # resource-id [flags: clickable, long-clickable, scrollable, checkable, editable, Selected, Checked, Disabled] + static text`.
- **Static text** is kept only when it is at most 28 characters, not in a list, not editable, and not time-like. Digits are masked, so "Credits: 450" becomes "credits: #". Why keep it at all? Compose and React Native apps reuse the same containers across screens, and without labels "Store" and "Settings" collide.
- **Repeated-sibling collapse.** Runs of siblings with the same content-free shape collapse to one representative. Inside a scroller, or any parent with 4 or more children, only the first occurrence of each child signature is kept. This handles alternating me/bot chat bubbles and mixed feeds.
- **The selected index of a repeated group stays in the hash.** Otherwise "tab 2 selected" equals "tab 3 selected".
- **Keys.** The primary key is `sha1(pkg | activity | canonical)`. Activity is almost useless for single-activity Compose and React Native apps, but it's free. If there's no exact match, two states are merged when **both** Jaccard ≥ 0.9 on the set of root-to-node signature paths **and** dHash Hamming distance ≤ 10. The screenshot for dHash has its dynamic regions painted grey: scrollers and repeated groups, plus Video, Surface and WebView nodes.
- **Tested** (`selftest.ts` §1). A 3-message chat at 500 credits hashes the same as an 8-message chat at 410 credits with other timestamps. Changing the selected tab changes the hash. An empty chat is a different state.

Failure modes to watch, and their fixes:
- **Over-merge.** Two list screens with the same structure whose titles are longer than 28 characters. Fix with the APE-style refinement rule above. A cheap check: if the LLM's `screen_name` for a second observation of the same state disagrees with the first, split the state.
- **Over-split.** Loading skeleton versus loaded content, toasts, snackbars. Settling handles most of it. Also drop `Toast` nodes. Keyboard-open layouts keep the same hash, because rects are not part of it.
- **Empty trees** (canvas, games, Flutter release builds without semantics). Identity falls back to dHash only, and actions fall back to vision grounding with set-of-marks. Run a `uiautomator dump` smoke test on each app on day 1, as `app-intel.md` also recommends.

**Candidate actions** (`actions.ts`).
- A node is **actionable** if it is enabled and clickable, long-clickable, checkable or editable. When clickables are nested, keep the **innermost** one, because Compose and React Native often double-wrap.
- **Scrollables** get one `scroll` candidate each.
- **Every state gets an implicit `BACK` candidate** at priority 0. That's how the explorer learns where BACK goes and how modals are dismissed.
- **Repeated groups follow LLM-Explorer's element grouping.** Homogeneous groups (feed cards, grid tiles) get `take = 2` members tried, and the LLM can raise that. Heterogeneous groups are treated as navigation and every member is tried. Heterogeneous means at most 6 members, not inside a scroller, and all labels distinct: bottom nav, tabs, chips. The simulation found this bug: the Store tab was unreachable until this rule was added.
- **Element keys** are the `cls#rid@index` path from the root plus the label with digits masked. On replay, `resolveElement()` tries the exact key, then a unique label match, then the nearest element of the same class.
- **Guard rails** are regexes that the LLM can add to but never remove:
  - *destructive*: log out, delete, report, block, clear history;
  - *purchase confirm*: buy now, pay, subscribe now, start trial;
  - *external*: share, rate us, privacy policy, terms, social links;
  - *out-of-scope*: camera, gallery, upload, mic, voice, attach, location.
  Opening a paywall is fine and valuable. The Play billing sheet opens in `com.android.vending`, where we never act. For extra safety, use an emulator Google account **with no payment method**.

**Per-state LLM annotation** (`explore.ts` `claudeAnnotate`). One `messages.parse` call to `claude-sonnet-5` at effort `low` with structured output. Input is the screenshot resized to 1280 px tall (about 1k image tokens) plus the numbered candidate list. Output fields:
- `screen_name`, `purpose`, `kind` (screen, modal, bottom_sheet, paywall, chat, feed, form, onboarding, system, error), `in_scope`;
- `monetization_signals`, quoting the UI text;
- per-candidate `intent`, `priority` 0–3 and `skip`;
- `text_inputs`, with realistic values and in-character chat messages.

The system prompt states the goal: map the core product **and every monetization mechanic**. That goal is the "curiosity" that matters for Simula. Expect about $0.01–0.02 per state and 60–120 states per app.

**Monetization checklist, which drives the escalation.** Track whether we have seen: a paywall with prices; a currency balance; a currency sink (cost per action); a currency source (check-in, tasks); a limit-reached state; ads; an onboarding upsell; subscription management. At `sinceNew = 20`, make one Opus 5.5 call with the state graph summary, untried and skipped intents, and unchecked items. It returns up to 5 (state, action or input) goals, which get priority 3. Allow this at most twice per app.

**Text inputs and chat.** Chat composers get short in-character messages from the annotation, plus probe messages that exercise features:
- a normal message;
- "make me an image of…" (Luzia's image cap);
- a long-output request (OOC's output-length surcharge).

`typeBudget` is about 20 messages per app. Record the transcripts (the mock replays them as canned replies) and the edge effects. Do login and onboarding by hand *before* the run, then save an emulator snapshot: `adb emu avd snapshot save base`. `snapshot load base` is the hard reset. It restores device-local state only; server-side state such as credits is not restored, so log that.

**Drain probe** (`explore.ts`). If an edge is a self-loop (same state) with a numeric effect whose delta is below 0, mark the candidate untried again at priority 3. Repeat up to `drainMax = 12` times, within `typeBudget`. In the simulation it spent the 150-credit balance in 30-credit steps and reached "Out of credits → Buy 500 credits". **Spending credits on OOC is the point**, because the insufficient-credits state is a P0 item in `app-intel.md`.

**Effects: "what changes after an action".** `diffEffects()` indexes text nodes by `rid|masked text` and reports numeric deltas, such as `credits|# credits: 500 → 410, delta −90`. It also reports appeared and disappeared elements. Navigation edges keep only numeric effects; self-loops and modals keep everything. These deltas feed the product model's mechanics ("a Superb message costs 90") and the mock's simulated backend.

**Backtracking.** `navigateTo()` runs BFS over in-app edges where `fail ≤ ok + 1`. It walks the path and checks the state after each hop. If there's no path or a hop fails, it relaunches and tries again from the launch state. If that fails too, the target's untried candidates become `unreachable`. This is LLM-Explorer's scheme.

**Leaving the app.** `classifyForeground()` maps the package: `permissioncontroller` → permission_dialog (record it, then BACK, which denies); camera; `documentsui`/`photopicker` → picker; `chrome` → browser, which includes Custom Tabs; `com.android.vending` → **play_billing**; `gms` → Google sign-in; `settings` → OS settings; launcher. The Play billing screenshot is evidence of price points, but `FLAG_SECURE` windows may capture as black. Non-app states have all their candidates skipped.

**Stopping.** A screen is done when no candidate is untried. Globally, stop on `frontier_empty`, or `sinceNew ≥ 40` (after escalation), or `maxSteps = 400`, or `maxUsd = 5`, or 60 minutes. Record the stop reason in the trajectory.

**Explorer outputs, which feed the product model:**
- **states:** id, name, kind, purpose, up to 3 screenshots, a representative raw tree, annotation, monetization signals;
- **edges:** from, to, action label, element key, typed text, effects, surface, ok/fail counts;
- **external surfaces**, **transcripts**, a **step log** (every step with its reason), and **cost**.

To make "could another agent mock the app from our output alone?" checkable, **run the mock generator in a separate process that can read only the product-model directory** and has no device access.

---

## 2. Recreating the UI from screenshots and the view hierarchy

### 2.1 What prior work offers, and what to take

| Work | Finding | Take |
|---|---|---|
| **Design2Code** ([2403.03163](https://arxiv.org/abs/2403.03163)) | Benchmark and metrics: block-match (text blocks matched with Jonker-Volgenant; matched area over total area, which penalises missing and hallucinated blocks), text (character-level Sørensen-Dice), position (1 − max(\|Δx\|,\|Δy\|) of block centres, normalised), colour (CIEDE2000), CLIP (with text inpainted). *Text-augmented prompting* (giving the text) helps. **Free-form self-revision gave only minor gains.** | Give exact text and bounds from the tree. Drive revisions with **measured** diffs, not "compare and improve". |
| **DCGen** (FSE 2025, [2406.16386](https://arxiv.org/abs/2406.16386)) | Split the screenshot, generate code per segment, then reassemble. Up to +15% visual similarity on large images. Failure types: element omission, distortion, misarrangement. | Region-level **repair** for low-scoring regions. Segments come for free as top-level children of the accessibility tree, so no image segmentation is needed. |
| **LayoutCoder** (ISSTA 2025, [2506.10376](https://arxiv.org/abs/2506.10376)) | Build element relations, parse a layout tree, then generate code guided by that layout. Beats a Claude 3.5 baseline. | We already *have* the layout tree. Pass it explicitly with depth and dp bounds. |
| **Prototype2Code** ([2405.04975](https://arxiv.org/abs/2405.04975)) | "Design lint" fixes fragmented elements before generation; also optimises the hierarchy. | `finalize()` flattens wrappers before prompting. |
| **DesignCoder** ([2506.13663](https://arxiv.org/abs/2506.13663)), **ComUICoder** ([2602.19276](https://arxiv.org/abs/2602.19276)) | Hierarchy-aware divide and conquer with self-correction. ComUICoder merges structurally similar blocks into **reusable components** and uses **priority-based element-wise feedback**. | Generate shared chrome once (the design-system step). Feedback lists diffs per element, ordered by severity. |
| **UICoder** (NAACL 2024, [2406.07739](https://arxiv.org/abs/2406.07739)) | Compiler and CLIP scores filter self-generated UI code to fine-tune on. | Keep only the principle: automated checks (renders, all `data-node`s present) gate every output. Skip fine-tuning. |
| **DeclarUI** (FSE 2025, [2409.11667](https://arxiv.org/abs/2409.11667)) | React Native generation using component segmentation, a **Page Transition Graph** and compiler-driven repair. 96.8% PTG coverage. | Our `flows.json` *is* a PTG. Report **"PTG coverage"** as the flow-QA pass rate. |
| **Interaction2Code** (ASE 2025, [2411.03292](https://arxiv.org/abs/2411.03292)) | Multimodal LLMs are weak at generating interactions. Highlighting interactive elements and pairing visuals with text descriptions helps. | **Do not ask the LLM to write interactions.** Wire them deterministically from the graph. |
| **gWorld** ([2602.01576](https://arxiv.org/abs/2602.01576)), **AppDeltaWorld** ([2608.05891](https://arxiv.org/abs/2608.05891)) | Mobile screens predicted as *renderable HTML* beat pixel prediction. AppDeltaWorld expresses transitions as constrained code deltas. | This supports HTML as the mock format, and screens plus transitions as the unit. |

### 2.2 Recommended pipeline

The code is in `recreate/tokens.ts` and `recreate/generate.ts`.

1. **Measure tokens; never ask the model to eyeball them.**
   - **dp conversion:** `dp = px / (dpi/160)`, with dpi from `adb shell wm density`.
   - **Colours per node** (`nodeColors`): the background is the dominant k-means colour of the 2 px border ring, which ignores text and icons inside. The foreground is the interior cluster farthest from the background by CIEDE2000, with at least 3% share and ΔE > 8. Tested on a synthetic button: `bg #6c3cf0`, `fg #ffffff`.
   - **Screen palette:** k = 8 over a 90×200 downsample, with pixel shares.
   - **Type scale** (`typeScale`): cluster single-line text heights (h / 1.17, the line height of Roboto with the default font padding), snap to 0.5 dp, then merge sizes with gaps under 1.5 dp.
   - **Font size per node** (`estimateFontDp`): pick the scale step whose implied line count is closest to an integer *and* agrees with text length (average glyph width about 0.52 em).
   - Leave **font family, weight, radii and shadows** to the vision model. Allow Google Fonts in the mock.
2. **Assets** (`extractAssets`). Crop image-like leaves at native pixels: `*Image*`/`*Icon*` classes, or leaves with a content-desc and no text. Dedupe across screens by dHash distance ≤ 4 and size within ±4 dp. Keep a manifest of label, dp size and the screens that use it. Fallback: the model names a Material Symbols icon, which is crisp at any DPR. Avatars and thumbnails in feeds become assets too; mocks should show **real copy and real imagery**, not lorem ipsum.
3. **Design system**, once per app (`generateDesignSystem`). Opus 5.5 at effort `high`, streamed, with 4–6 representative screenshots and the tokens. Output: CSS variables plus component classes for the app bar, bottom nav, buttons, card, list row, incoming and outgoing chat bubbles, composer, modal, bottom sheet and paywall. This is ComUICoder's reuse idea, and it keeps screens consistent and cheaper to generate.
4. **Per-screen fragment** (`generateScreen`). Opus 5.5 at effort `high`, with structured output `{html, unresolved[]}`. Inputs:
   - the **native-resolution** screenshot (1080×2400 is under the 2576 px long edge, so coordinates are 1:1);
   - the measured element spec, one line per node: `{id, depth, cls, rid, text, hint, r (dp), bg, fg, font, act}`;
   - the design-system CSS, the asset manifest, counter bindings and outgoing edges.

   Hard rules in the prompt:
   - match every box to within 2 px;
   - `data-node` on every element;
   - copy text verbatim;
   - no status or navigation bar;
   - no scripts;
   - `data-bind="<counter>"` on counters.

   Per the Opus 5.5 notes, the model follows **named** bans better than generic ones, for example "no shadows or rounded corners that aren't in the screenshot".
5. **Runtime**: hand-written, about 200 lines of plain JS, the same for every app.
   - hash router `#/<stateId>` that sets `body[data-screen]`; overlays set `body[data-modal]`;
   - transitions: push slides in about 250 ms, modals fade, sheets slide up;
   - `backend.json` starts counters at the observed values and applies per-edge deltas from the explorer's effects;
   - chat: the composer appends a user bubble, shows a typing indicator, then replays a captured bot reply;
   - a limit rule from the drain probe: when a counter would fall below the cost, go to the observed paywall state.

   This is how "simulated backend" and "what changes after an action" become interactive without app-specific code.
6. **DCGen repair** (`regenerateRegion`). If a top-level region's block-match stays below 0.8 after 2 QA iterations, regenerate just that region from a cropped screenshot and its subtree, then splice it in with Playwright `outerHTML`.

**Pixel alignment, which matters for QA.**
- Playwright viewport = the **app window in dp**; `deviceScaleFactor = dpi/160` (2.625 at 420 dpi). The mock screenshot then has the same pixel grid as the device's.
- Crop the device screenshot to the app window. Read the status-bar and nav-bar bounds from the systemui nodes in the raw dump. The 24 dp constant in the sketch is a placeholder.
- Pick the representative observation of each state carefully: the most complete one, with no keyboard.

---

## 3. Visual QA loop

### 3.1 Metrics (`qa/compare.ts`)

| Metric | Implementation | Catches | Blind to |
|---|---|---|---|
| Block-match | Area-weighted matched fraction over the accessibility boxes of the original and the `[data-node]` boxes of the DOM. Matched by **id first**, then **Hungarian** on the leftovers with cost 1 − (0.5·Dice + 0.5·IoU), accepted below 0.7. | Missing or extra elements | Styling |
| Text | Character-bigram Sørensen-Dice | Copy errors, truncation | Font |
| Position | Design2Code's 1 − max(\|Δx\|,\|Δy\|), normalised | Layout drift, but **leniently**: a 60 px shift on 1080×2400 costs only 0.018 of the composite in the self-test | Size |
| Colour | CIEDE2000 (`culori`) on ring background + foreground cluster; flagged when ΔE > 10 | Wrong fills and text colours | Gradients |
| SSIM | `ssim.js` on a 360-px-wide downsample | Global structure and texture. Replaces CLIP, which has no good local Node option; SSIM is deterministic. | Semantics |
| Pixel | `pixelmatch` with threshold 0.1, plus a **diff heatmap PNG** | Where things differ, for the critic | Too harsh on anti-aliasing and font rendering, so **not** in the composite |

**Composite** = 0.25·block + 0.15·text + 0.20·position + 0.15·colour + 0.25·SSIM. Use it for **trend and stopping only**. Fixes come from the **diff list**: missing, extra, position > 12 px, size > 10%, text Dice < 0.9, colour ΔE > 10. The list is sorted by severity and each item carries the target values (`selftest.ts` §6 shows `offset by (0, 60)px; target [240,1000 600x150]…`).

### 3.2 The loop (`qa/loop.ts`)

1. **Measure.** Render → compare → save the screenshot, diff PNG and scores for this iteration. That's the "diffs → fix" evidence the assignment asks for.
2. **Critic.** Sonnet 5 at effort `medium`, with structured output. It sees the original, the mock, the diff heatmap and the **top 15 measured diffs**. It returns at most 8 `{node, problem, fix-with-target-values}` items, and an `ignore[]` list for dynamic content. It may add problems the metrics can't see (icons, weights, radii, shadows).
   - This grounding is the answer to Design2Code's finding that free-form self-revision barely helps. ComUICoder uses element-wise feedback, and 1D-Bench ([2602.18548](https://arxiv.org/abs/2602.18548)) finds that iterative component-level edits improve results.
   - Opus 5.5 notes say crop tools help most on dense inputs. Cheap version: send the full screens at 1280 px tall **plus 4–6 crop pairs** for the top diffs.
3. **Fixer.** `generateScreen(..., feedback, bestHtml)` makes a revision **from the best version so far**.
4. **Keep the best and guard against regression.** Accept a new version only if the composite improves by at least 0.005; otherwise the stale counter goes up.
5. **Stop** when composite ≥ 0.90, or two stale iterations in a row (plateau), or `maxIters = 4`, or the $ cap. Spend iterations where they matter: go deep on the roughly 8 screens that appear in the slides, and give the rest one pass.

**Flow-level QA** (`qaFlows`). For every recorded edge `(from, node, to)`: open `mock#/from`, click `[data-screen=from] [data-node=node]`, wait for the transition, and assert that `body.dataset.modal || body.dataset.screen === to`. Report the pass rate as PTG coverage.
- A failure caused by a **missing handler** is fixed deterministically in `flows.json`. A failure caused by a missing element means that screen gets regenerated.
- Edge node ids must refer to the **representative** tree used to generate each screen. Map each edge's element key to that tree with `resolveElement()`.
- Stretch goal: a Sonnet agent runs a task list on the mock ("send messages until credits run out") and its state sequence is compared with the original's recorded path.

---

## 4. LLM-as-judge

### 4.1 What's known

- **Pointwise versus pairwise.** Absolute scores compress and drift. Pairwise is more discriminating, but costs O(n²) comparisons and has **position bias**; the standard fix is to evaluate both orders and count only consistent wins (MT-Bench, [2306.05685](https://arxiv.org/abs/2306.05685)). Rubric scoring *also* has position bias over the score options ([2602.02219](https://arxiv.org/abs/2602.02219)); balanced permutation of the options fixes it.
- **Decomposition helps.** Scoring criterion by criterion with anchored scales works better than one holistic score (G-Eval [2303.16634](https://arxiv.org/abs/2303.16634), Prometheus [2310.08491](https://arxiv.org/abs/2310.08491)). **Binary checklists** (CheckEval, EMNLP 2025, [2403.18771](https://arxiv.org/abs/2403.18771)) raise agreement between judges by about 0.45 and reduce variance.
- **Known biases:** position, **verbosity**, **self-preference**, and anchoring on the previous score in revise loops. Self-preference applies here because Claude judges Claude-written proposals.
- **Panels.** PoLL ([2404.18796](https://arxiv.org/abs/2404.18796)): 3 small judges from *different model families* beat one GPT-4 judge and cost 7× less. **We only have Claude**, so diversity has to come from personas and model tiers. Say this plainly as a limitation.
- **Is the judge any good?** FBI ([2406.13439](https://arxiv.org/abs/2406.13439)) perturbs answers along one quality dimension at a time; judges **missed the quality drop in over 50% of cases**, and reference-guided judging did best. The Alternative Annotator Test ([2501.10970](https://arxiv.org/abs/2501.10970)) is a statistical test for replacing human annotators with an LLM; it needs a few humans, so it's the production path, with Simula's team as the annotators.
- **No logprobs on the Claude API**, so G-Eval's probability-weighted scores are unavailable. Use the median across the panel and reruns instead.
- **Revise loops** (Self-Refine, [2303.17651](https://arxiv.org/abs/2303.17651)): most of the gain comes in the first 1–2 rounds. Beyond that the proposer starts optimizing for the judge.

### 4.2 Recommended judge (`judge/judge.ts`)

**Rubric** (1–5, with an anchor for 1 and for 5 on each criterion; evidence is written before the score):

| Criterion | Weight | Gate? | Question |
|---|---|---|---|
| value | .20 | | Is the reward something *this app's* users demonstrably value? Cite the limit, currency or entitlement. |
| trigger | .15 | | Does the offer appear at a moment of need (the limit is hit, the paywall is declined) without interrupting the core loop? |
| opt_in | .10 | ✔ | Is the ad started only by the user, with an honest decline path? |
| cannibalization | .15 | | Is the reward sized and capped against paid tiers? Is it aimed at non-payers or users who declined the paywall? |
| grounding | .10 | ✔ | Does every referenced screen, element and mechanic exist, or is it explicitly marked as new? |
| specificity | .15 | | Does it only make sense for this app, and go beyond the obvious placement? |
| revenue | .15 | | Reach × frequency: how many users hit this trigger, and how often? |
| policy | 0 | ✔ | Is it store- and brand-safe (no incentivized ratings or installs, respects the age rating, no ads on sensitive content)? |

**Gates are checklist items**, answered yes/no by each judge with evidence. There are 6 items: tap-only start, a decline of comparable prominence that leaves the user no worse off, reward stated up front, everything exists, no prohibited incentives, safe context. A gate fails if **at least 2 of the 3** judges answer "no" to any of its items.

**Deterministic grounding check.** `flow[].stateId` must exist in the product model, or be written as `new:…`. This removes the most common hallucination without spending a model call.

**Panel.** Three personas on `claude-sonnet-5` at effort `medium`: the app's head of product (protects retention and subscriptions), a rewarded-ads monetization lead (opt-in rate, completion, eCPM), and a skeptical power user who reviews UX ethics. Take the median per criterion. **When the scores on a criterion span 2 or more points**, one `claude-opus-5-5` call adjudicates, seeing the panel's evidence.

**Decisions.**
- **pass:** no gate failed, weighted ≥ 3.6, and no non-gate criterion ≤ 2.
- **revise:** weighted ≥ 2.8, or the only failure is the fixable `grounding` gate.
- **reject:** anything else.

**Revise-and-resubmit** (`reviseLoop`). At most **2 rounds**. The proposer gets the judge's `required_changes`. The revision goes to a **fresh panel that never sees the previous score**, which prevents anchoring. Stop early if the weighted score improves by less than 0.2. A proposal still marked "revise" after the last round becomes reject. Log every round; rejected proposals and their scores are part of the deliverable.

**Ranking survivors** (`pairwiseRank`). Compare every pair in **both orders**. A win counts only if it holds across the swap; otherwise each side gets 0.5. Report `swapConsistency`. For 6 survivors that's 30 cheap Sonnet calls.

**Verbosity control.** The proposer outputs a fixed `Proposal` schema (anchor, trigger, exchange, flow, evidence, risks, rationale) with a length cap on each field. Judge prompts say that length and polish are not evidence.

### 4.3 Calibration: how we know the judge is good

Use **Luzia**, where Simula's own slides provide gold examples.

**Known-good items (about 5).**
- Simula's 3 hand-made ideas, rewritten in the `Proposal` schema and grounded in *our* Luzia product model: (a) rewarded games in chat after the free messages run out; (b) proactive "Refills" on the home screen; (c) Daily Tasks with a sponsor ad.
- Two OOC proposals the candidate writes, for example a free tab in the Refill Station shown after the paywall is declined, and a doubler on the daily check-in.

**Known-bad items (about 20). Each changes one criterion of a good item**, following FBI. Each carries `targetCriterion`:

| # | Perturbation | Should fail |
|---|---|---|
| 1 | The reward becomes something nobody values (a profile badge) | value |
| 2 | An interstitial auto-plays after every 3rd message | opt_in gate |
| 3 | The rewarded ad unlocks a week of Luzia+ | cannibalization |
| 4 | References a "Rewards tab" that doesn't exist | grounding gate (the deterministic check also fires) |
| 5 | The offer shows before the first message, during onboarding | trigger |
| 6 | "Add a 'watch a video for coins' button on home" | specificity |
| 7 | Placed under Settings › About | revenue |
| 8 | Rewards a 5-star rating, or an install of a partner app | policy gate |
| 9 | **Cross-app transplant**: a good OOC proposal submitted for Luzia, still naming OOC's credits | grounding + specificity. This checks that the judge actually reads the product model. |
| 10 | #3 padded with three times as much persuasive prose | still fails (verbosity bias) |

**Invariance items (about 5).** A paraphrased or reordered version of each good item should score within ±0.2 of it. A padded good item must not gain points.

**Metrics and targets** (`calibrate()`, with 3 reruns per item):

| Metric | Target |
|---|---|
| Bad items that pass | **0** |
| Good items that pass | ≥ 80% |
| AUC (good versus bad weighted score) | ≥ 0.9 |
| Targeted detection (the targeted criterion's median ≤ 2) | ≥ 80% |
| Rerun MAD of the weighted score | ≤ 0.15 |
| Decision flip rate across reruns | ≤ 10% |
| Paraphrase shift | ≤ 0.2 |
| Pairwise swap consistency | ≥ 85% |

If a target is missed, **fix the rubric wording or anchors, not the items**. Hold out a third of the perturbations as a test set so the judge isn't overfit. Show the confusion matrix and these numbers in the recording; that is the answer to "how do you know the judge is good?". Cost is about 30 items × 3 reruns × about $0.10, roughly **$9, once**.

---

## 5. Model routing and cost for the deep app

Prices from the claude-api skill, per MTok input/output: Opus 5.5 $4/$20, Sonnet 5 $2/$10, Haiku 4.5 $1/$5. An image costs about w·h/750 tokens, up to 4784 at a 2576 px long edge; a 1080×2400 screenshot is about 3.5k tokens.

| Stage | Model and effort | Volume | Estimated $ |
|---|---|---|---|
| Per-state annotation | Sonnet 5, low | 60–120 states | 1–2 |
| Plateau escalation | Opus 5.5, high | ≤ 2 | 0.3 |
| Design system | Opus 5.5, high | 1 | 0.3 |
| Screen generation | Opus 5.5, high | about 20 screens | 4–5 |
| QA critic + fixer | Sonnet 5 medium + Opus 5.5 high | about 40 iterations | 8–12 (**largest cost; cap it**) |
| Proposals + judge + revisions + pairwise | Sonnet 5 panel, Opus 5.5 chair and proposer | about 12 candidates | 3–5 |
| Judge calibration | same | once, on Luzia | about 9 |

That comes to about **$20–30 for the deep app** and **$6–10 for each transfer app** (explore, about 5 screens, proposals). Log `usage` from every call; the assignment asks for spend.

Haiku 4.5 is enough for bulk text work, such as summarising edge effects and writing paraphrases for the calibration set. Don't use it for pixel-level critique.

**API gotchas:**
- On **Opus 5.5**, thinking cannot be disabled, effort **defaults to `medium`** (set it explicitly), forced `tool_choice` returns 400 and prefill is removed. So all JSON goes through `client.messages.parse` + `zodOutputFormat` (`@anthropic-ai/sdk/helpers/zod`, zod v4).
- Check `stop_reason === "refusal"` before reading content. JanitorAI content can trigger it.
- **Sonnet 5** rejects `temperature`, so variance between reruns is simply the model's default sampling.
- Stream long generations (`messages.stream(...).finalMessage()`).

---

## 6. Deterministic versus model-driven (a talking point for the recording)

**Deterministic:**
- device control, settling, tree normalization;
- state identity (hash, Jaccard, dHash), candidate extraction, safety regexes;
- action selection, path finding, relaunch and replay, foreground checks, the drain probe, effect diffs;
- token measurement, asset cropping and dedupe, the mock runtime and routing;
- all QA metrics and matching, keep-best and stop rules, flow replay;
- the grounding check, gate aggregation, decision thresholds and calibration metrics.

**Model-driven**, and always *bounded* by the rules above:
- per-state understanding (names, kinds, priorities, extra skips, input values, monetization signals);
- plateau goals;
- design-system and screen code;
- the critic's fixes;
- proposals, judge scores and evidence, adjudication, pairwise preference.

---

## 7. Using the sketches

| File | What it is | Status |
|---|---|---|
| `src/explorer/uitree.ts` | Parsers for uiautomator XML and mobilecli JSON, `finalize()` lint, `labelOf` | XML path tested. **Check on day 1** that mobilecli's `rect` is `{x,y,width,height}`, and check its top-level wrapper. |
| `src/explorer/state.ts` | Abstract tree, state key, Jaccard, masked dHash, `sameState`, `diffEffects` | Tested |
| `src/explorer/actions.ts` | Candidates, homogeneous and heterogeneous groups, element keys, `resolveElement`, risk regexes, `classifyForeground` | Tested |
| `src/explorer/explore.ts` | The `Explorer` loop (`Device` interface, injectable annotator, settle, BFS navigation with relaunch, drain probe, stop reasons) | Loop tested in the simulation. The Claude annotator is **untested**. |
| `src/recreate/tokens.ts` | k-means, node colours, palette, type scale, font estimate, asset extraction, element spec | Colour and scale tested |
| `src/recreate/generate.ts` | Design-system and screen prompts, DCGen region repair | Typechecks only |
| `src/qa/compare.ts` | Hungarian, Dice, IoU, DOM boxes, `compareScreens` | Tested on synthetic images |
| `src/qa/loop.ts` | Render, critic, fixer loop; flow QA | Typechecks only |
| `src/judge/judge.ts` | Rubric, checklist gates, panel with chair, decisions, revise loop, pairwise ranking, calibration metrics | Typechecks only |
| `src/selftest.ts`, `src/simtest.ts` | Offline tests | Pass |

To implement `Device` on top of mobile-mcp:
- `tap` → `mobile_click_on_screen_at_coordinates` with coordinates, not refs;
- `longPress` → `mobile_long_press_on_screen_at_coordinates`;
- `type` → `mobile_type_keys {submit}`;
- `swipe` → `mobile_swipe_on_screen {direction, x, y, distance}`, with the end clamped;
- `back` → `mobile_press_button BACK`;
- `foreground` → `mobile_get_foreground_app`;
- `screenshotPng` → `mobile_save_screenshot *.png` under the server's cwd;
- `relaunch` → `mobile_terminate_app` + `mobile_launch_app`;
- `dumpTree` → `mobilecli dump ui --format raw`, or `adb exec-out uiautomator dump /dev/tty`.

Set client-side timeouts and respawn the server when it hangs (`mobile-mcp.md` gotcha 6).

**Known gaps:**
- Replay can't reach elements that only appear after scrolling. Fix: record the scroll count per candidate, or in `resolveElement` scroll the container up to 3 times while searching.
- The status-bar crop is a constant.
- No handling of WebView-heavy screens (AOL articles) beyond dHash.
- The APE refinement rule is described but not implemented.

---

## Sources

- LLM-Explorer: https://arxiv.org/abs/2505.10593 · LLMDroid: https://dl.acm.org/doi/10.1145/3715763 · AutoDroid: https://arxiv.org/abs/2308.15272 · GPTDroid: https://arxiv.org/abs/2310.15780 · DroidAgent: https://arxiv.org/abs/2311.08649 · AppAgent: https://arxiv.org/abs/2312.13771 · Mobile-Agent: https://arxiv.org/abs/2401.16158, v2: https://arxiv.org/abs/2406.01014, v3.5: https://arxiv.org/abs/2602.16855 · UI tarpit escaping: https://arxiv.org/abs/2604.06763 · DroidBot (ICSE-C 2017), APE (ICSE 2019), QTypist (ICSE 2023): conference papers
- mobile-mcp: https://github.com/mobile-next/mobile-mcp (tool list), plus `research/mobile-mcp.md`
- Design2Code: https://arxiv.org/abs/2403.03163 · DCGen: https://arxiv.org/abs/2406.16386 · LayoutCoder: https://arxiv.org/abs/2506.10376 · Prototype2Code: https://arxiv.org/abs/2405.04975 · DesignCoder: https://arxiv.org/abs/2506.13663 · ComUICoder: https://arxiv.org/abs/2602.19276 · UICoder: https://arxiv.org/abs/2406.07739 · DeclarUI: https://arxiv.org/abs/2409.11667 · Interaction2Code: https://arxiv.org/abs/2411.03292 · 1D-Bench: https://arxiv.org/abs/2602.18548 · gWorld: https://arxiv.org/abs/2602.01576 · AppDeltaWorld: https://arxiv.org/abs/2608.05891
- MT-Bench / LLM-as-a-judge: https://arxiv.org/abs/2306.05685 · G-Eval: https://arxiv.org/abs/2303.16634 · Prometheus: https://arxiv.org/abs/2310.08491 · CheckEval: https://arxiv.org/abs/2403.18771 · Rubric position bias: https://arxiv.org/abs/2602.02219 · PoLL: https://arxiv.org/abs/2404.18796 · FBI: https://arxiv.org/abs/2406.13439 · Alternative Annotator Test: https://arxiv.org/abs/2501.10970 · Self-Refine: https://arxiv.org/abs/2303.17651
- npm packages used, with versions checked on 2026-09-25: pixelmatch 7.2.0, ssim.js 3.5.0, sharp 0.35.4, culori 4.0.2, fast-xml-parser 5.11.1, playwright 1.63.0, @anthropic-ai/sdk 0.128.0, zod 4.6.5
