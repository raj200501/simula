# Judgments: Luzia

Verdicts are computed in code: SHIP at weighted ≥ 3.8 with every criterion ≥ 3 and every gate passing; REVISE between 3 and 3.8, on any criterion ≤ 2, or on a fixable gate; REJECT below 3, on a policy gate, or still REVISE after round 2 (or when a revision stalls: < +0.2 and no gate fixed). Only SHIP goes to the slides.

Weights: value-moment-fit 20, product-integrity 15, cannibalization-safety 15, unit-economics 10, reach 10, feasibility 10, specificity 10, frequency-fatigue 5, measurability 5.

## Summary

| proposal | title | final | weighted | versions | summary |
|---|---|---|---|---|---|
| P1 | Paywall Decline Guest Services Pass | **REJECT** | 3.65 | v1 → v2 → v3 | REJECT after 2 revisions: fixable gate failed: reward-coherence (code); value-moment-fit scored 2 (< 3); feasibility scored 2 (< 3); weighted 3.65 < 3.8; still REVISE after round 2. Top concern: reward-coherence (code): the patch adds 1 "plan" of Luzia+ Subscription on REWARD_VERIFIED |
| P2 | Custom Bestie Slot Unlock on Signup Decline | **REJECT** | 2.85 | v1 | REJECT: weighted 2.85 < 3. Top concern: reward-coherence (code): the reward grants 1 "account" of Account Access, an entitlement: grant a time box or a number of uses of a named feature instead; the patch adds 1 "account" of Account Access on REWARD_VERIFIED |
| P3 | Single Deep Reasoning Query Unlock | **REJECT** | 4 | v1 → v2 | REJECT after 1 revision: revision stalled (weighted -0.05, below +0.2) with the same gate failures. Top concern: grounding (code): economy item "Deep reasoning query (new)" does not exist; reward resource "Deep reasoning query" does not exist; edge effect on unknown resource "Deep reasoning query"; storyboard offer: counter on unknown resource "Deep reasoning query"; storyboard ad: counter on unknown resource "Deep reasoning query"; storyboard value: counter on unknown resource "Deep reasoning query"; evidence "m14" is not an observation or screen in the model |
| P4 | Daily Check-In Image Generation Hub | **REJECT** | 4.4 | v1 → v2 → v3 | REJECT after 2 revisions: fixable gate failed: economics (code); unit-economics scored 2 (< 3); still REVISE after round 2. Top concern: economics (code): Cost to serve the reward ($0.0250) exceeds net revenue per view ($0.0063) at the low end. |
| P5 | Anima Queue Fast-Track Priority | **SHIP** | 4.7 | v1 → v2 → v3 | SHIP at 4.7 (v3 after 2 revisions). |

## P1: Paywall Decline Guest Services Pass — REJECT

> Offer a 15-minute trial of Luzia+ services via a rewarded mini-game after a user declines the account setup paywall.

- existing · TAX-10 · surface Services Tab (s06) · reward 15 minutes of Luzia+ services · caps 1/day

#### Round 0 (v1): **REVISE** · weighted 3.05 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | cites observed economy items: r1, of1, w1, w6 |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | **FAIL** | the patch adds 1 "plan" of Luzia+ Subscription on REWARD_VERIFIED |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Surface is s06 (Services Tab) focusing on assistant tools: 'Bookings, shopping, alerts and reminders, all done'. The offer is SFW with no adult, medical, or political adjacency. |
| no-incentivized-action | llm | policy | pass | The reward is '30 minutes of Luzia+ access' granted for playing a mini-game. No cash, gift cards, or rewards for clicks/installs are involved. |
| no-loss-framing | llm | policy | pass | Offer text is gain-framed: 'Play a 15-second mini-game to unlock 30 minutes of Luzia+ services. Experience bookings, reminders, and deeper reasoning before deciding to subscribe.' Decline option is 'No thanks' with no confirmshaming. |
| explicit-opt-in | llm | fixable | pass | User explicitly taps the CTA button: 'cta: Play Mini-Game' on the invitation card. |
| disclosed | llm | fixable | pass | Offer clearly discloses the required action and reward up front: 'Play a 15-second mini-game to unlock 30 minutes of Luzia+ services.' |
| free-decline | llm | fixable | pass | Declining via 'No thanks' is free and keeps the user on s06 (Services Tab) without penalties or degraded state. |
| no-stream-interrupt | llm | fixable | pass | Trigger occurs at a navigation boundary: 'User taps Maybe later on Create Account Sheet and returns to Services Tab without subscribing.' It never interrupts active chat streaming. |
| not-for-subscribers | llm | fixable | pass | Eligibility restricts to 'Non-paying guest users who have dismissed the Create Account Sheet paywall and have no active Luzia+ entitlement' with guard 'resource r1 lt 1'. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 2 | The user was blocked on s06 attempting to 'Start new task' requiring Luzia+, but the patch treats entitlement r1 (Luzia+ Subscription, unit=plan) as a currency via 'effects: [{"resource": "r1", "delta": 1}]', which triggers the rule capping value-moment-fit at 2. |
| product-integrity | 15 | 3 | Surfacing a trial invitation card on s06 after declining the account sheet preserves flow without interrupting chat. However, the app requires an account first for Luzia+ ('To enjoy Luzia+ you need to create an account first'), which clashes with guest trial delivery. |
| cannibalization-safety | 15 | 4 | Strictly limited to a single 30-minute session per day ('perDay: 1, cooldownMin: 1440') and gated on paywall decline. Includes a 10% randomized holdout and a subscription revenue non-inferiority guardrail (-3%). |
| unit-economics | 10 | 3 | Computed cost to serve per view is $0.0054 against US view value of $0.0090-$0.0150. However, assuming 'text-cheap x 3' for Luzia+ (which unlocks deep reasoning and complex services like bookings/shopping) underestimates inference and tool-use COGS. |
| reach | 10 | 3 | Trigger happens on s06 (Services Tab, 7 visits in exploration) upon declining the Create Account Sheet (m2 reach=frequent). It reaches users interested in assistant tasks, though this is secondary to core chat (s01). |
| feasibility | 10 | 2 | Failed code gate 'reward-coherence' because patch increments plan r1 by 1. Additionally, Luzia backend gates Luzia+ behind Account Access (r2), requiring non-trivial engineering to support temporary guest entitlements. |
| specificity | 10 | 3 | References concrete screens and buttons (s06, e6 'Let Luzia handle it!', e9 'Start new task', s07 'Maybe later'). However, treating entitlement r1 as a currency forfeits specificity credit for that noun under the rules. |
| frequency-fatigue | 5 | 5 | Well bounded with a daily cap of 1 and a 1440-minute cooldown ('perDay: 1, cooldownMin: 1440'), preventing nagging across repeated visits. |
| measurability | 5 | 5 | Defines primary KPI ('Luzia+ subscription conversion rate among paywall decliners over 28 days'), guardrails with explicit non-inferiority margins (-1% retention, -3% paid revenue), and a 10% user-level randomized holdout. |

- **Verdict reasons (code):** fixable gate failed: reward-coherence (code); value-moment-fit scored 2 (< 3); feasibility scored 2 (< 3); weighted 3.05 < 3.8
- **Required changes:**
  - Fix reward coherence by granting a time-boxed temporary entitlement state or specific task credits (e.g. 1 task execution) rather than incrementing plan resource r1 by 1.
  - Resolve the guest account conflict: either prompt a guest session token for the 30-minute trial or attach the reward to an unauthenticated feature (such as 3 deep reasoning chat answers).
  - Update COGS modeling to reflect deep reasoning and tool/service execution costs rather than cheap text queries.
- **Top concern:** The patch increments the Luzia+ Subscription entitlement as an integer currency (delta: 1 to r1), failing reward coherence and bypassing the app's fundamental requirement that users must create an account to access Luzia+ services.

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `title`: "Paywall Decline 30-Min Luzia+ Pass" → "Paywall Decline Guest Task Pass"
- `oneLiner`: "Offer a 30-minute Luzia+ trial pass via a rewarded mini-game after declining the accou..." → "Offer a single guest task execution via a rewarded mini-game after a user declines the..."
- `eligibility`: "Non-paying guest users who have dismissed the Create Account Sheet paywall and have no..." → "Non-paying guest users without an account who have dismissed the Create Account Sheet ..."
- `offer.title`: "Try Luzia+ for 30 Minutes" → "Try One Task for Free"
- `offer.body`: "Play a 15-second mini-game to unlock 30 minutes of Luzia+ services. Experience booking..." → "Play a 15-second game to run one assistant task without creating an account."
- `reward.what`: "30 minutes of Luzia+ access" → "1 free assistant task execution"
- `reward.resource`: "r1" → "Guest Task Execution"
- `reward.duration`: "30 minutes" → (none)
- `cannibalizationGuard`: "Only surfaces after an explicit paywall decline to self-select users unwilling to purc..." → "Only surfaces after an explicit paywall decline as a guest-friendly fallback. Strictly..."
- `assumptions.cogs`: "text-cheap" → "text-premium"
- `assumptions.cogsUnitsPerView`: 3 → 1
- `kpis.holdout`: "Randomized user-level 10% holdout group ineligible for rewarded fallback passes for 28..." → "Randomized user-level 10% holdout group ineligible for rewarded guest fallback passes ..."
- `precedents[1]`: "TAX-2" → "TAX-4"
- `precedents[2]`: "EX-MUSIC" → "EX-UTIL"
- `precedents[3]`: "EX-DUO" → "EX-MUSIC"
- `precedents[4]`: "AI-15" → "CORE-5"
- `precedents[5]`: "CORE-5" → (none)
- `risks[0]`: "Users may defer subscribing if a single 30-minute pass satisfies their immediate one-o..." → "Users with infrequent task needs may defer signing up indefinitely if their daily task..."
- `risks[1]`: "Inference costs for complex assistant queries during the pass may exceed ad revenue if..." → "Premium tool execution and model costs might outpace ad revenue in lower-eCPM regions."
- `risks[2]`: "User fatigue if the fallback invitation triggers on every single paywall dismissal." → (none)
- `evidence[2].el`: "e6" → "e9"
- `evidence[2].quote`: "Let Luzia handle it!" → "Start new task"
- `evidence[3].obs`: "s06" → (none)
- `evidence[3].el`: "e9" → (none)
- `evidence[3].quote`: "Start new task" → (none)
- `evidence[4].obs`: "s19" → (none)
- `evidence[4].el`: "e10" → (none)
- `evidence[4].quote`: "Upgrade to Luzia+" → (none)
- `patch.newElements[0].change`: "Add MiniGameInvitation card prompting user for 30-minute Luzia+ trial pass" → "Add MiniGameInvitation card prompting user for 1 free guest task execution"
- `patch.newElements[1].change`: "Add Luzia+ active trial countdown badge displaying remaining minutes" → "Add guest task execution credit balance indicator displaying remaining free executions"
- ... and 14 more changes

