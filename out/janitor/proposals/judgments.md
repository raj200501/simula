# Judgments: Janitor

Verdicts are computed in code: SHIP at weighted ≥ 3.8 with every criterion ≥ 3 and every gate passing; REVISE between 3 and 3.8, on any criterion ≤ 2, or on a fixable gate; REJECT below 3, on a policy gate, or still REVISE after round 2 (or when a revision stalls: < +0.2 and no gate fixed). Only SHIP goes to the slides.

Weights: value-moment-fit 20, product-integrity 15, cannibalization-safety 15, unit-economics 10, reach 10, feasibility 10, specificity 10, frequency-fatigue 5, measurability 5.

## Summary

| proposal | title | final | weighted | versions | summary |
|---|---|---|---|---|---|
| P1 | Paywall Fallback Swipes | **REJECT** | 4.8 | v1 → v2 | REJECT after 1 revision: policy gate failed: sfw (llm). Top concern: grounding (code): economy item "plan" does not exist; economy item "base_swipes (new)" does not exist; reward resource "base_swipes" does not exist; edge effect on unknown resource "base_swipes"; storyboard today: counter on unknown resource "base_swipes"; storyboard change: counter on unknown resource "base_swipes"; storyboard offer: counter on unknown resource "base_swipes"; storyboard ad: counter on unknown resource "base_swipes" |
| P2 | Session Context Boost | **REJECT** | 4.15 | v1 → v2 | REJECT after 1 revision: revision stalled (weighted -0.35, below +0.2) with the same gate failures. Top concern: economics (code): Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end. |
| P3 | Daily Check-in Swipe | **REJECT** | 4.35 | v1 → v2 | REJECT after 1 revision: revision stalled (weighted +0.05, below +0.2) with the same gate failures. Top concern: economics (code): Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end. |

## P1: Paywall Fallback Swipes — REJECT

> Provide non-paying users with limited base model swipes in exchange for engagement when they decline a premium paywall.

- existing · TAX-10 · surface ns1 · reward 3 base model swipes · caps 2/day

#### Round 0 (v1): **REVISE** · weighted 3.5 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | economy item "plan" does not exist; economy item "swipes (new)" does not exist; reward resource "swipes" does not exist; edge effect on unknown resource "swipes"; storyboard today: counter on unknown resource "swipes"; storyboard change: counter on unknown resource "swipes"; storyboard offer: counter on unknown resource "swipes"; storyboard ad: counter on unknown resource "swipes" |
| label | code | fixable | pass | cites observed economy items: of1, w1 |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0270) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | "surface": "s04" |
| no-incentivized-action | llm | policy | pass | "what": "3 frontier model swipes", "body": "Play a quick 15-second game to get 3 free swipes on our frontier models." |
| no-loss-framing | llm | policy | pass | "title": "Want 3 free swipes?", "body": "Play a quick 15-second game to get 3 free swipes on our frontier models.", "cta": "Play Game", "decline": "No thanks" |
| explicit-opt-in | llm | fixable | pass | "trigger": "Fires immediately after the user taps the decline option ('Not now') on the Janitor Plus paywall." |
| disclosed | llm | fixable | pass | "body": "Play a quick 15-second game to get 3 free swipes on our frontier models." |
| free-decline | llm | fixable | pass | "An equally legible secondary button labeled 'No thanks' that dismisses the fallback offer and routes the user back to their profile." |
| no-stream-interrupt | llm | fixable | pass | "Fires immediately after the user taps the decline option ('Not now') on the Janitor Plus paywall." |
| not-for-subscribers | llm | fixable | pass | "eligibility": "Non-paying, non-subscribed users who dismiss the premium subscription offer s04." |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | The proposal gates on the dismissal of paywall s04 (m3) and offers a temporary sample of 3 premium swipes. This is a classic TAX-10 paywall decline fallback. However, since the free tier currently does not track swipes, it requires introducing a new resource tracking mechanism. |
| product-integrity | 15 | 4 | The modal ns1 intercepts the paywall decline to offer a rewarded ad. While intercepting a decline can be slightly intrusive, it is standard for TAX-10 and does not degrade the core roleplay experience. |
| cannibalization-safety | 15 | 4 | Gated strictly to non-payers upon paywall decline, with a daily cap of 6 swipes total. A 5% holdout is planned over 28 days to monitor downstream conversion, ensuring the 'generous' paid tier remains superior. |
| unit-economics | 10 | 1 | Cost to serve ($0.0270) exceeds the net ad revenue per view ($0.0063 at the low end, and $0.0150 at the absolute high end) because it uses premium model text generation. No mitigation or transition to a cheaper model is proposed. |
| reach | 10 | 2 | Gated on s04 decline (Janitor Plus Paywall), which the digest identifies as a rare screen ('reach=rare'), meaning few users will encounter this specific trigger daily. |
| feasibility | 10 | 2 | Maps cleanly to SIM-RWD. However, grounding fails because the free tier currently has no concept of swipes, requiring significant backend changes to introduce and enforce a new consumable swipe currency. |
| specificity | 10 | 5 | Highly specific to Janitor Plus, referencing screen s04, element e12 ('Not now'), and e8 ('Generous monthly swipes with our frontier models'). |
| frequency-fatigue | 5 | 5 | Implements a daily cap of 2 entries and a 12-hour cooldown (720 min) to prevent user fatigue and repetitive prompts. |
| measurability | 5 | 5 | Excellent experiment design featuring a 5% user-level holdout group for 28 days, with Ad ARPDAU as primary and purchase conversion and retention as guardrails. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); fixable gate failed: economics (code); unit-economics scored 1 (< 3); reach scored 2 (< 3); feasibility scored 2 (< 3); weighted 3.5 < 3.8
- **Required changes:**
  - Reduce the reward cost by switching from premium frontier swipes to cheaper base model swipes to ensure cost to serve ($0.0270) does not exceed net ad revenue ($0.0090-$0.0150).
  - Expand the placement to include s03 ('More memory for long chats'), which is a more frequent paywall entry point than the rare s04 paywall.
  - Ground the new swipes resource by detailing how free swipes are tracked on the backend and displayed to users in the UI.
