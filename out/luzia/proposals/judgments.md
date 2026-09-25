# Judgments: Luzia

Verdicts are computed in code: SHIP at weighted ≥ 3.8 with every criterion ≥ 3 and every gate passing; REVISE between 3 and 3.8, on any criterion ≤ 2, or on a fixable gate; REJECT below 3, on a policy gate, or still REVISE after round 2 (or when a revision stalls: < +0.2 and no gate fixed). Only SHIP goes to the slides.

Weights: value-moment-fit 20, product-integrity 15, cannibalization-safety 15, unit-economics 10, reach 10, feasibility 10, specificity 10, frequency-fatigue 5, measurability 5.

## Summary

| proposal | title | final | weighted | versions | summary |
|---|---|---|---|---|---|
| P1 | Try Deep reasoning for a game | **REJECT** | 4.25 | v1 → v2 | REJECT after 1 revision: revision stalled (weighted +0.05, below +0.2) with the same gate failures. Top concern: The cost to serve the reward ($0.0900) significantly exceeds net revenue per view ($0.0063), resulting in negative unit economics. |
| P2 | Try Upgrade to Luzia+ for a game | **SHIP** | 4.35 | v3 | SHIP at 4.35 (v3). |
| P3 | Daily tasks on Chats Home | **SHIP** | 4.8 | v2 → v3 → v4 | SHIP at 4.8 (v4 after 2 revisions). |
| P4 | Sponsored AI usage session | **REJECT** | 4.45 | v2 → v3 → v4 | REJECT after 2 revisions: unit-economics scored 2 (< 3); still REVISE after round 2. Top concern: The COGS for a 3-action reward ($0.0054) significantly exceeds the 30% target relative to the computed net revenue per view, risking the unit economics of the ad placement. |
| P5 | Guest sample of Upgrade to Luzia+ | **SHIP** | 4.7 | v1 | SHIP at 4.7 (v1). |

## P1: Try Deep reasoning for a game — REJECT

> Where Deep reasoning on Attachment and Mode Sheet needs Luzia+ Subscription, a 15-second game unlocks 1 hour of Deep reasoning.

- existing · TAX-2 · surface Attachment and Mode Sheet (s27) · reward 1 hour of Deep reasoning · caps 2/day

#### Round 0 (v1): **REVISE** · weighted 4.2 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | cites observed economy items: r1, w1 |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Proposal targets Settings (s19) and SFW interactions. |
| no-incentivized-action | llm | policy | pass | Reward is in-app time (30 minutes of Upgrade to Luzia+); no cash, gift cards, or install incentives. |
| no-loss-framing | llm | policy | pass | Copy uses positive framing ('Play to try') with a clear decline ('No thanks'). |
| explicit-opt-in | llm | fixable | pass | Offer uses an explicit 'Play to try' button. |
| disclosed | llm | fixable | pass | Offer states the exact action and reward: 'Play a 15-second game to unlock 30 minutes of Upgrade to Luzia+'. |
| free-decline | llm | fixable | pass | Decline option ('No thanks') leaves Settings fully usable without penalty. |
| no-stream-interrupt | llm | fixable | pass | Trigger sits in Settings (s19), away from any streaming AI response. |
| not-for-subscribers | llm | fixable | pass | Eligibility explicitly excludes subscribers ('never subscribers'). |
| portfolio-distinct | code | fixable | **FAIL** | near-duplicate of P2: differentiate the moment or the reward: same surface (s19), same reward (r1) and same archetype family (time-boxed unlock); offer copy overlap 0.82 (Jaccard >= 0.7) |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | Tying the ad directly to the 'Upgrade to Luzia+' upsell in Settings gives users who tapped the premium feature an immediate try via a game sample. |
| product-integrity | 15 | 4 | Appears in Settings rather than mid-chat, preserving the user's roleplay and input flow. |
| cannibalization-safety | 15 | 4 | Time-boxes the unlock to 30 minutes, caps it at 2 per day, restricts it to non-subscribers, and provides a holdout. |
| unit-economics | 10 | 5 | Cost to serve is $0.0000 (none), well below net revenue per view. |
| reach | 10 | 3 | Settings is a frequent hub (m12, m19), but tapping Upgrade to Luzia+ from settings is a narrower subset of DAU. |
| feasibility | 10 | 5 | Maps to SIM-RWD with button entry, REWARD_VERIFIED, and remote config. |
| specificity | 10 | 4 | Cites obs o0060 ('Upgrade to Luzia+'), screen s19, resource r1, and moments m23/m1. |
| frequency-fatigue | 5 | 5 | Caps at 2 per day with a 60-minute cooldown. |
| measurability | 5 | 5 | Defines primary metric, guardrails, and a 10% user-level holdout. |

- **Verdict reasons (code):** fixable gate failed: portfolio-distinct (code)
- **Required changes:**
  - near-duplicate of P2: differentiate the moment or the reward
