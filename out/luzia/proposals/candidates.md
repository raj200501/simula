# Rewarded-ad candidates: Luzia

Regime (computed): **subscription-gated**. 10 ideas, 5 written up.

## Proposals at a glance

The write-ups are below. The verdicts are in `judgments.md`, so a reader can form a view first.

| id | title | case | archetype | surface | reward |
|---|---|---|---|---|---|
| P1 | Paywall Decline 30-Min Luzia+ Pass | existing | TAX-10 | Services Tab (s06) | 30 minutes of Luzia+ access |
| P2 | Custom Bestie Slot Unlock on Signup Decline | existing | TAX-7 | Custom Bestie Signup Sheet (s02) | 1 Custom Bestie slot |
| P3 | Single Deep Reasoning Query Unlock | existing | TAX-2 | Attachment and Mode Sheet (s27) | 1 Deep reasoning query |
| P4 | Daily Check-In Image Generation Hub | product-change | TAX-9 | Chats Home (s01) | 2 AI Image Credits |
| P5 | Anima Video Generation Export Boost | product-change | TAX-4 | Animate Tool Screen (s09) | 1 Anima Video Credit |

## The obvious baseline (the bar to beat)

- Watch an ad on s07 Create Account Sheet paywall to get temporary Luzia+ access.
- Watch an ad on s23 Login Screen to bypass free signup and access Account Access features.
- Watch an ad on s10 Image Creation Hub to generate an AI image without limits.

## Moment sweep

| moment | type | screen | value exchange | viable |
|---|---|---|---|---|
| m1 | wall | Create Account Sheet (s07) | Watch ad on Create Account Sheet to try a Luzia+ feature once | yes |
| m2 | decline | Create Account Sheet (s07) | Fallback offer on paywall dismissal for 30-minute Luzia+ access | yes |
| m3 | wall | Response Style Signup (s24) | Watch ad on Response Style Signup to customize AI response style without account | yes |
| m4 | decline | Response Style Signup (s24) | Decline Response Style signup to get 1 response style customization | yes |
| m5 | wall | Favorite messages (s21) | Watch ad on Favorite messages sheet to save favorite message without account | yes |
| m6 | decline | Favorite messages (s21) | Decline Favorite messages signup to unlock 1 favorite message save | yes |
| m7 | wall | Custom Bestie Signup Sheet (s02) | Watch ad on Custom Bestie sheet to create 1 Bestie without account | yes |
| m8 | decline | Custom Bestie Signup Sheet (s02) | Decline Custom Bestie signup to unlock 1 Custom Bestie slot | yes |
| m9 | wall | Create Account Sheet (s07) | Watch ad on deep reasoning toggle for 1 deep reasoning answer | yes |
| m10 | wall | Create Account Sheet (s07) | Watch ad on Services tab to run 1 automated assistant task | yes |
| m11 | desire | Chats Home (s01) | Tap Try Luzia upsell to view rewarded pass offer | yes |
| m12 | desire | Settings (s19) | Tap Upgrade to Luzia+ in Settings to unlock 1-hour ad-free pass | yes |
| m13 | desire | Login Screen (s23) | Sign up screen locked feature desire - watch ad for guest sample | no |
| m14 | desire | Attachment and Mode Sheet (s27) | Tap Deep reasoning upsell on Attachment sheet for 1 deep reasoning response | yes |
| m15 | post-reward | Login Screen (s23) | Post-signup bonus doubling initial usage quota | yes |
| m16 | hub | Chats Home (s01) | Proactive daily check-in hub on Chats Home for image credits | yes |
| m17 | hub | Ideas Feed (s04) | Proactive rewarded unlocks on Ideas Feed for premium styles | yes |
| m18 | hub | Services Tab (s06) | Services tab hub for sponsored automated assistant task | yes |
| m19 | hub | Apps Catalog (s08) | Apps catalog hub to unlock premium AI tools like Beat Maker or Anima | yes |
| m20 | hub | Animate Tool Screen (s09) | Animate tool hub for 1 free video animation export | yes |
| m21 | hub | Image Creation Hub (s10) | Image Creation Hub for 1 high-resolution generation credit | yes |
| m22 | first-value | Chats Home (s01) | First-value moment on launch; no offers allowed by rule | no |
| m23 | desire | Settings (s19) | Settings interest tap to view rewarded trial option | yes |