- **Top concern:** The cost to serve 3 premium model swipes ($0.0270) is more than double the maximum gross ad revenue generated from a single completed view ($0.0150), resulting in highly negative unit economics with no mitigation plan.

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `oneLiner`: "Provide non-paying users with limited frontier model swipes in exchange for engagement..." → "Provide non-paying users with limited base model swipes in exchange for engagement whe..."
- `anchor.moments[0]`: "m3" → "m1"
- `anchor.economy[3]`: "swipes (new)" → "base_swipes (new)"
- `surface`: "s04" → "ns1"
- `trigger`: "Fires immediately after the user taps the decline option ('Not now') on the Janitor Pl..." → "Fires immediately after the user taps the decline option ('Close paywall' on s03 or 'N..."
- `eligibility`: "Non-paying, non-subscribed users who dismiss the premium subscription offer s04." → "Non-paying, non-subscribed users who dismiss the premium subscription offer from s03 o..."
- `offer.body`: "Play a quick 15-second game to get 3 free swipes on our frontier models." → "Play a quick 15-second game to get 3 free swipes on our base models."
- `reward.what`: "3 frontier model swipes" → "3 base model swipes"
- `reward.resource`: "swipes" → "base_swipes"
- `cannibalizationGuard`: "The offer is gated purely on paywall decline (TAX-10). It is strictly capped at 2 inst..." → "The offer is gated purely on paywall decline (TAX-10). It is strictly capped at 2 inst..."
- `assumptions.cogs`: "text-premium" → "text-cheap"
- `kpis.guardrails[0]`: "Paywall s04 purchase conversion rate" → "Paywall s03 and s04 purchase conversion rate"
- `patch.newEdges[1].from`: "ns1" → "s03"
- `patch.newEdges[1].el`: "ne1" → "e3"
- `patch.newEdges[1].to`: "rwd" → "ns1"
- `patch.newEdges[1].effects[0].resource`: "swipes" → (none)
- `patch.newEdges[1].effects[0].delta`: 3 → (none)
- `patch.newEdges[2].el`: "ne2" → "ne1"
- `patch.newEdges[2].to`: "s02" → "rwd"
- `storyboard[0].counters[0].resource`: "swipes" → "base_swipes"
- `storyboard[0].caption`: "Today, when a user declines Janitor Plus on the paywall screen, they are returned dire..." → "Today, when a user declines Janitor Plus on either paywall screen (s03 or s04), they a..."
- `storyboard[1].counters[0].resource`: "swipes" → "base_swipes"
- `storyboard[1].caption`: "We introduce a product change that intercepts the paywall decline action to offer a re..." → "We introduce a product change that intercepts paywall decline actions from both s03 an..."
- `storyboard[2].counters[0].resource`: "swipes" → "base_swipes"
- `storyboard[2].caption`: "The fallback modal ns1 appears, explicitly offering 3 free frontier swipes for playing..." → "The fallback modal ns1 appears, explicitly offering 3 free base model swipes for playi..."
- `storyboard[3].counters[0].resource`: "swipes" → "base_swipes"
- `storyboard[4].counters[0].resource`: "swipes" → "base_swipes"
- `storyboard[4].callouts[0].node`: "e6" → "ne3"
- `storyboard[4].callouts[0].text`: "User gets 3 swipes credited to their account." → "User gets 3 base model swipes credited. Counter visible on Profile menu."
- `storyboard[4].caption`: "Upon REWARD_VERIFIED, 3 swipes are credited, and the user is redirected to s02 to begi..." → "Upon REWARD_VERIFIED, 3 base model swipes are credited, and the user is redirected to ..."
- ... and 21 more changes