- **Top concern:** near-duplicate of P2: differentiate the moment or the reward

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `title`: "Try Upgrade to Luzia+ for a game" → "Try Deep reasoning for a game"
- `oneLiner`: "Where Upgrade to Luzia+ needs Luzia+ Subscription, a 15-second game unlock 30 minutes ..." → "Where Deep reasoning on Attachment and Mode Sheet needs Luzia+ Subscription, a 15-seco..."
- `anchor.moments[0]`: "m23" → "m14"
- `anchor.moments[1]`: "m1" → "m9"
- `anchor.economy[1]`: "w1" → "w5"
- `surface`: "s19" → "s27"
- `trigger`: "A signed-in free user reaches for Upgrade to Luzia+ on Settings, where it needs Luzia+..." → "A user opens the Attachment and Mode Sheet and taps Deep reasoning, which requires Luz..."
- `eligibility`: "Signed-in non-subscribers from their second session on; guests keep seeing the account..." → "Signed-in non-subscribers from their second session on; never subscribers [TRIG-2] [CA..."
- `offer.title`: "Try Upgrade to Luzia+" → "Try Deep reasoning"
- `offer.body`: "Play a 15-second game to unlock 30 minutes of Upgrade to Luzia+." → "Play a 15-second game to unlock 1 hour of Deep reasoning."
- `simula.gamePartner`: "Explain quantum physics simply." → "Luzia"
- `reward.what`: "30 minutes of Upgrade to Luzia+" → "1 hour of Deep reasoning"
- `reward.duration`: "30 minutes" → "1 hour"
- `cannibalizationGuard`: "Luzia+ Subscription stays the only unlimited way to use Upgrade to Luzia+; a sample is..." → "Luzia+ Subscription stays the only permanent way to access Deep reasoning; a sample is..."
- `assumptions.cogs`: "none" → "text-premium"
- `assumptions.cogsUnitsPerView`: 0 → 10
- `risks[0]`: "Sampling a paid feature can substitute for buying it: keep it small and expiring." → "Sampling deep reasoning can substitute for buying Luzia+: keep it time-boxed to 1 hour."
- `evidence[0].obs`: "o0060" → "o0183"
- `evidence[0].quote`: "Upgrade to Luzia+" → "Deep reasoning"
- `evidence[1].obs`: "o0061" → (none)
- `evidence[1].quote`: "To enjoy Luzia+ you need to create an account first." → (none)
- `patch.newElements[0].in`: "s19" → "s27"
- `patch.newElements[0].near`: "e10" → "e15"
- `patch.newElements[0].change`: "Chip \"Try Upgrade to Luzia+: play 15 s\"" → "Chip Try Deep reasoning: play 15 s"
- `patch.newEdges[0].from`: "s19" → "s27"
- `storyboard[0].screen`: "s19" → "s27"
- `storyboard[0].callouts[0].node`: "e10" → "e15"
- `storyboard[0].callouts[0].text`: "Upgrade to Luzia+: Luzia+ Subscription only" → "Deep reasoning requires Luzia+ Subscription"
- `storyboard[0].caption`: "Upgrade to Luzia+ needs Luzia+ Subscription today." → "Deep reasoning requires Luzia+ Subscription today."
- `storyboard[1].screen`: "s19" → "s27"
- ... and 10 more changes

#### Round 1 (v2): **REVISE** · weighted 4.25 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | cites observed economy items: r1, w5 |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0900) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Proposal targets Attachment and Mode Sheet (s27) for Deep reasoning, which is SFW and age-appropriate. |
| no-incentivized-action | llm | policy | pass | Rewards 1 hour of Deep reasoning as a time-boxed entitlement; no rewards for clicks, installs, or cash-like items. |
| no-loss-framing | llm | policy | pass | Uses positive gain framing with a clear No thanks decline button and no dark patterns or confirmshaming. |
| explicit-opt-in | llm | fixable | pass | User explicitly opts in by tapping the primary CTA Play to try. |
| disclosed | llm | fixable | pass | The exact reward (1 hour of Deep reasoning) and required action (15-second game) are stated before the ad. |
| free-decline | llm | fixable | pass | Declining via No thanks leaves the app fully usable at the pre-offer state with no penalty. |
| no-stream-interrupt | llm | fixable | pass | Trigger specifies the offer appears after the current response finishes, avoiding stream interruption. |
| not-for-subscribers | llm | fixable | pass | Explicitly restricts eligibility to signed-in non-subscribers and excludes subscribers. |
| portfolio-distinct | code | fixable | pass | distinct from P3, P5, P2 (surface, reward, archetype family; offer copy overlap < 0.7) |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | P1 targets s27 where users hit the paywall for Deep reasoning (r1), offering a time-boxed sample of Deep reasoning right at the moment of need. |
| product-integrity | 15 | 5 | Places a chip on Attachment and Mode Sheet (s27), preserves input, respects stream finish, and uses Luzia as the Game Partner. |
| cannibalization-safety | 15 | 4 | Time-boxed to 1 hour, capped at 2 per day, restricted to non-subscribers, with a paid contrast line and holdout planned. |
| unit-economics | 10 | 1 | Code flags that cost to serve the reward ($0.0900) exceeds net revenue per view ($0.0063) at the low end due to text-premium COGS. |
| reach | 10 | 3 | Deep reasoning on s27 is an occasional feature for users exploring advanced modes rather than a frequent daily core loop. |
| feasibility | 10 | 5 | Maps directly to SIM-RWD unit, button entry, existing screen s27, and SSV with a small engineering patch. |
| specificity | 10 | 5 | Uses actual nouns and IDs from the digest: s27 (Attachment and Mode Sheet), r1 (Luzia+ Subscription), w5, and Game Partner Luzia. |
| frequency-fatigue | 5 | 5 | Capped at 2 per day with a 60-minute cooldown, and decliners are not re-prompted. |
| measurability | 5 | 5 | Defines a primary metric, guardrails (-3% non-inferiority margin), and a 10% user-level holdout. |

