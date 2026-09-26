# Judgments: Luzia

Verdicts are computed in code: SHIP at weighted ≥ 3.8 with every criterion ≥ 3 and every gate passing; REVISE between 3 and 3.8, on any criterion ≤ 2, or on a fixable gate; REJECT below 3, on a policy gate, or still REVISE after round 2 (or when a revision stalls: < +0.2 and no gate fixed). Only SHIP goes to the slides.

Weights: value-moment-fit 20, product-integrity 15, cannibalization-safety 15, unit-economics 10, reach 10, feasibility 10, specificity 10, frequency-fatigue 5, measurability 5.

## Summary

| proposal | title | final | weighted | versions | summary |
|---|---|---|---|---|---|
| P1 | Daily Task for AI Usage Credits | **SHIP** | 4.4 | v1 → v2 | SHIP at 4.4 (v2 after 1 revision). |
| P2 | Unlock Image Generation Credit | **REJECT** | 4.5 | v1 → v2 | REJECT after 1 revision: revision stalled (weighted +0.15, below +0.2) with the same gate failures. Top concern: economics (code): Cost to serve the reward ($0.0250) exceeds net revenue per view ($0.0063) at the low end. |
| P3 | Paywall-decline: Deep Reasoning Sample | **REJECT** | 4.45 | v1 → v2 | REJECT after 1 revision: revision stalled (weighted +0.15, below +0.2) with the same gate failures. Top concern: grounding (code): edge effect on unknown resource "Deep Reasoning Trial"; storyboard value: counter on unknown resource "Deep Reasoning Trial" |
| P4 | Sponsored Advanced Services 15m Trial | **REJECT** | 4 | v1 → v2 → v3 | REJECT after 2 revisions: fixable gate failed: grounding (code); feasibility scored 2 (< 3); still REVISE after round 2. Top concern: grounding (code): edge element "a07_9" is not on s07 and not declared |
| P5 | Save a Favorite Message with Ad | **REJECT** | 2.7 | v1 | REJECT: weighted 2.7 < 3. Top concern: grounding (code): economy item "r2 (Account Access)" does not exist; storyboard today: counter on unknown resource "favorite_slot"; storyboard change: counter on unknown resource "favorite_slot"; storyboard offer: counter on unknown resource "favorite_slot"; storyboard ad: counter on unknown resource "favorite_slot"; storyboard value: counter on unknown resource "favorite_slot" |

## P1: Daily Task for AI Usage Credits — SHIP

> Play a 15-second mini-game with Luzia to earn daily AI usage credits.

- product-change · AI-3 · surface Chats Home (s01) · reward 2 AI Usage Credits · caps 3/day

#### Round 0 (v1): **REVISE** · weighted 4.25 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | economy item "r3 (AI Usage Quota)" does not exist |
| label | code | fixable | pass | declares new mechanic "Daily Tasks" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | **FAIL** | surface s01 is also the first-value screen: eligibility must exclude the first session |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Play a quick 15-second mini-game with Luzia to earn 5 extra AI usage credits on Chats Home (s01). |
| no-incentivized-action | llm | policy | pass | Play a quick 15-second mini-game with Luzia to earn 5 extra AI usage credits - rewards play/view, not clicks, installs, or cash. |
| no-loss-framing | llm | policy | pass | Play a quick 15-second mini-game with Luzia to earn 5 extra AI usage credits. No thanks - gain-framed, no loss framing or dark patterns. |
| explicit-opt-in | llm | fixable | pass | User taps the Daily Task banner on the Chats Home (s01) tab with CTA Play Now. |
| disclosed | llm | fixable | pass | Play a quick 15-second mini-game with Luzia to earn 5 extra AI usage credits. |
| free-decline | llm | fixable | pass | No thanks decline button returns the user without penalty. |
| no-stream-interrupt | llm | fixable | pass | Placed on Chats Home (s01) via a banner element, not interrupting a streaming AI response. |
| not-for-subscribers | llm | fixable | pass | Only offered to non-subscribers. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | Proposal uses AI-3 archetype on Chats Home (s01) for AI usage credits (r3). |
| product-integrity | 15 | 5 | Added as a non-interruptive banner on Chats Home (ne1 near e31), game partner Luzia plays along. |
| cannibalization-safety | 15 | 4 | Restricted to non-subscribers, additive credits, non-interruptive banner, holdout planned. |
| unit-economics | 10 | 2 | Code-computed cost to serve ($0.0090) exceeds net revenue per view ($0.0063) at the low end. |
| reach | 10 | 5 | Placed on Chats Home (s01), which is a core-loop hub visited frequently. |
| feasibility | 10 | 5 | Uses SIM-RWD unit, button entry, game partner Luzia, minPlaySec 15. |
| specificity | 10 | 4 | Uses app noun Chats Home (s01), Luzia, references AI Usage Quota. |
| frequency-fatigue | 5 | 5 | Capped at 3 per day with a 30-minute cooldown. |
| measurability | 5 | 5 | Primary metric named, guardrails listed, 10% user-level holdout for 4 weeks. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); fixable gate failed: economics (code); fixable gate failed: structure (code); unit-economics scored 2 (< 3)
- **Required changes:**
  - Reduce the reward amount or use cheaper models to lower the cost to serve below net revenue per view.
  - Exclude session 1 from eligibility since s01 is the first-value screen where no offers are allowed.
  - Correct the economy item reference for AI Usage Quota (r3).
