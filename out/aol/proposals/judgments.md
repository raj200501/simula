# Judgments: AOL

Verdicts are computed in code: SHIP at weighted ≥ 3.8 with every criterion ≥ 3 and every gate passing; REVISE between 3 and 3.8, on any criterion ≤ 2, or on a fixable gate; REJECT below 3, on a policy gate, or still REVISE after round 2 (or when a revision stalls: < +0.2 and no gate fixed). Only SHIP goes to the slides.

Weights: value-moment-fit 20, product-integrity 15, cannibalization-safety 15, unit-economics 10, reach 10, feasibility 10, specificity 10, frequency-fatigue 5, measurability 5.

## Summary

| proposal | title | final | weighted | versions | summary |
|---|---|---|---|---|---|
| P1 | Guest Comment Pass | **REJECT** | 4.65 | v1 → v2 | REJECT after 1 revision: revision stalled (weighted -0.15, below +0.2) with the same gate failures. Top concern: grounding (code): evidence "m9" is not an observation or screen in the model |
| P2 | News Streak Multiplier | **SHIP** | 4.6 | v1 | SHIP at 4.6 (v1). |
| P3 | Bonus Save Slot | **REJECT** | 3.1 | v1 → v2 | REJECT after 1 revision: revision stalled (weighted -0.5, below +0.2) with the same gate failures. Top concern: grounding (code): economy item "ARTICLE_SAVE" does not exist |

## P1: Guest Comment Pass — REJECT

> Allow users to post a single comment as a guest after viewing a rewarded ad, providing a taste of social engagement without sign-up.

- product-change · TAX-3 · surface Conversation Screen (s04) · reward 1 guest comment post · caps 2/day

#### Round 0 (v1): **REVISE** · weighted 4.8 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | storyboard today: callout node "P" is not on s05 and not declared; storyboard change: callout node "P" is not on s05 and not declared; storyboard ad: callout node "SIM-RWD" is not on s05 and not declared; evidence "m9" is not an observation or screen in the model |
| label | code | fixable | pass | declares new mechanic "Guest Comment Pass" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The proposal includes explicit eligibility checks for sensitive content contexts. |
| no-incentivized-action | llm | policy | pass | The reward is an in-app feature (posting a comment), not cash, gift cards, or other incentivized clicks/installs. |
| no-loss-framing | llm | policy | pass | No loss framing is used; the approach is a gain-framed opportunity to engage as a guest. |
| explicit-opt-in | llm | fixable | pass | The user must tap the 'Post as Guest' button, which is clearly labeled, to trigger the rewarded ad offer. |
| disclosed | llm | fixable | pass | The offer clearly states: 'Play a quick game with AOL to post this comment instantly'. |
| free-decline | llm | fixable | pass | A 'No Thanks' button is clearly provided. |
| no-stream-interrupt | llm | fixable | pass | The offer appears at the comment posting wall, not during article reading or AI generation. |
| not-for-subscribers | llm | fixable | pass | Eligibility is restricted to non-logged-in users. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | The offer appears at the exact moment a user hits the sign-up wall, offering a solution to their immediate goal. |
| product-integrity | 15 | 5 | The guest comment pass feels native to the article discussion flow, preserving the draft and user input. |
| cannibalization-safety | 15 | 5 | Gated to non-logged-in users only; no substitution for paid tiers, as AOL has no commenting subscription. |
| unit-economics | 10 | 5 | COGS ($0.0018) is significantly below the US net revenue per view ($0.0090–$0.0150). |
| reach | 10 | 5 | Commenting is part of the core article loop, though hit rates depend on users who choose to comment. |
| feasibility | 10 | 4 | Integration is straightforward, though it requires a backend mechanism for handling temporary guest comment posting. |
| specificity | 10 | 4 | Uses the AOL app context, though it could be more descriptive regarding the specific AOL-branded Game Partner characters. |
| frequency-fatigue | 5 | 5 | Explicitly capped at 2 per day. |
| measurability | 5 | 5 | Includes primary KPIs, guardrails, and a user-level holdout for validation. |

