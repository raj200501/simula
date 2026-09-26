# Rewarded-ad candidates: Luzia

Regime (computed): **subscription-gated**. 10 ideas, 5 written up.

## Blind labels (fill in before reading the judgments)

Label each proposal SHIP, REVISE or REJECT from the write-ups below, before running `judge`. Copy the labels to `proposals/labels.json` as `[{"id":"P1","label":"SHIP"}]`.

| id | title | case | archetype | surface | reward | your label (SHIP/REVISE/REJECT) |
|---|---|---|---|---|---|---|
| P1 | Daily Task for AI Usage Credits | product-change | AI-3 | Chats Home (s01) | 5 AI Usage Credits |  |
| P2 | Unlock Image Generation Credit | product-change | AI-5 | Image Creation Hub (s10) | 1 AI Image credit |  |
| P3 | Paywall-decline: Deep Reasoning Sample | product-change | AI-4 | Create Account Sheet (s07) | 1 hour of Deep Reasoning mode |  |
| P4 | Sponsored Advanced Services 30m Trial | product-change | TAX-2 | ns1 | 30 minutes of Luzia+ Advanced services |  |
| P5 | Save a Favorite Message with Ad | product-change | AI-11 | Favorite messages (s21) | 1 favorite message save |  |

## The obvious baseline (the bar to beat)

- Banner ads on the paywall screen
- Interstitial ads between chat messages
- Rewarded video to remove ads for 1 hour

## Moment sweep

| moment | type | screen | value exchange | viable |
|---|---|---|---|---|
| m1 | wall | Create Account Sheet (s07) | Upgrade for advanced services | yes |
| m2 | decline | Create Account Sheet (s07) | None | no |
| m3 | wall | Response Style Signup (s24) | Adjust response style | yes |
| m4 | decline | Response Style Signup (s24) | None | no |
| m5 | wall | Favorite messages (s21) | Save favorite message | yes |
| m6 | decline | Favorite messages (s21) | None | no |
| m7 | wall | Custom Bestie Signup Sheet (s02) | Create custom bestie | yes |
| m8 | decline | Custom Bestie Signup Sheet (s02) | None | no |
| m9 | wall | Create Account Sheet (s07) | Toggle deep reasoning mode | yes |
| m10 | wall | Create Account Sheet (s07) | Start a task | yes |
| m11 | desire | Chats Home (s01) | Upsell | no |
| m12 | desire | Settings (s19) | Upsell | no |
| m13 | desire | Login Screen (s23) | Upsell | no |
| m14 | desire | Attachment and Mode Sheet (s27) | Unlock Deep reasoning mode | yes |
| m15 | post-reward | Login Screen (s23) | None | no |
| m16 | hub | Chats Home (s01) | Usage quota refill | yes |
| m17 | hub | Ideas Feed (s04) | Inspiration | yes |
| m18 | hub | Services Tab (s06) | Assistant tools access | yes |
| m19 | hub | Apps Catalog (s08) | Mini-app tool access | yes |
| m20 | hub | Animate Tool Screen (s09) | Animation generation | yes |
| m21 | hub | Image Creation Hub (s10) | Image generation | yes |
| m22 | first-value | Chats Home (s01) | None | no |
| m23 | desire | Settings (s19) | Upsell | no |

## All ideas