- **Verdict reasons (code):** fixable gate failed: economics (code); unit-economics scored 1 (< 3)
- **Required changes:**
  - Reduce reward COGS by switching the reward model tier from text-premium to a cheaper base model or reducing message count so COGS is below 30% of net revenue per view.
  - Verify regional eCPM assumptions and adjust reward sizing or daily caps to ensure positive net margin per view.
- **Top concern:** The cost to serve the reward ($0.0900) significantly exceeds net revenue per view ($0.0063), resulting in negative unit economics.


## P2: Try Upgrade to Luzia+ for a game — SHIP

> Where Upgrade to Luzia+ needs Luzia+ Subscription, a 15-second game unlock 5 minutes of Upgrade to Luzia+.

- existing · TAX-2 · surface Settings (s19) · reward 5 minutes of Upgrade to Luzia+ · caps 2/day

#### Round 0 (v3): **SHIP** · weighted 4.35 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | cites observed economy items: r1, w1 |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The proposal uses SFW surfaces (Settings s19) and a standard game partner. |
| no-incentivized-action | llm | policy | pass | Reward is in-app time-boxed feature access, with no cash or click incentives. |
| no-loss-framing | llm | policy | pass | The offer uses gain framing ('Play to try') with a clear 'No thanks' decline button. |
| explicit-opt-in | llm | fixable | pass | The user taps 'Play to try' explicitly. |
| disclosed | llm | fixable | pass | Body specifies: 'Play a 15-second game to unlock 5 minutes of Upgrade to Luzia+'. |
| free-decline | llm | fixable | pass | Decline option 'No thanks' returns the user to the Settings screen with no penalty. |
| no-stream-interrupt | llm | fixable | pass | Triggered from Settings (s19) when reaching for the feature, not during a stream. |
| not-for-subscribers | llm | fixable | pass | Eligibility explicitly excludes subscribers ('never subscribers'). |
| portfolio-distinct | code | fixable | pass | distinct from P3, P5 (surface, reward, archetype family; offer copy overlap < 0.7) |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | Triggering right when a user taps Upgrade to Luzia+ on Settings provides a direct sampling moment for the blocked feature. |
| product-integrity | 15 | 4 | Integrity is well-maintained via an expiring time box (5 minutes) and clean placement on Settings. |
| cannibalization-safety | 15 | 5 | Protected by strict time-boxing (5 minutes), a daily cap (2), non-payer restriction, and holdout plans. |
| unit-economics | 10 | 5 | Cost to serve is zero (entitlement time box with no marginal inference cost stated), well within revenue per view. |
| reach | 10 | 3 | Settings is a frequent hub (m12), but users hitting the specific upgrade wall here represents a more modest share of daily active usage. |
| feasibility | 10 | 5 | Maps cleanly to SIM-RWD via a button entry on Settings, leveraging standard REWARD_VERIFIED and remote config. |
| specificity | 10 | 4 | Cites actual screen s19, economy resource r1, and moments m23/m1 from the Luzia digest. |
| frequency-fatigue | 5 | 5 | Capped at 2 per day with a 60-minute cooldown. |
| measurability | 5 | 5 | Includes a primary conversion metric, guardrails (-3% relative check), and a 10% user-level holdout. |

- **Verdict reasons (code):** weighted 4.35 >= 3.8, every criterion >= 3, all gates pass
- **Top concern:** Treating an entitlement/plan name ('Upgrade to Luzia+') as a grant noun requires careful client-side enforcement to ensure the 5-minute time box correctly toggles the specific features without granting permanent account status.


## P3: Daily tasks on Chats Home — SHIP

> A "Daily tasks" sheet on Chats Home: 3 sponsored 15-second games a day with Luzia, each rewarding 1 extra AI message.

- product-change · TAX-9 · surface ns1 · reward 1 extra AI message · caps 3/day

#### Round 0 (v2): **REVISE** · weighted 3.7 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "Daily tasks" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | **FAIL** | the reward is "Adjust response style", which only an account unlocks: an ad cannot stand in for signing up |
| sfw | llm | policy | pass | Daily tasks and mini-games with AI personas like Elias are SFW and age-appropriate. |
| no-incentivized-action | llm | policy | pass | The proposal offers an in-app reward (Account Access/usage) and explicitly forbids incentivized clicks or installs. |
| no-loss-framing | llm | policy | pass | The proposal uses a proactive task sheet; no hostage framing or dark patterns are identified. |
| explicit-opt-in | llm | fixable | pass | The user must open the sheet and tap "Play task" to trigger the game. |
| disclosed | llm | fixable | pass | The proposal states: "Play a 15-second sponsored game to get 15 minutes of Account Access". |
| free-decline | llm | fixable | pass | The proposal includes a "Close" button on the sheet. |
| no-stream-interrupt | llm | fixable | pass | The tasks are triggered from a proactive sheet on the Chats Home, not during a conversation. |
| not-for-subscribers | llm | fixable | pass | The eligibility rules explicitly exclude subscribers. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 3 | The user is offered a way to unlock a desired feature (Account Access), but this feature is gated by account creation, creating a path mismatch. |
| product-integrity | 15 | 2 | The proposal attempts to grant account-only features via ads, which undermines the signup wall and the value of account creation. |
| cannibalization-safety | 15 | 2 | Granting account-level entitlements (Account Access) replaces the primary conversion funnel (Sign up free). |
| unit-economics | 10 | 5 | Cost to serve ($0.0027) is well below the net revenue (estimated ~$0.0075+ after haircut). |
| reach | 10 | 5 | The surface is a tab on Chats Home (core loop). |
| feasibility | 10 | 5 | Maps to SIM-RWD and existing screens. |
| specificity | 10 | 5 | Uses app-specific nouns like 'Chats Home', 'Account Access', and specific personas like 'Explain quantum physics simply.'. |
| frequency-fatigue | 5 | 5 | Capped at 3 tasks per day. |
| measurability | 5 | 5 | Includes a 10% user-level holdout and clear metrics. |

