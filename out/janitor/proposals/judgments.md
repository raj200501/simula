# Judgments: Janitor

Verdicts are computed in code: SHIP at weighted ≥ 3.8 with every criterion ≥ 3 and every gate passing; REVISE between 3 and 3.8, on any criterion ≤ 2, or on a fixable gate; REJECT below 3, on a policy gate, or still REVISE after round 2 (or when a revision stalls: < +0.2 and no gate fixed). Only SHIP goes to the slides.

Weights: value-moment-fit 20, product-integrity 15, cannibalization-safety 15, unit-economics 10, reach 10, feasibility 10, specificity 10, frequency-fatigue 5, measurability 5.

## Summary

| proposal | title | final | weighted | versions | summary |
|---|---|---|---|---|---|
| P1 | Context Memory Boost | **REJECT** | 5 | v1 → v2 → v3 | REJECT after 2 revisions: fixable gate failed: grounding (code); still REVISE after round 2. Top concern: grounding (code): reward resource "context_memory_5x" does not exist; edge effect on unknown resource "context_memory_5x"; storyboard value: counter on unknown resource "context_memory_5x" |
| P2 | Paywall-Decline Priority Routing | **REJECT** | 4.45 | v1 → v2 | REJECT after 1 revision: revision stalled (weighted +0.1, below +0.2) with the same gate failures. Top concern: grounding (code): reward resource "janitor_plus_priority_routing_time" does not exist; edge effect on unknown resource "janitor_plus_priority_routing_time"; storyboard value: counter on unknown resource "janitor_plus_priority_routing_time"; evidence "m2" is not an observation or screen in the model |
| P3 | Premium Scenario Unlock | **REJECT** | 4.9 | v1 → v2 → v3 | REJECT after 2 revisions: policy gate failed: sfw (llm). Top concern: grounding (code): economy item "s09" does not exist; edge guard on unknown resource "JanitorPlus"; evidence element "Willson Wáng" is not on s09 |

## P1: Context Memory Boost — REJECT

> Unlock 15 minutes of 5x context memory via a rewarded mini-game.

- existing · TAX-7 · surface More memory for
long chats. (s03) · reward 15 minutes of 5x context memory for 15m · caps 2/day

#### Round 0 (v1): **REVISE** · weighted 4.7 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | economy item "plan" does not exist; reward resource "plan" does not exist; edge effect on unknown resource "plan"; evidence "m1" is not an observation or screen in the model |
| label | code | fixable | pass | cites observed economy items: of1, w1 |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The proposal targets the memory wall on s03, which is a standard utility feature for the service. |
| no-incentivized-action | llm | policy | pass | The reward is for playing a mini-game, not for clicking or installing ads. |
| no-loss-framing | llm | policy | pass | The proposal uses gain framing ('Unlock 5x Memory') rather than threatening to delete existing content. |
| explicit-opt-in | llm | fixable | pass | The proposal includes an explicit opt-in via a new 'Try for free' button and an invite screen. |
| disclosed | llm | fixable | pass | The invitation discloses the action (15s game) and the reward (30 mins of memory). |
| free-decline | llm | fixable | pass | The UI design includes a 'Not Now' button, fulfilling the requirement for free decline. |
| no-stream-interrupt | llm | fixable | pass | The offer is placed on the memory paywall screen, not during a chat generation. |
| not-for-subscribers | llm | fixable | pass | The eligibility is explicitly restricted to non-paying users. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | The offer is placed directly on the memory wall (s03), providing exactly what the user needs when they are blocked. |
| product-integrity | 15 | 5 | The rewarded play is additive to the free tier without degrading the existing chat experience or quality. |
| cannibalization-safety | 15 | 5 | The reward is strictly time-boxed (30m) and capped (2/day), which clearly differentiates it from the 'Janitor Plus' permanent entitlement. |
| unit-economics | 10 | 2 | The cost to serve is $0.0090, which exceeds the low-end net revenue per view ($0.0063) computed in code. |
| reach | 10 | 5 | Memory context is a core bottleneck for roleplay, making the wall a high-frequency trigger. |
| feasibility | 10 | 5 | Maps to SIM-RWD units using existing screen surfaces. |
| specificity | 10 | 5 | References Janitor Plus subscription, memory context, and s03 correctly. |
| frequency-fatigue | 5 | 5 | Explicit daily cap of 2 and 60-minute cooldown defined. |
| measurability | 5 | 5 | Includes primary metrics and a user-level holdout experiment plan. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); fixable gate failed: economics (code); unit-economics scored 2 (< 3)
- **Required changes:**
  - Resize the reward or switch to a cheaper inference model, as the current cost to serve ($0.0090) exceeds the net revenue per view ($0.0063).
  - Update economy references to valid items; 'plan' is not a valid economy item in the digest.
