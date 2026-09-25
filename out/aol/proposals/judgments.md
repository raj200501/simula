# Judgments: AOL

Verdicts are computed in code: SHIP at weighted ≥ 3.8 with every criterion ≥ 3 and every gate passing; REVISE between 3 and 3.8, on any criterion ≤ 2, or on a fixable gate; REJECT below 3, on a policy gate, or still REVISE after round 2 (or when a revision stalls: < +0.2 and no gate fixed). Only SHIP goes to the slides.

Weights: value-moment-fit 20, product-integrity 15, cannibalization-safety 15, unit-economics 10, reach 10, feasibility 10, specificity 10, frequency-fatigue 5, measurability 5.

## Summary

| proposal | title | final | weighted | versions | summary |
|---|---|---|---|---|---|
| P1 | Unlock Commenting with Game Play | **REJECT** | 4.3 | v1 → v2 | REJECT after 1 revision: revision stalled (weighted -0.2, below +0.2) with the same gate failures. Top concern: Grounding error in economy items ('POST_WALL' is not defined in the product digest) and storyboard node validation failure. |
| P2 | Daily News Reader Streak | **REJECT** | 3.65 | v1 → v2 | REJECT after 1 revision: revision stalled (weighted -0.05, below +0.2) with the same gate failures. Top concern: Cannibalization of ad-free subscription value: giving 'ad-free browsing' as a rewarded ad output risks making the core paid tier redundant; it must be clearly time-boxed and marketed as a 'sample' or 'boost' rather than a replacement. |
| P3 | Premium Insights Unlock | **REJECT** | 3.95 | v1 → v2 → v3 | REJECT after 2 revisions: fixable gate failed: grounding (code); specificity scored 2 (< 3); still REVISE after round 2. Top concern: AOL is a traditional ad-supported news reader with no existing scarcity model or subscription tier, making the introduction of a paywalled 'PremiumAccess' infrastructure a significant and speculative product change. |

## P1: Unlock Commenting with Game Play — REJECT

> Allow non-signed-in users to post a single comment after playing a game.

- product-change · TAX-10 · surface Add Comment Page (s05) · reward One comment post · caps 3/day

#### Round 0 (v1): **REVISE** · weighted 4.5 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | economy item "POST_WALL" does not exist; new element "ne1" is placed near "Sign Up to Post", which is not an element on s05; storyboard today: callout node "Sign Up to Post" is not on s05 and not declared; storyboard value: callout node "Sign Up to Post" is not on s05 and not declared; evidence element "Sign Up to Post" is not on s05 |
| label | code | fixable | pass | declares new mechanic "One-Time Comment Post" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Proposal targets the comment section of a news app, which is SFW. |
| no-incentivized-action | llm | policy | pass | Reward is for posting a comment; no incentives for clicks, installs, or ratings. |
| no-loss-framing | llm | policy | pass | Proposal uses gain framing: 'Watch a quick game to post instead'. |
| explicit-opt-in | llm | fixable | pass | Uses a clear CTA 'Play Now' after the invitation. |
| disclosed | llm | fixable | pass | States 'Play a 15-second game with AOL News to post your comment'. |
| free-decline | llm | fixable | pass | Includes a 'No thanks' decline option. |
| no-stream-interrupt | llm | fixable | pass | Placed on the comment sign-up wall, not mid-stream. |
| not-for-subscribers | llm | fixable | pass | Eligibility is restricted to non-signed-in users. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | Perfect moment: user wants to post, hits sign-up wall, offer provides the exact desired outcome. |
| product-integrity | 15 | 5 | Native gate-bypass mechanic; does not degrade existing content. |
| cannibalization-safety | 15 | 5 | Gated strictly to non-signed-in guests, protecting the account conversion flow. |
| unit-economics | 10 | 5 | COGS is 0; revenue is positive; reward is 1 post vs potential multiple posts by members. |
| reach | 10 | 3 | Limited to users who reach the comment gate, which is a fraction of DAU. |
| feasibility | 10 | 3 | Standard RWD implementation, but relies on a missing element ID for grounding. |
| specificity | 10 | 4 | Uses app-specific nouns like 'AOL News', but element placement requires correction. |
| frequency-fatigue | 5 | 5 | Strict caps: 3/day, 30m cooldown. |
| measurability | 5 | 5 | Includes primary metric, holdout design, and guardrails. |