- **Verdict reasons (code):** fixable gate failed: grounding (code)
- **Required changes:**
  - Correct the references from s05 to s04 (Conversation Screen) to match the provided product model.
  - Update storyboard to reflect actual elements existing on s04, ensuring the 'Post as Guest' button is defined as a new element addition to the existing conversation UI.
- **Top concern:** The proposal incorrectly references non-existent screen 's05', which should be updated to 's04' to accurately align with the provided product model.

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `surface`: "s05" → "s04"
- `trigger`: "User finishes typing a comment on the Add Comment Page (s05) and sees the 'Sign Up to ..." → "User taps the 'Reply' button (e47) on the Conversation Screen (s04) while not logged i..."
- `patch.newScreens[0].basedOn`: "s05" → "s04"
- `patch.newScreens[0].change`: "A modal overlay for the rewarded offer invitation, appearing above the Add Comment Page." → "A modal overlay for the rewarded offer invitation, appearing above the Conversation Sc..."
- `patch.newElements[0].in`: "s05" → "s04"
- `patch.newElements[0].near`: "e15" → "e47"
- `patch.newElements[0].change`: "A new button labeled 'Post as Guest' placed slightly above the existing 'Sign Up to Po..." → "A new 'Post as Guest' button added next to the 'Reply' (e47) action."
- `patch.newEdges[0].from`: "s05" → "s04"
- `storyboard[0].screen`: "s05" → "s04"
- `storyboard[0].callouts[0].node`: "P" → "e47"
- `storyboard[0].callouts[0].text`: "User drafts a comment, ready to post." → "User taps Reply to post a comment."
- `storyboard[0].callouts[1].node`: "e15" → "e47"
- `storyboard[0].callouts[1].text`: "The 'Sign Up to Post' button is the only path." → "Requires a sign-in to post."
- `storyboard[1].screen`: "s05" → "s04"
- `storyboard[1].callouts[0].node`: "P" → "ne1"
- `storyboard[1].callouts[0].text`: "Comment draft is preserved." → "New 'Post as Guest' button added here."
- `storyboard[1].callouts[1].node`: "ne1" → "e47"
- `storyboard[1].callouts[1].text`: "A new 'Post as Guest' button appears." → "The Reply button remains."
- `storyboard[1].callouts[2].node`: "e15" → (none)
- `storyboard[1].callouts[2].text`: "The 'Sign Up to Post' option remains." → (none)
- `storyboard[2].screen`: "s05" → "s04"
- `storyboard[2].callouts[0].text`: "The rewarded ad offer appears after tapping 'Post as Guest'." → "Rewarded offer appears after tapping 'Post as Guest'."
- `storyboard[2].callouts[1].node`: "e15" → (none)
- `storyboard[2].callouts[1].text`: "Paid alternative is subtly visible." → (none)
- `storyboard[3].screen`: "s05" → "s04"
- `storyboard[3].callouts[0].node`: "SIM-RWD" → "ne1"
- `storyboard[3].callouts[0].text`: "User plays a short mini-game with AOL, the Game Partner." → "User completes the mini-game."
- `storyboard[3].caption`: "The user opts in and completes a short rewarded mini-game." → "The user opts in and completes a short rewarded mini-game with AOL as the Game Partner."
- `storyboard[4].callouts[0].node`: "e18" → "e47"
- `storyboard[4].callouts[0].text`: "The user's comment is successfully posted." → "The comment is now posted."
- ... and 1 more changes