- **Top concern:** The unit economics are currently negative; the cost of providing premium memory context via the rewarded view is higher than the net revenue earned per view.

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `oneLiner`: "Unlock 30 minutes of 5x context memory for roleplay via a rewarded mini-game." → "Unlock 15 minutes of 5x context memory via a rewarded mini-game."
- `anchor.economy[2]`: "plan" → (none)
- `offer.title`: "Unlock 5x Memory Now" → "Unlock Memory Boost"
- `offer.body`: "Play a quick 15-second game to get 5x context memory for the next 30 minutes." → "Play a quick 15-second game to get 5x context memory for the next 15 minutes."
- `reward.what`: "30 minutes of 5x context memory" → "15 minutes of 5x context memory"
- `reward.resource`: "plan" → "memory_boost"
- `reward.duration`: "30m" → "15m"
- `cannibalizationGuard`: "The reward is strictly time-boxed to 30 minutes and capped at 2 uses per day, ensuring..." → "The reward is strictly time-boxed to 15 minutes and capped at 2 uses per day, ensuring..."
- `assumptions.cogs`: "text-premium" → "text-cheap"
- `risks[0]`: "Increased inference costs due to 5x context size per user session [TRIG-4]." → "Increased inference costs, mitigated by using a cost-optimized text-cheap model for th..."
- `risks[1]`: "Potential devaluation of the Janitor Plus subscription if 30 minutes satisfies core ro..." → "Potential devaluation of the Janitor Plus subscription if frequent usage satisfies cor..."
- `patch.newElements[0].change`: "Add a MiniGameButton styled as 'Try 30 mins for free' below the context feature descri..." → "Add a MiniGameButton styled as 'Try 15 mins for free' below the context feature descri..."
- `patch.newEdges[0].effects[0].resource`: "plan" → "memory_boost"
- `storyboard[0].callouts[0].text`: "Memory context is currently locked for free users." → "Memory context is locked for free users."
- `storyboard[2].caption`: "The invite screen discloses the 15s play time and the 30-minute reward." → "The invite screen discloses the 15s play time and the 15-minute reward."
- `storyboard[4].callouts[0].text`: "Memory unlocked for 30 minutes." → "Memory unlocked for 15 minutes."
- `storyboard[4].caption`: "Upon verification, the user receives 30 minutes of enhanced roleplay memory." → "Upon verification, the user receives 15 minutes of enhanced roleplay memory."
- `reward.amount`: (none) → 1
- `storyboard[4].counters[0].resource`: (none) → "memory_boost"
- `storyboard[4].counters[0].value`: (none) → 1

#### Round 1 (v2): **REVISE** · weighted 4.6 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | reward resource "memory_boost" does not exist; edge effect on unknown resource "memory_boost"; storyboard value: counter on unknown resource "memory_boost"; evidence "m1" is not an observation or screen in the model |
| label | code | fixable | pass | cites observed economy items: of1, w1 |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Trigger: When the user lands on the memory paywall screen (s03) and is blocked from advanced context. |
| no-incentivized-action | llm | policy | pass | simula: { "unit": "SIM-RWD", "entry": "button", "gamePartner": "Janitor", "minPlaySec": 15 } |
| no-loss-framing | llm | policy | pass | body: "Play a quick 15-second game to get 5x context memory for the next 15 minutes." |
| explicit-opt-in | llm | fixable | pass | cta: "Play Now", decline: "Not Now" |
| disclosed | llm | fixable | pass | body: "Play a quick 15-second game to get 5x context memory for the next 15 minutes." |
| free-decline | llm | fixable | pass | decline: "Not Now" |
| no-stream-interrupt | llm | fixable | pass | trigger: "When the user lands on the memory paywall screen (s03) and is blocked from advanced context." |
| not-for-subscribers | llm | fixable | pass | eligibility: "Non-paying users reaching the memory wall." |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | Proposal matches paywall screen s03 ('More memory for long chats.') where advanced context is locked (e10: '5× context for better memory'), directly addressing the exact paywall hit. |
| product-integrity | 15 | 5 | Placed on paywall screen s03, avoiding any streaming response interruption. Uses Simula SIM-RWD with Janitor as game partner playing a 15s game, keeping the experience native. |
| cannibalization-safety | 15 | 5 | Strictly gated to non-paying users reaching the memory wall, time-boxed to 15 minutes, capped at 2 uses per day, ensuring Janitor Plus (of1) remains the permanent option. |
| unit-economics | 10 | 5 | Cost to serve per view is $0.0018 (text-cheap x 1), which is well below the US net revenue per view ($0.0090–$0.0150). |
| reach | 10 | 4 | Triggered on paywall s03 when users hit the memory wall (frequent moment m1), capturing engaged free users hitting context limits. |
| feasibility | 10 | 5 | Maps cleanly to SIM-RWD with button entry, Janitor game partner, 15s play, REWARD_VERIFIED, and remote config caps. |
| specificity | 10 | 4 | Targets screen s03, economy item of1 (Janitor Plus) and w1, quotes e10 ('5× context for better memory'), and uses app character Janitor as game partner. |
| frequency-fatigue | 5 | 5 | Explicit caps (perDay: 2, cooldownMin: 60), decline button present, no re-offer loop. |
| measurability | 5 | 5 | Named primary metric (rewarded_impressions_per_dau), guardrails (subscription_conversion_rate, average_session_length), and a user-level holdout (10% share, 21 days). |

