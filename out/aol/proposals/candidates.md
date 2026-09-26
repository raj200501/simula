# Rewarded-ad candidates: AOL

Regime (computed): **no-scarcity**. 8 ideas, 3 written up.

## Blind labels (fill in before reading the judgments)

Label each proposal SHIP, REVISE or REJECT from the write-ups below, before running `judge`. Copy the labels to `proposals/labels.json` as `[{"id":"P1","label":"SHIP"}]`.

| id | title | case | archetype | surface | reward | your label (SHIP/REVISE/REJECT) |
|---|---|---|---|---|---|---|
| P1 | Guest Comment Pass | product-change | TAX-3 | Add Comment Page (s05) | 1 guest comment post |  |
| P2 | News Streak Multiplier | product-change | TAX-5 | News Feed Home (s13) | Daily Streak points doubled |  |
| P3 | Bonus Save Slot | product-change | TAX-7 | Account Menu Sidebar (s11) | 5 extra save slots |  |

## The obvious baseline (the bar to beat)

- Watch a video to remove all native and banner ads for the next 30 minutes.
- Watch an ad to unlock access to a single 'Premium' article from a partner publisher.
- Watch a video to unlock additional font sizes and themes in the Article Detail Page settings.

## Moment sweep

| moment | type | screen | value exchange | viable |
|---|---|---|---|---|
| m1 | desire | Home News Feed (s02) | None; reading headlines is already a free core loop action. | no |
| m2 | desire | Account Menu Sidebar (s11) | None; unsubscribing is a utility/management function, not a rewardable desire. | no |
| m3 | hub | Home News Feed (s01) | Unlock a temporary 'Ad-Light' browsing session for the Home News Feed. | yes |
| m4 | hub | Home News Feed (s02) | Unlock an exclusive 'Lighter Side' interactive puzzle or sponsored mini-game. | yes |
| m5 | hub | Home News Feed (s07) | Unlock an enhanced 'Local Radar' weather view to fix the weather error state. | yes |
| m6 | hub | News Feed Home (s13) | Earn a 'Daily Read' multiplier to boost account engagement points. | yes |
| m7 | hub | Home Feed (s14) | Unlock a 'Political Digest' summary for the current session. | yes |
| m8 | first-value | Home News Feed (s01) | None; first-value moment must be offer-free. | no |
| m9 | desire | Add Comment Page (s05) | Bypass the sign-up wall to post a single 'Guest Comment' on the current article. | yes |
| m10 | hub | Account Menu Sidebar (s11) | Unlock a permanent extra slot for the Saved Articles list. | yes |

## All ideas

| # | title | case | archetype | moment | reward | beyond baseline | selected because |
|---|---|---|---|---|---|---|---|
| 0 | Guest Comment Pass | product-change | TAX-3 | m9 | 1 guest comment post | yes | This targets a high-intent 'desire' moment where users are currently blocked by a hard sign-up wall. Allowing a single guest comment per ad view provides immediate value and samples the community features [TAX-3]. |
| 1 | Ad-Light Session | product-change | TAX-2 | m3 | 30 minutes of reduced ads | no |  |
| 2 | News Streak Multiplier | product-change | TAX-5 | m6 | 2x engagement points for today | yes | Introduces a habit-forming product change by rewarding streaks. A proactive multiplier on a frequent hub screen encourages daily returns without interrupting the reading flow [TAX-5, TRIG-1]. |
| 3 | Pro Weather Radar | product-change | TAX-4 | m5 | 24h of detailed local radar | yes |  |
| 4 | Priority User Badge | product-change | TAX-13 | m9 | Verified Guest badge for 1 hour | yes |  |
| 5 | Bonus Save Slot | product-change | TAX-7 | m10 | +1 saved article slot | yes | Utility-based capacity expansion is a low-cannibalization reward for news apps. It encourages users to curate more content within the AOL ecosystem while providing a tangible permanent benefit [TAX-7]. |
| 6 | Lighter Side Puzzle | product-change | TAX-3 | m4 | access to the Daily Crossword | yes |  |
| 7 | Premium Reading Themes | product-change | TAX-13 | m10 | AOL Classic dark mode theme | no |  |

## Set checks (validateSet)

All checks pass.

## Proposals

### P1 v1: Guest Comment Pass

> Allow users to post a single comment as a guest after viewing a rewarded ad, providing a taste of social engagement without sign-up.

