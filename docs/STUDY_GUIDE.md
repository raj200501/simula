# Study guide: understand what you're submitting

The brief says AI tools are fine "as long as you understand what you submit and can explain and modify it". This guide gets you there in about an hour. Read it once, then do the **code tour** with the repo open.

---

## 1. The whole thing in one breath

> The system opens a real Android app on an emulator. It taps through it like a curious user, spends the free allowance until the app blocks it, and writes down everything it learns (screens, buttons, what things cost, where the walls are, what's for sale) into one file called the **product model**. From that one file it generates:
> - a clickable copy of the app (the **mock**), then checks the copy against real screenshots and fixes it (**QA**);
> - ideas for rewarded ads grounded in the app's own economy (**propose**);
> - a strict review that rejects weak ideas (**judge**);
> - slides showing each approved idea as a five-screen story (**slides**).

**The thesis to repeat:** *understand the app as an economy*. That means:
- what users spend;
- what each action costs;
- where free users hit a wall;
- what the app sells.

Rewarded ads work when they trade a short ad for something the user genuinely wants at that moment.

---

## 2. Words you'll use

| Word | Plain meaning |
|---|---|
| **Rewarded ad** | An ad the user *chooses* to watch or play in exchange for a reward. It must be opt-in, disclosed up front, granted only after completion, and free to decline. |
| **eCPM** | Revenue per 1,000 ad views. A US rewarded view earns roughly $0.012–0.020. We cut that by 25% because non-game apps earn less. |
| **Exchange rate** | What one completed ad view is worth *in the app's own units*, e.g. "1 view ≈ 6–11 credits". When the app shows no prices (Luzia's guests), it's measured against what a message costs to serve instead. |
| **Cannibalization** | The risk that free ad rewards stop people buying. The code checks whether a day of maximum ad rewards is worth more than the cheapest pack. |
| **SSV / REWARD_VERIFIED** | Server-side verification. The reward is granted only when the ad network confirms the view. In Simula's SDK the event is `REWARD_VERIFIED`. |
| **Product model** | One JSON file (`out/<app>/model/product-model.json`) holding screens, buttons, transitions, the economy, moments and flows. It's the only thing the later stages read. |
| **State / signature** | Two screenshots are the "same screen" if their stable labels (tab names, titles, buttons) match. Chat messages and typed text are ignored, so a chat with 3 messages and one with 30 count as one screen. |
| **Drain probe** | The explorer's special move: repeat a "spend" action (send a message) until the app blocks it. That measures the cost and finds the **wall**. |
| **Wall** | The screen that blocks a free user: "Out of credits", "Out of free messages", a sign-up sheet. It's the strongest moment for a rewarded offer. |
| **Moment** | A place in the app where an offer could appear: a wall, a *decline* (user said "Not now" to paying), a *hub* (home), *post-reward* (just claimed a bonus), or *desire* (a premium option is visible). The *first-value* moment is protected: no offers before the user has enjoyed the app. |
| **Regime** | The app's economic type, computed in code: **consumable-economy** (spends a currency or quota), **subscription-gated** (a paid plan unlocks features) or **no-scarcity** (nothing is scarce, so proposals must be product changes). |
| **Existing mechanic vs. product change** | The two cases the brief asks for. An existing mechanic uses something the app already has (credits, a message cap). A product change adds something new, like daily tasks. |
| **Gate** | A pass/fail check. *Code gates* are computed, e.g. "does this screen id exist?" or "is the reward cash-like?". *LLM gates* are yes/no questions with a quoted answer, e.g. "is declining free?". |
| **Rubric / verdict** | The judge scores 9 criteria from 1 to 5, with evidence for each. **Code** turns the scores and gates into SHIP, REVISE or REJECT using fixed thresholds. SHIP needs a weighted score of at least 3.8, every criterion at least 3, and every gate passed. |
| **Stub** | A deterministic, no-AI fallback for every AI call. It lets the whole pipeline run with no key (`npm run demo`) and keeps running when the free quota runs out. Stub outputs are labelled "stub". |
| **Cache / replay** | Every AI answer is saved in `cache/llm/`, so a run can be replayed with no key and at no cost. |

---

## 3. The six "how you operate" questions (Simula grades these)

1. **How is the device controlled?**
   - Through **mobile-mcp**, the tool the brief suggests: an MCP server that gives screenshots, the accessibility tree, tap, swipe and type.
   - Our code is the MCP client (`src/device/mcp.ts`).
   - It taps by coordinates we compute, never by the server's element ids. Those ids shift when the screen changes.
2. **How does the agent decide what to explore?**
   - **Code keeps a frontier** of untried actions. For each *new* screen, a small model is asked one question: name this screen, rank what to try, and flag prices, limits and ads.
   - Code builds the list of candidate buttons; the model only reorders them.
   - Guard rails in code: never log out, never buy, never tap an ad.
   - It stops when nothing new appears for a while (saturated) or the budget runs out.
   - Then the **drain probe** runs.
