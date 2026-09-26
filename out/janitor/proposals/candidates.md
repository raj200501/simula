# Rewarded-ad candidates: Janitor

Regime (computed): **subscription-gated**. 8 ideas, 3 written up.

## Proposals at a glance

The write-ups are below. The verdicts are in `judgments.md`, so a reader can form a view first.

| id | title | case | archetype | surface | reward |
|---|---|---|---|---|---|
| P1 | Paywall Fallback Swipes | existing | TAX-10 | Janitor Plus Paywall (s04) | 3 frontier model swipes |
| P2 | Session Context Boost | existing | TAX-2 | More memory for long chats. (s03) | 30 minutes of 5x context for better memory |
| P3 | Daily Check-in Swipes | product-change | TAX-9 | Profile menu (s02) | 5 bonus frontier model swipes |

## The obvious baseline (the bar to beat)

- Watch a 30-second video ad to unlock 24 hours of free Janitor Plus subscription access.
- Watch an ad when reaching a message limit to receive 10 more free messages.
- Watch a rewarded ad from the profile menu to earn generic roleplay tokens.

## Moment sweep

| moment | type | screen | value exchange | viable |
|---|---|---|---|---|
| m1 | wall | More memory for long chats. (s03) | Trade completing a 15-second mini-game for a time-boxed sample of advanced context memory or priority routing when viewing the memory paywall. | yes |
| m2 | decline | More memory for long chats. (s03) | Offer a 30-minute boost of 5x context for better memory immediately after the user dismisses the memory paywall. | yes |
| m3 | decline | Janitor Plus Paywall (s04) | Downsell a small grant of 3 frontier model swipes after the user declines the full Janitor Plus subscription modal. | yes |
| m4 | desire | Profile menu (s02) | Provide a proactive daily check-in or quest hub inside the profile menu that rewards bonus swipes or temporary boosts. | yes |
| m5 | first-value | Build, Share, Explore (s01) | No value exchange permitted on initial launch feed before experiencing core chat value per anti-fatigue policy. | no |
| m6 | desire | Character Details (s09) | Provide an opt-in priority connection or enhanced context preview before launching into a detailed character roleplay session. | yes |

## All ideas

| # | title | case | archetype | moment | reward | beyond baseline | selected because |
|---|---|---|---|---|---|---|---|
| 0 | Paywall Fallback Swipes | existing | TAX-10 | m3 | 3 frontier model swipes | yes | Captures high-intent non-converting users immediately after dismissing the Janitor Plus paywall modal (s04) with a micro-taste of frontier model swipes, driving sampling without cannibalizing the monthly subscription. |
| 1 | Timed Priority Routing Pass | existing | TAX-4 | m1 | 1 hour of priority routing for faster replies | yes |  |
| 2 | Session Context Boost | existing | TAX-2 | m2 | 30 minutes of 5x context for better memory | yes | Directly resolves the user's immediate barrier on the memory limit paywall screen (s03) with a 30-minute time-boxed unlock of the 5x context memory entitlement while keeping full permanent memory gated. |
| 3 | Character Pre-Chat Priority Pass | existing | TAX-2 | m6 | 1 chat session of priority routing for faster replies | no |  |
| 4 | Daily Check-in Swipes | product-change | TAX-9 | m4 | 5 daily bonus frontier swipes | yes | Introduces a non-intrusive proactive daily retention loop directly within the Profile menu (s02), granting a capped daily allowance of frontier swipes without degrading the existing unlimited free tier. |
| 5 | Extended Character Persona Slot | product-change | TAX-7 | m4 | 1 extra custom persona slot for 24 hours | yes |  |
| 6 | Scene Memory Pin Refill | product-change | TAX-7 | m1 | 2 pinned scene memories for current chat | yes |  |
| 7 | Profile Menu Frontier Swipes Refill | product-change | TAX-1 | m4 | 3 bonus frontier swipes | no |  |

## Set checks (validateSet)

All checks pass.

## Proposals

### P1 v1: Paywall Fallback Swipes

> Provide non-paying users with limited frontier model swipes in exchange for engagement when they decline the premium paywall.