- **Verdict reasons (code):** fixable gate failed: grounding (code)
- **Required changes:**
  - Align the resource identifier in the patch and storyboard (currently 'memory_boost') with valid feature entitlement nomenclature matching the paywall feature (e10).
  - Correct the evidence array entry referencing 'm1', as moment IDs are not valid observations or screen IDs in the model digest.
- **Top concern:** The proposal references an ungrounded resource name ('memory_boost') and an invalid evidence identifier ('m1') in its patch and evidence arrays, causing gate validation failures despite a strong economic and UX design.

#### Changes v2 → v3 (revise() saw the required changes, never the scores)

- `reward.resource`: "memory_boost" → "context_memory_5x"
- `evidence[1].obs`: "m1" → "s03"
- `evidence[1].el`: (none) → "e3"
- `evidence[1].quote`: "Access advanced chat memory and priority is blocked" → "Close paywall"
- `patch.newEdges[0].effects[0].resource`: "memory_boost" → "context_memory_5x"
- `storyboard[4].counters[0].resource`: "memory_boost" → "context_memory_5x"

#### Round 2 (v3): **REJECT** · weighted 5 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | reward resource "context_memory_5x" does not exist; edge effect on unknown resource "context_memory_5x"; storyboard value: counter on unknown resource "context_memory_5x" |
| label | code | fixable | pass | cites observed economy items: of1, w1 |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The proposal focuses on s03 (Memory Wall), which is a standard paywall screen for roleplay features. |
| no-incentivized-action | llm | policy | pass | The reward is for playing a 15-second mini-game, not for clicks or installs. |
| no-loss-framing | llm | policy | pass | The proposal uses a gain-framed title 'Unlock Memory Boost'. |
| explicit-opt-in | llm | fixable | pass | The user taps 'Play Now' after disclosure. |
| disclosed | llm | fixable | pass | The proposal clearly states: 'Play a quick 15-second game to get 5x context memory for the next 15 minutes.' |
| free-decline | llm | fixable | pass | The offer includes a 'Not Now' button. |
| no-stream-interrupt | llm | fixable | pass | The offer is triggered at the paywall (s03), not during an active chat stream. |
| not-for-subscribers | llm | fixable | pass | The proposal specifies eligibility for 'Non-paying users reaching the memory wall.' |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | The trigger is exactly at the friction point (s03), providing the user with the feature they are currently missing (enhanced memory). |
| product-integrity | 15 | 5 | The reward (time-boxed memory) fits perfectly within the roleplay ecosystem and the existing s03 wall without disrupting the core loop. |
| cannibalization-safety | 15 | 5 | Strictly time-boxed to 15 minutes with a cap of 2/day, leaving the Janitor Plus permanent upgrade as the vastly superior option. |
| unit-economics | 10 | 5 | COGS ($0.0018) is well below the revenue per view ($0.009–0.015). |
| reach | 10 | 5 | The memory wall is a core constraint for Janitor users, ensuring a large addressable audience. |
| feasibility | 10 | 5 | Maps directly to SIM-RWD; standard implementation pattern using existing entitlement logic. |
| specificity | 10 | 5 | References 'Janitor Plus' and '5x context' appropriately from the digest. |
| frequency-fatigue | 5 | 5 | Caps of 2/day and 60m cooldowns are appropriately conservative. |
| measurability | 5 | 5 | Includes specific KPIs, guardrails, and a planned holdout. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); still REVISE after round 2
- **Required changes:**
  - Correct the resource identifier 'context_memory_5x' in the patch and storyboard to align with the actual entitlement system string, as it was not found in the product model digest.
  - Explicitly document the technical check to ensure Janitor Plus subscribers are completely excluded from seeing the offer, even if they hit a wall (e.g., via session-level remote config).
