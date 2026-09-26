# Rewarded-ad candidates: Janitor

Regime (computed): **subscription-gated**. 8 ideas, 3 written up.

## Blind labels (fill in before reading the judgments)

Label each proposal SHIP, REVISE or REJECT from the write-ups below, before running `judge`. Copy the labels to `proposals/labels.json` as `[{"id":"P1","label":"SHIP"}]`.

| id | title | case | archetype | surface | reward | your label (SHIP/REVISE/REJECT) |
|---|---|---|---|---|---|---|
| P1 | Context Memory Boost | existing | TAX-7 | More memory for long chats. (s03) | 30 minutes of 5x context memory for 30m |  |
| P2 | Paywall-Decline Priority Routing | existing | TAX-10 | More memory for long chats. (s03) | 15 minutes of priority routing |  |
| P3 | Premium Scenario Unlock | product-change | TAX-3 | Character Details (s09) | 72-hour access to Premium Scenario for 72 hours |  |

## The obvious baseline (the bar to beat)

- Watch a 30-second video ad to get 10 free premium text messages with any character.
- Watch an ad to get 15 minutes of priority routing for faster AI reply speeds.
- Watch an ad to temporarily unlock the golden checkmark next to your username for 24 hours.

## Moment sweep

| moment | type | screen | value exchange | viable |
|---|---|---|---|---|
| m1 | wall | More memory for long chats. (s03) | Play a 15-second game to unlock 30 minutes of 5x context memory for long chats. | yes |
| m2 | decline | More memory for long chats. (s03) | Play a 15-second game to get a temporary priority routing boost for 15 minutes after paywall dismissal. | yes |
| m3 | decline | Janitor Plus Paywall (s04) | Play a 15-second game to earn 5 frontier model swipes after declining the main subscription paywall. | yes |
| m4 | desire | Profile menu (s02) | Access an always-available task hub in the profile menu to earn cosmetic checkmarks via partner games. | yes |
| m5 | first-value | Build, Share, Explore (s01) | Cannot offer ads on first-launch or main exploration feed to preserve initial user value experience. | no |
| m6 | desire | Character Details (s09) | Play a 15-second partner game to unlock a detailed character background scenario on the details page. | yes |

## All ideas

| # | title | case | archetype | moment | reward | beyond baseline | selected because |
|---|---|---|---|---|---|---|---|
| 0 | Context Memory Boost | existing | TAX-7 | m1 | 30 minutes of 5x context memory | yes | Context Memory Boost targets users precisely at their moment of frustration (m1) when the chatbot starts 'forgetting' key details in long chat sessions, offering high value while sampling the subscription's 5x context feature. |
| 1 | Paywall-Decline Priority routing | existing | TAX-10 | m2 | 15 minutes of priority routing | yes | Paywall-Decline Priority routing effectively monetizes non-paying users who dismiss the main billing screen (m2) by offering them a short, non-cannibalizing taste of fast response speeds. |
| 2 | Frontier Swipes Sample | existing | TAX-2 | m3 | 5 frontier model swipes | yes |  |
| 3 | Profile Menu Mini-Game Hub | product-change | TAX-9 | m4 | 1 day of golden username checkmark | yes |  |
| 4 | Premium Scenario Unlock | product-change | TAX-3 | m6 | unlocked premium character scenario | yes | Premium Scenario Unlock introduces a product-change model that gates optional, curated creative scenarios (m6) behind mini-games, which boosts community creator content value without interfering with core chat mechanics. |
| 5 | Extra Character Slots | product-change | TAX-7 | m4 | 1 temporary custom character slot for 7 days | yes |  |
| 6 | Speed Boost Token | existing | TAX-4 | m1 | 10 priority model replies | no |  |
| 7 | Golden Checkmark Cosmetics | existing | TAX-13 | m4 | 1 hour of golden checkmark | no |  |

## Set checks (validateSet)

All checks pass.

## Proposals

### P1 v1: Context Memory Boost

