# Judgments: Janitor

Verdicts are computed in code: SHIP at weighted ≥ 3.8 with every criterion ≥ 3 and every gate passing; REVISE between 3 and 3.8, on any criterion ≤ 2, or on a fixable gate; REJECT below 3, on a policy gate, or still REVISE after round 2 (or when a revision stalls: < +0.2 and no gate fixed). Only SHIP goes to the slides.

Weights: value-moment-fit 20, product-integrity 15, cannibalization-safety 15, unit-economics 10, reach 10, feasibility 10, specificity 10, frequency-fatigue 5, measurability 5.

## Summary

| proposal | title | final | weighted | versions | summary |
|---|---|---|---|---|---|
| P1 | Extended Context Unlock | **REJECT** | 4.8 | v1 → v2 → v3 | REJECT after 2 revisions: fixable gate failed: grounding (code); still REVISE after round 2. Top concern: None. The proposal is robust and well-grounded. |
| P2 | Daily Character Quest Hub | **SHIP** | 4.25 | v1 → v2 | SHIP at 4.25 (v2 after 1 revision). |
| P3 | Subscription Feature Sampling via Rewarded Ad | **SHIP** | 4.9 | v1 → v2 → v3 | SHIP at 4.9 (v3 after 2 revisions). |

## P1: Extended Context Unlock — REJECT

> Watch a quick game partner session to unlock 30 minutes of enhanced context memory.

- existing · TAX-1 · surface More memory for
long chats. (s03) · reward 30 minutes of enhanced context memory · caps 3/day

#### Round 0 (v1): **REVISE** · weighted 4.25 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | edge effect on unknown resource "context_memory_1h"; edge guard on unknown resource "daily_reward_count"; storyboard value: counter on unknown resource "context_memory_1h"; evidence "m1" is not an observation or screen in the model |
| label | code | fixable | pass | cites observed economy items: of1, w1 |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0180) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Targeting SFW character roleplay exploration and general chat memory wall on s03. |
| no-incentivized-action | llm | policy | pass | Grants 1 hour of context memory with no rewards for clicks, installs, or cash-like items. |
| no-loss-framing | llm | policy | pass | Uses positive gain framing: Play a 15-second game to get 1 hour of context memory. |
| explicit-opt-in | llm | fixable | pass | User explicitly opts in via the Play Now button after seeing the offer disclosure. |
| disclosed | llm | fixable | pass | States the exact reward (1 hour of context memory) and required action (15-second game) prior to the ad. |
| free-decline | llm | fixable | pass | Includes a visible No Thanks button that returns the user to s03 without penalty. |
| no-stream-interrupt | llm | fixable | pass | Triggered at the memory limit wall s03 rather than during a streaming response. |
| not-for-subscribers | llm | fixable | pass | Explicitly restricted to non-paying free users hitting the memory context limit. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | Hits the memory wall s03/w1 and unlocks 1 hour of 5x context memory as a time-boxed entitlement matching immediate user need. |
| product-integrity | 15 | 4 | Preserves user flow at paywall decline, targets non-payers only, and maintains core app experience without quality degradation. |
| cannibalization-safety | 15 | 5 | Gated to non-payers, time-boxed to 1 hour, capped at 3 per day, keeping Janitor Plus as the permanent option. |
| unit-economics | 10 | 1 | Cost to serve the reward ($0.0180) exceeds net revenue per view ($0.0063) at the low end. |
| reach | 10 | 4 | Triggered at the frequent memory limit wall m1/w1 encountered by free users. |
| feasibility | 10 | 5 | Maps cleanly to SIM-RWD unit, button entry, and existing screen s03. |
| specificity | 10 | 4 | Cites screen s03, wall w1, and game partner character Willson Wáng from the digest. |
| frequency-fatigue | 5 | 5 | Includes explicit caps of 3 per day and a 30-minute cooldown. |
| measurability | 5 | 5 | Defines primary ARPDAU metric, three guardrails, and a 10% user-level holdout for 28 days. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); fixable gate failed: economics (code); unit-economics scored 1 (< 3)
- **Required changes:**
  - Reduce the reward cost to serve (by utilizing a cheaper model tier or smaller context scope) so that COGS stays well below net revenue per view ($0.0063).
  - Fix patch resource references for context_memory_1h and daily_reward_count to align with valid schema.