- **Top concern:** The resource identifier 'context_memory_5x' is non-grounded; it must match the existing entitlement system exactly to function.


## P2: Paywall-Decline Priority Routing — REJECT

> Offer a 15-minute priority routing pass when users decline the Janitor Plus subscription paywall.

- existing · TAX-10 · surface More memory for
long chats. (s03) · reward 15 minutes of priority routing · caps 2/day

#### Round 0 (v1): **REVISE** · weighted 4.35 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | edge effect on unknown resource "priority_routing_min"; storyboard value: counter on unknown resource "priority_routing_min"; evidence "m2" is not an observation or screen in the model |
| label | code | fixable | pass | cites observed economy items: of1, w1 |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Offer a 15-minute priority routing pass when users decline the Janitor Plus subscription paywall. |
| no-incentivized-action | llm | policy | pass | Play a quick 15-second game to unlock 15 minutes of priority routing. |
| no-loss-framing | llm | policy | pass | Gated strictly to paywall decliners and non-payers, time-boxed to 15 minutes, preserving the full permanent subscription value. |
| explicit-opt-in | llm | fixable | pass | CTA: Play Now |
| disclosed | llm | fixable | pass | Play a quick 15-second game to unlock 15 minutes of priority routing. |
| free-decline | llm | fixable | pass | Decline: No thanks |
| no-stream-interrupt | llm | fixable | pass | When the user taps 'Close paywall' on the Janitor Plus subscription screen without subscribing. |
| not-for-subscribers | llm | fixable | pass | Eligibility: Non-payers who decline the Janitor Plus subscription paywall. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | Proposal P2 targets moment m2 on s03 when declining the Janitor Plus subscription paywall by offering 15 minutes of priority routing. |
| product-integrity | 15 | 4 | Proposal P2 time-boxes the priority routing feature to 15 minutes, preserving permanent subscription value without degrading the free experience. |
| cannibalization-safety | 15 | 5 | Proposal P2 restricts the offer strictly to non-payers who decline the paywall, capping it at 15 minutes and 2 per day. |
| unit-economics | 10 | 5 | Economics computed in code show Cost to serve per view is $0.0000, and one completed US view earns $0.0090-$0.0150. |
| reach | 10 | 3 | Code computes impressions/DAU 0.375 with 25% engaged share and 1.5 views each for paywall decliners. |
| feasibility | 10 | 5 | Proposal P2 maps to SIM-RWD with button entry, gamePartner 'Janitor', and minPlaySec 15. |
| specificity | 10 | 4 | Proposal P2 references screen s03, economy items of1 and w1, and Janitor Plus feature priority routing. |
| frequency-fatigue | 5 | 5 | Proposal P2 sets explicit caps of 2 per day and 60 minutes cooldown. |
| measurability | 5 | 5 | Proposal P2 defines primary KPIs, guardrails, and a 5% user-level holdout for 28 days. |

- **Verdict reasons (code):** fixable gate failed: grounding (code)
- **Required changes:**
  - Fix resource name in patch and storyboard: align the resource identifier 'priority_routing_min' with the baseline economy model.
- **Top concern:** Resource naming mismatch in the patch/storyboard edge and counter ('priority_routing_min' is not defined in the baseline economy model).

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `patch.newEdges[0].effects[0].resource`: "priority_routing_min" → "janitor_plus_priority_routing_time"
- `storyboard[4].counters[0].resource`: "priority_routing_min" → "janitor_plus_priority_routing_time"
- `reward.resource`: (none) → "janitor_plus_priority_routing_time"
- `reward.amount`: (none) → 15

