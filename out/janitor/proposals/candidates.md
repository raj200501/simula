# Rewarded-ad candidates: Janitor

Regime (computed): **subscription-gated**. 8 ideas, 3 written up.

## Blind labels (fill in before reading the judgments)

Label each proposal SHIP, REVISE or REJECT from the write-ups below, before running `judge`. Copy the labels to `proposals/labels.json` as `[{"id":"P1","label":"SHIP"}]`.

| id | title | case | archetype | surface | reward | your label (SHIP/REVISE/REJECT) |
|---|---|---|---|---|---|---|
| P1 | Extended Context Unlock | existing | TAX-1 | More memory for long chats. (s03) | 1 hour of 5x context memory |  |
| P2 | Daily Character Quest Hub | product-change | TAX-9 | @your_handle (s02) | Daily frontier swipe credits |  |
| P3 | Subscription Feature Sampling via Rewarded Ad | product-change | TAX-2 | Janitor Plus Paywall (s04) | 1-hour trial of Janitor Plus features for 1 hour |  |

## The obvious baseline (the bar to beat)

- Watch a full-screen interstitial ad before starting any character chat.
- Watch an ad to remove all ads across the platform for one day.
- Watch an ad to unlock 1 month of unlimited Janitor Plus subscription.

## Moment sweep

| moment | type | screen | value exchange | viable |
|---|---|---|---|---|
| m1 | wall | More memory for long chats. (s03) | User hits the memory limit on long chats and watches an ad to unlock temporary extended context | yes |
| m2 | decline | More memory for long chats. (s03) | User dismisses the memory paywall and is offered a time-boxed session pass of Janitor Plus features | yes |
| m3 | decline | Janitor Plus Paywall (s04) | User closes the main subscription paywall and can watch an ad for a frontier model feature sample | yes |
| m4 | desire | @your_handle (s02) | User views the billing or account menu and engages with a proactive daily credit hub | yes |
| m5 | first-value | Build, Share, Explore (s01) | First value discovery screen on launch; ads are strictly prohibited here by policy and safety rules | no |
| m6 | desire | Character Details (s09) | User views character details before starting a chat and can watch an ad for a session priority boost | yes |

## All ideas

| # | title | case | archetype | moment | reward | beyond baseline | selected because |
|---|---|---|---|---|---|---|---|
| 0 | Extended Context Unlock | existing | TAX-1 | m1 | 1 hour of 5x context memory | yes | Directly targets the core scarce resource (memory context) at the exact moment of need when hitting the paywall wall, maximizing opt-in intent without interrupting active roleplay. |
| 1 | Paywall-Decline Session Pass | existing | TAX-10 | m2 | 30 minutes of Janitor+ premium features | yes |  |
| 2 | Frontier Model Swipe Refill | existing | TAX-4 | m4 | 5 frontier model swipes | no |  |
| 3 | Priority Routing Pass | existing | TAX-4 | m6 | Priority routing for the next chat session | no |  |
| 4 | Daily Character Quest Hub | product-change | TAX-9 | m4 | Daily check-in credits for frontier swipes | yes | Introduces a proactive daily habit loop in the account drawer, creating predictable, non-interruptive inventory and long-term retention without cannibalizing core subscriptions. |
| 5 | Sponsored Regeneration Pass | product-change | TAX-6 | m6 | 1 free frontier reply regeneration | yes |  |
| 6 | Subscription Feature Sampling | product-change | TAX-2 | m3 | 1-hour trial of Janitor Plus | yes | Provides a clean paywall-decline fallback that captures non-converting users with a time-boxed sampling of Janitor Plus features, proving value and driving future upgrade conversion. |
| 7 | Character Badge Rental | product-change | TAX-13 | m6 | Temporary golden username badge for 24 hours | yes |  |

## Set checks (validateSet)

All checks pass.

## Proposals

### P1 v1: Extended Context Unlock

> Watch a quick game partner session to unlock 1 hour of 5x extended context memory.