- **Top concern:** The cost to serve 1 hour of 5x context memory ($0.0180) exceeds net revenue per view ($0.0063), resulting in negative unit economics.

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `oneLiner`: "Watch a quick game partner session to unlock 1 hour of 5x extended context memory." → "Watch a quick game partner session to unlock 30 minutes of enhanced context memory."
- `offer.body`: "Play a 15-second game to get 1 hour of context memory." → "Play a 15-second game to get 30 minutes of enhanced context memory."
- `simula.gamePartner`: "Willson Wáng" → "Willson W&#225;ng"
- `reward.what`: "1 hour of 5x context memory" → "30 minutes of enhanced context memory"
- `reward.duration`: "1 hour" → "30 minutes"
- `cannibalizationGuard`: "Time-boxed to 1 hour, rate-limited to 3 times per day, and gated to non-payers only; J..." → "Time-boxed to 30 minutes on a lightweight cached model, rate-limited to 3 times per da..."
- `assumptions.cogsUnitsPerView`: 10 → 3
- `patch.newElements[0].change`: "Rewarded ad trigger button for 1-hour context unlock" → "Rewarded ad trigger button for 30-minute context unlock"
- `patch.newEdges[0].effects[0].resource`: "context_memory_1h" → "memory_access"
- `patch.newEdges[0].guard.resource`: "daily_reward_count" → (none)
- `patch.newEdges[0].guard.lt`: 3 → (none)
- `storyboard[2].callouts[0].text`: "Play 15s to unlock 1 hour" → "Play 15s for 30m access"
- `storyboard[2].caption`: "Play a 15-second game to unlock 1 hour memory." → "Play a 15-second game to unlock 30 minutes memory."
- `storyboard[4].counters[0].resource`: "context_memory_1h" → "memory_access"
- `storyboard[4].callouts[0].text`: "1 hour memory unlocked" → "30m memory unlocked"
- `storyboard[4].caption`: "One hour of extended context memory is now unlocked." → "Thirty minutes of enhanced context memory is now unlocked."

#### Round 1 (v2): **REVISE** · weighted 4.75 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | edge effect on unknown resource "memory_access"; storyboard value: counter on unknown resource "memory_access"; evidence "m1" is not an observation or screen in the model |
| label | code | fixable | pass | cites observed economy items: of1, w1 |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | More memory for long chats. Keep more of the story in context, get faster replies |
| no-incentivized-action | llm | policy | pass | Play a 15-second game to get 30 minutes of enhanced context memory. |
| no-loss-framing | llm | policy | pass | Play a 15-second game to get 30 minutes of enhanced context memory. |
| explicit-opt-in | llm | fixable | pass | Play Now / No Thanks |
| disclosed | llm | fixable | pass | Play a 15-second game to get 30 minutes of enhanced context memory. |
| free-decline | llm | fixable | pass | decline: No Thanks |
| no-stream-interrupt | llm | fixable | pass | When the user hits the memory wall trying to continue a long chat without Janitor Plus. |
| not-for-subscribers | llm | fixable | pass | Non-paying free users hitting the memory context limit. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | Proposal: When the user hits the memory wall trying to continue a long chat without Janitor Plus. / Digest s03: More memory for long chats. Keep more of the story in context, get faster replies |
| product-integrity | 15 | 4 | Proposal: Time-boxed to 30 minutes on a lightweight cached model... Janitor Plus subscription remains the permanent option. / Digest s03: More memory for long chats. |
| cannibalization-safety | 15 | 5 | Proposal: Time-boxed to 30 minutes on a lightweight cached model, rate-limited to 3 times per day, and gated to non-payers only; Janitor Plus subscription remains the permanent, un-interrupted option. |
| unit-economics | 10 | 4 | Economics: Cost to serve per view: $0.0054 (text-cheap x 3). / Proposal: cogs: text-cheap, cogsUnitsPerView: 3. |
| reach | 10 | 5 | Digest: moments m1 reach=frequent ("Access advanced chat memory and priority" is blocked). |
| feasibility | 10 | 5 | Proposal: unit: SIM-RWD, entry: button, surface: s03. |
| specificity | 10 | 5 | Proposal references screen s03, offer of1, wall w1, and memory context limits from the digest. |
| frequency-fatigue | 5 | 5 | Proposal: perDay: 3, cooldownMin: 30. |
| measurability | 5 | 5 | Proposal: kpis: { primary: Rewarded ad ARPDAU and total ad revenue, guardrails: [...], holdout: A 10% user-level randomized holdout... }. |

