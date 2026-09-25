# Rewarded-ad candidates: Luzia

Regime (computed): **subscription-gated**. 10 ideas, 5 written up.

## Blind labels (fill in before reading the judgments)

Label each proposal SHIP, REVISE or REJECT from the write-ups below, before running `judge`. Copy the labels to `proposals/labels.json` as `[{"id":"P1","label":"SHIP"}]`.

| id | title | case | archetype | surface | reward | your label (SHIP/REVISE/REJECT) |
|---|---|---|---|---|---|---|
| P1 | Start Task with Rewarded Refill | existing | TAX-1 | Create Account Sheet (s07) | 1 task access |  |
| P2 | Favorite Message Slot Unlock | existing | TAX-3 | Favorite messages (s21) | 72-hour access to favorite message saving for 72 hours |  |
| P3 | Deep Reasoning Mode Session Pass | product-change | TAX-2 | Create Account Sheet (s07) | 30 minutes of deep reasoning mode |  |
| P4 | Daily Character Quest & Credits | product-change | TAX-9 | Chats Home (s01) | 10 bonus chat credits |  |
| P5 | Attachment Studio Extra Credit | product-change | TAX-1 | Attachment and Mode Sheet (s27) | 3 bonus photo analysis credits |  |

## The obvious baseline (the bar to beat)

- Watch an ad to unlock Luzia+ subscription
- Watch a video ad to get free messages
- Watch an ad to remove all ads

## Moment sweep

| moment | type | screen | value exchange | viable |
|---|---|---|---|---|
| m1 | wall | Create Account Sheet (s07) | Yes, refill task messages when subscription runs out | yes |
| m2 | decline | Create Account Sheet (s07) | Yes, offer reward fallback when dismissing create account sheet | yes |
| m3 | wall | Response Style Signup (s24) | Yes, unlock response style temporarily | yes |
| m4 | decline | Response Style Signup (s24) | Yes, offer reward fallback on style sheet dismissal | yes |
| m5 | wall | Favorite messages (s21) | Yes, unlock favorite message slots | yes |
| m6 | decline | Favorite messages (s21) | Yes, fallback on favorites sheet dismissal | yes |
| m7 | wall | Custom Bestie Signup Sheet (s02) | Yes, create custom bestie trial profile | yes |
| m8 | decline | Custom Bestie Signup Sheet (s02) | Yes, fallback on bestie sheet dismissal | yes |
| m9 | wall | Create Account Sheet (s07) | Yes, time-boxed deep reasoning mode pass | yes |
| m10 | wall | Create Account Sheet (s07) | Yes, priority task processing pass | yes |
| m11 | desire | Chats Home (s01) | Yes, sample premium features from chats home upsell | yes |
| m12 | desire | Settings (s19) | Yes, settings upgrade session pass | yes |
| m13 | desire | Login Screen (s23) | Yes, login screen feature unlock sample | yes |
| m14 | desire | Attachment and Mode Sheet (s27) | Yes, attachment credit refill in mode sheet | yes |
| m15 | post-reward | Login Screen (s23) | Yes, post-signup bonus multiplier | yes |
| m16 | hub | Chats Home (s01) | Yes, chats home proactive daily task loop | yes |
| m17 | hub | Ideas Feed (s04) | Yes, ideas feed bonus credits | no |
| m18 | hub | Services Tab (s06) | Yes, services tab daily check-in bonus | yes |
| m19 | hub | Apps Catalog (s08) | Yes, apps catalog tool unlock | no |
| m20 | hub | Animate Tool Screen (s09) | Yes, animate tool trial | no |
| m21 | hub | Image Creation Hub (s10) | Yes, image creation hub credits | no |
| m22 | first-value | Chats Home (s01) | First value screen, no offers allowed | no |
| m23 | desire | Settings (s19) | Settings upsell fallback | yes |

## All ideas