## All ideas

| # | title | case | archetype | moment | reward | beyond baseline | selected because |
|---|---|---|---|---|---|---|---|
| 0 | Paywall Decline 30-Min Luzia+ Pass | existing | TAX-10 | m2 | 30-minute Luzia+ access | no | Provides a classic paywall-decline fallback for price-sensitive non-payers dismissing the Luzia+ subscription sheet. |
| 1 | Custom Bestie Slot Unlock on Signup Decline | existing | TAX-7 | m8 | 1 Custom Bestie slot | yes | Capitalizes on explicit user intent to personalize a Custom Bestie right after they decline account creation. |
| 2 | Single Deep Reasoning Query Unlock | existing | TAX-2 | m14 | 1 Deep reasoning response | yes | Captures high moment-of-need intent when users tap the Deep Reasoning toggle in the attachment sheet during active conversation. |
| 3 | Response Style Quick Adjust Unlock | existing | TAX-3 | m4 | 1 response style customization | yes |  |
| 4 | Favorite Message Save Credit | existing | TAX-1 | m6 | 1 favorite message save | yes |  |
| 5 | Daily Check-In Image Generation Hub | product-change | TAX-9 | m16 | 2 AI image credits | yes | Establishes a proactive daily engagement habit on Chats Home, creating predictable rewarded ad inventory with zero chat interruption. |
| 6 | Anima Video Generation Export Boost | product-change | TAX-4 | m20 | 1 Anima video animation export | yes | Monetizes high-value AI video rendering in the Anima mini-app at the exact point of export friction. |
| 7 | Beat Maker AI Synth Loop Sponsor | product-change | TAX-11 | m19 | 1 Beat Maker AI track generation | yes |  |
| 8 | Services Task Execution Token | existing | TAX-1 | m10 | 1 automated assistant task run | no |  |
| 9 | Ideas Feed Premium Style Unlock | product-change | TAX-3 | m17 | 1 premium image style prompt unlock | yes |  |

## Set checks (validateSet)

All checks pass.

## Proposals

### P1 v1: Paywall Decline 30-Min Luzia+ Pass

> Offer a 30-minute Luzia+ trial pass via a rewarded mini-game after declining the account creation paywall.

- **Case:** existing · **Archetype:** TAX-10 · **Beyond baseline:** no
- **Anchor:** moments m2; economy r1, of1, w1, w6
- **Surface:** Services Tab (s06) · **Trigger:** User taps Maybe later on Create Account Sheet and returns to Services Tab without subscribing.
- **Eligibility:** Non-paying guest users who have dismissed the Create Account Sheet paywall and have no active Luzia+ entitlement.
- **Offer:** "Try Luzia+ for 30 Minutes" / "Play a 15-second mini-game to unlock 30 minutes of Luzia+ services. Experience bookings, reminders, and deeper reasoning before deciding to subscribe." / [Play Mini-Game] [No thanks]
- **Simula:** SIM-RWD, entry invitation, Game Partner: Luzia, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** 30 minutes of Luzia+ access · **Caps:** 1/day, cooldown 1440 min
- **Cannibalization guard:** Only surfaces after an explicit paywall decline to self-select users unwilling to purchase immediately. Capped strictly at one 30-minute session per day so it samples premium value without substituting for a recurring subscription.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0054 (text-cheap x 3).
- Scenario, not a forecast: 15% of DAU engage, 1 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.15, ARPDAU $0.0018.
- Flags: none.
- **KPIs:** Luzia+ subscription conversion rate among paywall decliners over 28 days. Guardrails: Overall D7 and D30 user retention non-inferiority margin within -1%; Total paid subscription revenue per user (non-inferiority margin -3% relative); Paywall decline churn rate. Holdout: Randomized user-level 10% holdout group ineligible for rewarded fallback passes for 28 days
- **Precedents:** TAX-10, TAX-2, EX-MUSIC, EX-DUO, AI-15, CORE-5 · **Risks:** Users may defer subscribing if a single 30-minute pass satisfies their immediate one-off assistant task. Inference costs for complex assistant queries during the pass may exceed ad revenue if usage spikes. User fatigue if the fallback invitation triggers on every single paywall dismissal.
- **Evidence:** s07 "Sign up so Luzia can start doing things for you." ✓; s07 "Maybe later" ✓; s06/e6 "Let Luzia handle it!" ✓; s06/e9 "Start new task" ✓; s19/e10 "Upgrade to Luzia+" ✓