- **Top concern:** Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end, and eligibility must exclude session 1 on s01.

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `anchor.economy[0]`: "r3 (AI Usage Quota)" → "r3"
- `anchor.newMechanic.description`: "A new interactive banner on the Chats Home screen offering daily mini-game challenges ..." → "A new interactive banner on the Chats Home (s01) screen offering daily mini-game chall..."
- `anchor.newMechanic.whyNeeded`: "Increases daily engagement and retention by gamifying the AI experience." → "Increases daily engagement and retention for non-subscribers by gamifying AI usage whi..."
- `trigger`: "User taps the Daily Task banner on the Chats Home (s01) tab." → "User taps the Daily Task banner on the Chats Home (s01) tab, outside of their first se..."
- `eligibility`: "Non-subscribers, once per day per user." → "Returning non-subscribers (session 2+), once per day per user."
- `offer.body`: "Play a quick 15-second mini-game with Luzia to earn 5 extra AI usage credits." → "Play a quick 15-second mini-game with Luzia to earn 2 extra AI usage credits."
- `reward.what`: "5 AI Usage Credits" → "2 AI Usage Credits"
- `reward.amount`: 5 → 2
- `cannibalizationGuard`: "Only offered to non-subscribers. The credits are additive to their quota and do not pr..." → "Only offered to non-subscribers and returning users (session 2+). Credits are additive..."
- `assumptions.cogsUnitsPerView`: 5 → 2
- `kpis.guardrails[0]`: "Paid conversion rate" → "Paid conversion rate (non-inferiority check)"
- `risks[0]`: "High frequency of tasks could feel repetitive if not rotated." → "If not rotated, mini-game tasks may become repetitive."
- `risks[1]`: "Potential for users to rely on credits instead of subscribing." → "Potential for users to rely on ad-earned credits instead of subscribing if limits are ..."
- `patch.newEdges[0].effects[0].delta`: 5 → 2
- `storyboard[0].caption`: "Users browse and start chats on the Home tab." → "Returning users browse and start chats on the Home tab."
- `storyboard[2].caption`: "Users opt-in to a 15-second game for 5 AI credits." → "Users opt-in to a 15-second game for 2 AI credits."
- `storyboard[4].counters[0].value`: 5 → 2
- `storyboard[4].caption`: "Upon completion, the user receives 5 AI usage credits." → "Upon completion, the user receives 2 AI usage credits."

#### Round 1 (v2): **SHIP** · weighted 4.4 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "Daily Tasks" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The proposal introduces a daily task banner on the Chats Home screen, a core interface surface for general chat and task automation. |
| no-incentivized-action | llm | policy | pass | The reward is '2 AI Usage Credits' (resource r3), which are in-app consumables and not cash-like. |
| no-loss-framing | llm | policy | pass | The proposal offers a gain for an action, with a clear 'Play Now' / 'No thanks' choice, avoiding dark patterns. |
| explicit-opt-in | llm | fixable | pass | The user must tap a banner to trigger the mini-game flow. |
| disclosed | llm | fixable | pass | The offer body explicitly states: 'Play a quick 15-second mini-game with Luzia to earn 2 extra AI usage credits.' |
| free-decline | llm | fixable | pass | The offer provides an explicit 'No thanks' button, and declining leaves the user in the Chats Home tab. |
| no-stream-interrupt | llm | fixable | pass | The offer is triggered from a home screen banner, not during an active chat stream. |
| not-for-subscribers | llm | fixable | pass | The proposal eligibility explicitly states: 'Only offered to non-subscribers'. |
| portfolio-distinct | code | fixable | pass | the first SHIP of the portfolio |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 3 | The proactive banner on the Home tab creates a habit loop but does not target a specific 'moment of need' like a blocked request. |
| product-integrity | 15 | 5 | The banner feels native to the Chats Home (s01) interface and preserves the core chat flow. |
| cannibalization-safety | 15 | 5 | The credits are additive, limited to non-subscribers, and explicitly do not unlock premium reasoning modes. |
| unit-economics | 10 | 3 | Cost-to-serve ($0.0036) is ~43% of net revenue per view ($0.0084), which is profitable but above the ideal 30% threshold. |
| reach | 10 | 5 | Chats Home (s01) is the core landing page with high daily traffic. |
| feasibility | 10 | 5 | Uses standard SIM-RWD units with a simple banner addition in s01. |
| specificity | 10 | 5 | References s01, r3, and Luzia as the Game Partner accurately based on the digest. |
| frequency-fatigue | 5 | 5 | Capped at 3 grants per day with a 30-minute cooldown. |
| measurability | 5 | 5 | Defined primary, guardrails, and a user-level holdout plan. |

- **Verdict reasons (code):** weighted 4.4 >= 3.8, every criterion >= 3, all gates pass
- **Required changes:**
  - Consider reducing the reward to 1 credit per view if the goal is to optimize the net margin to below 30% of net revenue.
  - Ensure the banner visual style matches the 'Try Luzia' upsell style to maintain UI consistency.
- **Top concern:** The unit economics show the COGS (~43% of net revenue) is higher than the ideal 30% threshold for the '5' score, though still profitable.


## P2: Unlock Image Generation Credit — REJECT

> Play two quick mini-games with Luzia to earn an AI image generation credit.

- product-change · AI-5 · surface Image Creation Hub (s10) · reward 1 AI Image credit · caps 2/day

