# Judgments: Luzia

Verdicts are computed in code: SHIP at weighted ≥ 3.8 with every criterion ≥ 3 and every gate passing; REVISE between 3 and 3.8, on any criterion ≤ 2, or on a fixable gate; REJECT below 3, on a policy gate, or still REVISE after round 2 (or when a revision stalls: < +0.2 and no gate fixed). Only SHIP goes to the slides.

Weights: value-moment-fit 20, product-integrity 15, cannibalization-safety 15, unit-economics 10, reach 10, feasibility 10, specificity 10, frequency-fatigue 5, measurability 5.

## Summary

| proposal | title | final | weighted | versions | summary |
|---|---|---|---|---|---|
| P1 | Start Task with Rewarded Refill | **SHIP** | 4.75 | v1 → v2 | SHIP at 4.75 (v2 after 1 revision). |
| P2 | AI Usage Quota Refill Fallback | **REJECT** | 3.65 | v1 → v2 → v3 | REJECT after 2 revisions: fixable gate failed: economics (code); unit-economics scored 2 (< 3); weighted 3.65 < 3.8; still REVISE after round 2. Top concern: The cost to serve 5 bonus messages ($0.0090) exceeds net revenue per view ($0.0063) at the low end, resulting in negative unit economics. |
| P3 | Deep Reasoning Session Pass | **REJECT** | 3.85 | v1 → v2 → v3 | REJECT after 2 revisions: fixable gate failed: economics (code); unit-economics scored 1 (< 3); still REVISE after round 2. Top concern: The cost of the reward (inference for premium reasoning models) exceeds the generated net revenue per view, making the current offer unprofitable. |
| P4 | Daily Character Quest & Credits | **SHIP** | 4.45 | v1 → v2 | SHIP at 4.45 (v2 after 1 revision). |
| P5 | Attachment Studio Extra Credit | **REJECT** | 4.5 | v1 → v2 | REJECT after 1 revision: revision stalled (weighted +0.1, below +0.2) with the same gate failures. Top concern: Image generation COGS ($0.0250) exceeds net revenue per view ($0.0063), making the reward unprofitable at current unit economics. |

## P1: Start Task with Rewarded Refill — SHIP

> Unlock immediate access to premium task services by playing a quick mini-game.

- existing · TAX-1 · surface Create Account Sheet (s07) · reward 1 task access · caps 2/day

#### Round 0 (v1): **REVISE** · weighted 3.8 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | new element "ne1" is placed near "e61", which is not an element on s07; storyboard change: callout node "e61" is not on s07 and not declared; evidence element "e61" is not on s07 |
| label | code | fixable | pass | cites observed economy items: r1, r3 |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Proposal targets general AI task assistance and uses SFW interactions with Game Partner Luzia. |
| no-incentivized-action | llm | policy | pass | Rewards task access for playing a mini-game; no rewards for clicks, installs, or cash-like items. |
| no-loss-framing | llm | policy | pass | Uses gain framing ('Play a quick game... to unlock') without dark patterns or loss tactics. |
| explicit-opt-in | llm | fixable | pass | Requires explicit tap on 'Play Now' button before the mini-game starts. |
| disclosed | llm | fixable | pass | Clearly states the reward (1 task access) and required action (15s game with Luzia) beforehand. |
| free-decline | llm | fixable | pass | Includes an equally legible decline option ('No thanks') that returns the user without penalty. |
| no-stream-interrupt | llm | fixable | pass | Appears at the subscription/account wall (s07) when attempting a task, never mid-stream. |
| not-for-subscribers | llm | fixable | pass | Explicitly restricted to non-paying, logged-out users hitting the subscription wall. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | Proposal targets moment m1 (subscription wall on s07 when starting a task) and rewards task access (r3) right at the point of need. |
| product-integrity | 15 | 3 | Triggers at the subscription wall rather than interrupting chat flow, preserving native experience. |
| cannibalization-safety | 15 | 4 | Capped at 2 per day, restricted to non-payers at the wall, keeping the subscription as the superior path. |
| unit-economics | 10 | 2 | Code computed cost to serve ($0.0090) exceeding net revenue per view ($0.0063) at the low end. |
| reach | 10 | 4 | Tied to starting a task from the Services Tab, which is a frequent core activity. |
| feasibility | 10 | 4 | Maps directly to SIM-RWD with button entry, Game Partner Luzia, and 15s play threshold. |
| specificity | 10 | 5 | Cites screen s07, s06, resources r1 and r3, and uses Luzia as Game Partner from digest nouns. |
| frequency-fatigue | 5 | 4 | Includes explicit caps of 2 per day, a 30-minute cooldown, and decline options. |
| measurability | 5 | 5 | Defines primary metric, guardrails, and a 10% user-level holdout group. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); fixable gate failed: economics (code); unit-economics scored 2 (< 3)
- **Required changes:**
  - Fix element grounding: element 'e61' is not present on screen s07; reference a valid element ID from s07.
  - Resolve unit economics violation: reduce reward COGS (e.g. by using a cheaper model or smaller task unit) so that cost to serve is below net revenue per view.
- **Top concern:** Unit economics show that the cost to serve the task ($0.0090) exceeds net revenue per view ($0.0063) at the low end, making the reward unprofitable.

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `trigger`: "User attempts to start a task or use an advanced service on the Services Tab (s06) and..." → "User attempts to start a task on the Services Tab and is blocked by the subscription w..."
- `eligibility`: "Non-paying, logged-out users hitting the subscription wall on s07." → "Non-paying users hitting the subscription wall on s07."
- `offer.body`: "Play a quick game with Luzia to unlock this task immediately." → "Play a quick 15-second game with Luzia to unlock this task."
- `assumptions.cogs`: "text-premium" → "text-cheap"
- `assumptions.cogsUnitsPerView`: 1 → 0.5
- `evidence[0].el`: "e61" → (none)
- `patch.newElements[0].near`: "e61" → (none)
- `storyboard[0].callouts[0].text`: "User taps 'Start new task'" → "User taps start new task"
- `storyboard[0].caption`: "User wants to start a task but has no quota." → "User wants to start a task."
- `storyboard[1].callouts[0].node`: "e61" → "ne1"
- `storyboard[1].callouts[0].text`: "Subscription wall hits" → "Subscription wall appears"
- `storyboard[1].caption`: "User is prompted to upgrade or sign up." → "Subscription wall blocks the action."
- `storyboard[2].caption`: "We offer a rewarded path to start the task." → "User is offered rewarded unlock."
- `storyboard[3].caption`: "User plays the rewarded mini-game." → "User plays mini-game."
- `storyboard[4].caption`: "User successfully starts their task." → "Task is successfully unlocked."