- **Verdict reasons (code):** fixable gate failed: grounding (code)
- **Required changes:**
  - Correct the patch and storyboard resource reference from the ungrounded resource 'memory_access' to a valid economy item or resource.
  - Verify observation reference alignments for 'm1' in the proposal evidence structure.
- **Top concern:** The proposal references an ungrounded resource 'memory_access' in its patch and storyboard counters, which requires correction.

#### Changes v2 → v3 (revise() saw the required changes, never the scores)

- `simula.gamePartner`: "Willson W&#225;ng" → "Willson Wáng"
- `evidence[0].quote`: "Access advanced chat memory and priority" → "Keep more of the story in context, get faster repl"
- `patch.newEdges[0].effects[0].resource`: "memory_access" → "of1"
- `storyboard[4].counters[0].resource`: "memory_access" → "of1"

#### Round 2 (v3): **REJECT** · weighted 4.8 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | edge effect on unknown resource "of1"; storyboard value: counter on unknown resource "of1"; evidence "m1" is not an observation or screen in the model |
| label | code | fixable | pass | cites observed economy items: of1, w1 |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The proposal targets the memory paywall screen (s03), which is a standard SFW monetization surface. |
| no-incentivized-action | llm | policy | pass | The reward is 30 minutes of enhanced context memory, an in-app utility, not cash or gift cards. |
| no-loss-framing | llm | policy | pass | The proposal offers a gain (unlocking 30 minutes) rather than threatening a loss or using dark patterns. |
| explicit-opt-in | llm | fixable | pass | The proposal states: 'Play a 15-second game to get 30 minutes...' |
| disclosed | llm | fixable | pass | The proposal clearly states: 'Play a 15-second game to get 30 minutes of enhanced context memory.' |
| free-decline | llm | fixable | pass | The offer screen includes a clear 'No Thanks' button. |
| no-stream-interrupt | llm | fixable | pass | The trigger is placed on the memory paywall screen (s03), not mid-conversation. |
| not-for-subscribers | llm | fixable | pass | The proposal eligibility specifies 'Non-paying free users hitting the memory context limit.' |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | The proposal targets the exact moment of friction (the memory wall) where the user is blocked, fitting the need for enhanced memory perfectly. |
| product-integrity | 15 | 5 | It uses a Game Partner (Willson Wáng) which feels native to the character-based roleplay platform and does not interrupt any active chat streams. |
| cannibalization-safety | 15 | 5 | The reward is time-boxed (30 minutes), rate-limited (3 per day), and gated to non-paying users. It clearly positions Janitor Plus as the permanent, uninterrupted option. |
| unit-economics | 10 | 4 | Cost to serve per view ($0.0054) is comfortably below the net revenue per view ($0.0036–$0.0096), making it a sustainable model. |
| reach | 10 | 4 | Triggering on the memory paywall (s03) is a core loop interaction point, ensuring significant visibility among frequent users. |
| feasibility | 10 | 5 | Maps directly to the SIM-RWD unit with an existing entry point on s03, requiring minimal engineering lift. |
| specificity | 10 | 5 | Uses the app's specific nouns: 'Janitor Plus', 's03' (the memory paywall), and character 'Willson Wáng'. |
| frequency-fatigue | 5 | 5 | The proposal includes explicit daily caps (3) and a 30-minute cooldown, ensuring a non-intrusive experience. |
| measurability | 5 | 5 | Includes a robust measurement plan: primary KPIs, guardrails, and a 10% user-level holdout over 28 days. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); still REVISE after round 2
- **Top concern:** None. The proposal is robust and well-grounded.