#### Round 0 (v1): **REVISE** · weighted 4.35 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "Rewarded Image Credits" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0250) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Image generation in the Image Creation Hub is a standard feature and the proposal includes no NSFW incentives or content. |
| no-incentivized-action | llm | policy | pass | The reward is granted for playing a mini-game, not for clicking ads or installing apps. |
| no-loss-framing | llm | policy | pass | The proposal offers a reward when the quota is depleted, rather than threatening content deletion or loss. |
| explicit-opt-in | llm | fixable | pass | The storyboard shows an offer screen (ns1) with 'Play Now' and 'No thanks' buttons. |
| disclosed | llm | fixable | pass | The offer explicitly states: 'Play a 15-second game with Luzia to get 1 free AI image generation credit.' |
| free-decline | llm | fixable | pass | The offer includes a 'No thanks' button that returns the user to the Image Creation Hub (s10). |
| no-stream-interrupt | llm | fixable | pass | The trigger is specifically when the usage quota (r3) is depleted, which is a hard block boundary. |
| not-for-subscribers | llm | fixable | pass | The eligibility is explicitly restricted to 'Non-paying users'. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | The reward is offered exactly when the user hits the usage limit in the Image Creation Hub, which is the precise moment of need. |
| product-integrity | 15 | 5 | The solution is additive (adds credits) and keeps the user in flow. Playing with the character is a native, in-world action. |
| cannibalization-safety | 15 | 4 | The reward is capped at 3 credits per day, ensuring usage remains limited and non-subscribers do not gain unlimited generation capability. |
| unit-economics | 10 | 1 | The cost to serve ($0.0250) is significantly higher than the estimated net revenue per view ($0.0063). The proposal fails to achieve break-even. |
| reach | 10 | 4 | Image generation is a core loop function in Luzia; hitting usage limits is a common experience for free users. |
| feasibility | 10 | 5 | The proposal maps clearly to SIM-RWD units with a logical patch and SSV-ready grant path. |
| specificity | 10 | 5 | Uses the specific app screen (s10), resource (r3), and character (Luzia) from the digest. |
| frequency-fatigue | 5 | 5 | Includes a strict 3-per-day cap and a 30-minute cooldown, preventing nagging. |
| measurability | 5 | 5 | Includes primary metrics (image generation volume), guardrails (paid conversion), and a holdout design. |

- **Verdict reasons (code):** fixable gate failed: economics (code); unit-economics scored 1 (< 3)
- **Required changes:**
  - Adjust the reward bundle to require two completed views for one image credit (a 2:1 ratio) to align with unit economics, or utilize a lower-cost model if available.
  - Update the offer copy to reflect the new bundle requirements (e.g., 'Watch 2 ads to earn 1 credit').
- **Top concern:** The unit economics are unsustainable: the cost to serve the image generation ($0.0250) is roughly four times higher than the expected net revenue from a US rewarded view ($0.0063).

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `oneLiner`: "Watch a quick mini-game with Luzia to earn an AI image generation credit." → "Play two quick mini-games with Luzia to earn an AI image generation credit."
- `anchor.newMechanic.description`: "Users can watch or play a mini-game to earn an image generation credit when they hit t..." → "Users can play two mini-games with Luzia to earn an image generation credit when they ..."
- `anchor.newMechanic.whyNeeded`: "Allows free users to continue generating images without impacting paid conversion by l..." → "Allows free users to continue generating images by bundling views, improving unit econ..."
- `offer.body`: "Play a 15-second game with Luzia to get 1 free AI image generation credit." → "Play 2 quick games with Luzia to get 1 free AI image generation credit."
- `caps.perDay`: 3 → 2
- `cannibalizationGuard`: "Limited to 3 credits per day and only available when r3 is depleted; ensures non-payer..." → "Limited to 2 credits per day and requires a 2:1 view-to-credit bundle; ensures non-pay..."
- `assumptions.viewsPerEngager`: 2 → 4
- `risks[0]`: "Ad saturation if limits are too frequent" → "Ad fatigue due to two-view bundle requirement"
- `patch.newScreens[0].change`: "Rewarded ad invitation modal for image credit." → "Rewarded ad invitation modal for image credit bundle."
- `patch.newElements[0].change`: "Button to trigger rewarded ad for 1 image credit when limit is reached." → "Button to trigger rewarded ad bundle for 1 image credit when limit is reached."
- `patch.newEdges[0].effects[0].delta`: 1 → 0.5
- `storyboard[2].callouts[0].text`: "Play a game to get 1 image credit." → "Play 2 games to get 1 image credit."
- `storyboard[2].caption`: "The user opts into the rewarded offer." → "The user opts into the rewarded offer bundle."
- `storyboard[3].caption`: "The user plays the mini-game with Luzia." → "The user plays the first of two mini-games with Luzia."
- `storyboard[4].caption`: "The image credit is granted and the user can generate the image." → "The credit is granted after two completed games, enabling image generation."

#### Round 1 (v2): **REVISE** · weighted 4.5 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "Rewarded Image Credits" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0250) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Proposal targets s10 Image Creation Hub, which is SFW and age-appropriate. |
| no-incentivized-action | llm | policy | pass | Reward is 1 AI Image credit (resource r3), with no cash-like items or incentivized clicks/installs. |
| no-loss-framing | llm | policy | pass | Offer uses gain framing ('Earn an image credit') with a clear decline option ('No thanks'). |
| explicit-opt-in | llm | fixable | pass | User opts in explicitly via the 'Play Now' CTA on the offer modal. |
| disclosed | llm | fixable | pass | Offer explicitly states: 'Play 2 quick games with Luzia to get 1 free AI image generation credit.' |
| free-decline | llm | fixable | pass | Decline button 'No thanks' returns the user directly to s10 with no penalty or degraded state. |
| no-stream-interrupt | llm | fixable | pass | Triggered when hitting the quota limit (r3) on image generation, not mid-stream. |
| not-for-subscribers | llm | fixable | pass | Eligibility specifies non-paying users who have exhausted their free AI Usage Quota (r3). |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | Proposal targets moment m21 on s10 Image Creation Hub when the user's AI Usage Quota (r3) is depleted. |
| product-integrity | 15 | 5 | Proposal uses mini-games with Luzia as Game Partner, keeping the experience native and immersive on s10. |
| cannibalization-safety | 15 | 5 | Restricted to non-paying users with a daily cap of 2 credits and a 2:1 view bundle, plus a 10% holdout. |
| unit-economics | 10 | 1 | Code flags a deficit: cost to serve the reward ($0.0250) exceeds net revenue per view ($0.0063) at the low end. |
| reach | 10 | 4 | Image creation is a frequent core loop activity (m21, s10), hitting a broad share of active users. |
| feasibility | 10 | 5 | Maps directly to SIM-RWD with button entry, SSV (REWARD_VERIFIED), and a defined patch. |
| specificity | 10 | 5 | Uses app-specific nouns and IDs: s10, r3, Image Creation Hub, Luzia. |
| frequency-fatigue | 5 | 5 | Explicit per-day cap of 2 and a 30-minute cooldown. |
| measurability | 5 | 5 | Defines primary metric, guardrails (paid conversion, DAU, retention), and a 4-week holdout. |