| # | title | case | archetype | moment | reward | beyond baseline | selected because |
|---|---|---|---|---|---|---|---|
| 0 | Out-of-Task Message Refill | existing | TAX-1 | m1 | 3 free task messages | no | Directly addresses wall m1 when task limits are hit with a high-intent consumable refill. |
| 1 | Response Style Trial Pass | existing | TAX-2 | m3 | 15 minutes of response style customization | yes |  |
| 2 | Favorite Message Slot Unlock | existing | TAX-3 | m5 | Unlock 3 saved favorite message slots | yes | Unlocks favorite messages feature on demand without undermining full account signup. |
| 3 | Custom Bestie Sample Creation | existing | TAX-3 | m7 | Create 1 custom bestie trial profile | yes |  |
| 4 | Services Hub Daily Check-in Bonus | existing | TAX-5 | m18 | Double daily service task credits | no |  |
| 5 | Deep Reasoning Mode Session Pass | product-change | TAX-2 | m9 | 30 minutes of deep reasoning mode | yes | Product change introducing time-boxed premium deep reasoning access, sampling subscription value safely. |
| 6 | Task Queue Priority Boost | product-change | TAX-4 | m10 | 1 hour of priority task processing | yes |  |
| 7 | Daily Character Quest & Credits | product-change | TAX-9 | m16 | 10 bonus chat credits via daily task | yes | Proactive daily task loop on Chats Home hub establishing habit retention with character interaction. |
| 8 | Settings Hub Ad-Free Session | product-change | TAX-2 | m12 | 1 hour ad-free experience | no |  |
| 9 | Attachment Studio Extra Credit | product-change | TAX-1 | m14 | 3 bonus photo analysis credits | yes | Product change granting attachment analysis credits to drive engagement without subscription friction. |

## Set checks (validateSet)

All checks pass.

## Proposals

### P1 v1: Start Task with Rewarded Refill

> Unlock immediate access to premium task services by playing a quick mini-game.

- **Case:** existing · **Archetype:** TAX-1 · **Beyond baseline:** no
- **Anchor:** moments m1; economy r1, r3
- **Surface:** Create Account Sheet (s07) · **Trigger:** User attempts to start a task or use an advanced service on the Services Tab (s06) and is blocked by the Luzia+ subscription wall (s07).
- **Eligibility:** Non-paying, logged-out users hitting the subscription wall on s07.
- **Offer:** "Start Task Now" / "Play a quick game with Luzia to unlock this task immediately." / [Play Now] [No thanks]
- **Simula:** SIM-RWD, entry button, Game Partner: Luzia, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** 1 task access · **Caps:** 2/day, cooldown 30 min
- **Cannibalization guard:** Limited to 2 completions per day, keeping usage far below the value of the full Luzia+ subscription. The offer appears only at the wall, ensuring the subscription remains the superior, unlimited path.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0090 (text-premium x 1).
- Scenario, not a forecast: 40% of DAU engage, 1.5 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.6, ARPDAU $0.0072.
- **Flags:** Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end.
- **KPIs:** Daily tasks completed by non-subscribers. Guardrails: Luzia+ subscription conversion rate; Retention (D7, D30); Ad-related churn rate. Holdout: 10% of non-subscribing users will not see the reward offer for 4 weeks.
- **Precedents:** TAX-1, EX-DUO, AI-1 · **Risks:** Users may prefer ad-watching over subscribing if the task rewards are too frequent. Brand safety concerns if ads are not strictly SFW.
- **Evidence:** s07/e61 "To enjoy Luzia+ you need to create an account first." (unverified); s06/e9 "Start new task" ✓

**Patch**

- new element `ne1` in Create Account Sheet (s07) after e61: Add 'Play Now' rewarded ad button for unlocking tasks.
- edge s07/ne1 → rwd (r3 +1 on REWARD_VERIFIED) when r1 < 1

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | Services Tab (s06) | none | r3=0 | e9: User taps 'Start new task' | User wants to start a task but has no quota. |
| 2 | change | Create Account Sheet (s07) | none | r3=0 | e61: Subscription wall hits | User is prompted to upgrade or sign up. |
| 3 | offer | Create Account Sheet (s07) | invite | r3=0 | ne1: Play now to unlock | We offer a rewarded path to start the task. |
| 4 | ad | Create Account Sheet (s07) | game | r3=0 | ne1: Mini-game with Luzia | User plays the rewarded mini-game. |
| 5 | value | Services Tab (s06) | verified | r3=1 | e9: Task unlocked | User successfully starts their task. |