#### Round 1 (v2): **REJECT** · weighted 4.8 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | economy item "plan" does not exist; economy item "base_swipes (new)" does not exist; reward resource "base_swipes" does not exist; edge effect on unknown resource "base_swipes"; storyboard today: counter on unknown resource "base_swipes"; storyboard change: counter on unknown resource "base_swipes"; storyboard offer: counter on unknown resource "base_swipes"; storyboard ad: counter on unknown resource "base_swipes" |
| label | code | fixable | pass | cites observed economy items: of1, w1 |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | **FAIL** | While screens s03 and s04 are generic paywalls, the app contains characters and scenarios involving 'cancer' (s09) and 'neglectful family' (s12). The proposal lacks mention of topic-sensitivity screening or moderation-score gating required to keep ads away from sensitive topics [POL-7, SAFE-1]. |
| no-incentivized-action | llm | policy | pass | The reward is '3 base model swipes', an in-app consumable with no cash-like value or incentive for installs/clicks. |
| no-loss-framing | llm | policy | pass | The proposal uses a positive fallback frame ('Want 3 free swipes?') with an 'equally legible secondary button' for declining, avoiding dark patterns or 'support us' copy. |
| explicit-opt-in | llm | fixable | pass | The user must tap the primary button labeled 'Play Game' on screen ns1 before any ad is served. |
| disclosed | llm | fixable | pass | The invitation explicitly states the reward and the action: 'Play a quick 15-second game to get 3 free swipes on our base models.' |
| free-decline | llm | fixable | pass | Declining via 'No thanks' returns the user to the profile menu (s02) without penalty or loss of functionality. |
| no-stream-interrupt | llm | fixable | pass | The trigger is 'Paywall decline', which is a transition boundary occurring after the user dismisses a blocked context memory/swipe wall (m1/m3). |
| not-for-subscribers | llm | fixable | pass | Eligibility is restricted to 'Non-paying, non-subscribed users' who are not already entitled to the premium 'frontier model swipes'. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | The reward (swipes) perfectly addresses the user's immediate intent when they hit a context memory/swipe wall and then decline the premium subscription. |
| product-integrity | 15 | 5 | The proposal preserves the roleplay flow by triggering only on paywall dismissal and uses an additive 'base model' reward that doesn't degrade existing free value. |
| cannibalization-safety | 15 | 5 | Gating on paywall decline (TAX-10), restricted to a 'base model' and capped at 2 instances/day ensures Janitor Plus remains the superior option. Includes a 5% holdout. |
| unit-economics | 10 | 4 | Cost to serve ($0.0054) is 45-60% of US net revenue per view. This is within safe bounds but above the 30% threshold for a top score. |
| reach | 10 | 5 | Triggers from paywall decline (m2), which is categorized as 'frequent' reach in the product digest. |
| feasibility | 10 | 4 | Maps to SIM-RWD and uses a standard invitation entry, though it requires backend logic for a new 'base model' swipe type and daily counter. |
| specificity | 10 | 5 | Heavily leverages app-specific nouns like 'Janitor Plus', 'frontier model swipes', and navigates precisely between s03/s04 and the profile (s02). |
| frequency-fatigue | 5 | 5 | Explicitly caps at 2 per day with a 12-hour cooldown to prevent repetitive prompting. |
| measurability | 5 | 5 | Proposes Ad ARPDAU as the primary KPI, includes purchase conversion guardrails, and specifies a user-level holdout. |