**Patch**

- new element `ne1` in Services Tab (s06) after e9: Add MiniGameInvitation card prompting user for 30-minute Luzia+ trial pass
- new element `ne2` in Services Tab (s06) before e6: Add Luzia+ active trial countdown badge displaying remaining minutes
- edge s06/ne1 → rwd (r1 +1 on REWARD_VERIFIED) when r1 < 1

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | Services Tab (s06) | none | r1=0 | e9: Tapping Start new task opens the account creation sheet. | User attempts to start a task and hits the account paywall. |
| 2 | change | Services Tab (s06) | none | r1=0 | e9: User returns to Services tab after tapping Maybe later.; ne1: Rewarded trial invitation appears below the task button. | User dismisses the paywall and returns to the Services tab. |
| 3 | offer | Services Tab (s06) | invite | r1=0 | ne1: Invitation prompts user to play a 15-second mini-game. | Luzia offers a 30-minute Luzia+ trial pass via mini-game. |
| 4 | ad | Services Tab (s06) | game | r1=0 | ne1: User plays the 15-second interactive mini-game with Luzia. | User plays a 15-second interactive mini-game with Luzia. |
| 5 | value | Services Tab (s06) | verified | r1=1 | ne2: Luzia+ trial badge indicates 30 minutes of unlocked access.; e9: Start new task is now enabled without the paywall. | Luzia+ activates for 30 minutes, unlocking assistant services. |

### P2 v1: Custom Bestie Slot Unlock on Signup Decline

> Offer guest users a single Custom Bestie creation slot after they dismiss the signup sheet.

- **Case:** existing · **Archetype:** TAX-7 · **Beyond baseline:** yes
- **Anchor:** moments m7, m8; economy r2, w4, of2
- **Surface:** Custom Bestie Signup Sheet (s02) · **Trigger:** When a guest user taps 'Close sheet' on the Custom Bestie signup sheet without signing up.
- **Eligibility:** Guest users without an account who decline the signup prompt on the Custom Bestie sheet.
- **Offer:** "Create One Custom Bestie" / "Play a 15-second mini-game to unlock one Custom Bestie slot without an account. Customize your AI companion immediately." / [Play Mini-Game] [No thanks]
- **Simula:** SIM-RWD, entry invitation, Game Partner: Luzia, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** 1 Custom Bestie slot · **Caps:** 1/day, cooldown 1440 min
- **Cannibalization guard:** Surfaced strictly after the user declines the full signup sheet (m8), ensuring users with intent to sign up do so first [TAX-10]. Sized to a single creation slot, leaving multi-persona management, cloud backup, and Luzia+ features gated [CANN-1, AI-8].
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0000 (none x 0).
- Scenario, not a forecast: 15% of DAU engage, 1 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.15, ARPDAU $0.0018.
- Flags: none.
- **KPIs:** Custom Bestie creations by guest users. Guardrails: Account signup conversion rate non-inferiority (-2% relative); D7 user retention; Luzia+ paid trial conversion rate. Holdout: User-level 10% holdout of guest users declining Custom Bestie signup for 28 days
- **Precedents:** TAX-7, TAX-10, AI-8, TRIG-1, TRIG-5, POL-2, POL-8, CANN-1 · **Risks:** Guest users might lose their custom bestie if local storage is cleared before creating an account. Slight risk of delaying immediate account signup for users satisfied with a single custom persona.
- **Evidence:** s02/e2 "Close sheet" ✓; s02 "Sign up to personalize your Bestie's look, personality and interests." ✓; s01/e26 "Custom Bestie" ✓; s01/e27 "Make an AI expert tailored to you" ✓

