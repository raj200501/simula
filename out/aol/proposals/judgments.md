# Judgments: AOL

Verdicts are computed in code: SHIP at weighted ≥ 3.8 with every criterion ≥ 3 and every gate passing; REVISE between 3 and 3.8, on any criterion ≤ 2, or on a fixable gate; REJECT below 3, on a policy gate, or still REVISE after round 2 (or when a revision stalls: < +0.2 and no gate fixed). Only SHIP goes to the slides.

Weights: value-moment-fit 20, product-integrity 15, cannibalization-safety 15, unit-economics 10, reach 10, feasibility 10, specificity 10, frequency-fatigue 5, measurability 5.

## Summary

| proposal | title | final | weighted | versions | summary |
|---|---|---|---|---|---|
| P1 | AOL Guest Commenter | **REJECT** | 3.4 | v1 → v2 | REJECT after 1 revision: revision stalled (weighted -1.2, below +0.2) with the same gate failures. Top concern: grounding (code): economy item "Account sign-in / verified user status" does not exist; evidence "m9" is not an observation or screen in the model; evidence "f1" is not an observation or screen in the model |
| P2 | AOL Ad-Free Sprint | **SHIP** | 4.1 | v1 → v2 → v3 | SHIP at 4.1 (v3 after 2 revisions). |
| P3 | Daily Reader Streak & Ad-Free Access | **REJECT** | 3.85 | v1 → v2 | REJECT after 1 revision: revision stalled (weighted -0.15, below +0.2) with the same gate failures. Top concern: economics (code): 15 ad-free minutes give up about 15 display impressions ($0.0187 at $0.00125 each), more than one view nets ($0.0063) at the low end. |

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

> Enjoy 5 minutes of ad-free news reading after a quick game.

- product-change · TAX-2 · surface News Feed Home (s13) · reward 5 minutes of ad-free reading · caps 3/day

#### Round 0 (v1): **REVISE** · weighted 3.3 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "Ad-free Sprint" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | 15 ad-free minutes give up about 15 display impressions ($0.0187 at $0.00125 each), more than one view nets ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The placement is on s11 (Account Menu Sidebar) which is dedicated to account settings, saved articles, and support: 'User opens the Account Menu Sidebar and views account options.' |
| no-incentivized-action | llm | policy | pass | The reward is an in-app ad suppression entitlement: 'Play a 15-second game to clear all ads from your news feed for a short sprint.' |
| no-loss-framing | llm | policy | pass | The copy uses a positive gain frame with standard CTAs: 'Go Ad-Free for 15 Minutes' / 'Start Sprint' / 'No thanks'. |
| explicit-opt-in | llm | fixable | pass | The user explicitly initiates the flow via the sidebar button and confirms via the offer CTA: 'Simula MiniGameInvitation appears, disclosing the 15-second requirement and the 15-minute reward.' CTA: 'Start Sprint'. |
| disclosed | llm | fixable | pass | Both the required play duration and the entitlement length are clearly stated prior to engagement: 'Play a 15-second game to clear all ads from your news feed for a short sprint.' |
| free-decline | llm | fixable | pass | A standard, unpenalized decline action is provided: 'decline': 'No thanks'. |
| no-stream-interrupt | llm | fixable | pass | The trigger occurs outside active content consumption: 'User opens the Account Menu Sidebar and views account options.' |
| not-for-subscribers | llm | fixable | pass | Gated strictly to non-paying users: 'Non-paying users currently exposed to standard ad density.' |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 3 | The offer is placed inside s11 (Account Menu Sidebar) as a proactive option ('User opens the Account Menu Sidebar and views account options') rather than at a moment of acute reader friction or blocked reading intent. |
| product-integrity | 15 | 4 | The proposal introduces an additive mechanic ('Ad-free Sprint') that temporarily removes ads without degrading the free reading experience: 'A time-boxed entitlement that suppresses all native and banner advertisements across news feeds and article pages.' |
| cannibalization-safety | 15 | 4 | The entitlement is time-boxed to 15 minutes, capped at 3 times per day with a 60-minute cooldown, and tested against a holdout: 'The reward is strictly time-boxed to 15 minutes, serving as a 'taste of premium' sampling effect'. |
| unit-economics | 10 | 2 | Code calculation shows: '15 ad-free minutes give up about 15 display impressions ($0.0187 at $0.00125 each), more than one view nets ($0.0063) at the low end.' Suppressing display ads produces an opportunity cost ($0.0188) that exceeds the gross revenue of a single rewarded completion ($0.0090–$0.0150). |
| reach | 10 | 2 | The Account Menu Sidebar (s11 / m10) has reach=occasional in the digest: 'User opens the sidebar menu to access account settings, saved articles, contacts, and support.' It sits outside the core feed browsing loop. |
| feasibility | 10 | 4 | Maps cleanly to SIM-RWD using a button entry point in s11, triggering standard client-side ad suppression logic for a 15-minute window: 'unit': 'SIM-RWD', 'entry': 'button'. |
| specificity | 10 | 3 | References s11, s02, Taboola ad sections, and element IDs like e12 ('Home'), but the 'Ad-Free Sprint' concept is a standard non-game template that does not tap into unique AOL content mechanics. |
| frequency-fatigue | 5 | 5 | Explicitly bounded with reasonable limits and a proactive placement that prevents nagging: 'perDay': 3, 'cooldownMin': 60. |
| measurability | 5 | 3 | Specifies guardrails and a holdout ('User-level holdout, 10% share, 21 days'), but the primary KPI ('Ad-free Sprint sessions started') tracks feature adoption rather than net monetization or reader ARPU. |