#### Round 1 (v2): **REVISE** · weighted 3.6 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | economy item "Guest Task Execution (new)" does not exist; reward resource "Guest Task Execution" does not exist; edge effect on unknown resource "Guest Task Execution"; edge guard on unknown resource "Guest Task Execution"; storyboard today: counter on unknown resource "Guest Task Execution"; storyboard change: counter on unknown resource "Guest Task Execution"; storyboard offer: counter on unknown resource "Guest Task Execution"; storyboard ad: counter on unknown resource "Guest Task Execution" |
| label | code | fixable | pass | cites observed economy items: r1, of1, w1, w6 |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Offered on s06 (Services Tab): 'Bookings, shopping, alerts and reminders, all done' with Luzia as Game Partner, which is SFW and free of sensitive topics. |
| no-incentivized-action | llm | policy | pass | Reward is in-app task access: 'what': '1 free assistant task execution', 'resource': 'Guest Task Execution', with no cash, gift cards, or incentives for clicks/installs. |
| no-loss-framing | llm | policy | pass | Positive trial framing: 'title': 'Try One Task for Free', 'body': 'Play a 15-second game to run one assistant task without creating an account.' with no fake timers or confirmshaming. |
| explicit-opt-in | llm | fixable | pass | Explicit opt-in button provided: 'cta': 'Play Mini-Game'. |
| disclosed | llm | fixable | pass | Full disclosure of action and reward before start: 'Play a 15-second game to run one assistant task without creating an account.' |
| free-decline | llm | fixable | pass | Clearly labelled decline option: 'decline': 'No thanks', returning the user to s06 without penalties. |
| no-stream-interrupt | llm | fixable | pass | Surfaced only at a navigation boundary: 'trigger': 'User taps Maybe later on Create Account Sheet and returns to Services Tab without subscribing.' |
| not-for-subscribers | llm | fixable | pass | Gated to non-paying users: 'eligibility': 'Non-paying guest users without an account who have dismissed the Create Account Sheet paywall.' |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | The user taps 'Start new task' (e9) on s06, hits the Create Account paywall (w6), dismisses it via m2, and is offered exactly '1 free assistant task execution' to sample the blocked feature. |
| product-integrity | 15 | 4 | The proposal introduces an invitation card ne1 on s06 below e9 ('Start new task') after paywall decline. It preserves user flow, keeps core chat untouched, and uses Luzia as the Game Partner. |
| cannibalization-safety | 15 | 4 | The offer is strictly gated to decliners of the account paywall, limited to 1 execution per day with a 1440 min cooldown, and protected with a 10% randomized holdout. |
| unit-economics | 10 | 2 | Code-computed economics show cost to serve is $0.0090 (text-premium x 1) against gross US revenue of $0.0090–$0.0150, triggering the flag: 'Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end.' |
| reach | 10 | 3 | Triggered on m2 after s06 Services Tab interaction. Services Tab had 7 visits during exploration (reach=frequent), but is secondary to the primary chat loop on s01. |
| feasibility | 10 | 3 | Maps cleanly to SIM-RWD with invitation entry, 15s play, and REWARD_VERIFIED. However, executing assistant services in guest mode requires custom backend session handling since tasks normally require an account. |
| specificity | 10 | 3 | Cites actual digest elements and screens including s06, s07, e9 ('Start new task'), and wall w6, but introduces an invented resource name 'Guest Task Execution (new)'. |
| frequency-fatigue | 5 | 5 | Sets strict caps: 'perDay': 1 and 'cooldownMin': 1440, ensuring no nagging or unbounded ad prompts. |
| measurability | 5 | 5 | Primary metric 'Luzia+ subscription conversion rate among paywall decliners over 28 days', guardrails on D7/D30 retention (-1%) and paid revenue (-3%), backed by a 10% randomized holdout. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); fixable gate failed: economics (code); unit-economics scored 2 (< 3); weighted 3.6 < 3.8
- **Required changes:**
  - Reduce task execution COGS by routing guest trial tasks to a lower-cost model or requiring multiple rewarded views in low-eCPM regions to prevent negative margins against net revenue ($0.0063).
  - Fix grounding by defining the reward as a single-use entitlement sample of existing Luzia+ services (w6) rather than introducing an invented resource 'Guest Task Execution (new)'.
  - Clarify backend guest persistence for assistant tasks (bookings, shopping, reminders) that typically require an authenticated account.
- **Top concern:** Cost to serve the premium task execution ($0.0090) exceeds net revenue per view ($0.0063) at the low end, risking negative margin on guest task trials without lower-cost model routing.

#### Changes v2 → v3 (revise() saw the required changes, never the scores)

- `title`: "Paywall Decline Guest Task Pass" → "Paywall Decline Guest Services Pass"
- `oneLiner`: "Offer a single guest task execution via a rewarded mini-game after a user declines the..." → "Offer a 15-minute trial of Luzia+ services via a rewarded mini-game after a user decli..."
- `anchor.economy[4]`: "Guest Task Execution (new)" → (none)
- `offer.title`: "Try One Task for Free" → "Try Luzia+ Services Free"
- `offer.body`: "Play a 15-second game to run one assistant task without creating an account." → "Play a 15-second game to unlock Luzia+ services for the next 15 minutes."
- `reward.what`: "1 free assistant task execution" → "15 minutes of Luzia+ services"
- `reward.resource`: "Guest Task Execution" → "r1"
- `reward.amount`: 1 → (none)
- `reward.duration`: (none) → "15 minutes"
- `cannibalizationGuard`: "Only surfaces after an explicit paywall decline as a guest-friendly fallback. Strictly..." → "Only surfaces after an explicit paywall decline as a guest-friendly fallback. To preve..."
- `assumptions.cogs`: "text-premium" → "text-cheap"
- `precedents[1]`: "TAX-4" → "TAX-2"
- `precedents[2]`: "EX-UTIL" → "EX-MUSIC"
- `precedents[3]`: "EX-MUSIC" → "TRIG-2"
- `precedents[4]`: "CORE-5" → "TRIG-4"
- `risks[0]`: "Users with infrequent task needs may defer signing up indefinitely if their daily task..." → "Users with very low task needs may defer signing up indefinitely if their brief daily ..."
- `risks[1]`: "Premium tool execution and model costs might outpace ad revenue in lower-eCPM regions." → "Premium task execution costs could still be high in low-eCPM areas if the distilled mo..."
- `evidence[0].quote`: "Sign up so Luzia can start doing things for you." → "To enjoy Luzia+ you need to create an account first."
- `patch.newElements[0].change`: "Add MiniGameInvitation card prompting user for 1 free guest task execution" → "Add MiniGameInvitation card offering 15 minutes of Luzia+ Services"
- `patch.newElements[1].change`: "Add guest task execution credit balance indicator displaying remaining free executions" → "Add temporary Luzia+ countdown timer displaying remaining trial minutes"
- `patch.newEdges[0].effects[0].resource`: "Guest Task Execution" → "r1"
- `patch.newEdges[0].guard.resource`: "Guest Task Execution" → "r1"
- `storyboard[0].counters[0].resource`: "Guest Task Execution" → "r1"
- `storyboard[1].counters[0].resource`: "Guest Task Execution" → "r1"
- `storyboard[2].counters[0].resource`: "Guest Task Execution" → "r1"
- `storyboard[2].caption`: "Luzia offers one free guest task execution via mini-game." → "Luzia offers a 15-minute trial of Luzia+ services via mini-game."
- `storyboard[3].counters[0].resource`: "Guest Task Execution" → "r1"
- `storyboard[4].counters[0].resource`: "Guest Task Execution" → "r1"
- `storyboard[4].callouts[0].text`: "Indicator displays 1 free task credit available." → "Indicator displays a 15-minute countdown for Luzia+ services."
- `storyboard[4].callouts[1].text`: "Start new task is now enabled for a single guest execution." → "Start new task is now unlocked for a 15-minute guest window."
- ... and 2 more changes