- **Verdict reasons (code):** fixable gate failed: economics (code); unit-economics scored 1 (< 3)
- **Required changes:**
  - Increase the view requirement or switch to a cheaper mini image model to resolve the unit economics deficit where the cost to serve ($0.0250) exceeds net revenue per view ($0.0063).
- **Top concern:** Unit economics deficit: the cost to serve an image generation ($0.0250) exceeds net revenue per view ($0.0063), making the 2-view bundle financially unsustainable.


## P3: Paywall-decline: Deep Reasoning Sample — REJECT

> Offer a 30-minute trial of Deep Reasoning mode after declining the account signup wall.

- product-change · AI-4 · surface Create Account Sheet (s07) · reward 30 minutes of Deep Reasoning mode · caps 1/day

#### Round 0 (v1): **REVISE** · weighted 4.3 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | edge element "ne_decline_trigger" is not on s07 and not declared; edge effect on unknown resource "Deep Reasoning Trial"; storyboard change: callout node "s07" is not on s07 and not declared; storyboard ad: callout node "s27" is not on s27 and not declared; storyboard value: counter on unknown resource "Deep Reasoning Trial" |
| label | code | fixable | pass | declares new mechanic "Rewarded Deep Reasoning Trial" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Proposal surface is the 'Create Account Sheet' (s07) and the reward is 'Deep Reasoning mode', which is a premium feature, not sensitive content. |
| no-incentivized-action | llm | policy | pass | Reward is feature trial, not clicks or installs. |
| no-loss-framing | llm | policy | pass | Proposal uses gain framing ('Try Deep Reasoning for free') with a clear decline option. |
| explicit-opt-in | llm | fixable | pass | Modal requires a tap on 'Play Now' to proceed. |
| disclosed | llm | fixable | pass | Proposal explicitly states: 'Play a quick 15-second game to unlock 1 hour of our premium Deep Reasoning mode.' |
| free-decline | llm | fixable | pass | Proposal includes 'No thanks' button which returns the user to the services tab. |
| no-stream-interrupt | llm | fixable | pass | Trigger is the paywall decline, not a streaming generation. |
| not-for-subscribers | llm | fixable | pass | Eligibility specifies 'Non-paying guests who are not currently on a subscription'. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | The user is attempting to access a specific feature (Deep Reasoning/Task) and is blocked; offering the trial at this exact moment is highly context-relevant. |
| product-integrity | 15 | 5 | Providing a time-boxed trial of premium features is a standard, non-disruptive way to let users experience core value without degrading the free experience. |
| cannibalization-safety | 15 | 5 | Targeting only decliners of the paywall with a time-limited sample is an effective way to generate revenue from users who aren't converting to subscription. |
| unit-economics | 10 | 1 | Cost to serve ($0.0090) exceeds net revenue ($0.0063). The reward must be sized down to ensure profitability. |
| reach | 10 | 4 | Triggers on paywall walls (s07, s02, etc), which the digest notes are frequent. |
| feasibility | 10 | 3 | Uses SIM-RWD, but the patch references elements (ne_decline_trigger) not declared in the digest/structure; requires cleaner backend integration. |
| specificity | 10 | 5 | Uses the correct screen IDs (s07) and references the correct premium features (Deep Reasoning, Luzia+). |
| frequency-fatigue | 5 | 5 | 1/day cap and 1440 minute cooldown are well designed to prevent nagging. |
| measurability | 5 | 5 | Defines primary metric, guardrails, and a holdout duration. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); fixable gate failed: economics (code); unit-economics scored 1 (< 3)
- **Required changes:**
  - Reduce the trial duration (from 1 hour to 15 or 30 minutes) to lower the COGS below the net revenue-per-view of $0.0063.
  - Correct the patch/storyboard: Define the trigger element on screen s07 (e.g., 'close_button' or similar) and update the patch to reference existing elements, as 'ne_decline_trigger' is undefined in the digest.
  - Refine the patch definition to explicitly state the new screen/modal creation correctly.