## P2: Daily Character Quest Hub — SHIP

> Earn daily check-in rewards and frontier model swipes by completing character quests via rewarded mini-games.

- product-change · TAX-9 · surface @your_handle (s02) · reward Daily frontier swipe credits · caps 3/day

#### Round 0 (v1): **REVISE** · weighted 4.3 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | edge guard on unknown resource "frontier_swipes_claims" |
| label | code | fixable | pass | declares new mechanic "Daily Character Quest Hub" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Surface s02 is the profile screen (@your_handle), which is SFW and age-appropriate. |
| no-incentivized-action | llm | policy | pass | Reward is in-app frontier swipe credits earned by playing a 15-second mini-game; no cash or install incentivized. |
| no-loss-framing | llm | policy | pass | Proactive daily check-in hub uses positive gain framing ('claim your daily check-in reward') with a clear decline option. |
| explicit-opt-in | llm | fixable | pass | User opts in explicitly via the 'Play Now' CTA button on the invitation screen. |
| disclosed | llm | fixable | pass | Exact reward (10 daily frontier swipe credits) and required action (15-second mini-game) are disclosed prior to starting. |
| free-decline | llm | fixable | pass | Decline option ('No Thanks') returns the user directly to the profile screen without penalty. |
| no-stream-interrupt | llm | fixable | pass | Placed on the profile screen (s02), entirely separate from active chat or streaming response generation. |
| not-for-subscribers | llm | fixable | pass | Eligibility is explicitly restricted to non-paying users ('Non-paying users'). |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | Offers 10 frontier swipe credits via a proactive daily quest hub on the profile screen (s02), addressing scarce frontier model swipes. |
| product-integrity | 15 | 5 | Native proactive hub on the profile screen using Game Partner 'Janitor AI' in a 15-second mini-game; preserves flow and adds value without taking away free features. |
| cannibalization-safety | 15 | 5 | Restricted to non-payers, capped at 3 daily completions, sized well below Janitor Plus entitlements, and includes a user-level holdout. |
| unit-economics | 10 | 2 | Code flag: Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end. |
| reach | 10 | 3 | Profile hub is accessible from navigation, providing moderate daily DAU reach across non-payers. |
| feasibility | 10 | 5 | Uses Simula SIM-RWD unit, invitation entry, Janitor AI game partner, and standard components. |
| specificity | 10 | 5 | Uses app-specific nouns and elements from the digest including Janitor Plus, frontier swipes, Janitor AI, and profile screen s02. |
| frequency-fatigue | 5 | 5 | Explicit per-day cap of 3 completions with a 30-minute cooldown and no re-offer upon decline. |
| measurability | 5 | 5 | Defines primary KPI (ARPDAU and engagement rate), guardrails (subscription conversion non-inferiority, retention), and a 28-day 10% user holdout. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); fixable gate failed: economics (code); unit-economics scored 2 (< 3)
- **Required changes:**
  - Reduce the reward amount or switch to a cheaper model tier so that COGS per view remains below net revenue per view.
  - Fix the edge guard reference to the unknown resource 'frontier_swipes_claims' in the patch specification.
- **Top concern:** Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end, resulting in negative net unit economics.

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `reward.amount`: 10 → 3
- `assumptions.cogsUnitsPerView`: 5 → 2
- `patch.newEdges[0].effects[0].delta`: 10 → 3
- `patch.newEdges[0].guard.resource`: "frontier_swipes_claims" → "frontier_swipes"
- `patch.newEdges[0].guard.lt`: 3 → 10
- `storyboard[4].counters[0].value`: 10 → 3
- `storyboard[4].callouts[0].text`: "+10 frontier swipes granted" → "+3 frontier swipes granted"