#### Round 1 (v2): **SHIP** · weighted 4.75 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | cites observed economy items: r1, r3 |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The proposed surface is the Services Tab (s07/Create Account Sheet), which relates to assistant tasks (bookings, shopping, reminders), a standard SFW utility surface. |
| no-incentivized-action | llm | policy | pass | The reward is '1 task access' granted in-app, with no incentives for clicks, installs, or external rewards. |
| no-loss-framing | llm | policy | pass | The proposal uses gain framing: 'Play... to unlock this task', avoiding threats or hostage dynamics. |
| explicit-opt-in | llm | fixable | pass | The proposal includes an offer card with a clear 'Play Now' CTA. |
| disclosed | llm | fixable | pass | The offer text states: 'Play a quick 15-second game with Luzia to unlock this task.' |
| free-decline | llm | fixable | pass | The offer includes a 'No thanks' button, and declining simply closes the prompt. |
| no-stream-interrupt | llm | fixable | pass | The trigger is a subscription wall (s07) rather than mid-stream chat. |
| not-for-subscribers | llm | fixable | pass | The proposal explicitly limits eligibility to 'Non-paying users hitting the subscription wall'. |
| portfolio-distinct | code | fixable | pass | the first SHIP of the portfolio |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | The trigger is the exact moment of need: when a user attempts to start a task and hits the subscription wall. |
| product-integrity | 15 | 5 | The ad is placed at the wall boundary, keeping the chat experience uninterrupted and preserving the user's intent. |
| cannibalization-safety | 15 | 4 | The reward is capped at 2 accesses per day, and the offer is only shown to non-payers at the wall, preserving the subscription as the superior, unlimited option. |
| unit-economics | 10 | 5 | Cost to serve ($0.0009) is roughly 6-10% of the computed revenue per view ($0.009–0.015), providing a healthy margin. |
| reach | 10 | 4 | The Services Tab (s06/s07) is identified as a frequent interaction point in the digest (m1, m18). |
| feasibility | 10 | 5 | The proposal maps clearly to SIM-RWD and existing screen s07, making it a low-complexity integration. |
| specificity | 10 | 5 | Uses app-specific screen s07, character Luzia, and r3 task resource. |
| frequency-fatigue | 5 | 5 | Includes explicit caps (2 per day) and a 30-minute cooldown. |
| measurability | 5 | 5 | Defines primary metrics and guardrails, including a 10% user-level holdout. |

- **Verdict reasons (code):** weighted 4.75 >= 3.8, every criterion >= 3, all gates pass
- **Top concern:** None. The proposal is well-reasoned, economically sound, and strictly adheres to policy.


## P2: AI Usage Quota Refill Fallback — REJECT

> Watch a quick game partner session to earn bonus AI usage quota after dismissing the signup wall.

- existing · TAX-3 · surface Favorite messages (s21) · reward 5 bonus chat messages · caps 1/day

#### Round 0 (v1): **REVISE** · weighted 3.2 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | cites observed economy items: r2 |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | **FAIL** | the patch adds 1 "account" of Account Access on REWARD_VERIFIED |
| not-for-account-wall | code | fixable | **FAIL** | the reward is Account Access: an ad cannot stand in for creating an account; the reward is "View Favorite messages", which only an account unlocks: an ad cannot stand in for signing up |
| sfw | llm | policy | pass | The proposal features a game partner session with Luzia for saving favorite messages, which is SFW. |
| no-incentivized-action | llm | policy | pass | The proposal rewards completing a 15-second mini-game view, not clicks, installs, or cash. |
| no-loss-framing | llm | policy | pass | The proposal uses gain framing (play to unlock saving for 72 hours) without dark patterns. |
| explicit-opt-in | llm | fixable | pass | The proposal uses an explicit CTA button 'Play Now' before launching the ad. |
| disclosed | llm | fixable | pass | The proposal clearly states the reward and action ('Play a 15-second game with Luzia to save your favorite messages for 72 hours') prior to the ad. |
| free-decline | llm | fixable | pass | The proposal includes a clear decline option ('No Thanks') that returns the user to the screen. |
| no-stream-interrupt | llm | fixable | pass | The proposal triggers when hitting the signup wall on s21 (Favorite Messages sheet), not mid-stream. |
| not-for-subscribers | llm | fixable | pass | Eligibility is restricted to non-signed-up users (guests) encountering the favorite messages wall. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 2 | The proposal targets the account signup wall on s21, but attempts to grant account access entitlement r2 as a reward, violating the rule that account-only features cannot be rewarded. Score: 2. |
| product-integrity | 15 | 2 | Procedure rule 8 states that an ad never stands in for creating an account and account-only features (saving) are never rewards. Score: 2. |
| cannibalization-safety | 15 | 3 | Access is time-boxed to 72 hours for guests, keeping permanent account saving behind sign-up, though granting account access via ad is flawed. Score: 3. |
| unit-economics | 10 | 4 | Code computed COGS as $0.0000 against US view revenue of $0.0090-$0.0150. Score: 4. |
| reach | 10 | 4 | Triggered on m5 (Favorite messages wall), which is a frequent core loop interaction. Score: 4. |
| feasibility | 10 | 5 | Maps directly to SIM-RWD with button entry, Luzia game partner, 15s play, and REWARD_VERIFIED. Score: 5. |
| specificity | 10 | 3 | References screen s21 (Favorite messages), resource r2, and Luzia, but loses points for treating account entitlement as a currency. Score: 3. |
| frequency-fatigue | 5 | 4 | Specifies a per-day cap of 3 and a 15-minute cooldown. Score: 4. |
| measurability | 5 | 5 | Includes primary metric ARPDAU, guardrails (retention, signup conversion, completion rate), and a 5% user-level holdout for 28 days. Score: 5. |

- **Verdict reasons (code):** fixable gate failed: reward-coherence (code); fixable gate failed: not-for-account-wall (code); value-moment-fit scored 2 (< 3); product-integrity scored 2 (< 3); weighted 3.2 < 3.8
- **Required changes:**
  - Remove account access (r2) as a direct reward entitlement; an ad never stands in for creating an account or granting account-only features like saving.
  - Redesign the offer to be a post-decline fallback sample (TAX-10) rather than a direct substitute for account signup wall creation.
