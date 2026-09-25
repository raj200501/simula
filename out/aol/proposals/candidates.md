# Rewarded-ad candidates: AOL

Regime (computed): **no-scarcity**. 8 ideas, 3 written up.

## Blind labels (fill in before reading the judgments)

Label each proposal SHIP, REVISE or REJECT from the write-ups below, before running `judge`. Copy the labels to `proposals/labels.json` as `[{"id":"P1","label":"SHIP"}]`.

| id | title | case | archetype | surface | reward | your label (SHIP/REVISE/REJECT) |
|---|---|---|---|---|---|---|
| P1 | Unlock Commenting | product-change | TAX-10 | Add Comment Page (s05) | One comment post |  |
| P2 | Daily News Reader Streak | product-change | TAX-9 | News Feed Home (s13) | 50 Reader Points |  |
| P3 | Premium Insights Unlock | product-change | TAX-3 | Home News Feed (s01) | 1 Premium Deep-Dive Article |  |

## The obvious baseline (the bar to beat)

- Insert more native recommendation units into the Home Feed feed.
- Show full-screen interstitial ads between article clicks.
- Add more persistent banner ads in article detail views.

## Moment sweep

| moment | type | screen | value exchange | viable |
|---|---|---|---|---|
| m1 | desire | Home News Feed (s02) | Unlock specific premium analytical content | yes |
| m2 | desire | Account Menu Sidebar (s11) | N/A | no |
| m3 | hub | Home News Feed (s01) | Unlock ad-free reading session | yes |
| m4 | hub | Home News Feed (s02) | Unlock ad-free reading session | yes |
| m5 | hub | Home News Feed (s07) | Unlock ad-free reading session | yes |
| m6 | hub | News Feed Home (s13) | Earn daily streak bonus credits | yes |
| m7 | hub | Home Feed (s14) | Unlock ad-free reading session | yes |
| m8 | first-value | Home News Feed (s01) | N/A (First value policy) | no |
| m9 | desire | Add Comment Page (s05) | Temporary bypass for comment posting | yes |
| m10 | hub | Account Menu Sidebar (s11) | N/A | no |

## All ideas

| # | title | case | archetype | moment | reward | beyond baseline | selected because |
|---|---|---|---|---|---|---|---|
| 0 | Premium Insights Unlock | product-change | TAX-3 | m3 | 1 Premium Deep-Dive Article | yes | Adds a premium tier (product change) that creates tangible value. Matches the 'Wait or Watch' pattern (TAX-3), allowing users who don't subscribe to still access high-value analytical content. |
| 1 | Ad-Free Reading Hour | product-change | TAX-2 | m3 | 60 minutes of ad-free reading | yes |  |
| 2 | Daily News Reader Streak | product-change | TAX-9 | m6 | +50 Reader Points towards monthly badges | yes | Creates a proactive habit loop (m6) where none exists. Gamifies news consumption, increasing retention and DAU without interrupting article reading. |
| 3 | Unlock Commenting | product-change | TAX-10 | m9 | Post a comment without signing in | yes | High-intent reactive moment (m9). Provides a clear, non-intrusive alternative to a hard sign-up wall, improving conversion and engagement for non-logged-in users. |
| 4 | Saved Articles Capacity | product-change | TAX-7 | m6 | +10 saved article slots | yes |  |
| 5 | AI News Summary Boost | product-change | TAX-4 | m3 | AI-generated summary for the article | yes |  |
| 6 | Offline Reading Refill | product-change | TAX-1 | m7 | Download article for offline reading | yes |  |
| 7 | Sponsored Brand Topic | product-change | TAX-11 | m3 | Priority access to curated news topic | yes |  |

## Set checks (validateSet)

All checks pass.

## Proposals

### P1 v1: Unlock Commenting

> Allow non-signed-in users to post a single comment after playing a game.