> Unlock 30 minutes of 5x context memory for roleplay via a rewarded mini-game.

- **Case:** existing · **Archetype:** TAX-7 · **Beyond baseline:** yes
- **Anchor:** moments m1, m2; economy of1, w1, plan
- **Surface:** More memory for
long chats. (s03) · **Trigger:** When the user lands on the memory paywall screen (s03) and is blocked from advanced context.
- **Eligibility:** Non-paying users reaching the memory wall.
- **Offer:** "Unlock 5x Memory Now" / "Play a quick 15-second game to get 5x context memory for the next 30 minutes." / [Play Now] [Not Now]
- **Simula:** SIM-RWD, entry button, Game Partner: Janitor, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** 30 minutes of 5x context memory for 30m · **Caps:** 2/day, cooldown 60 min
- **Cannibalization guard:** The reward is strictly time-boxed to 30 minutes and capped at 2 uses per day, ensuring the monthly subscription remains the only way to get permanent memory [TAX-2] [CANN-2].
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0090 (text-premium x 1).
- Scenario, not a forecast: 15% of DAU engage, 1.2 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.18, ARPDAU $0.0022.
- **Flags:** Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end.
- **KPIs:** rewarded_impressions_per_dau. Guardrails: subscription_conversion_rate; average_session_length. Holdout: user-level, 10% share, 21 days
- **Precedents:** TAX-7, TAX-2, AI-7, EX-DUO · **Risks:** Increased inference costs due to 5x context size per user session [TRIG-4]. Potential devaluation of the Janitor Plus subscription if 30 minutes satisfies core roleplay sessions.
- **Evidence:** s03/e10 "5× context for better memory" ✓; m1 "Access advanced chat memory and priority is blocked" (unverified)

**Patch**

- new element `ne1` in More memory for
long chats. (s03) after e10: Add a MiniGameButton styled as 'Try 30 mins for free' below the context feature description.
- edge s03/ne1 → rwd (plan +1 on REWARD_VERIFIED)

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | More memory for long chats. (s03) | none |  | e10: Memory context is currently locked for free users. | The user hits the memory paywall when seeking better context for their chat. |
| 2 | change | More memory for long chats. (s03) | none |  | ne1: A new option to unlock memory via a game appears. | We add a 'Try for free' button under the premium context feature. |
| 3 | offer | More memory for long chats. (s03) | invite |  | ne1: User opts in to the value exchange. | The invite screen discloses the 15s play time and the 30-minute reward. |
| 4 | ad | More memory for long chats. (s03) | game |  |  | The user plays a quick mini-game with Janitor to earn the context boost. |
| 5 | value | More memory for long chats. (s03) | verified |  | e10: Memory unlocked for 30 minutes. | Upon verification, the user receives 30 minutes of enhanced roleplay memory. |

### P2 v1: Paywall-Decline Priority Routing

> Offer a 15-minute priority routing pass when users decline the Janitor Plus subscription paywall.

- **Case:** existing · **Archetype:** TAX-10 · **Beyond baseline:** yes
- **Anchor:** moments m2; economy of1, w1
- **Surface:** More memory for
long chats. (s03) · **Trigger:** When the user taps 'Close paywall' on the Janitor Plus subscription screen without subscribing.
- **Eligibility:** Non-payers who decline the Janitor Plus subscription paywall.
- **Offer:** "Want Faster Replies?" / "Play a quick 15-second game to unlock 15 minutes of priority routing." / [Play Now] [No thanks]
- **Simula:** SIM-RWD, entry button, Game Partner: Janitor, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** 15 minutes of priority routing · **Caps:** 2/day, cooldown 60 min
- **Cannibalization guard:** Gated strictly to paywall decliners and non-payers, time-boxed to 15 minutes, preserving the full permanent subscription value.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0000 (none x 0).
- Scenario, not a forecast: 25% of DAU engage, 1.5 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.375, ARPDAU $0.0045.
- Flags: none.
- **KPIs:** Rewarded ad revenue and incremental engagement. Guardrails: Paid subscription conversion non-inferiority; D7/D30 retention; Session length. Holdout: 5% user-level holdout for 28 days
- **Precedents:** TAX-10, EX-DUO · **Risks:** User fatigue if shown too frequently Perception of subscription discounting
- **Evidence:** m2/e3 "Close paywall" ✓