- **Top concern:** The proposal treats account access (r2) and account-only saving features as a rewarded entitlement, violating core rules that account creation must remain the primary path and account-only features cannot be rewarded.

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `title`: "Favorite Message Slot Unlock" → "Favorite Message Saving Fallback"
- `oneLiner`: "Watch a quick game partner session to unlock favorite message saving without immediate..." → "Watch a quick game partner session to sample favorite message saving for 24 hours."
- `trigger`: "When guest users tap to save favorite messages on the Favorite Messages page and hit t..." → "After dismissing the account signup wall on the Favorite messages screen."
- `eligibility`: "Non-signed-up users (guests) encountering the favorite messages wall." → "Guest users who dismiss the account signup wall (m6)."
- `offer.title`: "Unlock Favorite Messages" → "Try Saving for 24h"
- `offer.body`: "Play a 15-second game with Luzia to save your favorite messages for 72 hours." → "Not ready to sign up? Play a 15-second game with Luzia to try saving favorite messages..."
- `reward.what`: "72-hour access to favorite message saving" → "24-hour access to favorite message saving"
- `reward.resource`: "r2" → (none)
- `reward.duration`: "72 hours" → "24 hours"
- `caps.perDay`: 3 → 1
- `caps.cooldownMin`: 15 → 60
- `cannibalizationGuard`: "Access is time-boxed to 72 hours and restricted to guests; permanent account saving an..." → "Access is a time-boxed sample for guests who already declined signup; it does not gran..."
- `assumptions.engagedShare`: 0.25 → 0.2
- `assumptions.viewsPerEngager`: 1.5 → 1
- `kpis.primary`: "Rewarded ad ARPDAU and ad revenue per guest DAU" → "Conversion rate from ad-engagement to account signup"
- `kpis.guardrails[0]`: "Guest retention (D1/D7 non-inferiority)" → "Account signup rate"
- `kpis.guardrails[1]`: "Free account signup conversion rate" → "Guest D1/D7 retention"
- `kpis.guardrails[2]`: "Ad completion rate >= 90%" → "Ad completion rate"
- `kpis.holdout`: "5% user-level holdout for 28 days comparing total account creation and engagement rates" → "5% user-level holdout for 30 days comparing total account creation and engagement rates"
- `risks[0]`: "Users might prefer temporary ad unlocks over permanent free account creation if not cl..." → "Ad-supported access might delay signups if users find the temporary sample sufficient ..."
- `risks[1]`: "Low fill rates in specific non-US geos." → (none)
- `patch.newScreens[0].id`: "ns1" → (none)
- `patch.newScreens[0].basedOn`: "s21" → (none)
- `patch.newScreens[0].kind`: "sheet" → (none)
- `patch.newScreens[0].change`: "Add Simula rewarded offer button alongside the sign-up button on the Favorite messages..." → (none)
- `patch.newElements[0].place`: "before" → "after"
- `patch.newElements[0].change`: "Simula rewarded ad invitation button for unlocking favorite messages" → "Add 'Try for 24h' rewarded button after the user declines the signup wall."
- `patch.newEdges[0].effects[0].resource`: "r2" → "TemporaryFavoriteAccess"
- `storyboard[0].callouts[0].text`: "Mandatory sign-up wall blocking message saving" → "Mandatory signup wall"
- `storyboard[0].caption`: "Today, guest users hit a strict sign-up wall when trying to save favorite messages." → "Guest users are blocked by a mandatory signup wall when trying to save messages."
- ... and 10 more changes

#### Round 1 (v2): **REVISE** · weighted 3.75 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | edge effect on unknown resource "TemporaryFavoriteAccess" |
| label | code | fixable | pass | cites observed economy items: r2 |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | **FAIL** | the reward is "View Favorite messages", which only an account unlocks: an ad cannot stand in for signing up |
| sfw | llm | policy | pass | The proposal targets s21 (Favorite messages), which is a standard SFW feature in Luzia. |
| no-incentivized-action | llm | policy | pass | The reward is 24-hour access to favorite message saving obtained by playing a 15-second game; no clicks, installs, or cash-like rewards are incentivized. |
| no-loss-framing | llm | policy | pass | The offer copy uses clean gain/fallback framing without dark patterns or confirmshaming. |
| explicit-opt-in | llm | fixable | pass | The user must tap the CTA button Play Now to opt in. |
| disclosed | llm | fixable | pass | The body clearly states the action and reward before the ad. |
| free-decline | llm | fixable | pass | The decline button is No Thanks, which returns the user to the screen without penalty. |
| no-stream-interrupt | llm | fixable | pass | The trigger occurs after dismissing the account signup wall on the Favorite messages screen, not during a streaming response. |
| not-for-subscribers | llm | fixable | pass | Eligibility specifies guest users who dismiss the account signup wall. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | Triggered immediately after dismissing the account signup wall on the Favorite messages screen, offering a 24-hour sample of favorite message saving. |
| product-integrity | 15 | 2 | Provides a time-boxed sample with clear decline, but violates the rule that account-only features requiring account access cannot be granted via ads. |
| cannibalization-safety | 15 | 4 | Gated to guest users who decline signup, time-boxed to 24 hours, and capped at 1 per day. |
| unit-economics | 10 | 5 | Cost to serve is zero and US view earnings are within economic viability. |
| reach | 10 | 4 | Triggered on s21 (Favorite messages), a frequent guest wall moment. |
| feasibility | 10 | 3 | Uses SIM-RWD unit and standard config, though patch references an unknown resource. |
| specificity | 10 | 4 | Cites screen s21, resource r2, moment m5, and character Luzia. |
| frequency-fatigue | 5 | 4 | Caps per day at 1 with a 60-minute cooldown. |
| measurability | 5 | 5 | Includes primary metric, guardrails, and a 5% user-level holdout for 30 days. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); fixable gate failed: not-for-account-wall (code); product-integrity scored 2 (< 3); weighted 3.75 < 3.8
- **Required changes:**
  - Change the reward from granting access to an account-locked feature (saving messages) to a non-account feature or separate bonus quota, as account-only features cannot be bypassed by ads per procedure rule 8.
  - Fix the patch resource delta to use an existing or correctly defined resource instead of the unknown TemporaryFavoriteAccess.
- **Top concern:** An ad cannot stand in for account creation; account-only features like saving messages require account access (r2) and cannot be granted via rewarded ads.

#### Changes v2 → v3 (revise() saw the required changes, never the scores)

- `title`: "Favorite Message Saving Fallback" → "AI Usage Quota Refill Fallback"
- `oneLiner`: "Watch a quick game partner session to sample favorite message saving for 24 hours." → "Watch a quick game partner session to earn bonus AI usage quota after dismissing the s..."
- `offer.title`: "Try Saving for 24h" → "Get Bonus Messages"
- `offer.body`: "Not ready to sign up? Play a 15-second game with Luzia to try saving favorite messages..." → "Not ready to sign up? Play a quick game with Luzia for 5 bonus messages."
- `reward.what`: "24-hour access to favorite message saving" → "5 bonus chat messages"
- `reward.resource`: (none) → "r3"
- `reward.amount`: (none) → 5
- `reward.duration`: "24 hours" → (none)
- `cannibalizationGuard`: "Access is a time-boxed sample for guests who already declined signup; it does not gran..." → "Grants bonus AI usage quota (r3) rather than bypassing account-locked features like sa..."
- `assumptions.cogs`: "none" → "text-cheap"
- `assumptions.cogsUnitsPerView`: 0 → 5
- `precedents[2]`: "TAX-10" → "TAX-1"
- `risks[0]`: "Ad-supported access might delay signups if users find the temporary sample sufficient ..." → "Ad-supported bonus messages do not grant permanent account access or message saving fe..."
- `patch.newElements[0].change`: "Add 'Try for 24h' rewarded button after the user declines the signup wall." → "Add 'Get Bonus Messages' rewarded button after the user declines the signup wall."
- `patch.newEdges[0].effects[0].resource`: "TemporaryFavoriteAccess" → "r3"
- `patch.newEdges[0].effects[0].delta`: 1 → 5
- `storyboard[0].counters[0].resource`: "r2" → "r3"
- `storyboard[0].counters[0].value`: 0 → 10
- `storyboard[0].caption`: "Guest users are blocked by a mandatory signup wall when trying to save messages." → "Guest users encounter a signup wall when accessing features."
- `storyboard[1].counters[0].resource`: "r2" → "r3"
- `storyboard[1].counters[0].value`: 0 → 10
- `storyboard[1].callouts[0].text`: "Fallback 'Try for 24h' button" → "Bonus messages button"
- `storyboard[1].caption`: "Users who dismiss the signup wall see a fallback offer to sample the feature." → "Users who dismiss the wall see bonus message options."
- `storyboard[2].counters[0].resource`: "r2" → "r3"
- `storyboard[2].counters[0].value`: 0 → 10
- `storyboard[2].caption`: "The user opts in to a 15-second rewarded game to unlock temporary access." → "The user opts in to a rewarded mini-game."
- `storyboard[3].counters[0].resource`: "r2" → "r3"
- `storyboard[3].counters[0].value`: 0 → 10
- `storyboard[3].caption`: "The user engages in the rewarded mini-game with Luzia as the Game Partner." → "The user plays the rewarded mini-game with Luzia."
- `storyboard[4].counters[0].resource`: "r2" → "r3"
- ... and 5 more changes