- **Verdict reasons (code):** fixable gate failed: economics (code); unit-economics scored 2 (< 3); reach scored 2 (< 3); weighted 3.3 < 3.8
- **Required changes:**
  - Shorten the ad-free duration (e.g., from 15 minutes to 5–10 minutes) or switch to an 'ad-light' suppression model so the opportunity cost of suppressed display impressions does not exceed the revenue generated by the rewarded view ($0.0090–$0.0150).
  - Move or duplicate the entry point onto core-loop reading surfaces (such as an inline chip between feed sections or at the bottom of an article) instead of isolating it within the occasional Account Menu Sidebar (s11).
  - Change the primary KPI from feature starts ('Ad-free Sprint sessions started') to net ARPU / total ad revenue per user to properly capture the net margin impact.
- **Top concern:** The opportunity cost of suppressing 15 minutes of high-density display and native ads ($0.0188) exceeds the revenue generated by one completed rewarded view ($0.0090–$0.0150), leading to negative unit economics.

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `oneLiner`: "Enjoy 15 minutes of ad-free news reading after a quick game." → "Enjoy 10 minutes of ad-free news reading after a quick game."
- `anchor.moments[0]`: "m2" → "m6"
- `anchor.moments[1]`: "m10" → "m7"
- `anchor.economy[1]`: "AD TODAY banner on Article Ad View (e17)" → "AD TODAY native on News Feed Home (e41)"
- `anchor.economy[2]`: "Ad-free Sprint (new)" → "AD TODAY banner on Article Detail Page (e22)"
- `anchor.newMechanic.whyNeeded`: "The app is currently high-density in advertisements but lacks a scarcity-based value e..." → "The app currently has high ad density but lacks a scarcity-based value exchange to dri..."
- `surface`: "s11" → "s13"
- `trigger`: "User opens the Account Menu Sidebar and views account options." → "User is browsing the News Feed Home (s13) or finishes reading an article."
- `eligibility`: "Non-paying users currently exposed to standard ad density." → "Non-paying users currently exposed to standard native and banner ad density."
- `offer.title`: "Go Ad-Free for 15 Minutes" → "Ad-Free for 10 Minutes"
- `offer.body`: "Play a 15-second game to clear all ads from your news feed for a short sprint." → "Play a 15-second game to remove all ads for 10 minutes. Enjoy your news."
- `offer.cta`: "Start Sprint" → "Go Ad-Free"
- `offer.decline`: "No thanks" → "Keep reading"
- `reward.what`: "15 minutes of ad-free reading" → "10 minutes of ad-free reading"
- `reward.amount`: 15 → 10
- `reward.duration`: "15 minutes" → "10 minutes"
- `cannibalizationGuard`: "The reward is strictly time-boxed to 15 minutes, serving as a 'taste of premium' sampl..." → "The reward is strictly time-boxed to 10 minutes and offered inline to non-payers, serv..."
- `assumptions.engagedShare`: 0.15 → 0.12
- `assumptions.viewsPerEngager`: 1.5 → 1.8
- `kpis.primary`: "Ad-free Sprint sessions started" → "Net ARPU (total ad revenue per user)"
- `kpis.guardrails[1]`: "Native ad CTR (non-sprint)" → "Native ad CTR in non-sprint sessions"
- `kpis.guardrails[2]`: "D7 Retention" → "D30 Retention"
- `kpis.holdout`: "User-level holdout, 10% share, 21 days" → "User-level holdout, 10% share, 28 days"
- `risks[0]`: "Users may grow accustomed to ad-free reading and find the return to standard density j..." → "The 10-minute duration must be carefully monitored to ensure the rewarded eCPM exceeds..."
- `risks[1]`: "Potential revenue dip if sprint sessions overlap with peak reading times." → "User fatigue if the inline chip appears too frequently in short feeds."
- `evidence[0].obs`: "s11" → "s13"
- `evidence[0].quote`: "Unsubscribe" → "TEMU in Taboola advertising section"
- `evidence[1].obs`: "s02" → "s03"
- `evidence[1].el`: "e47" → "e22"
- `evidence[1].quote`: "TEMU in Taboola advertising section" → "ADVERTISEMENT"
- ... and 42 more changes

