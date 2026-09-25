# Recording script (12–14 minutes)

**For the presenter.** Read the **Say** lines aloud; they are short on purpose. **Do** tells you what to open or click. Timestamps are targets, not rules. Replace anything in `<angle brackets>` with what you see on your screen.

## Before you press record (10 minutes)

1. Finish the real runs (START_HERE.md, Part F), then run `npm run report`.
2. Open these tabs in one browser window, in this order:

   | Tab | File |
   |---|---|
   | 1 | `out/luzia/slides/deck.html`, scrolled to the first **flow** slide (slide 3) |
   | 2 | `out/luzia/mock/index.html?proposal=P1` (the deck's "Open the clickable prototype" link) |
   | 3 | `out/index.html`, the report page |
   | 4 | `out/luzia/model/viewer.html` |
   | 5 | `out/luzia/qa/report.html` |
   | 6 | `out/luzia/proposals/judgments.md`, rendered (the report page links an HTML version) |
   | 7 | `out/luzia/proposals/judge-eval.md` |
   | 8 | `out/luzia/trajectory.md` |
   | 9 | `out/luzia/NUMBERS.md`: keep it open on a second screen or printed. It holds every number you'll say |

3. In a terminal: `cd ~/simula`, then make the font large (⌘ +).
4. Optional: a 20-second screen clip of the emulator while `npm run explore -- --app luzia` runs. The fixture also works: `npm run demo`.
5. Close Slack and mail. Turn on Do Not Disturb.

---

## 0:00–0:45 · Open with the result

**Do:** Tab 1, the first flow slide. Move the mouse slowly left to right across the five phones.

**Say:**
- "This is the output. One slide per recommended rewarded flow."
- "Left to right: the app today, what we change, the offer, the ad, and what the user gets."
- "Every screen here is our generated mock of the app, not a drawing."
- "The numbers on the right are computed in code, never by the model. Luzia shows guests no prices, so one ad view is measured against what a free message costs to serve."

**Do:** Click **Open the clickable prototype**. In tab 2, click the new element (it has a dashed outline). Click **Play**, wait two seconds, then close it.

**Say:**
- "And this is the same proposal as a clickable prototype. The reward lands only after the ad is verified."

---

## 0:45–1:45 · The idea in one minute

**Do:** Tab 3, `out/index.html`. Scroll slowly past the scorecard.

**Say:**
- "The brief: go from a mobile app to a product model, a mock, and a rewarded-ad proposal, with as little app-specific work as possible."
- "My thesis: understand the app as an economy."
- "What do users spend? What does each action cost? Where do free users hit a wall? What does the app sell?"
- "All of that goes into one product model, with evidence for every claim."
- "Everything else is compiled from that model: the mock, the QA, the proposals, the judge, and these slides."
- "The only per-app input is a small JSON file with the package name."
- "Luzia is the deep app. Janitor and AOL show the same system transferring. OOC was blocked on the emulator. I'll explain why."

---

## 1:45–3:30 · Explore

**Do:** Play your emulator clip, or show the terminal running `npm run explore -- --app luzia`. Then open tab 8, `trajectory.md`, and scroll to "Failures and recoveries".

**Say:**
- "The explorer drives a real Android emulator through mobile-mcp: screenshots, the accessibility tree, tap, swipe and type."
- "Code drives. The model only advises."
- "For each new screen, a small model names it, ranks what to try, and flags money signals like prices and limits."
- "Code keeps the frontier, decides when two screens are the same state, and stops when nothing new appears."
- "Guard rails: it never logs out, never buys, and never taps an ad. It records ads and moves on."
- "One special move: the drain probe. On a chat, it keeps sending messages until the app blocks it."
- "That's how we measure what a message costs, and where the wall is. On Luzia it recorded the exact number: <limit after N sends, from trajectory.md or the model viewer>."
- "Everything it did, every failure and every recovery, is in this trajectory."

---

## 3:30–4:45 · Understand: the product model

**Do:** Tab 4, `viewer.html`. Show the **Economy** table, then scroll to **Coverage / Not explored**.

**Say:**
- "This is the product model, as a page a person can check."
- "Resources, what each action costs, how users earn, what's sold, the walls, and the ads today."
- "One model call drafts it. Then code verifies it."
- "Every quote must really appear on that screen. Every number must appear in a quote or in a measured counter change."
- "Anything that doesn't verify is marked 'inferred', in orange."
- "Code also computes the economics: price per unit, and the exchange rate. That's what one ad view is worth in the app's own currency."
- "Luzia never shows a guest a price. So instead of list price, code measures one ad view against what a free message costs to serve: <say the line from the viewer, like '1 view ≈ 3.5–5.8 messages at cost to serve'>."
- "And it lists what we did NOT explore, and why."

---

## 4:45–6:15 · Mock and QA

**Do:** Tab 2, the mock without `?proposal`: remove it from the URL and reload. Click through two or three screens: a tab, the chat, the store. Then open tab 5, `qa/report.html`, and click one screen with rounds.

**Say:**
- "The mock is generated from the model. One model call writes the HTML for each screen, from its screenshot and element list."
- "The behaviour is fixed code: navigation, counters, the chat, the wall, and the rewarded overlay."
- "So it clicks through like the app, and it opens from a file. No server."
- "QA renders every mock screen and compares it to the real screenshot."
- "Box positions, text, colours, and structure. The heatmap shows where they differ."
- "The worst differences go back to the model as a fix request. We keep the best round, and we stop when it's good enough or stops improving."
- "Flow QA replays every edge of the model on the mock. <Say the flow QA number from the page.>"

---

## 6:15–7:45 · Propose

**Do:** Open `out/luzia/proposals/candidates.md`. Show the baseline, then the ideas table, then one full proposal.

**Say:**
- "The proposer gets the model digest, key screenshots, and a rewarded-ads knowledge base."
- "First it writes the three obvious ideas a generic ad-ops person would propose. Those are the bar to beat."
- "Then it sweeps every moment in the model: walls, declines, just-got-a-reward, places users return to."
- "It must mix two cases."
- "Existing mechanic: the app already has something valuable, like credits, to anchor the exchange."
- "Product change: we add a mechanic, like daily tasks, that creates a real value exchange."
- "Each proposal is a typed patch to the model. So the mock can render it, and the judge can check it."
- "The model never does the arithmetic. It states assumptions; code computes the economics."
- "A note on your own Luzia slides: the out-of-free-messages moment you picked is the same one this system lands on. It gets there by measuring the cap, not by being told. To be fair, the knowledge base includes public rewarded patterns, yours among them. What the system adds is grounding them in the real UI, with measured numbers, and going past them: <name one SHIP idea that is not in your slides; the list is in out/luzia/NUMBERS.md>."

---

## 7:45–9:15 · Judge

**Do:** Tab 6, `judgments.md`. Show one REJECT or REVISE, then one SHIP with a revision. Then tab 7, `judge-eval.md`: show the confusion table.

**Say:**
- "The judge runs in three layers."
- "First, code gates. Does every id exist? Is the reward too generous for what an ad earns? Is anything cash-like?"
- "Second, a separate model call scores nine criteria, with evidence for each score."
- "Third, the verdict is computed in code from the scores and gates. Thresholds are explicit."
- "Weak proposals go back with required changes, at most twice. The reviser never sees the scores."
- "Only SHIP becomes a slide. REVISE is never promoted."
- "Last, a portfolio check in code: two SHIPs that are the same idea in different words would split one moment. The better-scored one ships; the other gets one revision to become different, or it's rejected."
- "How do I know the judge is good? This table."
- "I take good examples from the knowledge base, and break exactly one thing in each copy."
- "Then I check that each broken one is caught, and whether code or the model caught it. <Say the numbers from out/luzia/NUMBERS.md, "Judge self-check".>"

---

## 9:15–10:15 · The flows, and transfer

**Do:** Tab 1. Show the recommendation slide (slide 1), then one details slide (economics, KPI and holdout, SDK snippet). Then tab 3: point at the Janitor and AOL rows.

**Say:**
- "Each SHIP gets a flow slide and a details slide."
- "The details slide has the economics, the KPI with a holdout, and the SDK snippet for the engineer."
- "Janitor and AOL ran through the same commands, with no app-specific code. A test enforces that."
- "OOC shuts itself down about a second after launch on the Google Play emulator. Its security module logs a kill code."
- "I recorded that as blocked. I didn't try to bypass it."

---

## 10:15–11:45 · Architecture choices and trade-offs

**Do:** Open `README.md` on GitHub and scroll to **Decisions**.

**Say:**
- "A few choices, and why."
- "Android, because the iOS simulator can't install App Store apps."
- "Code drives the explorer, not the model. It's cheaper and repeatable, and guard rails live in code."
- "Stages share typed files, not messages. Any stage can be re-run, cached, or inspected on its own."
- "Economics and verdicts are code, so every number on a slide traces back to a price we saw."
- "The trade-off: less open-ended exploration. The explorer won't improvise a clever path the rules don't allow."
- "Everything ran on the free Gemini tier, for zero dollars. Every model call is cached, so a run can be replayed without a key."

---

## 11:45–12:45 · Limitations, honestly

**Say:**
- "What's weak."
- "OOC couldn't be explored on the emulator."
- "The free tier gives about twenty requests a day per model. Under pressure, calls fall back to a smaller model, and then to deterministic stubs. Every file says which one answered."
- "Some apps expose thin accessibility trees. Those screens fall back to images in the mock."
- "The judge and the proposer are the same model family. They can share blind spots."
- "The revenue numbers are ranges from public benchmarks. They're scenarios, not forecasts."

---

## 12:45–13:30 · What I'd build next

**Say:**
- "Next, I'd make the economy review a real product step, because it's the highest-leverage ten minutes."
- "Then a weekly smoke replay to catch app updates, and re-explore only what changed."
- "A different model family as the judge, calibrated on real launch outcomes."
- "And a login pool, so scans run across hundreds of apps without a person."
- "Thanks. The README maps every deliverable to a file, and `npm run demo` runs the whole thing with no device and no key."

**Do:** Stop recording.

---

## Likely interview questions (short answers)

| Question | Answer |
|---|---|
| Why not let the LLM drive mobile-mcp directly? | Cost, repeatability and safety. The frontier, state identity and guard rails are code; the model answers one question per new screen. A run can be replayed from cache. |
| How do you decide two screens are the same state? | A signature of "chrome" tokens (short labels, top/bottom bands, selected tabs) that excludes anything the explorer typed or caused, plus a perceptual hash. Borderline cases ask the model: "same template, different content = same state". |
| How do you know a price or a cost is real? | Verification in code. Every quote must appear on that observation, and every number must appear in a verified quote or a measured counter change. Anything else is marked "inferred" and shown in orange. |
| Where does the exchange rate come from? | With prices: unit price from the cheapest to the priciest pack, and US rewarded eCPM ranges with a non-game haircut: "1 view ≈ X–Y credits". The reward is sized to about one cheapest action, far below a pack. Without prices (Luzia's guest cap): one view, net of platform share, divided by what a message costs to serve: "1 view ≈ 3.5–5.8 messages at cost to serve". The reward goes to the break-even midpoint. |
| What stops the proposer from doing "watch an ad for coins" ten times? | A code validator on the idea set: a case mix, at least 4 archetypes, reactive and proactive ideas, at least half beyond the baseline, and no duplicate (moment, reward). Violations go back once, verbatim. |
| Can the judge be gamed by the proposer? | The verdict is code: gates plus thresholds on scores. The reviser never sees the scores. The single-fault evaluation checks that each fault type is caught. The remaining risk is the shared model family; the fix is a different judge model. |
| Luzia has no visible counter. How did you find the free-message cap? | The drain probe keeps sending the same message until a wall appears, counts the sends ("limit after N sends"), and a code pass turns that into a quota resource with a 1-unit cost and a wall. Sign-up walls reached by plain taps don't stop it. |
| What if an app has no currency at all? | The regime becomes "no-scarcity" and proposals must be product changes: daily tasks, sponsored sessions, cosmetics. The judge checks they don't take away anything free. |
| How is the mock "generated", not hand-built? | Only the model directory goes in: one HTML call per screen, plus a fixed runtime driven by the model's edges and economy. `--model-dir` runs it from a copied model. |
| What did you fix by hand? | Everything is in `HUMAN_LOG.md` and `trajectory.md`: sign-ins, the OOC block, and any `overrides.json` edits to the model. |
| What does it cost per app? | About $0 on the free tier; tokens are in `cost.jsonl`. On paid models: about $3–5 for a scan and $20–25 for a full pitch pack. People's review time dominates. |
| How would this run for hundreds of apps? | Content-addressed artifacts, a model version per app build plus UI fingerprint, weekly smoke replays that trigger incremental re-explores, and human review at the economy and deck steps. |
