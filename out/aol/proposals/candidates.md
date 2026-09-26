# Rewarded-ad candidates: AOL

Regime (computed): **no-scarcity**. 8 ideas, 3 written up.

## Proposals at a glance

The write-ups are below. The verdicts are in `judgments.md`, so a reader can form a view first.

| id | title | case | archetype | surface | reward |
|---|---|---|---|---|---|
| P1 | AOL Guest Commenter | product-change | TAX-3 | Add Comment Page (s05) | one guest comment submission |
| P2 | AOL Ad-Free Sprint | product-change | TAX-2 | Account Menu Sidebar (s11) | 15 minutes of ad-free reading |
| P3 | Daily Reader Streak | product-change | TAX-9 | Account Menu Sidebar (s11) | 10 News Credits |

## The obvious baseline (the bar to beat)

- Watch a video to remove banner ads for 30 minutes of news reading.
- Watch an ad to unlock a 'Premium' news article otherwise hidden behind a wall.
- Watch a video to earn 100 generic coins for a new profile customization shop.

## Moment sweep

| moment | type | screen | value exchange | viable |
|---|---|---|---|---|
| m1 | desire | Home News Feed (s02) | None; this is content text about an external fundraiser, not an in-app resource. | no |
| m2 | desire | Account Menu Sidebar (s11) | Trade attention for a temporary ad-free reading period after dismissing subscription options. | yes |
| m3 | hub | Home News Feed (s01) | None; this is the first value screen after launch where offers are prohibited. | no |
| m4 | hub | Home News Feed (s02) | Proactive entry point for daily engagement rewards on the main entertainment feed. | yes |
| m5 | hub | Home News Feed (s07) | Offer a local news 'sponsored session' where local ads are suppressed for a duration. | yes |
| m6 | hub | News Feed Home (s13) | Proactive hub for earning news-related perks like priority alerts. | yes |
| m7 | hub | Home Feed (s14) | Proactive entry for doubling reading activity rewards on the home feed. | yes |
| m8 | first-value | Home News Feed (s01) | None; NO OFFERS ALLOWED on the first core content screen. | no |
| m9 | desire | Add Comment Page (s05) | Unlock the ability to post a single comment without completing the sign-up flow. | yes |
| m10 | hub | Account Menu Sidebar (s11) | A persistent sidebar hub for managing reward-earning tasks and 'Saved articles' capacity. | yes |

## All ideas

| # | title | case | archetype | moment | reward | beyond baseline | selected because |
|---|---|---|---|---|---|---|---|
| 0 | AOL Guest Commenter | product-change | TAX-3 | m9 | 1 Guest Comment | yes | It addresses the strongest friction point in the app: the mandatory sign-up to comment. Unlocking one 'Guest Comment' via an ad solves a moment-of-need problem [TAX-3]. |
| 1 | AOL Ad-Free Sprint | product-change | TAX-2 | m2 | 15 minutes of Ad-free Reading | no | Ad-free sessions are the proven analog for media apps like Spotify and Pandora [EX-MUSIC]. Using it as a fallback on the account sidebar targets users already seeking to change their experience [TAX-2]. |
| 2 | Daily Reader Streak | product-change | TAX-9 | m10 | 10 News Credits | yes | A proactive hub for 'Daily Reader Streaks' builds a retention loop in a no-scarcity environment, rewarding users with a new cosmetic or utility currency for their attention [TAX-9]. |
| 3 | Headline Doubler | product-change | TAX-5 | m7 | 2x Activity Points | yes |  |
| 4 | Saved List Expansion | product-change | TAX-7 | m10 | +5 Saved Articles slots | yes |  |
| 5 | Inbox Priority Pass | product-change | TAX-4 | m6 | 1 hour of Priority News Alerts | yes |  |
| 6 | Sports Spotlight Session | product-change | TAX-11 | m4 | Ad-free Entertainment feed | yes |  |
| 7 | Comment sample fallback | product-change | TAX-10 | m9 | 1 Guest Reply | yes |  |

## Set checks (validateSet)

All checks pass.

## Proposals

### P1 v1: AOL Guest Commenter

> Allow users to post a single news comment by playing a mini-game instead of signing up.