#### Round 1 (v2): **REVISE** · weighted 4.65 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | evidence "m9" is not an observation or screen in the model |
| label | code | fixable | pass | declares new mechanic "Guest Comment Pass" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The proposal focuses on a 'Guest Comment Pass' for a news application, which is an age-appropriate surface for general news readers. |
| no-incentivized-action | llm | policy | pass | The reward is a one-time guest comment posting privilege, which is an in-app action, not a click, install, or cash reward. |
| no-loss-framing | llm | policy | pass | The proposal uses gain framing (play a game to post) rather than threatening content deletion or loss of access. |
| explicit-opt-in | llm | fixable | pass | Users must explicitly tap the 'Post as Guest' button and then 'Play Game & Post' to initiate the ad. |
| disclosed | llm | fixable | pass | The offer clearly states: 'Play a quick game with AOL to post this comment instantly'. |
| free-decline | llm | fixable | pass | The proposal includes an explicit 'No Thanks' button that returns the user to the conversation screen. |
| no-stream-interrupt | llm | fixable | pass | The offer is presented as a gated action at the comment reply boundary, not mid-stream. |
| not-for-subscribers | llm | fixable | pass | Targeted specifically at non-logged-in users; it is not offered to subscribers. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 5 | The proposal correctly identifies the friction point (the sign-up wall when attempting to comment) and provides an immediate, relevant solution. |
| product-integrity | 15 | 4 | The pass allows engagement without sign-up. The proposal acknowledges risks (spam) which implies the need for moderation, essential for maintaining integrity. |
| cannibalization-safety | 15 | 5 | The proposal targets non-logged-in users for a guest pass, which is additive and does not cannibalize a paid subscription (none exists). |
| unit-economics | 10 | 5 | Cost to serve is $0.0018 per view, which is ~12-20% of the US revenue per view ($0.009-$0.015), well within the 30% margin target. |
| reach | 10 | 4 | Commenting on news articles is a core loop action. The sign-up wall is a common exit point; offering a path forward here captures high-intent users. |
| feasibility | 10 | 4 | Maps to SIM-RWD. Requires backend development for guest posting and moderation, which is a moderate lift. |
| specificity | 10 | 5 | References screen 's04' (Conversation Screen) and the 'Reply' button 'e47', aligning directly with the AOL digest. |
| frequency-fatigue | 5 | 5 | Includes an explicit cap of 2 per day and a 180-minute cooldown. |
| measurability | 5 | 5 | Defines primary metrics and guardrails, and specifies a user-level randomized holdout. |

- **Verdict reasons (code):** fixable gate failed: grounding (code)
- **Required changes:**
  - Include a specific commitment to implement robust automated spam/moderation filtering for guest posts to protect community quality, as this is a major operational risk.
  - Clarify that 'Post as Guest' is an optional path to avoid confusing users who might prefer to sign in.
- **Top concern:** The potential for low-quality guest comments or spam is the primary risk; without automated moderation and clear community guidelines, the feature could degrade the comment section (the core value of the social flow).


## P2: News Streak Multiplier — SHIP

> Drive daily reading habit through a gamified streak mechanic that can be doubled by watching rewarded ads.

- product-change · TAX-5 · surface News Feed Home (s13) · reward Daily Streak points doubled · caps 1/day