#### Round 1 (v2): **REVISE** · weighted 4.45 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "Ad-free Sprint" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | 10 ad-free minutes give up about 10 display impressions ($0.0125 at $0.00125 each), more than one view nets ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The news feed contains general category news (Entertainment, Local, Sports, Business) and the proposal offers ad-free reading. |
| no-incentivized-action | llm | policy | pass | The reward is for playing a mini-game to gain a time-boxed ad-free session, not for clicking ads, installing, or rating. |
| no-loss-framing | llm | policy | pass | The design uses gain-framing ('Enjoy your news', 'Go Ad-Free') and provides a clear 'Keep reading' decline button. |
| explicit-opt-in | llm | fixable | pass | The user taps an explicit 'Go Ad-Free' button before the ad starts. |
| disclosed | llm | fixable | pass | The proposal states: 'Play a 15-second game to remove all ads for 10 minutes.' |
| free-decline | llm | fixable | pass | The decline option is 'Keep reading' which keeps the user in the feed without penalty. |
| no-stream-interrupt | llm | fixable | pass | The ad is placed in the feed (s13) or at the end of an article (s03), not during a stream. |
| not-for-subscribers | llm | fixable | pass | Eligibility is explicitly limited to 'Non-paying users currently exposed to standard native and banner ad density.' |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | News readers are interrupted by ads in the feed; removing those ads for 10 minutes creates immediate, tangible value for a reader at the moment of peak friction. |
| product-integrity | 15 | 5 | The proposal replaces ads with content directly in the feed; it does not degrade the article content or force transitions. |
| cannibalization-safety | 15 | 4 | The reward is time-boxed (10 mins) and capped (3/day), ensuring heavy readers still encounter ads. |
| unit-economics | 10 | 2 | The code-calculated cost to serve (lost impressions) exceeds the net revenue from the ad view, making the sprint as currently configured net-negative. |
| reach | 10 | 5 | The News Feed is the core loop of the AOL application. |
| feasibility | 10 | 4 | The proposal maps to SIM-RWD units and is a standard UI element implementation. |
| specificity | 10 | 5 | Uses app-specific screens like 'News Feed Home' (s13) and integrates near existing elements like the Taboola section (e46). |
| frequency-fatigue | 5 | 5 | Caps are set to 3 per day with a 60-minute cooldown, which is conservative and prevents nagging. |
| measurability | 5 | 5 | Defines primary metric, guardrails, and specifies a 10% user-level holdout for 28 days. |

- **Verdict reasons (code):** fixable gate failed: economics (code); unit-economics scored 2 (< 3)
- **Required changes:**
  - Reduce the Ad-Free Sprint duration from 10 minutes to 5 minutes to align the value of the suppressed impressions with the revenue generated by the ad view.
  - Add a 'Get AOL Plus' or 'Go Ad-Free Forever' contrast line to the grant or offer screen to explicitly connect the temporary sprint to a long-term subscription upsell.
- **Top concern:** The unit economics are currently negative; 10 minutes of ad-free reading likely suppresses more ad revenue than a single 15-second rewarded ad view generates.

#### Changes v2 → v3 (revise() saw the required changes, never the scores)