- **Case:** product-change · **Archetype:** TAX-3 · **Beyond baseline:** yes
- **Anchor:** moments m9; economy Account sign-in / verified user status (new)
- **New mechanic:** Guest Posting: A temporary authorization to submit one comment to a news article discussion without a full AOL account registration. Why: The sign-up wall on the Add Comment Page (s05) prevents spontaneous interaction from guest users, losing valuable engagement data and ad opportunities.
- **Surface:** Add Comment Page (s05) · **Trigger:** When a user land on the Add Comment Page and encounters the Sign Up to Post requirement.
- **Eligibility:** Non-signed-in users who have entered text in the comment box.
- **Offer:** "Post as a guest" / "Don't want to sign up right now? Play a quick 15-second game to post this comment as a guest." / [Play to Post] [Maybe later]
- **Simula:** SIM-RWD, entry button, Game Partner: AOL, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** one guest comment submission · **Caps:** 1/day, cooldown 1440 min
- **Cannibalization guard:** The guest pass is limited to a single comment per day and does not grant account benefits like comment history, replies, or profile customization, maintaining the long-term value of a full AOL account.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0000 (none x 1).
- Scenario, not a forecast: 15% of DAU engage, 1 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.15, ARPDAU $0.0018.
- Flags: none.
- **KPIs:** Comments per DAU. Guardrails: Account sign-up rate; D1 retention. Holdout: user-level, 10%, 28 days
- **Precedents:** TAX-3, TAX-10, EX-SERIAL · **Risks:** Potential for lower-quality comments from non-verified users User frustration if the guest post limit is hit
- **Evidence:** s05/e141 "Sign Up to Post" ✓; m9 "User attempts to post a comment on an article and hits the sign-up wall." (unverified)

**Patch**

- new element `ne1` in Add Comment Page (s05) before e141: A Simula 'Play to Post' rewarded invitation button styled as a secondary action.
- edge s05/ne1 → rwd (Guest Comment +1 on REWARD_VERIFIED)

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | Conversation Screen (s04) | none |  | e18: User reading comments | The user reads interesting comments on a news article. |
| 2 | change | Add Comment Page (s05) | none |  | e141: Forced sign-up to engage; ne1: New guest option | When trying to comment, they see the sign-up requirement but also a new guest option. |
| 3 | offer | Add Comment Page (s05) | invite |  | ne1: Post without an account | The user chooses to play a quick game to unlock a guest post. |
| 4 | ad | Add Comment Page (s05) | game |  |  | A fun 15-second AOL-themed mini-game plays. |
| 5 | value | Conversation Screen (s04) | verified | Guest Comment=0 | e9: Comment successfully posted | The reward is verified and the user's comment is published immediately. |

### P2 v1: AOL Ad-Free Sprint

> Enjoy 15 minutes of ad-free news reading after a quick game.

- **Case:** product-change · **Archetype:** TAX-2 · **Beyond baseline:** no
- **Anchor:** moments m2, m10; economy AD TODAY native on Home News Feed (e42), AD TODAY banner on Article Ad View (e17), Ad-free Sprint (new)
- **New mechanic:** Ad-free Sprint: A time-boxed entitlement that suppresses all native and banner advertisements across news feeds and article pages. Why: The app is currently high-density in advertisements but lacks a scarcity-based value exchange to drive engagement or sample premium benefits.
- **Surface:** Account Menu Sidebar (s11) · **Trigger:** User opens the Account Menu Sidebar and views account options.
- **Eligibility:** Non-paying users currently exposed to standard ad density.
- **Offer:** "Go Ad-Free for 15 Minutes" / "Play a 15-second game to clear all ads from your news feed for a short sprint." / [Start Sprint] [No thanks]
- **Simula:** SIM-RWD, entry button, Game Partner: AOL, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** 15 minutes of ad-free reading · **Caps:** 3/day, cooldown 60 min
- **Cannibalization guard:** The reward is strictly time-boxed to 15 minutes, serving as a 'taste of premium' sampling effect rather than a permanent replacement for ad-free tiers.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0000 (none x 0).
- Scenario, not a forecast: 15% of DAU engage, 1.5 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.225, ARPDAU $0.0027.
- Flags: none.
- **KPIs:** Ad-free Sprint sessions started. Guardrails: Daily active news reading time; Native ad CTR (non-sprint); D7 Retention. Holdout: User-level holdout, 10% share, 21 days
- **Precedents:** TAX-2, EX-MUSIC, CORE-2 · **Risks:** Users may grow accustomed to ad-free reading and find the return to standard density jarring. Potential revenue dip if sprint sessions overlap with peak reading times.
- **Evidence:** s11 "Unsubscribe" ✓; s02/e47 "TEMU in Taboola advertising section" ✓