#### Round 0 (v1): **SHIP** · weighted 4.6 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | pass | every referenced id exists; new ids are declared in the patch |
| label | code | fixable | pass | declares new mechanic "Daily Reading Streak" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | AOL is a general news reader app; the daily reading streak mechanic is SFW and age-appropriate. |
| no-incentivized-action | llm | policy | pass | The reward is for a daily reading streak (engagement), not for clicks, installs, or ratings. Points are in-app and non-cash. |
| no-loss-framing | llm | policy | pass | The proposal uses gain framing ('Double Your Streak Points') and offers a 'No thanks' decline option. |
| explicit-opt-in | llm | fixable | pass | The offer screen presents a 'Play Now' CTA for the rewarded ad, acting as the explicit opt-in. |
| disclosed | llm | fixable | pass | The offer body explicitly states: 'Play a 15-second game to double your Daily Streak points'. |
| free-decline | llm | fixable | pass | The offer screen includes a 'No thanks' button which returns the user to the News Feed. |
| no-stream-interrupt | llm | fixable | pass | The trigger is the user tapping 'Save this article' (e38), which is an action boundary, not mid-reading. |
| not-for-subscribers | llm | fixable | pass | The proposal restricts eligibility to non-paying users. |
| portfolio-distinct | code | fixable | pass | the first SHIP of the portfolio |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | Saving an article is a high-intent, active engagement gesture; rewarding this action with streak progress is a strong, positive feedback loop for a news-reading habit. |
| product-integrity | 15 | 5 | Streaks and reading goals are native to news/content apps; the ad is opt-in and does not degrade the article content. |
| cannibalization-safety | 15 | 5 | The reward is meta-game progress (streak points), which has no overlap with subscription or ad-free entitlements. |
| unit-economics | 10 | 5 | The reward has zero COGS and provides a net profit of ~$0.009–$0.015 per view, well within profitable limits. |
| reach | 10 | 3 | The trigger relies on the user performing a 'Save article' action, which is a secondary action rather than the primary core loop (reading), limiting reach. |
| feasibility | 10 | 5 | Adding a streak meter and button to the news feed is a standard UI implementation; utilizes SIM-RWD units effectively. |
| specificity | 10 | 5 | Properly references AOL elements like 'Save this article' (e38) and 'News Feed Home' (s13). |
| frequency-fatigue | 5 | 5 | Capped at 1 per day with a 60-minute cooldown. |
| measurability | 5 | 5 | Includes DAU as a primary metric, clear guardrails, and a planned holdout. |

- **Verdict reasons (code):** weighted 4.6 >= 3.8, every criterion >= 3, all gates pass
- **Required changes:**
  - Fix logic mismatch in reward definition: The proposal claims to 'Double' points, but the reward amount is '1'. If points are 3, it should grant +3 points.
  - Clarify point utility: Define what 'Streak points' unlock (badges, profile themes) to ensure the reward is perceived as valuable.
- **Top concern:** The logic mismatch between the 'Double' claim and the '1' reward amount needs correction; if the reward doesn't mathematically double the user's current points, the claim will be seen as deceptive.


## P3: Bonus Save Slot — REJECT

> Watch a quick game to expand your article library.

- product-change · TAX-7 · surface Account Menu Sidebar (s11) · reward 5 extra save slots · caps 3/day

#### Round 0 (v1): **REVISE** · weighted 3.6 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | economy item "ARTICLE_SAVE" does not exist |
| label | code | fixable | pass | declares new mechanic "Library Capacity Limit" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | Sidebar menu is a navigation surface and contains no mature or sensitive content. |
| no-incentivized-action | llm | policy | pass | Reward is for game play to receive in-app save slots, not for clicks, installs, or ratings. |
| no-loss-framing | llm | policy | pass | The proposal frames this as an 'expansion' ('Expand Library') rather than threatening deletion or removal of existing saved content. |
| explicit-opt-in | llm | fixable | pass | Proposal explicitly includes 'Play Now' and 'No thanks' buttons. |
| disclosed | llm | fixable | pass | The offer states 'Play a quick game to add 5 more save slots.' |
| free-decline | llm | fixable | pass | Proposal explicitly allows 'No thanks' which closes the menu/offer without penalty. |
| no-stream-interrupt | llm | fixable | pass | Trigger is the sidebar menu, not during content viewing or interaction. |
| not-for-subscribers | llm | fixable | pass | Eligibility is strictly for 'Logged-in free tier users.' |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 4 | Users who are active enough to save more than 50 articles (power users) are the ones likely to hit the limit and desire more, creating a high-intent moment. |
| product-integrity | 15 | 2 | Imposing a new capacity limit on a feature previously available without restriction degrades the free experience for established users, which violates the spirit of keeping the core free experience intact [ANTI-10]. |
| cannibalization-safety | 15 | 4 | Adding save slots is a secondary utility, not a core subscription benefit like ad-free news, making cannibalization risk low. |
| unit-economics | 10 | 5 | With 0 COGS, even a single view is profitable. The reward (5 slots) is nominal. |
| reach | 10 | 2 | Requires users to be logged in and to have saved more than 50 articles, which is a small subset of the total user base. |
| feasibility | 10 | 3 | Maps to SIM-RWD, but requires building a new quota system for the 'Saved articles' library. |
| specificity | 10 | 4 | Specifically references 'Account Menu Sidebar' (s11) and the 'Saved articles' feature. |
| frequency-fatigue | 5 | 5 | 3 per day cap is reasonable. |
| measurability | 5 | 5 | Primary metric 'Total saved articles' and D7 retention are appropriate; holdout is included. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); product-integrity scored 2 (< 3); reach scored 2 (< 3); weighted 3.6 < 3.8
- **Required changes:**
  - Clearly communicate on the limit-hit screen that existing saved articles are protected, and explicitly provide a path to view premium subscription plans to differentiate tiers.
  - Add a monitor for 'Saved articles' usage to ensure that the 50-slot limit is actually reached by enough users to make the inventory viable.