#### Round 1 (v2): **REVISE** · weighted 4.45 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | reward resource "janitor_plus_priority_routing_time" does not exist; edge effect on unknown resource "janitor_plus_priority_routing_time"; storyboard value: counter on unknown resource "janitor_plus_priority_routing_time"; evidence "m2" is not an observation or screen in the model |
| label | code | fixable | pass | cites observed economy items: of1, w1 |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The paywall screen s03 is a standard subscription-gated interface, which is SFW. |
| no-incentivized-action | llm | policy | pass | The reward is 'priority routing' (an in-app feature), not a cash-like item or ad-interaction incentive. |
| no-loss-framing | llm | policy | pass | The offer is a positive path forward upon paywall decline ('Play for Priority Routing'), with no threat of loss. |
| explicit-opt-in | llm | fixable | pass | The user must tap 'Play Now' to start the rewarded session. |
| disclosed | llm | fixable | pass | The proposal states: 'Play a quick 15-second game to unlock 15 minutes of priority routing.' |
| free-decline | llm | fixable | pass | The 'No thanks' button is provided, returning the user to the previous state. |
| no-stream-interrupt | llm | fixable | pass | The ad appears on the s03 paywall screen, which is not a streaming or generative AI response surface. |
| not-for-subscribers | llm | fixable | pass | The proposal explicitly limits eligibility to non-payers/decliners. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | The user is hitting a paywall for 'More memory for long chats' (s03). Offering 'Priority routing' (a key Plus benefit) directly addresses the user's desire for an enhanced chat experience at the point of obstruction. |
| product-integrity | 15 | 4 | The design uses a reactive TAX-10 trigger on a paywall. It does not interrupt live chat streams. Using 'Janitor' as the Game Partner is a logical brand-aligned choice. |
| cannibalization-safety | 15 | 5 | Gated to decliners, time-boxed to 15 minutes, and capped at 2 per day. This effectively protects the long-term value of the Janitor Plus subscription. |
| unit-economics | 10 | 5 | COGS is 0 for priority routing. Revenue per view in the US is ~$0.009-0.015, which is well above the cost to serve. |
| reach | 10 | 4 | s03 is a frequently hit paywall surface for non-payers attempting to access enhanced chat features, reaching the core loop of subscription-seekers. |
| feasibility | 10 | 5 | The proposal maps clearly to standard SIM-RWD architecture, using SSV and a remote-config-ready offer. |
| specificity | 10 | 4 | Uses s03 (More memory for long chats) as the anchor and references Janitor Plus features. The resource name 'janitor_plus_priority_routing_time' is slightly generic but clearly mapped to the entitlement. |
| frequency-fatigue | 5 | 5 | Includes an explicit cap of 2 per day and a 60-minute cooldown, adhering to non-game rewarded ad best practices. |
| measurability | 5 | 5 | Includes primary metrics, guardrails (subscription conversion), and a 5% holdout for 28 days as required. |

- **Verdict reasons (code):** fixable gate failed: grounding (code)
- **Required changes:**
  - Define the 'Game Partner' more specifically; if using a specific character (e.g., a mascot), ensure it is defined in the product model or consistent with Janitor branding.
  - Ensure the reward resource name maps explicitly to the 'Priority routing' entitlement defined in Janitor Plus.
  - Add a 'Plus' comparison line (e.g., 'Get unlimited priority routing with Janitor Plus') to the grant/reward screen to maintain subscription upsell pressure.
- **Top concern:** Ensuring the reward resource name (currently 'janitor_plus_priority_routing_time') explicitly aligns with the known Janitor Plus 'Priority routing' entitlement to ensure clean fulfillment tracking and fulfillment.


## P3: Premium Scenario Unlock — REJECT

> Watch a quick game to unlock exclusive premium scenarios for 72 hours.

- product-change · TAX-3 · surface Character Details (s09) · reward 72-hour access to Premium Scenario for 72 hours · caps 3/day