- **Verdict reasons (code):** policy gate failed: sfw (llm)
- **Required changes:**
  - Add brand-safety controls to suppress the rewarded offer if the preceding character interaction or session context involves sensitive topics such as health, self-harm, or politics [POL-7].
  - Implement moderation-score gating to ensure the ad surface is only triggered on SFW-rated characters and pass the 'nsfw' flag to the Simula SDK.
  - Clarify that the 'base model swipes' reward does not grant access to 'Limitless' or NSFW model capabilities if those are reserved for Janitor Plus.
- **Top concern:** Adjacency to sensitive content. The app features roleplay themes including 'cancer' and 'neglectful family'; the proposal must incorporate moderation filters to prevent ad delivery in these sensitive contexts.


## P2: Session Context Boost — REJECT

> Unlock 30 minutes of 5x context memory by playing a quick mini-game after declining the Janitor Plus paywall.

- existing · TAX-2 · surface More memory for
long chats. (s03) · reward 30 minutes of 5x context for better memory · caps 2/day

#### Round 0 (v1): **REVISE** · weighted 4.5 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | cites observed economy items: of1 |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | surface: s03", "eligibility: Non-subscribers who dismiss the Janitor Plus paywall. |
| no-incentivized-action | llm | policy | pass | Play a quick 15-second game for 30 minutes of 5x context. |
| no-loss-framing | llm | policy | pass | Title: Boost Memory for 30 Minutes", "decline: No Thanks |
| explicit-opt-in | llm | fixable | pass | cta: Play Now", "decline: No Thanks |
| disclosed | llm | fixable | pass | Body: Play a quick 15-second game for 30 minutes of 5x context. |
| free-decline | llm | fixable | pass | newElements: [{id: ne3, in: ns1, near: ne2, place: after, change: No Thanks button to return to core flow.}], newEdges: [{from: ns1, el: ne3, to: s01, effects: []}] |
| no-stream-interrupt | llm | fixable | pass | trigger: User taps Close paywall (e3) on s03 without purchasing a subscription. |
| not-for-subscribers | llm | fixable | pass | eligibility: Non-subscribers who dismiss the Janitor Plus paywall. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | The user just declined a paywall (s03, m2) offering "5x context for better memory" (e10). The reward is "30 minutes of 5x context for better memory". This directly addresses one of the key benefits just seen on the paywall and desired by the user. [TAX-2] |
| product-integrity | 15 | 5 | The proposal triggers after dismissing a paywall, not during core chat, preserving the flow and user input. The reward is a time-boxed boost of an existing feature (5x context). The 'Game Partner' is "Janitor", which can integrate natively with the app's branding. The offer is an overlay, so it doesn't remove value from the free experience. |
| cannibalization-safety | 15 | 5 | Eligibility is restricted to "Non-subscribers who dismiss the Janitor Plus paywall." The reward is "30 minutes of 5x context", which is time-boxed and temporary, contrasting with the permanent benefits of the subscription (of1). A "5% randomized user-level holdout for 30 days" is planned. [CANN-4, TAX-2, MEAS-5] |
| unit-economics | 10 | 1 | The cost to serve per view is $0.0090 (text-premium x 1). One completed US view earns $0.0090–$0.0150. The computed low-end net revenue per view is $0.0063, which is less than the $0.0090 COGS, indicating the reward is unprofitable at the low end. [TRIG-4, MEAS-4] |
| reach | 10 | 4 | The trigger moment is m2: "The user dismisses More memory for long chats. ('Close paywall')", which is described as "reach=frequent" in the digest. This indicates a common path for non-subscribers. |
| feasibility | 10 | 5 | The proposal uses an existing Simula unit (SIM-RWD) with an 'invitation' entry point and specified minPlaySec and Game Partner. It describes new screens as overlays and defines clear new edges, including server-side verification with REWARD_VERIFIED. This maps well to existing SDK capabilities and an iterative development approach. |
| specificity | 10 | 5 | The proposal uses specific nouns from the digest: 'Janitor Plus' (of1), '5x context for better memory' (e10 from s03), and targets screen 's03' with element 'e3'. It names 'Janitor' as the Game Partner. This is tailored to the app. |
| frequency-fatigue | 5 | 5 | The proposal includes explicit caps of 'perDay: 2' and a 'cooldownMin: 120', which are reasonable limits for a time-boxed premium unlock and prevent overuse or user annoyance. [TRIG-3] |
| measurability | 5 | 5 | The proposal clearly defines a 'primary' KPI (Rewarded ad revenue per DAU from paywall decliners), 'guardrails' (Janitor Plus subscription conversion rate, D7 chat retention), and a 'holdout' strategy ('5% randomized user-level holdout for 30 days'). [MEAS-5] |