- **Verdict reasons (code):** fixable gate failed: grounding (code)
- **Required changes:**
  - Correct the grounding: The proposal cites 'Sign Up to Post' as an element on s05, but it is not listed in the digest. Update the patch to target existing elements or a general container on s05.
  - Add draft persistence: Explicitly confirm that the comment draft is preserved while the user completes the ad.
- **Top concern:** The proposal assumes the existence of a 'Sign Up to Post' button on the Add Comment Page (s05) which is not in the provided screen element list.

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `title`: "Unlock Commenting" → "Unlock Commenting with Game Play"
- `anchor.newMechanic.description`: "Allows a guest user to bypass the mandatory sign-up wall to post exactly one comment b..." → "Allows a guest user to bypass the mandatory sign-up wall to post exactly one comment b..."
- `trigger`: "User taps 'Sign Up to Post' or initiates a comment on s05" → "User initiates a comment on s05 and triggers the sign-up wall. The app saves the curre..."
- `eligibility`: "Non-signed-in users on the Add Comment Page." → "Non-signed-in users on the Add Comment Page (s05) who encounter the sign-up wall."
- `cannibalizationGuard`: "The offer is gated specifically to users who hit the sign-up wall. The main 'Sign Up t..." → "The offer is gated specifically to users who hit the sign-up wall. The primary 'Sign U..."
- `evidence[0].el`: "Sign Up to Post" → (none)
- `evidence[0].quote`: "Sign Up to Post" → "m9 [desire] on s05 (Add Comment Page), reach=core-loop: User attempts to post a commen..."
- `patch.newElements[0].near`: "Sign Up to Post" → (none)
- `patch.newElements[0].place`: "before" → "after"
- `storyboard[0].callouts[0].node`: "Sign Up to Post" → "s05"
- `storyboard[0].callouts[0].text`: "User must sign up to join the conversation." → "User is blocked by sign-up wall when attempting to post."
- `storyboard[2].caption`: "The user opts in to the game." → "The user opts in to the game; comment is saved."
- `storyboard[4].callouts[0].node`: "Sign Up to Post" → "ne1"
- `storyboard[4].callouts[0].text`: "Post button is now enabled." → "Post button enabled; draft restored."

#### Round 1 (v2): **REVISE** · weighted 4.3 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | economy item "POST_WALL" does not exist; storyboard today: callout node "s05" is not on s05 and not declared |
| label | code | fixable | pass | declares new mechanic "One-Time Comment Post" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | AOL is a general news application adhering to brand safety and general audience content standards. |
| no-incentivized-action | llm | policy | pass | The reward is an in-app comment post action with no rewards for clicks, installs, or cash equivalents. |
| no-loss-framing | llm | policy | pass | The proposal uses gain framing ('Post This Comment') without dark patterns, confirmshaming, or loss framing. |
| explicit-opt-in | llm | fixable | pass | The user explicitly opts in by tapping 'Play Now' on the offer card. |
| disclosed | llm | fixable | pass | The required action (15-second game) and reward (one comment post) are clearly stated before the ad starts. |
| free-decline | llm | fixable | pass | An equally legible decline button ('No thanks') is provided, returning the user to the comment page without penalty. |
| no-stream-interrupt | llm | fixable | pass | AOL is a news reader app with no streaming AI generation; the offer triggers at the comment sign-up wall boundary. |
| not-for-subscribers | llm | fixable | pass | The offer is specifically targeted at non-signed-in guest users encountering the sign-up wall, not paying accounts. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | The proposal triggers exactly when the user hits the sign-up wall after typing a comment (m9), offering an immediate bypass to post that specific comment. |
| product-integrity | 15 | 4 | The user's typed comment draft is saved in local state and restored upon verification, keeping the primary sign-up CTA intact without degrading core experience. |
| cannibalization-safety | 15 | 5 | Gated strictly to non-signed-in users hitting the wall (TAX-10 paywall-decline fallback), limited to 1 post per ad / 3 per day, with the primary sign-up CTA remaining the default. |
| unit-economics | 10 | 5 | Code-computed COGS is $0.0000 (none), well below net revenue per view ($0.0090–$0.0150). Sizing is 1 comment post per view. |
| reach | 10 | 3 | Reaches users attempting to comment (core interaction loop, m9), though comment wall hits represent a subset of total news feed readers. |
| feasibility | 10 | 4 | Uses SIM-RWD with a button entry point, REWARD_VERIFIED, and local draft preservation, fitting standard SDK capabilities. |
| specificity | 10 | 3 | References screen s05 (Add Comment Page), moment m9, and AOL News brand, though the economy item 'POST_WALL' is ungrounded. |
| frequency-fatigue | 5 | 4 | Capped at 3 per day with a 30-minute cooldown, preventing ad fatigue and repeat prompting. |
| measurability | 5 | 5 | Defines primary metric 'Comments per DAU', guardrails for account conversion and D1 retention, and a 10% user holdout for 4 weeks. |