- **Verdict reasons (code):** fixable gate failed: not-for-account-wall (code); product-integrity scored 2 (< 3); cannibalization-safety scored 2 (< 3); weighted 3.7 < 3.8
- **Required changes:**
  - Do not offer 'Account Access' or any entitlement that requires an account (Adjust AI response style, Save favorite messages) as a reward. Account-only features are never rewards.
  - Change the reward to a feature usage that does not gate identity or account creation. For example, offer '1 image generation credit' or '1 deep reasoning mode usage' if those can be decoupled from the full account entitlement, or offer cosmetic rewards.
  - Ensure the reward does not replace the 'Sign up free' value proposition.
- **Top concern:** The proposal offers account-locked entitlements ('Account Access') as an ad reward, which directly cannibalizes the signup funnel and violates the policy against using ads to bypass account-gated features.

#### Changes v2 → v3 (revise() saw the required changes, never the scores)

- `oneLiner`: "A \"Daily tasks\" sheet on Chats Home: 3 sponsored 15-second games a day with Explain ..." → "A \"Daily tasks\" sheet on Chats Home: 3 sponsored 15-second games a day with Luzia, e..."
- `anchor.newMechanic.description`: "A Chats Home sheet listing 3 sponsored mini-game tasks per day, each paying 15 minutes..." → "A Chats Home sheet listing 3 sponsored mini-game tasks per day, each paying 1 image ge..."
- `offer.body`: "Play a 15-second sponsored game to get 15 minutes of Account Access (Adjust AI respons..." → "Play a 15-second sponsored game to get 1 image generation credit. 3 tasks a day."
- `simula.gamePartner`: "Explain quantum physics simply." → "Luzia"
- `reward.what`: "15 minutes of Account Access (Adjust AI response style)" → "1 image generation credit"
- `reward.duration`: "15 minutes" → (none)
- `cannibalizationGuard`: "At most 3 tasks a day; the free daily sources are unchanged. Non-payers only; capped p..." → "At most 3 tasks a day; the free daily sources are unchanged. Non-payers only; capped p..."
- `assumptions.cogs`: "text-cheap" → "image"
- `assumptions.cogsUnitsPerView`: 1.5 → 1
- `patch.newScreens[0].change`: "\"Daily tasks\" sheet: 3 rows \"Play a 15-second game: 15 minutes of Account Access (A..." → "\"Daily tasks\" sheet: 3 rows \"Play a 15-second game: 1 image generation credit\", pr..."
- `patch.newElements[1].change`: "Task row \"Play with Explain quantum physics simply.: 15 minutes of Account Access (Ad..." → "Task row \"Play with Luzia: 1 image generation credit\" with a Play button"
- `storyboard[4].caption`: "Task done: 15 minutes of Account Access (Adjust AI response style)." → "Task done: 1 image generation credit."
- `reward.resource`: (none) → "r3"
- `reward.amount`: (none) → 1
- `patch.newEdges[1].effects[0].resource`: (none) → "r3"
- `patch.newEdges[1].effects[0].delta`: (none) → 1
- `storyboard[4].counters[0].resource`: (none) → "r3"
- `storyboard[4].counters[0].value`: (none) → 1

#### Round 1 (v3): **REVISE** · weighted 4.4 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "Daily tasks" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0250) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Proposal uses Chats Home (s01) and game partner Luzia, keeping interactions SFW and age-appropriate. |
| no-incentivized-action | llm | policy | pass | Proposal rewards completing a 15-second sponsored game, explicitly avoiding rewards for clicks, installs, or cash-like items. |
| no-loss-framing | llm | policy | pass | Proposal uses gain framing ('Play a 15-second sponsored game to get 1 image generation credit') without dark patterns or hostage framing. |
| explicit-opt-in | llm | fixable | pass | User explicitly opts in by tapping the task sheet and selecting 'Play task'. |
| disclosed | llm | fixable | pass | The reward (1 image generation credit) and required action (15-second sponsored game) are clearly stated before the ad starts. |
| free-decline | llm | fixable | pass | Declining is free via a clear 'Close' button that returns the user to Chats Home with no penalty. |
| no-stream-interrupt | llm | fixable | pass | The offer is triggered via a badge on Chats Home (s01), never interrupting a streaming AI response. |
| not-for-subscribers | llm | fixable | pass | Eligibility explicitly restricts the offer to non-payers only and never shows it to subscribers. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | Proposal offers image generation credits via a daily task hub (TAX-9) on Chats Home, well-aligned with proactive engagement. |
| product-integrity | 15 | 5 | Native badge and sheet integration on Chats Home with Luzia as game partner, preserving flow and input. |
| cannibalization-safety | 15 | 5 | Restricted to non-payers, capped at 3 per day, and protected by a holdout and remote-config kill switch. |
| unit-economics | 10 | 1 | Cost to serve the image generation credit ($0.0250) exceeds net revenue per view ($0.0063 at the low end), failing unit economics. |
| reach | 10 | 5 | Triggered via a badge on Chats Home (s01), the core loop hub visited frequently by users. |
| feasibility | 10 | 5 | Maps cleanly to Simula SIM-RWD unit, invitation entry, Luzia game partner, and REWARD_VERIFIED grant. |
| specificity | 10 | 5 | Uses Luzia app nouns from digest (Chats Home s01, image generation credit r3, Luzia). |
| frequency-fatigue | 5 | 5 | Capped at 3 per day with a 5-minute cooldown and clean decline option. |
| measurability | 5 | 5 | Defines primary tasks-per-DAU metric, subscription non-inferiority guardrails, and a 10% user-level holdout. |