#### Round 1 (v2): **SHIP** · weighted 4.25 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "Daily Character Quest Hub" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The Daily Character Quest Hub is located on the user's profile screen and involves general character quests, which are inherently SFW. |
| no-incentivized-action | llm | policy | pass | The reward is 'frontier swipe credits', an in-app utility resource, not cash or gift cards. |
| no-loss-framing | llm | policy | pass | The feature is proactive and uses gain-framing ('claim your daily check-in reward') rather than loss-framing. |
| explicit-opt-in | llm | fixable | pass | The proposal requires the user to 'Play Now' after clear disclosure. |
| disclosed | llm | fixable | pass | The offer body explicitly states: 'Play a 15-second mini-game with Janitor AI to claim your daily check-in reward.' |
| free-decline | llm | fixable | pass | The offer includes a clear 'No Thanks' button that returns the user to the profile without penalty. |
| no-stream-interrupt | llm | fixable | pass | The offer is placed on the profile screen (s02), completely outside of the chat interaction flow. |
| not-for-subscribers | llm | fixable | pass | The eligibility is explicitly restricted to 'Non-paying users.' |
| portfolio-distinct | code | fixable | pass | distinct from P3 (surface, reward, archetype family; offer copy overlap < 0.7) |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | As a daily hub, it aligns well with the scarcity of 'frontier swipes', giving users a reliable path to earn this paid-tier feature. |
| product-integrity | 15 | 5 | The proactive quest hub on the profile screen is a native-feeling addition that does not disrupt any existing chat flow. |
| cannibalization-safety | 15 | 4 | Access is restricted to non-payers, capped at 3 per day, and provides only 3 swipes, which is modest compared to monthly subscription entitlements. |
| unit-economics | 10 | 4 | The cost to serve ($0.0036) is approximately 40% of the low-end US revenue ($0.009), slightly exceeding the 30% guideline, but still generating positive margin. |
| reach | 10 | 3 | The profile page is a standard navigation hub, though less central than the chat itself. |
| feasibility | 10 | 5 | Uses standard SIM-RWD units and fits cleanly into the profile layout (s02). |
| specificity | 10 | 4 | Uses app-specific nouns like 'Janitor AI' and 'frontier swipes' related to the subscription perks. |
| frequency-fatigue | 5 | 5 | Explicit daily cap of 3 and a 30-minute cooldown are well-designed for a non-game app. |
| measurability | 5 | 5 | Defines primary metrics, guardrails, and a 10% user-level holdout experiment. |

- **Verdict reasons (code):** weighted 4.25 >= 3.8, every criterion >= 3, all gates pass
- **Top concern:** None. The proposal is well-designed, safe, and economically viable.


## P3: Subscription Feature Sampling via Rewarded Ad — SHIP

> Offer a 1-hour trial of Janitor Plus when users dismiss the paywall after a rewarded mini-game.

- product-change · TAX-2 · surface Janitor Plus Paywall (s04) · reward 1-hour trial of Janitor Plus features for 1 hour · caps 1/day