- **Case:** product-change · **Archetype:** TAX-10 · **Beyond baseline:** yes
- **Anchor:** moments m9; economy POST_WALL
- **New mechanic:** One-Time Comment Post: Allows a guest user to bypass the mandatory sign-up wall to post exactly one comment by watching a rewarded ad. Why: Comment sections thrive on volume; many users want to participate but churn at the sign-up gate.
- **Surface:** Add Comment Page (s05) · **Trigger:** User taps 'Sign Up to Post' or initiates a comment on s05
- **Eligibility:** Non-signed-in users on the Add Comment Page.
- **Offer:** "Post This Comment" / "Play a 15-second game with AOL News to post your comment without signing up." / [Play Now] [No thanks]
- **Simula:** SIM-RWD, entry button, Game Partner: AOL News, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** One comment post · **Caps:** 3/day, cooldown 30 min
- **Cannibalization guard:** The offer is gated specifically to users who hit the sign-up wall. The main 'Sign Up to Post' call-to-action remains primary, and the reward is strictly limited to one post, incentivizing sign-up for long-term participation.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0000 (none x 1).
- Scenario, not a forecast: 10% of DAU engage, 1 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.1, ARPDAU $0.0012.
- Flags: none.
- **KPIs:** Comments per DAU. Guardrails: Paid account conversion rate; D1 retention. Holdout: 10% user holdout for 4 weeks
- **Precedents:** TAX-10, EX-UTIL, POL-9 · **Risks:** Users may find the ad wall frustrating compared to a seamless sign-up. One-off comments may be lower quality than member comments.
- **Evidence:** s05/Sign Up to Post "Sign Up to Post" ✓

**Patch**

- new modal `ns1`: Rewarded interstitial invitation for playing a mini-game to unlock posting.
- new element `ne1` in Add Comment Page (s05) before Sign Up to Post: Add a text button: 'Watch a quick game to post instead'
- edge s05/ne1 → rwd (POST_LIMIT +1 on REWARD_VERIFIED) when POST_LIMIT < 1

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | Add Comment Page (s05) | none |  | Sign Up to Post: User must sign up to join the conversation. | Currently, commenting is blocked by a mandatory sign-up wall. |
| 2 | change | Add Comment Page (s05) | none |  | ne1: New: Option to unlock posting via an ad. | We add an alternative path: watch a game to post. |
| 3 | offer | Add Comment Page (s05) | invite |  | ne1: Offer: Post this comment for 15s of play. | The user opts in to the game. |
| 4 | ad | ns1 | game |  | ns1: Game Partner: AOL News. | User plays the 15-second mini-game. |
| 5 | value | Add Comment Page (s05) | verified |  | Sign Up to Post: Post button is now enabled. | User posts their comment successfully. |

### P2 v1: Daily News Reader Streak

> Turn daily news reading into rewards with a streak tracker and bonus Reader Points.

- **Case:** product-change · **Archetype:** TAX-9 · **Beyond baseline:** yes
- **Anchor:** moments m6; economy ReaderPoints (new)
- **New mechanic:** Reader Loyalty Program: Daily reading streak tracking and rewarded point collection for user engagement. Why: News apps lack inherent scarcity; this creates a habit loop for daily retention and unlocks rewarded ad inventory that complements organic reading.
- **Surface:** News Feed Home (s13) · **Trigger:** Proactive entry via the daily streak badge on the News Feed Home screen.
- **Eligibility:** Logged-in non-premium users.
- **Offer:** "Daily Reader Bonus" / "Play a 15-second game with our news mascot to get 50 Reader Points toward your daily streak." / [Play Now] [No thanks]
- **Simula:** SIM-RWD, entry button, Game Partner: AOL News Mascot, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** 50 Reader Points · **Caps:** 3/day, cooldown 60 min
- **Cannibalization guard:** Points are cosmetic/loyalty based and carry no cash value, ensuring no IAP cannibalization. The streak reinforces habit and increases feed value.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0000 (none x 0).
- Scenario, not a forecast: 20% of DAU engage, 1.5 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.3, ARPDAU $0.0036.
- Flags: none.
- **KPIs:** Daily Active Users (DAU) retention. Guardrails: Average daily sessions; Feed scroll depth. Holdout: 10% user-level random holdout for 4 weeks
- **Precedents:** TAX-9, EX-DUO, AI-3 · **Risks:** Users may ignore the task if Reader Points aren't perceived as valuable. Potential for low engagement if the mini-game is not fun.
- **Evidence:** s13/e14 "Home" ✓; s13/e11 "Access your saved articles" ✓

**Patch**