#### Round 0 (v1): **REVISE** · weighted 3.1 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | economy item "s09" does not exist; new element "ne1" is placed near "Willson Wáng", which is not an element on s09; edge guard on unknown resource "JanitorPlus"; evidence element "Willson Wáng" is not on s09 |
| label | code | fixable | pass | declares new mechanic "Premium Scenario Lock" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The surface s09 (Character Details) for Willson Wáng is SFW and age-appropriate. |
| no-incentivized-action | llm | policy | pass | The offer rewards playing a mini-game to unlock content, with no incentivized clicks, installs, or cash-like rewards. |
| no-loss-framing | llm | policy | pass | The offer uses gain framing ('Unlock Premium Scenario') with a clear decline option ('No thanks'). |
| explicit-opt-in | llm | fixable | pass | The user must tap 'Play Now' on the offer card to initiate the ad. |
| disclosed | llm | fixable | pass | The exact reward (72-hour access) and action (play a quick game / 15s) are disclosed prior to the ad. |
| free-decline | llm | fixable | pass | An equally legible decline button 'No thanks' is present and returns the user to the screen without penalty. |
| no-stream-interrupt | llm | fixable | pass | The offer triggers on a button tap in character details before chat starts, never during a streaming response. |
| not-for-subscribers | llm | fixable | pass | Eligibility is explicitly restricted to non-subscribers only. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 3 | Unlocking scenarios on character details aligns with content needs (TAX-3), but introduces a new monetization anchor not present in the base app. |
| product-integrity | 15 | 2 | The proposal specifies removesFreeValue: true, gating previously free content behind ads, which harms user trust and product integrity. |
| cannibalization-safety | 15 | 4 | Gated to non-subscribers with a 72-hour expiry and daily cap of 3, protecting subscription value. |
| unit-economics | 10 | 4 | Cost to serve per view is $0.0000, well below US revenue per view ($0.0090–$0.0150). |
| reach | 10 | 3 | Triggered when viewing character details (m6), which occurs regularly in the discovery loop. |
| feasibility | 10 | 3 | Maps to SIM-RWD unit, but introduces ungrounded UI elements and edge cases noted in code gates. |
| specificity | 10 | 2 | References character 'Willson Wáng' from digest, but assumes scenario locking mechanics that do not exist in Janitor. |
| frequency-fatigue | 5 | 4 | Includes explicit per-day cap of 3 and 60-minute cooldown. |
| measurability | 5 | 4 | Defines primary metric (Scenario views per DAU), guardrails, and a 10% user-level holdout for 4 weeks. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); product-integrity scored 2 (< 3); specificity scored 2 (< 3); weighted 3.1 < 3.8
- **Required changes:**
  - Ground the proposal in existing Janitor features or explicitly document the product change required to introduce scenario gating.
  - Remove removesFreeValue: true or apply scenario locking only to newly created premium scenarios to prevent user churn and backlash.
  - Correct the UI element grounding to match actual elements on screen s09.
- **Top concern:** Introducing a product change that removes free access to existing character scenarios (removesFreeValue: true) creates severe trust and churn risk for free users.

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `oneLiner`: "Watch a quick game to unlock a premium scenario for 72 hours." → "Watch a quick game to unlock exclusive premium scenarios for 72 hours."
- `anchor.newMechanic.name`: "Premium Scenario Lock" → "Premium Scenario Category"
- `anchor.newMechanic.description`: "Gating character-specific scenarios behind a premium requirement, accessible via rewar..." → "Introduces an 'Exclusive Premium' tag for creator scenarios. These are optional, bonus..."
- `anchor.newMechanic.whyNeeded`: "Leverages character-specific content as high-intent content anchors to drive monetizat..." → "Creates a monetizable content anchor that creators can opt into, providing value witho..."
- `anchor.newMechanic.removesFreeValue`: true → false
- `trigger`: "User taps 'Unlock Scenario' on a premium-gated character scenario in Character Details." → "User taps 'Unlock Scenario' on a Premium-tagged character scenario in Character Details."
- `eligibility`: "Non-subscribers only." → "Non-subscribers only. Applies only to new 'Premium' tagged scenarios; existing free sc..."
- `offer.body`: "Play a quick game to unlock this premium scenario for 72 hours." → "Play a 15-second game with Willson Wáng to unlock this premium scenario for 72 hours."
- `reward.resource`: "UnlockedScenario" → "PremiumScenarioAccess"
- `cannibalizationGuard`: "Non-subscribers only; gated by 72-hour expiry and daily frequency cap. Includes clear ..." → "Non-subscribers only; gated to new content (no existing free scenarios removed); frequ..."
- `kpis.primary`: "Scenario views per DAU" → "Premium scenario unlocks per DAU"
- `risks[0]`: "High risk: gating content creates friction for free users; requires clear communication." → "Requires creator adoption to tag scenarios as 'Premium'."
- `risks[1]`: "Potential churn if scenario selection feels predatory." → "Potential perceived 'gating' if premium tag is misunderstood by the community."
- `evidence[0].quote`: "Willson.. Stop growing a tail please." → "Willson Wáng"
- `patch.newElements[0].near`: "Willson Wáng" → "e6"
- `patch.newEdges[0].effects[0].resource`: "UnlockedScenario" → "PremiumScenarioAccess"
- `storyboard[1].caption`: "Unlock button added to scenario details." → "Premium unlock button added to scenario details."