- **Case:** existing · **Archetype:** TAX-10 · **Beyond baseline:** yes
- **Anchor:** moments m3; economy of1, w1, plan, swipes (new)
- **Surface:** Janitor Plus Paywall (s04) · **Trigger:** Fires immediately after the user taps the decline option ('Not now') on the Janitor Plus paywall.
- **Eligibility:** Non-paying, non-subscribed users who dismiss the premium subscription offer s04.
- **Offer:** "Want 3 free swipes?" / "Play a quick 15-second game to get 3 free swipes on our frontier models." / [Play Game] [No thanks]
- **Simula:** SIM-RWD, entry invitation, Game Partner: Janitor AI, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** 3 frontier model swipes · **Caps:** 2/day, cooldown 720 min
- **Cannibalization guard:** The offer is gated purely on paywall decline (TAX-10). It is strictly capped at 2 instances (6 swipes) per day, ensuring the premium subscription's 'generous monthly swipes' promise remains a far superior, frictionless option.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0270 (text-premium x 3).
- Scenario, not a forecast: 25% of DAU engage, 1.2 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.3, ARPDAU $0.0036.
- **Flags:** Cost to serve the reward ($0.0270) exceeds net revenue per view ($0.0063) at the low end.
- **KPIs:** Ad ARPDAU. Guardrails: Paywall s04 purchase conversion rate; D7 User Retention. Holdout: Run a 5% user-level holdout group for 28 days to measure downstream subscription cannibalization and net revenue lift.
- **Precedents:** TAX-10, CANN-1, AI-10, TRIG-4, TRIG-5 · **Risks:** Slight risk of micro-cannibalization among users who only need a couple of extra swipes per day, mitigated by the low daily cap. Potential fatigue if users repeatedly see the offer on every paywall dismissal, mitigated by the 12-hour cooldown.
- **Evidence:** s04/e8 "Generous monthly swipes with our frontier models" ✓; s04/e12 "Not now" ✓

**Patch**

- new modal `ns1` based on Janitor Plus Paywall (s04): Create an overlay modal containing the fallback invitation, containing the reward description, action length, and primary/secondary button layouts.
- new element `ne1` in ns1 overlay (no anchor): Primary button labeled 'Play Game' that launches the Simula mini-game on tap.
- new element `ne2` in ns1 after ne1: An equally legible secondary button labeled 'No thanks' that dismisses the fallback offer and routes the user back to their profile.
- edge s04/e12 → ns1
- edge ns1/ne1 → rwd (swipes +3 on REWARD_VERIFIED)
- edge ns1/ne2 → s02

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | Janitor Plus Paywall (s04) | none | swipes=0 | e12: User taps 'Not now' to decline subscription. | Today, when a user declines Janitor Plus on the paywall screen, they are returned directly to their profile menu with no premium features. |
| 2 | change | Janitor Plus Paywall (s04) | none | swipes=0 | e12: Intercepting decline tap to trigger the fallback offer. | We introduce a product change that intercepts the paywall decline action to offer a restricted sample of premium swipes. |
| 3 | offer | ns1 | invite | swipes=0 | ne1: Play 15-second game to earn 3 swipes | The fallback modal ns1 appears, explicitly offering 3 free frontier swipes for playing a 15-second game. |
| 4 | ad | ns1 | game | swipes=0 |  | The user plays an interactive 15-second mini-game powered by Simula's SDK. |
| 5 | value | Profile menu (s02) | verified | swipes=3 | e6: User gets 3 swipes credited to their account. | Upon REWARD_VERIFIED, 3 swipes are credited, and the user is redirected to s02 to begin using them. |

### P2 v1: Session Context Boost

> Unlock 30 minutes of 5x context memory by playing a quick mini-game after declining the Janitor Plus paywall.

- **Case:** existing · **Archetype:** TAX-2 · **Beyond baseline:** yes
- **Anchor:** moments m2; economy of1
- **Surface:** More memory for
long chats. (s03) · **Trigger:** User taps Close paywall (e3) on s03 without purchasing a subscription.
- **Eligibility:** Non-subscribers who dismiss the Janitor Plus paywall.
- **Offer:** "Boost Memory for 30 Minutes" / "Play a quick 15-second game for 30 minutes of 5x context." / [Play Now] [No Thanks]
- **Simula:** SIM-RWD, entry invitation, Game Partner: Janitor, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** 30 minutes of 5x context for better memory · **Caps:** 2/day, cooldown 120 min
- **Cannibalization guard:** Gated exclusively to paywall decliners at m2 and time-boxed to 30 minutes [TAX-2] [CANN-1]. The full Janitor Plus plan (of1) retains permanent 5x context, priority routing, and golden badge status.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0090 (text-premium x 1).
- Scenario, not a forecast: 15% of DAU engage, 1.2 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.18, ARPDAU $0.0022.
- **Flags:** Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end.
- **KPIs:** Rewarded ad revenue per DAU from paywall decliners. Guardrails: Janitor Plus subscription conversion rate (non-inferiority margin -2%); D7 chat retention. Holdout: 5% randomized user-level holdout for 30 days
- **Precedents:** TAX-2, EX-DUO, EX-MUSIC, TRIG-1, SAFE-1, POL-2 · **Risks:** Inference COGS for 5x context during the 30-minute window must be offset by US/Tier-1 eCPMs [TRIG-4]. Overuse could slightly delay subscription conversion for heavy chatters if capped too loosely [CANN-2].
- **Evidence:** s03/e3 "Close paywall" ✓; s03/e10 "5× context for better memory" ✓