| # | title | case | archetype | moment | reward | beyond baseline | selected because |
|---|---|---|---|---|---|---|---|
| 0 | Daily Task for AI Usage Credits | product-change | AI-3 | m16 | 5 AI Usage Credits | yes | Establishes a proactive daily habit loop using existing AI usage quota constraints, perfect for retention. |
| 1 | Unlock 1 Image Generation | product-change | AI-5 | m21 | 1 Image generation task | yes | Directly monetizes the high-intent image generation flow at the moment of creation. |
| 2 | Paywall-decline: Deep Reasoning Sample | existing | AI-4 | m14 | 1 hour of Deep reasoning mode | yes | Leverages the paywall-decline fallback pattern to let free users sample the 'Deep reasoning' core premium feature, driving conversion. |
| 3 | Sponsored Advanced Services 30m Trial | product-change | TAX-2 | m1 | 30 minutes of Advanced services (bookings/alerts) | yes | Demonstrates the high-value 'Advanced Services' capability to non-payers, proving the value of the Luzia+ subscription. |
| 4 | Save a Favorite Message | existing | AI-11 | m5 | Unlock 1 favorite message save | no | Existing wall for saving messages; gives users an immediate path to 'Organize thoughts' without a full subscription. |
| 5 | Unlock Custom Bestie slot | product-change | AI-8 | m7 | 1 extra Custom Bestie slot | yes |  |
| 6 | Proactive Hub: Usage Refills | existing | AI-2 | m16 | 10 AI Usage Credits | no |  |
| 7 | Streak Protection for Daily Chats | product-change | AI-13 | m16 | Protect relationship bond level | yes |  |
| 8 | Paywall-decline: Adjust Response Style | existing | AI-4 | m3 | 24 hours of Custom Response Style | no |  |
| 9 | Unlock Beat Maker Loop | product-change | AI-3 | m19 | 30 minutes of advanced Beat Maker features | yes |  |

## Set checks (validateSet)

All checks pass.

## Proposals

### P1 v1: Daily Task for AI Usage Credits

> Play a 15-second mini-game with Luzia to earn daily AI usage credits.

- **Case:** product-change · **Archetype:** AI-3 · **Beyond baseline:** yes
- **Anchor:** moments m16; economy r3 (AI Usage Quota)
- **New mechanic:** Daily Tasks: A new interactive banner on the Chats Home screen offering daily mini-game challenges for AI usage credits. Why: Increases daily engagement and retention by gamifying the AI experience.
- **Surface:** Chats Home (s01) · **Trigger:** User taps the Daily Task banner on the Chats Home (s01) tab.
- **Eligibility:** Non-subscribers, once per day per user.
- **Offer:** "Daily Task: Earn Credits" / "Play a quick 15-second mini-game with Luzia to earn 5 extra AI usage credits." / [Play Now] [No thanks]
- **Simula:** SIM-RWD, entry button, Game Partner: Luzia, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** 5 AI Usage Credits · **Caps:** 3/day, cooldown 30 min
- **Cannibalization guard:** Only offered to non-subscribers. The credits are additive to their quota and do not provide the advanced capabilities of the Luzia+ subscription. The banner is non-interruptive.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0090 (text-cheap x 5).
- Scenario, not a forecast: 30% of DAU engage, 2 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.6, ARPDAU $0.0072.
- **Flags:** Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end.
- **KPIs:** Total AI Usage Credits granted. Guardrails: Paid conversion rate; D30 retention; Messages per DAU. Holdout: 10% user-level holdout for 4 weeks.
- **Precedents:** AI-3, TAX-9 · **Risks:** High frequency of tasks could feel repetitive if not rotated. Potential for users to rely on credits instead of subscribing.
- **Evidence:** s01/e31 "Keep chatting" ✓

**Patch**

- new element `ne1` in Chats Home (s01) before e31: Add a Daily Task banner element to provide a clear entry point for rewarded mini-games.
- edge s01/ne1 → rwd (r3 +5 on REWARD_VERIFIED)

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | Chats Home (s01) | none | r3=0 | e31: Existing chat flow | Users browse and start chats on the Home tab. |
| 2 | change | Chats Home (s01) | none | r3=0 | ne1: Daily Task banner | We add a new Daily Task banner for a rewarding mini-game. |
| 3 | offer | Chats Home (s01) | invite | r3=0 | ne1: Opt-in offer | Users opt-in to a 15-second game for 5 AI credits. |
| 4 | ad | Chats Home (s01) | game | r3=0 | ne1: Game with Luzia | The user plays the mini-game with Luzia. |
| 5 | value | Chats Home (s01) | verified | r3=5 | ne1: Reward granted | Upon completion, the user receives 5 AI usage credits. |

### P2 v1: Unlock Image Generation Credit

> Watch a quick mini-game with Luzia to earn an AI image generation credit.