#### Round 1 (v2): **REVISE** · weighted 4.9 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | economy item "s09" does not exist; edge guard on unknown resource "JanitorPlus"; evidence element "Willson Wáng" is not on s09 |
| label | code | fixable | pass | declares new mechanic "Premium Scenario Category" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Proposal targets general scenario content for 'Willson Wáng' on screen s09. Content is SFW. |
| no-incentivized-action | llm | policy | pass | Reward is access to a premium scenario, granted in-app, with no cash or click-to-earn incentives. |
| no-loss-framing | llm | policy | pass | Neutral framing: 'Unlock Premium Scenario'. No dark patterns or manufactured scarcity. |
| explicit-opt-in | llm | fixable | pass | User initiates by tapping 'Unlock Scenario' button, followed by an offer screen with a clear 'Play Now' CTA. |
| disclosed | llm | fixable | pass | Offer screen explicitly states: 'Play a 15-second game with Willson Wáng to unlock this premium scenario for 72 hours.' |
| free-decline | llm | fixable | pass | Offer contains a clearly legible 'No thanks' button that exits the offer flow. |
| no-stream-interrupt | llm | fixable | pass | Offered in character details (s09), not during an active chat or generation. |
| not-for-subscribers | llm | fixable | pass | Eligibility restricts the offer to 'Non-subscribers only'. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | The offer triggers directly when the user seeks to access a premium scenario (s09), which is the exact moment of need. |
| product-integrity | 15 | 5 | Adds an 'Exclusive Premium' tag to creator scenarios; does not degrade existing free content or disrupt current chat flows. |
| cannibalization-safety | 15 | 5 | Gated to non-subscribers, time-boxed (72h), capped at 3/day, and leaves the full premium subscription as the primary unlimited path. |
| unit-economics | 10 | 5 | Cost to serve is zero for content access. Revenue per view is sufficient for the reward type. |
| reach | 10 | 4 | Placed on character details (s09), which is a high-traffic intersection in the discovery-to-chat flow. |
| feasibility | 10 | 5 | Uses SIM-RWD; logic relies on tagging and standard gate access, which is well-supported. |
| specificity | 10 | 5 | References specific character 'Willson Wáng' (e6 in s09) and screen s09 correctly. |
| frequency-fatigue | 5 | 5 | Caps at 3 per day with a 60-minute cooldown; provides clear frequency management. |
| measurability | 5 | 5 | Includes primary metric, guardrails, and a explicit plan for a 10% user-level holdout. |

- **Verdict reasons (code):** fixable gate failed: grounding (code)
- **Required changes:**
  - Define the 'Exclusive Premium' tagging system for creators to ensure scenarios are clearly marked prior to the trigger.
  - Clarify how the UI handles Premium-tagged scenarios in search results so free users do not feel frustrated by 'gated' content visibility.
- **Top concern:** Operational dependency on creator adoption for the 'Premium' scenario tagging, which may impact the initial inventory volume available for the ad path.

#### Changes v2 → v3 (revise() saw the required changes, never the scores)