**Patch**

- new element `ne1` in Account Menu Sidebar (s11) before e52: A menu item with a lightning icon titled 'Ad-Free Sprint (15 min)' and a 'Play to Start' subtitle.
- new element `ne2` in Home News Feed (s02) after e12: A small countdown timer badge next to the 'Home' title indicating remaining ad-free time.
- edge s11/ne1 → rwd (Ad-free Sprint +15 on REWARD_VERIFIED)

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | Account Menu Sidebar (s11) | none |  | e52: User views standard account options. | The user explores the sidebar menu where news and account settings are managed. |
| 2 | change | Account Menu Sidebar (s11) | none |  | ne1: New Ad-Free Sprint option appears. | A new 'Ad-Free Sprint' entry point is added to the menu, offering a premium benefit for attention. |
| 3 | offer | Account Menu Sidebar (s11) | invite |  | ne1: User taps to see the value exchange. | Simula MiniGameInvitation appears, disclosing the 15-second requirement and the 15-minute reward. |
| 4 | ad | Account Menu Sidebar (s11) | game |  |  | The user plays a quick 15-second game with the AOL Game Partner character. |
| 5 | value | Home News Feed (s02) | verified | Ad-free Sprint=15 | ne2: Ads are suppressed; timer begins. | The reward is granted; ads are hidden from the feed and a countdown timer confirms the sprint status. |

### P3 v1: Daily Reader Streak

> Earn virtual credits daily to unlock premium news summaries by playing interactive mini-games.

- **Case:** product-change · **Archetype:** TAX-9 · **Beyond baseline:** yes
- **Anchor:** moments m10; economy AD TODAY native on Home News Feed (e42), News Credits (new)
- **New mechanic:** AOL News Credits: A habit-building virtual currency earned through daily streaks and rewarded ads, redeemable for ad-light reading sessions and advanced article summaries. Why: AOL currently has no scarce resource; News Credits create a value exchange to monetize non-paying attention via opt-in ads.
- **Surface:** Account Menu Sidebar (s11) · **Trigger:** A user opens the Account Menu Sidebar to manage settings and sees a new Daily Streak progress card.
- **Eligibility:** Non-signed-in users and signed-in non-subscribers who haven't claimed today's reward.
- **Offer:** "Daily Reading Streak" / "Play a 15-second game with AOL to earn 10 News Credits and keep your streak alive!" / [Play Now] [No thanks]
- **Simula:** SIM-RWD, entry button, Game Partner: AOL, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** 10 News Credits · **Caps:** 1/day, cooldown 1440 min
- **Cannibalization guard:** The reward is a small daily amount that cannot be stacked to replace the core subscription value; it acts as a sampling mechanic for premium features.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0000 (none x 0).
- Scenario, not a forecast: 20% of DAU engage, 1 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.2, ARPDAU $0.0024.
- Flags: none.
- **KPIs:** D7 Retention. Guardrails: Average Sessions Per DAU; Taboola Ad Click-Through Rate. Holdout: User-level randomization, 10% share, 28-day duration
- **Precedents:** TAX-9, EX-SERIAL, AI-3 · **Risks:** User perceived value of credits may start low until redemption utility is expanded. Potential fatigue if the streak mechanic feels repetitive.
- **Evidence:** s11 "Manage Accounts" ✓; s11/e31 "Settings" ✓

**Patch**

- new element `ne1` in Account Menu Sidebar (s11) after e36: Add a 'Daily Reader Streak' section with a progress bar and a 'Claim Credits' button.
- edge s11/ne1 → rwd (News Credits +10 on REWARD_VERIFIED)

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | Account Menu Sidebar (s11) | none |  | e12: Existing accounts menu | A user opens the sidebar to access their settings or saved articles. |
| 2 | change | Account Menu Sidebar (s11) | none | News Credits=0 | ne1: Daily Streak section | A new 'Daily Reader Streak' card appears below the settings menu. |
| 3 | offer | Account Menu Sidebar (s11) | invite | News Credits=0 | ne1: Tap to claim rewards | The user taps to earn credits, triggering a Simula rewarded game invitation. |
| 4 | ad | Account Menu Sidebar (s11) | game |  |  | The user plays a 15-second sponsored mini-game with the AOL game partner. |
| 5 | value | Account Menu Sidebar (s11) | verified | News Credits=10 | ne1: Streak maintained! | After the game, the streak is updated and 10 News Credits are granted. |