#### Round 2 (v3): **REJECT** · weighted 3.65 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | cites observed economy items: r2, r3 |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Proposal targets screen s21 (Favorite messages), which is an SFW surface. |
| no-incentivized-action | llm | policy | pass | Proposal rewards 5 bonus chat messages via a 15-s game with Luzia; no clicks, installs, or cash-like items. |
| no-loss-framing | llm | policy | pass | Offer copy uses gain framing ('Play a quick game... for 5 bonus messages') with no dark patterns or confirmshaming. |
| explicit-opt-in | llm | fixable | pass | Uses SIM-RWD with an explicit CTA 'Play Now' and a button entry point. |
| disclosed | llm | fixable | pass | Offer title 'Get Bonus Messages' and body clearly state the reward and required action prior to viewing. |
| free-decline | llm | fixable | pass | Provides an equally legible decline button 'No Thanks' that returns the user without penalty. |
| no-stream-interrupt | llm | fixable | pass | Triggered after dismissing the signup wall on s21, not during an AI text stream. |
| not-for-subscribers | llm | fixable | pass | Guard restricts eligibility to guest users who do not have account access (r2 < 1). |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 3 | Proposal targets s21 (Favorite messages wall) and offers bonus messages (r3). While s21 is an account signup wall for saving messages rather than a direct quota cap, offering a refill fallback is a reasonable engagement moment. |
| product-integrity | 15 | 4 | Proposal preserves user flow, uses an in-world game partner ('Luzia'), and operates on an SFW surface without degrading core functionality. |
| cannibalization-safety | 15 | 4 | Gated to guest users (r2 < 1), grants temporary usage quota (r3) rather than permanent account access (r2), and is capped at 1 per day. |
| unit-economics | 10 | 2 | Economics code flags: Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end due to 5 text-cheap messages. |
| reach | 10 | 3 | Targeting users hitting the Favorite messages wall (m5, reach=frequent) captures a recurring friction point. |
| feasibility | 10 | 5 | Maps directly to SIM-RWD unit, button entry, and resource r3 with a clean patch adding ne1 to s21. |
| specificity | 10 | 4 | Uses app-specific screen s21 ('Favorite messages'), resource r3, and gamePartner 'Luzia'. |
| frequency-fatigue | 5 | 4 | Caps usage explicitly at perDay: 1 and cooldownMin: 60. |
| measurability | 5 | 5 | Defines primary conversion metric, guardrails, and a 5% user-level holdout for 30 days. |

- **Verdict reasons (code):** fixable gate failed: economics (code); unit-economics scored 2 (< 3); weighted 3.65 < 3.8; still REVISE after round 2
- **Required changes:**
  - Reduce the reward size from 5 messages to 2–3 messages (or switch to an ultra-cheap model) so that the cost to serve ($0.0090) does not exceed net revenue per view ($0.0063).
  - Ensure the reward more closely aligns with the wall's specific blocked feature on s21 (e.g., temporary message saving or preview slot) or frame the quota refill clearly.
- **Top concern:** The cost to serve 5 bonus messages ($0.0090) exceeds net revenue per view ($0.0063) at the low end, resulting in negative unit economics.


## P3: Deep Reasoning Session Pass — REJECT

> Allow guests to sample deep reasoning mode for 5 minutes by engaging with a rewarded mini-game.

- product-change · TAX-2 · surface Create Account Sheet (s07) · reward 5 minutes of deep reasoning mode · caps 2/day

#### Round 0 (v1): **REVISE** · weighted 3.3 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "Deep Reasoning Session Pass" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | **FAIL** | the patch adds 1 "plan" of Luzia+ Subscription on REWARD_VERIFIED |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The proposal targets deep reasoning mode on safe, SFW assistant surfaces. |
| no-incentivized-action | llm | policy | pass | Reward is earned via a 15-second mini-game play with no cash, gift cards, or click/install incentives. |
| no-loss-framing | llm | policy | pass | Uses gain-oriented session pass copy ('Unlock Deep Reasoning Now') with standard opt-in buttons and no dark patterns. |
| explicit-opt-in | llm | fixable | pass | Requires an explicit tap on the 'Play Now' CTA before any ad initiates. |
| disclosed | llm | fixable | pass | Clearly states the action ('Play a quick 15-second game') and reward ('30 minutes of deep reasoning') prior to the ad. |
| free-decline | llm | fixable | pass | Includes an equally legible 'No Thanks' decline option returning the user to the sheet without penalty. |
| no-stream-interrupt | llm | fixable | pass | Triggered when hitting the subscription wall on deep reasoning, not mid-stream during generation. |
| not-for-subscribers | llm | fixable | pass | Explicitly restricted to non-paying guests and free users hitting the paywall. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 2 | The proposal targets the exact moment of need when hitting the deep reasoning wall (m9), but the patch incorrectly models an entitlement plan (r1) as a numeric delta (delta: 1), capping the score at 2 per instruction rule 7. |
| product-integrity | 15 | 4 | Time-boxed session pass preserves user flow, provides native tasting of deep reasoning without permanent devaluing, and keeps the subscription upsell visible. |
| cannibalization-safety | 15 | 4 | Gated strictly to non-payers hitting the paywall, time-boxed to 30 minutes, capped at 2 per day, and preserves the Luzia+ subscription upsell. |
| unit-economics | 10 | 2 | Cost to serve ($0.0090) exceeds net revenue per view ($0.0063) at the low end as flagged by code. |
| reach | 10 | 3 | Hits users attempting to use deep reasoning mode (m9), representing a solid segment of engaged feature users. |
| feasibility | 10 | 4 | Uses standard Simula SIM-RWD unit with button entry point and SSV verification. |
| specificity | 10 | 3 | References Luzia, deep reasoning, s07, and s27, but loses specificity credit for improperly treating the subscription plan entitlement as a numeric currency delta. |
| frequency-fatigue | 5 | 5 | Explicit caps of 2 per day and 30-minute cooldowns, with no re-offer after decline. |
| measurability | 5 | 5 | Defines primary metric, guardrails (-3% subscription conversion, retention parity), and a 10% user-level randomized holdout over 28 days. |