- **Verdict reasons (code):** fixable gate failed: economics (code); unit-economics scored 1 (< 3)
- **Required changes:**
  - Switch the reward to a zero-COGS or lower-cost item (such as priority queue, cosmetics, or cheaper model messages) or increase required views per reward, to resolve the unit economics deficit where COGS ($0.0250) exceeds net revenue per view.
- **Top concern:** Cost to serve the image generation credit ($0.0250) exceeds net revenue per view ($0.0063 at the low end).

#### Changes v3 → v4 (revise() saw the required changes, never the scores)

- `oneLiner`: "A \"Daily tasks\" sheet on Chats Home: 3 sponsored 15-second games a day with Luzia, e..." → "A \"Daily tasks\" sheet on Chats Home: 3 sponsored 15-second games a day with Luzia, e..."
- `anchor.newMechanic.description`: "A Chats Home sheet listing 3 sponsored mini-game tasks per day, each paying 1 image ge..." → "A Chats Home sheet listing 3 sponsored mini-game tasks per day, each paying 1 extra AI..."
- `offer.body`: "Play a 15-second sponsored game to get 1 image generation credit. 3 tasks a day." → "Play a 15-second sponsored game to get 1 extra AI message. 3 tasks a day."
- `reward.what`: "1 image generation credit" → "1 extra AI message"
- `cannibalizationGuard`: "At most 3 tasks a day; the free daily sources are unchanged. Non-payers only; capped p..." → "At most 3 tasks a day; the free daily sources are unchanged. Non-payers only; capped p..."
- `assumptions.cogs`: "image" → "text-cheap"
- `patch.newScreens[0].change`: "\"Daily tasks\" sheet: 3 rows \"Play a 15-second game: 1 image generation credit\", pr..." → "\"Daily tasks\" sheet: 3 rows \"Play a 15-second game: 1 extra AI message\", progress ..."
- `patch.newElements[1].change`: "Task row \"Play with Luzia: 1 image generation credit\" with a Play button" → "Task row \"Play with Luzia: 1 extra AI message\" with a Play button"
- `storyboard[4].caption`: "Task done: 1 image generation credit." → "Task done: 1 extra AI message granted."

#### Round 2 (v4): **SHIP** · weighted 4.8 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "Daily tasks" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The proposal targets 'Chats Home' (s01), which is the main chat interface and is SFW. |
| no-incentivized-action | llm | policy | pass | The reward is for watching a 15-second game, not for clicks, installs, or ratings, and is in-app usage quota (r3). |
| no-loss-framing | llm | policy | pass | The offer is an opt-in 'Daily tasks' incentive without any hostage, loss, or 'support us' language. |
| explicit-opt-in | llm | fixable | pass | The proposal uses a dedicated sheet (ns1) with an explicit 'Play task' CTA. |
| disclosed | llm | fixable | pass | The body copy explicitly states 'Play a 15-second sponsored game to get 1 extra AI message.' |
| free-decline | llm | fixable | pass | The proposal offers a 'Close' button to exit without penalty. |
| no-stream-interrupt | llm | fixable | pass | The offer is placed as a badge on the Chats Home screen (s01), not within an ongoing chat. |
| not-for-subscribers | llm | fixable | pass | The eligibility criteria explicitly states 'never shown to subscribers.' |
| portfolio-distinct | code | fixable | pass | the first SHIP of the portfolio |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | The trigger is a proactive hub (Chats Home), which provides lower intent than a reactive refill, though it builds a healthy habit. |
| product-integrity | 15 | 5 | The integration is native to Luzia, using the Game Partner mechanic; it is additive and preserves the conversation flow. |
| cannibalization-safety | 15 | 5 | Non-payer gating, daily caps, and clear exclusion of subscribers make this highly safe. |
| unit-economics | 10 | 5 | COGS ($0.0018) is roughly 20% of net revenue ($0.009), providing a healthy margin. |
| reach | 10 | 5 | Chats Home is the core hub (13 visits during exploration) ensuring high visibility. |
| feasibility | 10 | 5 | Uses standard SIM-RWD component, simple badge element, and remote config. |
| specificity | 10 | 5 | Uses Luzia persona, Chats Home (s01), and the specific AI Usage Quota resource (r3). |
| frequency-fatigue | 5 | 5 | Strict daily cap of 3 tasks prevents nagging. |
| measurability | 5 | 5 | Explicitly names primary metrics, guardrails, and a user-level holdout as per MEAS-5. |

- **Verdict reasons (code):** weighted 4.8 >= 3.8, every criterion >= 3, all gates pass
- **Top concern:** None.


## P4: Sponsored AI usage session — REJECT

> A sponsor pays for a daily AI Usage Quota refill: one 15-second game, once a day, offered on Chats Home.

- product-change · TAX-11 · surface Chats Home (s01) · reward +3 bonus AI Usage Quota actions · caps 1/day

