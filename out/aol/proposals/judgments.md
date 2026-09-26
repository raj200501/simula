# Judgments: AOL

Verdicts are computed in code: SHIP at weighted ≥ 3.8 with every criterion ≥ 3 and every gate passing; REVISE between 3 and 3.8, on any criterion ≤ 2, or on a fixable gate; REJECT below 3, on a policy gate, or still REVISE after round 2 (or when a revision stalls: < +0.2 and no gate fixed). Only SHIP goes to the slides.

Weights: value-moment-fit 20, product-integrity 15, cannibalization-safety 15, unit-economics 10, reach 10, feasibility 10, specificity 10, frequency-fatigue 5, measurability 5.

## Summary

| proposal | title | final | weighted | versions | summary |
|---|---|---|---|---|---|
| P1 | AOL Guest Commenter | **REJECT** | 3.4 | v1 → v2 | REJECT after 1 revision: revision stalled (weighted -1.2, below +0.2) with the same gate failures. Top concern: grounding (code): economy item "Account sign-in / verified user status" does not exist; evidence "m9" is not an observation or screen in the model; evidence "f1" is not an observation or screen in the model |
| P2 | AOL Ad-Free Sprint | **SHIP** | 4.2 | v1 → v2 | SHIP at 4.2 (v2 after 1 revision). |
| P3 | Daily Reader Streak & Ad-Free Access | **SHIP** | 4.8 | v1 → v2 | SHIP at 4.8 (v2 after 1 revision). |

## P1: AOL Guest Commenter — REJECT

> Allow users to post a single news comment by playing a mini-game instead of signing up.

- product-change · TAX-3 · surface Add Comment Page (s05) · reward one guest comment submission · caps 1/day