- **Top concern:** The proposal has negative unit economics, as the cost to serve ($0.0090) exceeds the net revenue per view ($0.0063). The reward duration must be shortened.

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `oneLiner`: "Offer a 1-hour trial of Deep Reasoning mode after declining the account signup wall." → "Offer a 30-minute trial of Deep Reasoning mode after declining the account signup wall."
- `anchor.newMechanic.description`: "A time-boxed (1 hour) trial of Deep Reasoning mode triggered by an ad after the user d..." → "A time-boxed (30 minutes) trial of Deep Reasoning mode triggered by an ad after the us..."
- `trigger`: "After the user taps 'Close' to decline the account signup wall that appeared when they..." → "After the user taps close to decline the account signup wall that appeared when they t..."
- `offer.title`: "Try Deep Reasoning for free" → "Try Deep Reasoning free"
- `offer.body`: "Play a quick 15-second game to unlock 1 hour of our premium Deep Reasoning mode." → "Play a quick 15-second game to unlock 30 minutes of Deep Reasoning mode."
- `reward.what`: "1 hour of Deep Reasoning mode" → "30 minutes of Deep Reasoning mode"
- `reward.duration`: "1 hour" → "30 minutes"
- `cannibalizationGuard`: "This offer is only presented to users who have already explicitly declined the paywall..." → "This offer is only presented to users who have already explicitly declined the paywall..."
- `risks[1]`: "High COGS for the premium model; mitigation is the 1-hour time box." → "COGS for the premium model; mitigation is the reduced 30-minute time box."
- `patch.newScreens[0].change`: "A rewarded invitation modal informing the user they can unlock 1 hour of Deep Reasonin..." → "A rewarded invitation modal informing the user they can unlock 30 minutes of Deep Reas..."
- `patch.newElements[0].id`: "ne_reward_invitation" → "ne_close_paywall"
- `patch.newElements[0].in`: "ns1" → "s07"
- `patch.newElements[0].place`: "overlay" → "after"
- `patch.newElements[0].change`: "Button 'Play Now' triggers the rewarded ad flow (SIM-RWD)." → "Close button on the Create Account sheet triggering the rewarded invitation."
- `patch.newEdges[0].el`: "ne_decline_trigger" → "ne_close_paywall"
- `storyboard[1].callouts[0].node`: "s07" → "ne_close_paywall"
- `storyboard[1].caption`: "Paywall appears, user taps 'Close' to decline." → "Paywall appears, user taps close to decline."
- `storyboard[2].callouts[0].text`: "1 hour free sample!" → "30 mins free trial!"
- `storyboard[3].callouts[0].node`: "s27" → "e15"
- `storyboard[4].caption`: "Reward verified: 1 hour trial activated." → "Reward verified: 30-minute trial activated."
- `patch.newElements[1].id`: (none) → "ne_reward_invitation"
- `patch.newElements[1].in`: (none) → "ns1"
- `patch.newElements[1].place`: (none) → "overlay"
- `patch.newElements[1].change`: (none) → "Button 'Play Now' triggers the rewarded ad flow (SIM-RWD)."

#### Round 1 (v2): **REVISE** · weighted 4.45 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | edge effect on unknown resource "Deep Reasoning Trial"; storyboard value: counter on unknown resource "Deep Reasoning Trial" |
| label | code | fixable | pass | declares new mechanic "Rewarded Deep Reasoning Trial" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Proposal targets s07 (Create Account Sheet) for Deep Reasoning mode, which is SFW. |
| no-incentivized-action | llm | policy | pass | Offers a time-boxed trial for playing a mini-game; no cash, gift cards, or incentivized clicks/installs. |
| no-loss-framing | llm | policy | pass | Uses gain framing ('unlock 30 minutes of Deep Reasoning mode') with no dark patterns or confirmshaming. |
| explicit-opt-in | llm | fixable | pass | Requires explicit tap on 'Play Now' CTA. |
| disclosed | llm | fixable | pass | States exact reward (30 minutes of Deep Reasoning mode) and required action (15-second game) prior to ad. |
| free-decline | llm | fixable | pass | Includes an equally legible 'No thanks' decline button that returns the user to the app without penalty. |
| no-stream-interrupt | llm | fixable | pass | Triggered on paywall decline (m9) rather than interrupting a streaming response. |
| not-for-subscribers | llm | fixable | pass | Eligibility explicitly restricts the offer to non-paying guests not currently on a subscription. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | Offered right after hitting the paywall for Deep Reasoning mode (m9), providing an immediate trial of the exact feature desired. |
| product-integrity | 15 | 5 | Feels native, preserves user flow, and uses Luzia as the Game Partner without degrading the free experience. |
| cannibalization-safety | 15 | 4 | Gated strictly to paywall decliners and limited to a 30-minute time-box with a daily cap of 1, protecting subscription value. |
| unit-economics | 10 | 2 | Code flagged that the cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end. |
| reach | 10 | 4 | Frequent trigger point (m9) whenever users attempt to access Deep Reasoning mode. |
| feasibility | 10 | 5 | Maps directly to SIM-RWD with button entry, SSV verification, and remote config. |
| specificity | 10 | 5 | Uses app-specific nouns like Luzia+, Deep Reasoning, s07, and Luzia as game partner. |
| frequency-fatigue | 5 | 5 | Capped at 1 per day with a 1440-minute cooldown and no re-offering after decline. |
| measurability | 5 | 5 | Defines primary conversion metric, guardrails, and a 5% user holdout for 4 weeks. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); fixable gate failed: economics (code); unit-economics scored 2 (< 3)
- **Required changes:**
  - Reduce the COGS of the reward to comply with unit economics (e.g., shorten the trial duration, limit message count in the trial, or use a cheaper model tier instead of full text-premium for 30 minutes, since current cost $0.0090 exceeds low-end net revenue $0.0063).
  - Fix the grounding error in the patch definition where an unknown resource 'Deep Reasoning Trial' was referenced instead of existing resources or entitlements.
- **Top concern:** Unit economics violation where the cost to serve premium text inference for 30 minutes ($0.0090) exceeds net revenue per view at the low end ($0.0063), resulting in negative margins per completed view.


## P4: Sponsored Advanced Services 15m Trial — REJECT

> Offer a 15-minute trial of Luzia+ Advanced services after declining the account wall.

- product-change · TAX-2 · surface ns1 · reward 15 minutes of Luzia+ Advanced services · caps 1/day