- **Case:** product-change · **Archetype:** AI-5 · **Beyond baseline:** yes
- **Anchor:** moments m21; economy r3
- **New mechanic:** Rewarded Image Credits: Users can watch or play a mini-game to earn an image generation credit when they hit their AI usage quota. Why: Allows free users to continue generating images without impacting paid conversion by limiting the reward to a single credit per view.
- **Surface:** Image Creation Hub (s10) · **Trigger:** When user attempts to generate an image in the Image Creation Hub and their AI Usage Quota (r3) is depleted.
- **Eligibility:** Non-paying users who have exhausted their free AI Usage Quota (r3).
- **Offer:** "Earn an image credit" / "Play a 15-second game with Luzia to get 1 free AI image generation credit." / [Play Now] [No thanks]
- **Simula:** SIM-RWD, entry button, Game Partner: Luzia, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** 1 AI Image credit · **Caps:** 3/day, cooldown 30 min
- **Cannibalization guard:** Limited to 3 credits per day and only available when r3 is depleted; ensures non-payers maintain usage without unlimited free generation.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0250 (image x 1).
- Scenario, not a forecast: 30% of DAU engage, 2 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.6, ARPDAU $0.0072.
- **Flags:** Cost to serve the reward ($0.0250) exceeds net revenue per view ($0.0063) at the low end.
- **KPIs:** Image generation volume among non-payers. Guardrails: Paid conversion rate (Luzia+); Daily active usage (DAU); Retention (D7, D30). Holdout: 10% of non-paying user base held out for 4 weeks.
- **Precedents:** AI-5, EX-UTIL · **Risks:** Ad saturation if limits are too frequent Brand safety concerns in AI-generated images Potential for lower paid conversion if reward is too generous
- **Evidence:** s10/e14 "Create image" ✓; s10/e15 "Mix or swap elements from photos" ✓

**Patch**

- new modal `ns1`: Rewarded ad invitation modal for image credit.
- new element `ne1` in Image Creation Hub (s10) after e14: Button to trigger rewarded ad for 1 image credit when limit is reached.
- edge s10/ne1 → rwd (r3 +1 on REWARD_VERIFIED) when r3 < 1

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | Image Creation Hub (s10) | none | r3=0 | e14: User attempts to generate image with 0 credits. | The user is out of image generation credits and cannot create more. |
| 2 | change | Image Creation Hub (s10) | none | r3=0 | ne1: New 'Earn credit' button appears. | A new 'Earn credit' button is shown when the user reaches the limit. |
| 3 | offer | ns1 | invite | r3=0 | ns1: Play a game to get 1 image credit. | The user opts into the rewarded offer. |
| 4 | ad | ns1 | game | r3=0 | ns1: Luzia plays with you. | The user plays the mini-game with Luzia. |
| 5 | value | Image Creation Hub (s10) | verified | r3=1 | e14: Credit granted, balance updated. | The image credit is granted and the user can generate the image. |

### P3 v1: Paywall-decline: Deep Reasoning Sample

> Offer a 1-hour trial of Deep Reasoning mode after declining the account signup wall.

- **Case:** product-change · **Archetype:** AI-4 · **Beyond baseline:** yes
- **Anchor:** moments m1, m9, m14; economy r1
- **New mechanic:** Rewarded Deep Reasoning Trial: A time-boxed (1 hour) trial of Deep Reasoning mode triggered by an ad after the user declines the account signup wall on s07. Why: Deep Reasoning is a core premium differentiator; letting users experience it creates high conversion intent.
- **Surface:** Create Account Sheet (s07) · **Trigger:** After the user taps 'Close' to decline the account signup wall that appeared when they tried to toggle 'Deep reasoning' (m9) or 'Start a task' (m10).
- **Eligibility:** Non-paying guests who are not currently on a subscription and have triggered the Luzia+ paywall.
- **Offer:** "Try Deep Reasoning for free" / "Play a quick 15-second game to unlock 1 hour of our premium Deep Reasoning mode." / [Play Now] [No thanks]
- **Simula:** SIM-RWD, entry button, Game Partner: Luzia, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** 1 hour of Deep Reasoning mode · **Caps:** 1/day, cooldown 1440 min
- **Cannibalization guard:** This offer is only presented to users who have already explicitly declined the paywall. It provides a limited, time-boxed trial rather than permanent access, protecting the subscription value and highlighting the benefit of Luzia+.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0090 (text-premium x 1).
- Scenario, not a forecast: 30% of DAU engage, 1.2 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.36, ARPDAU $0.0043.
- **Flags:** Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end.
- **KPIs:** Premium conversion rate (Luzia+ Subscription). Guardrails: Subscription conversion rate; Retention; Daily active users. Holdout: 5% user holdout for 4 weeks to measure revenue impact.
- **Precedents:** TAX-2, TAX-10, AI-4 · **Risks:** Ad availability (no-fill) may frustrate users who have just declined the paywall; mitigation is an immediate fallback to the original state. High COGS for the premium model; mitigation is the 1-hour time box.
- **Evidence:** s27/e15 "Deep reasoning" ✓; s07 "To enjoy Luzia+ you need to create an account first." (unverified)