- **Verdict reasons (code):** fixable gate failed: economics (code); unit-economics scored 1 (< 3)
- **Required changes:**
  - Adjust reward COGS or quantity: The current cost of the 'text-premium' reward ($0.0090) exceeds the low-end net revenue per view ($0.0063). This should be addressed by either using a cheaper model for the '5x context' boost, reducing the implied usage of the premium model per view, or providing a quantified justification for this as a loss-leader investment for conversion.
- **Top concern:** The reward's cost to serve exceeds the net revenue per view at the low end, making the proposal potentially unprofitable.

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `reward.resource`: "of1" → "premium_context_30min"
- `risks[0]`: "Inference COGS for 5x context during the 30-minute window must be offset by US/Tier-1 ..." → "The average inference COGS for providing 30 minutes of 5x context using a cheaper mode..."
- `patch.newEdges[1].effects[0].resource`: "of1" → "premium_context_30min"
- `anchor.economy[1]`: (none) → "premium_context_30min (new)"
- `reward.amount`: (none) → 1

#### Round 1 (v2): **REVISE** · weighted 4.15 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | cites observed economy items: of1 |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The proposal focuses on Janitor's roleplay platform and offers a 30-minute context boost. All surfaces mentioned (s03) are for subscription management. |
| no-incentivized-action | llm | policy | pass | The reward is for in-app benefits (context memory) and not for clicks, installs, or cash-like rewards. |
| no-loss-framing | llm | policy | pass | The proposal uses a standard paywall-decline fallback and avoids dark patterns or hostaging. |
| explicit-opt-in | llm | fixable | pass | The proposal specifies an explicit 'Play Now' CTA (ne2) and a decline option (ne3). |
| disclosed | llm | fixable | pass | The offer text 'Play a quick 15-second game for 30 minutes of 5x context' clearly states the reward and the action before the ad. |
| free-decline | llm | fixable | pass | A 'No Thanks' button returns the user to the core flow (s01). |
| no-stream-interrupt | llm | fixable | pass | The trigger is a paywall decline (s03), which is at a navigation boundary, not mid-chat. |
| not-for-subscribers | llm | fixable | pass | Eligibility is strictly gated to 'Non-subscribers who dismiss the Janitor Plus paywall'. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | Fits TAX-10 perfectly. The user hits a wall for memory (s03) and is offered memory as a trial immediately upon dismissal. |
| product-integrity | 15 | 4 | The offer is an overlay on a paywall. It does not break the chat flow, preserve the user's current session state, and adds to the experience. |
| cannibalization-safety | 15 | 4 | Strictly limited to paywall decliners, capped at 2/day, and time-boxed to 30 minutes. It leaves the permanent plan (of1) clearly superior. |
| unit-economics | 10 | 2 | The code flags that cost-to-serve ($0.0090) exceeds the net revenue floor ($0.0063). While the proposer acknowledges this and suggests using a cheaper model, the current economics in the proposal are unverified and risky. |
| reach | 10 | 3 | Triggered by paywall declines, which is a high-intent segment but represents a small percentage of total DAU daily. |
| feasibility | 10 | 5 | Maps directly to SIM-RWD unit, using standard game partner and reward verification logic. |
| specificity | 10 | 5 | References 'Janitor Plus' (of1), '5x context' (of1), and screen 's03' explicitly. |
| frequency-fatigue | 5 | 5 | Explicit daily cap of 2 and a 120-minute cooldown. |
| measurability | 5 | 4 | Includes primary metrics, guardrails, and a specific user-level holdout plan. |