#### Round 0 (v1): **REVISE** · weighted 4.1 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | edge element "Maybe later" is not on s07 and not declared |
| label | code | fixable | pass | declares new mechanic "Rewarded Trial Access" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | **FAIL** | the patch adds 0.5 "plan" of Luzia+ Subscription on REWARD_VERIFIED |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The proposal targets the Create Account Sheet (s07) and offers premium services, which are SFW and not sensitive. |
| no-incentivized-action | llm | policy | pass | The reward is a 30-minute trial of service features, with no incentive for clicks or installs. |
| no-loss-framing | llm | policy | pass | The offer is presented as a trial 'Try Advanced Services' rather than using loss-framing or hostage tactics. |
| explicit-opt-in | llm | fixable | pass | The proposal explicitly states it is an 'opt-in rewarded ad' with a 'Play Now' CTA. |
| disclosed | llm | fixable | pass | The offer explicitly discloses: 'Watch a 15-second game to get 30 minutes of Advanced Services'. |
| free-decline | llm | fixable | pass | The offer includes a 'No thanks' button, allowing users to decline without penalty. |
| no-stream-interrupt | llm | fixable | pass | The offer triggers on the Create Account Sheet (s07), which is a static screen, not a streaming chat response. |
| not-for-subscribers | llm | fixable | pass | The proposal explicitly limits eligibility to 'Non-subscribers'. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | The trial is offered exactly when the user hits the account wall after attempting a premium task, which is the ideal moment of need. |
| product-integrity | 15 | 4 | The transition is modal and clearly separated from the chat flow, though it must ensure that the user's previously attempted task is resumed immediately upon granting the trial. |
| cannibalization-safety | 15 | 4 | Gated to account-wall decliners and limited to 30 minutes and 1x/day, providing a clear sampling effect without giving away the full long-term entitlement. |
| unit-economics | 10 | 2 | The proposal acknowledges text-premium COGS (text-premium x 1). At $0.0090 cost vs $0.0063 net revenue, this is currently a loss-leader requiring adjustment. |
| reach | 10 | 4 | Targeting the Create Account Sheet (s07) captures users hitting the wall, a frequent point in the monetization loop. |
| feasibility | 10 | 4 | The patch requires a modal and logic to gate Advanced services access for 30 minutes, which is straightforward. |
| specificity | 10 | 4 | References 'Luzia+', 'Create Account Sheet', and specific services like 'bookings' and 'alerts'. |
| frequency-fatigue | 5 | 5 | Capped at 1x/day, which is conservative and prevents nagging. |
| measurability | 5 | 5 | Includes conversion rate, retention, and time spent, with a clear 8-week holdout plan. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); fixable gate failed: economics (code); fixable gate failed: reward-coherence (code); unit-economics scored 2 (< 3)
- **Required changes:**
  - Reduce the trial duration or limit the number of Advanced Service calls to bring COGS below the net revenue-per-view threshold ($0.0063).
  - Correct the patch grounding: there is no 'Maybe later' on s07; the action should be bound to the 'Close sheet' or 'BACK' event.
  - Fix reward coherence: A subscription 'plan' cannot be granted as a float (0.5 plan). Use a 'TrialToken' resource to gate the features instead.
- **Top concern:** The economics: The cost to serve text-premium requests ($0.0090) exceeds the net revenue per view ($0.0063) in the baseline scenario, making the 30-minute unlimited trial economically unsustainable.

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `title`: "Sponsored Advanced Services 30m Trial" → "Sponsored Advanced Services 15m Trial"
- `oneLiner`: "Offer a 30-minute trial of Luzia+ Advanced services after declining the account wall." → "Offer a 15-minute trial of Luzia+ Advanced services after closing the account wall."
- `anchor.newMechanic.description`: "After a user dismisses the Create Account wall, surface an opt-in rewarded ad to unloc..." → "After a user closes the Create Account sheet, surface an opt-in rewarded ad to unlock ..."
- `trigger`: "User taps 'Maybe later' on the Create Account Sheet (s07) after attempting a premium-g..." → "User taps 'Close sheet' on the Create Account Sheet (s07) after attempting a premium-g..."
- `offer.title`: "Try Advanced Services" → "Try Advanced Services Free"
- `offer.body`: "Watch a 15-second game to get 30 minutes of Advanced Services (bookings & alerts) for ..." → "Play a quick 15-second game to unlock 15 minutes of Advanced Services."
- `reward.what`: "30 minutes of Luzia+ Advanced services" → "15 minutes of Luzia+ Advanced services"
- `reward.resource`: "r1" → "r4 Advanced Service Trial Token (new)"
- `reward.duration`: "30 minutes" → "15 minutes"
- `cannibalizationGuard`: "The trial is time-boxed (30m) and limited to 1x/day, protecting the long-term value of..." → "The trial is time-boxed (15m) and limited to 1x/day, protecting the long-term value of..."
- `assumptions.cogs`: "text-premium" → "text-cheap"
- `risks[0]`: "Advanced services are compute-intensive (text-premium COGS); trial usage must be throt..." → "Advanced services use compute resources; trial usage must be monitored to ensure susta..."
- `risks[1]`: "Users may perceive the ad path as sufficient and not upgrade." → "Users may perceive the ad path as sufficient and delay upgrading."
- `patch.newScreens[0].change`: "Rewarded trial offer modal appearing after declining account creation on s07." → "Rewarded trial offer modal appearing after closing account creation on s07."
- `patch.newEdges[0].el`: "Maybe later" → "Close sheet"
- `patch.newEdges[1].effects[0].resource`: "r1" → "r4 Advanced Service Trial Token (new)"
- `patch.newEdges[1].effects[0].delta`: 0.5 → 1
- `storyboard[0].callouts[0].text`: "User wants Advanced services but hits paywall." → "User wants Advanced services."
- `storyboard[0].caption`: "User tries to start an Advanced service task." → "User tries an Advanced service task."
- `storyboard[1].callouts[0].text`: "Trial offer appears only after decline." → "Trial offer appears on close."
- `storyboard[1].caption`: "User declines account creation, sees rewarded offer." → "User closes account sheet, sees offer."
- `storyboard[2].callouts[0].text`: "Play 15s game for 30m of Advanced Services." → "Play 15s game for 15m trial."
- `storyboard[3].callouts[0].text`: "Luzia plays along in the game." → "Luzia plays along in game."
- `storyboard[3].caption`: "Luzia partners with user to play mini-game." → "Luzia partners with user in mini-game."
- `storyboard[4].counters[0].resource`: "r1" → "r4 Advanced Service Trial Token (new)"
- `storyboard[4].callouts[0].text`: "30 minutes of premium access granted!" → "15 minutes of access granted!"
- `anchor.economy[1]`: (none) → "r4 Advanced Service Trial Token (new)"