**Patch**

- new modal `ns1` based on More memory for
long chats. (s03): Rewarded offer overlay shown upon paywall decline.
- new element `ne1` in ns1 overlay (no anchor): Reward invitation modal offering 30 minutes of 5x context memory.
- new element `ne2` in ns1 after ne1: Play Now button to launch Simula mini-game.
- new element `ne3` in ns1 after ne2: No Thanks button to return to core flow.
- edge s03/e3 → ns1
- edge ns1/ne2 → rwd (of1 +1 on REWARD_VERIFIED)
- edge ns1/ne3 → s01

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | More memory for long chats. (s03) | none |  | e3: User taps Close paywall after reviewing subscription | User reaches s03 paywall and chooses to dismiss it. |
| 2 | change | More memory for long chats. (s03) | none |  | e3: Paywall decline intercept catches exit flow | System intercepts paywall decline to offer a trial boost. |
| 3 | offer | ns1 | invite |  | ne1: Offer card introduces 30-min 5x context trial | Reward invitation offers 30 minutes of 5x context. |
| 4 | ad | ns1 | game |  | ne2: User plays 15s sponsored mini-game | User plays mini-game with Janitor Game Partner. |
| 5 | value | Build, Share, Explore (s01) | verified |  | e5: 5x context active banner enabled for 30 minutes | Reward verified and 30-minute context boost granted. |

### P3 v1: Daily Check-in Swipes

> Earn 5 daily bonus frontier model swipes by playing a 15-second mini-game in the Profile menu.

- **Case:** product-change · **Archetype:** TAX-9 · **Beyond baseline:** yes
- **Anchor:** moments m4; economy of1, w1, Frontier Swipes (new)
- **New mechanic:** Daily Check-in Swipes: A daily check-in feature on the Profile menu where users claim 5 bonus frontier model swipes after playing a short sponsored mini-game. Why: Janitor currently gates frontier model swipes behind the Janitor Plus subscription without any daily free check-in allowance for non-paying users.
- **Surface:** Profile menu (s02) · **Trigger:** User taps the 'Daily Check-in' card on s02 (Profile menu).
- **Eligibility:** Non-paying users who have not claimed today's check-in reward.
- **Offer:** "Daily Check-in Swipes" / "Play a 15-second game to claim 5 bonus frontier model swipes today." / [Play Now] [Maybe Later]
- **Simula:** SIM-RWD, entry invitation, Game Partner: Janitor, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** 5 bonus frontier model swipes · **Caps:** 1/day, cooldown 1440 min
- **Cannibalization guard:** Daily swipes are strictly capped at 5 per day, which lets non-payers sample frontier AI responses without replacing Janitor Plus's generous monthly swipes, 5x context memory, priority routing, or golden badge.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0450 (text-premium x 5).
- Scenario, not a forecast: 25% of DAU engage, 1 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.25, ARPDAU $0.003.
- **Flags:** Cost to serve the reward ($0.0450) exceeds net revenue per view ($0.0063) at the low end.
- **KPIs:** Daily active user retention (D7/D30) and check-in completion rate on s02.. Guardrails: Janitor Plus subscription conversion rate; Non-payer D30 retention rate; Frontier model API token cost per active user. Holdout: 5% randomized user-level holdout over 30 days.
- **Precedents:** TAX-9, EX-DUO, AI-3, TRIG-1, POL-8 · **Risks:** Frontier model LLM token costs for 5 swipes per completed view User disappointment if daily check-in swipes do not roll over to the next day
- **Evidence:** s02/e20 "Main navigation" ✓

**Patch**

- new element `ne1` in Profile menu (s02) before e20: Add a Daily Check-in card displaying title 'Daily Check-in' and CTA 'Claim 5 Frontier Swipes'.
- edge s02/ne1 → rwd (Frontier Swipes +5 on REWARD_VERIFIED) when Frontier Swipes < 5

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | Profile menu (s02) | none |  | e20: Profile menu shows navigation and Janitor Plus banner. | Profile menu s02 displays navigation and subscription options. |
| 2 | change | Profile menu (s02) | none | Frontier Swipes=0 | ne1: Daily Check-in card ne1 added above navigation. | Daily check-in module ne1 appears on Profile menu s02. |
| 3 | offer | Profile menu (s02) | invite | Frontier Swipes=0 | ne1: Simula invitation modal presents check-in offer terms. | Tapping check-in displays Simula reward offer with clear disclosures. |
| 4 | ad | Profile menu (s02) | game | Frontier Swipes=0 | ne1: 15-second mini-game plays with Janitor AI partner. | User plays 15-second mini-game with Game Partner Janitor. |
| 5 | value | Profile menu (s02) | verified | Frontier Swipes=5 | ne1: 5 Frontier Swipes verified and credited. | REWARD_VERIFIED event credits 5 Frontier Swipes instantly. |