- **Verdict reasons (code):** fixable gate failed: economics (code); unit-economics scored 2 (< 3)
- **Required changes:**
  - Reduce the reward duration (e.g., to 15 minutes) or require a multi-ad bundle (e.g., 2 ads for 30 minutes) to bring the cost-to-serve below the net revenue per view.
  - Explicitly define the expected COGS for the proposed 'text-cheap' model if it is to be used as the basis for the trial, rather than relying on the general premium model cost.
- **Top concern:** The proposed reward currently costs more to serve than the net revenue generated per view, rendering the monetization design unsustainable.


## P3: Daily Check-in Swipe — REJECT

> Earn 1 daily bonus frontier model swipe by playing a 15-second mini-game in the Profile menu.

- product-change · TAX-9 · surface Profile menu (s02) · reward 1 bonus frontier model swipe · caps 1/day

#### Round 0 (v1): **REVISE** · weighted 4.3 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "Daily Check-in Swipes" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0450) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The surface is s02 (Profile menu). Profile menu is a generic, SFW settings/profile page containing elements like 'Settings', 'Billing', 'Main navigation'. |
| no-incentivized-action | llm | policy | pass | Earn 5 daily bonus frontier model swipes by playing a 15-second mini-game in the Profile menu. The reward is a virtual utility, not cash-like, and is given for playing, not clicking or installing. |
| no-loss-framing | llm | policy | pass | Daily swipes are strictly capped at 5 per day, which lets non-payers sample frontier AI responses. There is no loss framing or countdown pressure, and the decline option is a standard 'Maybe Later'. |
| explicit-opt-in | llm | fixable | pass | User taps the 'Daily Check-in' card on s02 (Profile menu). This opens the Simula invitation modal where the user must explicitly tap 'Play Now'. |
| disclosed | llm | fixable | pass | Play a 15-second game to claim 5 bonus frontier model swipes today. |
| free-decline | llm | fixable | pass | The decline option is 'Maybe Later'. Tapping it dismisses the modal and returns the user to the profile screen without any penalties. |
| no-stream-interrupt | llm | fixable | pass | The trigger is placed on s02 (Profile menu) which is outside of any active character chat, preventing any interruptions to streaming responses. |
| not-for-subscribers | llm | fixable | pass | Eligibility: Non-paying users who have not claimed today's check-in reward. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | The reward consists of 5 bonus frontier model swipes, which are highly valued and gated behind Janitor Plus (of1). Since this is placed as a proactive check-in (TAX-9) in the profile menu s02, it is a habit loop rather than a reactive moment-of-need trigger. |
| product-integrity | 15 | 5 | Daily Check-in Swipes is additive and does not degrade the core free experience. Gating the reward behind a silent profile menu card prevents chat interruptions and respects user roleplay immersion. |
| cannibalization-safety | 15 | 5 | Eligibility is restricted to non-payers. Daily swipes are capped at 5 per day (1 check-in per day), which is a tiny fraction compared to Janitor Plus's 'generous monthly swipes' and leaves other features like 5x context completely behind the paywall. A 5% holdout is scheduled. |
| unit-economics | 10 | 2 | Code-computed economics reveal that the cost to serve 5 frontier swipes is $0.0450 (text-premium x 5), which is 5x higher than the low-end net reward revenue of $0.0063. The net margins are deeply negative. |
| reach | 10 | 4 | The trigger occurs on s02 (Profile menu) which is frequently visited as part of character discovery navigation (f1). The proposed engaged share of 25% is realistic for a free daily utility. |
| feasibility | 10 | 4 | The setup maps easily to SIM-RWD and uses standard invitation kits. However, Janitor's backend currently does not track swipe counts or quotas for free users, which requires introducing a database tracking layer for non-payers. |
| specificity | 10 | 5 | The proposal refers specifically to Janitor Plus, s02 Profile Menu, Main Navigation, and 'frontier model swipes' which directly align with Janitor's current subscription offerings. |
| frequency-fatigue | 5 | 5 | Strictly limited to a daily cap of 1 claim per day with a 1440-minute cooldown. The UI does not push invasive popups upon app open or navigation transitions. |
| measurability | 5 | 5 | Well-designed metrics including D7/D30 active retention, Janitor Plus conversion rates as a guardrail, API token costs, and a robust 5% randomized user-level holdout over 30 days. |