- new sheet `ns1`: Daily Reader Rewards hub containing a progress tracker and the rewarded entry button.
- new element `ne1` in News Feed Home (s13) after e14: Reader Rewards button for daily streak tracking.
- new element `ne2` in ns1 overlay (no anchor): Daily streak progress banner displaying current streak.
- new element `ne3` in ns1 after ne2: Watch ad button for 50 Reader Points.
- edge s13/ne1 → ns1
- edge ns1/ne3 → rwd (ReaderPoints +50 on REWARD_VERIFIED)

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | News Feed Home (s13) | none | ReaderPoints=0 | e14: User browses news as usual with no loyalty program. | AOL News Feed today shows standard news content. |
| 2 | change | News Feed Home (s13) | none | ReaderPoints=0 | ne1: New Reader Rewards entry button added to the top navigation. | The Daily Reader Streak mechanic introduces the Reader Rewards button. |
| 3 | offer | ns1 | invite | ReaderPoints=0 | ne3: Button to trigger the rewarded task flow. | User opens the Rewards Hub and is invited to play to earn points. |
| 4 | ad | News Feed Home (s13) | game | ReaderPoints=0 | e46: 15-second mini-game with the news mascot. | The user watches and plays a brief rewarded mini-game. |
| 5 | value | ns1 | verified | ReaderPoints=50 | ne2: Points updated, streak progressed. | ReaderPoints are granted upon successful verification. |

### P3 v1: Premium Insights Unlock

> Unlock exclusive in-depth news analysis by playing a quick game.

- **Case:** product-change · **Archetype:** TAX-3 · **Beyond baseline:** yes
- **Anchor:** moments m1, m3; economy PremiumAccess
- **New mechanic:** Premium Insights: Curated in-depth investigative journalism articles which are locked behind an ad-watch gate. Why: To provide high-quality gated content as a new ad-supported product tier, creating a value-exchange for non-paying users.
- **Surface:** Home News Feed (s01) · **Trigger:** User taps an article in the feed marked 'Premium Insight'.
- **Eligibility:** Non-subscribing users.
- **Offer:** "Unlock Premium Insight" / "Play a 15-second game to access this in-depth investigative article." / [Play Now] [No thanks]
- **Simula:** SIM-RWD, entry button, Game Partner: AOL News, min play 15 s, grant on REWARD_VERIFIED
- **Reward:** 1 Premium Deep-Dive Article · **Caps:** 3/day, cooldown 30 min
- **Cannibalization guard:** Content access is rate-limited to 3 articles per day. No paid subscription exists currently to cannibalize; this builds the habit for future monetization.
- Exchange rate: n/a (the reward is not a priced resource).
- One completed US view earns $0.0090–$0.0150; the reward is worth n/a at list (n/ax a view); max per day n/a vs cheapest pack n/a.
- Cost to serve per view: $0.0000 (none x 1).
- Scenario, not a forecast: 30% of DAU engage, 1.5 views each, US mid eCPM after a 25% non-game haircut. Impressions/DAU 0.45, ARPDAU $0.0054.
- Flags: none.
- **KPIs:** Rewarded engagement rate. Guardrails: Article CTR; Retention; Session depth. Holdout: 10% user-level holdout for 4 weeks.
- **Precedents:** TAX-3, EX-SERIAL · **Risks:** Low ad fill rate in certain geographies. Potential user friction if premium labels are not clearly distinguished from free articles.
- **Evidence:** s01/e22 "Top Stories" ✓; s02/e38 "Tiffani Thiessen says a former resident still live" ✓

**Patch**

- new modal `ns1`: Modal to unlock premium content for the user.
- new element `ne_premium_tag` in Home News Feed (s01) after e38: Add 'Premium' label to selected articles.
- new element `ne_play` in ns1 overlay (no anchor): Play button to initiate rewarded ad.
- edge s01/ne_premium_tag → ns1
- edge ns1/ne_play → rwd (PremiumAccess +1 on REWARD_VERIFIED) when PremiumAccess < 3

**Storyboard**

| # | phase | screen | overlay | counters | callouts | caption |
|---|---|---|---|---|---|---|
| 1 | today | Home News Feed (s01) | none |  | e38: User browses normal articles in the Home News Feed. | The Home News Feed displays standard news content. |
| 2 | change | Home News Feed (s01) | none |  | ne_premium_tag: A new 'Premium' tag identifies exclusive in-depth insights. | Curated premium articles are introduced to the feed. |
| 3 | offer | ns1 | invite |  | ne_play: Play a quick game to unlock this premium content. | An overlay invites the user to play for access. |
| 4 | ad | ns1 | game |  | ne_play: The user plays the branded mini-game with AOL News. | A 15-second mini-game engagement. |
| 5 | value | Article Details (s03) | verified | PremiumAccess=1 | e12: Article unlocked successfully. | Content is now unlocked and readable. |