#### Round 2 (v3): **REJECT** · weighted 3.65 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | cites observed economy items: r1, of1, w1, w6 |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | **FAIL** | the patch adds 1 "plan" of Luzia+ Subscription on REWARD_VERIFIED |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The proposal targets s06 (Services Tab) which includes "Bookings, shopping, alerts and reminders, all done" and is an entirely SFW utility context. |
| no-incentivized-action | llm | policy | pass | The reward is "15 minutes of Luzia+ services" which is in-app and non-cash-like, with no incentives offered for clicks, installs, or reviews. |
| no-loss-framing | llm | policy | pass | The copy seeds "Play a 15-second game to unlock Luzia+ services for the next 15 minutes." with a "No thanks" decline button. No dark patterns, confirmshaming, or loss-framing are used. |
| explicit-opt-in | llm | fixable | pass | The user must explicitly tap on "Play Mini-Game" to engage. |
| disclosed | llm | fixable | pass | The offer card states: "Play a 15-second game to unlock Luzia+ services for the next 15 minutes." |
| free-decline | llm | fixable | pass | The decline option "No thanks" returns the user to the Services tab state with no penalty. |
| no-stream-interrupt | llm | fixable | pass | The trigger occurs on s06 Services Tab after the user explicitly dismisses the Create Account Sheet paywall, meaning it is situated at a clean boundary rather than mid-chat. |
| not-for-subscribers | llm | fixable | pass | Eligibility is restricted to "Non-paying guest users without an account who have dismissed the Create Account Sheet paywall." |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 2 | The trial directly matches the blocked desire of wanting to perform a premium service task (Start a task) on s06. However, under Rule 7, because the proposal treats the plan entitlement (r1) as a currency with a delta of 1, the score is capped. |
| product-integrity | 15 | 4 | It leverages the Simula RWD invitation cleanly within the Services Tab. It avoids interrupting the AI Chat stream and preserves core user flow. Native handling of offline bookings during guest trials is accounted for by mapping secure device IDs. |
| cannibalization-safety | 15 | 5 | Extremely strict controls are in place: only offered after paywall decline, restricted to guests only, capped at a short 15-minute window, and limited to once per day. Includes a randomized 10% holdout. |
| unit-economics | 10 | 5 | Code-computed cost to serve is $0.0018 per view, which represents only 12-20% of the US completed view value ($0.0090–$0.0150). Margins remain safe by routing tasks to a distilled model. |
| reach | 10 | 4 | The trigger is a decline of the paywall on s06 (Services Tab). The Services Tab is visited frequently (7 visits during exploration), but reach is naturally throttled to only guest users hitting the wall. |
| feasibility | 10 | 2 | While it maps cleanly to the SIM-RWD format and incorporates standard entry points, the patch failed the code-level reward-coherence check because it attempts to directly increment the plan entitlement (r1) rather than modeling a temporary session state. |
| specificity | 10 | 3 | The proposal refers to Luzia's actual Services tab (s06), task button (e9), and the Create Account Sheet paywall. However, because Rule 7 prevents specificity credit for treating entitlements (Luzia+ Subscription) as currency, the score is reduced. |
| frequency-fatigue | 5 | 5 | Strictly limited to a daily cap of 1 per day and a 24-hour (1440 min) cooldown to prevent user nagging. |
| measurability | 5 | 5 | Includes a clear primary metric (Luzia+ subscription conversion rate among paywall decliners), strong revenue guardrail metrics, and a clean 10% randomized user-level holdout over 28 days. |

- **Verdict reasons (code):** fixable gate failed: reward-coherence (code); value-moment-fit scored 2 (< 3); feasibility scored 2 (< 3); weighted 3.65 < 3.8; still REVISE after round 2
- **Required changes:**
  - Refactor the reward implementation in the patch to avoid incrementing the 'Luzia+ Subscription' (r1) plan directly by delta 1 on REWARD_VERIFIED.
  - Introduce a temporary time-boxed state variable or guest session token (e.g., 'LuziaPlusGuestSessionActive') to govern the 15-minute access instead of treating a permanent entitlement as a currency.
  - Update the patch rules to check and clear this temporary session variable rather than altering the core subscription ledger.
- **Top concern:** The patch incorrectly attempts to award the Luzia+ Subscription (r1) entitlement as if it were a consumable currency (delta: 1), violating the core policy that plans and memberships must not be treated as currency. This triggered a failure in the reward-coherence check and must be replaced with a time-limited session variable.


## P2: Custom Bestie Slot Unlock on Signup Decline — REJECT

> Offer guest users a single Custom Bestie creation slot after they dismiss the signup sheet.

- existing · TAX-7 · surface Custom Bestie Signup Sheet (s02) · reward 1 Custom Bestie slot · caps 1/day

#### Round 0 (v1): **REJECT** · weighted 2.85 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | cites observed economy items: r2, w4, of2 |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | **FAIL** | the reward grants 1 "account" of Account Access, an entitlement: grant a time box or a number of uses of a named feature instead; the patch adds 1 "account" of Account Access on REWARD_VERIFIED |
| not-for-account-wall | code | fixable | **FAIL** | the reward is Account Access: an ad cannot stand in for creating an account; on the sign-up wall Custom Bestie Signup Sheet, the offer trades an ad for skipping sign-up ("without an account"); the reward is "Create Custom Bestie", which only an account unlocks: an ad cannot stand in for signing up |
| sfw | llm | policy | pass | surface: "s02" triggers "When a guest user taps 'Close sheet' on the Custom Bestie signup sheet without signing up." |
| no-incentivized-action | llm | policy | pass | reward: { "what": "1 Custom Bestie slot", "resource": "r2", "amount": 1 } |
| no-loss-framing | llm | policy | pass | offer: { "title": "Create One Custom Bestie", "decline": "No thanks" } |
| explicit-opt-in | llm | fixable | pass | cta: "Play Mini-Game" |
| disclosed | llm | fixable | pass | body: "Play a 15-second mini-game to unlock one Custom Bestie slot without an account." |
| free-decline | llm | fixable | pass | decline: "No thanks" |
| no-stream-interrupt | llm | fixable | pass | trigger: "When a guest user taps 'Close sheet' on the Custom Bestie signup sheet without signing up." |
| not-for-subscribers | llm | fixable | pass | eligibility: "Guest users without an account who decline the signup prompt on the Custom Bestie sheet." |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 2 | The proposal targets m8 (decline of Custom Bestie signup) and offers '1 Custom Bestie slot' which violates Rule 7 by treating the Account Access entitlement as a currency. |
| product-integrity | 15 | 2 | The ad attempts to bypass the account signup wall ('without an account') to grant a core account-only feature, violating Rule 8 and degrading the structural gating of the app. |
| cannibalization-safety | 15 | 3 | Sized to a single creation slot and gated on signup decline (m8) [TAX-10], but giving away account features without signups risks cannibalizing the organic incentive to register. |
| unit-economics | 10 | 5 | Cost to serve per view is $0.0000, which is perfectly safe and well below the gross revenue of $0.0090–$0.0150 per completed view. |
| reach | 10 | 3 | Targeting m8 (decline of Custom Bestie signup sheet) is frequent but limited strictly to the subset of guest users who reach the signup block and then decline it. |
| feasibility | 10 | 2 | Maps to SIM-RWD, but trying to grant 'Account Access' (r2) without registering an account presents a major logical contradiction for the user system database. |
| specificity | 10 | 2 | Uses Luzia's specific screen 's02' and nouns like 'Custom Bestie', but receives zero specificity credit for the entitlement noun 'Account Access' or 'slot' due to Rule 7 violations. |
| frequency-fatigue | 5 | 5 | Caps are set strictly at 1 view per day with a 1440-minute cooldown. |
| measurability | 5 | 5 | Includes a solid user-level 10% holdout of guest users for 28 days with clear primary metrics and guardrails like signup conversion rate. |

- **Verdict reasons (code):** weighted 2.85 < 3
- **Required changes:**
  - Do not let the rewarded ad stand in for creating an account (violates Rule 8). The signup wall on Custom Bestie Signup Sheet must remain mandatory for profile features.
  - Do not treat entitlements or account access as a currency (violates Rule 7). Grant a time-box or a count of uses instead of '+1 slot' of Account Access.
  - Pivot the target moment to a logged-in premium wall decline, such as m2 (Services task blocked) or m9 (Toggle deep reasoning mode), rewarding the user with a time-boxed unlock of Luzia+ features like '30 minutes of Deep reasoning mode' or '3 tasks handled by Luzia'.
- **Top concern:** The proposal allows a rewarded ad to bypass mandatory account creation, violating the core rule that an ad cannot stand in for creating an account, while logically contradicting the system's database structure by granting account-level entitlements to guest users.


## P3: Single Deep Reasoning Query Unlock — REJECT

> Unlock a single high-intelligence Deep Reasoning query by playing a quick partner mini-game.

- existing · TAX-2 · surface Attachment and Mode Sheet (s27) · reward 1 Deep reasoning query · caps 3/day