- **Verdict reasons (code):** fixable gate failed: grounding (code)
- **Required changes:**
  - Ground the economy item in the digest by replacing the ungrounded 'POST_WALL' identifier with a valid resource.
  - Fix the storyboard callout node reference for screen s05 to ensure it correctly maps to declared elements.
- **Top concern:** Grounding error in economy items ('POST_WALL' is not defined in the product digest) and storyboard node validation failure.


## P2: Daily News Reader Streak — REJECT

> Turn daily news reading into rewards with a streak tracker and Reader Points redeemable for ad-free time and saved articles.

- product-change · TAX-9 · surface News Feed Home (s13) · reward 50 Reader Points · caps 3/day

#### Round 0 (v1): **REVISE** · weighted 3.7 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | economy item "ReaderPoints (new)" does not exist |
| label | code | fixable | pass | declares new mechanic "Reader Loyalty Program" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The AOL app provides general news, entertainment, and local updates. The proposal uses the news feed and an optional rewards hub, which are safe, SFW environments. |
| no-incentivized-action | llm | policy | pass | The reward is 'ReaderPoints' which are in-app loyalty items with no cash value. No rewards for clicks, installs, or ratings are mentioned. |
| no-loss-framing | llm | policy | pass | The proposal uses gain framing ('Daily Reader Bonus', 'progress toward your daily streak') and makes no mention of loss or hostage mechanics. |
| explicit-opt-in | llm | fixable | pass | The proposal requires the user to proactively tap an entry button ('ne1') and then a 'Play Now' button in the hub ('ne3'). |
| disclosed | llm | fixable | pass | The offer body explicitly states: 'Play a 15-second game with our news mascot to get 50 Reader Points toward your daily streak.' |
| free-decline | llm | fixable | pass | The proposal includes a 'No thanks' button, and because it is a proactive hub, dismissing it returns the user to the News Feed ('s13') without penalty. |
| no-stream-interrupt | llm | fixable | pass | The offer is triggered from a proactive 'Reader Rewards' button in the navigation header ('ne1') and a loyalty hub, not during reading or comment flow. |
| not-for-subscribers | llm | fixable | pass | The eligibility is explicitly restricted to 'Logged-in non-premium users'. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 2 | The proposal offers 'ReaderPoints', which are not tied to any existing AOL user need (like saving articles or bypassing a limit). They are a generic loyalty currency. |
| product-integrity | 15 | 5 | The mechanic is a classic loyalty hub. It is non-interruptive and additive, fitting the news feed environment well. |
| cannibalization-safety | 15 | 5 | The points have no cash value and are not a substitute for a subscription or premium content, posing no IAP cannibalization risk. |
| unit-economics | 10 | 5 | There is no COGS for points. The reward is a symbolic currency, and the ad revenue is net positive. |
| reach | 10 | 4 | The entry button is in the main navigation of the News Feed Home ('s13'), which is high-reach for DAU. |
| feasibility | 10 | 2 | Introducing a loyalty points system and a persistent hub ('ns1') requires significant backend architecture changes to track streak state and point balances. |
| specificity | 10 | 2 | The proposal uses generic 'ReaderPoints'. It lacks connection to AOL-specific nouns or features, such as 'Saved Articles' or 'Local Headlines'. |
| frequency-fatigue | 5 | 5 | The proposal correctly specifies a daily cap (3/day) and a cooldown (60 mins), which is appropriate for preventing fatigue. |
| measurability | 5 | 5 | The proposal defines primary (DAU retention) and guardrail (feed scroll depth) metrics, plus a user-level holdout. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); value-moment-fit scored 2 (< 3); feasibility scored 2 (< 3); specificity scored 2 (< 3); weighted 3.7 < 3.8
- **Required changes:**
  - Define the utility of 'ReaderPoints' to make them relevant to AOL. For example, allow points to be redeemed for an 'ad-free browsing hour' or 'increased saved article capacity' instead of just a generic currency.
  - Improve specificity by integrating the loyalty loop with existing AOL nouns. For example, streak progression could offer 'Exclusive local headlines' or badges for specific categories (e.g., 'Sports Fan').
  - Specify the backend technical feasibility for maintaining persistent streak state and point balances across sessions for logged-in users.