### P2 v1: Favorite Message Slot Unlock

> Watch a quick game partner session to unlock favorite message saving without immediate account signup.

- **Case:** existing · **Archetype:** TAX-3 · **Beyond baseline:** yes
- **Anchor:** moments m5; economy r2
- **Surface:** Favorite messages (s21) · **Trigger:** When guest users tap to save favorite messages on the Favorite Messages page and hit the account signup wall.
- **Eligibility:** Non-signed-up users (guests) encountering the favorite messages wall.
- **Offer:** "Unlock Favorite Messages" / "Play a 15-second game with Luzia to save your favorite messages for 72 hours." / [Play Now] [No Thanks]
- **Simula:** SIM-RWD, entry button, Game Partner: Luzia, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** 72-hour access to favorite message saving for 72 hours · **Caps:** 3/day, cooldown 15 min
- **Cannibalization guard:** Access is time-boxed to 72 hours and restricted to guests; permanent account saving and advanced personalization remain exclusive to free sign-up or Luzia+ subscription.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0000 (none x 0).
- Scenario, not a forecast: 25% of DAU engage, 1.5 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.375, ARPDAU $0.0045.
- Flags: none.
- **KPIs:** Rewarded ad ARPDAU and ad revenue per guest DAU. Guardrails: Guest retention (D1/D7 non-inferiority); Free account signup conversion rate; Ad completion rate >= 90%. Holdout: 5% user-level holdout for 28 days comparing total account creation and engagement rates
- **Precedents:** TAX-3, EX-DUO · **Risks:** Users might prefer temporary ad unlocks over permanent free account creation if not clearly time-boxed. Low fill rates in specific non-US geos.
- **Evidence:** o0084/e6 "Sign up to start saving your favorite messages. It's quick, easy, and free!" (unverified)

**Patch**

- new sheet `ns1` based on Favorite messages (s21): Add Simula rewarded offer button alongside the sign-up button on the Favorite messages sheet.
- new element `ne1` in Favorite messages (s21) before e10: Simula rewarded ad invitation button for unlocking favorite messages
- edge s21/ne1 → rwd (r2 +1 on REWARD_VERIFIED) when r2 < 1

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | Favorite messages (s21) | none | r2=0 | e6: Mandatory sign-up wall blocking message saving | Today, guest users hit a strict sign-up wall when trying to save favorite messages. |
| 2 | change | Favorite messages (s21) | none | r2=0 | ne1: Added rewarded mini-game option | We introduce an opt-in rewarded mini-game alternative to mandatory account creation. |
| 3 | offer | Favorite messages (s21) | invite | r2=0 | ne1: Play 15s game with Luzia | The user taps Play Now to view the clear reward offer before engaging. |
| 4 | ad | Favorite messages (s21) | game | r2=0 | e3: Simula Rewarded Mini-Game | The user plays the 15-second mini-game with Luzia as Game Partner. |
| 5 | value | Favorite messages (s21) | verified | r2=1 | e3: Access granted on REWARD_VERIFIED | Upon REWARD_VERIFIED, temporary favorite message saving is unlocked for 72 hours. |

### P3 v1: Deep Reasoning Mode Session Pass

> Allow free users to unlock 30 minutes of deep reasoning mode by engaging with a rewarded Simula mini-game.