- **Verdict reasons (code):** fixable gate failed: economics (code); fixable gate failed: reward-coherence (code); value-moment-fit scored 2 (< 3); unit-economics scored 2 (< 3); weighted 3.3 < 3.8
- **Required changes:**
  - Fix the patch resource grant to specify a proper time-boxed entitlement rather than granting numeric delta 1 of subscription plan r1.
  - Optimize COGS by routing session passes through a lighter model or adjusting duration/view requirements to ensure net positive margins per view.
- **Top concern:** The patch incorrectly treats a subscription plan entitlement as a countable currency quantity (delta: 1), and inference COGS exceeds net revenue per view at the low end.

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `title`: "Deep Reasoning Mode Session Pass" → "Deep Reasoning Session Pass"
- `oneLiner`: "Allow free users to unlock 30 minutes of deep reasoning mode by engaging with a reward..." → "Allow guests to sample deep reasoning mode for 15 minutes by engaging with a rewarded ..."
- `anchor.newMechanic.description`: "A time-boxed 30-minute entitlement to deep reasoning mode earned via rewarded ad view." → "An ephemeral, time-boxed 15-minute entitlement to deep reasoning mode earned via a rew..."
- `anchor.newMechanic.whyNeeded`: "Unlocks high-end AI capability for time-rich non-paying users without permanently deva..." → "Provides a high-value sample for non-paying users to experience premium capabilities, ..."
- `trigger`: "User taps Deep Reasoning on Attachment and Mode Sheet (s27), hitting the subscription ..." → "User taps 'Toggle deep reasoning mode' or 'Start a task' on the Attachment and Mode Sh..."
- `eligibility`: "Non-paying guests and free users hitting the deep reasoning paywall." → "Non-paying guest users hitting the Luzia+ subscription wall."
- `offer.title`: "Unlock Deep Reasoning Now" → "Unlock Deep Reasoning"
- `offer.body`: "Play a quick 15-second game to unlock 30 minutes of deep reasoning." → "Play a quick 15-second game to unlock 15 minutes of deep reasoning mode."
- `reward.what`: "30 minutes of deep reasoning mode" → "15 minutes of deep reasoning mode"
- `reward.resource`: "r1" → "ENT_DR_PASS"
- `reward.duration`: "30 minutes" → "15 minutes"
- `cannibalizationGuard`: "Gated strictly to non-payers, time-boxed to 30 minutes, capped at 2 per day, and keeps..." → "Gated strictly to non-paying guests; session is time-boxed to 15 minutes (short durati..."
- `assumptions.engagedShare`: 0.25 → 0.2
- `kpis.primary`: "Rewarded ARPDAU and ad monetization revenue lift" → "Rewarded ARPDAU"
- `kpis.guardrails[0]`: "Paid subscription conversion non-inferiority within -3%" → "Paid conversion non-inferiority within -3%"
- `kpis.guardrails[1]`: "D7 and D30 user retention parity" → "D30 retention parity"
- `kpis.guardrails[2]`: "Session length stability" → "Daily usage limits per user"
- `kpis.holdout`: "10% user-level randomized holdout over 28 days" → "10% user-level holdout over 28 days"
- `precedents[1]`: "EX-DUO" → "EX-MUSIC"
- `risks[0]`: "Potential perception that premium features can be bypassed too easily" → "Inference COGS for premium reasoning models must be strictly monitored per user."
- `risks[1]`: "Higher inference COGS for premium reasoning model during session passes" → "Risk of users habituating to the 15-minute window instead of converting."
- `evidence[0].obs`: "o0061" → "o0060"
- `evidence[0].quote`: "To enjoy Luzia+ you need to create an account first." → "Upgrade to Luzia+"
- `patch.newScreens[0].change`: "Session pass reward invitation sheet" → "Rewarded reward invitation sheet"
- `patch.newElements[0].change`: "Watch ad for 30m Deep Reasoning session" → "Button: Watch ad to unlock 15m deep reasoning"
- `patch.newEdges[0].effects[0].resource`: "r1" → "ENT_DR_PASS"
- `storyboard[0].caption`: "Deep reasoning mode requires a paid subscription today." → "Deep reasoning mode is exclusively for Luzia+ subscribers."
- `storyboard[1].callouts[0].text`: "New rewarded session pass option added" → "Added rewarded option"
- `storyboard[1].caption`: "We introduce a rewarded session pass option." → "A new option to unlock via rewarded ad appears on the wall."
- `storyboard[2].callouts[0].text`: "Play 15s game with Luzia" → "Play 15s to get 15m"
- ... and 10 more changes

#### Round 1 (v2): **REVISE** · weighted 4.45 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "Deep Reasoning Session Pass" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Proposal targets standard app utility features ('Start a task', 'Toggle deep reasoning mode'), ensuring SFW, age-appropriate content. |
| no-incentivized-action | llm | policy | pass | Reward is a time-boxed premium session entitlement, not a click, install, or cash reward. |
| no-loss-framing | llm | policy | pass | Proposal uses gain framing ('Unlock Deep Reasoning') and adheres to standard UX practices. |
| explicit-opt-in | llm | fixable | pass | Uses SIM-RWD `RewardInvitation`, ensuring the user must explicitly opt in via a clearly labeled control. |
| disclosed | llm | fixable | pass | Body copy states: 'Play a quick 15-second game to unlock 15 minutes of deep reasoning mode.' |
| free-decline | llm | fixable | pass | Includes a 'No Thanks' button and returns the user to the wall/Services tab without penalty. |
| no-stream-interrupt | llm | fixable | pass | Placement is at the subscription wall boundary, not mid-response or during generation. |
| not-for-subscribers | llm | fixable | pass | Targeted explicitly to non-paying guest users on the subscription wall. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | The reward directly satisfies the need identified by the subscription wall hit (need for 'Deep Reasoning'), making it a high-intent, moment-of-need match. |
| product-integrity | 15 | 5 | The pass is a natural sampling mechanism for a premium feature, appearing at a wall boundary without interrupting the organic flow. |
| cannibalization-safety | 15 | 4 | The session is time-boxed (15m), capped (2/day), and non-permanently granted, which mitigates long-term substitution while providing a trial for conversion. |
| unit-economics | 10 | 2 | The code indicates the reward COGS ($0.0090) exceeds the net revenue per view ($0.0063) at the low end. The reward size is too generous for the cost. |
| reach | 10 | 4 | Triggers are on high-frequency subscription walls (m9, m10) related to Luzia+ features, hitting a core segment of the user base. |
| feasibility | 10 | 5 | Uses the native SIM-RWD unit with an existing wall trigger, requiring minimal engineering lift. |
| specificity | 10 | 5 | References app-specific elements like 'Attachment and Mode Sheet', 'Deep reasoning mode', and 'Luzia+' throughout. |
| frequency-fatigue | 5 | 5 | Defines explicit caps (2 per day) and cooldowns (30 minutes), and provides a 'No Thanks' escape. |
| measurability | 5 | 5 | Specifies 'Rewarded ARPDAU' as a primary metric and includes a 10% user-level holdout as a guardrail. |