#### Round 0 (v1): **REVISE** · weighted 4.05 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | economy item "Deep reasoning query (new)" does not exist; reward resource "Deep reasoning query" does not exist; edge effect on unknown resource "Deep reasoning query"; storyboard offer: counter on unknown resource "Deep reasoning query"; storyboard ad: counter on unknown resource "Deep reasoning query"; storyboard value: counter on unknown resource "Deep reasoning query"; evidence "m14" is not an observation or screen in the model |
| label | code | fixable | pass | cites observed economy items: r1 |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Luzia is an AI assistant providing chat capabilities... s27 [sheet] Attachment and Mode Sheet... Deep reasoning (e15) |
| no-incentivized-action | llm | policy | pass | unlock 1 smarter, deeper answer... what: 1 Deep reasoning query... No real cash-like or download reward is offered. |
| no-loss-framing | llm | policy | pass | No thanks decline is offered. It does not use fake countdowns or support us copy, and does not threaten user history loss. |
| explicit-opt-in | llm | fixable | pass | cta: Play & Unlock, indicating the user must explicitly opt in to initiate the game. |
| disclosed | llm | fixable | pass | Play a 15-second game with Luzia to unlock 1 smarter, deeper answer. |
| free-decline | llm | fixable | pass | An interactive button displaying 'Play & Unlock' as the primary CTA next to 'No thanks'. |
| no-stream-interrupt | llm | fixable | pass | When the user taps the disabled 'Deep reasoning' option (e15) on s27 while not subscribed to Luzia+. |
| not-for-subscribers | llm | fixable | pass | Non-paying guest or free users who do not have the Luzia+ Subscription (r1). |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | The user taps the locked 'Deep reasoning' toggle on s27, and is offered exactly 1 'Deep reasoning query' in exchange. The fit between the blocked action and the reward is direct and instantaneous. |
| product-integrity | 15 | 4 | The proposal introduces a non-disruptive, native trial mechanism for non-subscribers. It preserves the user's chat input flow and does not degrade existing free features. |
| cannibalization-safety | 15 | 5 | The trial is heavily capped (3 per day, 60m cooldown) and offers only 1 query per view. This provides a temporary taste of premium without replacing the unlimited benefit offered by the r1 subscription. |
| unit-economics | 10 | 2 | The cost to serve ($0.0090) exceeds the low-end net ad revenue per view ($0.0063), making the unit economics unsustainable under the current single-view model. |
| reach | 10 | 3 | Tapping the toggle occurs on s27, which is an occasional-reach surface, although 'Deep reasoning' is a highly visible core premium differentiator. |
| feasibility | 10 | 2 | Fails the grounding check as 'Deep reasoning query' is not a pre-existing resource in the Luzia economy database. Tracking individual queries requires a product change and database update to log discrete tokens. |
| specificity | 10 | 5 | The proposal directly references Luzia-specific elements such as s27 (Attachment and Mode Sheet), e15 (Deep reasoning toggle), and Luzia+ Subscription (r1). |
| frequency-fatigue | 5 | 5 | Capped strictly at 3 daily views with a 60-minute cooldown, avoiding spamming or nagging on s27. |
| measurability | 5 | 5 | Provides an excellent testing framework including a 10% user-level holdout active for 28 days, tracking primary trial opt-ins alongside clear subscription conversion guardrails. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); fixable gate failed: economics (code); unit-economics scored 2 (< 3); feasibility scored 2 (< 3)
- **Required changes:**
  - Modify the reward structure or the ad-bundle requirements to improve unit economics. Require a 2-ad bundle (e.g. 'play two games') or utilize a more cost-effective model configuration to reduce the $0.0090 COGS to under $0.003 per view.
  - Implement backend/database tracking for the newly introduced 'Deep reasoning query' resource, as Luzia currently only tracks binary subscription status (r1) rather than individual query credits.
- **Top concern:** The high inference cost of a premium reasoning query ($0.0090 per query) exceeds the low-end net ad revenue ($0.0063 per completed view), creating a negative-margin unit economic structure.

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `offer.body`: "Play a 15-second game with Luzia to unlock 1 smarter, deeper answer." → "Play 2 quick 15-second games with Luzia to unlock 1 smarter, deeper answer."
- `cannibalizationGuard`: "The reward is strictly capped at 3 single-use queries per day, keeping the unlimited D..." → "The reward is strictly capped at 3 single-use queries per day, keeping the unlimited D..."
- `risks[0]`: "Slightly increased LLM inference costs for premium reasoning models" → "Slightly increased LLM inference costs for reasoning models"
- `risks[1]`: "Minor cannibalization if 1 query satisfies the user's immediate daily need" → "Database engineering lift required to track and decrement individual query credits for..."
- `patch.newScreens[0].change`: "An offer sheet overlay displayed when tapping Deep reasoning on s27, prompting the use..." → "An offer sheet overlay displayed when tapping Deep reasoning on s27, prompting the use..."
- `storyboard[2].caption`: "Luzia offers 1 free query for playing a 15-second game." → "Luzia offers 1 free query for playing 2 quick games."
- `storyboard[3].caption`: "The Simula SDK launches a 15-second interactive playable mini-game." → "The Simula SDK launches the playable mini-games."

#### Round 1 (v2): **REVISE** · weighted 4 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | economy item "Deep reasoning query (new)" does not exist; reward resource "Deep reasoning query" does not exist; edge effect on unknown resource "Deep reasoning query"; storyboard offer: counter on unknown resource "Deep reasoning query"; storyboard ad: counter on unknown resource "Deep reasoning query"; storyboard value: counter on unknown resource "Deep reasoning query"; evidence "m14" is not an observation or screen in the model |
| label | code | fixable | pass | cites observed economy items: r1 |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Proposal targets s27 ('Attachment and Mode Sheet') where digest observes: 'Allows users to attach photos or files and toggle deep reasoning mode.' Tapping 'Deep reasoning' (e15) on this standard utility surface is completely SFW and free of sensitive topics. |
| no-incentivized-action | llm | policy | pass | Proposal specifies 'reward': { 'what': '1 Deep reasoning query', 'resource': 'Deep reasoning query', 'amount': 1 } and 'cta': 'Play & Unlock'. No rewards are given for clicks, installs, ratings, or external cash-like items. |
| no-loss-framing | llm | policy | pass | Proposal uses clean gain framing: 'offer': { 'title': 'Try Deep Reasoning Free', 'body': 'Play 2 quick 15-second games with Luzia to unlock 1 smarter, deeper answer.', 'cta': 'Play & Unlock', 'decline': 'No thanks' } without fake countdowns, nagging, or confirmshaming. |
| explicit-opt-in | llm | fixable | pass | Proposal includes explicit CTA: 'cta': 'Play & Unlock' with patch element ne1: 'An interactive button displaying \'Play & Unlock\' as the primary CTA next to \'No thanks\'.' |
| disclosed | llm | fixable | pass | Proposal clearly discloses the required action and reward before launch: 'body': 'Play 2 quick 15-second games with Luzia to unlock 1 smarter, deeper answer.' |
| free-decline | llm | fixable | pass | Proposal provides a visible decline path: 'decline': 'No thanks' that dismisses overlay ns1 back to s27 with zero penalty. |
| no-stream-interrupt | llm | fixable | pass | Proposal trigger occurs before generation: 'When the user taps the disabled \'Deep reasoning\' option (e15) on s27 while not subscribed to Luzia+.' Never interrupts an in-progress stream. |
| not-for-subscribers | llm | fixable | pass | Proposal gates eligibility strictly: 'eligibility': 'Non-paying guest or free users who do not have the Luzia+ Subscription (r1).' |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | Digest lists s27 element e15 'Deep reasoning' with signal upsell:'Deep reasoning' under Luzia+ entitlement 'Deep reasoning mode for smarter answers'. Proposal offers '1 Deep reasoning query' precisely when the user tries to toggle deep reasoning on s27. |
| product-integrity | 15 | 5 | Proposal introduces an opt-in trial sheet ns1 over s27 without degrading base messaging or interrupting chat. Digest shows deep reasoning is already gated behind Luzia+, so granting a single query trial preserves product integrity. |
| cannibalization-safety | 15 | 4 | Proposal gates to non-subscribers ('eligibility': 'Non-paying guest or free users who do not have the Luzia+ Subscription (r1).'), limits unlocks to single queries ('caps': { 'perDay': 3, 'cooldownMin': 60 }), and maintains a 28-day user-level holdout. |
| unit-economics | 10 | 2 | Code-computed economics show: 'Cost to serve per view: $0.0090 (text-premium x 1)' and flag: 'Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end.' Although the copy mentions 2 games, assumptions set cogsUnitsPerView=1, leading to negative margin at the lower bound. |
| reach | 10 | 3 | Digest records moment m14 on s27 as having 'reach=occasional: Attachment and Mode Sheet shows an upsell: \'Deep reasoning\''. Tapping the attachment sheet to toggle deep reasoning is an occasional secondary action rather than a high-frequency daily core loop wall. |
| feasibility | 10 | 3 | Proposal maps cleanly to Simula SIM-RWD ('unit': 'SIM-RWD', 'entry': 'invitation', 'gamePartner': 'Luzia'). However, the code gate flagged grounding failures for 'Deep reasoning query (new)', and tracking per-query usage credits for guest sessions requires additional state management. |
| specificity | 10 | 4 | Proposal uses exact screen s27, element e15 ('Deep reasoning'), partner 'Luzia', and entitlement 'Deep reasoning mode for smarter answers' directly from the Luzia product model digest. |
| frequency-fatigue | 5 | 5 | Proposal sets explicit caps: 'caps': { 'perDay': 3, 'cooldownMin': 60 }, preventing spamming or repeated immediate prompts upon decline. |
| measurability | 5 | 4 | Proposal specifies primary metric 'Deep reasoning trial opt-in rate', guardrails 'Luzia+ Subscription conversion rate', 'D7 user retention', and 'holdout': 'User-level holdout, 10% of global non-paying DAU, active for 28 days'. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); fixable gate failed: economics (code); unit-economics scored 2 (< 3)
- **Required changes:**
  - Adjust assumptions to align with the 2-game bundle (setting cogsUnitsPerView to 0.5) so that the $0.0090 reasoning cost is amortized across 2 views ($0.0126–$0.0210 net revenue), resolving the unit economics flag.
  - Resolve grounding errors by defining the deep reasoning single-use credit within the app's supported state without ungrounded economy resource tags.