- **Case:** product-change · **Archetype:** TAX-2 · **Beyond baseline:** yes
- **Anchor:** moments m9; economy r1
- **New mechanic:** Deep Reasoning Session Pass: A time-boxed 30-minute entitlement to deep reasoning mode earned via rewarded ad view. Why: Unlocks high-end AI capability for time-rich non-paying users without permanently devaluing the Luzia+ subscription.
- **Surface:** Create Account Sheet (s07) · **Trigger:** User taps Deep Reasoning on Attachment and Mode Sheet (s27), hitting the subscription wall (s07).
- **Eligibility:** Non-paying guests and free users hitting the deep reasoning paywall.
- **Offer:** "Unlock Deep Reasoning Now" / "Play a quick 15-second game to unlock 30 minutes of deep reasoning." / [Play Now] [No Thanks]
- **Simula:** SIM-RWD, entry button, Game Partner: Luzia, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** 30 minutes of deep reasoning mode · **Caps:** 2/day, cooldown 30 min
- **Cannibalization guard:** Gated strictly to non-payers, time-boxed to 30 minutes, capped at 2 per day, and keeps the Luzia+ subscription upsell prominently featured.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0090 (text-premium x 1).
- Scenario, not a forecast: 25% of DAU engage, 1.5 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.375, ARPDAU $0.0045.
- **Flags:** Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end.
- **KPIs:** Rewarded ARPDAU and ad monetization revenue lift. Guardrails: Paid subscription conversion non-inferiority within -3%; D7 and D30 user retention parity; Session length stability. Holdout: 10% user-level randomized holdout over 28 days
- **Precedents:** TAX-2, EX-DUO, POL-8 · **Risks:** Potential perception that premium features can be bypassed too easily Higher inference COGS for premium reasoning model during session passes
- **Evidence:** o0061 "To enjoy Luzia+ you need to create an account first." (unverified); s27/e15 "Deep reasoning" ✓

**Patch**

- new sheet `ns1` based on Create Account Sheet (s07): Session pass reward invitation sheet
- new element `ne1` in Create Account Sheet (s07) before e7: Watch ad for 30m Deep Reasoning session
- edge s07/ne1 → rwd (r1 +1 on REWARD_VERIFIED)

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | Attachment and Mode Sheet (s27) | none | r1=0 | e15: Deep reasoning is locked for guests | Deep reasoning mode requires a paid subscription today. |
| 2 | change | Create Account Sheet (s07) | none | r1=0 | ne1: New rewarded session pass option added | We introduce a rewarded session pass option. |
| 3 | offer | Create Account Sheet (s07) | invite | r1=0 | ne1: Play 15s game with Luzia | Opt in to play a quick game. |
| 4 | ad | Create Account Sheet (s07) | game | r1=0 | ne1: Playing Simula mini-game | Complete the 15-second rewarded mini-game. |
| 5 | value | Attachment and Mode Sheet (s27) | verified | r1=1 | e15: 30m pass verified and active | Thirty minutes of deep reasoning unlocked. |

### P4 v1: Daily Character Quest & Credits

> Earn bonus chat credits daily by completing a quick interactive mini-game with Luzia.

- **Case:** product-change · **Archetype:** TAX-9 · **Beyond baseline:** yes
- **Anchor:** moments m16; economy r3
- **New mechanic:** Daily Character Quest: A daily engagement task where users play a 15-second mini-game with Luzia to earn bonus chat credits. Why: Luzia currently lacks a daily retention loop and free ad-monetization path for non-paying users on the home tab.
- **Surface:** Chats Home (s01) · **Trigger:** User taps the daily quest banner on the Chats Home hub upon returning to the app.
- **Eligibility:** Non-paying users who have completed their first session and have remaining daily quota capacity.
- **Offer:** "Play Daily Quest Now" / "Play a quick 15-second mini-game with Luzia to earn 10 bonus chat credits." / [Play Now] [No Thanks]
- **Simula:** SIM-RWD, entry button, Game Partner: Luzia, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** 10 bonus chat credits · **Caps:** 3/day, cooldown 60 min
- **Cannibalization guard:** Gated to non-paying users with strict daily caps, rewarding soft usage quota rather than permanent subscription features or premium reasoning models.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0180 (text-cheap x 10).
- Scenario, not a forecast: 25% of DAU engage, 1.5 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.375, ARPDAU $0.0045.
- **Flags:** Cost to serve the reward ($0.0180) exceeds net revenue per view ($0.0063) at the low end.
- **KPIs:** Rewarded ARPDAU and D7/D30 user retention.. Guardrails: Paid conversion non-inferiority (-3% max relative drop); Daily message volume per active user; App store sentiment and crash rates. Holdout: User-level 10% randomized holdout running for 28 days.
- **Precedents:** TAX-9, AI-3, EX-DUO · **Risks:** Low risk of minor fatigue if daily caps are exceeded Ensure game partner tone remains fully SFW and aligned with Luzia's brand
- **Evidence:** s01/e10 "Luzia" ✓