- `oneLiner`: "Enjoy 10 minutes of ad-free news reading after a quick game." → "Enjoy 5 minutes of ad-free news reading after a quick game."
- `offer.title`: "Ad-Free for 10 Minutes" → "Ad-Free for 5 Minutes"
- `offer.body`: "Play a 15-second game to remove all ads for 10 minutes. Enjoy your news." → "Play a 15-second game to remove ads for 5 minutes. Go Ad-Free with AOL Plus."
- `reward.what`: "10 minutes of ad-free reading" → "5 minutes of ad-free reading"
- `reward.amount`: 10 → 5
- `reward.duration`: "10 minutes" → "5 minutes"
- `cannibalizationGuard`: "The reward is strictly time-boxed to 10 minutes and offered inline to non-payers, serv..." → "The reward is strictly time-boxed to 5 minutes and offered inline to non-payers, servi..."
- `risks[0]`: "The 10-minute duration must be carefully monitored to ensure the rewarded eCPM exceeds..." → "The 5-minute duration must be monitored to ensure the rewarded eCPM exceeds the opport..."
- `patch.newElements[1].change`: "A small chip at the end of the article text inviting the user to start an Ad-Free Spri..." → "A small chip at the end of the article text inviting the user to start an Ad-Free Spri..."
- `patch.newEdges[0].effects[0].delta`: 10 → 5
- `patch.newEdges[1].effects[0].delta`: 10 → 5
- `storyboard[2].caption`: "A Simula MiniGameInvitation explains the 15-second game and 10-minute reward." → "A Simula MiniGameInvitation explains the 15-second game and 5-minute reward."
- `storyboard[4].counters[0].value`: 10 → 5
- `storyboard[4].caption`: "Ads are removed from the feed for 10 minutes as the reward is granted." → "Ads are removed from the feed for 5 minutes as the reward is granted."

#### Round 2 (v3): **SHIP** · weighted 4.1 · judged by llm

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
| sfw | llm | policy | pass | The AOL mobile app content, including the news feed and article pages, is rated as general news reading. The proposal targets non-paying users within these feeds, which are standard SFW surfaces. |
| no-incentivized-action | llm | policy | pass | The reward is ad-free reading, which is an in-app entitlement and not a cash, gift card, or external incentive. Users are not incentivized to click or download. |
| no-loss-framing | llm | policy | pass | The proposal uses gain framing: 'Play a 15-second game to remove ads for 5 minutes.' There is no hostage framing or confirmation shaming. |
| explicit-opt-in | llm | fixable | pass | The proposal includes an inline card with a 'Play 15s to Go Ad-Free' CTA, requiring an explicit user tap to initiate. |
| disclosed | llm | fixable | pass | The proposal states the required action ('Play a 15-second game') and the exact reward ('5 minutes of ad-free reading') in the offer UI. |
| free-decline | llm | fixable | pass | The offer UI includes a clear decline CTA ('Keep reading') that returns the user to the feed immediately with no penalty. |
| no-stream-interrupt | llm | fixable | pass | The unit is placed as an inline feed card and an article chip, not in the middle of a streaming interaction. |
| not-for-subscribers | llm | fixable | pass | The proposal specifies eligibility for 'Non-paying users currently exposed to standard native and banner ad density.' |
| portfolio-distinct | code | fixable | pass | the first SHIP of the portfolio |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | Users browsing the News Feed (s13) are in a 'lean back' reading session where removing interruptions is a high-value, immediate need. |
| product-integrity | 15 | 4 | Ad-free reading is a standard and native premium feature. Time-boxing the entitlement preserves the core ad-supported product model. |
| cannibalization-safety | 15 | 4 | The 5-minute time box and 3-per-day cap are highly restrictive, limiting the risk of replacing a permanent subscription with ad-views. |
| unit-economics | 10 | 3 | The provided code suggests a COGS of $0.0063 per view against $0.0090 revenue, making it profitable but tighter than the 30% margin criterion for a 5-point score. |
| reach | 10 | 5 | The trigger is placed in the News Feed Home (s13), which is the app's core loop and accessed during every visit. |
| feasibility | 10 | 4 | Uses standard SIM-RWD units with established patterns for native feed integration. |
| specificity | 10 | 4 | Proposal references 'Taboola advertising sections' (e46) and 'AOL Plus', using relevant terminology from the AOL product digest. |
| frequency-fatigue | 5 | 5 | Includes a 3-per-day cap and 60-minute cooldown, which prevents nagging and habituation. |
| measurability | 5 | 5 | Includes a clearly defined holdout (10% user-level) and tracks both ad revenue and D30 retention as guardrails. |