- **Top concern:** Cost to serve the premium reasoning model ($0.0090) exceeds net revenue per view ($0.0063) at the low end under the 1-view per-unit assumption.


## P4: Daily Check-In Image Generation Hub — REJECT

> Introduce a daily check-in banner on Chats Home that rewards returning users with 1 AI Image Credit via a 3-ad bundle.

- product-change · TAX-9 · surface Chats Home (s01) · reward 1 AI Image Credit · caps 1/day

#### Round 0 (v1): **REVISE** · weighted 3.8 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | evidence "m16" is not an observation or screen in the model |
| label | code | fixable | pass | declares new mechanic "Daily AI Check-In" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0500) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | **FAIL** | surface s01 is also the first-value screen: eligibility must exclude the first session |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | surface: 's01', trigger: 'User taps the Daily Check-In banner on Chats Home to open the check-in modal and initiates the claim.' |
| no-incentivized-action | llm | policy | pass | rewards users with 2 AI Image Credits for playing a quick mini-game, incentivizing daily retention and introducing soft currency monetization. |
| no-loss-framing | llm | policy | pass | Play a quick 15-second game to unlock 2 free AI Image Credits. |
| explicit-opt-in | llm | fixable | pass | User taps the Daily Check-In banner on Chats Home to open the check-in modal and initiates the claim. |
| disclosed | llm | fixable | pass | Play a quick 15-second game to unlock 2 free AI Image Credits. |
| free-decline | llm | fixable | pass | decline: 'Maybe Later' |
| no-stream-interrupt | llm | fixable | pass | surface: 's01', trigger: 'User taps the Daily Check-In banner on Chats Home to open the check-in modal and initiates the claim.' |
| not-for-subscribers | llm | fixable | pass | Eligibility: 'Non-paying, free guests and signed-up users who have not claimed today's check-in reward.' |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | The proposal introduces a proactive daily check-in loop ('TAX-9') on s01 to reward '2 AI Image Credits'. It is not a reactive, moment-of-need block, but serves as a solid engagement hook. |
| product-integrity | 15 | 3 | Adding a daily check-in banner does not interrupt chats or degrade output. However, placing the banner on s01 (the first-value screen) without a session-1 restriction risks presenting ads before onboarding is complete. |
| cannibalization-safety | 15 | 5 | Highly secure: strictly gated to non-paying users, capped at 1 check-in/day (only 2 credits), and keeps advanced generation features restricted to the Luzia+ paywall, supported by a 10% holdout group. |
| unit-economics | 10 | 1 | The cost to serve (2 images = $0.0500) significantly outstrips the net revenue per view ($0.0063) by nearly 8x, making the economics completely unsustainable without heavy structural modifications. |
| reach | 10 | 5 | Placing the banner on the main Chats Home (s01) tab ensures exposure to nearly 100% of the active daily audience. |
| feasibility | 10 | 3 | Uses standard SIM-RWD units and REWARD_VERIFIED logic, but requires a product-change to build a new daily loyalty check-in sheet (ns1) and track a new soft-currency resource. |
| specificity | 10 | 4 | Explicitly references s01 (Chats Home), welcome text e11, and uses 'Luzia' as the game partner. Connects to Luzia's image creation apps. |
| frequency-fatigue | 5 | 5 | Strong daily limits: maximum of 1 claim per day, and a strict 1440-minute cooldown. |
| measurability | 5 | 5 | Superb experiment layout tracking D7/D30 retention with guardrails for image gen costs and subscription conversion, using a user-level 10% holdout group for 28 days. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); fixable gate failed: economics (code); fixable gate failed: structure (code); unit-economics scored 1 (< 3)
- **Required changes:**
  - Reduce the reward value to 1 AI Image Credit (or require completing multiple ads/games to unlock the 2-credit bundle) to align with realistic US net ad revenue.
  - Introduce a session gating rule so that the daily check-in banner on the first-value screen (s01) is hidden from users in their first active session.
  - Commit to using a heavily compressed, low-cost image generation model to reduce unit image cost below $0.003.
- **Top concern:** The reward cost to serve ($0.0500 for 2 images) is roughly 8x higher than the net ad revenue generated per view ($0.0063), creating a severe and unsustainable deficit.

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `oneLiner`: "Introduce a daily check-in banner on the Chats Home tab that rewards users with 2 AI I..." → "Introduce a daily check-in banner on Chats Home that rewards returning users with 1 AI..."
- `anchor.newMechanic.description`: "A daily loyalty calendar where users check in to earn free AI Image Credits, which are..." → "A daily loyalty calendar where returning users check in to earn 1 free AI Image Credit..."
- `anchor.newMechanic.whyNeeded`: "Creates a recurring engagement hook and provides a structured way for free users to ex..." → "Creates a recurring engagement hook and provides a structured way for free returning u..."
- `trigger`: "User taps the Daily Check-In banner on Chats Home to open the check-in modal and initi..." → "User taps the Daily Check-In banner on Chats Home (hidden in Session 1) to open the ch..."
- `eligibility`: "Non-paying, free guests and signed-up users who have not claimed today's check-in rewa..." → "Non-paying, returning users in their 2nd or later active session who have not claimed ..."
- `offer.title`: "Claim Your Daily Credits" → "Claim Your Daily Credit"
- `offer.body`: "Play a quick 15-second game to unlock 2 free AI Image Credits." → "Play a quick 15-second game to unlock 1 free AI Image Credit."
- `reward.what`: "2 AI Image Credits" → "1 AI Image Credit"
- `reward.amount`: 2 → 1
- `cannibalizationGuard`: "The daily check-in limits free credits to just 2 per day, which is enough for only two..." → "The daily check-in limits free credits to just 1 per day, enough for a single compress..."
- `assumptions.cogsUnitsPerView`: 2 → 1
- `risks[0]`: "High image generation API costs if daily active user adoption spikes rapidly, which we..." → "Potential image generation API cost increases if adoption is too rapid, mitigated by u..."
- `risks[1]`: "Cannibalization of direct sign-ups, which we control by keeping the daily credit limit..." → "Accidental exposure to new users, mitigated by strict session gating to completely hid..."
- `patch.newElements[0].change`: "Add a compact 'Daily Check-In Banner' under the welcome text showing today's unclaimed..." → "Add a compact 'Daily Check-In Banner' under the welcome text showing today's unclaimed..."
- `patch.newElements[2].change`: "Add a rewards display showing the earned '2 AI Image Credits' with an animation after ..." → "Add a rewards display showing the earned '1 AI Image Credit' with an animation after c..."
- `patch.newEdges[1].effects[0].delta`: 2 → 1
- `storyboard[4].counters[0].value`: 2 → 1
- `storyboard[4].callouts[0].text`: "New balance shows 2 credits." → "New balance shows 1 credit."
- `storyboard[4].caption`: "Once completed, the user receives 2 free AI Image Credits." → "Once completed, the user receives 1 free AI Image Credit."
- `precedents[3]`: (none) → "TRIG-2"
- `precedents[4]`: (none) → "TRIG-4"