**Patch**

- new modal `ns1`: A rewarded invitation modal informing the user they can unlock 1 hour of Deep Reasoning mode by playing a mini-game.
- new element `ne_reward_invitation` in ns1 overlay (no anchor): Button 'Play Now' triggers the rewarded ad flow (SIM-RWD).
- edge s07/ne_decline_trigger → ns1 (Deep Reasoning Trial +1 on REWARD_VERIFIED) when r1 < 1

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | Attachment and Mode Sheet (s27) | none |  | e15: User wants Deep Reasoning | User taps 'Deep reasoning' in the attachment sheet. |
| 2 | change | Create Account Sheet (s07) | none |  | s07: User declines account signup | Paywall appears, user taps 'Close' to decline. |
| 3 | offer | ns1 | invite |  | ne_reward_invitation: 1 hour free sample! | Reward offer appears with clear 'Play Now' CTA. |
| 4 | ad | Attachment and Mode Sheet (s27) | game |  | s27: Quick mini-game with Luzia | Luzia plays a mini-game with the user. |
| 5 | value | Attachment and Mode Sheet (s27) | verified | Deep Reasoning Trial=1 | e15: Trial activated! | Reward verified: 1 hour trial activated. |

### P4 v1: Sponsored Advanced Services 30m Trial

> Offer a 30-minute trial of Luzia+ Advanced services after declining the account wall.

- **Case:** product-change · **Archetype:** TAX-2 · **Beyond baseline:** yes
- **Anchor:** moments m1, m10; economy r1
- **New mechanic:** Rewarded Trial Access: After a user dismisses the Create Account wall, surface an opt-in rewarded ad to unlock 30 minutes of Luzia+ Advanced services (bookings/alerts). Why: Allows high-intent, cash-poor users to experience premium value, increasing conversion probability while monetizing users who would otherwise churn at the paywall.
- **Surface:** ns1 · **Trigger:** User taps 'Maybe later' on the Create Account Sheet (s07) after attempting a premium-gated task.
- **Eligibility:** Non-subscribers who have not hit the daily cap for rewarded trials.
- **Offer:** "Try Advanced Services" / "Watch a 15-second game to get 30 minutes of Advanced Services (bookings & alerts) for free." / [Play Now] [No thanks]
- **Simula:** SIM-RWD, entry button, Game Partner: Luzia, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** 30 minutes of Luzia+ Advanced services · **Caps:** 1/day, cooldown 60 min
- **Cannibalization guard:** The trial is time-boxed (30m) and limited to 1x/day, protecting the long-term value of the subscription while creating a clear sampling effect. The offer appears only as a fallback to account creation, ensuring purchase remains the primary path.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0090 (text-premium x 1).
- Scenario, not a forecast: 30% of DAU engage, 1.2 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.36, ARPDAU $0.0043.
- **Flags:** Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end.
- **KPIs:** Trial-to-subscription conversion rate. Guardrails: Subscription purchase rate; Retention (D7, D30); Total daily time spent. Holdout: 10% of non-subscribers for 8 weeks.
- **Precedents:** TAX-2, TAX-10, EX-MUSIC, EX-UTIL · **Risks:** Advanced services are compute-intensive (text-premium COGS); trial usage must be throttled to prevent excess costs. Users may perceive the ad path as sufficient and not upgrade.
- **Evidence:** s07/e7 "Upgrade to Luzia+" (unverified); s07/e9 "Continue with limited access" (unverified)