#### Round 0 (v1): **REVISE** · weighted 3.7 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | economy item "plan" does not exist |
| label | code | fixable | pass | declares new mechanic "Paywall-Decline Trial Pass" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Surface s04 is the Janitor Plus subscription paywall, which is SFW and safe. |
| no-incentivized-action | llm | policy | pass | Proposal rewards a 15-second mini-game view, not clicks or installs. |
| no-loss-framing | llm | policy | pass | No loss or hostage framing is used; it offers a positive sampling path ('Try Janitor Plus Free'). |
| explicit-opt-in | llm | fixable | pass | User explicitly opts in via the 'Play Now' CTA button on the trial offer modal. |
| disclosed | llm | fixable | pass | The exact reward (1-hour trial of Janitor Plus features) and required action (15-second game) are stated before the ad. |
| free-decline | llm | fixable | pass | An equally legible decline button ('No Thanks') is provided, leaving the user free to dismiss. |
| no-stream-interrupt | llm | fixable | pass | Triggered when a free user taps 'Not now' on the subscription paywall, not during a streaming response. |
| not-for-subscribers | llm | fixable | pass | Eligibility is restricted strictly to non-paying free users who dismiss the paywall. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | Proposal triggers right when declining the paywall (m3), offering a 1-hour trial of the exact features just declined. |
| product-integrity | 15 | 4 | Feels native, offering a time-boxed trial of premium features on paywall decline without removing free value. |
| cannibalization-safety | 15 | 4 | Strictly gated to paywall decliners, time-boxed to 1 hour, and capped at once per day. |
| unit-economics | 10 | 2 | Cost to serve ($0.0090) exceeds net revenue per view ($0.0063) at the low end, flagging a margin deficit. |
| reach | 10 | 3 | Triggered on paywall dismissal (m3), reaching users who encounter and decline the subscription paywall. |
| feasibility | 10 | 4 | Maps cleanly to SIM-RWD with an invitation entry point and standard reward verification. |
| specificity | 10 | 3 | References the Janitor Plus paywall and screen s04, though flagged for an economy resource mapping issue. |
| frequency-fatigue | 5 | 5 | Capped strictly at once per day with a 1440-minute cooldown. |
| measurability | 5 | 5 | Includes primary metrics, guardrails, and a 20% user-level randomized holdout for 28 days. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); fixable gate failed: economics (code); unit-economics scored 2 (< 3); weighted 3.7 < 3.8
- **Required changes:**
  - Resize the reward COGS or adjust the model tier to ensure cost-to-serve ($0.0090) does not exceed net revenue per view ($0.0063) at the low end.
  - Correct the economy resource grounding for the plan entitlement in the proposal patch.
- **Top concern:** Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end, making the unit economics margin-negative.

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `reward.resource`: "plan" → "of1"
- `assumptions.cogs`: "text-premium" → "text-cheap"
- `patch.newEdges[0].effects[0].resource`: "plan" → "of1"
- `storyboard[0].counters[0].resource`: "plan" → "of1"
- `storyboard[1].counters[0].resource`: "plan" → "of1"
- `storyboard[2].counters[0].resource`: "plan" → "of1"
- `storyboard[3].counters[0].resource`: "plan" → "of1"
- `storyboard[4].counters[0].resource`: "plan" → "of1"

#### Round 1 (v2): **REVISE** · weighted 4.6 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | economy item "plan" does not exist |
| label | code | fixable | pass | declares new mechanic "Paywall-Decline Trial Pass" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Offer a 1-hour trial of Janitor Plus when users dismiss the paywall after a rewarded mini-game. |
| no-incentivized-action | llm | policy | pass | Play a quick 15-second game to unlock 1 hour of premium memory. |
| no-loss-framing | llm | policy | pass | Offer a 1-hour trial of Janitor Plus when users dismiss the paywall after a rewarded mini-game. |
| explicit-opt-in | llm | fixable | pass | Play Now |
| disclosed | llm | fixable | pass | Play a quick 15-second game to unlock 1 hour of premium memory. |
| free-decline | llm | fixable | pass | No Thanks |
| no-stream-interrupt | llm | fixable | pass | When a free user taps 'Not now' to dismiss the Janitor Plus paywall (moment m3). |
| not-for-subscribers | llm | fixable | pass | Non-paying free users who dismiss the subscription paywall |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | Matches moment m3 (paywall decline) on s04 with TAX-2 (time-boxed premium unlock trial), offering a 1-hour trial of Janitor Plus features. |
| product-integrity | 15 | 5 | Uses surface s04 and modal ns1 upon paywall decline, preserving user flow and taking nothing away from free value. |
| cannibalization-safety | 15 | 5 | Gated strictly to paywall decliners, time-boxed to 1 hour, capped at once per day, with a 20% holdout planned. |
| unit-economics | 10 | 5 | Cost to serve per view is $0.0018 (text-cheap x 1), while US completed view earns $0.0090–$0.0150, keeping COGS well below 30% of net revenue per view. |
| reach | 10 | 3 | Tied to paywall decline moment m3, which occurs frequently for non-paying users hitting paywalls but is less frequent than core chat interactions. |
| feasibility | 10 | 5 | Maps to SIM-RWD with entry invitation, REWARD_VERIFIED, standard SSV and remote config, defining modal ns1 and new element ne1 on s04. |
| specificity | 10 | 5 | References exact screen s04, moment m3, economy item of1, element e12 ('Not now'), and Janitor Plus subscription features. |
| frequency-fatigue | 5 | 5 | Capped at 1 per day (perDay: 1, cooldownMin: 1440) with a working decline button. |
| measurability | 5 | 5 | Primary metric named (Rewarded ARPDAU and subscription conversion rate among paywall decliners), guardrails include 3% non-inferiority on paid conversion and D7/D30 retention, with a 20% user-level holdout for 28 days. |