#### Round 1 (v2): **REVISE** · weighted 4.7 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | edge element "Close sheet" is not on s07 and not declared |
| label | code | fixable | pass | declares new mechanic "Rewarded Trial Access" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The proposal focuses on 'Advanced services' like bookings and shopping, which are SFW. |
| no-incentivized-action | llm | policy | pass | No incentive for clicks, installs, or ratings; the reward is a time-boxed entitlement. |
| no-loss-framing | llm | policy | pass | The proposal uses 'Try Advanced Services Free', which is gain-oriented. |
| explicit-opt-in | llm | fixable | pass | The user taps 'Play Now' after the trial offer is shown. |
| disclosed | llm | fixable | pass | The proposal states: 'Play a quick 15-second game to unlock 15 minutes of Advanced Services'. |
| free-decline | llm | fixable | pass | The proposal includes a 'No thanks' button, allowing users to return to the app. |
| no-stream-interrupt | llm | fixable | pass | The trigger occurs on closing the account wall, not during a streaming conversation. |
| not-for-subscribers | llm | fixable | pass | Eligibility is explicitly set to 'Non-subscribers'. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | The reward is offered exactly when the user hits a paywall (s07) trying to start an 'Advanced service' task. |
| product-integrity | 15 | 5 | Uses a native, time-boxed trial that fits the Luzia+ Advanced services value proposition; uses 'Luzia' as the game partner. |
| cannibalization-safety | 15 | 5 | The trial is time-boxed (15m), limited to once per day, and triggers only after a user declines the subscription wall. |
| unit-economics | 10 | 5 | COGS $0.0018 is significantly less than the estimated net revenue per view ($0.009-$0.015), ensuring a sustainable margin. |
| reach | 10 | 4 | Triggers on the account wall (s07), which is a common monetization funnel step. |
| feasibility | 10 | 4 | The proposal maps to SIM-RWD units; requires minimal backend changes to grant a 15-minute trial token. |
| specificity | 10 | 4 | Uses the correct app nouns ('Luzia+', 'Advanced services', 'Create Account Sheet'). |
| frequency-fatigue | 5 | 5 | One-per-day cap is well-designed for a non-game app. |
| measurability | 5 | 5 | Primary metric (conversion) and holdout (10% for 8 weeks) are well-defined. |

- **Verdict reasons (code):** fixable gate failed: grounding (code)
- **Required changes:**
  - Correct the trigger mapping: 'Close sheet' is not a listed element ID on s07. Use the existing 'Upgrade to Luzia+' (e7) or 'Continue with limited access' (e9) or a defined back navigation action.
  - Ensure the trial token specifically maps to the defined Luzia+ Advanced Services ('bookings, shopping, alerts, reminders').
- **Top concern:** The proposal references a non-existent trigger element 'Close sheet' on s07; the trigger action must be grounded in the existing screen elements (e7, e9, or back-navigation).

#### Changes v2 → v3 (revise() saw the required changes, never the scores)

- `oneLiner`: "Offer a 15-minute trial of Luzia+ Advanced services after closing the account wall." → "Offer a 15-minute trial of Luzia+ Advanced services after declining the account wall."
- `anchor.moments[1]`: "m10" → "m2"
- `anchor.newMechanic.description`: "After a user closes the Create Account sheet, surface an opt-in rewarded ad to unlock ..." → "After a user declines the Create Account sheet via back navigation, surface an opt-in ..."
- `trigger`: "User taps 'Close sheet' on the Create Account Sheet (s07) after attempting a premium-g..." → "User initiates back navigation (a07_9) on the Create Account Sheet (s07) after attempt..."
- `patch.newScreens[0].change`: "Rewarded trial offer modal appearing after closing account creation on s07." → "Rewarded trial offer modal appearing after declining account creation."
- `patch.newEdges[0].el`: "Close sheet" → "a07_9"
- `storyboard[1].callouts[0].text`: "Trial offer appears on close." → "Trial offer appears on decline."
- `storyboard[1].caption`: "User closes account sheet, sees offer." → "User declines account sheet, sees offer."
- `anchor.moments[2]`: (none) → "m9"
- `anchor.moments[3]`: (none) → "m10"