- **Top concern:** The lack of specific utility for 'ReaderPoints' makes the reward feel generic and disconnected from user needs in the AOL app, potentially leading to low engagement despite high reach.

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `oneLiner`: "Turn daily news reading into rewards with a streak tracker and bonus Reader Points." → "Turn daily news reading into rewards with a streak tracker and Reader Points redeemabl..."
- `anchor.newMechanic.description`: "Daily reading streak tracking and rewarded point collection for user engagement." → "Daily reading streak tracking and rewarded point collection backed by the signed-in AO..."
- `anchor.newMechanic.whyNeeded`: "News apps lack inherent scarcity; this creates a habit loop for daily retention and un..." → "News apps lack inherent scarcity; this creates a habit loop for daily retention and un..."
- `eligibility`: "Logged-in non-premium users." → "Logged-in AOL account non-premium users."
- `offer.title`: "Daily Reader Bonus" → "Earn Reader Points"
- `offer.body`: "Play a 15-second game with our news mascot to get 50 Reader Points toward your daily s..." → "Play a 15-second game with AOL to earn 50 Reader Points. Redeem points for an ad-free ..."
- `simula.gamePartner`: "AOL News Mascot" → "AOL"
- `cannibalizationGuard`: "Points are cosmetic/loyalty based and carry no cash value, ensuring no IAP cannibaliza..." → "ReaderPoints are earned through attention and redeemed for utility like ad-free time o..."
- `risks[0]`: "Users may ignore the task if Reader Points aren't perceived as valuable." → "Users may ignore tasks if point redemption thresholds are set too high."
- `risks[1]`: "Potential for low engagement if the mini-game is not fun." → "Cloud sync latency for streak persistence across devices."
- `patch.newScreens[0].change`: "Daily Reader Rewards hub containing a progress tracker and the rewarded entry button." → "Daily Reader Rewards hub containing cloud-synced streak tracking, redemption options f..."
- `patch.newElements[1].change`: "Daily streak progress banner displaying current streak." → "Daily streak progress banner displaying cloud-synced streak state."
- `storyboard[1].callouts[0].text`: "New Reader Rewards entry button added to the top navigation." → "New Reader Rewards entry button added to navigation."
- `storyboard[1].caption`: "The Daily Reader Streak mechanic introduces the Reader Rewards button." → "Reader Rewards button added to News Feed Home."
- `storyboard[2].caption`: "User opens the Rewards Hub and is invited to play to earn points." → "User opens Rewards Hub and is invited to play."
- `storyboard[3].callouts[0].text`: "15-second mini-game with the news mascot." → "15-second mini-game with AOL partner."
- `storyboard[3].caption`: "The user watches and plays a brief rewarded mini-game." → "User watches a quick mini-game with AOL."
- `storyboard[4].caption`: "ReaderPoints are granted upon successful verification." → "Points granted upon verified reward completion."
- `anchor.economy[1]`: (none) → "SavedArticles"
- `anchor.economy[2]`: (none) → "AdFreePass (new)"
- `kpis.guardrails[2]`: (none) → "Paid subscription conversion"
- `precedents[3]`: (none) → "TAX-2"
- `precedents[4]`: (none) → "TAX-7"