- **Case:** product-change · **Archetype:** TAX-3 · **Beyond baseline:** yes
- **Anchor:** moments m9; economy none
- **New mechanic:** Guest Comment Pass: A temporary bypass that allows non-logged-in users to post one comment on an article without signing up for an AOL account, after viewing a rewarded ad. Why: Currently, commenting is gated behind a 'Sign Up to Post' wall, preventing unregistered users from engaging. This pass offers a low-friction entry to social features, potentially increasing engagement and driving future account creation.
- **Surface:** Add Comment Page (s05) · **Trigger:** User finishes typing a comment on the Add Comment Page (s05) and sees the 'Sign Up to Post' button, indicating a wall. The new 'Post as Guest' button is offered as an alternative.
- **Eligibility:** Non-logged-in users in their 2nd+ session, not in sensitive content contexts. Capped per user per day.
- **Offer:** "Post Your Comment Now" / "Play a quick game with AOL to post this comment instantly, no sign-up required. Your post will appear as 'Guest User'." / [Play Game & Post] [No Thanks]
- **Simula:** SIM-RWD, entry button, Game Partner: AOL, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** 1 guest comment post · **Caps:** 2/day, cooldown 180 min
- **Cannibalization guard:** This feature provides access to an action currently unavailable to non-logged-in users, serving as a trial for the social aspect of the app. It does not replace any paid features as no subscription for commenting exists, nor does it grant full account benefits. It may encourage future sign-ups by showcasing community value.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0018 (text-cheap x 1).
- Scenario, not a forecast: 5% of DAU engage, 1.5 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.075, ARPDAU $0.0009.
- Flags: none.
- **KPIs:** Total comments posted by guest users (via rewarded ad) and subsequent account sign-up rate.. Guardrails: Logged-in user comment volume (non-inferiority); D7 / D30 retention for new users; Complaint rate regarding ads. Holdout: User-level randomized holdout (5-10% of non-logged-in users for 28 days)
- **Precedents:** TAX-3, AI-11, EX-SERIAL, EX-UTIL · **Risks:** Potential for spam or low-quality guest comments if moderation is insufficient, impacting community quality. Low opt-in rate if users don't perceive enough value in a single guest comment. Brand safety concerns with user-generated content in proximity to ads. Requires robust content moderation for guest posts.
- **Evidence:** m9 "User attempts to post a comment on an article and hits the sign-up wall." (unverified)

**Patch**

- new modal `ns1` based on Add Comment Page (s05): A modal overlay for the rewarded offer invitation, appearing above the Add Comment Page.
- new element `ne1` in Add Comment Page (s05) before e15: A new button labeled 'Post as Guest' placed slightly above the existing 'Sign Up to Post' button.
- edge s05/ne1 → rwd

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | Add Comment Page (s05) | none |  | P: User drafts a comment, ready to post.; e15: The 'Sign Up to Post' button is the only path. | A user wants to post a comment, but the app requires them to sign in first, blocking their action. |
| 2 | change | Add Comment Page (s05) | none |  | P: Comment draft is preserved.; ne1: A new 'Post as Guest' button appears.; e15: The 'Sign Up to Post' option remains. | A 'Post as Guest' button is added as an alternative, offering a new path to engagement. |
| 3 | offer | Add Comment Page (s05) | invite |  | ns1: The rewarded ad offer appears after tapping 'Post as Guest'.; e15: Paid alternative is subtly visible. | The user taps 'Post as Guest' and is shown an invitation to play a game for a free comment. |
| 4 | ad | Add Comment Page (s05) | game |  | SIM-RWD: User plays a short mini-game with AOL, the Game Partner. | The user opts in and completes a short rewarded mini-game. |
| 5 | value | Conversation Screen (s04) | verified |  | e18: The user's comment is successfully posted. | Upon completion and verification, the user's comment is posted, and they are returned to the conversation screen. |

### P2 v1: News Streak Multiplier

> Drive daily reading habit through a gamified streak mechanic that can be doubled by watching rewarded ads.

- **Case:** product-change · **Archetype:** TAX-5 · **Beyond baseline:** yes
- **Anchor:** moments m6; economy DAILY_STREAK_POINTS
- **New mechanic:** Daily Reading Streak: Users earn 1 point for every day they read or save at least one article. Points accrue for achievements and profile badges. Why: Creates a meaningful, scarce engagement resource to anchor the rewarded ad value exchange.
- **Surface:** News Feed Home (s13) · **Trigger:** After the user taps 'Save this article' (e38) on the News Feed Home screen (s13), confirming a daily reading action.
- **Eligibility:** All non-paying users who have completed their daily reading goal (saved at least 1 article).
- **Offer:** "Double Your Streak Points" / "Play a 15-second game to double your Daily Streak points for today." / [Play Now] [No thanks]
- **Simula:** SIM-RWD, entry button, Game Partner: AOL News, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** Daily Streak points doubled · **Caps:** 1/day, cooldown 60 min
- **Cannibalization guard:** The reward is a retention-focused meta-game point (engagement), not a substitute for a paid subscription tier or ad-free access. This creates positive sampling effects for the app without devaluing existing content.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0000 (none x 0).
- Scenario, not a forecast: 40% of DAU engage, 1 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.4, ARPDAU $0.0048.
- Flags: none.
- **KPIs:** Daily Active Users (DAU). Guardrails: Article save rate; Session duration; Retention (D7, D30). Holdout: 10% of total users held out from the Streak Multiplier offer for 30 days.
- **Precedents:** TAX-5, TAX-9, EX-DUO · **Risks:** Points may be perceived as trivial if they do not unlock tangible benefits like badges or profile themes. Potential for user fatigue if the multiplier is offered every day without sufficient engagement.
- **Evidence:** s13/e38 "Save this article" ✓; s13/e37 "Takeaways from Trump-Xi summit: Lots of pomp and e" ✓