#### Round 0 (v2): **REVISE** · weighted 3.05 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "Sponsored Account Access session" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | **FAIL** | the reward is "Adjust response style", which only an account unlocks: an ad cannot stand in for signing up |
| sfw | llm | policy | pass | SFW surface on Chats Home with an educational game partner. |
| no-incentivized-action | llm | policy | pass | Rewards a 15-second game play, no clicks, installs, cash or gift cards. |
| no-loss-framing | llm | policy | pass | Gain framing for 30 minutes of time-boxed access with a clear decline option. |
| explicit-opt-in | llm | fixable | pass | Play to unlock CTA, opt-in per instance. |
| disclosed | llm | fixable | pass | Play a 15-second sponsored game to get 30 minutes of Account Access (Adjust AI response style). |
| free-decline | llm | fixable | pass | Decline option Not today leaves the app fully usable. |
| no-stream-interrupt | llm | fixable | pass | Offered at the start of the first session of the day on Chats Home, never mid-reply. |
| not-for-subscribers | llm | fixable | pass | Non-payers only, suppressed for subscribers and recent purchasers. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 2 | Account Access is an account-level entitlement rather than a consumable, and offering it at session start rather than at the feature wall mismatches user intent. Score: 2. |
| product-integrity | 15 | 2 | An ad cannot stand in for creating an account; account-only features require an account first per rule 8. Score: 2. |
| cannibalization-safety | 15 | 4 | Time-boxed to 30 minutes, restricted to non-payers, with holdout planned. Score: 4. |
| unit-economics | 10 | 4 | COGS $0.0054 is below net revenue per view ($0.0090-$0.0150). Score: 4. |
| reach | 10 | 3 | Offered on Chats Home which is frequently visited. Score: 3. |
| feasibility | 10 | 4 | Maps to SIM-RWD on s01 with an added chip. Score: 4. |
| specificity | 10 | 2 | References s01 and Account Access, but violates entitlement/account rules. Score: 2. |
| frequency-fatigue | 5 | 4 | Capped at 1 per day. Score: 4. |
| measurability | 5 | 5 | Named primary metric, guardrails, and 10% user-level holdout. Score: 5. |

- **Verdict reasons (code):** fixable gate failed: not-for-account-wall (code); value-moment-fit scored 2 (< 3); product-integrity scored 2 (< 3); specificity scored 2 (< 3); weighted 3.05 < 3.8
- **Required changes:**
  - Move the reward away from account-bound features like Account Access to consumable resources or post-decline sampling.
  - Ensure account creation remains the required first path for account-only features.
- **Top concern:** Account-only features (such as Account Access and Adjust AI response style) require a user account and cannot be bypassed or rewarded directly via ads.

#### Changes v2 → v3 (revise() saw the required changes, never the scores)

- `title`: "Sponsored Account Access session" → "Sponsored AI usage session"
- `oneLiner`: "A sponsor pays for 30 minutes of Account Access (Adjust AI response style): one 15-sec..." → "A sponsor pays for a daily AI Usage Quota refill: one 15-second game, once a day, offe..."
- `anchor.newMechanic.name`: "Sponsored Account Access session" → "Sponsored AI usage session"
- `anchor.newMechanic.description`: "A daily, sponsor-attributed time box: 30 minutes of Account Access (Adjust AI response..." → "A daily, sponsor-attributed refill of AI Usage Quota actions for messaging and generat..."
- `anchor.newMechanic.whyNeeded`: "Account Access can only be felt by subscribing; a sponsored time box samples it [CANN-..." → "Users hit AI usage limits; a sponsored session refills actionable quota without bypass..."
- `trigger`: "At the start of the first session of the day on Chats Home, as a dismissible chip; nev..." → "At the start of a session on Chats Home when quota is low; never mid-reply."
- `eligibility`: "Non-payers only (no purchase in the last 30 days), returning users from their second s..." → "Non-payers only, returning users from their second session on; suppressed for 24 h aft..."
- `offer.title`: "Sponsored Account Access session" → "Sponsored AI usage session"
- `offer.body`: "Play a 15-second sponsored game to get 30 minutes of Account Access (Adjust AI respons..." → "Play a 15-second sponsored game to get +10 bonus AI Usage Quota actions."
- `simula.gamePartner`: "Explain quantum physics simply." → "Luzia"
- `reward.what`: "30 minutes of Account Access (Adjust AI response style)" → "+10 bonus AI Usage Quota actions"
- `reward.duration`: "30 minutes" → (none)
- `cannibalizationGuard`: "Once a day, 30 minutes, visibly expiring; the paid plan remains the only unlimited opt..." → "Once a day, capped quota refill; the Luzia+ subscription remains the permanent unlimit..."
- `assumptions.cogsUnitsPerView`: 3 → 10
- `kpis.primary`: "Sessions started with the sponsored time box, and later paid plan usage against the ho..." → "Sessions started with the sponsored AI usage session, and paid plan conversion against..."
- `precedents[1]`: "TAX-2" → "TAX-1"
- `precedents[2]`: "EX-MUSIC" → "EX-DUO"
- `risks[0]`: "Sampling Account Access's core benefit can substitute for subscribing: keep it short." → "Providing quota refill must not cannibalize subscription value; cap daily grants stric..."
- `patch.newElements[0].change`: "Dismissible chip \"Sponsored: 30 minutes of Account Access (Adjust AI response style) ..." → "Dismissible chip \"Sponsored: +10 AI Usage Quota actions — play 15 s\""
- `storyboard[0].callouts[0].text`: "Account Access is subscription-only" → "AI Usage Quota is limited"
- `storyboard[1].callouts[0].text`: "NEW: sponsored session chip" → "NEW: sponsored quota chip"
- `storyboard[1].caption`: "A sponsor offers 30 minutes of Account Access (Adjust AI response style)." → "A sponsor offers +10 AI Usage Quota actions."
- `storyboard[2].callouts[0].text`: "Opt-in; duration disclosed" → "Opt-in; reward disclosed"
- `storyboard[2].caption`: "\"Play to unlock\" or \"Not today\"." → "Opt-in to play or decline."
- `storyboard[3].caption`: "A 15-second sponsored game; unlock on REWARD_VERIFIED." → "Playing the 15-second sponsored game."
- `storyboard[4].callouts[0].text`: "30:00 left" → "+10 actions added"
- `storyboard[4].caption`: "30 minutes of Account Access (Adjust AI response style), with a visible countdown." → "+10 actions credited to AI Usage Quota."
- `reward.resource`: (none) → "r3"
- `reward.amount`: (none) → 10
- `patch.newEdges[0].effects[0].resource`: (none) → "r3"
- ... and 11 more changes