#### Round 1 (v2): **REVISE** · weighted 3.65 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | economy item "ReaderPoints (new)" does not exist; economy item "SavedArticles" does not exist; economy item "AdFreePass (new)" does not exist |
| label | code | fixable | pass | declares new mechanic "Reader Loyalty Program" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | AOL is a general-purpose news app; the news feed is inherently suitable for a broad audience. |
| no-incentivized-action | llm | policy | pass | The reward is for attention (watching an ad/playing a mini-game), not for clicking ads, installing, or rating. |
| no-loss-framing | llm | policy | pass | The reward is framed as a positive loyalty program; no hostage or 'support us' language is used. |
| explicit-opt-in | llm | fixable | pass | The user must tap the 'Play Now' CTA to begin, which is compliant. |
| disclosed | llm | fixable | pass | The offer card clearly states the reward (50 Reader Points) and the action required (15-second game play). |
| free-decline | llm | fixable | pass | The 'No thanks' button ensures users can decline without any negative consequence. |
| no-stream-interrupt | llm | fixable | pass | The offer is accessed proactively via a badge, never mid-stream. |
| not-for-subscribers | llm | fixable | pass | Eligibility is explicitly limited to logged-in non-premium users. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 3 | This is a proactive loyalty hub (archetype TAX-9). It lacks the high-intent 'moment of need' found in other rewarded archetypes like consumable refills. |
| product-integrity | 15 | 4 | The loyalty program is a standard industry pattern that feels native to news apps; it doesn't interrupt reading or degrade existing content. |
| cannibalization-safety | 15 | 3 | The reward of 'ad-free browsing hours' can cannibalize subscription revenue if ad-free reading is a core paid benefit. It requires strict time-boxing. |
| unit-economics | 10 | 4 | COGS is near zero (0). Revenue is ~$0.012 per view. 50 points for 1 hour of ad-free time is a reasonable value exchange. |
| reach | 10 | 5 | Triggered via News Feed Home (s13), the core loop of the AOL app. |
| feasibility | 10 | 3 | Requires backend implementation for streak tracking, points, and account persistence, which is a moderate effort. |
| specificity | 10 | 4 | References News Feed Home (s13), saved articles feature, and uses AOL branding elements. |
| frequency-fatigue | 5 | 4 | 3 per day limit is appropriate for a news app loyalty program. |
| measurability | 5 | 4 | Proposal includes DAU retention as the primary KPI and a user-level randomized holdout. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); weighted 3.65 < 3.8
- **Required changes:**
  - Strictly time-box the ad-free reward (e.g., 60 minutes) to ensure it does not replace the value of a permanent ad-free subscription tier.
  - Add a 'Learn more' or 'Get Premium for always ad-free' link on the redemption screen to create a clear upsell path alongside the ad-earned time.
  - Define the redemption cost for 'extra saved article capacity' to ensure it does not devalue the app's core utility.
  - Ensure the streak logic handles offline state gracefully before attempting to sync points.
- **Top concern:** Cannibalization of ad-free subscription value: giving 'ad-free browsing' as a rewarded ad output risks making the core paid tier redundant; it must be clearly time-boxed and marketed as a 'sample' or 'boost' rather than a replacement.


## P3: Premium Insights Unlock — REJECT

> Unlock exclusive in-depth news analysis by playing a quick game.

- product-change · TAX-3 · surface Home News Feed (s01) · reward 1 Premium Deep-Dive Article · caps 3/day