- **Top concern:** Introducing a new hard cap on a previously unlimited feature (saving articles) poses a significant product-integrity risk and may frustrate power users who currently rely on the feature, potentially leading to churn.

#### Changes v1 → v2 (revise() saw the required changes, never the scores)

- `anchor.newMechanic.description`: "Limit free account article saving to 50 slots." → "Limit free account article saving to 50 slots. Existing saved articles remain fully ac..."
- `anchor.newMechanic.whyNeeded`: "Creates a scarce resource anchor for rewarded ads." → "Creates a scarce resource anchor for rewarded ads, distinguishing free from premium ti..."
- `trigger`: "User opens the sidebar menu." → "User opens the sidebar menu, where capacity is displayed."
- `offer.body`: "Play a quick game to add 5 more save slots." → "Library full (50/50). Play a game for +5 slots, or see premium plans."
- `cannibalizationGuard`: "The reward is additive, not subtractive. Saved article limit is a non-core engagement ..." → "The reward is a partial, additive expansion for non-payers. Subscription plans remain ..."
- `kpis.guardrails[0]`: "D7 Retention" → "CapacityHitRate"
- `kpis.guardrails[1]`: "Daily ad revenue" → "D7 Retention"
- `kpis.holdout`: "10% user holdout for 4 weeks to measure total engagement." → "10% user holdout for 4 weeks to measure capacity usage and revenue impact."
- `risks[0]`: "Users may be frustrated by the introduction of a new limit on a previously unlimited f..." → "Frustration risk from capping previously unlimited storage; mitigated by clearly stati..."
- `patch.newElements[0].change`: "Add storage status (45/50 slots) and 'Expand Library' CTA button." → "Add storage status indicator (e.g., 45/50 slots) with 'Upgrade' link and 'Play for Slo..."
- `storyboard[1].callouts[0].text`: "New capacity tracker: 45/50 saved articles." → "New capacity tracker: 50/50 used. Upgrade or Play to unlock."
- `storyboard[1].caption`: "Introduce a 50-article save limit to the account menu." → "Introduce a 50-article save limit, protecting existing content."
- `storyboard[2].caption`: "When user nears the limit, the expansion offer appears." → "When user hits the 50-slot limit, the expansion offer appears."
- `storyboard[4].caption`: "Library capacity is updated immediately upon verification." → "Library capacity is updated immediately upon successful ad completion."
- `kpis.guardrails[2]`: (none) → "SubscriptionConversionRate"
- `precedents[3]`: (none) → "AI-X"
- `risks[1]`: (none) → "Low utilization if users do not save many articles; mitigated by capacity usage monito..."

#### Round 1 (v2): **REVISE** · weighted 3.1 · judged by llm