#### Round 1 (v3): **REVISE** · weighted 3.9 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "Sponsored AI usage session" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0180) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The proposal targets Chats Home (s01), which is a standard SFW chat interface. |
| no-incentivized-action | llm | policy | pass | Reward is +10 AI Usage Quota actions (r3), an in-app resource, with no incentives for clicks, installs, or cash. |
| no-loss-framing | llm | policy | pass | Uses gain framing ('Play a 15-second sponsored game to get +10 bonus...') with a clear decline option ('Not today'). |
| explicit-opt-in | llm | fixable | pass | User taps an explicit CTA ('Play to unlock') before the ad plays. |
| disclosed | llm | fixable | pass | The required action (15-second game) and reward (+10 bonus AI Usage Quota actions) are clearly stated. |
| free-decline | llm | fixable | pass | Declining via 'Not today' leaves the app fully usable at the pre-offer state with no penalty. |
| no-stream-interrupt | llm | fixable | pass | Triggered at the start of a session on Chats Home; explicitly specifies 'never mid-reply'. |
| not-for-subscribers | llm | fixable | pass | Explicitly eligibility-restricted to non-payers and never shown to subscribers. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | Proposal targets AI Usage Quota (r3) at the session start on Chats Home (s01) when quota is low. |
| product-integrity | 15 | 4 | Proposal uses a native dismissible chip on Chats Home (s01) with game partner Luzia, preserving flow. |
| cannibalization-safety | 15 | 4 | Restricted to non-payers, capped at 1 per day, keeping Luzia+ as the permanent unlimited option with a holdout. |
| unit-economics | 10 | 2 | Cost to serve the reward ($0.0180) exceeds net revenue per view ($0.0063 at the low end), making unit economics upside down. |
| reach | 10 | 5 | Chats Home (s01) is the core loop hub with high daily reach. |
| feasibility | 10 | 4 | Maps directly to SIM-RWD with standard patch elements (ne1 on s01). |
| specificity | 10 | 4 | Uses app-specific nouns like Chats Home (s01), AI Usage Quota (r3), and Game Partner Luzia. |
| frequency-fatigue | 5 | 4 | Strictly capped at 1 per day (perDay: 1). |
| measurability | 5 | 4 | Defines primary metrics, guardrails, and a 10% user-level holdout. |

- **Verdict reasons (code):** fixable gate failed: economics (code); unit-economics scored 2 (< 3)
- **Required changes:**
  - Reduce the reward size from +10 to +3 or +4 actions (or use a cheaper model tier) so that the cost to serve ($0.0180) is well below net revenue per view ($0.0063-$0.0150).
  - Ensure that on Chats Home (s01), the offer is strictly suppressed during the absolute first session launch (m22) to respect first-value guardrails.
- **Top concern:** Unit economics are upside down because the cost to serve 10 text actions ($0.0180) exceeds the net revenue per completed view ($0.0063 at the low end).

#### Changes v3 → v4 (revise() saw the required changes, never the scores)

- `trigger`: "At the start of a session on Chats Home when quota is low; never mid-reply." → "At the start of a session on Chats Home; offer shown only to returning users, never du..."
- `eligibility`: "Non-payers only, returning users from their second session on; suppressed for 24 h aft..." → "Non-payers only, returning users from their second session on; suppressed for 24 hours..."
- `offer.body`: "Play a 15-second sponsored game to get +10 bonus AI Usage Quota actions." → "Play a 15-second sponsored game to get +3 bonus AI Usage Quota actions."
- `reward.what`: "+10 bonus AI Usage Quota actions" → "+3 bonus AI Usage Quota actions"
- `reward.amount`: 10 → 3
- `assumptions.cogsUnitsPerView`: 10 → 3
- `patch.newElements[0].change`: "Dismissible chip \"Sponsored: +10 AI Usage Quota actions — play 15 s\"" → "Dismissible chip \"Sponsored: +3 AI Usage Quota actions — play 15 s\""
- `patch.newEdges[0].effects[0].delta`: 10 → 3
- `storyboard[1].caption`: "A sponsor offers +10 AI Usage Quota actions." → "A sponsor offers +3 AI Usage Quota actions."
- `storyboard[4].counters[0].value`: 10 → 3
- `storyboard[4].callouts[0].text`: "+10 actions added" → "+3 actions added"
- `storyboard[4].caption`: "+10 actions credited to AI Usage Quota." → "+3 actions credited to AI Usage Quota."