#### Round 0 (v1): **REVISE** · weighted 3.3 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | economy item "PremiumAccess" does not exist |
| label | code | fixable | pass | declares new mechanic "Premium Insights" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | **FAIL** | surface s01 is also the first-value screen: eligibility must exclude the first session |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | s01 is Home News Feed displaying standard news and top stories like 'Top Stories' and 'Entertainment'. |
| no-incentivized-action | llm | policy | pass | Reward is '1 Premium Deep-Dive Article' via SIM-RWD; no clicks, installs, or cash-like items are incentivized. |
| no-loss-framing | llm | policy | pass | Offer uses standard copy: 'Play a 15-second game to access this in-depth investigative article.' with 'No thanks' decline. |
| explicit-opt-in | llm | fixable | pass | Requires explicit tap on CTA 'Play Now'. |
| disclosed | llm | fixable | pass | States exact reward ('1 Premium Deep-Dive Article') and required action ('Play a 15-second game'). |
| free-decline | llm | fixable | pass | Provides an equally legible decline option 'No thanks' returning the user to the feed with no penalty. |
| no-stream-interrupt | llm | fixable | pass | Triggered only when the user taps an article in the feed marked 'Premium Insight'. |
| not-for-subscribers | llm | fixable | pass | Eligibility explicitly restricted to 'Non-subscribing users.' |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 3 | Proposal: 'User taps an article in the feed marked 'Premium Insight'.'; unlocks an in-depth article. Fits TAX-3 content unlock, though AOL currently has no scarce items. |
| product-integrity | 15 | 3 | Proposal adds 'Premium' labels to articles on s01 and locks them behind ads. In a free news app with no prior paywalls, gating news content introduces new friction. |
| cannibalization-safety | 15 | 4 | Proposal: 'No paid subscription exists currently to cannibalize; this builds the habit for future monetization.' Rate-limited to 3 per day. |
| unit-economics | 10 | 4 | Cost to serve per view is $0.0000; US view earns $0.0090–$0.0150. COGS is well below net revenue per view. |
| reach | 10 | 3 | Triggered by tapping premium articles in the Home News Feed (s01), reaching users browsing curated news. |
| feasibility | 10 | 3 | Maps to SIM-RWD with button entry, 15s play, and REWARD_VERIFIED, but requires introducing a new product mechanic and elements. |
| specificity | 10 | 2 | References s01 and element e38, but introduces an economy item 'PremiumAccess' that does not exist in the baseline product model. |
| frequency-fatigue | 5 | 4 | Caps set to 3 per day with a 30-minute cooldown. |
| measurability | 5 | 5 | Primary metric 'Rewarded engagement rate', guardrails (Article CTR, Retention, Session depth), and a 10% user-level holdout for 4 weeks. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); fixable gate failed: structure (code); specificity scored 2 (< 3); weighted 3.3 < 3.8
- **Required changes:**
  - Exclude the first session from showing rewarded offers on s01 to comply with first-value flow rules.
  - Clearly define the product change mechanics for introducing gated premium content into a traditionally free news reader without harming user trust.
  - Properly ground and define the new economy item in the product change specification.
- **Top concern:** Gating news articles behind rewarded ads in a free news reader app (AOL regime: no-scarcity) risks frustrating users who expect free, unhindered access to news headlines and articles.

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `anchor.newMechanic.description`: "Curated in-depth investigative journalism articles which are locked behind an ad-watch..." → "Exclusive investigative deep-dive articles added as an additive tier on top of the com..."
- `anchor.newMechanic.whyNeeded`: "To provide high-quality gated content as a new ad-supported product tier, creating a v..." → "To provide high-quality gated content as a new ad-supported product tier, creating a v..."
- `trigger`: "User taps an article in the feed marked 'Premium Insight'." → "Returning user (session 2+) taps an article in the feed marked 'Premium Insight'."
- `eligibility`: "Non-subscribing users." → "Returning non-subscribing users after session 1."
- `cannibalizationGuard`: "Content access is rate-limited to 3 articles per day. No paid subscription exists curr..." → "Content access is rate-limited to 3 articles per day. All existing free news articles ..."
- `storyboard[2].callouts[0].text`: "Play a quick game to unlock this premium content." → "Play a quick game to unlock this content."
- `storyboard[3].caption`: "A 15-second mini-game engagement." → "A 15-second mini-game engagement runs."