- **Verdict reasons (code):** fixable gate failed: economics (code); unit-economics scored 2 (< 3)
- **Required changes:**
  - Reduce the daily check-in reward size from 5 frontier model swipes to 1 frontier model swipe. This drops the cost to serve per view to $0.0090, aligning it with the expected gross revenue ($0.0090–$0.0150) and preventing massive economic losses.
  - Implement database fields and tracking structures for free users on the backend to log and consume 'Frontier Swipes' before running the ad integration.
- **Top concern:** The cost to serve 5 frontier model swipes ($0.0450) is roughly 5 to 7 times higher than the net revenue earned per completed rewarded view ($0.0063), making the proposal economically unsustainable without downsizing the reward.

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `title`: "Daily Check-in Swipes" → "Daily Check-in Swipe"
- `oneLiner`: "Earn 5 daily bonus frontier model swipes by playing a 15-second mini-game in the Profi..." → "Earn 1 daily bonus frontier model swipe by playing a 15-second mini-game in the Profil..."
- `anchor.newMechanic.description`: "A daily check-in feature on the Profile menu where users claim 5 bonus frontier model ..." → "A daily check-in feature on the Profile menu where users claim 1 bonus frontier model ..."
- `anchor.newMechanic.whyNeeded`: "Janitor currently gates frontier model swipes behind the Janitor Plus subscription wit..." → "Janitor gates frontier model swipes behind Janitor Plus; this provides a small, ad-sup..."
- `offer.title`: "Daily Check-in Swipes" → "Daily Check-in Swipe"
- `offer.body`: "Play a 15-second game to claim 5 bonus frontier model swipes today." → "Play a 15-second game to claim 1 bonus frontier model swipe today."
- `reward.what`: "5 bonus frontier model swipes" → "1 bonus frontier model swipe"
- `reward.amount`: 5 → 1
- `cannibalizationGuard`: "Daily swipes are strictly capped at 5 per day, which lets non-payers sample frontier A..." → "The reward is strictly limited to 1 swipe per day, ensuring the Janitor Plus subscript..."
- `assumptions.cogsUnitsPerView`: 5 → 1
- `kpis.primary`: "Daily active user retention (D7/D30) and check-in completion rate on s02." → "Daily active user retention (D7/D30) on s02."
- `kpis.guardrails[1]`: "Non-payer D30 retention rate" → "Frontier model API token cost per active user"
- `kpis.guardrails[2]`: "Frontier model API token cost per active user" → (none)
- `risks[0]`: "Frontier model LLM token costs for 5 swipes per completed view" → "Frontier model LLM token cost for 1 swipe per view remains near the break-even ceiling..."
- `risks[1]`: "User disappointment if daily check-in swipes do not roll over to the next day" → "Requirement for backend database changes to track frontier swipe usage for non-payers"
- `patch.newElements[0].change`: "Add a Daily Check-in card displaying title 'Daily Check-in' and CTA 'Claim 5 Frontier ..." → "Add a Daily Check-in card displaying title 'Daily Check-in' and CTA 'Claim 1 Frontier ..."
- `patch.newEdges[0].effects[0].delta`: 5 → 1
- `patch.newEdges[0].guard.lt`: 5 → 1
- `storyboard[0].caption`: "Profile menu s02 displays navigation and subscription options." → "Profile menu s02 displays current navigation and subscription options."
- `storyboard[1].caption`: "Daily check-in module ne1 appears on Profile menu s02." → "A new daily check-in module ne1 appears on Profile menu s02."
- `storyboard[2].caption`: "Tapping check-in displays Simula reward offer with clear disclosures." → "Tapping check-in displays the Simula reward offer with exact terms."
- `storyboard[3].caption`: "User plays 15-second mini-game with Game Partner Janitor." → "User plays a 15-second mini-game with Game Partner Janitor."
- `storyboard[4].counters[0].value`: 5 → 1
- `storyboard[4].callouts[0].text`: "5 Frontier Swipes verified and credited." → "1 Frontier Swipe verified and credited."
- `storyboard[4].caption`: "REWARD_VERIFIED event credits 5 Frontier Swipes instantly." → "REWARD_VERIFIED event credits 1 Frontier Swipe instantly to the user."