| gate | by | severity | result | evidence |
|---|---|---|---|---|
| schema | code | policy | pass | parses as a Proposal |
| grounding | code | fixable | **FAIL** | economy item "ARTICLE_SAVE" does not exist |
| label | code | fixable | pass | declares new mechanic "Library Capacity Limit" |
| already-exists | code | fixable | pass | no ad of this format on this surface today |
| policy-lint | code | policy | pass | no cash-like reward, incentivized click/install or 'support us' copy |
| economics | code | fixable | pass | reward within ECON.maxRewardToView of a view, below the cheapest pack per day, COGS below net revenue per view |
| structure | code | fixable | pass | REWARD_VERIFIED, decline present, caps >= 1, 5 storyboard phases, allowed surface |
| reward-coherence | code | fixable | pass | consumables granted as amounts; entitlements as a time box or a number of uses |
| not-for-account-wall | code | fixable | pass | no ad in place of creating an account |
| sfw | llm | policy | pass | The proposal targets the AOL account sidebar (s11) which contains general news navigation and account management, entirely SFW. |
| no-incentivized-action | llm | policy | pass | Rewards playing a 15s mini-game for storage slots; no rewards for clicks, installs, or cash-like items. |
| no-loss-framing | llm | policy | pass | Existing saved articles remain fully accessible; new saves are blocked at 50, avoiding data loss threats or hostage framing. |
| explicit-opt-in | llm | fixable | pass | User taps explicit CTA 'Play Now' in the offer modal. |
| disclosed | llm | fixable | pass | States exact reward (+5 slots) and required action (15s game) before opt-in. |
| free-decline | llm | fixable | pass | Includes an equally legible 'No thanks' decline button which dismisses the offer without penalty. |
| no-stream-interrupt | llm | fixable | pass | AOL is a news reading app; offers appear in the sidebar (s11), never interrupting AI streams. |
| not-for-subscribers | llm | fixable | pass | Targeted strictly to logged-in free tier users. |

| criterion | weight | score | evidence |
|---|---|---|---|
| value-moment-fit | 20 | 2 | AOL is a general news reader where article saving is normally unlimited; article saving limits and slot refills are weakly connected to urgent user intent. |
| product-integrity | 15 | 2 | The proposal requires a product change that removes free value (removesFreeValue: true), capping previously unlimited free article saves at 50 slots. |
| cannibalization-safety | 15 | 4 | Partial expansion (+5 slots per ad, capped at 3/day) for non-payers while subscription keeps unlimited storage; holdout planned. |
| unit-economics | 10 | 5 | COGS is zero (storage capacity limit), well below net revenue per view ($0.009–$0.015). |
| reach | 10 | 2 | Saving articles is an occasional or rare action for most general news readers, resulting in low trigger frequency. |
| feasibility | 10 | 4 | Maps to SIM-RWD unit, button entry, and sidebar screen s11, though requires adding storage quota tracking. |
| specificity | 10 | 2 | Fails grounding code gate because economy items 'ARTICLE_SAVE' and 'SAVE_CAPACITY' do not exist in the AOL digest. |
| frequency-fatigue | 5 | 5 | Capped at 3 per day with a 60-minute cooldown and no re-offer after decline. |
| measurability | 5 | 5 | Defines primary metric (Total saved articles), guardrails, and a 10% user holdout for 4 weeks. |

- **Verdict reasons (code):** fixable gate failed: grounding (code); value-moment-fit scored 2 (< 3); product-integrity scored 2 (< 3); reach scored 2 (< 3); specificity scored 2 (< 3); weighted 3.1 < 3.8
- **Required changes:**
  - Remove the artificial article save limit, as capping previously unlimited free storage in a news app destroys free value and harms product trust.
  - Re-anchor the rewarded ad exchange to an actual scarcity or feature in AOL (such as offline news digests, audio article listening minutes, or ad-free reading sessions) rather than inventing a storage capacity limit.
  - Fix economy grounding by referencing valid economy items or aligning with the observed product model.
- **Top concern:** Artificial capping of free article storage in a news app removes existing free value and creates negative user friction for a low-frequency feature.