**Patch**

- new element `ns13_streak_meter` in News Feed Home (s13) after e14: Displays current daily reading streak count (e.g., 'Today's Streak: 3')
- new element `ns13_multiplier_btn` in News Feed Home (s13) after e38: Button visible after saving an article: '2x Streak Multiplier'
- edge s13/ns13_multiplier_btn → rwd (DAILY_STREAK_POINTS +1 on REWARD_VERIFIED) when DAILY_STREAK_POINTS < 2

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | News Feed Home (s13) | none | DAILY_STREAK_POINTS=3 | ns13_streak_meter: Current 3-day streak shown. | User has a 3-day reading streak. |
| 2 | change | News Feed Home (s13) | none | DAILY_STREAK_POINTS=3 | e38: User saves an article. | User saves a news story, triggering the streak multiplier opportunity. |
| 3 | offer | News Feed Home (s13) | invite | DAILY_STREAK_POINTS=3 | ns13_multiplier_btn: Offer: Double your streak points? | A prompt invites the user to double their streak points by playing a short game. |
| 4 | ad | News Feed Home (s13) | game | DAILY_STREAK_POINTS=3 | ns13_multiplier_btn: Game: 15s play session. | User plays a quick 15-second mini-game with the AOL partner. |
| 5 | value | News Feed Home (s13) | verified | DAILY_STREAK_POINTS=4 | ns13_streak_meter: Points doubled: 4 points total. | The reward is verified and streak points are credited. |

### P3 v1: Bonus Save Slot

> Watch a quick game to expand your article library.

- **Case:** product-change · **Archetype:** TAX-7 · **Beyond baseline:** yes
- **Anchor:** moments m10; economy SAVE_CAPACITY, ARTICLE_SAVE
- **New mechanic:** Library Capacity Limit: Limit free account article saving to 50 slots. Why: Creates a scarce resource anchor for rewarded ads. **Removes free value (high risk).**
- **Surface:** Account Menu Sidebar (s11) · **Trigger:** User opens the sidebar menu.
- **Eligibility:** Logged-in free tier users.
- **Offer:** "Expand Your Library" / "Play a quick game to add 5 more save slots." / [Play Now] [No thanks]
- **Simula:** SIM-RWD, entry button, Game Partner: AOL, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** 5 extra save slots · **Caps:** 3/day, cooldown 60 min
- **Cannibalization guard:** The reward is additive, not subtractive. Saved article limit is a non-core engagement feature and does not impact ad-supported reading experience [TAX-7].
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0000 (none x 5).
- Scenario, not a forecast: 15% of DAU engage, 1.2 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.18, ARPDAU $0.0022.
- Flags: none.
- **KPIs:** Total saved articles. Guardrails: D7 Retention; Daily ad revenue. Holdout: 10% user holdout for 4 weeks to measure total engagement.
- **Precedents:** TAX-7, POL-2, TRIG-5 · **Risks:** Users may be frustrated by the introduction of a new limit on a previously unlimited feature.
- **Evidence:** s11 "Account Menu Sidebar" (unverified)

**Patch**

- new element `ne_storage_status` in Account Menu Sidebar (s11) after (no anchor): Add storage status (45/50 slots) and 'Expand Library' CTA button.
- edge s11/ne_storage_status → rwd (SAVE_CAPACITY +5 on REWARD_VERIFIED)

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | Account Menu Sidebar (s11) | none | SAVE_CAPACITY=50 | ne_storage_status: Existing sidebar menu. | AOL sidebar today, providing general account navigation. |
| 2 | change | Account Menu Sidebar (s11) | none | SAVE_CAPACITY=50 | ne_storage_status: New capacity tracker: 45/50 saved articles. | Introduce a 50-article save limit to the account menu. |
| 3 | offer | Account Menu Sidebar (s11) | invite | SAVE_CAPACITY=50 | ne_storage_status: Play to unlock +5 slots! | When user nears the limit, the expansion offer appears. |
| 4 | ad | Account Menu Sidebar (s11) | game | SAVE_CAPACITY=50 | ne_storage_status: 15s mini-game. | User plays the interactive rewarded mini-game. |
| 5 | value | Account Menu Sidebar (s11) | verified | SAVE_CAPACITY=55 | ne_storage_status: Slots expanded to 55! | Library capacity is updated immediately upon verification. |