#### Round 1 (v2): **REVISE** · weighted 4 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | economy item "PremiumAccess" does not exist |
| label | code | fixable | pass | declares new mechanic "Premium Insights" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Proposal targets investigative deep-dive articles in a news feed; surface is SFW. |
| no-incentivized-action | llm | policy | pass | Reward is access to a specific premium article, not for clicks or installs. |
| no-loss-framing | llm | policy | pass | Proposal introduces an additive tier; no existing free content is removed. |
| explicit-opt-in | llm | fixable | pass | Uses modal ns1 with a distinct 'Play Now' button. |
| disclosed | llm | fixable | pass | Body text clearly states: 'Play a 15-second game to access this in-depth investigative article.' |
| free-decline | llm | fixable | pass | Offer includes a 'No thanks' button as an equally legible decline option. |
| no-stream-interrupt | llm | fixable | pass | Triggered upon navigation (tapping an article), not mid-reading. |
| not-for-subscribers | llm | fixable | pass | Proposal explicitly targets returning non-subscribing users. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | Triggering the reward exactly when the user expresses intent by tapping a 'Premium' article is a high-intent match. |
| product-integrity | 15 | 4 | The model is additive ('zero free content removed'), preserving the integrity of the existing news feed. |
| cannibalization-safety | 15 | 4 | The 'wait or watch' model is rate-limited (3/day) and additive, avoiding subscription cannibalization. |
| unit-economics | 10 | 5 | COGS is near zero (content), and revenue per view is positive; well within limits. |
| reach | 10 | 3 | Reach is limited to the volume of 'Premium' articles created; could be low if content is sparse. |
| feasibility | 10 | 4 | Uses standard SIM-RWD; requires new backend support for gating specific content, which is a moderate engineering task. |
| specificity | 10 | 3 | Uses AOL nouns like 'Home News Feed' and 'AOL News' as game partner, but the core mechanics are standard. |
| frequency-fatigue | 5 | 5 | Includes a 3-per-day cap and 30-minute cooldown, preventing over-exposure. |
| measurability | 5 | 5 | Explicit KPIs, guardrails, and a user-level holdout plan provided. |

- **Verdict reasons (code):** fixable gate failed: grounding (code)
- **Required changes:**
  - Grounding: Update proposal to acknowledge that 'PremiumAccess' is a new, non-existent resource, requiring infrastructure to track and gate specific premium content.
  - Editorial Strategy: Clarify how 'Premium' articles will be curated or distinguished in the feed to ensure they are high-value enough to justify the ad break.
- **Top concern:** The lack of existing infrastructure (economy, content gating) to support the proposed Premium tier requires significant backend work that is not yet detailed.

#### Changes v2 → v3 (revise() saw the required changes, never the scores)

- `anchor.newMechanic.description`: "Exclusive investigative deep-dive articles added as an additive tier on top of the com..." → "An additive tier of exclusive investigative deep-dive articles, marked with a distinct..."
- `anchor.newMechanic.whyNeeded`: "To provide high-quality gated content as a new ad-supported product tier, creating a v..." → "To establish a value-exchange for high-quality journalism, creating a premium ad-suppo..."
- `trigger`: "Returning user (session 2+) taps an article in the feed marked 'Premium Insight'." → "Returning user (session 2+) taps an article in the feed tagged as 'Premium'."
- `cannibalizationGuard`: "Content access is rate-limited to 3 articles per day. All existing free news articles ..." → "Access is rate-limited to 3 premium articles per day via ad-unlocking. All existing fr..."
- `kpis.holdout`: "10% user-level holdout for 4 weeks." → "10% user-level holdout for 4 weeks to monitor IAP conversion impact if subscriptions a..."
- `risks[1]`: "Potential user friction if premium labels are not clearly distinguished from free arti..." → "Editorial dependency on producing high-value investigative content."
- `patch.newScreens[0].change`: "Modal to unlock premium content for the user." → "Modal displaying a preview and the ad-unlock offer for premium investigative content."
- `patch.newElements[0].change`: "Add 'Premium' label to selected articles." → "Add visual 'Premium' badge to tagged high-value investigative articles in the feed."
- `patch.newElements[1].id`: "ne_play" → "ne_play_cta"
- `patch.newElements[1].change`: "Play button to initiate rewarded ad." → "Play button trigger for SIM-RWD ad unit."
- `patch.newEdges[1].el`: "ne_play" → "ne_play_cta"
- `storyboard[1].callouts[0].text`: "A new 'Premium' tag identifies exclusive in-depth insights." → "A new 'Premium' badge distinguishes high-value deep-dives."
- `storyboard[1].caption`: "Curated premium articles are introduced to the feed." → "Curated Premium Insights are tagged in the news feed."
- `storyboard[2].callouts[0].node`: "ne_play" → "ne_play_cta"
- `storyboard[2].callouts[0].text`: "Play a quick game to unlock this content." → "Play to unlock this premium content."
- `storyboard[2].caption`: "An overlay invites the user to play for access." → "An overlay invites the user to play a short game for access."
- `storyboard[3].callouts[0].node`: "ne_play" → "ne_play_cta"
- `storyboard[3].callouts[0].text`: "The user plays the branded mini-game with AOL News." → "User interacts with AOL News game partner."
- `storyboard[3].caption`: "A 15-second mini-game engagement runs." → "A 15-second branded mini-game engagement runs."
- `storyboard[4].callouts[0].text`: "Article unlocked successfully." → "Premium article content is displayed."
- `storyboard[4].caption`: "Content is now unlocked and readable." → "Content is unlocked and readable post-verification."

