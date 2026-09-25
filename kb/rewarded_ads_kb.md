# Rewarded Ads Knowledge Base: non-game consumer apps and AI chat

Version 1.0. Compiled 2026-09-25 for the Simula take-home. The PROPOSER retrieves from it and the JUDGE scores against it. Every chunk has an ID in brackets (for example `[POL-1]`) so agents can cite it.

**Evidence tags.**
- **[doc]**: official policy, a help center, or the company's own statement or filing.
- **[press]**: reputable trade press or news.
- **[vendor]**: marketing from an ad-tech or monetization vendor. It is directionally useful but biased.
- **[3p]**: third-party blog, review or forum. It is lower confidence and may be stale.
- **[inf]**: derived or inferred by this KB. Treat it as a heuristic, not a fact.

**Leakage rule.** Appendix T holds facts about the four TEST apps (OOC, JanitorAI, Luzia, AOL). The pipeline MUST drop Appendix T chunks whose `test-app` tag matches the target app. Product understanding for a target app has to come from exploring that app.

---

## 0. Retrieval cheat sheet (read first)

- **[CORE-1] The one-sentence model.** A rewarded ad is a *voluntary, disclosed, per-instance trade*: the user gives attention (a 15–30 s video, or 10–30 s of play) and the app gives an in-app item the user already values at that moment. Delivery happens only after completion, and saying no is free. [doc: AdMob policy https://support.google.com/admob/answer/7313578; Unity policy https://unity.com/legal/rewarded-inventory-policy]
- **[CORE-2] The non-game problem.** Games already have scarce, consumable resources (lives, energy, currency). Most consumer apps do not. The proposer's job is usually to *find or create a scarce thing the user values*, not just to find a slot for an ad. That scarce thing can be:
  - a limit (messages, episodes, puzzles),
  - a time-boxed entitlement (a 30-minute ad-free or premium session),
  - speed (skip the queue),
  - capacity (slots, memory),
  - content (the next episode or a premium character),
  - a multiplier (2× check-in).

  Proven non-game analogs are Duolingo energy, Spotify and Pandora sessions, Webtoon and Tapas episode unlocks, and TeraBox trial days. See §3.
- **[CORE-3] Three questions every proposal must answer.**
  1. What does the user want *right now* that they can't have?
  2. Why won't this reduce paid conversion?
  3. What does one completed view earn, and what does the reward cost to serve? The third question matters most for AI, where rewards have real inference cost.
- **[CORE-4] Key formulas.** [inf, standard industry definitions; see §4.6]
  - Revenue per completed view ≈ eCPM ÷ 1000. At a US rewarded eCPM of about $12–20, that is **≈ $0.012–0.020 gross per view**. In LATAM it is ≈ $0.002–0.004.
  - Rewarded ARPDAU = impressions/DAU × eCPM ÷ 1000.
  - impressions/DAU = engaged share of DAU × views per engaged user.
  - Net margin per view = eCPM/1000 × (1 − network or platform share) − reward COGS (inference, storage, content licensing).
- **[CORE-5] Default guardrails when nothing is known.**
  - Offer to non-payers only.
  - No offers in session 1 before the user has experienced core value.
  - Daily cap of 3–5 rewarded grants for a consumable.
  - Reward sized well below the cheapest paid unit and well below a day of the subscription.
  - Time-box any premium unlock (15–60 minutes, or "rest of today").
  - Never interrupt an in-progress AI response.
  - Show offers only on SFW surfaces.
  - Server-verify the reward.
  - Run it as a holdout experiment.

---

## 1. Definition and hard rules

### [POL-1] Definition
- Google AdMob: "Rewarded ads are served after a user explicitly chooses to view a rewarded ad… in exchange for a reward, such as an extra life or in-app currency." [doc: https://support.google.com/admob/answer/7372450]
- AdMob's general Program Policies forbid paying users to view ads *"except for rewarded inventory."* Rewarded is the one sanctioned exception to the "no incentivized ad views" rule. [doc: https://support.google.com/admob/answer/48182]
- The **rewarded interstitial** format has no pre-opt-in button. It still needs an intro screen with a working "No" and enough time to opt out. [doc: AdMob policy; https://support.google.com/admob/answer/9884467]
- **Playable or mini-game rewarded** units: the user plays for a minimum time and then claims the reward. Simula's `RewardedMiniGame` uses `minPlayThreshold`, clamped to 10–30 s with a default of 15 s. [doc: Simula SDK, see [POL-8]]

### [POL-2] Hard rules that hold across networks
All of these are verbatim or close paraphrases of AdMob (https://support.google.com/admob/answer/7313578) and Unity (https://unity.com/legal/rewarded-inventory-policy) policy.

1. **Opt-in per instance.** AdMob says the ad is served "only… after a user affirmatively and unambiguously opts in (such as by tapping a button that represents 'yes' or 'accept')." Unity says it is fulfilled "only after an End-User affirmatively opts in (on a per Rewarded Offer basis)."
2. **Disclose before each instance.** AdMob requires "clear, accurate and conspicuous disclosure of the action(s) required and reward(s) offered prior to each instance." Unity gives the example "View this Ad to receive 10 gems." Icons are allowed only if they are unambiguous.
3. **Disclose bundles.** If several ads are needed, say so: "watch 3 ads now to receive 100 gold coins." [AdMob]
4. **Deliver on completion, and only then.** "Publishers must deliver the promised reward(s)… upon completion of the required action(s)." [AdMob] Unity forbids offering a reward "that cannot actually be redeemed" and requires rewards to be "immediately redeemable from within the Application." Unity can withhold payment for violations.
5. **Declining is free.** "Skipping the Rewarded Ad or selecting the 'no'… must not impede or interfere with the normal usage of the… app." The ad also "must not oblige users to interact with it (it must be possible to skip or dismiss them)." A dismissal forfeits the reward. [AdMob]
6. **No persuasion copy beyond describing the reward.** No "watch this ad to support our business" [AdMob] and no "support us" [Unity]. AdMob Program Policies also ban "click the ads" and "support us" language. [doc: https://support.google.com/admob/answer/48182]
7. **No incentivized clicks, installs or ad interactions.** Unity forbids incentivizing users "to interact with the Ad itself… to generate taps, clicks, downloads, installs." AppLovin forbids "offering rewards to users for clicking ads." [doc: https://support.applovin.com/en/max/max-dashboard/best-practices] Reward the *view* or *play*, never the click. Offerwalls (CPE/CPA offers) are separate network products with their own terms.
8. **No cash-like rewards.**
   - AdMob: "Direct monetary items may not be offered as rewards under any circumstance." That covers cash, crypto and gift cards.
   - Indirect items are allowed only if they are redeemable in-app and non-transferable.
   - Discounts on physical goods are capped at ≤25% of value.
   - AdMob explicitly allows "product or service free trial."
   - Unity bans real-world rewards (cash, prizes, gift cards, vouchers) unless you arrange it with Unity first.
9. **Random or chance rewards need disclosure.**
   - AdMob requires "a chance to receive a random reward" wording, all possible outcomes listed (including "nothing"), and a probability greater than 0.
   - Unity requires the probabilities to be conspicuously disclosed before opt-in.
10. **The publisher owns fulfilment.** Don't imply Google endorses the reward. [AdMob]

### [POL-3] Google-specific implementation details
- **Server-side verification (SSV).**
  - Google sends a signed callback with `reward_amount`, `reward_item`, `user_id`, `custom_data`, `transaction_id` and an ECDSA `signature` to prevent spoofing.
  - Google's advice: reward instantly on the client callback and validate on the SSV callback, or wait for SSV when the economy matters. [doc: https://developers.google.com/admob/android/ssv]
- **Google Play Families policy** (child-directed apps): prohibited formats include "advertising that interfere[s] with normal app use… **including rewarded or opt-in ads, that are not closeable after 5 seconds**." Only Families self-certified ads SDKs may be used, with no personalized ads. [doc: https://support.google.com/googleplay/android-developer/answer/9893335]
- **Google Play AI-Generated Content policy** covers text-to-text chatbot apps. Generative AI apps "primarily intended to be sexually gratifying" are prohibited, and developers must prevent offensive generations. [doc: https://support.google.com/googleplay/android-developer/answer/14094294]
- **Google Publisher Policies** prohibit sexually explicit content on monetized inventory. [doc: https://support.google.com/publisherpolicies/answer/10438119]

### [POL-4] Apple App Store (verbatim, checked 2026-09-25)
Source: https://developer.apple.com/app-store/review/guidelines/ [doc]
- **3.2.2(x):** "Apps must not force users to rate the app, review the app, download other apps, or other store-related actions in order to access functionality… **Apps may otherwise incentivize users to take specific actions within apps (e.g. completing a level, watching an ad).**" Rewarded ads are explicitly permitted.
- **2.5.18:**
  - Ads must be "appropriate for the app's age rating."
  - No targeting on sensitive data (health, kids).
  - Interstitial or blocking ads "must clearly indicate that they are an ad… must provide easily accessible and visible close/skip buttons."
  - "Apps that contain ads must also include the ability for users to report any inappropriate or age-inappropriate ads."
  - Ads are not allowed in extensions, widgets, notifications or keyboards.
- **3.1.1:** unlocking features or functionality for money must use IAP. Rewarded ads unlock via attention, not payment, so they are fine. But **don't sell the reward currency outside IAP.** [inf]
- **Kids Category (1.3):** no third-party ads, except limited contextual ads with human-reviewed creatives.

### [POL-5] AppLovin MAX
- No rewards for clicks, and no misleading tactics that encourage clicks. [doc: https://support.applovin.com/en/max/max-dashboard/best-practices]
- Publisher content policy prohibits "sexually explicit or other adult content, including… highly suggestive content… explicit or implied sexual language." AppLovin may restrict content "on a case-by-case basis." Ads must be visible and placed reasonably, and must meet Better Ads Standards. [doc: https://legal.applovin.com/policies-publishers/]
- AppLovin's own rewarded tips:
  - Place the offer "where users need something extra."
  - Useful reward types are a period boost, a daily bonus and speeding up a user action.
  - Frequency-cap; one example is "only one or two rewarded videos per day."
  - "Offering rewarded ads can actually increase in-app purchases."
  - [doc: https://support.applovin.com/en/max/best-practices/tips-for-using-rewarded-videos-more-effectively]

### [POL-6] Unity, ironSource LevelPlay and Tapjoy
All three are now under Unity. The Rewarded Ad Inventory Policy in [POL-2] governs them. Offerwall (Tapjoy) reward completions must be honoured even if the offerwall is later removed. [doc: https://unity.com/legal/rewarded-inventory-policy]

### [POL-7] AI-chat-specific ad norms (not law, but the emerging standard)
- **ChatGPT ads** launched 2026-02-09 on the Free and Go tiers for logged-in US adults. [press: https://techcrunch.com/2026/02/09/chatgpt-rolls-out-ads/]
  - Ads are "clearly labeled as sponsored and separated from the organic content."
  - "Ads do not influence the answers."
  - No ads near health, mental health or politics.
  - No ads for under-18s.
  - Free users may choose an **ads-free experience with lower usage limits**, which makes ads-for-usage an explicit value exchange. [press: https://www.digitaltrends.com/computing/you-can-avoid-chatgpt-ads-but-your-free-limits-may-change/]
- Brand-safety commentary recommends:
  - topic-sensitivity screening (health, finance, legal),
  - suppressing ads when model confidence is low,
  - clear separation between the answer and the ad.
  - [press: https://www.adexchanger.com/data-driven-thinking/the-ai-chat-ad-frontier-what-llms-change-about-brand-safety-and-control/, May 2026]

### [POL-8] Simula ad units (the client's vocabulary; from public docs and SDK)
Sources: docs.simula.ad, npm `@simula/ads`. [doc]

| Unit | ID prefix | What it is | Placement |
|---|---|---|---|
| **Native Character Ads** | `SIM-NAT` | Inline in a feed | Every ~10 items; collapses when there is no fill |
| **Interstitial** | `SIM-INT` | Full-screen sponsored mini-game with an AI character | At transition points: "between sessions, after a conversation ends, or at a message threshold" |
| **Rewarded** | `SIM-RWD` | "Users play a mini-game, then claim an in-app reward" | Opt-in, see lifecycle below |

- **Rewarded lifecycle:**
  - The client fires `EARNED_REWARD`, then `REWARD_VERIFIED` arrives with a token. **Grant on `REWARD_VERIFIED`.** An optional SSV POST can follow.
  - A loaded ad expires after 1 hour. Requests within 5 minutes are deduplicated.
  - A frequency-cap check runs before the offer is shown.
- **Components:**
  - `RewardInvitation`: the character is labeled "Game Partner."
  - `MiniGameInviteKit`: entry points `button | invitation | interstitial`.
  - `MiniGameMenu`: 3, 6 or 9 games.
  - `InChatAdSlot`, `SponsoredSuggestions`, `NativeBanner`. Their context carries an **`nsfw` flag**.
  - `CharacterSelector`.
- **Default reward copy:**
  - Title: "You've Run Out of Free Messages Today"
  - Body: "Play a quick game to unlock free messaging for the rest of the day?"
  - Buttons: "Play Now" / "No Thanks"
- Proposals should be described as **surface → trigger → unit (NAT/INT/RWD) → Game Partner → min play → REWARD_VERIFIED → grant**.

### [POL-9] Machine-checkable compliance checklist (the JUDGE's hard gates)
A proposal fails if any of these is false.
- The user taps an explicit accept, or a rewarded-interstitial intro screen has a visible, working "No."
- The exact reward and the required action (including "3 ads" or "play 15 s") are stated before the ad.
- The reward is granted only after completion or verification, and a failed or no-fill ad is handled gracefully.
- Declining or skipping leaves the app fully usable at the pre-offer state. There is no penalty and no degraded state.
- There is no "support us" or guilt copy, no confirmshaming, and no fake timers.
- There is no reward for clicking or installing.
- The reward is in-app, non-transferable and not cash-like. Chance rewards list their odds.
- The surface is SFW and age-appropriate. There are no ads to known minors or in kids flows.
- The reward is not near sensitive conversations (self-harm, mental health, health, politics).
- An in-progress AI generation is never interrupted.

---

## 2. Value-exchange taxonomy (13 archetypes)

Each entry gives: definition, why it works, real examples, the AI-chat analog, cannibalization risk (Low, Medium or High), and sizing guidance.

### [TAX-1] Consumable refill (messages, credits, energy, lives, puzzles)
- **Definition:** a depleting resource hits zero, and one view restores a slice of it.
- **Why it works:** it fires at the exact moment of need. It is the highest-intent trigger there is.
- **Examples:**
  - **Duolingo Energy.** Watch a rewarded ad "to earn back some Energy," or buy a refill with gems. [doc: https://blog.duolingo.com/duolingo-energy/] Reported sizes are 25 energy per day and 3–5 energy per ad, varying by user. [3p: https://duoplanet.com/duolingo-energy-system/]
  - **Duolingo hearts** (the older system): refill one heart by waiting 5 h, practicing, or watching an ad. [3p: https://android.gadgethacks.com/how-to/how-to-get-duolingo-hearts-back-and-remove-ads-guide/]
  - **Chess.com**: a free user "can watch an ad after doing puzzles to get three more puzzles." This was a limited rollout. [3p forum: https://www.chess.com/forum/view/help-support/how-do-i-watch-an-ad-to-get-more-puzzles]
  - **Chai**: about 70 free messages, then a recharge timer. Users report watching video ads for more messages. [3p: https://www.isekaizero.ai/blog/chai-mod-apk]
- **AI analog:** N extra messages, "free messaging for the rest of today" (Simula default copy), or extra image credits.
- **Cannibalization:** Medium. Keep the refill partial, cap it daily, and leave the unlimited tier clearly better.
- **Sizing:** one view restores ≈10–30% of the daily free allowance. Allow 2–5 refills per day at most. [inf]

### [TAX-2] Time-boxed premium unlock or trial ("sponsored session")
- **Definition:** one view unlocks the paid tier's key benefit for 15 minutes to 24 hours.
- **Why it works:** it samples the subscription. The user feels the premium benefit and then loses it, which creates upgrade intent. AdMob explicitly allows "product or service free trial" as a reward. [doc: AdMob policy]
- **Examples:**
  - **Spotify Sponsored Sessions (2014):** a 15–30 s opt-in video for 30 minutes of ad-free listening, on mobile. [press: https://techcrunch.com/2014/09/08/the-music-streaming-revolution-will-be-televised/]
  - **Pandora Premium Access (Dec 2017):** a 15–30 s video (unlock after 15 s) opens an on-demand session. Pandora tested 15, 30 and 60 minute sessions and aimed to convert users to $9.99 Premium. [press: https://techcrunch.com/2017/12/14/pandora-listeners-can-now-watch-video-ads-to-access-on-demand-music]
  - **Duolingo Pre-Lesson Energy Sponsorship (June 2026):** a 30 s opt-in video before the first lesson of the day unlocks **30 minutes of unlimited Energy**. [press: https://www.emarketer.com/content/duolingo-s-rewarded-ad-efforts-ramp-up-with-new-format]
  - **TeraBox:** "After watching 3 videos, you will get 1 day of free [Premium] trial; after watching another 4, you will get 3 more days." [doc: https://blog.terabox.com/terabox-premium-what-you-didnt-know/]
- **AI analog:** 30 minutes on the premium model, 1 hour of priority speed, today with extended memory, or a 1-hour ad-free pass.
- **Cannibalization:** Medium to High if the unlocked benefit *is* the subscription's core promise.
  - Mitigations: keep sessions short, have them expire visibly, and show the upsell at expiry.
  - Watch for devaluing the product with "ad-free" rewards when "ad-free" is the only reason to subscribe.

### [TAX-3] Content unlock ("wait or watch")
- **Definition:** a piece of gated content (an episode, chapter, character or article) opens after one view. Paying skips the wait, and the ad path is limited.
- **Examples:**
  - **Tapas "Watch 1 Ad for 1 Free Episode"** (launched Nov 2023): up to 3 per day on Wait-Until-Free series, app only. The unlocked episode re-locks after 72 hours. It replaced "watch videos for Ink" in the Ink shop. [doc: https://help.tapas.io/hc/en-us/articles/18868948549403-What-is-Watch-Ad-for-1-free-ep ; https://x.com/tapas_app/status/1720207668462383341]
  - **Webtoon Ad Pass:** watch ads to unlock select episodes, which stay available for 3 days. Webtoon removed Daily Pass in May 2025. [doc: https://webtoon.zendesk.com/hc/en-us/articles/13727523223572 ; press: https://kcomicsbeat.com/2025/05/29/no-youre-not-losing-it-webtoon-got-rid-of-daily-pass/]
  - **Pocket FM:** watch ad videos to unlock episodes. There are also "up to 30 minutes of free episode unlocks per show every day." [doc: https://pocketfm.com/support/is-pocket-fm-free]
  - **ReelShort:** 8–13 free episodes, then 60 coins per episode (the $4.99 pack is 500 coins, so about $0.60 per episode). Ads earn coins "with a daily cap." [doc: https://www.reelshort.com/fandom/reelshort-coins-01-25-3faa2218/]
  - **News example:** "three additional free articles for watching a video." [vendor: https://verve.com/blog/rewarded-video-ads-beyond-gaming-apps/]
  - **Google Offerwall** for web publishers (GA 2025-06-26) offers rewarded ads, surveys, micropayments or a custom choice to access content. Google reports an average revenue uplift of 9%, up to 20%. [doc: https://blog.google/products/ads-commerce/offerwall-gives-publishers-more-options-audiences-more-control/ ; press: https://pressgazette.co.uk/paywalls/google-offerwall-monetisation-adverts-publishers/]
- **AI analog:** unlock a premium character or story chapter, a scenario pack, or the "next chapter" of an AI story.
- **Cannibalization:** Low to Medium when it is rate-limited (N per day), the unlock is temporary, and there are fewer ad unlocks than readers binge.

### [TAX-4] Progression acceleration (skip wait, speed up, skip queue)
- **Examples:**
  - **TeraBox Premium trial** also gives faster downloads (15–20 MB/s versus 200–800 KB/s). [doc]
  - **Character.AI Charms** can "skip slow mode." [3p: https://www.roborhythms.com/character-ai-charms-explained/]
  - **FreeVPN**: +50 MB of data per rewarded video, up to 300 MB extra per day. [doc: Play listing via search, https://play.google.com/store/apps/details?id=com.freevpn.plpl]
- **AI analog:** skip the peak-hour queue, faster responses for 1 hour, or a "rush" on a long generation.
- **Cannibalization:** Low to Medium. Speed matters most at peak, so offer it only when latency or a queue actually exists.

### [TAX-5] Multiplier or doubling
- **Definition:** after a reward is earned by an action, one view doubles or boosts it.
- **Example:** Duolingo used rewarded ads for "doubled or increased rewards for certain achievements." [doc: AdMob case study, https://admob.google.com/home/resources/duolingo-partners-with-admob-to-optimize-mediation-strategy-and-increase-ads-revenue-by-seventy-percent/] This is a classic game pattern ("2× coins").
- **AI analog:** double the daily check-in credits, or double quest rewards.
- **Cannibalization:** Low, because the base is already free. It is a natural post-action surface with no interruption.

### [TAX-6] Second chance or continue
- **Examples:**
  - **Duolingo** "extra lives (to continue lessons)." [doc: AdMob Duolingo case]
  - **CookApps** placed rewarded "extra life" offers when players ran out of lives: +16% session duration, and +211% session length in the A/B winner. [doc: https://admob.google.com/home/resources/rewarded-ads-win-for-everyone/]
  - **A cooking app** lets users "restore their previous user level… after missing consecutive login days." [vendor: Verve]
- **AI analog:** "retry this scene," revive a failed story branch, or restore a relationship level that has decayed.

### [TAX-7] Capacity expansion (slots, storage, memory, context)
- **Examples:**
  - **TeraBox** trial: 2 TB versus 1 TB, plus bulk upload. [doc]
  - **FreeVPN**: +MB of data per view. [doc]
  - **PolyBuzz** sells memory as a tier feature: free tier ≈30 messages of memory, Premium (~$19.90) ≈100 messages, Ultimate (~$29.90) "Permanent Memory." [3p: https://www.isekaizero.ai/blog/polybuzz-free] This shows memory is a monetizable anchor. There is no evidence of an ad path.
- **AI analog:** +1 character or persona slot, +N pinned memories, 24 h of extended context, longer history retention.
- **Cannibalization:** Medium. Permanent capacity for one ad is a red flag. Temporary or incremental capacity is fine.

### [TAX-8] Streak or level protection
- **Example:** Duolingo used rewarded ads to earn gems "to purchase skins or protect learning streaks." [doc: AdMob Duolingo case]
- **AI analog:** protect a daily chat streak or relationship or bond level from decay.
- **Cannibalization:** Low to Medium.
- **Integrity warning:** don't manufacture loss purely to sell protection. That is a dark pattern; see [ANTI-11].

### [TAX-9] Daily quests, tasks and check-ins (sponsored tasks)
- **Examples:**
  - **ReelShort** check-in with a 7-day streak bonus plus rotating tasks that pay coins. [doc: ReelShort fandom]
  - **Character.AI Charms** quests: daily login (20), creating an intro video (30), posting to feed (30) and others. Charms can be spent on extra images or chats, skipping slow mode, or a 1-hour Ad Free Pass. [3p: https://www.roborhythms.com/character-ai-charms-explained/ ; doc: https://support.character.ai/hc/en-us/articles/43610534413211-Charms-FAQ]
  - **Discord Quests:** Video Quests and Play Quests (often 15 minutes of play) earn **Orbs**, launched globally 2025-07-14. Orbs redeem for Nitro credits, avatar decorations and profile effects. Discord reports a 16× increase in first-time Shop purchasers. [press: https://www.engadget.com/gaming/discord-launches-a-virtual-currency-162136575.html ; https://www.marketingdive.com/news/discord-strengthens-pitch-to-advertisers-with-new-orbs-virtual-reward/753332/]
  - **Simula's Luzia reference slide** "Daily Tasks = Daily Monetization": sponsored games with the character, then a sponsor ad, then claim the reward. [assignment]
- **Why it works:** it builds a daily habit (retention) *and* a predictable, capped inventory. It is proactive, not interruptive.
- **Cannibalization:** Low.

### [TAX-10] Paywall-decline fallback
- **Definition:** show the rewarded option only after the user dismisses the paywall ("Not ready? Watch or play 15 s for X").
- **Why it works:** it self-selects people with low willingness to pay *after* they have seen the full price, which limits substitution. The assignment names it explicitly: "A subscription app might only surface a rewarded option after a user declines the paywall." [doc: assignment]
- **Related real designs:**
  - **ChatGPT**: Free with ads and higher limits, versus Free ad-free with lower limits, versus paid. [press]
  - **Pandora Premium Access**: the dual goal was to convert to Premium *and* earn ad revenue from people "uninterested in upgrading." [press: TechCrunch 2017]
- **Rule:** the offer must be smaller than the cheapest paid unit, and the paywall must stay the first and dominant choice. [inf]

### [TAX-11] Sponsored sessions or sponsorships (brand-attributed reward)
- **Examples:**
  - **Spotify Sponsored Sessions** (brands at launch included Coca-Cola, McDonald's and Nike). [press]
  - **Pandora Sponsored Listening:** "an hour or more of uninterrupted music." Pandora also runs Sponsored Skips and Sponsored Replays; extra skips expire within 1 hour. There is a "Happy Hour" Thursday 6–9 PM variant. [doc: https://www.siriusxmmedia.com/insights/sponsored-listening-on-pandora-what-are-the-benefits ; https://community.pandora.com/t5/Subscriptions/Have-to-watch-an-ad-to-get-additional-skips/td-p/7689]
  - **Duolingo energy sponsorship** with Etsy and Universal Pictures: >95% completion and >5% CTR. [press: EMARKETER]
- **AI analog:** "Tonight's chats are sponsored by [brand]: unlimited messages for 30 minutes," or a sponsored character or game partner (Simula).

### [TAX-12] Rewarded surveys and offerwalls
- **Examples:**
  - **Google Offerwall** includes "interest surveys." [doc]
  - **Tapjoy** (Unity) offerwall. [doc: https://unity.com/products/tapjoy]
  - **Pollfish** claims 10× eCPM versus ads for Givling. [vendor: https://pollfish.com/publisher/app-case-studies]
- **eCPM:** offerwall eCPMs are often reported at $60 to hundreds of dollars, because they are priced per completion. [3p: https://blog.playio.co/rewarded-ad-benchmarks-2026]
- **Fit:** good as a high-value, low-frequency path, such as a "big refill." Bad for immersive AI chat, because it sends the user out of the app.
- **Policy:** installs are allowed only inside the offerwall network's own terms. Never offer your own "install X for credits." [POL-2 #7]

### [TAX-13] Cosmetic or collectible
- **Examples:**
  - **Discord Orbs** redeem for avatar decorations and profile effects. [press]
  - **Kik** points from rewarded video exchanged for stickers and emojis. [press: https://www.marketingdive.com/ex/mobilemarketer/cms/opinion/columns/24488.html]
  - **Talkie** character "cards" (gacha); gems cost $1.99–$19.99. [3p: https://www.roborhythms.com/is-talkie-ai-free/]
- **Why it works:** zero or low COGS and no fairness impact. It does need a social or identity layer to be valued.
- **AI analog:** character outfit or skin, chat theme, profile badge, or story-card frame.
- **Cannibalization:** Low to Medium, depending on whether cosmetics are the main IAP line.

**[TAX-X] Cross-cutting taxonomy notes.** [inf]
- **Reactive (moment-of-need) archetypes:** 1, 3, 6, 10. Highest opt-in, but they interrupt a flow.
- **Proactive (hub or daily) archetypes:** 5, 9, 12, 13, plus a refill hub. Lower intent, but zero interruption and a habit loop.
- **Most strong programs combine one reactive and one proactive surface.** Simula's reference set does exactly this: (1) in-chat when free messages run out, (2) a home "Refills" hub, (3) Daily Tasks.

---

## 3. Real non-game examples: catalog with specifics

### [EX-DUO] Duolingo (education; subscription plus ads plus gems)
- **Rewarded uses:**
  - Extra lives to continue lessons.
  - Gems for skins or streak protection.
  - Doubled rewards. Duolingo has used rewarded ads since 2017.
  - Quote: "a really easy way to give users a taste of a premium feature without having to actually pay."
  - AdMob mediation raised ad revenue 70%, rewarded engagement rose 2.5%, and rewarded revenue rose up to 50%.
  - [doc: https://admob.google.com/home/resources/duolingo-partners-with-admob-to-optimize-mediation-strategy-and-increase-ads-revenue-by-seventy-percent/]
- **Energy (2025–26):**
  - Energy replaced hearts. It rewards streaks of correct answers and refills by an ad or by gems. [doc: https://blog.duolingo.com/duolingo-energy/]
  - Pre-Lesson Energy Sponsorship: a 30 s opt-in video before the first lesson of the day gives 30 minutes of unlimited Energy, a benefit otherwise behind a subscription costing more than $80 a year.
  - Results: >95% completion and >5% CTR. 89% of learners have seen rewarded ads and 40% regularly opt in. 65% say the size of the reward drives their choice.
  - [press: EMARKETER 2026-06-23, https://www.emarketer.com/content/duolingo-s-rewarded-ad-efforts-ramp-up-with-new-format]
- **Scale:** FY2025 "Other" revenue (advertising, the Duolingo English Test and IAP) was $164.1M of $1,037.6M total. It grew 17%, "primarily due to increased advertising revenue" from more DAUs. [doc: 10-K, https://www.sec.gov/Archives/edgar/data/1562088/000162828026012494/duol-20251231.htm]
- **Backlash signal:** the Energy change drew "I'm quitting" coverage. Changing a core constraint is risky even when the ad path is well designed. [press: https://www.androidauthority.com/quitting-duolingo-energy-system-3599842/]
- **Lesson for the proposer:** a *product change* (inventing Energy) created the scarce resource. The ad sits at the refill point and in a pre-session sponsorship, and the subscription stays the unlimited version.

### [EX-MUSIC] Spotify and Pandora (audio; freemium subscription)
- **Spotify Sponsored Sessions (2014):** opt-in, mobile only, a 15–30 s video for 30 minutes of ad-free listening. The offer appears at the start of a mobile session while the app is in view. [press: TechCrunch 2014 ; doc: https://ads.spotify.com/en-US/ad-experiences/sponsored-sessions-specs/]
- **Pandora Premium Access (2017):**
  - Trigger: the user *searches for a specific song, album or playlist*. That is the moment of need for on-demand play, which the free tier lacks.
  - Ad: 15–30 s video, which unlocks after 15 s.
  - Sessions tested: 15, 30 and 60 minutes.
  - Pre-launch test: "2 out of 4 users" engaged, and about 90% watched at least 15 s.
  - Gen Z was 3× more likely to prefer rewarded video.
  - The goals were conversion to Premium plus ad revenue from non-upgraders.
  - [press: https://techcrunch.com/2017/12/14/pandora-listeners-can-now-watch-video-ads-to-access-on-demand-music]
- **Pandora Sponsored Skips and Replays:** skips expire within 1 hour. [doc: Pandora community]
- **Lesson:** trigger on the *intent signal* (searching for a specific song) and reward with the missing premium capability, time-boxed.

### [EX-SERIAL] Serialized content: webtoons, audio drama, short drama
- **Tapas:** 1 ad = 1 episode, up to 3 per day, 72-hour access, app only. [doc]
- **Webtoon:** Ad Pass with 3-day access. Fast Pass ad unlock for ongoing series arrived around Feb 2024. Daily Pass was removed in May 2025. [doc/press: https://magnifyyourstyle.com/2024/02/27/webtoon-implements-fast-pass-ad-unlock-for-ongoing-series/]
- **Pocket FM:** watch an ad to unlock episodes, plus a daily free-unlock budget (up to 30 minutes per show per day). Coins also come from tasks, videos and daily login. [doc]
- **ReelShort:**
  - Free first 8–13 episodes, then 60 coins per episode (about $0.48–$0.60).
  - Ads grant coins under a daily cap.
  - 7-day check-in streak.
  - Tasks, including social follows.
  - [doc: reelshort.com fandom pages]
  - Reports of coins per ad vary (15–40 coins per ad, up to about 175 per day) [3p, unverified].
- **ShortMax** (short drama; vendor case):
  - Rewarded ads for both payers and non-payers.
  - "80% of non-paying users started generating revenue through ad impressions."
  - +20% session length.
  - Placements between episodes, on return to the main menu, and at app open.
  - [vendor: https://adapty.io/blog/hybrid-monetization-for-subscription-apps/]
- **Lesson:** a per-unit content paywall plus a *rate-limited* ad unlock is a proven "wait or watch" design. Temporary access windows (72 h or 3 days) protect coin and IAP value.

### [EX-UTIL] Utilities
- **TeraBox:** 3 videos for 1 day of Premium, then 4 more videos for 3 more days. Premium includes 2 TB, fast downloads and no ads. [doc]
- **FreeVPN:** 50 MB per rewarded video, capped at 300 MB per day. [doc listing] Free VPN .org offers time up to 24 h. [doc listing via search]
- **Remini** (AI photo enhance): free users watch an ad per enhancement or save. [3p: https://morphed.app/blog/remini-free-limits]
- **Watermark-remover apps:** "watch an ad in order to save your watermark-free photo." [3p]
- **Sworkit** (fitness): rewarded video unlocks new workouts. [press: Marketing Dive]
- **Chess.com:** 3 more puzzles per ad (a test). [3p forum]
- **Lesson:** the **per-use premium action** (export, enhance, remove watermark) is a clean anchor. The user wants one output now, not a subscription.

### [EX-SOCIAL] Social, community and dating
- **Discord Quests and Orbs:** sponsored video and play tasks earn a currency that buys cosmetics and Nitro credit. [press]
- **Kik:** points for stickers. [press]
- **Dating:**
  - Badoo credits can reportedly be earned by watching ads. [3p: https://tms-outsource.com/blog/posts/apps-like-badoo/]
  - Public evidence is thin for major dating apps (Tinder, Hinge and Bumble keep boosts and likes behind IAP).
  - Dating is brand-safety-sensitive and has high IAP cannibalization risk, because boosts and likes *are* the IAP. [inf]
- **Lesson:** in social apps, rewards work best as **identity or cosmetic** items or **visibility** items, and visibility carries fairness risk.

### [EX-NEWS] News and portals
- A newspaper app gave "three additional free articles for watching a video." [vendor: Verve]
- **Google Offerwall** (web): rewarded ad, survey, micropayment or newsletter sign-up for access. Average +9% revenue, up to 20%. AI "Optimize" chooses when to trigger. [doc/press]
- **Lesson for portals with no scarce resource:** create one through a metered wall, premium modules (radar, alerts, digests) or a time-boxed ad-light mode. This is a *product-change-required* case.

### [EX-AICHAT] AI companion and chat apps (third-party reports; verify on device)

| App | What's gated or scarce | How ads are used | Source |
|---|---|---|---|
| **Character.AI** | Free tier metered; swipes, go-ons and memos metered for non-c.ai+ users; slow mode | Full-screen ads mid-chat (limited Oct 2025, wider Feb 2026); banners on web from 2026-04-15. **Charms** currency (earned by quests) buys extra images or chats, skipping slow mode, or a **1-hour Ad Free Pass**. c.ai+ ≈$9.99 removes ads. | [3p: roborhythms, jotsweb ; doc: Charms FAQ] |
| **Chai** | ~70 free messages, then a recharge timer; Premium ≈$13.99, Ultra ≈$29.99 | Watch video ads for extra messages; banners | [3p: isekaizero, toolsforhumans] |
| **Talkie** (MiniMax) | ~50 messages/day, ~2-minute voice calls, ~10k-token memory, 60-day history on free | Banners and interstitials (about every 10 minutes), eCPM $2–10; gems $1.99–$19.99; gacha cards | [3p: isekaizero, roborhythms ; 3p: https://www.tanayj.com/p/monetizing-ai-surfaces-ads-in-the] |
| **PolyBuzz** | Free has ~30 messages of memory; Basic $9.90 (no ads, faster), Premium $19.90 (~100-message context, voice), Ultimate $29.90 (permanent memory) | Interruptions about every 5 messages; coins $2.49/1K to $19.90/20K for voice time and regenerate; daily login coins expire in ~30 days | [3p: fast.io, isekaizero] |
| **Linky** | ~20–30 messages/day; voice needs bond level 4 or Premium ($17/mo or $109/yr) | Ads "after nearly every AI response," which reviewers call "unusable"; coins from ads for AI photos | [3p: https://fast.io/resources/linky-ai-review-2026/] |
| **ChatGPT** | Free and Go tiers | Sponsored units separated from the answer; free users can trade ads for higher limits | [press] |
| Generic "Chat AI" apps | Message caps | "Watch an ad for more messages" | [3p] |

- **Pattern read [inf]:**
  - AI companion apps mostly use *interruptive* formats today (interstitials every N messages or minutes). User reviews punish this hardest when the ad lands mid-roleplay.
  - The scarce resources that users already pay for are messages, memory and context, voice minutes, images, speed and queue, regenerations or swipes, premium models, and removing ads.
  - Each is a ready rewarded anchor. The proposer's edge is converting interruptive inventory into **opt-in, moment-of-need** inventory.

---

## 4. Trigger and placement design

### [TRIG-1] Surface types, ranked by intent (from high to low)
1. **Moment of need (reactive).** The resource hits zero, or a gated action is tapped. Examples: out of messages, next episode locked, Pandora song search. It has the highest opt-in. Offer it inline at the blocked point, and never as a separate interruption. [inf; AdMob: offer "as soon as users exhausted their last life"; https://admob.google.com/home/resources/rewarded-ads-playbook/]
2. **Post-action bonus.** After the user earns something (a check-in or a completed quest), offer "2× it." It has no interruption and a positive frame. [TAX-5]
3. **Paywall-decline fallback.** On paywall dismissal, offer a small sample. [TAX-10]
4. **Proactive hub.** A "Refills," "Free credits" or "Earn" entry on home or the store that is always open. AdMob recommends high-traffic surfaces such as the home page, which "100% of your users are guaranteed" to reach, and in-app stores. [doc: AdMob playbook] This is Simula Luzia slide 2.
5. **Daily tasks or quests.** A habit loop with a bounded daily inventory. [TAX-9]
6. **Pre-session sponsorship.** At session start, sponsor an upgraded session (Spotify, Duolingo). High completion.
7. **Transition interstitial (rewarded interstitial).** At a natural break *after* a conversation or episode ends, with an intro screen and a "No." Never mid-response.

### [TRIG-2] Timing and eligibility rules [inf, supported where cited]
- **Not in the first session, before core value.** Show offers after onboarding, to returning users in their 2nd or 3rd daily session. [vendor: Adapty]
- **Segment by payer status.**
  - Non-payers: full rewarded access.
  - Micro-payers: rewarded only at moments of need.
  - High-value payers: suppress interruptive formats.
  - Use segment-specific caps, because flat caps are "the most common structural source of IAP cannibalization."
  - [vendor: https://www.yieldsolutions.com/blog/hybrid-monetization-how-to-run-in-app-purchases-and-ads-without-cannibalizing-either]
- **After a purchase:** allow a cool-down of at least one session before any interruptive ad. [vendor: same]
- **Subscribers:** usually no rewarded offers, since they already have the entitlement. The exception is rewards that sit outside the subscription (cosmetics, sponsored events). ShortMax showed rewarded ads even to payers. [vendor: Adapty]
- **Paywall decliners:** eligible for the fallback offer. Re-show the paywall on a later natural trigger, and do not suppress it forever.
- **Minors and sensitive contexts:** no offers to known or predicted under-18s in AI chat (the ChatGPT norm), none in kids flows (Families or Kids Category rules), and none near sensitive topics. [POL-3, POL-4, POL-7]
- **Geography:** fill and eCPM vary 4–10× by region. [3p] Check fill before showing the offer; preload or `isReady`. Don't show an offer you cannot fill. [inf]

### [TRIG-3] Frequency caps and cooldowns
- **AppLovin example:** "only one or two rewarded videos per day" for a given placement. [doc]
- **Industry heuristics (games) [3p: RevenueFlex/AdReact via search]:**
  - Revenue per user plateaus after 5–8 rewarded views per day.
  - The safe range is 3–8 per day, with an absolute ceiling of 10–15 per day, partly because very high counts look like bot activity.
  - Cooldowns run 60–120 s between offers in games, or 15–30 minutes for bigger rewards.
- **Non-game defaults [inf]:**
  - Consumable refill: 3–5 grants per day.
  - Content unlock: about 3 per day (the Tapas value).
  - Time-boxed premium session: 1–2 per day.
  - Daily tasks: 3–5 tasks per day.
  - Multiplier: once per earn event.
  - Global ceiling: about 8–10 rewarded views per user per day.
  - Never re-offer within the same screen after a decline in the same session. Repeated asking is nagging. [ANTI-9]

### [TRIG-4] Reward sizing and pricing anchors
- **Principles:**
  - The reward must be valuable enough to act on at that moment, but smaller than what a payer gets. [doc: AdMob playbook: "valuable enough to incentivize… but not so generous they cannibalize in-app purchases"; its example is modest amounts such as 5 rubies per ad.]
  - Match the reward to the need: "if a user is out of lives, they are more likely to want an extra life." [doc: AdMob]
- **Anchors [inf]:**
  1. **Relative to the free allowance:** one view ≈ 10–30% of the daily free quota, or "rest of today" with a cap.
  2. **Relative to the cheapest paid unit:** one view is worth less than the smallest IAP pack, divided by the number of views a user would do in a day. Example: ReelShort earns about $0.02 per view but grants about $0.60 of perceived content, rate-limited to a few per day.
  3. **Relative to the subscription:** the total a free user can earn from ads in a day should stay well below one day of the paid tier's entitlement. Time-boxed premium unlocks should total at most 30–60 minutes per day.
  4. **Game heuristic (use cautiously):** ad earnings let a patient user progress at about 60–70% of a payer's pace. Prefer soft currency and time-limited boosts over permanent upgrades. [3p]
- **AI-chat unit economics check (mandatory for AI rewards) [inf, computed from cited prices]:**
  - Gross revenue per completed view: US ≈ $0.012–0.020, EU ≈ $0.005–0.009, LATAM ≈ $0.002–0.004, using the eCPMs in [MEAS-3]. Net after network or Simula share is lower.
  - Text message cost:
    - Claude Haiku 4.5 is $1 per MTok in and $5 per MTok out, with a cache read at 0.1× input. [doc: https://platform.claude.com/docs/en/about-claude/pricing]
    - A roleplay turn with 2k input tokens (80% cached) and 250 output tokens costs ≈ $0.0018. **So 10 messages ≈ $0.018, which is about 100% of US revenue per view.**
    - Small open or distilled models at about $0.1–0.3 per MTok cut this 5–10×.
    - The rule: rewarded messages should run on the cheapest acceptable model, or the reward count must be small.
  - Image cost: gpt-image-1 1024² is about $0.011 (low), $0.042 (medium) or $0.167 (high). The mini model is $0.005–0.011. [doc: https://platform.openai.com/docs/models/gpt-image-1 ; 3p: https://costgoat.com/pricing/openai-images] **One low or medium image per view is roughly break-even in the US.**
  - Voice cost: TTS ≈ $0.015 per minute (gpt-4o-mini-tts). [3p: https://community.openai.com/t/new-tts-api-pricing-and-gotchas/1150616] Full voice chat (STT, LLM and TTS) likely costs $0.02–0.06 per minute. [inf] **About 1–3 voice minutes per view is the ceiling.**
  - Near-zero-COGS rewards are the most margin-safe: queue priority (a reorder), cosmetics, slots or storage, unlocking an *existing* character, and time-boxed ad-free (which only has opportunity cost).
  - **Judge rule:** if expected reward COGS exceeds about 60% of net revenue per view in the app's main geo, flag it for resizing. If it exceeds 100%, reject unless it is framed as a retention or conversion investment with a stated hypothesis.

### [TRIG-5] Offer UX anatomy (what a good offer card contains)
Sources: [doc: AdMob/Unity policy ; Simula SDK]
- **Title:** the state plus the need, for example "You've run out of free messages today."
- **Value line:** the exact reward, amount and duration, for example "Play a 15-second game with [Character] → unlimited messages until midnight."
- **Action and length disclosure,** for example "~15 s" or "watch 2 ads."
- **Primary CTA** ("Play now" or "Watch") and an **equally legible** decline ("No thanks"). There is no false hierarchy and no confirmshaming.
- **Paid alternative** as a secondary line ("or get Plus for unlimited"). On the paywall-decline path the order flips.
- **Remaining allowance,** for example "2 of 3 left today." This sets expectations and prevents nagging.
- **After completion:** a visible grant animation, the new balance, and a return to *exactly* where the user was (for example, their unsent message is still in the composer).
- **Failure path:** if there is no fill or the ad fails, say "No ad available right now" and either retry later or grant a courtesy amount. Never take the user's input hostage.

### [MEAS-1] Metric definitions
Sources: [3p: https://www.applixir.com/blog/how-to-benchmark-your-rewarded-video-ad-revenue-for-your-web-game-2026/ ; doc: AdMob playbook]
- **Offer impressions:** the number of times the offer card was seen, not ad impressions.
- **Opt-in rate:** accepts ÷ offer impressions. Reported targets are 40–70%. [3p]
- **Engagement rate:** the share of DAU with at least one rewarded view per day. AdMob's "well-performing" bar for games is **>50% of DAU**. [doc]
- **Completion rate:** completed ÷ started. AdMob's "well-performing" bar is **≥80%**. Rewarded video usually runs 90–95%+. Duolingo reports >95%. [doc/press]
- **Fill rate:** filled ÷ requested. Target ≥95%. [3p]
- **Impressions per DAU:** a healthy game range is 2–6. [3p] Non-game will be lower, often 0.3–1.5. [inf]
- **ARPDAU (ads):** impressions/DAU × eCPM ÷ 1000.
- **Other metrics to track:**
  - Downstream: payer conversion, subscription starts, trial starts, refunds or cancellations, D1/D7/D30 retention, sessions per day, messages per DAU.
  - Offer-level: rate of declines followed by churn, and complaints or low ratings mentioning ads.

### [MEAS-2] Reported benchmarks (context, not targets)
- **Opt-in propensity:** users are **20–40% more likely to opt in** to rewarded ads than to other formats. [doc: AdMob playbook]
- **Pandora test:** 2 of 4 users engaged, and about 90% watched at least 15 s. [press]
- **Duolingo:** 40% regularly opt in, and completion is >95%. [press]
- **User preference:** >70% of 4,000 surveyed app users "would prefer to watch an ad" for in-app benefits. [vendor: Verve] 65% of US marketers say ad-free time is the most effective reward type, and 74.4% see rewarded ads as best for engagement. [press: EMARKETER/Discord July 2025, https://www.cdpinstitute.org/news/two-thirds-of-marketers-believe-users-prefer-rewarded-advertising-emarketer-and-discord/]
- **ARPDAU lift:** 30–66% after adding rewarded ads (Unity data, games). [3p via Playio] CookApps +4% ARPDAU and +86% ad revenue. [doc: AdMob playbook]

### [MEAS-3] Rewarded video eCPM ranges (2024–2026)

| Market | Android | iOS | Source |
|---|---|---|---|
| United States (avg of both) | $15.15 | | Appodeal Q4-2024 via Mistplay [3p] |
| North America | $9.20 | $13.90 | same |
| Europe | $5.10 | $8.80 | same |
| APAC | $8.20 | $7.50 | same |
| Middle East | $2.30 | $8.40 | same |
| LATAM | $1.90 | $3.75 | same |

- **Top countries (average):** US 15.15, UAE 14.55, AU 13.80, CH 12.20, IE 12.10, KR 12.00, JP 10.80, UK 10.65. [3p: https://business.mistplay.com/resources/mobile-ads-ecpm/]
- **Other reported US figures:**
  - iOS $19.63 and Android $16.49. [3p: https://blog.playio.co/rewarded-ad-benchmarks-2026]
  - "Tier-1 $15–40" (AppLovin 2025 benchmarks, as cited by a third party). [3p]
- **Comparison formats (US):** interstitial about $9.6–10.1, banner about $1.2–1.3. [3p: Playio]
- **Non-gaming:** eCPMs reportedly run 20–30% lower than gaming. [3p]
- **AI companion (Talkie, blended banner and interstitial):** $2–10. [3p]
- **ChatGPT intent ads:** early CPM reportedly about $60. This is a different product. [3p: tanayj]
- **Trend:** eCPMs have been rising with hybrid-casual demand. [3p: https://tenjin.com/blog/ad-mon-gaming-2026/]
- **Use in sizing:** use a geo-weighted blended eCPM, and haircut it 20–30% for a non-game app and for playable or mini-game demand, which Simula prices by impression. [inf]

### [MEAS-4] Worked sizing example (for proposals) [inf]
- **Inputs:** an AI chat app with 1M DAU (60% US or Tier-1). 30% of DAU engage and each does 2.0 views, so impressions/DAU = 0.6. Blended eCPM is $12.
- **Revenue:** ARPDAU_rewarded ≈ $0.0072. That is ≈ $7.2k per day, or ≈ $2.6M per year gross.
- **Rewards:** if each view grants 5 Haiku-class messages, COGS ≈ $0.009 per view. **Net ≈ $0.003 per view.** The design is marginal, so switch the reward to a cheaper model, time-boxed priority, or cosmetic items.
- **Always report** engaged %, views per engager, eCPM and COGS per view as explicit assumptions.

### [MEAS-5] Experiment design (cannibalization-safe rollout) [inf; lift-test method per https://adlibrary.com/posts/holdout-test and the general literature]
- **Unit:** randomize at the user level, never the session level. Treatment = *eligible* for the rewarded surfaces. Control = not eligible. This gives an intent-to-treat estimate.
- **Primary metric:** total revenue per user (ads + IAP + subscriptions, net of refunds) over 28–56 days.
- **Co-primary or guardrail metrics:** subscription or IAP conversion (non-inferiority margin, for example no worse than −3% relative), D7 and D30 retention, and core engagement (messages or sessions per DAU).
- **Diagnostics:** opt-in, completion, engagement %, impressions per DAU, fill, and paywall views to purchase.
- **Duration:** at least 2–4 weeks, and at least one full subscription trial plus billing cycle if trials exist. Keep a **long-term holdout** of 5–10% for 2–3 months to catch slow cannibalization or habituation.
- **Power:**
  - With a 3% baseline paid conversion, detecting a 5% relative drop (0.15 pp) at 80% power and α 0.05 needs **≈200k users per arm** (n ≈ 16·p(1−p)/δ²).
  - Small apps should instead test *revenue per user* and accept wider bounds, or ramp over time.
- **Stratify by** new versus existing users, geo tier, platform, and payer or non-payer. Pre-register segments.
- **Variants to test:** reward size, daily cap, surface (reactive only versus reactive plus hub), and eligibility (all non-payers versus paywall decliners only).
- **Why observational comparisons mislead:** users who watch rewarded ads self-select as the more engaged users. See [CANN-3]. Only randomized holdouts answer "does it cannibalize?"

---

## 5. Cannibalization: theory and evidence

### [CANN-1] Mechanisms that raise paid conversion (complementarity)
- **Sampling or trial effect.** Users experience the premium good and learn its value.
  - An academic field study of in-app reward ads found users given free items were more likely to buy, and existing buyers bought more ("sampling effect"). [doc: https://www.researchgate.net/publication/319486736_Positive_Side_Effects_Of_In-App_Reward_Advertising_Free_Items_Boost_Sales_A_Focus_on_Sampling_Effects]
  - Duolingo describes rewarded ads as "a taste of a premium feature." [doc]
  - Pandora explicitly aimed to convert users. [press]
- **Retention and engagement.** Users who hit a wall and get a path forward stay. More days active means more chances to convert later.
- **Price discrimination.** The ad path self-selects time-rich, cash-poor users who would never pay, so it monetizes the 90–97% who never convert without touching payers. [inf]
- **Habit and endowment.** Daily tasks and streaks create attachment that later converts. [inf]

### [CANN-2] Mechanisms that lower paid conversion (substitution)
- **Over-generous rewards:** "offering overly generous rewards through rewarded ads disincentivizes players from making direct purchases of the same items." [3p: https://www.gamebizconsulting.com/blog/do-ads-hurt-in-app-purchase-revenue-in-mobile-games]
- **The rewarded good is the subscription's core promise** (unlimited messages, ad-free) and is given too often or too long, so "good enough for free" wins. [inf]
- **Price-anchor erosion:** handing out the premium currency devalues packs. The fix is soft currency or narrowly usable rewards. [3p]
- **Interruptive ads cause churn,** so future purchases are lost: "showing too many system-initiated ads (such as interstitial ads) leads to users churning early." [3p: GameBiz] *This argues for rewarded formats over interstitials.*
- **Paying users exposed to ad prompts** may feel the product is cheap. Suppress offers for payers.

### [CANN-3] Evidence quality (be honest in proposals)
- **Unity/Tapjoy 2022, 8 high-DAU apps:**
  - Users who engaged with rewarded ads were **4.5× more likely to make an IAP** (>9× in 2 apps).
  - Spend rose +326% in the 7 days before versus after the first engagement.
  - D30 retention was 53–68% versus a 13% benchmark, and sessions rose +34%.
  - [vendor: https://unity.com/blog/understanding-the-impact-of-rewarded-ads-on-iap-retention-and-engagement]
  - **Caveat:** these results are observational. Engaged users self-select, and the study does not claim causality.
- **Avid.ly (AdMob case):** after adding rewarded ads, IAP frequency rose +18%, time in app +20%, and revenue +40%. [doc/vendor: AdMob]
- **Unity study (secondary report):** adding ads to IAP-only games raised D7 retention +2.3% and the share of IAP users +1.1%. [3p: GameBiz]
- **Fyber (secondary report):** low-spend cohorts increased IAP spend 40–100% after engaging with ads. [3p: GameBiz]
- **Academic:**
  - Sampling-effect field study (above).
  - A 2026 SSRN paper (Chang, Lei, Wan, Huang) notes that designs raising *immediate* rewarded-ad use "may also frustrate players and reduce future retention." It optimizes lifetime views with field experiments. [doc: https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6137709]
- **Non-game evidence is thinner:**
  - Duolingo: +50% rewarded revenue [doc: AdMob]. The Energy mechanic was reported in 2025 earnings commentary to be "boosting DAUs, time spent learning, and subscriber conversion." [3p summary of a Q2-2025 call; verify]
  - ShortMax (80% of non-payers monetized). [vendor]
  - Google Offerwall (+9% average publisher revenue). [doc]
  - Pandora's stated rationale. [press]
- **Bottom line [inf]:** most published evidence says well-designed rewarded ads are neutral to positive for IAP in games. For subscription apps the evidence is mostly company statements, not RCTs. **Every proposal should ship behind a holdout ([MEAS-5]).**

### [CANN-4] Guardrails (decision rules)
1. **Eligibility:** non-payers only by default. Use paywall-decline gating when the reward overlaps the subscription's core benefit.
2. **Partial, not complete:** refill a slice, time-box, and cap per day. A free user's maximum daily ad-earned benefit must be less than a payer's daily entitlement.
3. **Different axis than the subscription where possible:** reward speed, cosmetics, content or one-offs, not the unlimited core.
4. **Visible contrast:** each grant screen says "Plus = unlimited, no waiting."
5. **Soft rather than premium currency,** or a single-purpose reward (for example, "1 premium reply," not 100 gems).
6. **Hold out and monitor:** total revenue per user and paid conversion must not drop beyond the non-inferiority margin. If they do, auto-rollback via a remote-config kill switch.
7. **Payer protection:** suppress offers after a purchase, and never show ads to subscribers unless the reward is outside their plan.

---

## 6. Anti-patterns (the JUDGE should penalize or reject)

- **[ANTI-1] Forced ads disguised as rewarded.**
  - Examples: auto-playing a "rewarded" ad without an explicit accept, a rewarded interstitial without an intro screen and working "No," or making completion mandatory to proceed.
  - This violates AdMob policy. Developers get "Rewards implementation – User choice – Must fix" enforcement notices. [doc: AdMob policy ; 3p: https://www.b4x.com/android/forum/threads/ads-restricted-admob-rewards-implementation-%E2%80%93-user-choice-must-fix.158752/]
- **[ANTI-2] Punishing decline.** Declining degrades the app, resets progress or locks the user out. That is prohibited. [POL-2 #5]
- **[ANTI-3] Worthless or mismatched rewards.** A reward that is irrelevant to the current need, tiny relative to prices (5 coins when the cheapest item costs 500), or unusable soon (expires before the user can use it). The result is low opt-in and inventory with no value. [doc: AdMob "match reward to placement"]
- **[ANTI-4] Over-generous rewards.** One ad gives a day of unlimited premium, a permanent unlock, or more than a payer gets. This cannibalizes. [CANN-2]
- **[ANTI-5] Interrupting a streaming AI response or a live roleplay.**
  - Full-screen ads "mid-conversation… break the session." [3p: https://www.roborhythms.com/character-ai-ads-april-2026/]
  - Ads "after nearly every AI response" were called "unusable." [3p: Linky review]
  - **Rule:** offers appear only at a *boundary*, meaning after the response finishes, when the composer is blocked by a limit, or between conversations. The user's typed input must be preserved through the ad.
- **[ANTI-6] Integrity-breaking rewards.**
  - Watching an ad yields a *better or more truthful answer* (tutoring, health or finance), which implies the free answer was deliberately worse.
  - Ads influence the model's answers. OpenAI's principle is that "ads do not influence the answers." [press]
  - Pay-to-win in social or competitive rankings.
  - Rewards that unlock NSFW content or bypass age verification or safety filters.
  - Rewards that distort the app's mission, for example educational progress bought with attention. Watch for backlash risk. [press: Android Authority on Duolingo Energy]
- **[ANTI-7] Incentivized clicks or installs, cash or gift-card rewards, and "support us" copy.** All are prohibited. [POL-2 #6–8]
- **[ANTI-8] Undisclosed bundles or moving goalposts.** "Watch one more ad" appears after the first ad, or the required watch count is hidden. Disclosure is required. [POL-2 #3]
- **[ANTI-9] Dark patterns.** From the FTC's "Bringing Dark Patterns to Light" (Sept 2022):
  - disguised ads,
  - fake countdown timers,
  - false hierarchy (a big "Watch," and a small grey "no"),
  - nagging (repeated offers after decline),
  - confirmshaming ("No, I don't want free messages"),
  - obstruction.
  - [doc: https://www.ftc.gov/news-events/news/press-releases/2022/09/ftc-report-shows-rise-sophisticated-dark-patterns-designed-trick-trap-consumers ; https://www.ftc.gov/system/files/ftc_gov/pdf/P214800+Dark+Patterns+Report+9.14.2022+-+FINAL.pdf]
- **[ANTI-10] Manufactured scarcity that feels like a hostage.** For example, "Your chat history will be deleted in 24 h unless you watch an ad," or a memory wiped unless the user watches. Loss framing on *user-created* content destroys trust. Prefer gain framing on *new* capacity. [inf]
- **[ANTI-11] Loss mechanics invented only to sell protection** (streak or bond decay added purely to monetize). Acceptable only if the mechanic has intrinsic product value, such as a habit goal. [inf]
- **[ANTI-12] Offering before value.** Offers on first launch or in session 1, before the user has formed any need. [vendor: Adapty]
- **[ANTI-13] Unfilled promises.** Showing offers without a preloaded ad (no-fill geos), losing rewards on app backgrounding, or no SSV. [POL-3]
- **[ANTI-14] Offers to minors or in kids flows,** or ads longer than 5 s that can't be closed in Families apps. [POL-3, POL-4]
- **[ANTI-15] Brand-unsafe adjacency** (see [SAFE-1]).
- **[ANTI-16] Rewarded ads for subscribers,** or ads that remove a paid benefit and then sell it back. For example, adding ads to a paid tier and offering an ad-free hour. This is perceived as a bait-and-switch. [inf]

### [SAFE-1] Brand safety for AI chat
- **Why AI chat is different:**
  - The "content" next to an ad is generated in real time from unpredictable input. There are no URLs or domains to block.
  - Hallucinations sit in the same interface as the ad.
  - Suitability needs continuous evaluation.
  - [press: AdExchanger 2026-05-14]
- **Advertiser sentiment:** 53% of US media experts named proximity to genAI content a top 2026 challenge. [press: EMARKETER citing IAS and YouGov, https://www.emarketer.com/content/faq-on-brand-safety--how-ai-content-creator-marketing-reshaping-risk-2026]
- **Hard constraints:**
  - AppLovin and Google Publisher Policies prohibit sexually explicit content on monetized properties. [POL-3, POL-5]
  - Apple requires ads appropriate to the age rating. [POL-4]
  - Google Play bans sexually gratifying generative AI apps. [POL-3]
- **Controls a proposal should specify [inf + cited]:**
  1. Only SFW surfaces: home, store, daily tasks, SFW-rated characters, and conversations whose moderation score is under threshold. Pass Simula's `nsfw` flag.
  2. No offers in conversations flagged for self-harm, mental health, health, politics or minors. [POL-7]
  3. Character or brand fit: sponsored "Game Partner" characters must be brand-approved. Never place a brand inside user-generated NSFW personas.
  4. Keep the ad UI visually separate from the model's output. Label it "Sponsored."
  5. The user can report an ad. [Apple 2.5.18]
  6. Suppress ads when moderation is uncertain. [press: AdExchanger]

---

## 7. AI-chat-specific opportunity patterns (proposal library)

Format for each pattern: **anchor** (the scarce thing) · **trigger** · **reward (size)** · **COGS** · **cannibalization** · **Simula mapping** · **copy seed**.

- **[AI-1] Out-of-messages refill (reactive).**
  - Anchor: the daily message cap. Trigger: the composer is blocked at the cap, and the user's draft is preserved.
  - Reward: N messages or "rest of today," capped at 2–3 grants per day. COGS: medium ([TRIG-4]); use the base model.
  - Cannibalization: medium, so restrict to non-payers and show the Plus line.
  - Simula: RWD `RewardInvitation` with a Game Partner and 15 s play.
  - Copy: "You're out of free messages today. Play a quick game with {char} to keep chatting until midnight?" [Simula default]
- **[AI-2] Proactive "Refills" hub.**
  - Anchor: any consumable. Trigger: an always-available home or store tile showing the remaining balance.
  - Reward: a smaller refill than [AI-1], with a daily cap. Cannibalization: low to medium.
  - Simula: RWD from `MiniGameMenu` (entry=button). [Luzia reference slide 2: "non-paying users become serially monetized"]
- **[AI-3] Daily Tasks with the character.**
  - Anchor: currency or credits plus a habit. Trigger: app open, via a Daily Tasks sheet or badge dot.
  - Reward: credits per task, 3–5 tasks per day. Cannibalization: low.
  - Simula: RWD mini-games where the character plays along and the user can chat back during play. [Luzia slide 3]
  - Analogs: Character.AI Charms quests, Discord Quests, ReelShort tasks.
- **[AI-4] Premium-model boost ("Upgrade this reply").**
  - Anchor: model tiers sold in the subscription. Trigger: a "✨ Better reply" chip under a finished message, or regenerate on a premium model.
  - Reward: 1–3 premium replies. COGS: high per reply, so keep counts low. Cannibalization: medium, but it is a strong sampling effect that shows the paid difference.
  - Simula: RWD, entry=button.
  - Copy: "Rewrite this with {Premium model}: play 15 s."
- **[AI-5] Image-generation credit.**
  - Anchor: per-image cost or cap. Trigger: tapping "Imagine" or the scene-image button when out of credits.
  - Reward: 1 image at standard quality. COGS ≈ $0.011–0.04, which roughly breaks even in the US, so prefer mini or low quality or require 2 views, disclosed. Cannibalization: medium.
  - Analog: Character.AI Charms buy extra Imagine images.
- **[AI-6] Voice minutes.**
  - Anchor: a voice-call cap (Talkie ~2 minutes free; Linky requires bond level or premium). Trigger: the call-ending warning or the voice button.
  - Reward: +2–3 minutes. COGS: $0.02–0.06 per minute. Cannibalization: medium.
  - Never interrupt the call mid-sentence. Offer at the cap boundary.
- **[AI-7] Memory or context extension.**
  - Anchor: memory tiers (PolyBuzz 30 → 100 messages → permanent). Trigger: the character "forgets" something, or a "Memory full" banner.
  - Reward: +N pinned memories, or 24 h of extended context. COGS: low for storage, higher input tokens for long context (mitigated by caching).
  - Cannibalization: medium to high if permanent, so make it temporary or incremental.
  - Avoid loss framing. [ANTI-10]
- **[AI-8] Character or persona creation slot.**
  - Anchor: creation limits. Trigger: the "Create" button at the slot limit.
  - Reward: +1 slot (permanent is OK, because the grant is small and creators drive UGC supply). COGS: about 0. Cannibalization: low.
- **[AI-9] Skip the queue, priority, fast mode.**
  - Anchor: peak-hour latency, a waiting room or slow mode. Trigger: a queue or wait screen appears. Show it only when the wait is real (for example, more than 10 s).
  - Reward: priority for 1 hour. COGS: about 0 (a reorder), though it needs capacity. Cannibalization: medium, because priority is a common subscription perk.
  - Analog: Character.AI Charms "skip slow mode."
- **[AI-10] Regenerate, swipe, rewind, "go-on" extras.**
  - Anchor: metered regenerations (Character.AI meters swipes, go-ons and memos for free users). Trigger: the swipe cap is hit.
  - Reward: +5 swipes. COGS: medium. Cannibalization: low to medium.
- **[AI-11] Unlock a premium character, scenario or story chapter ("wait or watch").**
  - Anchor: premium or locked content. Trigger: tapping a locked character or the next chapter.
  - Reward: 72 h access, or 1 chapter per view, up to 3 per day (the Tapas model). COGS: about 0 beyond chat cost. Cannibalization: low to medium.
- **[AI-12] Sponsored in-chat mini-game (in-world value exchange).**
  - Anchor: any resource, or pure entertainment. Trigger: a natural lull, the end of a scene, or the message threshold. Use INT at transitions, or RWD when a reward is attached.
  - Reward: credits plus fun. The character commentates or competes, so the ad *is* content.
  - COGS: about 0 (Simula-rendered). Cannibalization: low.
  - Brand safety: SFW characters only.
- **[AI-13] Streak or bond protection.**
  - Anchor: a relationship level or daily streak that already exists. Trigger: a streak-at-risk notification or the moment after a missed day.
  - Reward: one-time restore. Cannibalization: low. Integrity: see [ANTI-11].
- **[AI-14] Double check-in or quest reward (multiplier).**
  - Anchor: an existing daily check-in. Trigger: immediately after the claim.
  - Reward: 2×. Cannibalization: low. This is a very clean surface with no interruption.
- **[AI-15] Paywall-decline sample.**
  - Anchor: the subscription. Trigger: paywall dismissed.
  - Reward: a small taste of the premium benefit (for example, 3 premium replies, or 30 minutes of priority). Cannibalization: controlled by gating on decline.
- **[AI-16] Longer output or "continue the story."**
  - Anchor: an output-length cap or surcharge. Trigger: a response is truncated at the length cap, shown after it completes.
  - Reward: one long-form continuation. COGS: medium.
- **[AI-17] Time-boxed ad-light or ad-free pass (only if the app already runs interstitials).**
  - Anchor: existing interruptive ads. Trigger: after N interstitials, offer "watch 1 → no ads for 60 minutes."
  - Analogs: Character.AI's 1-hour Ad Free Pass via Charms, and Spotify's 30 minutes.
  - Cannibalization: high if ad-free is the main subscription benefit, so time-box and cap it.
- **[AI-18] Share or export without a watermark** (story cards, generated images). Per-use, low COGS, and a growth-positive side effect. [EX-UTIL analog]

**[AI-X] Recognizing existing opportunity versus product change required** [inf, per assignment]:
- **Existing opportunity:** the product model shows at least one of: a counter or cap, a currency, a paid tier with named entitlements, a locked item, a timer or queue, or a daily check-in. Anchor the exchange to it.
- **Product change required:** there are no scarce resources (unlimited free chat, or a news or portal app). Propose the *smallest* constraint or surface that creates value without degrading the free experience. Good options:
  - a new *bonus* resource layered on top of the unchanged free tier (for example, "premium replies" credits),
  - a daily-task surface,
  - sponsored premium sessions,
  - cosmetic or collectible layers.
  - Avoid taking away something free users have today. If you must, justify it and pair it with a generous ad path, and flag it as high-risk (see the Duolingo Energy backlash).

---

## 8. JUDGE scoring sheet

### [JUDGE-1] Hard gates (any failure means REJECT, or REVISE if fixable)
1. Policy: the [POL-9] checklist passes.
2. The reward is in-app, non-cash and non-transferable. There is no incentive to click or install.
3. It is not shown to subscribers for things they already have, and not to minors.
4. It is SFW and away from sensitive topics, and it never interrupts a streaming response.
5. It is grounded in the product model: the anchor resource, surface and trigger exist in the model, or the proposal is explicitly labeled "product change required" and specifies the new mechanic.
6. Unit economics were stated: eCPM assumption, reward COGS per view, and daily caps.

### [JUDGE-2] Weighted rubric (1–5 per dimension, anchors given)

| # | Dimension | Weight | 5 = | 1 = |
|---|---|---|---|---|
| 1 | Value strength and moment fit | 20% | The reward is exactly what the user wants at the trigger (cap hit, locked item tapped) | Generic "free coins" disconnected from any need |
| 2 | Product and narrative integrity | 15% | Feels native. In-world (character plays along); preserves flow and input; no quality degradation | Interrupts, degrades answers, or breaks immersion |
| 3 | Cannibalization safety | 15% | Non-payer or decliner gating; partial or time-boxed; different axis from the subscription; holdout planned | Gives away the subscription's core benefit, uncapped, to everyone |
| 4 | Unit economics | 10% | COGS < 30% of net revenue per view; realistic impressions/DAU | COGS > revenue with no retention rationale |
| 5 | Frequency and fatigue design | 10% | Explicit per-surface and global caps, cooldowns, no re-offer after decline | Unbounded, or re-prompts |
| 6 | Reach and inventory | 10% | The trigger occurs for a large share of DAU daily (for example, >20% hit the cap) | Rare edge case |
| 7 | Feasibility | 10% | Maps to existing units (RWD, INT or NAT), SSV, remote config; small engineering lift | Needs a new backend or economy rewrite, or has unclear ownership |
| 8 | Measurability | 5% | Named primary metric, guardrails, holdout, success threshold | No KPI |
| 9 | Specificity and originality | 5% | Uses this app's own nouns (currency name, screens, characters); non-obvious | Could be pasted into any app |

- **Verdicts:** score = Σ weight × score, on a 1–5 scale.
  - **SHIP** at ≥ 3.8 with no dimension below 2.
  - **REVISE** at 3.0–3.8, or if any dimension is at or below 2. Return the specific fix.
  - **REJECT** below 3.0 or on any hard-gate failure.

### [JUDGE-3] Strong-signal checklist (each adds confidence)
- The anchor is a resource the app *already sells* (proven willingness to pay), offered in a smaller or time-boxed form.
- The trigger is a blocked action, with the user's draft or intent preserved and resumed after the reward.
- The reward is consumed immediately, in the same flow (closed loop: need → ad → use).
- There is a paid contrast line on the grant screen.
- It pairs a reactive surface with a proactive one (hub or daily tasks), and caps each.
- There is an in-world framing (the character invites the user to a game) instead of a generic video.
- There is a real-world precedent in this KB (§2 or §3) with published results.
- Its COGS is about 0 (priority, slots, cosmetics, existing content) or cheap-model-bound.

### [JUDGE-4] Weak-signal and red-flag checklist (each subtracts)
- The ad is placed where the user is *not* blocked and not seeking value ("banner on the paywall," or "video on app open").
- There is a reward with no stated amount or duration, or "support us" framing.
- The reward duplicates the subscription wholesale ("unlimited everything for 24 h per ad").
- There is a loss or hostage framing on user-created content.
- It shows offers to payers, new users in session 1, or minors, or in NSFW-adjacent contexts.
- It assumes game-level engagement (>50% of DAU, 5+ views per day) without justification for a non-game app.
- There is no fallback for no-fill, or no SSV.
- It requires a product change but doesn't say so, or removes an existing free benefit without flagging the risk.

### [JUDGE-5] Revision prompts the judge can send back (map each failure to a fix)
- Cannibalization is too high: "Gate to paywall-decliners or non-payers; cut to a partial or time-boxed version; add a daily cap; add the Plus contrast."
- COGS is too high: "Switch the reward to the base or cheap model, fewer units, a priority or cosmetic reward, or require a disclosed 2-view bundle."
- The trigger is weak: "Move the offer to the blocked-action boundary; preserve and resume the user's input."
- Integrity: "Remove quality degradation; make it additive; don't gate truthful or safe answers."
- Brand safety: "Restrict to SFW surfaces; add moderation-score gating; exclude sensitive topics."
- It is generic: "Name the app's actual currency, screen and character; show the before and after state from the product model."

### [JUDGE-6] Calibration set (for judge validation)
- **Positives (expect SHIP):**
  - Simula's three Luzia patterns: in-chat game after messages run out, the proactive Refills hub, and Daily Tasks with the character plus a sponsor. [assignment]
  - Duolingo energy refill plus pre-lesson sponsorship.
  - Tapas 1 ad = 1 episode, up to 3 per day, 72 h.
  - Pandora on-demand session triggered by a song search.
  - TeraBox 3 views = 1 day trial.
- **Negatives (expect REJECT or REVISE):**
  1. A full-screen "rewarded" video auto-plays mid-response. (REJECT: forced, interrupts.)
  2. "Watch this ad to support us!" with no reward. (REJECT: policy.)
  3. One ad gives 7 days of Plus. (REJECT or REVISE: cannibalization.)
  4. Earn a $1 gift card per 10 ads. (REJECT: cash-like reward.)
  5. A sponsored brand character is inserted into NSFW roleplay. (REJECT: brand safety.)
  6. A banner on the paywall. (REJECT: not rewarded, no value exchange.)
  7. "Watch an ad or your chat history is deleted." (REJECT: hostage framing.)
  8. "Tap the ad to get 50 credits." (REJECT: incentivized click.)
  9. Rewarded offers shown to subscribers on every app open. (REVISE: eligibility.)
  10. 20 GPT-class messages per view with a US eCPM of $12. (REVISE: unit economics.)
- **Judge-quality metrics:**
  - Pairwise ranking accuracy (positives above negatives).
  - Hard-gate recall (catches all policy violations).
  - Inter-run consistency (the same inputs get the same verdict at temperature 0 or on majority vote).
  - Agreement with human labels on a small held-out set. [inf]

---

## 9. Glossary

- **eCPM:** effective revenue per 1000 impressions.
- **ARPDAU:** average revenue per daily active user.
- **Opt-in rate:** accepts ÷ offers.
- **Engagement rate:** the share of DAU that watch at least one rewarded ad.
- **Completion rate:** completed ÷ started.
- **SSV:** server-side verification of a reward.
- **Rewarded interstitial:** a rewarded ad shown at a transition, with an intro screen and opt-out instead of a pre-click.
- **Offerwall:** a menu of tasks (installs, surveys, purchases) that pay in-app currency. It is priced per completion.
- **Soft vs hard currency:** earnable versus mainly purchased currency.
- **Holdout / ITT:** a randomized group kept ineligible; the intent-to-treat effect is measured.
- **WUF:** Tapas's "Wait-Until-Free."
- **RWD / INT / NAT:** Simula's Rewarded, Interstitial and Native units.
- **Game Partner:** Simula's AI character that plays the rewarded mini-game with the user.

---

## Appendix T: test-app-specific facts (FILTER by `test-app` tag; never retrieve for the matching target)

- `[T-LUZIA-1] test-app:Luzia`
  - Simula's reference slides: (1) rewarded incentives extend into chat, and when free messages run out Luzia asks the user to play a game; (2) a proactive "Refills" hub on home ("non-paying users become serially monetized"); (3) "Daily Tasks = Daily Monetization," with games where Luzia plays in real time, chat during the game, a sponsor ad and a reward claim. [assignment]
  - Luzia also runs Koah native "sponsored answers" in chat, rolled out to more than 50% of inventory, at 2× eCPM and 1.5× CTR versus legacy networks. [vendor: https://www.koahlabs.com/customers/luzia]
- `[T-JANITOR-1] test-app:JanitorAI` — Paid entitlements reportedly include skipping the queue at peak, premium-model swipes and extended context. The mobile app defaults to restricted (SFW) mode. It carries high NSFW adjacency risk. [app-intel, unverified here]
- `[T-OOC-1] test-app:OOC` — Credits currency, per-mode prices, daily check-in, challenges. No ads today. [app-intel, unverified here]
- `[T-AOL-1] test-app:AOL` — Portal (mail, news, weather). Already ad-heavy, with no scarce resource, which makes it a product-change-required case. [app-intel, unverified here]

---

## Source index (primary first)

- **Policies:**
  - AdMob rewarded policy: https://support.google.com/admob/answer/7313578
  - AdMob Program Policies: https://support.google.com/admob/answer/48182
  - AdMob rewarded overview: https://support.google.com/admob/answer/7372450
  - AdMob rewarded interstitial: https://support.google.com/admob/answer/9884467
  - AdMob SSV: https://developers.google.com/admob/android/ssv
  - Unity: https://unity.com/legal/rewarded-inventory-policy
  - AppLovin: https://legal.applovin.com/policies-publishers/ ; https://support.applovin.com/en/max/max-dashboard/best-practices ; https://support.applovin.com/en/max/best-practices/tips-for-using-rewarded-videos-more-effectively
  - Apple: https://developer.apple.com/app-store/review/guidelines/
  - Play Families: https://support.google.com/googleplay/android-developer/answer/9893335
  - Play AI content: https://support.google.com/googleplay/android-developer/answer/14094294
  - Google Publisher Policies (sexually explicit): https://support.google.com/publisherpolicies/answer/10438119
  - FTC dark patterns: https://www.ftc.gov/system/files/ftc_gov/pdf/P214800+Dark+Patterns+Report+9.14.2022+-+FINAL.pdf
- **Google and AdMob resources:**
  - https://admob.google.com/home/resources/rewarded-ads-playbook/
  - https://admob.google.com/home/resources/rewarded-ads-win-for-everyone/
  - https://blog.google/products/admob/rewarded-101-things-you-need-to-know/
  - https://admob.google.com/home/resources/duolingo-partners-with-admob-to-optimize-mediation-strategy-and-increase-ads-revenue-by-seventy-percent/
  - https://blog.google/products/ads-commerce/offerwall-gives-publishers-more-options-audiences-more-control/
- **Company and press:**
  - Duolingo: https://blog.duolingo.com/duolingo-energy/ ; 10-K https://www.sec.gov/Archives/edgar/data/1562088/000162828026012494/duol-20251231.htm ; https://www.emarketer.com/content/duolingo-s-rewarded-ad-efforts-ramp-up-with-new-format
  - Spotify: https://techcrunch.com/2014/09/08/the-music-streaming-revolution-will-be-televised/
  - Pandora: https://techcrunch.com/2017/12/14/pandora-listeners-can-now-watch-video-ads-to-access-on-demand-music ; https://www.siriusxmmedia.com/insights/sponsored-listening-on-pandora-what-are-the-benefits
  - Tapas: https://help.tapas.io/hc/en-us/articles/18868948549403-What-is-Watch-Ad-for-1-free-ep
  - Webtoon: https://webtoon.zendesk.com/hc/en-us/articles/13727523223572-What-are-the-different-ways-to-unlock-paid-episodes
  - Pocket FM: https://pocketfm.com/support/is-pocket-fm-free
  - ReelShort: https://www.reelshort.com/fandom/reelshort-coins-01-25-3faa2218/
  - TeraBox: https://blog.terabox.com/terabox-premium-what-you-didnt-know/
  - Discord: https://www.engadget.com/gaming/discord-launches-a-virtual-currency-162136575.html
  - ChatGPT: https://techcrunch.com/2026/02/09/chatgpt-rolls-out-ads/ ; https://www.digitaltrends.com/computing/you-can-avoid-chatgpt-ads-but-your-free-limits-may-change/
  - Character.AI: https://support.character.ai/hc/en-us/articles/43610534413211-Charms-FAQ
  - Brand safety: https://www.adexchanger.com/data-driven-thinking/the-ai-chat-ad-frontier-what-llms-change-about-brand-safety-and-control/ ; https://www.emarketer.com/content/faq-on-brand-safety--how-ai-content-creator-marketing-reshaping-risk-2026
- **Evidence and benchmarks:**
  - https://unity.com/blog/understanding-the-impact-of-rewarded-ads-on-iap-retention-and-engagement
  - https://www.researchgate.net/publication/319486736_Positive_Side_Effects_Of_In-App_Reward_Advertising_Free_Items_Boost_Sales_A_Focus_on_Sampling_Effects
  - https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6137709
  - https://www.gamebizconsulting.com/blog/do-ads-hurt-in-app-purchase-revenue-in-mobile-games
  - https://adapty.io/blog/hybrid-monetization-for-subscription-apps/
  - https://www.yieldsolutions.com/blog/hybrid-monetization-how-to-run-in-app-purchases-and-ads-without-cannibalizing-either
  - https://business.mistplay.com/resources/mobile-ads-ecpm/
  - https://business.mistplay.com/resources/rewarded-ads-stats
  - https://blog.playio.co/rewarded-ad-benchmarks-2026
  - https://www.applixir.com/blog/how-to-benchmark-your-rewarded-video-ad-revenue-for-your-web-game-2026/
  - https://verve.com/blog/rewarded-video-ads-beyond-gaming-apps/
  - https://tenjin.com/blog/ad-mon-gaming-2026/
- **AI cost:**
  - https://platform.claude.com/docs/en/about-claude/pricing
  - https://platform.openai.com/docs/models/gpt-image-1
  - https://costgoat.com/pricing/openai-tts
- **AI app reports [3p]:**
  - https://www.isekaizero.ai/blog/chai-mod-apk
  - https://www.isekaizero.ai/blog/talkie-ai-free
  - https://www.isekaizero.ai/blog/polybuzz-free
  - https://fast.io/resources/linky-ai-review-2026/
  - https://www.roborhythms.com/character-ai-charms-explained/
  - https://www.roborhythms.com/character-ai-ads-april-2026/
  - https://www.tanayj.com/p/monetizing-ai-surfaces-ads-in-the
