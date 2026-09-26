# Recording script (12–14 minutes)

**For the presenter.** Say the **Say** lines in your own words; they are short on purpose. **Do** tells you what to open or click. Timestamps are targets, not rules. Every number below is in `out/luzia/NUMBERS.md` or on the page you are showing.

## Before you press record (10 minutes)

1. **Don't re-run any stage.** The runs are done and committed; re-running explore, propose or judge changes every number. (`npm run report` is safe but not needed.)
2. In a terminal: `cd ~/simula && git pull`, then `open out/index.html` (the report page). Make the terminal font large (⌘ +).
3. From the report page, open these in new tabs (⌘-click), in this order:

   | Tab | What | How to open it |
   |---|---|---|
   | 1 | The Luzia deck at the lead flow | Report page, Luzia section: ⌘-click **@@LEAD_ID@@: @@LEAD_TITLE@@** (opens `deck.html#flow-@@LEAD_ID@@`) |
   | 2 | The clickable prototype of that flow | In tab 1, right-click **Open the clickable prototype →** and choose **Open Link in New Tab** |
   | 3 | The report page | the tab you already have |
   | 4 | Product model viewer | Luzia section: **Product model** |
   | 5 | QA report | Luzia section: **QA report** |
   | 6 | Judgments | Luzia section: **Judgments** |
   | 7 | Judge self-check | Luzia section: **Judge eval** (`report/judge-eval.html`) |
   | 8 | Trajectory | Luzia section: **Trajectory** |
   | 9 | Candidates | Luzia section: **Candidates** |
   | 10 | README on GitHub | @@README_URL@@ |