#### Round 2 (v3): **REJECT** · weighted 3.95 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | economy item "PremiumAccess" does not exist |
| label | code | fixable | pass | declares new mechanic "Premium Insights" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The proposal targets s01 (Home News Feed) displaying general news headlines such as 'Top Stories' and lifestyle news. |
| no-incentivized-action | llm | policy | pass | Reward is '1 Premium Deep-Dive Article' (editorial content), with no rewards for clicks, installs, or cash. |
| no-loss-framing | llm | policy | pass | The offer uses gain framing ('Play a 15-second game to access this in-depth investigative article') with no dark patterns. |
| explicit-opt-in | llm | fixable | pass | The offer overlay features a clear primary CTA button 'Play Now' for SIM-RWD. |
| disclosed | llm | fixable | pass | Body explicitly states: 'Play a 15-second game to access this in-depth investigative article.' |
| free-decline | llm | fixable | pass | Decline option is clearly provided as 'No thanks' on the offer modal. |
| no-stream-interrupt | llm | fixable | pass | AOL is a news reading app with no streaming AI response; offers trigger when tapping a premium article. |
| not-for-subscribers | llm | fixable | pass | Eligibility is restricted to returning non-subscribing users after session 1 ('Returning non-subscribing users after session 1'). |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | Proposal maps to TAX-3 (Content unlock) where tapping a premium article triggers an ad-unlock offer, fitting the moment of content desire. |
| product-integrity | 15 | 4 | Additive premium tier where all existing free articles remain unblocked and ad-accessible as they are today. |
| cannibalization-safety | 15 | 4 | Access is strictly rate-limited to 3 premium articles per day, and content is additive to an app with no pre-existing subscription tier. |
| unit-economics | 10 | 5 | Code-computed cost to serve is $0.0000 (none), well below net revenue per view ($0.0090–$0.0150). |
| reach | 10 | 4 | Triggers on article taps in the core Home News Feed loop (s01). |
| feasibility | 10 | 4 | Maps to SIM-RWD unit with button entry, a 15-second min play time, and standard modal screen patch. |
| specificity | 10 | 2 | AOL is a zero-scarcity news feed app; the proposal introduces an ungrounded 'PremiumAccess' economy item and 'Premium' badges not present in the digest. |
| frequency-fatigue | 5 | 5 | Explicit per-day cap of 3 and 30-minute cooldown. |
| measurability | 5 | 4 | Names rewarded engagement rate as primary metric, guardrails, and a 10% user-level holdout for 4 weeks. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); specificity scored 2 (< 3); still REVISE after round 2
- **Required changes:**
  - Ground the proposal in AOL's existing product model or provide a clearer justification for introducing a brand-new paywalled premium content tier in a zero-scarcity news app.
  - Align the economy resource naming with existing digest items or properly substantiate the new mechanic's infrastructure.
- **Top concern:** AOL is a traditional ad-supported news reader with no existing scarcity model or subscription tier, making the introduction of a paywalled 'PremiumAccess' infrastructure a significant and speculative product change.