- **Case:** existing · **Archetype:** TAX-1 · **Beyond baseline:** yes
- **Anchor:** moments m1; economy of1, w1
- **Surface:** More memory for
long chats. (s03) · **Trigger:** When the user hits the memory wall trying to continue a long chat without Janitor Plus.
- **Eligibility:** Non-paying free users hitting the memory context limit.
- **Offer:** "Unlock Memory Boost" / "Play a 15-second game to get 1 hour of context memory." / [Play Now] [No Thanks]
- **Simula:** SIM-RWD, entry button, Game Partner: Willson Wáng, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** 1 hour of 5x context memory · **Caps:** 3/day, cooldown 30 min
- **Cannibalization guard:** Time-boxed to 1 hour, rate-limited to 3 times per day, and gated to non-payers only; Janitor Plus subscription remains the permanent, un-interrupted option.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0180 (text-cheap x 10).
- Scenario, not a forecast: 35% of DAU engage, 1.5 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.525, ARPDAU $0.0063.
- **Flags:** Cost to serve the reward ($0.0180) exceeds net revenue per view ($0.0063) at the low end.
- **KPIs:** Rewarded ad ARPDAU and total ad revenue. Guardrails: Janitor Plus subscription conversion non-inferiority within -3%; D7 and D30 user retention stability; Session length and chat engagement stability. Holdout: A 10% user-level randomized holdout running for 28 days to measure net ARPU impact.
- **Precedents:** TAX-1, TAX-2, EX-DUO · **Risks:** Temporary memory unlock may slightly reduce immediate paywall views if overused Requires stable rewarded ad fill rates in chat utility flows
- **Evidence:** m1/e5 "Access advanced chat memory and priority" (unverified)

**Patch**

- new modal `ns1` based on More memory for
long chats. (s03): Rewarded ad invitation modal for context unlock
- new element `ne1` in More memory for
long chats. (s03) after e5: Rewarded ad trigger button for 1-hour context unlock
- new element `ne2` in ns1 overlay (no anchor): Mini-game invite kit and play button
- edge s03/ne1 → rwd (context_memory_1h +1 on REWARD_VERIFIED) when daily_reward_count < 3

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | More memory for long chats. (s03) | none |  | e5: Paywall blocks advanced memory | Free users hit the paywall when needing extended context memory. |
| 2 | change | More memory for long chats. (s03) | none |  | ne1: Tap to unlock via ad | Add an opt-in rewarded ad button below the wall. |
| 3 | offer | ns1 | invite |  | ne2: Play 15s to unlock 1 hour | Play a 15-second game to unlock 1 hour memory. |
| 4 | ad | ns1 | game |  | ne2: Playing with Game Partner | Complete the quick mini-game with your character partner. |
| 5 | value | More memory for long chats. (s03) | verified | context_memory_1h=1 | e5: 1 hour memory unlocked | One hour of extended context memory is now unlocked. |

### P2 v1: Daily Character Quest Hub

> Earn daily check-in rewards and frontier model swipes by completing character quests via rewarded mini-games.

- **Case:** product-change · **Archetype:** TAX-9 · **Beyond baseline:** yes
- **Anchor:** moments m4; economy of1, w1
- **New mechanic:** Daily Character Quest Hub: A proactive hub on the profile screen where users complete daily tasks and check-ins with characters to earn frontier swipe credits. Why: Janitor Plus gating frontier swipes leaves non-payers with limited access; a proactive quest hub creates predictable, non-interruptive rewarded inventory.
- **Surface:** @your_handle (s02) · **Trigger:** When the user views their profile and taps the new daily quest hub entry after onboarding.
- **Eligibility:** Non-paying users.
- **Offer:** "Unlock Free Frontier Swipes" / "Play a 15-second mini-game with Janitor AI to claim your daily check-in reward." / [Play Now] [No Thanks]
- **Simula:** SIM-RWD, entry invitation, Game Partner: Janitor AI, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** Daily frontier swipe credits · **Caps:** 3/day, cooldown 30 min
- **Cannibalization guard:** Restricted to non-payers, capped at 3 daily completions, and sized well below Janitor Plus monthly entitlements.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0090 (text-cheap x 5).
- Scenario, not a forecast: 25% of DAU engage, 1.5 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.375, ARPDAU $0.0045.
- **Flags:** Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end.
- **KPIs:** Rewarded ad ARPDAU and daily active engagement rate. Guardrails: Paid subscription conversion non-inferiority within -3%; D7 and D30 retention stability. Holdout: User-level 10% holdout test running for 28 days.
- **Precedents:** TAX-9, AI-3, EX-DUO, POL-8 · **Risks:** Low risk of subscription cannibalization if daily rewards remain modest compared to Janitor Plus benefits. Ad fill rates in non-US regions.
- **Evidence:** s02/e21 "Upgrade to Janitor Plus" ✓; s03/e9 "Everything in Free, plus:" ✓

**Patch**