#### Round 1 (v2): **REVISE** · weighted 4.35 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "Daily Check-in Swipes" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The proposal places the ad on s02 (Profile menu), which is a system/navigation surface. It uses 'Janitor' as the Game Partner, matching the app's brand. |
| no-incentivized-action | llm | policy | pass | The reward is '1 bonus frontier model swipe', which is an in-app utility used for roleplay content and is not cash-like. There are no mentions of rewarding clicks or installs. |
| no-loss-framing | llm | policy | pass | The proposal uses a daily check-in archetype (TAX-9) with a positive gain frame: 'Earn 1 daily bonus frontier model swipe'. There is no evidence of fake timers, forced ads, or 'support us' copy. |
| explicit-opt-in | llm | fixable | pass | The user must tap a new 'Daily Check-in' card (ne1) on s02, which then displays an offer invitation with a 'Play Now' CTA. |
| disclosed | llm | fixable | pass | The offer body states: 'Play a 15-second game to claim 1 bonus frontier model swipe today.' This clearly discloses both the action length and the reward. |
| free-decline | llm | fixable | pass | The offer includes an equally legible 'Maybe Later' decline button. Declining simply returns the user to the Profile menu (s02). |
| no-stream-interrupt | llm | fixable | pass | The placement is on the Profile menu (s02), a static navigation surface, and is not triggered during a chat or generation flow. |
| not-for-subscribers | llm | fixable | pass | The eligibility is restricted to 'Non-paying users who have not claimed today's check-in reward.' |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | The proposal targets 'Frontier model swipes', which the digest (of1) identifies as a core scarce benefit of the Janitor Plus subscription. Offering a single swipe via a check-in allows users to sample the premium model without hitting a hard wall (TAX-9). |
| product-integrity | 15 | 5 | The proposal adds a new 'Daily Check-in' card to the Profile menu. It does not interrupt chat flow or degrade existing free features. Using the 'Janitor' character as a game partner provides a native feel. |
| cannibalization-safety | 15 | 4 | Safety is high due to the strict limit of 1 swipe per day (Janitor Plus offers 'generous monthly swipes'). However, it grants a direct 'frontier model' swipe, which is a core subscription pillar. A 5% holdout is planned. |
| unit-economics | 10 | 2 | Economics are highly marginal. Code-computed cost to serve ($0.0090) exceeds net revenue per view ($0.0063) at the low end. The proposal acknowledges this as a risk but frames it as a sampling investment. |
| reach | 10 | 4 | The Profile menu (s02) is a 'frequent' surface (m4). While not the main chat screen, daily active users typically visit the profile for billing or settings, making it a viable hub for habit-building. |
| feasibility | 10 | 4 | Maps to SIM-RWD with 'invitation' entry and 15s play. The patch targets s02 with a new element ne1. It requires database tracking for swipes for non-payers, which is noted as a feasibility risk. |
| specificity | 10 | 5 | Uses app-specific nouns like 'Janitor Plus', 'frontier model swipes', and 's02 (Profile menu)'. It explicitly uses 'Janitor' as the Game Partner ID. |
| frequency-fatigue | 5 | 5 | Strictly capped at 1 per day with a 1440-minute (24h) cooldown. No re-offer behavior is specified, which prevents nagging. |
| measurability | 5 | 5 | Primary metric is retention (D7/D30) on s02. It includes a 5% randomized user-level holdout and guards against conversion rate drops. |

- **Verdict reasons (code):** fixable gate failed: economics (code); unit-economics scored 2 (< 3)
- **Required changes:**
  - Reduce the cost-to-serve by switching the reward from a 'frontier model' swipe to a 'standard model' swipe, or increase the required play actions to 2 views per swipe to ensure positive net margin.
  - Implement the database changes required to track swipe usage for non-paying users as identified in the risk section.
  - Define a clear success threshold for the D7/D30 retention lift that would justify the marginal or negative unit economics.
- **Top concern:** The cost to serve a single frontier model swipe ($0.0090) frequently exceeds the net revenue per view ($0.0063), making this a loss-leader that relies entirely on unproven downstream retention gains.