#### Round 2 (v4): **REJECT** · weighted 4.45 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "Sponsored AI usage session" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Chats Home is a general chat interface, and the proposal limits offers to non-paying users in SFW contexts. |
| no-incentivized-action | llm | policy | pass | The reward is for playing a 15-second sponsored game, not for clicks, installs, or ratings. |
| no-loss-framing | llm | policy | pass | The proposal uses positive gain framing ('+3 bonus AI Usage Quota actions'). |
| explicit-opt-in | llm | fixable | pass | The storyboard shows a clear opt-in flow with 'Play to unlock' and 'Not today' options. |
| disclosed | llm | fixable | pass | The offer clearly states '+3 bonus AI Usage Quota actions' and '15-second sponsored game' before opt-in. |
| free-decline | llm | fixable | pass | The user has a clear 'Not today' option that returns them to the Chats Home without penalty. |
| no-stream-interrupt | llm | fixable | pass | The offer triggers on Chats Home (s01), not during chat or generation. |
| not-for-subscribers | llm | fixable | pass | The eligibility clause explicitly states: 'never shown to subscribers'. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | The offer triggers on the home screen for a quota refill, providing a direct solution to usage limits. |
| product-integrity | 15 | 5 | The ad is additive and non-interruptive, appearing as a sponsored chip on the home screen. |
| cannibalization-safety | 15 | 4 | The reward is capped at one per day and limited to non-payers, ensuring the Luzia+ subscription remains the premium choice. |
| unit-economics | 10 | 2 | The requested 3 actions (COGS $0.0054) represent roughly 60-80% of net revenue per view ($0.0067-$0.009), exceeding the 30% COGS target. |
| reach | 10 | 4 | Chats Home is the core hub of the app (m16), ensuring high visibility. |
| feasibility | 10 | 5 | Uses standard SIM-RWD units on an existing surface (s01). |
| specificity | 10 | 5 | Refers to r3 (AI Usage Quota), Luzia persona, Chats Home, and the Luzia+ subscription model. |
| frequency-fatigue | 5 | 5 | Daily cap of 1 and explicit cooldowns prevent nagging. |
| measurability | 5 | 5 | Includes a 4-week holdout and clear guardrails for conversion. |

- **Verdict reasons (code):** unit-economics scored 2 (< 3); still REVISE after round 2
- **Required changes:**
  - Reduce the reward amount to +1 AI Usage Quota action to ensure the cost-to-serve remains below 30% of the net revenue per view.
  - Explicitly document the non-inferiority conversion guardrail in the rollout plan.
- **Top concern:** The COGS for a 3-action reward ($0.0054) significantly exceeds the 30% target relative to the computed net revenue per view, risking the unit economics of the ad placement.


## P5: Guest sample of Upgrade to Luzia+ — SHIP

> Only after "Maybe later" on Create Account Sheet, Services Tab offers a 15-second game for 30 minutes of Upgrade to Luzia+, once a day.

- product-change · TAX-10 · surface Services Tab (s06) · reward 30 minutes of Upgrade to Luzia+ · caps 1/day

#### Round 0 (v1): **SHIP** · weighted 4.7 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "Guest sample of Upgrade to Luzia+" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The proposal uses the AI character 'Explain quantum physics simply.' for the game partner, which is SFW. |
| no-incentivized-action | llm | policy | pass | The reward is 30 minutes of 'Upgrade to Luzia+' access, not a click, install, or rating. |
| no-loss-framing | llm | policy | pass | The offer appears after a decline, offering a sample rather than punishing the user. |
| explicit-opt-in | llm | fixable | pass | The storyboard includes an opt-in card with 'Play to try' and 'No thanks' buttons. |
| disclosed | llm | fixable | pass | The offer text explicitly states 'Play a 15-second game to try 30 minutes of Upgrade to Luzia+ now.' |
| free-decline | llm | fixable | pass | The offer card contains a 'No thanks' button. |
| no-stream-interrupt | llm | fixable | pass | Triggered on the Services Tab only after the account sheet is dismissed. |
| not-for-subscribers | llm | fixable | pass | Proposal explicitly limits eligibility to 'Guests who just declined the account sheet'. |
| portfolio-distinct | code | fixable | pass | distinct from P3 (surface, reward, archetype family; offer copy overlap < 0.7) |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | The offer triggers immediately after the user declines the account sheet (m2), precisely when they are at a wall, providing a sample of the missed entitlement. |
| product-integrity | 15 | 5 | The proposal is native, offering a sample of the very feature just blocked. It does not degrade free services. |
| cannibalization-safety | 15 | 5 | High safety: gated to decliners, capped at once a day, and time-boxed (30 mins). It uses sampling to drive future subscription value. |
| unit-economics | 10 | 5 | Cost to serve is zero, while revenue per view is positive ($0.009-$0.015). |
| reach | 10 | 3 | Targeting decliners of the account wall is a significant part of the guest user journey, though less than 100% of DAU. |
| feasibility | 10 | 5 | Maps directly to SIM-RWD units with standard SSV and remote config. |
| specificity | 10 | 4 | Uses Luzia specific terms: 'Upgrade to Luzia+', 'Services Tab', 'Explain quantum physics simply.', 'Create Account Sheet'. |
| frequency-fatigue | 5 | 5 | Explicitly capped at once per day, avoiding nagging. |
| measurability | 5 | 5 | Planned metrics include subscription conversion rates, D7 retention, and a 10% intent-to-treat user-level holdout. |

- **Verdict reasons (code):** weighted 4.7 >= 3.8, every criterion >= 3, all gates pass
- **Top concern:** None, the proposal is well-designed and aligns with the knowledge base.