- **Verdict reasons (code):** fixable gate failed: economics (code); unit-economics scored 2 (< 3)
- **Required changes:**
  - Reduce the session pass duration from 15 minutes to 5-10 minutes to align the reward COGS with the projected net revenue per view.
  - Verify the implementation of server-side verification (SSV) to ensure rewards are granted only after successful completion of the mini-game.
- **Top concern:** The unit economics are unfavorable; the cost of providing 15 minutes of deep reasoning inference exceeds the anticipated revenue per view, which must be corrected by shortening the trial or tightening the economy.

#### Changes v2 → v3 (revise() saw the required changes, never the scores)

- `oneLiner`: "Allow guests to sample deep reasoning mode for 15 minutes by engaging with a rewarded ..." → "Allow guests to sample deep reasoning mode for 5 minutes by engaging with a rewarded m..."
- `anchor.newMechanic.description`: "An ephemeral, time-boxed 15-minute entitlement to deep reasoning mode earned via a rew..." → "An ephemeral, time-boxed 5-minute entitlement to deep reasoning mode earned via a rewa..."
- `anchor.newMechanic.whyNeeded`: "Provides a high-value sample for non-paying users to experience premium capabilities, ..." → "Provides a limited, high-value sample for non-paying users to experience premium capab..."
- `offer.body`: "Play a quick 15-second game to unlock 15 minutes of deep reasoning mode." → "Play a quick 15-second game to unlock 5 minutes of deep reasoning mode."
- `reward.what`: "15 minutes of deep reasoning mode" → "5 minutes of deep reasoning mode"
- `reward.duration`: "15 minutes" → "5 minutes"
- `cannibalizationGuard`: "Gated strictly to non-paying guests; session is time-boxed to 15 minutes (short durati..." → "Gated strictly to non-paying guests; session is time-boxed to 5 minutes (short duratio..."
- `risks[0]`: "Inference COGS for premium reasoning models must be strictly monitored per user." → "Inference COGS for premium reasoning models must be strictly monitored to maintain pro..."
- `risks[1]`: "Risk of users habituating to the 15-minute window instead of converting." → "Risk of users habituating to the 5-minute window instead of converting."
- `patch.newElements[0].change`: "Button: Watch ad to unlock 15m deep reasoning" → "Button: Watch ad to unlock 5m deep reasoning"
- `storyboard[2].callouts[0].text`: "Play 15s to get 15m" → "Play 15s to get 5m"
- `storyboard[4].callouts[0].text`: "15m pass unlocked" → "5m pass unlocked"
- `storyboard[4].caption`: "Deep reasoning is unlocked for the next 15 minutes." → "Deep reasoning is unlocked for the next 5 minutes."

#### Round 2 (v3): **REJECT** · weighted 3.85 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "Deep Reasoning Session Pass" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The proposal triggers on the 'Attachment and Mode Sheet' (s27) and 'Create Account Sheet' (s07), which are standard paywall surfaces in the app. |
| no-incentivized-action | llm | policy | pass | The reward is an ephemeral 5-minute session pass, which is a non-transferable, in-app benefit. |
| no-loss-framing | llm | policy | pass | The proposal uses standard offer-based framing without any negative reinforcement or dark patterns. |
| explicit-opt-in | llm | fixable | pass | The user must actively choose to play the mini-game via the 'Play Now' CTA. |
| disclosed | llm | fixable | pass | The offer card states: 'Play a quick 15-second game to unlock 5 minutes of deep reasoning mode'. |
| free-decline | llm | fixable | pass | The proposal includes an explicit 'No Thanks' option, and declining returns the user to the previous screen. |
| no-stream-interrupt | llm | fixable | pass | The trigger occurs on the paywall screen (s07/s27), which is a clear boundary, not during an active response. |
| not-for-subscribers | llm | fixable | pass | The proposal explicitly limits eligibility to 'non-paying guest users'. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | The reward (Deep Reasoning Session Pass) directly addresses the user's specific block when they attempt to use that feature. |
| product-integrity | 15 | 4 | The pass is a natural extension of the premium subscription and fits into the app flow without disrupting user input. |
| cannibalization-safety | 15 | 3 | It is gated to non-paying guests and time-boxed to 5 minutes, though deep reasoning is a core subscription value, creating some risk. |
| unit-economics | 10 | 1 | Per the provided code, cost-to-serve ($0.0090) exceeds the revenue-per-view at the low end ($0.0063). |
| reach | 10 | 4 | The wall (s07) is triggered frequently in the Luzia+ flow. |
| feasibility | 10 | 4 | Uses the standard SIM-RWD unit and maps cleanly to the existing paywall flow. |
| specificity | 10 | 5 | Correctly identifies 'Deep reasoning mode', 'Luzia+', and the 'Attachment and Mode Sheet' (s27). |
| frequency-fatigue | 5 | 4 | Includes daily caps (2/day) and cooldowns (30m), preventing over-exposure. |
| measurability | 5 | 4 | Proposes a holdout experiment and tracks ARPDAU. |

- **Verdict reasons (code):** fixable gate failed: economics (code); unit-economics scored 1 (< 3); still REVISE after round 2
- **Required changes:**
  - Address the unit economics failure by requiring 2 rewarded views to unlock the 5-minute session or reducing the session duration to 2 minutes, as the current cost-to-serve exceeds the net revenue.
  - Explicitly label the reward in the UI as a 'Deep Reasoning Sample' to differentiate it from the permanent 'Deep Reasoning Mode' included in the Luzia+ subscription.
- **Top concern:** The cost of the reward (inference for premium reasoning models) exceeds the generated net revenue per view, making the current offer unprofitable.


## P4: Daily Character Quest & Credits — SHIP

> Earn bonus chat credits daily by completing a quick interactive mini-game with Luzia.

- product-change · TAX-9 · surface Chats Home (s01) · reward 3 bonus chat credits · caps 3/day