- `anchor.newMechanic.name`: "Premium Scenario Category" → "Premium Scenario Tagging & Badge System"
- `anchor.newMechanic.description`: "Introduces an 'Exclusive Premium' tag for creator scenarios. These are optional, bonus..." → "Creators flag new optional bonus scenarios as 'Premium' in the creation flow. These ar..."
- `anchor.newMechanic.whyNeeded`: "Creates a monetizable content anchor that creators can opt into, providing value witho..." → "It provides a clear value exchange for creators to offer high-quality bonus content, w..."
- `cannibalizationGuard`: "Non-subscribers only; gated to new content (no existing free scenarios removed); frequ..." → "Non-subscribers only; gated to new content (no existing free scenarios removed); frequ..."
- `risks[1]`: "Potential perceived 'gating' if premium tag is misunderstood by the community." → "Initial inventory may be limited until creators adopt the new tagging system."
- `storyboard[1].callouts[0].text`: "Unlock premium scenario" → "Premium Scenario Unlock"
- `storyboard[1].caption`: "Premium unlock button added to scenario details." → "New 'Unlock Scenario' button added to character details."
- `storyboard[2].caption`: "Offer appears for non-subscribers." → "Offer appears to non-subscribers."
- `storyboard[3].caption`: "User plays a 15-second mini-game with Willson Wáng." → "User plays a 15-second mini-game."
- `storyboard[4].caption`: "Scenario access granted for 72 hours." → "Premium scenario unlocked successfully."
- `patch.newElements[1].id`: (none) → "ne2"
- `patch.newElements[1].in`: (none) → "s05"
- `patch.newElements[1].near`: (none) → "e12"
- `patch.newElements[1].place`: (none) → "after"
- `patch.newElements[1].change`: (none) → "Premium Scenario Badge"
- `patch.newElements[2].id`: (none) → "ne3"
- `patch.newElements[2].in`: (none) → "s07"
- `patch.newElements[2].near`: (none) → "e12"
- `patch.newElements[2].place`: (none) → "after"
- `patch.newElements[2].change`: (none) → "Premium Scenario Badge"
- `patch.newElements[3].id`: (none) → "ne4"
- `patch.newElements[3].in`: (none) → "s08"
- `patch.newElements[3].near`: (none) → "e12"
- `patch.newElements[3].place`: (none) → "after"
- `patch.newElements[3].change`: (none) → "Premium Scenario Badge"
- `patch.newElements[4].id`: (none) → "ne5"
- `patch.newElements[4].in`: (none) → "s11"
- `patch.newElements[4].near`: (none) → "e12"
- `patch.newElements[4].place`: (none) → "after"
- `patch.newElements[4].change`: (none) → "Premium Scenario Badge"
- ... and 5 more changes

#### Round 2 (v3): **REJECT** · weighted 4.9 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | economy item "s09" does not exist; edge guard on unknown resource "JanitorPlus"; evidence element "Willson Wáng" is not on s09 |
| label | code | fixable | pass | declares new mechanic "Premium Scenario Tagging & Badge System" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | **FAIL** | The proposal introduces 'Premium' scenarios but fails to explicitly guarantee they will be SFW-compliant. Given the platform is an AI roleplay site with potentially adult content, this risks placing ads on non-compliant, unsafe inventory, violating [SAFE-1]. |
| no-incentivized-action | llm | policy | pass | The proposal uses a standard rewarded ad for content access; no clicks, installs, or cash-like rewards are offered. |
| no-loss-framing | llm | policy | pass | The proposal uses a gain-framing approach (unlocking exclusive content) rather than a loss-framing one. |
| explicit-opt-in | llm | fixable | pass | The offer requires the user to tap 'Play Now' after disclosure. |
| disclosed | llm | fixable | pass | The offer clearly states the reward (72-hour access) and action (play 15-second game). |
| free-decline | llm | fixable | pass | The offer includes a clear 'No thanks' button that closes the prompt without penalty. |
| no-stream-interrupt | llm | fixable | pass | The offer is placed on the Character Details screen (s09), which is static, not mid-conversation. |
| not-for-subscribers | llm | fixable | pass | The proposal explicitly excludes subscribers via the 'Non-subscribers only' eligibility rule. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | The trigger occurs exactly when a user is evaluating a scenario they wish to access, making it highly contextually relevant. |
| product-integrity | 15 | 5 | The integration is native to the existing character details screen and creates a new content tier without degrading the free experience. |
| cannibalization-safety | 15 | 5 | The reward is time-boxed to 72 hours, capped at 3 per day, and explicitly gated to non-subscribers. |
| unit-economics | 10 | 5 | Cost to serve is zero, and revenue is net-positive compared to zero-ad baseline. |
| reach | 10 | 4 | Character details are a core part of the exploration loop, ensuring high exposure. |
| feasibility | 10 | 5 | Maps directly to existing SIM-RWD implementation with a standard button entry. |
| specificity | 10 | 5 | Uses specific app nouns like 'Willson Wáng' and targets the Character Details screen (s09). |
| frequency-fatigue | 5 | 5 | Includes a strict daily cap of 3 and a 60-minute cooldown. |
| measurability | 5 | 5 | Includes a primary metric (scenario unlocks), guardrails, and a 10% holdout plan. |

- **Verdict reasons (code):** policy gate failed: sfw (llm)
- **Required changes:**
  - Explicitly restrict 'Premium' scenarios to SFW-rated content that passes content moderation for brand safety, in accordance with the brand-safety requirements in [SAFE-1].
  - Correct the 'JanitorPlus' resource name to 'Janitor Plus' in the edge guard to match the actual subscription resource name.
- **Top concern:** The proposal lacks explicit brand-safety guardrails for the new 'Premium' scenario content type, which could result in rewarded ads being shown alongside non-compliant or adult content.