#### Round 1 (v2): **REVISE** · weighted 4.05 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | evidence "m16" is not an observation or screen in the model |
| label | code | fixable | pass | declares new mechanic "Daily AI Check-In" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0250) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Chats Home (s01) is a general onboarding/chat starting tab, which is a standard SFW surface. |
| no-incentivized-action | llm | policy | pass | The reward is '1 AI Image Credit' (r4), which is an in-app, non-transferable item and not cash-like. There is no incentive for clicks or installs. |
| no-loss-framing | llm | policy | pass | The daily check-in uses a polite banner with an explicit opt-in and a clear decline button ('Maybe Later') without confirmshaming or fake timers. |
| explicit-opt-in | llm | fixable | pass | The user must tap the 'Daily Check-In banner on Chats Home' to open the modal and then tap the 'Claim Reward' button to trigger the playable. |
| disclosed | llm | fixable | pass | The modal explicitly states: 'Play a quick 15-second game to unlock 1 free AI Image Credit.' |
| free-decline | llm | fixable | pass | Declining is free and does not degrade the user experience; the decline button is 'Maybe Later' which returns the user exactly to s01. |
| no-stream-interrupt | llm | fixable | pass | The placement is on Chats Home (s01) and is initiated by a static banner, meaning it never interrupts an active conversation or streaming response. |
| not-for-subscribers | llm | fixable | pass | Eligibility is restricted to 'Non-paying, returning users in their 2nd or later active session', which completely excludes subscribers. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 3 | The offer is triggered from a static daily check-in banner on s01. This is a proactive hub (TAX-9) rather than a moment of immediate, blocked need, meaning the intent is moderate. |
| product-integrity | 15 | 5 | The feature is completely additive, does not degrade free chat quality, and hides itself during the first session to preserve the onboarding experience. |
| cannibalization-safety | 15 | 5 | Eligibility is restricted to non-payers, capped strictly at 1 credit per day (cooldown 1440 min), and a 10% user-level holdout is configured. Higher quality and volume of images remain gated under the Luzia+ subscription. |
| unit-economics | 10 | 2 | The code-computed cost to serve ($0.0250) exceeds the net revenue per view ($0.0063 at the low end), resulting in negative margins. Although a low-cost model hypothesis is stated, the current numbers violate unit economic viability. |
| reach | 10 | 5 | The daily check-in is situated on Chats Home (s01), which is the most highly-trafficked tab in the core loop (13 visits during exploration), ensuring substantial daily reach. |
| feasibility | 10 | 4 | Maps cleanly to SIM-RWD using a 'button' entry point with ECDSA SSV verification. Creating a basic check-in calendar sheet represents a minimal engineering footprint. |
| specificity | 10 | 4 | The proposal refers to 'Chats Home' (s01), the welcome text 'e11', and the character 'Luzia' as the game partner. It could, however, explicitly integrate with the existing 'Apps Catalog' (s08) image generation flows. |
| frequency-fatigue | 5 | 4 | Capped strictly at 1 claim per 24 hours (1440 minutes) with non-nagging banners that can be easily bypassed. No aggressive re-prompts are specified. |
| measurability | 5 | 5 | Specifies D7 and D30 user retention rate as primary KPIs, with clear guardrails including paid subscription conversion rate and a randomized 10% user-level holdout over 28 days. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); fixable gate failed: economics (code); unit-economics scored 2 (< 3)
- **Required changes:**
  - Reduce the COGS of the reward by switching to a near-zero cost asset (e.g., custom chat themes, voice minutes, or text answers) or require a multi-ad bundle (e.g., watch 3 ads to claim 1 Image Credit) to ensure cost to serve stays below net ad revenue.
  - Fix the grounding failure in the 'evidence' section of the JSON by referencing a valid screen ID like 's01' or a verified text element rather than a moment ID 'm16'.
  - Explicitly specify how 'r4 AI Image Credits' are consumed within the existing Image Creation Hub (s10) or Animate Tool Screen (s09) to ensure a closed-loop product experience.
- **Top concern:** The cost to serve the image generation reward ($0.0250) is significantly higher than the net ad revenue per view ($0.0063 at the low end), making the current economic model unsustainable.

#### Changes v2 → v3 (revise() saw the required changes, never the scores)

- `oneLiner`: "Introduce a daily check-in banner on Chats Home that rewards returning users with 1 AI..." → "Introduce a daily check-in banner on Chats Home that rewards returning users with 1 AI..."
- `anchor.newMechanic.description`: "A daily loyalty calendar where returning users check in to earn 1 free AI Image Credit..." → "A daily check-in loop where users complete a 3-ad bundle to earn 1 AI Image Credit use..."
- `anchor.newMechanic.whyNeeded`: "Creates a recurring engagement hook and provides a structured way for free returning u..." → "Bundling 3 ads ensures gross ad revenue covers the image generation API cost, making t..."
- `trigger`: "User taps the Daily Check-In banner on Chats Home (hidden in Session 1) to open the ch..." → "User taps the Daily Check-In banner on Chats Home to open the check-in modal and initi..."
- `offer.body`: "Play a quick 15-second game to unlock 1 free AI Image Credit." → "Play 3 quick games to unlock 1 free AI Image Credit."
- `cannibalizationGuard`: "The daily check-in limits free credits to just 1 per day, enough for a single compress..." → "Free credits are limited to 1 per day and require 3 ad completions. Unlimited generati..."
- `assumptions.viewsPerEngager`: 1 → 3
- `risks[0]`: "Potential image generation API cost increases if adoption is too rapid, mitigated by u..." → "Users might find a 3-ad bundle tedious, mitigated by a clear progress bar and engaging..."
- `risks[1]`: "Accidental exposure to new users, mitigated by strict session gating to completely hid..." → "Potential image generation API cost increases, mitigated by requiring 3 ad completions..."
- `evidence[0].obs`: "m16" → "s01"
- `evidence[0].el`: (none) → "e7"
- `patch.newElements[0].change`: "Add a compact 'Daily Check-In Banner' under the welcome text showing today's unclaimed..." → "Add a compact 'Daily Check-In Banner' under the welcome text, hidden in Session 1."
- `patch.newElements[1].change`: "Add a prominent 'Claim Reward' button that triggers the rewarded video/playable flow." → "Add a prominent 'Claim Reward' button that triggers the rewarded playable flow."
- `patch.newElements[2].change`: "Add a rewards display showing the earned '1 AI Image Credit' with an animation after c..." → "Add a rewards display showing the earned credit after 3 ad completions."
- `storyboard[0].caption`: "Luzia Chats Home today lacks a daily retention loop or tokens." → "Luzia Chats Home lacks a daily retention loop."
- `storyboard[1].caption`: "We add a daily check-in banner on Chats Home tab." → "We add a daily check-in banner on Chats Home."
- `storyboard[2].callouts[0].text`: "Claim button initiates ad playable." → "Claim button initiates 3-ad bundle."
- `storyboard[2].caption`: "Tapping the banner displays a weekly check-in calendar to user." → "Tapping the banner displays the daily check-in calendar."
- `storyboard[3].callouts[0].text`: "Simula rewarded mini-game plays." → "Simula rewarded mini-game plays 3 times."
- `storyboard[3].caption`: "The user plays a 15-second sponsored game with Luzia." → "The user plays 3 quick 15-second games with Luzia."
- `storyboard[4].screen`: "ns1" → "s10"
- `storyboard[4].callouts[0].node`: "ne3" → "ne4"
- `storyboard[4].callouts[0].text`: "New balance shows 1 credit." → "The new 'Create with Credit' button is unlocked."
- `storyboard[4].caption`: "Once completed, the user receives 1 free AI Image Credit." → "The user earns 1 credit to generate an image."
- `precedents[5]`: (none) → "POL-2"
- `patch.newElements[3].id`: (none) → "ne4"
- `patch.newElements[3].in`: (none) → "s10"
- `patch.newElements[3].near`: (none) → "e14"
- `patch.newElements[3].place`: (none) → "after"
- `patch.newElements[3].change`: (none) → "Add a 'Create with Credit' button next to the standard create button."
- ... and 5 more changes

#### Round 2 (v3): **REJECT** · weighted 4.4 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "Daily AI Check-In" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0250) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Chats Home (s01) is the main SFW surface for user chats, away from sensitive topics. |
| no-incentivized-action | llm | policy | pass | The reward is '1 AI Image Credit', an in-app consumable with no direct monetary value or incentivized installs. |
| no-loss-framing | llm | policy | pass | The check-in is purely additive and optional, providing 'Maybe Later' as a free decline with no negative penalties. |
| explicit-opt-in | llm | fixable | pass | User taps the Daily Check-In banner on Chats Home to open the check-in modal and initiates the claim. |
| disclosed | llm | fixable | pass | The body text clearly states: 'Play 3 quick games to unlock 1 free AI Image Credit.' |
| free-decline | llm | fixable | pass | Tapping 'Maybe Later' dismisses the check-in modal and allows the user to continue chatting in s01. |
| no-stream-interrupt | llm | fixable | pass | The entry point is a banner placed on s01 (Chats Home), completely decoupled from active streaming chat interactions. |
| not-for-subscribers | llm | fixable | pass | The eligibility is restricted to 'Non-paying, returning users in their 2nd or later active session'. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | The reward is an Image Credit, which perfectly matches user interest in the Image Creation Hub (s10). However, the trigger is a proactive daily check-in rather than a moment of immediate blocking need. |
| product-integrity | 15 | 5 | The banner is neatly integrated below the welcome text on Chats Home. It preserves the normal chatting flow, does not interrupt active responses, and does not degrade the core free experience. |
| cannibalization-safety | 15 | 5 | Capped strictly at 1 credit per day and gated to non-payers. It also requires a high friction cost (3 ad completions) which contrasts cleanly with the frictionless Luzia+ subscription. |
| unit-economics | 10 | 2 | Code-computed cost to serve ($0.0250) exceeds net revenue per view ($0.0063) at the low end. Even with a 3-ad bundle, total net ad revenue (~$0.0189) fails to cover the high COGS of 1 full quality image generation. |
| reach | 10 | 5 | Chats Home (s01) is the core landing page of the application, viewed frequently by almost all active users daily. |
| feasibility | 10 | 4 | Maps cleanly to SIM-RWD with a custom 'button' entry point. Tying multiple completions to a single grant is feasible via client-side tracking, though it requires custom state management before triggering REWARD_VERIFIED. |
| specificity | 10 | 5 | Extremely high specificity. Mentions Luzia as the Game Partner, integrates directly with Chats Home (s01), and specifically references the standard create button (e14) on the Image Creation Hub (s10). |
| frequency-fatigue | 5 | 5 | Frequency is strictly capped at 1 claim per day (cooldown 1440 min). The banner is cleverly hidden during Session 1 to protect newly onboarded users from ad fatigue. |
| measurability | 5 | 5 | Defines strong primary KPIs (D7/D30 retention) and appropriate guardrails (subscription conversion, image cost per user). Plans a standard 28-day 10% user-level holdout. |