4. Keep `out/luzia/NUMBERS.md` open on a second screen (or printed). It holds most numbers you'll say.
5. Optional clip for the explore section: record `npm run demo -- --out-root /tmp/simula-demo` (the fixture app, end to end, about 3 minutes; it doesn't touch `out/`). **Never run explore on Luzia now.**
6. Close Slack and mail. Turn on Do Not Disturb.

---

## 0:00–1:05 · Open with the result

**Do:** Tab 1, the flow slide. Move the mouse slowly left to right across the five phones.

**Say:**
- "This is the output: one slide per recommended rewarded flow, for Luzia."
- "Left to right: the app today, what we change, the offer, the ad (a 15-second sponsored mini-game), and what the user gets."
- "Every frame is a capture of our clickable mock of the app with the change applied, not a drawing."
- "The numbers on the right are computed in code, never by the model: what one ad view earns, and what the reward costs to serve."

**Do:** Point at **Open the clickable prototype →** but don't click it. Switch to tab 2. Click the new element (step 2 on the slide points at it), then **@@PLAY_LABEL@@** on the offer card. Tap a target or two while the countdown runs; don't try to close it.

**Say:**
- "And this is the same proposal as a clickable prototype. The game runs fifteen seconds, and the reward lands only after the view is verified."

---

## 1:05–2:00 · The idea in one minute

**Do:** Tab 3, the report page. Scroll slowly past the scorecard.

**Say:**
- "The brief: go from a mobile app to a product model, a mock, and rewarded-ad proposals, with as little app-specific work as possible."
- "My thesis: understand the app as an economy. What do users spend? What does each action cost? Where do free users hit a wall? What does the app sell?"
- "All of that goes into one product model, with evidence for every claim. Everything else is compiled from that model: the mock, the QA, the proposals, the judge, and these slides."
- "The only per-app input is a small JSON file with the package name."
- "Luzia is the deep app. Janitor and AOL show the same system transferring. OOC was blocked on the emulator; I'll explain why."

---

## 2:00–3:40 · Explore

**Do:** Play your clip (or skip it). Then tab 8, trajectory, scroll to **Failures and recoveries**.

**Say:**
- "The explorer drives a real Android emulator through mobile-mcp: screenshots, the accessibility tree, tap, swipe and type."
- "Code drives. The model only advises. For each new screen, a small model names it, ranks what to try, and flags money signals like prices and limits."
- "Code keeps the frontier, decides when two screens are the same state, and stops when nothing new appears or the step budget runs out. Luzia used its full budget: 175 steps, 38 screens, 171 transitions, in 26 minutes."
- "Guard rails: it never logs out, never buys, never signs in, and never taps an ad. Sign-in walls are noted for a person and skipped."
- "One special move: the drain probe. On a chat, it keeps sending messages until the app blocks it. That's how we measure what a message costs and where the wall is."
- "On Luzia, honestly: in earlier runs it sent guest messages and got replies with no cap showing, and in the final run it couldn't get back to a chat at all. So Luzia's model is subscription- and sign-up-gated: six walls, all quoted from the screens."
- "Every failure and recovery is in this trajectory: @@TRAJ_FAILS@@ failures, @@TRAJ_RECOV@@ recoveries."

---

## 3:40–4:50 · Understand: the product model

**Do:** Tab 4, the viewer. Show the **Economy** section, especially **Walls** (each row has a ✓ quote), then scroll to **Coverage → Not explored (and why)**.

**Say:**
- "This is the product model, as a page a person can check."
- "Resources, how users earn them, what's sold, the walls, and what each plan unlocks. Luzia has no priced actions and no ads today."
- "One model call drafts it. Then code verifies it: every quote must really appear on that screen, and every number must appear in a quote or a measured counter change. Anything that doesn't verify is marked 'inferred' and highlighted yellow. On Luzia, every claim verified."
- "Code also computes the economics. Normally that's the exchange rate: what one ad view is worth in the app's own currency."
- "Here it says unavailable, because Luzia never shows a guest a price. So code measures each reward against what it costs to serve instead. One US view nets about six tenths of a cent; the judge won't ship a reward that costs more than that to serve."
- "And it lists what we did NOT explore, and why."

---

## 4:50–6:10 · Mock and QA

**Do:** Tab 2: delete everything from the `?` onward in the address bar and press Enter (it opens on Chats Home). Tap **Ideas**, **Apps**, then **Services → Start new task**: the real sign-up wall appears. Then tab 5, the QA report: scroll to **s21 · Favorite messages**.

**Say:**
- "The mock is generated from the model. One model call writes the HTML for each of the ten most important screens, from its screenshot and element list. The other 28 are the real screenshots with tap areas."
- "The behaviour is fixed code: navigation, counters, the chat, the walls, and the rewarded overlay. It clicks through like the app, and it opens from a file. No server."
- "QA renders every rebuilt screen and compares it to the real screenshot: box positions, text, colours and structure. The heatmap shows where they differ."
- "The worst differences go back to the model as a fix request. We keep the best round, and stop when it's good enough or stops improving. This one went from 0.50 to 0.82 over two rounds."
- "Mean fidelity over the ten rebuilt screens is 0.72. Flow QA replays every edge of the model on the mock: 134 of 135 replay correctly."

---

## 6:10–7:40 · Propose

**Do:** Tab 9, candidates: **The obvious baseline**, **All ideas**, then the full write-up of **@@LEAD_ID@@**.

**Say:**
- "The proposer gets the model digest, key screenshots, and a rewarded-ads knowledge base compiled from public sources; each rule is tagged with its source, or marked as inferred."
- "First it writes the obvious ideas a generic ad-ops person would propose. Those are the bar to beat."
- "Then it sweeps every moment in the model: walls, declines, just-got-a-reward, places users return to. It must mix two cases."
- "Existing mechanic: the app already has something valuable to anchor the exchange."
- "Product change: we add a mechanic, like a daily quest, that creates a real value exchange."
- "Each proposal is a typed patch to the model, so the mock can render it and the judge can check it. The model never does the arithmetic; it states assumptions and code computes the economics."
- "Your own Luzia ideas went after the out-of-free-messages moment. This run never reached Luzia's message cap, so it worked with what it did see. When the cap is measured, the same pipeline proposes the refill; the fixture app and a regression test show that path end to end."

---

## 7:40–9:20 · Judge

**Do:** Tab 6, judgments. Show **@@REJECT_ID@@** (REJECT), then **@@LEAD_ID@@** round by round. Then tab 7, the confusion table.

**Say:**
- "The judge runs in three layers. First, code gates: does every id exist, is the reward worth more than an ad earns, is anything cash-like, does an ad stand in for an account or a subscription."
- "Second, a separate model call scores nine criteria, with evidence for each score."
- "Third, the verdict is computed in code: SHIP needs a weighted 3.8 of 5, every criterion at least 3, and every gate passing."
- "@@REJECT_SAY@@"
- "Weak proposals go back with required changes, at most twice. The reviser never sees the scores, and it can't make a reward look cheaper by relabelling its cost. @@LEAD_SAY@@"
- "Only SHIP becomes a slide. REVISE is never promoted. And a portfolio check in code stops two SHIPs that are the same idea in different words."
- "In my last review pass I found two holes in my own judge: a revision could relabel its serving cost as cheaper, and an offer could sit beside a sign-up button as a substitute for the account. I closed both in code and re-ran. The lead flow I had before got rejected, and I kept that result."
- "How do I know the judge is good? This table. I take known-good examples from the knowledge base and break exactly one thing in each copy. @@EVAL_SAY@@"

---

## 9:20–10:20 · The flows, and transfer

**Do:** Tab 1. Show the recommendation slide (slide 1), then the lead flow's details slide (economics, KPI and holdout, SDK snippet). Then tab 3: point at the Janitor and AOL rows.

**Say:**
- "Each SHIP gets a flow slide and a details slide: the economics, the KPI with a holdout, and the SDK snippet for the engineer."
- "Janitor and AOL ran through the same commands, with no app-specific code; a test enforces that. @@TRANSFER_SAY@@"
- "OOC closes itself about 0.8 seconds after launch on the Google Play emulator; its security module logs a kill code. I recorded it as blocked and didn't try to bypass it."

---

## 10:20–11:40 · Architecture choices and trade-offs

**Do:** Tab 10, the README. Scroll to **Decisions**.

**Say:**
- "A few choices, and why."
- "Android, because the iOS simulator can't install App Store apps."
- "Code drives the explorer, not the model. It's cheaper and repeatable, and guard rails live in code."
- "Stages share typed files, not messages. Any stage can be re-run, cached, or inspected on its own."
- "Economics and verdicts are code, so every number on a slide traces to an observed price or a cited benchmark constant in one file. Luzia shows no prices, so its numbers come from the benchmarks."
- "The trade-off: less open-ended exploration. The explorer won't improvise a clever path the rules don't allow."
- "Everything ran on the free Gemini tier, for zero dollars. Every model call is cached, so a run can be replayed without a key."

---

## 11:40–12:40 · Limitations, honestly

**Say:**
- "What's weak."
- "I didn't measure Luzia's free-message cap, so the most obvious Luzia flow, a refill when messages run out, isn't in this run."
- "The free tier gives about twenty requests a day per Flash model, so most calls were answered by Flash-Lite, the smallest model. cost.jsonl records which model answered each call, and stub outputs are labelled."
- "Only the ten most important Luzia screens are rebuilt in HTML; the rest are screenshots."
- "The judge and the proposer are the same model family, so they can share blind spots."
- "The economics are priced at US rates. Most Luzia users are in Latin America, where a view earns about a sixth as much; a production version would price and cap rewards per region."

---

## 12:40–13:30 · What I'd build next

**Say:**
- "Next, I'd make the economy review a real product step, because it's the highest-leverage ten minutes."
- "Then a weekly smoke replay to catch app updates, and re-explore only what changed."
- "A different model family as the judge, calibrated on real launch outcomes, and regional pricing in the economics."
- "And a login pool, so scans run across hundreds of apps without a person."
- "Thanks. The README maps every deliverable to a file, and `npm run demo` runs the whole thing with no device and no key."

**Do:** Stop recording.

---

## Likely interview questions (short answers)

| Question | Answer |
|---|---|
| Why not let the LLM drive mobile-mcp directly? | Cost, repeatability and safety. The frontier, state identity and guard rails are code; the model answers one question per new screen. A run can be replayed from cache. |
| How do you decide two screens are the same state? | A signature of "chrome" tokens (short labels, top/bottom bands, selected tabs) that excludes anything the explorer typed or caused, plus a perceptual hash. Borderline cases ask the model: "same template, different content = same state". |
| How do you know a price or a cost is real? | Verification in code. Every quote must appear on that observation, and every number must appear in a verified quote or a measured counter change. Anything else is marked "inferred" and highlighted yellow. |
| Where does the exchange rate come from? | With prices: unit price from the app's packs, against US rewarded eCPM ranges with a non-game haircut: "1 view ≈ N credits". Without prices but with a measured cap: one view, net of platform share, divided by what a unit costs to serve. Luzia has neither, so its rewards are checked against the dollar value of a view. |
| Why is a reward only 2 of something? | With no prices shown, the only honest yardstick is cost to serve. One US view nets about $0.0063 at the low end; a short text reply costs about $0.0018 to serve (a cited constant in economics.ts). The reward is sized so serving it costs at most about 60% of what a view nets: 2. The economics gate flags any reward that costs more to serve than a view nets. |
| What stops the proposer from doing "watch an ad for coins" ten times? | A code validator on the idea set: a case mix, at least 4 archetypes, reactive and proactive ideas, at least half beyond the baseline, and no duplicate (moment, reward). Violations go back once, verbatim. |
| Can the judge be gamed by the proposer? | The verdict is code: gates plus thresholds on scores. The reviser never sees the scores, and a revision can't relabel its serving cost as cheaper. The single-fault evaluation checks that each fault type is caught. The remaining risk is the shared model family; the fix is a different judge model. |
| Why did your previous lead flow get rejected? | It put the offer on Luzia's sign-up sheet, next to "Continue with Google": an ad standing in for the account. And its revision had relabelled its cost as cheaper. Both are now caught in code (tests in `test/proposejudge.entitlement.test.ts`). |
| Luzia has no visible counter. Did you find the free-message cap? | Not in this run. The drain probe repeats a send until a wall appears and records "limit after N sends"; a code pass then turns that into a quota resource, a cost and a wall. On the emulator it sent guest messages and got replies, but getting back to the chat between sends was flaky. I fixed each typing and navigation issue it hit (they're in the commit history), and a regression test covers the capped case end to end. |
| What if an app has no currency at all? | The regime becomes "no-scarcity" and proposals must be product changes: daily tasks, streaks, sponsored sessions. The judge checks they don't take away anything free. That's AOL. |
| How is the mock "generated", not hand-built? | Only the model directory goes in: one HTML call per rebuilt screen (10 of 38 on Luzia), plus a fixed runtime driven by the model's edges and economy. `--model-dir` runs it from a copied model. |
| What did you fix by hand? | Everything is in `HUMAN_LOG.md` and `trajectory.md`. Luzia: re-running two stages after the Mac slept mid-run. Janitor: a person signed in before the run. AOL: removing a screenshot that showed the device owner's name. OOC: the block. No hand edits to any model or proposal. |
| What does it cost per app? | About $0 on the free tier; tokens are in `cost.jsonl`. On paid models: about $3–5 for a scan and $20–25 for a full pitch pack. People's review time dominates. |
| How would this run for hundreds of apps? | Content-addressed artifacts, a model version per app build plus UI fingerprint, weekly smoke replays that trigger incremental re-explores, and human review at the economy and deck steps. |