- **Verdict reasons (code):** fixable gate failed: grounding (code)
- **Required changes:**
  - Fix the economy reference in the anchor array from 'plan' to 'of1' to correctly ground against the observed subscription offer.
- **Top concern:** Economy reference in anchor ('plan') does not match the observed offer identifier ('of1').

#### Changes v2 → v3 (revise() saw the required changes, never the scores)

- `anchor.economy[2]`: "plan" → (none)

#### Round 2 (v3): **SHIP** · weighted 4.9 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "Paywall-Decline Trial Pass" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Surface s04 is the standard Janitor Plus subscription paywall, which is SFW and age-appropriate. |
| no-incentivized-action | llm | policy | pass | Rewards a 1-hour trial of Janitor Plus features upon completing a 15-second game; no clicks/installs/cash. |
| no-loss-framing | llm | policy | pass | Offer uses clean copy 'Try Janitor Plus Free' with explicit decline 'No Thanks'. |
| explicit-opt-in | llm | fixable | pass | User taps 'Play Now' CTA after viewing the prompt. |
| disclosed | llm | fixable | pass | Body text states: 'Play a quick 15-second game to unlock 1 hour of premium memory.' |
| free-decline | llm | fixable | pass | Includes 'No Thanks' button which returns the user without penalty. |
| no-stream-interrupt | llm | fixable | pass | Triggered upon dismissing the paywall (s04), not during active chat streaming. |
| not-for-subscribers | llm | fixable | pass | Eligibility is explicitly restricted to 'Non-paying free users who dismiss the subscription paywall'. |
| portfolio-distinct | code | fixable | pass | the first SHIP of the portfolio |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | The user just hit the paywall (m3, s04) expressing interest in Janitor Plus features. Offering a 1-hour trial right at paywall dismissal (TAX-10 fallback) perfectly matches the moment of desire. |
| product-integrity | 15 | 5 | Appends a trial offer to the paywall dismissal (ne1 on s04), preserving the user's journey and adding additive sampling value without taking away free features. |
| cannibalization-safety | 15 | 5 | Strictly gated to non-payers who decline the paywall (m3), time-boxed to just 1 hour, capped at once per day, and backed by a 20% holdout with non-inferiority guardrails. |
| unit-economics | 10 | 5 | Code computes cost to serve per view as $0.0018, which is well below the US net revenue per view ($0.0090–$0.0150). |
| reach | 10 | 4 | Paywall views (m3) occur whenever free users encounter upgrade prompts or limits, reaching a substantial share of engaged free users daily. |
| feasibility | 10 | 5 | Uses standard SIM-RWD unit with invitation entry point and standard REWARD_VERIFIED callback, mapping cleanly to existing Simula SDK capabilities. |
| specificity | 10 | 5 | Targets screen s04 ('Janitor Plus Paywall'), references Janitor Plus entitlement (of1), and uses app-specific context (premium memory, priority routing). |
| frequency-fatigue | 5 | 5 | Capped at once per day (perDay: 1, cooldownMin: 1440), preventing nagging. |
| measurability | 5 | 5 | Specifies primary metrics, guardrails (3% non-inferiority, retention), and a 20% user-level randomized holdout for 28 days. |

- **Verdict reasons (code):** weighted 4.9 >= 3.8, every criterion >= 3, all gates pass
- **Top concern:** None; proposal is exceptionally well-structured, targeting paywall decliners with tight time-boxing and robust holdout testing.