#### Round 2 (v3): **REJECT** · weighted 4 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | edge element "a07_9" is not on s07 and not declared |
| label | code | fixable | pass | declares new mechanic "Rewarded Trial Access" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Proposal targets general Luzia+ Advanced services and chats, which are SFW. |
| no-incentivized-action | llm | policy | pass | Reward is in-app trial access; no cash or click-to-earn logic. |
| no-loss-framing | llm | policy | pass | Fallback design, not hostage or loss framing. |
| explicit-opt-in | llm | fixable | pass | Offer includes a 'Play Now' CTA. |
| disclosed | llm | fixable | pass | States 15s game and 15m trial duration. |
| free-decline | llm | fixable | pass | Includes 'No thanks' decline option. |
| no-stream-interrupt | llm | fixable | pass | Triggered on paywall decline, not mid-response. |
| not-for-subscribers | llm | fixable | pass | Explicitly gated to non-subscribers. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | Excellent timing: triggered right when a user hits the paywall ('s07') after being unable to perform an Advanced service task. |
| product-integrity | 15 | 5 | Feels native; uses Luzia as the Game Partner and offers a trial that doesn't degrade existing features. |
| cannibalization-safety | 15 | 4 | Trial is time-boxed (15m) and limited to 1/day. It creates a sampling effect without giving away permanent access. |
| unit-economics | 10 | 5 | COGS is $0.0018 per view, which is well below the net revenue per view ($0.009-$0.015). |
| reach | 10 | 3 | Triggered on s07 (Create Account Sheet), which is frequent, but relies on the user performing specific tasks. |
| feasibility | 10 | 2 | The edge 'a07_9' used in the patch does not exist in the provided digest for s07. Requires correction. |
| specificity | 10 | 4 | Uses Luzia+, s07, and refers to 'Advanced Services' correctly from the digest. |
| frequency-fatigue | 5 | 4 | 1/day cap and 60m cooldown are appropriate and respectful. |
| measurability | 5 | 5 | Well-defined primary KPI and a 10% holdout for 8 weeks. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); feasibility scored 2 (< 3); still REVISE after round 2
- **Required changes:**
  - Correct the edge definition in the proposal patch (a07_9 does not exist for s07 in the digest).
  - Specify the exact interaction that triggers the rewarded trial on s07 if the user performs back navigation (e.g., mapping back-button interaction to the new modal).
- **Top concern:** The proposal refers to an invalid navigation edge (a07_9) for the s07 screen, making the trigger implementation technically undefined based on the provided digest.


## P5: Save a Favorite Message with Ad — REJECT

> Allow non-registered users to save favorite messages by watching a short game, increasing engagement without forcing signup.

- product-change · AI-11 · surface Favorite messages (s21) · reward 1 favorite message save · caps 3/day

#### Round 0 (v1): **REJECT** · weighted 2.7 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | economy item "r2 (Account Access)" does not exist; storyboard today: counter on unknown resource "favorite_slot"; storyboard change: counter on unknown resource "favorite_slot"; storyboard offer: counter on unknown resource "favorite_slot"; storyboard ad: counter on unknown resource "favorite_slot"; storyboard value: counter on unknown resource "favorite_slot" |
| label | code | fixable | pass | declares new mechanic "Rewarded Favorite" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | **FAIL** | "Favorite messages" asks the user to sign up for a feature: an offer beside the sign-up button stands in for the account; show it only after the user declines (e.g. taps "Maybe later"); the reward is "View Favorite messages", which only an account unlocks: an ad cannot stand in for signing up |
| sfw | llm | policy | pass | Screen s21 is the Favorite messages page featuring Luzia, which is SFW and age-appropriate. |
| no-incentivized-action | llm | policy | pass | The reward is 1 favorite message save slot, with no incentives for clicks, installs, or cash-like rewards. |
| no-loss-framing | llm | policy | pass | The offer uses gain framing ('save this message') without loss framing, fake timers, or confirmshaming. |
| explicit-opt-in | llm | fixable | pass | The user taps an explicit CTA ('Play Now') to opt into the rewarded mini-game. |
| disclosed | llm | fixable | pass | The offer clearly states 'Play a 15-second game with Luzia to save this message'. |
| free-decline | llm | fixable | pass | An equally legible decline option ('No thanks') is provided, returning the user without penalty. |
| no-stream-interrupt | llm | fixable | pass | The offer appears at the favorite-saving wall boundary (s21), not interrupting a streaming AI response. |
| not-for-subscribers | llm | fixable | pass | Eligibility is restricted to non-registered users who lack account access. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 2 | Users want to save favorite messages, but account-only features cannot be bypassed directly by ads standing in for accounts. |
| product-integrity | 15 | 1 | Violates Rule #8: An ad never stands in for creating an account. Account-only features like saving messages must require signup or be offered only after account signup is declined. |
| cannibalization-safety | 15 | 2 | Undermines the core account creation funnel by offering ad-based access to account-only features instead of requiring signup. |
| unit-economics | 10 | 4 | Cost to serve storage slot is zero, well within revenue per view. |
| reach | 10 | 3 | Saving messages happens frequently in core usage, but gating misaligns with signup flows. |
| feasibility | 10 | 3 | Maps to SIM-RWD on s21, but requires handling temporary saves without persistent accounts. |
| specificity | 10 | 4 | References screen s21 ('Favorite messages') and the Luzia character from the digest. |
| frequency-fatigue | 5 | 4 | Capped at 3 per day with a 10-minute cooldown. |
| measurability | 5 | 5 | Specifies primary metric, guardrails, and a 10% user-level holdout for 4 weeks. |

- **Verdict reasons (code):** weighted 2.7 < 3
- **Required changes:**
  - Restructure the flow so account sign-up remains the primary path on the wall, and the rewarded ad is offered only after the user declines sign-up (paywall-decline fallback).
  - Correct economy grounding references in the proposal to align with the product digest (e.g., Account Access entitlement).
- **Top concern:** P5 violates Rule #8 by attempting to use a rewarded ad to bypass account creation for an account-only feature (saving favorites), rather than keeping sign-up as the primary path and offering ads only upon decline.