#### Round 0 (v1): **REVISE** · weighted 4.5 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | storyboard offer: callout node "e10" is not on ns1 and not declared; storyboard ad: callout node "e10" is not on ns1 and not declared |
| label | code | fixable | pass | declares new mechanic "Daily Character Quest" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0180) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | A daily engagement task where users play a 15-second mini-game with Luzia to earn bonus chat credits. |
| no-incentivized-action | llm | policy | pass | Earn bonus chat credits daily by completing a quick interactive mini-game with Luzia. |
| no-loss-framing | llm | policy | pass | Play a quick 15-second mini-game with Luzia to earn 10 bonus chat credits. |
| explicit-opt-in | llm | fixable | pass | "cta": "Play Now" |
| disclosed | llm | fixable | pass | "body": "Play a quick 15-second mini-game with Luzia to earn 10 bonus chat credits." |
| free-decline | llm | fixable | pass | "decline": "No Thanks" |
| no-stream-interrupt | llm | fixable | pass | User taps the daily quest banner on the Chats Home hub upon returning to the app. |
| not-for-subscribers | llm | fixable | pass | Non-paying users who have completed their first session and have remaining daily quota capacity. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | Proposal implements archetype TAX-9 (Daily quests) offering 10 bonus chat credits via an opt-in mini-game on the Chats Home hub. |
| product-integrity | 15 | 5 | Implemented as a proactive daily quest banner on s01 with no removal of existing free features, using Luzia as a game partner. |
| cannibalization-safety | 15 | 5 | Gated to non-paying users with strict daily caps, rewarding soft usage quota rather than permanent subscription features or premium reasoning models. |
| unit-economics | 10 | 2 | Code computed cost to serve ($0.0180) exceeds net revenue per view ($0.0063) at the low end. |
| reach | 10 | 5 | Placed on s01 (Chats Home), which is the core-loop hub reached on every app open. |
| feasibility | 10 | 5 | Uses SIM-RWD with button entry, REWARD_VERIFIED, and clear patch definitions for screen ns1 and element ne1. |
| specificity | 10 | 5 | Explicitly references Luzia, s01 (Chats Home), and chat credits resource r3. |
| frequency-fatigue | 5 | 5 | Caps set to 3 per day with a 60-minute cooldown. |
| measurability | 5 | 5 | Includes a 10% user-level randomized holdout for 28 days, primary metric Rewarded ARPDAU and retention, and paid conversion guardrails. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); fixable gate failed: economics (code); unit-economics scored 2 (< 3)
- **Required changes:**
  - Reduce the reward size or switch to a cheaper model so that the cost to serve ($0.0180) does not exceed net revenue per view ($0.0063).
  - Fix storyboard callout node references (node "e10" is not declared on screen ns1).
- **Top concern:** The cost to serve the reward ($0.0180) exceeds net revenue per view ($0.0063) at the low end, resulting in negative net unit economics.

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `offer.body`: "Play a quick 15-second mini-game with Luzia to earn 10 bonus chat credits." → "Play a quick 15-second mini-game with Luzia to earn 3 bonus chat credits."
- `reward.what`: "10 bonus chat credits" → "3 bonus chat credits"
- `reward.amount`: 10 → 3
- `assumptions.cogsUnitsPerView`: 10 → 3
- `storyboard[2].callouts[0].node`: "e10" → "ne2"
- `storyboard[3].callouts[0].node`: "e10" → "ne3"
- `storyboard[4].counters[0].value`: 10 → 3
- `storyboard[4].callouts[0].text`: "+10 credits credited" → "+3 credits credited"
- `patch.newElements[1].id`: (none) → "ne2"
- `patch.newElements[1].in`: (none) → "ns1"
- `patch.newElements[1].place`: (none) → "overlay"
- `patch.newElements[1].change`: (none) → "Daily Quest invite card title and play action."
- `patch.newElements[2].id`: (none) → "ne3"
- `patch.newElements[2].in`: (none) → "ns1"
- `patch.newElements[2].place`: (none) → "overlay"
- `patch.newElements[2].change`: (none) → "Mini-game interactive view."

#### Round 1 (v2): **SHIP** · weighted 4.45 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "Daily Character Quest" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The proposal uses a daily retention task centered on character interaction on the SFW home hub, avoiding all sensitive topics. |
| no-incentivized-action | llm | policy | pass | The reward is 'bonus chat credits' (resource r3) which are in-app and non-transferable. There is no incentive for clicks or installs. |
| no-loss-framing | llm | policy | pass | The proposal uses gain framing ('earn bonus chat credits') and avoids hostage scenarios or loss framing. |
| explicit-opt-in | llm | fixable | pass | The user must tap the 'Play Now' CTA on the Daily Quest banner to start. |
| disclosed | llm | fixable | pass | The proposal clearly states: 'Play a quick 15-second mini-game with Luzia to earn 3 bonus chat credits.' |
| free-decline | llm | fixable | pass | The offer includes a 'No Thanks' button which dismisses the sheet with no penalty. |
| no-stream-interrupt | llm | fixable | pass | The offer appears as a banner on the Chats Home hub (s01), not mid-conversation. |
| not-for-subscribers | llm | fixable | pass | Eligibility is explicitly limited to 'Non-paying users'. |
| portfolio-distinct | code | fixable | pass | distinct from P1 (surface, reward, archetype family; offer copy overlap < 0.7) |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | The proposal targets a daily habit-building loop ('Daily Character Quest') on the home hub, which is a proactive, well-aligned retention trigger, though less urgent than a reactive refill. |
| product-integrity | 15 | 5 | The mini-game features the Luzia character as a partner, making the interaction feel native to the assistant persona and conversational flow. |
| cannibalization-safety | 15 | 4 | Gated to non-payers with a strict daily cap of 3 credits. This creates an additive retention incentive rather than giving away subscription-core benefits. |
| unit-economics | 10 | 3 | Cost to serve is $0.0054, with net revenue per view ranging from $0.009 to $0.015. At the lower bound, the cost is 60% of net revenue, which is at the upper threshold for acceptable margin. |
| reach | 10 | 5 | Placed on the Chats Home hub, the core entry point for the app, ensuring high visibility for all users. |
| feasibility | 10 | 5 | Maps clearly to the SIM-RWD unit, using existing hub real estate (s01). Engineering overhead is low. |
| specificity | 10 | 5 | Uses specific app nouns and resources (r3, Chats Home, Luzia character, s01), well-aligned with the Luzia product digest. |
| frequency-fatigue | 5 | 5 | Includes a strict daily cap of 3 completions and a 60-minute cooldown, preventing over-exposure. |
| measurability | 5 | 5 | Proposes primary metrics (ARPDAU, retention), guardrails (conversion), and a 10% randomized holdout. |

- **Verdict reasons (code):** weighted 4.45 >= 3.8, every criterion >= 3, all gates pass
- **Required changes:**
  - Monitor the cost-to-revenue ratio closely during the pilot; if COGS exceeds 60% of realized revenue, reduce reward to 2 credits per view.
  - Ensure the 'Daily Quest' banner does not push core chat functionality off the fold on small screens.
- **Top concern:** The COGS for a 3-credit reward sits at 60% of the lower-bound net revenue per view, placing it at the limit of the acceptable margin threshold.


## P5: Attachment Studio Extra Credit — REJECT

> Provide non-subscribers with bonus photo analysis credits via opt-in rewarded mini-game sessions.

- product-change · TAX-1 · surface Attachment and Mode Sheet (s27) · reward 1 bonus photo analysis credit · caps 3/day