**Patch**

- new element `ne1` in More memory for
long chats. (s03) after e3: Add rewarded ad fallback button 'Play for Priority Routing'
- edge s03/ne1 → rwd (priority_routing_min +15 on REWARD_VERIFIED)

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | More memory for long chats. (s03) | none |  | e3: User taps Close paywall | User views the Janitor Plus subscription paywall and declines. |
| 2 | change | More memory for long chats. (s03) | none |  | ne1: Fallback ad offer appears | Upon declining, a compliant rewarded fallback offer is presented. |
| 3 | offer | More memory for long chats. (s03) | invite |  | ne1: Play 15s for 15m priority | Clear disclosure states the 15-second mini-game requirement and 15-minute reward. |
| 4 | ad | More memory for long chats. (s03) | game |  | ne1: 15s mini-game active | User plays the 15-second interactive partner mini-game. |
| 5 | value | More memory for long chats. (s03) | verified | priority_routing_min=15 | ne1: +15m Priority Routing granted | Upon REWARD_VERIFIED, 15 minutes of priority routing is unlocked instantly. |

### P3 v1: Premium Scenario Unlock

> Watch a quick game to unlock a premium scenario for 72 hours.

- **Case:** product-change · **Archetype:** TAX-3 · **Beyond baseline:** yes
- **Anchor:** moments m6; economy s09
- **New mechanic:** Premium Scenario Lock: Gating character-specific scenarios behind a premium requirement, accessible via rewarded ad. Why: Leverages character-specific content as high-intent content anchors to drive monetization. **Removes free value (high risk).**
- **Surface:** Character Details (s09) · **Trigger:** User taps 'Unlock Scenario' on a premium-gated character scenario in Character Details.
- **Eligibility:** Non-subscribers only.
- **Offer:** "Unlock Premium Scenario" / "Play a quick game to unlock this premium scenario for 72 hours." / [Play Now] [No thanks]
- **Simula:** SIM-RWD, entry button, Game Partner: Willson Wáng, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** 72-hour access to Premium Scenario for 72 hours · **Caps:** 3/day, cooldown 60 min
- **Cannibalization guard:** Non-subscribers only; gated by 72-hour expiry and daily frequency cap. Includes clear upsell path to subscription.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0000 (none x 1).
- Scenario, not a forecast: 30% of DAU engage, 1.5 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.45, ARPDAU $0.0054.
- Flags: none.
- **KPIs:** Scenario views per DAU. Guardrails: Paid conversion non-inferiority; D30 retention. Holdout: 10% user-level holdout for 4 weeks
- **Precedents:** TAX-3, TRIG-5, EX-SERIAL · **Risks:** High risk: gating content creates friction for free users; requires clear communication. Potential churn if scenario selection feels predatory.
- **Evidence:** s09/Willson Wáng "Willson.. Stop growing a tail please." ✓

**Patch**

- new element `ne1` in Character Details (s09) after Willson Wáng: Unlock Scenario Button
- edge s09/ne1 → rwd (UnlockedScenario +1 on REWARD_VERIFIED) when JanitorPlus < 1

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | Character Details (s09) | none |  |  | User views character details for Willson Wáng. |
| 2 | change | Character Details (s09) | none |  | ne1: Unlock premium scenario | Unlock button added to scenario details. |
| 3 | offer | Character Details (s09) | invite |  | ne1: Play 15s to unlock | Offer appears for non-subscribers. |
| 4 | ad | Character Details (s09) | game |  |  | User plays a 15-second mini-game with Willson Wáng. |
| 5 | value | Character Details (s09) | verified |  | ne1: Unlocked for 72h | Scenario access granted for 72 hours. |