**Patch**

- new sheet `ns1` based on Chats Home (s01): Daily Quest Hub sheet displaying available character mini-game tasks for bonus credits.
- new element `ne1` in Chats Home (s01) after e13: Daily Quest banner button on Chats Home.
- edge s01/ne1 → ns1

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | Chats Home (s01) | none | r3=0 | e10: Luzia chat home hub | Users chat on Chats Home without daily task rewards today. |
| 2 | change | Chats Home (s01) | none | r3=0 | ne1: Daily Quest banner | Add a daily quest banner for interactive mini-games. |
| 3 | offer | ns1 | invite | r3=0 | e10: Play 15 seconds | Opt-in sheet invites user to play with Luzia. |
| 4 | ad | ns1 | game | r3=0 | e10: Mini-game active | User plays the 15-second rewarded mini-game. |
| 5 | value | Chats Home (s01) | verified | r3=10 | e10: +10 credits credited | Credits granted securely upon REWARD_VERIFIED callback. |

### P5 v1: Attachment Studio Extra Credit

> Provide non-subscribers with bonus photo analysis credits via opt-in rewarded mini-game sessions.

- **Case:** product-change · **Archetype:** TAX-1 · **Beyond baseline:** yes
- **Anchor:** moments m14; economy r3
- **New mechanic:** Photo Analysis Credits: A supplementary quota of free photo analysis actions for non-subscribers Why: To provide a value exchange at the attachment studio boundary without locking core free text chat
- **Surface:** Attachment and Mode Sheet (s27) · **Trigger:** User taps photo attachment when daily photo analysis quota is exhausted
- **Eligibility:** Non-subscribers on Attachment and Mode Sheet
- **Offer:** "Get Free Photo Credits" / "Play a quick game with Luzia to earn 3 bonus photo analysis credits now." / [Play Now] [No Thanks]
- **Simula:** SIM-RWD, entry button, Game Partner: Luzia, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** 3 bonus photo analysis credits · **Caps:** 3/day, cooldown 15 min
- **Cannibalization guard:** Gated strictly to non-subscribers, capped at 3 daily grants, and kept separate from Luzia+ subscription core benefits.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0250 (image x 1).
- Scenario, not a forecast: 30% of DAU engage, 1.5 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.45, ARPDAU $0.0054.
- **Flags:** Cost to serve the reward ($0.0250) exceeds net revenue per view ($0.0063) at the low end.
- **KPIs:** Rewarded ARPDAU. Guardrails: Subscription conversion non-inferiority; D7 retention. Holdout: 10% user-level holdout for 28 days
- **Precedents:** TAX-1, AI-5, EX-DUO · **Risks:** Image processing COGS near break-even User fatigue if daily cap is exceeded
- **Evidence:** s27/e12 "Attach Photos" ✓

**Patch**

- new element `ne1` in Attachment and Mode Sheet (s27) after e12: Rewarded ad button for extra photo credits
- edge s27/ne1 → rwd (r3 +3 on REWARD_VERIFIED) when r3 < 1

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | Attachment and Mode Sheet (s27) | none | r3=0 | e12: User taps photo attachment when out of free credits. | User taps photo attachment feature when out of free credits. |
| 2 | change | Attachment and Mode Sheet (s27) | none | r3=0 | ne1: App introduces rewarded ad prompt for photo analysis credits. | App introduces rewarded ad prompt for photo analysis credits. |
| 3 | offer | Attachment and Mode Sheet (s27) | invite | r3=0 | ne1: User sees opt-in invitation card with explicit reward details. | User sees opt-in invitation card with explicit reward details. |
| 4 | ad | Attachment and Mode Sheet (s27) | game | r3=0 | ne1: User plays 15-second mini-game partner session with Luzia. | User plays 15-second mini-game partner session with Luzia. |
| 5 | value | Attachment and Mode Sheet (s27) | verified | r3=3 | e12: Reward verified and 3 photo analysis credits added instantly. | Reward verified and 3 photo analysis credits added instantly. |