#### Round 0 (v1): **REVISE** · weighted 4.4 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "Photo Analysis Credits" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0250) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The proposed surface is the Attachment and Mode Sheet (s27), which is a utility screen for photo processing, entirely SFW and age-appropriate. |
| no-incentivized-action | llm | policy | pass | The reward is in-app photo analysis credits, which are non-transferable and not cash-like. There is no incentive for clicks, installs, or ratings. |
| no-loss-framing | llm | policy | pass | The offer uses benefit-driven language ('Get Free Photo Credits') and includes a clear, neutral 'No Thanks' option, avoiding dark patterns. |
| explicit-opt-in | llm | fixable | pass | The offer is an opt-in invitation card with explicit 'Play Now' and 'No Thanks' buttons, as stated in the storyboard. |
| disclosed | llm | fixable | pass | The offer specifies the reward ('3 bonus photo analysis credits') and the required action ('Play a quick game with Luzia'). |
| free-decline | llm | fixable | pass | The offer includes a 'No Thanks' option, and declining allows the user to continue using the app at the pre-offer state. |
| no-stream-interrupt | llm | fixable | pass | The trigger occurs on the Attachment and Mode Sheet (s27), which is a pre-generation or utility state, not a streaming AI chat response. |
| not-for-subscribers | llm | fixable | pass | The proposal states it is 'Gated strictly to non-subscribers'. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | The trigger occurs exactly when a non-subscriber hits their quota limit while attempting an action, which is the high-intent moment of need. |
| product-integrity | 15 | 5 | The proposal fits natively into the existing Attachment and Mode Sheet flow, using the character Luzia as a Game Partner in-world. |
| cannibalization-safety | 15 | 5 | The design is gated strictly to non-subscribers, uses a temporary consumable resource (bonus credits), and implements a conservative daily cap of 3. |
| unit-economics | 10 | 1 | Code-computed economics reveal a cost to serve ($0.0250/view) that significantly exceeds the net revenue per view ($0.0063/view), making the current 3-credit grant unsustainable. |
| reach | 10 | 4 | Photo analysis and image generation are part of the core Luzia loop, providing frequent and broad reach for the offer. |
| feasibility | 10 | 5 | The proposal uses existing Simula units (SIM-RWD), existing screens, and clear resource definitions, minimizing technical overhead. |
| specificity | 10 | 4 | Uses app-specific nouns including Luzia, 'Attachment and Mode Sheet' (s27), and 'Photo Analysis Credits' (r3). |
| frequency-fatigue | 5 | 5 | Implements an explicit daily cap of 3 and a 15-minute cooldown, which prevents nagging and fatigue. |
| measurability | 5 | 5 | Defines primary metrics (Rewarded ARPDAU), guardrails (subscription conversion, retention), and a user-level holdout experiment. |

- **Verdict reasons (code):** fixable gate failed: economics (code); unit-economics scored 1 (< 3)
- **Required changes:**
  - Reduce the reward grant size from 3 credits to 1 credit per view, or implement a 2-view bundle requirement to align COGS with net revenue.
  - Perform an additional unit-economic review after adjusting the reward size to ensure the cost to serve remains within the 60% threshold of net revenue per view.
- **Top concern:** The unit economics are currently negative, as granting 3 photo credits per view costs significantly more ($0.0250) than the net revenue generated per view ($0.0063).

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `offer.title`: "Get Free Photo Credits" → "Get Free Photo Credit"
- `offer.body`: "Play a quick game with Luzia to earn 3 bonus photo analysis credits now." → "Play a quick game with Luzia to earn 1 bonus photo analysis credit now."
- `reward.what`: "3 bonus photo analysis credits" → "1 bonus photo analysis credit"
- `reward.amount`: 3 → 1
- `patch.newEdges[0].effects[0].delta`: 3 → 1
- `storyboard[1].callouts[0].text`: "App introduces rewarded ad prompt for photo analysis credits." → "App introduces rewarded ad prompt for photo analysis credit."
- `storyboard[1].caption`: "App introduces rewarded ad prompt for photo analysis credits." → "App introduces rewarded ad prompt for photo analysis credit."
- `storyboard[4].counters[0].value`: 3 → 1
- `storyboard[4].callouts[0].text`: "Reward verified and 3 photo analysis credits added instantly." → "Reward verified and 1 photo analysis credit added instantly."
- `storyboard[4].caption`: "Reward verified and 3 photo analysis credits added instantly." → "Reward verified and 1 photo analysis credit added instantly."

#### Round 1 (v2): **REVISE** · weighted 4.5 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "Photo Analysis Credits" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0250) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | "surface": "s27", "Attachment and Mode Sheet" |
| no-incentivized-action | llm | policy | pass | "offer": { "title": "Get Free Photo Credit", "body": "Play a quick game with Luzia to earn 1 bonus photo analysis credit now." } |
| no-loss-framing | llm | policy | pass | "decline": "No Thanks" |
| explicit-opt-in | llm | fixable | pass | "cta": "Play Now" |
| disclosed | llm | fixable | pass | "body": "Play a quick game with Luzia to earn 1 bonus photo analysis credit now." |
| free-decline | llm | fixable | pass | "decline": "No Thanks" |
| no-stream-interrupt | llm | fixable | pass | "trigger": "User taps photo attachment when daily photo analysis quota is exhausted" |
| not-for-subscribers | llm | fixable | pass | "eligibility": "Non-subscribers on Attachment and Mode Sheet" |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | Proposal triggers on user tapping photo attachment when quota is exhausted on screen s27 (Attachment and Mode Sheet), granting 1 photo analysis credit matching the exact moment of need. |
| product-integrity | 15 | 5 | Proposal uses SIM-RWD with Game Partner Luzia on s27, preserving flow and adding supplementary quota without removing existing free value. |
| cannibalization-safety | 15 | 5 | Gated strictly to non-subscribers, capped at 3 daily grants, kept separate from Luzia+ subscription core benefits, with a holdout planned. |
| unit-economics | 10 | 1 | Code economics note states: Cost to serve the reward ($0.0250) exceeds net revenue per view ($0.0063) at the low end due to image generation COGS. |
| reach | 10 | 4 | Triggered when photo attachment quota is hit on s27 (Attachment and Mode Sheet), engaging users in the image/attachment core loop. |
| feasibility | 10 | 5 | Maps directly to SIM-RWD, button entry point, and existing resource r3. |
| specificity | 10 | 5 | Uses app-specific screen s27 (Attachment and Mode Sheet), character Luzia, resource r3, and mechanic Photo Analysis Credits. |
| frequency-fatigue | 5 | 5 | Explicit daily cap (perDay: 3), cooldown (cooldownMin: 15), and clean decline path. |
| measurability | 5 | 5 | Named primary metric (Rewarded ARPDAU), guardrails (subscription conversion non-inferiority, D7 retention), and a 10% user-level holdout for 28 days. |

- **Verdict reasons (code):** fixable gate failed: economics (code); unit-economics scored 1 (< 3)
- **Required changes:**
  - Switch the reward from an image generation credit (COGS $0.0250) to text message credits or a lower-cost utility to ensure cost to serve remains well below net revenue per view ($0.0063).
- **Top concern:** Image generation COGS ($0.0250) exceeds net revenue per view ($0.0063), making the reward unprofitable at current unit economics.