3. **How is app knowledge represented?**
   - As one typed **product model**. Every claim in it has evidence: an on-screen quote, or a counter change the explorer measured.
   - Code verifies each quote. Anything unverifiable is marked "inferred".
4. **How do agents share context?**
   - They don't message each other. Each stage reads and writes typed files on disk, like a shared blackboard: `graph.json` → `product-model.json` → `mock/` → `qa/` → `candidates.json` → `judgments.json` → `deck`.
   - Any stage can be re-run on its own.
5. **What is deterministic vs. model-driven?**
   - **Code:** device control, screen identity, the frontier, guard rails, all arithmetic, gates and verdicts, the mock's behaviour, and slide layout.
   - **Models:** naming and ranking screens, drafting the economy, writing screen HTML, fixing QA differences, writing proposals, and scoring the rubric.
6. **How are failures handled?**
   - Everything is traced (`trajectory.md`).
   - A device call that hangs is retried, then the server is restarted.
   - A busy or out-of-quota model moves to the next free model.
   - Anything else falls back to its stub.
   - Weak proposals get at most two blind revisions.
   - Blocked apps are recorded, not bypassed (OOC).

---

## 4. Code tour (20 minutes, with the repo open)

| Open this | Look for | Say |
|---|---|---|
| `apps/luzia.json` | 5 lines | "The only per-app input." |
| `src/cli.ts` | the `STAGES` list | "One command per stage." |
| `src/device/types.ts` | the `Device` interface | "Same explorer for the emulator and a web page." |
| `src/explore/explorer.ts` | `explore(...)`: crawl, gap check, drain | "Code drives; the model advises once per new screen." |
| `src/explore/guards.ts` | the regexes | "Never log out, buy, or tap ads." |
| `src/explore/signature.ts` | `matchState` | "How two screens count as the same state." |
| `src/model/understand.ts` | compile → synthesize → verify → quota → economics | "One model call, then code checks everything." |
| `src/model/economics.ts` | `deriveEconomy`, `proposalEconomics` | "Every number on a slide comes from here, not the model." |
| `src/mock/runtime/runtime.js` | `window.__mock` | "The mock's behaviour is fixed code; the model only paints screens." |
| `src/qa/compare.ts` | the composite score | "How we measure the copy against the original." |
| `src/propose/propose.ts` | baseline → moment sweep → ideas → proposals | "Obvious ideas first, so we can beat them." |
| `src/judge/gates.ts`, `verdict.ts` | the gates, `WEIGHTS`, `THRESHOLDS` | "The verdict is code." |
| `src/judge/calibrate.ts` | positives and single-fault negatives | "How we know the judge is good." |
| `src/slides/deck.ts` | the flow slide | "Five frames: today → change → offer → ad → value." |
| `test/boundaries.test.ts` | the three rules | "A test proves there's no app-specific code." |

**If they ask you to change something live**, here are the safe edits:
- Change a threshold in `src/judge/verdict.ts` (`THRESHOLDS.ship`).
- Change the reward cap in `ECON.maxRewardToView` (`src/model/economics.ts`).
- Change a budget in `config/profiles.json`.
- Add a guard word to `DESTRUCTIVE` in `src/explore/guards.ts`.

Then run `npm test` or `npm run demo`.

---

## 5. Numbers to know

You don't have to fill these in by hand. `npm run report` writes **`out/luzia/NUMBERS.md`**, with every figure read from the artifacts of the last run. Open it before recording and learn these:

**Luzia:**
- screens and transitions explored, and why exploration stopped
- the free-message cap it measured ("limit after N sends")
- the exchange rate: 1 view ≈ N messages at cost to serve

**Proposals:**
- SHIP / REVISE / REJECT counts
- one rejected idea and the reason (it's in "Why the others did not ship")

**Judge self-check:** how many single-fault broken proposals it caught, and how many good ones shipped.

**QA:** mean fidelity, and flow QA passed / total.

**Cost:** $0 on the free Gemini tier; the number of live model calls and which models answered.

If the card starts with a ⚠ stub warning, some stages ran on deterministic fallbacks because the free quota ran out. Re-run those stages after the quota resets at midnight Pacific.

**OOC:** it closes itself about 0.8 s after launch. Its security module logs `Kill Process … [D11001]`. It was recorded as blocked, not bypassed.

---

## 6. If something goes wrong in a live demo

- **No emulator or key?** Run `npm run demo`: the whole pipeline on the bundled fixture app with no device and no key.
- **A stage fails?** Each stage re-runs on its own: `npm run <stage> -- --app <app>`. The error is in `out/<app>/<stage>/manifest.json` and `trajectory.md`.
- **Quota?** "The free tier allows about 20 requests a day per model. The system moves between free models, then falls back to labelled stubs. Tomorrow's re-run reuses the cache."