**Patch**

- new modal `ns1` based on Create Account Sheet (s07): Rewarded trial offer modal appearing after declining account creation on s07.
- new element `ne1` in ns1 overlay (no anchor): Button for triggering rewarded trial: 'Play Now'
- edge s07/Maybe later → ns1
- edge ns1/ne1 → rwd (r1 +0.5 on REWARD_VERIFIED)

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | Create Account Sheet (s07) | none |  | e7: User wants Advanced services but hits paywall. | User tries to start an Advanced service task. |
| 2 | change | ns1 | none |  | ne1: Trial offer appears only after decline. | User declines account creation, sees rewarded offer. |
| 3 | offer | ns1 | invite |  | ne1: Play 15s game for 30m of Advanced Services. | User sees trial offer and opts in. |
| 4 | ad | Services Tab (s06) | game |  | e6: Luzia plays along in the game. | Luzia partners with user to play mini-game. |
| 5 | value | Services Tab (s06) | verified | r1=1 | e6: 30 minutes of premium access granted! | User gets temporary Advanced services. |

### P5 v1: Save a Favorite Message with Ad

> Allow non-registered users to save favorite messages by watching a short game, increasing engagement without forcing signup.

- **Case:** product-change · **Archetype:** AI-11 · **Beyond baseline:** yes
- **Anchor:** moments m5; economy w3, r2 (Account Access)
- **New mechanic:** Rewarded Favorite: Unlock individual favorite message saves without a full account. Why: Allows casual users to utilize the favorites feature without immediate friction of signup, lowering entry barriers.
- **Surface:** Favorite messages (s21) · **Trigger:** User taps 'Favorite' on a message, and the 'Favorite messages' (s21) wall is triggered because they lack an account.
- **Eligibility:** Non-registered users only; users who have not yet signed up.
- **Offer:** "Save to Favorites?" / "Play a 15-second game with Luzia to save this message to your favorites for free." / [Play Now] [No thanks]
- **Simula:** SIM-RWD, entry button, Game Partner: Luzia, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** 1 favorite message save · **Caps:** 3/day, cooldown 10 min
- **Cannibalization guard:** Limits rewards to 3 saves per day, ensuring heavy users are still incentivized to create an account for unlimited storage; only available to non-registered users.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0000 (none x 1).
- Scenario, not a forecast: 20% of DAU engage, 2 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.4, ARPDAU $0.0048.
- Flags: none.
- **KPIs:** Daily active users saving messages. Guardrails: Paid account conversion rate; Retention (D7, D30). Holdout: 10% of users excluded from rewarded path for 4 weeks.
- **Precedents:** AI-11, TAX-3, EX-DUO · **Risks:** Users may find the 3-save limit restrictive and churn. Lower perceived value of account signup.
- **Evidence:** s21/e6 "Sign up to start saving your favorite messages. It" ✓

**Patch**

- new element `ne1` in Favorite messages (s21) before e10: Add a MiniGameButton to trigger the rewarded flow.
- edge s21/ne1 → rwd (saved_message_slot +1 on REWARD_VERIFIED) when saved_message_slot < 3

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | Favorite messages (s21) | none | favorite_slot=0 | e6: Sign-up wall prevents saving favorites. | Currently, only registered users can save favorite messages. |
| 2 | change | Favorite messages (s21) | none | favorite_slot=0 | ne1: New button allows saving with an ad. | A 'Save for free' option is added to the wall. |
| 3 | offer | Favorite messages (s21) | invite | favorite_slot=0 | ne1: User taps to unlock. | The user is offered a short game to get a save. |
| 4 | ad | Favorite messages (s21) | game | favorite_slot=0 | ne1: 15-second mini-game. | Luzia joins the game as the partner. |
| 5 | value | Favorite messages (s21) | verified | favorite_slot=1 | ne1: 1 save unlocked. | Message saved successfully without signing up. |