#### Round 0 (v1): **REVISE** · weighted 4.6 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | new element "ne1" is placed near "e141", which is not an element on s05; storyboard change: callout node "e141" is not on s05 and not declared; evidence element "e141" is not on s05; evidence "m9" is not an observation or screen in the model |
| label | code | fixable | pass | declares new mechanic "Guest Posting" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The proposal targets 's05' (Add Comment Page) which is a standard news interaction surface and is not flagged as a sensitive context. |
| no-incentivized-action | llm | policy | pass | The reward is 'one guest comment submission', which is an in-app interaction and not a 'direct monetary item' like cash or gift cards [POL-2 #8]. |
| no-loss-framing | llm | policy | pass | The proposal uses a 'Play to Post' invitation with a 'Maybe later' decline option, avoiding 'confirmshaming' or 'hostage' framing [ANTI-9, ANTI-10]. |
| explicit-opt-in | llm | fixable | pass | The user must tap the 'Play to Post' button before the ad unit is triggered [POL-1]. |
| disclosed | llm | fixable | pass | The offer card states: 'Play a quick 15-second game to post this comment as a guest', disclosing both the action length and the reward [POL-2 #2]. |
| free-decline | llm | fixable | pass | The decline option is 'Maybe later' and the proposal states it is for 'Non-signed-in users', returning them to the previous blocked state without penalty [POL-2 #5]. |
| no-stream-interrupt | llm | fixable | pass | The trigger occurs 'When a user land on the Add Comment Page' as a reaction to a blocked action, not during an active AI generation [POL-9]. |
| not-for-subscribers | llm | fixable | pass | Eligibility is restricted to 'Non-signed-in users', ensuring authenticated users are not prompted for ads [TRIG-2]. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | The proposal anchors to 'm9' where a user attempts to comment and hits a wall; the reward provides the exact solution needed for that friction point [TRIG-1]. |
| product-integrity | 15 | 5 | It preserves the user's intent ('entered text in the comment box') and provides a 'secondary action' that doesn't remove existing free value from the 'no-scarcity' regime [AI-X]. |
| cannibalization-safety | 15 | 5 | The reward is 'limited to a single comment per day' and excludes account benefits like 'history, replies, or profile customization', maintaining the premium value of a full account [TAX-10, CANN-4]. |
| unit-economics | 10 | 5 | Computed COGS is '$0.0000' while one completed US view earns up to '$0.0150', representing a high-margin digital unlock [TRIG-4]. |
| reach | 10 | 5 | The trigger m9 is located on the 'Add Comment Page' which is part of the 'core-loop' (f1) for article engagement. |
| feasibility | 10 | 4 | Maps directly to 'SIM-RWD' with a 15s threshold. However, it requires a 'product-change' to support 'Guest Posting' permissions which is correctly identified. |
| specificity | 10 | 2 | The proposal uses 's05' and 'm9' from the digest, but relies on invented element ID 'e141' which does not exist in the product model (s05 IDs were uncaptured due to the login wall). |
| frequency-fatigue | 5 | 5 | Implements a strict daily cap of '1 per day' and a '1440' minute cooldown [TRIG-3]. |
| measurability | 5 | 5 | Includes a 'user-level holdout' of '10%' over '28 days' with 'Account sign-up rate' as a primary guardrail [MEAS-5]. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); specificity scored 2 (< 3)
- **Required changes:**
  - Remove reliance on invented element ID 'e141'; since s05 IDs are uncaptured due to the login wall, use a full-screen Rewarded Interstitial (SIM-INT) or anchor to a descriptive layout position.
  - Clarify the technical 'Guest Posting' implementation to ensure comments can be moderated without a verified account to satisfy safety requirements [SAFE-1].
  - Add a 'Plus' or 'Sign-in' contrast line to the reward grant screen to highlight the benefits of a full account [CANN-4].
- **Top concern:** The proposal fails grounding by referencing non-existent element IDs (e141) and moment evidence (m9 as a screen) which are not part of the verified product model.

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `anchor.economy[0]`: "Account sign-in / verified user status (new)" → "Account sign-in / verified user status"
- `anchor.newMechanic.description`: "A temporary authorization to submit one comment to a news article discussion without a..." → "A temporary authorization to submit one comment to a news article discussion without a..."
- `anchor.newMechanic.whyNeeded`: "The sign-up wall on the Add Comment Page (s05) prevents spontaneous interaction from g..." → "The sign-up wall on the Add Comment Page (s05) prevents spontaneous interaction from g..."
- `trigger`: "When a user land on the Add Comment Page and encounters the Sign Up to Post requirement." → "After entering text on the Add Comment Page when the sign-up modal appears."
- `eligibility`: "Non-signed-in users who have entered text in the comment box." → "Non-signed-in users who have entered text in the comment box on the Add Comment Page."
- `offer.cta`: "Play to Post" → "Play and Post"
- `offer.decline`: "Maybe later" → "No thanks"
- `simula.entry`: "button" → "interstitial"
- `cannibalizationGuard`: "The guest pass is limited to a single comment per day and does not grant account benef..." → "The guest pass is limited to a single comment per day and does not grant account benef..."
- `risks[1]`: "User frustration if the guest post limit is hit" → "Increased moderation load if automated filters fail"
- `evidence[0].obs`: "s05" → "m9"
- `evidence[0].el`: "e141" → (none)
- `evidence[0].quote`: "Sign Up to Post" → "User attempts to post a comment on an article and hits the sign-up wall."
- `evidence[1].obs`: "m9" → "f1"
- `evidence[1].quote`: "User attempts to post a comment on an article and hits the sign-up wall." → "Add Comment Page (Type a comment)"
- `patch.newElements[0].near`: "e141" → (none)
- `patch.newElements[0].place`: "before" → "overlay"
- `patch.newElements[0].change`: "A Simula 'Play to Post' rewarded invitation button styled as a secondary action." → "A SimulaRewardedAd interstitial invitation triggered by the sign-up modal on the Add C..."
- `storyboard[0].callouts[0].text`: "User reading comments" → "User reading article comments"
- `storyboard[1].callouts[0].node`: "e141" → "ne1"
- `storyboard[1].callouts[0].text`: "Forced sign-up to engage" → "Sign-up wall appears"
- `storyboard[1].callouts[1].node`: "ne1" → (none)
- `storyboard[1].callouts[1].text`: "New guest option" → (none)
- `storyboard[1].caption`: "When trying to comment, they see the sign-up requirement but also a new guest option." → "When trying to comment, the user is blocked by a mandatory sign-up requirement."
- `storyboard[2].callouts[0].text`: "Post without an account" → "New guest post option"
- `storyboard[2].caption`: "The user chooses to play a quick game to unlock a guest post." → "A Simula interstitial offers a single guest post in exchange for a game."
- `storyboard[3].caption`: "A fun 15-second AOL-themed mini-game plays." → "The user plays an AOL-themed mini-game for 15 seconds."
- `storyboard[4].callouts[0].text`: "Comment successfully posted" → "Comment posted successfully"
- `storyboard[4].caption`: "The reward is verified and the user's comment is published immediately." → "The comment is published. A message suggests signing in to track comment history."
- `anchor.economy[1]`: (none) → "Guest Comment (new)"
- ... and 2 more changes

#### Round 1 (v2): **REVISE** · weighted 3.4 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | economy item "Account sign-in / verified user status" does not exist; evidence "m9" is not an observation or screen in the model; evidence "f1" is not an observation or screen in the model |
| label | code | fixable | pass | declares new mechanic "Guest Posting" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Guest comments are processed via AOL's automated safety filters to prevent spam [SAFE-1]. |
| no-incentivized-action | llm | policy | pass | Reward: one guest comment submission |
| no-loss-framing | llm | policy | pass | Don't want to sign up right now? Play a quick 15-second game to post this comment as a guest. |
| explicit-opt-in | llm | fixable | pass | cta: 'Play and Post', decline: 'No thanks' |
| disclosed | llm | fixable | pass | Play a quick 15-second game to post this comment as a guest. |
| free-decline | llm | fixable | pass | decline: 'No thanks' |
| no-stream-interrupt | llm | fixable | pass | After entering text on the Add Comment Page when the sign-up modal appears. |
| not-for-subscribers | llm | fixable | pass | eligibility: 'Non-signed-in users who have entered text in the comment box on the Add Comment Page.' |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 1 | Code gate 'FAIL grounding': economy item "Account sign-in / verified user status" does not exist; evidence "m9" is not an observation or screen in the model; evidence "f1" is not an observation or screen in the model. The proposal's core anchoring to a moment of need ('m9') and a user flow ('f1') is explicitly flagged as ungrounded by the code gates. |
| product-integrity | 15 | 5 | newMechanic.description: 'A temporary authorization to submit one comment... without a full AOL account registration. Guest comments are processed via AOL's automated safety filters...'. The proposal is additive, introducing a 'Guest Posting' mechanic without removing existing free value. |
| cannibalization-safety | 15 | 5 | eligibility: 'Non-signed-in users'. caps.perDay: 1. cannibalizationGuard: 'The guest pass is limited to a single comment per day and does not grant account benefits like comment history, replies, or profile customization. A sign-in contrast line reminds users that a full AOL account is required for permanent features [CANN-4].' |
| unit-economics | 10 | 5 | Code: 'Cost to serve per view: $0.0000 (none x 1).' Code: 'One completed US view earns $0.0090–$0.0150'. The COGS is zero, making the economics highly favorable. |
| reach | 10 | 1 | Code gate 'FAIL grounding': evidence 'm9' is not an observation or screen in the model; evidence 'f1' is not an observation or screen in the model. The claimed core-loop reach is unverified by the system's grounding check. |
| feasibility | 10 | 5 | simula.unit: 'SIM-RWD', entry: 'interstitial', minPlaySec: 15. reward.grantOn: 'REWARD_VERIFIED'. The patch proposes an overlay on s05. This leverages standard Simula units and lifecycle. |
| specificity | 10 | 1 | Code gate 'FAIL grounding': economy item "Account sign-in / verified user status" does not exist; evidence "m9" is not an observation or screen in the model; evidence "f1" is not an observation or screen in the model. The proposal refers to app-specific nouns but these are not recognized as grounded in the model. |
| frequency-fatigue | 5 | 5 | caps.perDay: 1, cooldownMin: 1440. The daily cap of one comment per day with a long cooldown ensures minimal fatigue. |
| measurability | 5 | 5 | kpis.primary: 'Comments per DAU', kpis.guardrails: ['Account sign-up rate', 'D1 retention'], kpis.holdout: 'user-level, 10%, 28 days'. Clear KPIs, guardrails, and a holdout are defined. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); value-moment-fit scored 1 (< 3); reach scored 1 (< 3); specificity scored 1 (< 3); weighted 3.4 < 3.8
- **Required changes:**
  - Re-ground the proposal's anchor, trigger, and economy item references (m9, f1, 'Account sign-in / verified user status') to align with verified elements in the product model.
  - Explicitly add a contrast line in the offer text, directing users to sign in for full account features as mentioned in the cannibalization guard.
- **Top concern:** The core grounding of the proposal to the app's observed model (as reported by the code gates) is failing, which means the proposal cannot be verified as relevant or actionable in its current form.


## P2: AOL Ad-Free Sprint — SHIP

> Enjoy 15 minutes of ad-free news reading after a quick game.

- product-change · TAX-2 · surface Home News Feed (s02) · reward 15 minutes of ad-free reading · caps 3/day

#### Round 0 (v1): **REVISE** · weighted 3.65 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "Ad-free Sprint" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | News feed content is rated for general audiences and adheres to SFW standards. |
| no-incentivized-action | llm | policy | pass | The reward is in-app ad-free access, not cash, gift cards, or clicks. |
| no-loss-framing | llm | policy | pass | The offer uses gain framing (ad-free sprint) and provides a clear decline option. |
| explicit-opt-in | llm | fixable | pass | User initiates the flow by tapping a dedicated item in the sidebar, followed by the invitation confirmation. |
| disclosed | llm | fixable | pass | The proposal states: 'Simula MiniGameInvitation appears, disclosing the 15-second requirement and the 15-minute reward.' |
| free-decline | llm | fixable | pass | The proposal includes an explicit 'No thanks' button in the invitation flow. |
| no-stream-interrupt | llm | fixable | pass | The offer is triggered from the Account Menu Sidebar, not during article reading. |
| not-for-subscribers | llm | fixable | pass | Eligibility is explicitly set to 'Non-paying users'. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 2 | Triggering from the sidebar menu (m2/m10) is a passive, proactive discovery rather than a reactive moment-of-need when ads are perceived as intrusive. |
| product-integrity | 15 | 4 | The time-boxed ad suppression is a clean, non-intrusive value exchange that does not interfere with reading flow. |
| cannibalization-safety | 15 | 4 | 15-minute time-boxing is a low-risk, high-intent sampling format; AOL has no clearly defined subscription tier to cannibalize. |
| unit-economics | 10 | 5 | COGS is effectively zero for ad-suppression, which is well below the US revenue per view ($0.009–$0.015). |
| reach | 10 | 2 | The trigger is a menu item in the Account sidebar, which has occasional reach compared to the core Home News Feed. |
| feasibility | 10 | 5 | Maps directly to SIM-RWD; implementation requires simple UI updates in the sidebar and a flag for the ad-server. |
| specificity | 10 | 4 | References sidebar menu s11 and the Home News Feed s02 correctly using established UI patterns. |
| frequency-fatigue | 5 | 4 | Daily cap of 3 with a 60-minute cooldown effectively prevents spam. |
| measurability | 5 | 5 | Includes a clear primary metric, relevant guardrails, and a 21-day user-level holdout plan. |

- **Verdict reasons (code):** value-moment-fit scored 2 (< 3); reach scored 2 (< 3); weighted 3.65 < 3.8
- **Required changes:**
  - Move or duplicate the 'Ad-Free Sprint' entry point to the Home News Feed (e.g., as a native component near Taboola ads) to capture users when they are actually reading news and seeing advertisements.
  - Clarify how the ad-suppression will be enforced (e.g., via a global variable or remote config) to ensure the 15-minute timer consistently removes banner/native ads.
- **Top concern:** The current trigger (Account Menu Sidebar) is buried and disconnected from the moment of friction (reading ads). Placing the entry point where the ads actually appear (the feed) would significantly improve value-moment fit and reach.

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `anchor.moments[1]`: "m10" → "m3"
- `anchor.newMechanic.description`: "A time-boxed entitlement that suppresses all native and banner advertisements across n..." → "A time-boxed entitlement managed via a remote config flag (isAdFree) that toggles the ..."
- `surface`: "s11" → "s02"
- `trigger`: "User opens the Account Menu Sidebar and views account options." → "User identifies a native ad unit in the Home News Feed (s02) and taps the 'Ad-Free Spr..."
- `cannibalizationGuard`: "The reward is strictly time-boxed to 15 minutes, serving as a 'taste of premium' sampl..." → "The reward is strictly time-boxed to 15 minutes, serving as a 'taste of premium' sampl..."
- `patch.newElements[0].near`: "e52" → "e37"
- `patch.newElements[0].place`: "before" → "after"
- `storyboard[0].screen`: "s11" → "s02"
- `storyboard[0].callouts[0].node`: "e52" → "e47"
- `storyboard[0].callouts[0].text`: "User views standard account options." → "User sees a native ad in the Home News Feed."
- `storyboard[0].caption`: "The user explores the sidebar menu where news and account settings are managed." → "The user reads news headlines and encounters standard Taboola native advertisement uni..."
- `storyboard[1].screen`: "s11" → "s02"
- `storyboard[1].callouts[0].node`: "ne1" → "ne3"
- `storyboard[1].callouts[0].text`: "New Ad-Free Sprint option appears." → "New Ad-Free Sprint entry point appears."
- `storyboard[1].caption`: "A new 'Ad-Free Sprint' entry point is added to the menu, offering a premium benefit fo..." → "A new 'Ad-Free Sprint' call-to-action is added to the feed, offering an ad-free experi..."
- `storyboard[2].screen`: "s11" → "s02"
- `storyboard[2].callouts[0].node`: "ne1" → "ne3"
- `storyboard[2].callouts[0].text`: "User taps to see the value exchange." → "User taps to start the sprint."
- `storyboard[2].caption`: "Simula MiniGameInvitation appears, disclosing the 15-second requirement and the 15-min..." → "Simula MiniGameInvitation appears, disclosing the 15-second requirement and the 15-min..."
- `storyboard[3].screen`: "s11" → "s02"
- `storyboard[4].callouts[0].text`: "Ads are suppressed; timer begins." → "Timer active; ads removed."
- `storyboard[4].caption`: "The reward is granted; ads are hidden from the feed and a countdown timer confirms the..." → "The reward is granted; native ad units are suppressed via remote config, and a countdo..."
- `anchor.moments[2]`: (none) → "m4"
- `anchor.moments[3]`: (none) → "m10"
- `patch.newElements[2].id`: (none) → "ne3"
- `patch.newElements[2].in`: (none) → "s02"
- `patch.newElements[2].near`: (none) → "e47"
- `patch.newElements[2].place`: (none) → "before"
- `patch.newElements[2].change`: (none) → "A call-to-action button: 'Play game for 15m ad-free reading'."
- `patch.newEdges[1].from`: (none) → "s02"
- ... and 4 more changes

#### Round 1 (v2): **SHIP** · weighted 4.2 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "Ad-free Sprint" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | AOL is a general news app; the proposal targets news feeds and article views. |
| no-incentivized-action | llm | policy | pass | The reward is '15 minutes of ad-free reading'; there is no incentive for clicks, installs, or external actions. |
| no-loss-framing | llm | policy | pass | The proposal uses gain framing ('Go Ad-Free for 15 Minutes'). |
| explicit-opt-in | llm | fixable | pass | The user must tap 'Start Sprint' on the invitation screen. |
| disclosed | llm | fixable | pass | The offer explicitly states: 'Play a 15-second game to clear all ads... for a short sprint'. |
| free-decline | llm | fixable | pass | The proposal states the decline option is 'No thanks' (standard Simula behavior). |
| no-stream-interrupt | llm | fixable | pass | AOL content is static text/article reading; no live streams or AI chats are interrupted. |
| not-for-subscribers | llm | fixable | pass | Eligibility is restricted to 'Non-paying users currently exposed to standard ad density'. |
| portfolio-distinct | code | fixable | pass | distinct from P3 (surface, reward, archetype family; offer copy overlap < 0.7) |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | This is a proactive 'sponsored session' pattern (TAX-2) which fits the news reading rhythm well, though AOL does not have a hard ad-wall today. It provides utility by removing frequent native ad units (e47). |
| product-integrity | 15 | 4 | The implementation disables specific Taboola units (e47-e50) via remote config. This feels native and preserves the user flow, though it requires precise UI cleanup to prevent layout gaps where ads were removed. |
| cannibalization-safety | 15 | 4 | 15 minutes is a tight time-box, limiting the 'free ride' potential. Caps (3/day) and the 60m cooldown further mitigate the risk of devaluing the ad-supported reading experience. |
| unit-economics | 10 | 4 | The reward has zero COGS and provides a positive (if smaller than non-Sprint) value exchange, assuming user-level holdouts validate that revenue lost from 15 minutes of ad impressions is offset by retention gains. |
| reach | 10 | 4 | Native ads are frequent in AOL's feed (s02, s03). By triggering near ad units, the offer reaches the majority of DAU. |
| feasibility | 10 | 5 | The proposal uses standard SIM-RWD units and remote config toggles to control ad rendering; the implementation footprint is minimal. |
| specificity | 10 | 4 | References specific AOL elements like the 'Account Menu Sidebar' (s11) and Taboola native ad units (e47, e48, e49, e50) by ID. |
| frequency-fatigue | 5 | 5 | Strict frequency caps (3/day) and a 60-minute cooldown prevent 'nagging' and keep the sprint feature feeling like a treat rather than an obligation. |
| measurability | 5 | 5 | Primary metric (sessions started), guardrails (CTR, D7), and a 21-day user-level holdout provide a robust experimental framework. |

- **Verdict reasons (code):** weighted 4.2 >= 3.8, every criterion >= 3, all gates pass
- **Required changes:**
  - Add a guardrail to monitor 'Articles read per session' and 'Ad-Supported Impression volume', as removing ad units for 15 minutes may impact inventory volume significantly for power users.
  - Specify that the 'ne2' countdown timer badge UI must be implemented to gracefully collapse without shifting the 'Home' title layout when the timer expires.
  - Define a fallback for the Ad-Free Sprint trigger (e.g., if a user triggers the sprint but no Taboola ads are currently loading, ensure the '15 minutes' still activates).
- **Top concern:** The potential loss of native ad inventory volume during peak usage is the highest risk; if 15-minute sprints are too frequent for power readers, revenue degradation could exceed the retention uplift.


## P3: Daily Reader Streak & Ad-Free Access — SHIP

> Earn News Credits daily via streaks to unlock 15-minute ad-free news reading sessions.

- product-change · TAX-9 · surface Account Menu Sidebar (s11) · reward 10 News Credits · caps 3/day

#### Round 0 (v1): **REVISE** · weighted 4 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "AOL News Credits" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Proposal targets the AOL news reader app surface s11 (Account Menu Sidebar) which is SFW and age-appropriate. |
| no-incentivized-action | llm | policy | pass | The reward is 10 News Credits earned by playing a 15-second sponsored mini-game; no clicks, installs, or cash-like rewards are involved. |
| no-loss-framing | llm | policy | pass | The offer uses gain framing ('earn 10 News Credits') with an explicit 'No thanks' decline option and no dark patterns. |
| explicit-opt-in | llm | fixable | pass | The user explicitly taps the 'Play Now' CTA button to initiate the rewarded experience. |
| disclosed | llm | fixable | pass | The body text clearly discloses the required action and reward: 'Play a 15-second game with AOL to earn 10 News Credits and keep your streak alive!' |
| free-decline | llm | fixable | pass | Declining is free via the 'No thanks' button, leaving the Account Menu Sidebar fully usable at its pre-offer state. |
| no-stream-interrupt | llm | fixable | pass | AOL is a news reader app with no streaming AI chat responses; the offer is placed statically in the account menu. |
| not-for-subscribers | llm | fixable | pass | AOL has no subscription tiers (no-scarcity app), and eligibility restricts claims to non-signed-in and non-subscribing users who haven't claimed today. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 3 | AOL is a traditional news feed app with no natural scarcity or currency. Introducing 'News Credits' via a streak hub in the account menu feels somewhat disconnected from immediate article-reading needs. |
| product-integrity | 15 | 5 | Placed in the Account Menu Sidebar (s11) as a voluntary daily habit loop without removing any existing free news content. |
| cannibalization-safety | 15 | 5 | AOL has no paid subscription tiers, and the reward is a small, capped daily amount (10 credits, 1/day) acting as a safe sampling mechanic. |
| unit-economics | 10 | 5 | COGS is $0.0000 (virtual credits with zero marginal cost), which is well below the US view revenue of $0.0090–$0.0150. |
| reach | 10 | 2 | The trigger occurs in the Account Menu Sidebar (s11), which has occasional reach rather than being part of the core news-browsing loop. |
| feasibility | 10 | 4 | Uses Simula's SIM-RWD unit with a button entry point and standard SDK integration, though it requires building a virtual currency ledger for AOL. |
| specificity | 10 | 3 | References screen s11 (Account Menu Sidebar), but 'News Credits' is a newly invented virtual currency that is generic to news apps. |
| frequency-fatigue | 5 | 5 | Explicitly capped at 1 per day with a 1440-minute cooldown and no re-offers upon decline. |
| measurability | 5 | 5 | Defines D7 Retention as primary, includes relevant guardrails (Sessions per DAU, Taboola Ad CTR), and specifies a 10% user-level holdout. |

- **Verdict reasons (code):** reach scored 2 (< 3)
- **Required changes:**
  - Define and integrate the redemption utility of 'News Credits' directly into the article reading views (e.g., ad-light reading sessions) so users understand what the credits unlock.
  - Consider adding a reactive trigger point directly within the news feed or article view (such as after viewing a set number of articles) to complement the occasional sidebar reach.
- **Top concern:** Introducing a virtual currency ('News Credits') in a traditional news reader app with no prior scarcity requires robust redemption utility so users perceive the earned credits as valuable rather than arbitrary points.

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `title`: "Daily Reader Streak" → "Daily Reader Streak & Ad-Free Access"
- `oneLiner`: "Earn virtual credits daily to unlock premium news summaries by playing interactive min..." → "Earn News Credits daily via streaks to unlock 15-minute ad-free news reading sessions."
- `anchor.newMechanic.name`: "AOL News Credits" → "AOL News Credits & Ad-Free Mode"
- `anchor.newMechanic.description`: "A habit-building virtual currency earned through daily streaks and rewarded ads, redee..." → "A habit-building virtual currency earned through daily streaks and rewarded ads. Credi..."
- `anchor.newMechanic.whyNeeded`: "AOL currently has no scarce resource; News Credits create a value exchange to monetize..." → "AOL currently has no scarcity; News Credits and time-boxed Ad-Free sessions create a v..."
- `trigger`: "A user opens the Account Menu Sidebar to manage settings and sees a new Daily Streak p..." → "Users interact with the Daily Streak card in the Account Sidebar (s11) to earn credits..."
- `eligibility`: "Non-signed-in users and signed-in non-subscribers who haven't claimed today's reward." → "Non-signed-in users and signed-in non-subscribers who have not claimed today's reward."
- `offer.title`: "Daily Reading Streak" → "Earn News Credits"
- `offer.body`: "Play a 15-second game with AOL to earn 10 News Credits and keep your streak alive!" → "Play a 15-second game with AOL to earn 10 News Credits, or unlock 15m of Ad-Free readi..."
- `caps.perDay`: 1 → 3
- `caps.cooldownMin`: 1440 → 30
- `cannibalizationGuard`: "The reward is a small daily amount that cannot be stacked to replace the core subscrip..." → "The reward is a small, time-boxed sample of ad-free reading (15m) that provides a 'tas..."
- `assumptions.viewsPerEngager`: 1 → 2
- `kpis.guardrails[1]`: "Taboola Ad Click-Through Rate" → "Paid Subscription Conversion Rate"
- `precedents[1]`: "EX-SERIAL" → "TAX-2"
- `precedents[2]`: "AI-3" → "EX-SERIAL"
- `risks[0]`: "User perceived value of credits may start low until redemption utility is expanded." → "Users may find the redemption utility insufficient if not clearly communicated."
- `risks[1]`: "Potential fatigue if the streak mechanic feels repetitive." → "Potential fatigue if the streak mechanic is perceived as mandatory."
- `evidence[0].quote`: "Manage Accounts" → "Account Menu Sidebar"
- `evidence[1].obs`: "s11" → "s03"
- `evidence[1].el`: "e31" → "e26"
- `evidence[1].quote`: "Settings" → "Ad"
- `patch.newElements[0].near`: "e36" → "e31"
- `patch.newElements[0].change`: "Add a 'Daily Reader Streak' section with a progress bar and a 'Claim Credits' button." → "Add a 'Daily Reader Streak' section with a progress bar and 'Claim Credits' button."
- `storyboard[0].callouts[0].text`: "Existing accounts menu" → "Existing account menu"
- `storyboard[0].caption`: "A user opens the sidebar to access their settings or saved articles." → "User opens the account sidebar to view settings."
- `storyboard[1].callouts[0].text`: "Daily Streak section" → "New streak card"
- `storyboard[1].caption`: "A new 'Daily Reader Streak' card appears below the settings menu." → "Sidebar now displays Daily Reader Streak section."
- `storyboard[2].callouts[0].text`: "Tap to claim rewards" → "Claim reward"
- `storyboard[2].caption`: "The user taps to earn credits, triggering a Simula rewarded game invitation." → "User taps Claim to start the rewarded ad flow."
- ... and 16 more changes

#### Round 1 (v2): **SHIP** · weighted 4.8 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "AOL News Credits & Ad-Free Mode" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Proposal is for AOL news reading application, a general news feed service, and the ad surface is SFW. |
| no-incentivized-action | llm | policy | pass | Reward is for game play/viewing, not for clicks or installs; currency is in-app and non-transferable. |
| no-loss-framing | llm | policy | pass | Proposal uses positive gain framing ('Earn News Credits') rather than loss framing. |
| explicit-opt-in | llm | fixable | pass | User explicitly interacts with 'Daily Reader Streak' card or 'Go Ad-Free' button to initiate the rewarded flow. |
| disclosed | llm | fixable | pass | Proposal discloses 'Play a 15-second game with AOL' before the ad plays. |
| free-decline | llm | fixable | pass | Offer card includes a 'No thanks' button as standard. |
| no-stream-interrupt | llm | fixable | pass | Triggers are sidebar buttons or article buttons, which are user-initiated entry points, not mid-content interruptions. |
| not-for-subscribers | llm | fixable | pass | Proposal explicitly states 'Offers are gated to non-subscribers'. |
| portfolio-distinct | code | fixable | pass | the first SHIP of the portfolio |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | News readers encounter Taboola ads; offering an ad-free session is the direct solution to that user pain point. |
| product-integrity | 15 | 5 | Ad-free reader mode is a natural value-add for a news app; embedding entry points in the sidebar and article footer is non-intrusive. |
| cannibalization-safety | 15 | 5 | 15-minute sessions are highly time-boxed and require active user effort, making them a 'taste' rather than a substitute for a full subscription. |
| unit-economics | 10 | 5 | Cost to serve is nil; revenue per view ~$0.012; reward is highly profitable. |
| reach | 10 | 4 | Article Detail Pages (s03) are a core loop location. Sidebar (s11) is used for account settings. |
| feasibility | 10 | 5 | Maps directly to SIM-RWD on existing UI elements (article buttons, sidebar). |
| specificity | 10 | 4 | References 'Article Details' (s03), 'Account Menu Sidebar' (s11), and 'News Credits' specific to the AOL reader context. |
| frequency-fatigue | 5 | 5 | 3 per day limit with 30m cooldown prevents spamming. |
| measurability | 5 | 5 | Clear KPI, guardrails, and 10% holdout plan. |

- **Verdict reasons (code):** weighted 4.8 >= 3.8, every criterion >= 3, all gates pass
- **Required changes:**
  - Define 'Ad-Free Reader Mode' clearly in the UI to specify that it suppresses the 'Taboola' native/banner advertising units mentioned in the digest.
- **Top concern:** Ensure that the ad-free session does not inadvertently hide critical UI elements or cause layout shifts when Taboola ads are removed.