**Patch**

- new sheet `ns1` based on Custom Bestie Signup Sheet (s02): Fallback offer sheet shown upon tapping close on s02, offering a single guest custom bestie slot in exchange for playing a mini-game.
- new element `ne1` in ns1 overlay (no anchor): Simula MiniGameInvitation card with title 'Create One Custom Bestie', Luzia Game Partner avatar, play CTA, and 'No thanks' decline button.
- edge s02/e2 → ns1 when r2 < 1
- edge ns1/ne1 → rwd (r2 +1 on REWARD_VERIFIED)

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | Custom Bestie Signup Sheet (s02) | none | r2=0 | e2: Guest taps Close sheet after declining signup prompt | Guest user opens Custom Bestie creator and encounters the mandatory signup wall. |
| 2 | change | Custom Bestie Signup Sheet (s02) | none | r2=0 | e2: Dismissing signup triggers the fallback value-exchange check | Dismissing the signup sheet triggers the fallback value-exchange check. |
| 3 | offer | ns1 | invite | r2=0 | ne1: Offer card invites user to play for one bestie slot | Luzia invites user to play a quick mini-game to unlock creation. |
| 4 | ad | ns1 | game | r2=0 | ne1: Interactive 15-second mini-game with Luzia as Game Partner | User plays the interactive mini-game with Luzia for fifteen seconds. |
| 5 | value | Chats Home (s01) | verified | r2=1 | e26: Unlocked Custom Bestie creation slot is ready to use | The single Custom Bestie creation slot is unlocked and ready. |

### P3 v1: Single Deep Reasoning Query Unlock

> Unlock a single high-intelligence Deep Reasoning query by playing a quick partner mini-game.

- **Case:** existing · **Archetype:** TAX-2 · **Beyond baseline:** yes
- **Anchor:** moments m14, m9; economy r1, Deep reasoning query (new)
- **Surface:** Attachment and Mode Sheet (s27) · **Trigger:** When the user taps the disabled 'Deep reasoning' option (e15) on s27 while not subscribed to Luzia+.
- **Eligibility:** Non-paying guest or free users who do not have the Luzia+ Subscription (r1).
- **Offer:** "Try Deep Reasoning Free" / "Play a 15-second game with Luzia to unlock 1 smarter, deeper answer." / [Play & Unlock] [No thanks]
- **Simula:** SIM-RWD, entry invitation, Game Partner: Luzia, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** 1 Deep reasoning query · **Caps:** 3/day, cooldown 60 min
- **Cannibalization guard:** The reward is strictly capped at 3 single-use queries per day, keeping the unlimited Deep Reasoning mode highly attractive under the main Luzia+ subscription. It also acts as a sampling mechanism to demonstrate the intelligence of premium answers.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0090 (text-premium x 1).
- Scenario, not a forecast: 15% of DAU engage, 1.5 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.225, ARPDAU $0.0027.
- **Flags:** Cost to serve the reward ($0.0090) exceeds net revenue per view ($0.0063) at the low end.
- **KPIs:** Deep reasoning trial opt-in rate. Guardrails: Luzia+ Subscription conversion rate; D7 user retention; Average session length. Holdout: User-level holdout, 10% of global non-paying DAU, active for 28 days
- **Precedents:** TAX-2, EX-DUO, AI-4, TRIG-1 · **Risks:** Slightly increased LLM inference costs for premium reasoning models Minor cannibalization if 1 query satisfies the user's immediate daily need
- **Evidence:** m14/e15 "Deep reasoning" ✓

**Patch**