- **Verdict reasons (code):** fixable gate failed: economics (code); unit-economics scored 2 (< 3); still REVISE after round 2
- **Required changes:**
  - Reduce the COGS of the reward by using a cheaper, distilled AI image model for ad-supported generations instead of the premium model.
  - Alternatively, require 4 or 5 ad completions per credit to ensure the gross ad revenue fully covers the $0.0250 cost to serve.
  - Or reward users with fractional credits (e.g., 0.5 Image Credits per 3-ad check-in, requiring 2 days of check-ins to generate 1 image).
- **Top concern:** The image generation cost to serve ($0.0250) exceeds the net ad revenue generated by the 3-ad bundle at the low end, leading to a negative unit margin for highly active free users.


## P5: Anima Queue Fast-Track Priority — SHIP

> Users can play a quick Simula game with Luzia to earn Fast-Track Credits that bypass the animation processing queue during peak hours.

- product-change · TAX-4 · surface Animate Tool Screen (s09) · reward 1 Fast-Track Animation Credit · caps 5/day

#### Round 0 (v1): **REVISE** · weighted 3.25 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | evidence "m20" is not an observation or screen in the model |
| label | code | fixable | pass | declares new mechanic "Anima Generation Limits" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0250) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Proposal targets screen s09 (Animate Tool Screen) via trigger 'When the user taps the generate button with 0 Anima Video Credits remaining.', which is an SFW creative animation tool with options like waving, clapping, and walking. |
| no-incentivized-action | llm | policy | pass | Proposal grants '1 Anima Video Credit' (resource 'r_anima_credit') redeemable only in-app for video animation, with no cash, gift cards, or rewards for app installs or clicks. |
| no-loss-framing | llm | policy | pass | The offer uses standard value framing without dark patterns or timers: 'title': 'Out of Anima Credits', 'body': 'Play a 15-second game to get 1 Anima Video Credit and export now.', 'cta': 'Play Now', 'decline': 'No Thanks'. |
| explicit-opt-in | llm | fixable | pass | Storyboard and offer define an explicit opt-in overlay where the user must tap the CTA: 'An explicit opt-in overlay appears, offering 1 credit for playing a 15-second game.' with 'cta': 'Play Now'. |
| disclosed | llm | fixable | pass | The offer disclosure specifies both the duration and the exact reward upfront: 'body': 'Play a 15-second game to get 1 Anima Video Credit and export now.'. |
| free-decline | llm | fixable | pass | Declining is explicitly provided with 'decline': 'No Thanks', which dismisses the prompt without penalty or state change. |
| no-stream-interrupt | llm | fixable | pass | The trigger occurs before generation starts: 'When the user taps the generate button with 0 Anima Video Credits remaining.', never interrupting an active generation. |
| not-for-subscribers | llm | fixable | pass | The eligibility is explicitly restricted: 'Non-paying free tier users who have exhausted their daily video generation limit.'. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | The user is blocked from exporting on s09 ('When the user taps the generate button with 0 Anima Video Credits remaining.') and is offered '1 Anima Video Credit' to immediately generate and export their video. However, the credit is an invented product change rather than an existing observed constraint. |
| product-integrity | 15 | 2 | The proposal explicitly specifies 'removesFreeValue': true, declaring 'Introduce a daily limit of 1 free video animation per day'. Restricting previously unlimited free tool usage creates backlash, as noted in proposal risks: 'Introducing limits on video generation may cause initial user backlash, similar to Duolingo's Energy change.' |
| cannibalization-safety | 15 | 4 | Proposal restricts offers to 'Non-paying free tier users', caps rewards at 3 per day, and separates video generation from core Luzia+ subscription features ('deep reasoning' and 'services'). A 10% 28-day randomized holdout is planned. |
| unit-economics | 10 | 1 | Code-computed economics show that cost to serve per view is $0.0250 (image x 1), while US net revenue per view is only $0.0063 (gross $0.0090–$0.0150). The cost to serve significantly exceeds revenue per view, yielding an unsustainable negative margin. |
| reach | 10 | 3 | Screen s09 ('Animate Tool Screen') is accessed via secondary flow f7 ('Apps Catalog -> Open Anima app'). While s09 had 6 visits during exploration, it is a specialized tool rather than the main chat feed, making the assumed 25% engaged DAU share optimistic. |
| feasibility | 10 | 3 | Maps cleanly to Simula 'SIM-RWD' with 'button' entry and 'REWARD_VERIFIED'. However, it requires implementing a full backend quota and credit system for Anima, and failed code grounding on moment m20. |
| specificity | 10 | 4 | Grounded in Luzia's actual screens and elements, referencing s09, e14 ('Upload the pic you want to animate'), animation styles like Clapping and Walking, with patches ne1 and ne2 placed near e34 and e12. |
| frequency-fatigue | 5 | 4 | Includes explicit caps: 'caps': { 'perDay': 3, 'cooldownMin': 15 }, which limits fatigue and prevents runaway impressions. |
| measurability | 5 | 5 | Specifies primary metric 'Anima Generation Ad Revenue', guardrails ('Luzia+ Subscription Conversion Rate', 's09 Screen Churn Rate', 'D7 Retention'), and a user-level 10% holdout over 28 days. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); fixable gate failed: economics (code); product-integrity scored 2 (< 3); unit-economics scored 1 (< 3); weighted 3.25 < 3.8
- **Required changes:**
  - Fix unit economics: The cost to serve ($0.0250) exceeds net ad revenue ($0.0063). Bundle multiple ad views (e.g., watch 2-3 ads, fully disclosed) per generation credit, or reward a near-zero COGS perk like priority rendering queue or exclusive animation presets.
  - Resolve product integrity loss: Rather than taking away existing free generations by capping daily exports to 1 ('removesFreeValue': true), keep baseline free generations intact and apply the rewarded gate to premium tiers such as HD resolution, watermark-free export, or extended duration.
  - Fix evidence grounding: Replace evidence key 'm20' with verified digest screen IDs and element IDs (such as s09 and e14) to satisfy automated grounding verification.
- **Top concern:** Cost to serve per view ($0.0250) severely exceeds net ad revenue ($0.0063), creating an unsustainable, loss-making unit economic structure for each completed ad.

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `title`: "Anima Video Generation Export Boost" → "Anima Queue Fast-Track Priority"
- `oneLiner`: "Users can play a quick Simula game to earn an extra Anima video generation credit when..." → "Users can play a quick Simula game with Luzia to earn Fast-Track Credits that bypass t..."
- `anchor.economy[0]`: "r_anima_credit (new)" → "r_fast_track_credit (new)"
- `anchor.newMechanic.name`: "Anima Generation Limits" → "Fast-Track Queue Priority"
- `anchor.newMechanic.description`: "Introduce a daily limit of 1 free video animation per day, with additional exports cos..." → "Introduce a fast-track rendering queue for Anima animations. Free generation remains u..."
- `anchor.newMechanic.whyNeeded`: "Protects high-COGS GPU resources on video generation while providing a clear monetizat..." → "Protects user engagement by keeping free access intact while offering a zero-COGS prog..."
- `anchor.newMechanic.removesFreeValue`: true → false
- `trigger`: "When the user taps the generate button with 0 Anima Video Credits remaining." → "When the user taps the Animate & Export button during queue wait times."
- `eligibility`: "Non-paying free tier users who have exhausted their daily video generation limit." → "Non-paying free tier users who want to skip the standard rendering queue."
- `offer.title`: "Out of Anima Credits" → "Skip the Animation Queue"
- `offer.body`: "Play a 15-second game to get 1 Anima Video Credit and export now." → "Play a 15-second game with Luzia to skip the wait and fast-track your animation."
- `offer.cta`: "Play Now" → "Fast-Track Now"
- `offer.decline`: "No Thanks" → "Wait in Queue"
- `reward.what`: "1 Anima Video Credit" → "1 Fast-Track Animation Credit"
- `reward.resource`: "r_anima_credit" → "r_fast_track_credit"
- `caps.perDay`: 3 → 5
- `caps.cooldownMin`: 15 → 10
- `cannibalizationGuard`: "Video generation limits are completely distinct from the main Luzia+ core reasoning or..." → "Standard generation remains fully free and functional, while Luzia+ subscribers automa..."
- `assumptions.engagedShare`: 0.25 → 0.35
- `assumptions.viewsPerEngager`: 1.5 → 2
- `assumptions.cogs`: "image" → "none"
- `kpis.primary`: "Anima Generation Ad Revenue" → "Anima Fast-Track Ad Revenue"
- `risks[0]`: "Introducing limits on video generation may cause initial user backlash, similar to Duo..." → "If peak rendering queue wait times are negligible, the user's perceived value of Fast-..."
- `risks[1]`: "High video generation infrastructure costs might exceed ad payout in low-eCPM regions ..." → (none)
- `evidence[0].obs`: "m20" → "s09"
- `evidence[0].quote`: "Animate Tool Screen (tab) is a place users return to (6 visits during exploration)" → "Upload the pic you want to animate"
- `evidence[1].obs`: "s09" → "s08"
- `evidence[1].el`: "e14" → "e16"
- `evidence[1].quote`: "Upload the pic you want to animate" → "Anima"
- `patch.newElements[0].change`: "Animate & Export Button" → "Fast-Track Animate Button"
- ... and 19 more changes