- new sheet `ns1` based on @your_handle (s02): Add a Daily Character Quest Hub section to the profile screen.
- new element `ne1` in @your_handle (s02) after e21: Daily Character Quest Hub button
- edge s02/ne1 → ns1 (frontier_swipes +10 on REWARD_VERIFIED) when frontier_swipes_claims < 3

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | @your_handle (s02) | none | frontier_swipes=0 | e21: Upgrade to Janitor Plus only | Profile shows subscription upsell with no free daily reward option. |
| 2 | change | @your_handle (s02) | none | frontier_swipes=0 | ne1: Daily Character Quest Hub | Add a proactive Daily Character Quest Hub to the profile. |
| 3 | offer | ns1 | invite | frontier_swipes=0 | ne1: Play 15s to get frontier swipes | User taps quest and sees clear opt-in disclosure. |
| 4 | ad | ns1 | game | frontier_swipes=0 | ne1: Mini-game with Janitor AI | User plays the 15-second mini-game with Game Partner. |
| 5 | value | @your_handle (s02) | verified | frontier_swipes=10 | ne1: +10 frontier swipes granted | Reward verified and credited instantly to user account. |

### P3 v1: Subscription Feature Sampling via Rewarded Ad

> Offer a 1-hour trial of Janitor Plus when users dismiss the paywall after a rewarded mini-game.

- **Case:** product-change · **Archetype:** TAX-2 · **Beyond baseline:** yes
- **Anchor:** moments m3; economy of1, w1, plan
- **New mechanic:** Paywall-Decline Trial Pass: A 1-hour time-boxed trial of Janitor Plus features offered to free users immediately upon declining the subscription paywall. Why: Provides an accessible sampling path for price-sensitive users who decline the upfront subscription paywall, converting attention into upgrade intent.
- **Surface:** Janitor Plus Paywall (s04) · **Trigger:** When a free user taps 'Not now' to dismiss the Janitor Plus paywall (moment m3).
- **Eligibility:** Non-paying free users who dismiss the subscription paywall, capped at once per day.
- **Offer:** "Try Janitor Plus Free" / "Play a quick 15-second game to unlock 1 hour of premium memory." / [Play Now] [No Thanks]
- **Simula:** SIM-RWD, entry invitation, Game Partner: Janitor, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** 1-hour trial of Janitor Plus features for 1 hour · **Caps:** 1/day, cooldown 1440 min
- **Cannibalization guard:** Gated strictly to users who decline the paywall; time-boxed to 1 hour; permanently distinct from full monthly subscription entitlement.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0090 (text-premium x 1).
- Scenario, not a forecast: 25% of DAU engage, 1 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.25, ARPDAU $0.003.
- **Flags:** Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end.
- **KPIs:** Rewarded ARPDAU and subscription conversion rate among paywall decliners. Guardrails: Paid subscription conversion non-inferiority within 3%; D7/D30 user retention; Ad completion rate >= 95%. Holdout: 20% user-level randomized holdout running for 28 days to measure net revenue impact.
- **Precedents:** TAX-2, EX-DUO, TRIG-5, TAX-10 · **Risks:** Risk of temporary cannibalization if trial duration is too long Potential ad fill variations across international regions
- **Evidence:** s04/e12 "Not now" ✓

**Patch**

- new modal `ns1` based on Janitor Plus Paywall (s04): Trial offer confirmation modal shown upon tapping 'Not now' on the Janitor Plus paywall.
- new element `ne1` in Janitor Plus Paywall (s04) after e12: Button inviting user to watch a rewarded mini-game for a 1-hour trial.
- edge s04/ne1 → ns1 (plan +1 on REWARD_VERIFIED)

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | Janitor Plus Paywall (s04) | none | plan=0 | e12: User taps 'Not now' on paywall | User declines the Janitor Plus subscription paywall. |
| 2 | change | Janitor Plus Paywall (s04) | none | plan=0 | ne1: New trial offer button appears | App introduces a rewarded sampling offer upon paywall decline. |
| 3 | offer | ns1 | invite | plan=0 | ne1: Clear disclosure of 1-hour trial | User sees clear opt-in prompt with working decline. |
| 4 | ad | ns1 | game | plan=0 | ne1: 15-second partner mini-game | User completes the voluntary 15-second rewarded mini-game. |
| 5 | value | @your_handle (s02) | verified | plan=1 | e6: 1-hour trial active | Reward verified and 1-hour trial unlocked successfully. |