- new sheet `ns1` based on Attachment and Mode Sheet (s27): An offer sheet overlay displayed when tapping Deep reasoning on s27, prompting the user to play a 15s game to unlock 1 query.
- new element `ne1` in ns1 overlay (no anchor): An interactive button displaying 'Play & Unlock' as the primary CTA next to 'No thanks'.
- edge s27/e15 → ns1 when r1 < 1
- edge ns1/ne1 → rwd (Deep reasoning query +1 on REWARD_VERIFIED)

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | Attachment and Mode Sheet (s27) | none | r1=0 | e15: Deep reasoning toggle is locked. | Guests tapping the Deep reasoning toggle are redirected to the paywall. |
| 2 | change | Attachment and Mode Sheet (s27) | none | r1=0 | e15: Tapping toggle now prompts a trial. | Tapping the toggle now triggers a rewarded trial offer. |
| 3 | offer | ns1 | invite | r1=0, Deep reasoning query=0 | ne1: Tap Play & Unlock to start. | Luzia offers 1 free query for playing a 15-second game. |
| 4 | ad | ns1 | game | r1=0, Deep reasoning query=0 |  | The Simula SDK launches a 15-second interactive playable mini-game. |
| 5 | value | Attachment and Mode Sheet (s27) | verified | r1=0, Deep reasoning query=1 | e15: Deep reasoning query is unlocked. | One Deep reasoning query is granted and the toggle activates. |

### P4 v1: Daily Check-In Image Generation Hub

> Introduce a daily check-in banner on the Chats Home tab that rewards users with 2 AI Image Credits for playing a quick mini-game, incentivizing daily retention and introducing soft currency monetization.

- **Case:** product-change · **Archetype:** TAX-9 · **Beyond baseline:** yes
- **Anchor:** moments m16; economy r3, r4 AI Image Credits (new)
- **New mechanic:** Daily AI Check-In: A daily loyalty calendar where users check in to earn free AI Image Credits, which are capped and spent on image creation. Why: Creates a recurring engagement hook and provides a structured way for free users to experience image generation without abusing the system, while opening up a high-value rewarded ad placement.
- **Surface:** Chats Home (s01) · **Trigger:** User taps the Daily Check-In banner on Chats Home to open the check-in modal and initiates the claim.
- **Eligibility:** Non-paying, free guests and signed-up users who have not claimed today's check-in reward.
- **Offer:** "Claim Your Daily Credits" / "Play a quick 15-second game to unlock 2 free AI Image Credits." / [Play Now] [Maybe Later]
- **Simula:** SIM-RWD, entry button, Game Partner: Luzia, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** 2 AI Image Credits · **Caps:** 1/day, cooldown 1440 min
- **Cannibalization guard:** The daily check-in limits free credits to just 2 per day, which is enough for only two standard images. High-volume creation and advanced options still require a Luzia+ subscription, preventing any devaluing of the premium tier.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0500 (image x 2).
- Scenario, not a forecast: 25% of DAU engage, 1 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.25, ARPDAU $0.003.
- **Flags:** Cost to serve the reward ($0.0500) exceeds net revenue per view ($0.0063) at the low end.
- **KPIs:** D7 and D30 user retention rate. Guardrails: Paid subscription conversion rate; Average daily active users; Image generation cost per user. Holdout: User-level 10% holdout group kept ineligible for the daily check-in feature for a duration of 28 days.
- **Precedents:** TAX-9, AI-3, EX-DUO · **Risks:** High image generation API costs if daily active user adoption spikes rapidly, which we mitigate by using a lower-cost compressed image model. Cannibalization of direct sign-ups, which we control by keeping the daily credit limit strict and showcasing Luzia+ premium styling inside the generation flow.
- **Evidence:** m16 "Chats" ✓

**Patch**

- new sheet `ns1`: Create a Daily Check-In sheet with a weekly progression calendar.
- new element `ne1` in Chats Home (s01) after e11: Add a compact 'Daily Check-In Banner' under the welcome text showing today's unclaimed reward.
- new element `ne2` in ns1 overlay (no anchor): Add a prominent 'Claim Reward' button that triggers the rewarded video/playable flow.
- new element `ne3` in ns1 after ne2: Add a rewards display showing the earned '2 AI Image Credits' with an animation after completion.
- edge s01/ne1 → ns1
- edge ns1/ne2 → rwd (r4 +2 on REWARD_VERIFIED)

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | Chats Home (s01) | none | r4=0 | e11: Luzia welcomes the user to the chat. | Luzia Chats Home today lacks a daily retention loop or tokens. |
| 2 | change | Chats Home (s01) | none | r4=0 | ne1: New check-in banner appears here. | We add a daily check-in banner on Chats Home tab. |
| 3 | offer | ns1 | invite | r4=0 | ne2: Claim button initiates ad playable. | Tapping the banner displays a weekly check-in calendar to user. |
| 4 | ad | ns1 | game | r4=0 | ne2: Simula rewarded mini-game plays. | The user plays a 15-second sponsored game with Luzia. |
| 5 | value | ns1 | verified | r4=2 | ne3: New balance shows 2 credits. | Once completed, the user receives 2 free AI Image Credits. |