- **Verdict reasons (code):** weighted 4.1 >= 3.8, every criterion >= 3, all gates pass
- **Required changes:**
  - Verify if 'AOL Plus' exists in the product model; if it is unconfirmed, replace 'Go Ad-Free with AOL Plus' with generic language regarding premium subscriptions to avoid misleading users.
  - Ensure the countdown badge in the UI (ne3) is visually distinct from core app navigation to avoid confusion.
- **Top concern:** The proposal includes an explicit reference to 'AOL Plus' as an upgrade path, but the product digest flags this as an 'open question' that is not verified. This could be a misleading claim if the service doesn't exist.


## P3: Daily Reader Streak & Ad-Free Access — REJECT

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

#### Round 1 (v2): **REVISE** · weighted 3.85 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "AOL News Credits & Ad-Free Mode" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | **FAIL** | 15 ad-free minutes give up about 15 display impressions ($0.0187 at $0.00125 each), more than one view nets ($0.0063) at the low end. |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Users interact with the Daily Streak card in the Account Sidebar (s11) to earn credits, or tap 'Go Ad-Free' in Article Details (s03) to redeem credits for ad-free reading. |
| no-incentivized-action | llm | policy | pass | Play a 15-second game with AOL to earn 10 News Credits, or unlock 15m of Ad-Free reading! |
| no-loss-framing | llm | policy | pass | Title: 'Earn News Credits', Body: 'Play a 15-second game with AOL to earn 10 News Credits, or unlock 15m of Ad-Free reading!', cta: 'Play Now', decline: 'No thanks' |
| explicit-opt-in | llm | fixable | pass | User taps Claim to start the rewarded ad flow. |
| disclosed | llm | fixable | pass | Play a 15-second game with AOL to earn 10 News Credits, or unlock 15m of Ad-Free reading! |
| free-decline | llm | fixable | pass | cta: 'Play Now', decline: 'No thanks' |
| no-stream-interrupt | llm | fixable | pass | redemed in the Article Details view to unlock a 15-minute Ad-Free Reader Mode. |
| not-for-subscribers | llm | fixable | pass | Non-signed-in users and signed-in non-subscribers who have not claimed today's reward. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | Credits are redeemed in the Article Details view to unlock a 15-minute Ad-Free Reader Mode. |
| product-integrity | 15 | 4 | A habit-building virtual currency earned through daily streaks and rewarded ads. Credits are redeemed in the Article Details view to unlock a 15-minute Ad-Free Reader Mode. |
| cannibalization-safety | 15 | 5 | The reward is a small, time-boxed sample of ad-free reading (15m) that provides a 'taste' of premium value, encouraging upgrade intent without giving away unlimited ad-free access. Offers are gated to non-subscribers. |
| unit-economics | 10 | 1 | 15 ad-free minutes give up about 15 display impressions ($0.0187 at $0.00125 each), more than one view nets ($0.0063) at the low end. |
| reach | 10 | 3 | Users interact with the Daily Streak card in the Account Sidebar (s11) to earn credits, or tap 'Go Ad-Free' in Article Details (s03) |
| feasibility | 10 | 4 | unit: SIM-RWD, entry: button, gamePartner: AOL, minPlaySec: 15 |
| specificity | 10 | 4 | AOL News Credits & Ad-Free Mode... Article Details (s03)... Account Sidebar (s11)... TEMU in Taboola advertising section |
| frequency-fatigue | 5 | 5 | perDay: 3, cooldownMin: 30 |
| measurability | 5 | 5 | primary: D7 Retention, guardrails: [Average Sessions Per DAU, Paid Subscription Conversion Rate], holdout: User-level randomization, 10% share, 28-day duration |

- **Verdict reasons (code):** fixable gate failed: economics (code); unit-economics scored 1 (< 3)
- **Required changes:**
  - Shorten the duration of the Ad-Free Reader Mode session from 15 minutes to 5 minutes to reduce the display ad opportunity cost.
  - Increase the required number of News Credits needed to unlock the ad-free session so that it requires multiple rewarded ad views to break even.
  - Introduce a strict daily limit on the total number of ad-free sessions a user can redeem in a single day.
- **Top concern:** The current unit economics are negative, as a 15-minute ad-free session results in a $0.0187 loss of display ad revenue, which exceeds the $0.0090–$0.0150 gross revenue generated by a single rewarded view.