#### Round 1 (v2): **REVISE** · weighted 3.55 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "Fast-Track Queue Priority" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The placement is on s09 (Animate Tool Screen) inside the creative mini-app catalog, quoting 'Upload the pic you want to animate', which is a standard creative generation surface away from sensitive topics. |
| no-incentivized-action | llm | policy | pass | The reward is '1 Fast-Track Animation Credit' (an in-app utility) granted for playing a 15-second mini-game with Luzia, with no rewards offered for clicking, downloading, or external actions. |
| no-loss-framing | llm | policy | pass | Free generation remains functional and unlimited ('Free generation remains unlimited but experiences wait times during peak processing periods'); the decline option is 'Wait in Queue' without confirmshaming or loss of user assets. |
| explicit-opt-in | llm | fixable | pass | Users explicitly opt in via the CTA button 'Fast-Track Now' after viewing the invitation. |
| disclosed | llm | fixable | pass | The offer dialog states the required action and reward: 'Play a 15-second game with Luzia to skip the wait and fast-track your animation.' |
| free-decline | llm | fixable | pass | Declining via 'Wait in Queue' is completely free and allows standard generation to proceed without penalty. |
| no-stream-interrupt | llm | fixable | pass | The trigger occurs at the submission boundary ('When the user taps the Animate & Export button during queue wait times'), before any rendering starts. |
| not-for-subscribers | llm | fixable | pass | Eligibility explicitly targets 'Non-paying free tier users who want to skip the standard rendering queue' and notes that 'Luzia+ subscribers automatically bypass the processing queue at all times without needing ads.' |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 3 | The proposal applies TAX-4 progression acceleration by offering a queue bypass when rendering animations on s09. However, Luzia's digest shows no current server queue or wait times, making this mechanic contingent on creating an artificial bottleneck or waiting for peak backend traffic. |
| product-integrity | 15 | 4 | The proposal keeps free generation unlimited ('Free generation remains unlimited') and uses the native persona Luzia as the Game Partner. However, if the rendering delay feels synthetic rather than genuine load, it risks frustrating users. |
| cannibalization-safety | 15 | 4 | Gated to non-paying users with a daily cap of 5 and a 10-minute cooldown. Luzia+ subscription's primary selling points in the digest are 'Deep reasoning mode' and 'advanced services (bookings, shopping)', so offering queue skips for a mini-app does not undermine the main subscription value. |
| unit-economics | 10 | 5 | Code-computed cost to serve per view is $0.0000 (none x 1) against a net US revenue of $0.0090–$0.0150 per view, yielding 100% margin since queue reordering carries zero incremental compute COGS. |
| reach | 10 | 2 | Anima is a secondary tool within the Apps catalog (s08 -> s09), reached only after multiple navigation steps. The assumption that 35% of total DAU will encounter peak queue wait times in Anima and watch 2 ads each is an unrealistic reach estimate for a niche sub-feature. |
| feasibility | 10 | 3 | While SIM-RWD integrates via standard entry buttons and REWARD_VERIFIED callbacks, implementing a priority queue management system across asynchronous GPU video rendering clusters is a substantial backend undertaking. |
| specificity | 10 | 3 | Mentions screen s09 and quotes element e14 ('Upload the pic you want to animate') as well as 'Anima' from s08. However, it references an invented 'Animate & Export button' not present in the digest, placing element ne1 near e34 (a disclaimer text). |
| frequency-fatigue | 5 | 4 | Specifies a cap of 5 grants per day and a 10-minute cooldown, ensuring users cannot spam views and limiting ad fatigue. |
| measurability | 5 | 5 | Defines a clear primary KPI ('Anima Fast-Track Ad Revenue'), relevant guardrails ('Luzia+ Subscription Conversion Rate', 's09 Screen Churn Rate', 'D7 Retention'), and a 10% randomized user-level holdout over 28 days. |

- **Verdict reasons (code):** reach scored 2 (< 3); weighted 3.55 < 3.8
- **Required changes:**
  - Recalibrate reach assumptions: Anima on s09 is a secondary tool in the Apps tab, so assuming 35% DAU engagement with queue skips is an extreme overestimate compared to the core chat and image creation loops.
  - Ground the trigger on existing s09 UI states (such as style selection or the generation progress state) rather than referencing a non-existent 'Animate & Export' button.
  - Ensure queue wait times only surface during authentic backend rendering congestion to prevent the perception of artificial friction introduced purely to monetize.
- **Top concern:** Reach is very limited because Anima is an auxiliary tool within the Apps catalog rather than Luzia's core chat loop, and the 35% DAU engagement assumption is drastically overstated for a feature that only triggers during peak rendering queues.

#### Changes v2 → v3 (revise() saw the required changes, never the scores)

- `trigger`: "When the user taps the Animate & Export button during queue wait times." → "When the user selects an animation style like 'Clapping' (e24) or taps 'Animate' (e13)..."
- `eligibility`: "Non-paying free tier users who want to skip the standard rendering queue." → "Non-paying free tier users who want to skip the standard rendering queue during peak h..."
- `offer.body`: "Play a 15-second game with Luzia to skip the wait and fast-track your animation." → "Play a quick game to skip wait times and fast-track your animation."
- `cannibalizationGuard`: "Standard generation remains fully free and functional, while Luzia+ subscribers automa..." → "Standard generation remains fully free and functional. Wait times only surface during ..."
- `assumptions.engagedShare`: 0.35 → 0.08
- `assumptions.viewsPerEngager`: 2 → 1.5
- `patch.newElements[0].near`: "e34" → "e13"
- `storyboard[0].caption`: "Currently, users choose animation styles on the Anima Tool screen." → "Users currently choose animation styles on the Anima Tool screen."
- `evidence[2].obs`: (none) → "s09"
- `evidence[2].el`: (none) → "e13"
- `evidence[2].quote`: (none) → "Animate"

#### Round 2 (v3): **SHIP** · weighted 4.7 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "Fast-Track Queue Priority" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | "surface": "s09", "trigger": "When the user selects an animation style like 'Clapping' (e24) or taps 'Animate' (e13)..." |
| no-incentivized-action | llm | policy | pass | "reward": {"what": "1 Fast-Track Animation Credit", "resource": "r_fast_track_credit", "amount": 1, "grantOn": "REWARD_VERIFIED"} |
| no-loss-framing | llm | policy | pass | "cannibalizationGuard": "Standard generation remains fully free and functional. Wait times only surface during authentic backend rendering congestion to prevent artificial friction..." |
| explicit-opt-in | llm | fixable | pass | "cta": "Fast-Track Now", "decline": "Wait in Queue" |
| disclosed | llm | fixable | pass | "body": "Play a quick game to skip wait times and fast-track your animation." |
| free-decline | llm | fixable | pass | "decline": "Wait in Queue" |
| no-stream-interrupt | llm | fixable | pass | "trigger": "When the user selects an animation style like 'Clapping' (e24) or taps 'Animate' (e13) during periods where active rendering queue wait times exceed 10 seconds." |
| not-for-subscribers | llm | fixable | pass | "eligibility": "Non-paying free tier users who want to skip the standard rendering queue during peak hours." "Luzia+ subscribers always bypass processing queues." |
| portfolio-distinct | code | fixable | pass | the first SHIP of the portfolio |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | Proposal triggers on s09 when selecting an animation style like 'Clapping' (e24) or tapping 'Animate' (e13) during >10s rendering queues, directly offering a queue skip via '1 Fast-Track Animation Credit'. |
| product-integrity | 15 | 5 | Proposal notes 'Standard generation remains fully free and functional. Wait times only surface during authentic backend rendering congestion to prevent artificial friction'. It adds zero artificial friction or answers degradation. |
| cannibalization-safety | 15 | 5 | Proposal limits eligibility to 'Non-paying free tier users who want to skip the standard rendering queue' and notes 'Luzia+ subscribers always bypass processing queues.' Uses a 10% holdout over 28 days. |
| unit-economics | 10 | 5 | Code output shows 'Cost to serve per view: $0.0000 (none x 1)', with US revenue per view $0.0090-$0.0150. Queue priority carries zero marginal COGS. |
| reach | 10 | 3 | Proposal estimates 'engagedShare': 0.08, as the trigger is restricted to periods where 'active rendering queue wait times exceed 10 seconds' on Animate Tool Screen (s09). |
| feasibility | 10 | 4 | Uses SIM-RWD button entry on s09, adding elements ne1 and ne2 in patch. Requires backend queue monitoring integration. |
| specificity | 10 | 5 | References Anima tool on s09, specific animation style 'Clapping' (e24), 'Animate' button (e13), and Luzia as Game Partner. |
| frequency-fatigue | 5 | 5 | Configures 'caps': {'perDay': 5, 'cooldownMin': 10}. |
| measurability | 5 | 5 | Specifies primary KPI 'Anima Fast-Track Ad Revenue', guardrails 'Luzia+ Subscription Conversion Rate', 's09 Screen Churn Rate', 'D7 Retention', and 'User-level randomized holdout group, 10% allocation, evaluated over 28 days.' |

- **Verdict reasons (code):** weighted 4.7 >= 3.8, every criterion >= 3, all gates pass
- **Required changes:**
  - Consider providing fallback utility for Fast-Track Credits during off-peak periods when queue wait times are under 10 seconds (e.g. higher rendering resolution or HD preview).
- **Top concern:** Offer engagement and perceived reward value depend heavily on active server queue congestion exceeding 10 seconds, limiting reach during off-peak hours.