### P5 v1: Anima Video Generation Export Boost

> Users can play a quick Simula game to earn an extra Anima video generation credit when they hit the daily free limit.

- **Case:** product-change · **Archetype:** TAX-4 · **Beyond baseline:** yes
- **Anchor:** moments m20; economy r_anima_credit (new)
- **New mechanic:** Anima Generation Limits: Introduce a daily limit of 1 free video animation per day, with additional exports costing 1 Anima Video Credit. Why: Protects high-COGS GPU resources on video generation while providing a clear monetization path for free users. **Removes free value (high risk).**
- **Surface:** Animate Tool Screen (s09) · **Trigger:** When the user taps the generate button with 0 Anima Video Credits remaining.
- **Eligibility:** Non-paying free tier users who have exhausted their daily video generation limit.
- **Offer:** "Out of Anima Credits" / "Play a 15-second game to get 1 Anima Video Credit and export now." / [Play Now] [No Thanks]
- **Simula:** SIM-RWD, entry button, Game Partner: Luzia, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** 1 Anima Video Credit · **Caps:** 3/day, cooldown 15 min
- **Cannibalization guard:** Video generation limits are completely distinct from the main Luzia+ core reasoning or chat features, ensuring subscribers still maintain exclusive access to faster models and advanced custom services.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0250 (image x 1).
- Scenario, not a forecast: 25% of DAU engage, 1.5 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.375, ARPDAU $0.0045.
- **Flags:** Cost to serve the reward ($0.0250) exceeds net revenue per view ($0.0063) at the low end.
- **KPIs:** Anima Generation Ad Revenue. Guardrails: Luzia+ Subscription Conversion Rate; s09 Screen Churn Rate; D7 Retention. Holdout: User-level randomized holdout group, 10% allocation, evaluated over 28 days.
- **Precedents:** TAX-4, EX-UTIL, TRIG-5, POL-8 · **Risks:** Introducing limits on video generation may cause initial user backlash, similar to Duolingo's Energy change. High video generation infrastructure costs might exceed ad payout in low-eCPM regions if not geographically capped.
- **Evidence:** m20 "Animate Tool Screen (tab) is a place users return to (6 visits during exploration)" (unverified); s09/e14 "Upload the pic you want to animate" ✓

**Patch**

- new element `ne1` in Animate Tool Screen (s09) after e34: Animate & Export Button
- new element `ne2` in Animate Tool Screen (s09) after e12: Anima Credit Badge
- edge s09/ne1 → rwd (r_anima_credit +1 on REWARD_VERIFIED) when r_anima_credit < 1

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | Animate Tool Screen (s09) | none |  | e14: Users upload their picture and pick an animation option on this tab. | Currently, users can select styles like Clapping or Walking on the Anima Tool screen. |
| 2 | change | Animate Tool Screen (s09) | none | r_anima_credit=0 | ne2: Shows that the user has 0 Anima Credits remaining today.; ne1: Generate Video is locked when the balance is 0. | We introduce a credit counter and block video generation once the daily allowance is exhausted. |
| 3 | offer | Animate Tool Screen (s09) | invite | r_anima_credit=0 | ne1: Tapping this opens the Simula game invitation. | An explicit opt-in overlay appears, offering 1 credit for playing a 15-second game. |
| 4 | ad | Animate Tool Screen (s09) | game | r_anima_credit=0 |  | The user plays the Simula interactive mini-game with Luzia for 15 seconds. |
| 5 | value | Animate Tool Screen (s09) | verified | r_anima_credit=1 | ne2: Credit is instantly updated to 1 after verification.; ne1: The button is now unlocked and ready to export the video. | Upon game completion, the credit is granted and the user can generate their AI video animation immediately. |

