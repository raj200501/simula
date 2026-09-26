# App Intel: OOC, JanitorAI, Luzia, AOL, and Simula (for planning and evaluation only)

Researched 2026-09-25 from app store listings (Google Play pages downloaded and parsed), help centers, the companies' own posts, press coverage, and Simula's public SDK packages and docs.

> **Do not feed this file to the pipeline.** The assignment says "product understanding must come from the apps themselves." This file has two uses: (1) choosing which app to go deep on, and (2) serving as ground truth for measuring the explorer's recall and checking proposer quality. Keep it under `eval/` and never add it to agent prompts.

Confidence tags: **[doc]** = the company's own help center, store listing or post; **[3p]** = third-party review or blog; **[inf]** = my inference; **[verify]** = confirm on the device in the first manual pass.

---

## 0. TL;DR

| Rank | App | Verdict |
|---|---|---|
| **1: go deepest** | **OOC (The Playable Anime)** | It has the richest monetization mechanics of the four: a credit currency, per-mode prices, daily check-in, Challenges with badges, a refill store, expiring free credits and an output-length surcharge. It is ad-free today, and its users are asking for rewarded ads in public reviews. It sits in Simula's core category (AI character and entertainment apps). It is very different from Simula's Luzia slides. The main risks are Google/Apple sign-in and the fact that exploring spends credits. |
| **2: backup and judge calibration** | **Luzia** | Easiest to explore (no account needed, rated Everyone). It has message and image caps, the Luzia+ paywall and ads. Simula's own reference slides are about Luzia, so Luzia is the ideal **golden set for calibrating the judge**. It is also the weakest for showing originality. Switch to Luzia as the deep app if OOC sign-in or the accessibility tree blocks the explorer by the end of day 1. |
| 3: transfer demo | JanitorAI | Large scale and relevant, but free chat is unlimited, so the only scarce things are Janitor+ entitlements (priority, context, premium swipes). Highest content and brand-safety risk. The mobile app starts in restricted mode by default. |
| 4: transfer demo | AOL | A mail, news and weather portal, not an AI chat app. It is already full of ads and has no scarce resource, so it is the clean test of the **"product change required"** case. It is the hardest to explore safely because the inbox holds personal data and the content changes constantly. |

---

## 1. Per-app intelligence

### 1.1 OOC: "The Playable Anime" (ooc.ai), package `com.newai.ooc`

**What it is.** An interactive-fiction and AI character platform from Wrtn Technologies (Korea). It is the North American version of **Crack**, Wrtn's Korean app (Kyarapu in Japan). The AI acts "like a dungeon master": the user is the protagonist, types actions, and the AI writes the story, generates anime-style scene images, and keeps memory. [doc/press]

**Scale and business.**
- Google Play: 1M+ installs (about 1.29M), 4.2★ from about 23.7K reviews, rated Teen. Play listing created Apr 3 2026. Last update Sep 17 2026 added **Session Branching**, described as "Branching is free; messages still cost Credits." [doc]
- iOS: 4.6★ from about 6.3K ratings, 13+, #100 in Entertainment, developer "New AI Entertainment Inc." [doc]
- Reported to reach about ₩10B (about $7.2–7.6M) in **monthly** revenue within about 3 months of its May 2026 North American launch. Wrtn targets more than $145M revenue in 2026, raised a Series C at an $870M valuation (Aug 2026), and reports about 2 hours of average daily engagement across its core platforms. [press]
- Its core audience is anime, webnovel and romance-fantasy fans. The Play description lists "Action Fantasy (System, Necromancer, Regression, Hunters), Romance Fantasy (Villainess, Contract Marriage…)". [doc]

**Core loop and screens** (the bottom-nav labels still need checking on the device):
1. **Home:** a **credit icon at the top**. Genre tabs (Main, Rankings, genre tabs, and an Adult tab only after age verification) that can be reordered in Personalization. Title cards for **Stories** and **Characters**. [doc: help center]
2. **Title detail**, then **Session** (the chat or story screen):
   - The **Mode** button at top right opens the tier picker.
   - **Suggested Replies**.
   - A **picture icon under each message** that generates a real-time scene image.
   - A **branch icon under each message** for Session Branching.
   - An **image gallery** on the right with a Scene Images tab.
   - Messages can be edited and deleted. [doc]
3. **Session Settings:** **Memories** (Long-term with up to 100 editable entries; Temporary, Relationships and Goals managed by the AI), **User Note** (per title or global), **Avatars** (the user's persona: name, age, gender, appearance), and **Output Length**. [doc]
4. **MY** (bottom right): Achievement Badges and Featured Badge, ⚙️ Settings (My Information, Notification Settings), and **Personalization** (genre filter, tab order, adult toggle per genre, available only after age verification). [doc]
5. **My Titles** icon in the bottom bar, plus the **Create** flow. A Story has 8 steps: Profile Settings → Basic Settings → Intro → Stat → Media → Keyword Book → Endings → Publish. Characters have their own creation flow. [doc]

**Monetization today.** Pure in-app purchase, **no ads**, no subscription in North America.
- **Credits** are the only currency.
  - **Story mode cost per message:** Superb 90, Skillful 60, Extensive 60, Basic 30. [doc]
  - **Character mode:** Basic model is free and unlimited. **Premium Mode costs 20 credits per use.** [doc]
  - **Output Length surcharge:** extra credits for every 100 tokens beyond the 800-token base. Third-party guides report up to about 195 credits for a top-tier generation. [doc/3p]
- **Free credits:** a signup bonus of about 500 credits [3p]. **Daily Check-in** of about 300 per day [3p; the mechanic itself is doc]. **Challenges** award credits plus an **Achievement Badge** [doc]. Free credits **expire after 30 days**; paid credits never expire; credits closest to expiry are spent first [doc].
- **Credit History:** Purchase History, and Usage History split into Usage, Acquisition and **Sponsorship** [doc]. Certified Creators get 2% of the credits spent on their titles [doc].
- **Store:** credit icon → **"Refill Credits Now!" tab** → packs → "Refill Now" [doc]. iOS packs:

  | Credits | Price |
  |---|---|
  | 1,000 | $1.39 |
  | 2,000 | $2.89 |
  | 5,000 | $7.09 |
  | 10,000 | $14.49 |
  | 20,000 | $28.49 |
  | 50,000 | $71.00 |
  | 100,000 | $142.99 |
  | "Promotional" bundles | $9.99–$19.99 |

  Play lists $1.39–$142.99 per item [doc]. Buying on the web avoids store fees: users say the web discount fell from 30% to 20% [doc + review].
- **Rough value:** about $1.45 per 1,000 credits, so a Superb message (90) costs about $0.13 and a maxed-out generation (about 195) about $0.28. **A free day (300 credits) buys roughly 1–3 top-tier or about 10 Basic story messages.** [inf from doc numbers]
- The Korean parent Crack uses the "Cracker" currency, 9+ chat modes (15–230 crackers), attendance checks, challenges, and "auto-purchase" options (balance-based and date-based). **No ad-watch rewards exist in either app.** [doc: Crack help]

**Explicit user demand for rewarded ads (use this quote in the pitch).**
- Play review: *"not enough free credits… maybe adding videos to watch for credits would help, you could easily spend $50 or more just in a few days."*
- Other reviews: "300 free coins per day… breeze through them within an hour", "huge pay wall… 2–4 free messages a day… wait until the next day or pay".
- iOS reviews ask for more ways to earn and for challenges beyond the beginner ones. [doc: store reviews]

**Account and login.** Sign-in is by **Continue with Google or Continue with Apple** [3p]. The account email is shown in MY → Settings → My Information [doc]. Some reviews report random logouts [doc: reviews]. Adult titles need the user to be 18+ with age information in profile settings [doc].

**Content risk: medium.** Store ratings are Teen on Play and 13+ on iOS. Adult titles exist but sit behind age verification and a dedicated Adult tab, so a fresh unverified account sees general content [doc]. There is a Content Creation Policy with rules on swimsuit, bloodstain and upper-body images, and the model's own safety filter sometimes blocks responses [doc]. The genres include "Villainess", "Necromancer", violence and romance, so some brand-safety screening is still needed.

**What makes exploration hard.**
- **Exploring costs credits:** each Story message costs 30–90 or more. To reach the "insufficient credits" state on purpose, spend the balance with Superb mode plus long output (about 500 + 300 credits is roughly 5–9 Superb messages). Record the daily check-in modal on the first launch of each day, because it may only show once.
- **Sign-in goes through system UI:** Google Credential Manager sheet or a Chrome Custom Tab. Use a Google Play system image and a throwaway Google account, and do sign-in as a documented human-in-the-loop step.
- **Streaming responses:** the state is not "done" until generation finishes. Wait until the tree is stable, the credit counter has updated, and any typing indicator is gone.
- **"Credits are already in use"** appears if two sessions generate at once. Run exploration serially.
- **Anime art everywhere:** the mock needs image crops taken from screenshots; the accessibility tree will not describe the art.
- **Purchases:** never confirm the Google Play billing sheet (package `com.android.vending`). Record it and press back.
- The framework (native, React Native or Flutter) is unknown. Run a `uiautomator dump` smoke test on day 1.

**Mapping to Simula** [inf]. The story's own character is a natural **"Game Partner"** for `RewardedMiniGame`: "Play a quick game with *Emperor Kael* to keep the story going", which is an in-world value exchange. The anchors already exist: the credit wall, doubling the check-in, sponsored Challenges, "upgrade this reply to Superb", and scene-image unlocks. A proposer or judge also has to handle **cannibalization of about $7M a month in IAP**. That is an excellent test of the judge.

---

### 1.2 JanitorAI ("Janitor: Interactive Stories"), package `com.janitor.ai`

**What it is.** A roleplay platform built on user-generated character bots, running since June 2023. The Play listing is now positioned as interactive fiction ("romantasy, fanfiction… Tap chat and see where it goes"). The mobile app entered **public beta on Feb 7 2026** and still says "expect some bugs". [doc]

**Scale.**
- Web: about 113–130M monthly visits and 15M+ registered users by 2026 [3p/Similarweb]. Demographics conflict: Similarweb says 63% male on the web, one pricing blog says about 75% female and Gen-Z [3p, conflicting].
- Play: 1M+ installs (about 2.35M), 4.5★ from about 17.1K reviews, **Mature 17+**, updated Sep 14 2026 (Scripts and lorebooks, deep links, notification routing). [doc]

**Core loop and screens.**
- **Discovery:** home, search, trending and recent chats [doc: launch post]. "Similar characters" was added in Aug 2026 and public chats in Mar 2026 [doc].
- **Character page:** description, tags, creator, comments; then **chat**.
- **Chat screen:**
  - streaming replies
  - **swipes** (regenerate or alternative replies)
  - edit messages
  - **chat memory**
  - generation settings, including the Jul 2026 "shorter responses" option
  - API settings: JLLM, janitor+ models, or a proxy or own API key; Router is **web-only** for now, "coming to mobile"
  - **personas**
  - scripts and lorebooks [doc]
- **Profile:** badges, such as the "golden mop" given to beta users and the janitor+ badge and golden name [doc].
- **Create character** flow [doc].

**Monetization today.**
- **Free:** unlimited chats on JLLM with about 9k tokens of context. No published daily cap. [doc]
- **janitor+** (launched Jun 24 2026), **$12.99 a month**, the only IAP on Play:
  - **5× context** (about 40–45k tokens)
  - **unlimited priority messages**, which implies free users wait in a queue at peak times
  - **monthly swipes with "our best models"**; one blog says 60 a month with a 13-hour refresh [3p, verify]
  - cosmetics: badge, golden name, comment emojis [doc]
  - No trial [3p]
- **janitor+ Router** (Jul 30 2026, web-only): a per-token wallet for about 70 third-party models (Claude, GPT, Gemini, DeepSeek…), 10% off for subscribers, $5 launch credits [doc].
- **Ads:** none in the app. On **Sep 2 2025 Janitor ran "testing an ad"**: a single ad on character pages for logged-out web users, "to fund JLLM v2 and keep the model free" [doc]. That makes them a live prospect for Simula's native and rewarded formats.

**Account and login.** Registration is required to chat: email, username and password with an 18+ confirmation, or Google, Discord or Twitter [3p]. Age verification is mandatory in Brazil, Australia and the UK [doc].

**Content risk: high.** Bots labeled "Limitless" are NSFW. On mobile, **restricted mode is on by default**: bots with high content scores are blocked, character definitions are hidden, and names and descriptions are filtered. Turning NSFW on for mobile can only be done at `janitorai.com/profile-settings`, not inside the app [doc]. Even so, thumbnails and user-generated text can be suggestive. Simula's SDK has an `nsfw` flag in its ad context, which suggests Simula does handle such inventory [doc: SDK types].

**What makes exploration hard.**
- Google OAuth sign-in in an external tab.
- An effectively endless user-generated feed, which causes state explosion. Collapse lists into templates such as "character card".
- Content that changes between runs.
- Streaming replies, and waiting in the queue at peak times.
- Beta bugs, especially on Android [doc].
- Any NSFW that leaks through should be stored with blurred screenshots.
- The janitor+ purchase sheet must never be confirmed.

**Mapping to Simula** [inf]. The existing anchors are all janitor+ entitlements: skip the queue at peak, a few premium-model swipes, and a 24-hour boost to extended context. Because JLLM is free and unlimited, most ideas are **product changes**, not existing opportunities. Placements must be brand-safe and restricted to SFW surfaces.

---

### 1.3 Luzia (luzia.com), package `co.thewordlab.luzia`, developer Factoria Elcano SL

**What it is.** A general AI assistant in Spanish, Portuguese and English: writing, study, code, translation, image generation, audio transcription, reminders, weather and news, with "expert assistants and characters". It is WhatsApp-first in Latin America and Spain and also has a native app and web. The app requires **"No sign-up, no setup."** [doc]
- **A big redesign shipped on Sep 18 2026:** "revamped… The best AI models for every task • Advanced tools • Voice responses • A fresh new look". Simula's hand-made slides very likely show the **old UI**, so expect differences. [doc/inf]

**Scale.**
- Claims 80–85M+ users in 40+ countries; #1 app in 5+ countries [doc].
- Play: 10M+ installs (about 41.6M), 4.25★ from about 149K reviews, rated Everyone, **Contains ads** [doc]. iOS: Education category, 13+ [doc].
- Raised about $49M (Prosus, Khosla…); Series C in May 2025 [doc].

**Core loop and screens** [verify after the redesign]:
- Chat with Luzia, with text and voice input and spoken voice responses.
- Tools: Create image, Upload image, Upload PDF, Web search, Summarize, Writing.
- Characters or "Friends": Luzia, Professor, Bestie, Chef, Trainer, plus the ability to create your own (a Luzia+ feature).
- A "Feed" for discovery.
- Account screen, including Delete account.
- Reminders. [doc: chat.luzia.com, help]

**Monetization today.**
- **Luzia+:** Weekly $1.99, Monthly $4.99, Annual $39.92–39.99 (regional pricing; Chile, for example, CLP 1,990 / 5,990 / 49,990). **3-day free trial** on every plan [doc: T&C, App Store].
- **Luzia+ entitlements:** ad-free, "2× longer images and chats" (double the limits), advanced reasoning mode, multiple custom AI friends, higher-quality images and an image-editing tool, exclusive tools [doc].
- **Free limits:** daily caps on messages and images. The number is not published. Historically there were 5 images a day, and WhatsApp messages are capped with users pointed to the app [3p/doc]. Reviews say "now everything has limits" and "full of ads" [doc: reviews].
- **Ads today:**
  - **Native contextual "sponsored answers" in chat through Koah** (a Simula competitor), rolled out to 50%+ of inventory, with 2× eCPM and 1.5× CTR compared with legacy networks [doc: Koah case study]. The T&C says "LUZIA may show you commercial recommendations… based on the context of the conversation."
  - Legacy ad networks were used before Koah, probably display ads, interstitials, or both. [inf]
- Quote from Luzia's Head of Product: *"Monetization is the only way to keep our app free—but traditional ad formats can be so intrusive."*

**Relationship to Simula** [inf]. Simula's reference slides are all about Luzia: rewarded games in chat after running out of free messages, proactive "Refills" on the home screen, and "Daily Tasks" with games and a sponsor ad. The SDK's **default** `RewardInvitation` copy is literally "You've Run Out of Free Messages Today / Play a quick game to unlock free messaging for the rest of the day?". Luzia is almost certainly a Simula customer or active prospect, and it also works with a competitor, Koah.

**Content risk: low** (rated Everyone; users 13+ in Latin America and 14+ in the EU).

**What makes exploration hard.**
- **Third-party ads:** full-screen interstitials can take over the explorer, and **tapping an ad opens the browser or Play Store**. The explorer needs an ad-overlay detector and a close or back policy.
- Permission prompts: microphone, notifications, photos.
- The launch paywall or trial upsell may appear on first open [verify].
- The language follows the device locale. Pin the emulator to en-US, or run es-419 for authenticity.
- Reaching the **daily message cap** can take many messages. Budget time for it, because this is the key monetization state.
- Frequent A/B tests, and a UI that just changed.

**Mapping to Simula** [inf]. The existing anchors are the message cap, the image cap, Luzia+ entitlements (advanced reasoning, HQ images) and characters. They map straight onto Simula's canonical flow. A strong proposer should **go beyond the three reference slides**: for example, rewarded "advanced reasoning for this answer", an extra HQ image or edit, a character-specific sponsored mini-game, or a rewarded extra reminder or voice minutes.

---

### 1.4 AOL (AOL: Email News Weather), package `com.aol.mobile.aolapp`, developer AOL Media LLC

**What it is.** A portal app combining mail (1 TB storage), news aggregation, weather and video. It also has Packages tracking, gift cards and coupons, unsubscribe suggestions, multi-account support and in-app help. [doc]

**Scale and ownership.**
- Play: 10M+ installs (about 15.1M), 4.1★ from about 186K reviews, Everyone 10+, **Contains ads** [doc]. iOS: 4.6★ from about 706K ratings [doc].
- Owned by **Bending Spoons**, which bought it from Apollo/Yahoo for about $1.5B, closing in Jan 2026. It cited "30 million active users" and laid off more than 100 people in Feb 2026 [3p/Wikipedia]. Expect aggressive monetization changes.

**Core loop and screens.**
- **Home/News stream**, the default launch screen, which some users dislike; article pages; save for later; share.
- **Mail**: inbox, message, compose, filters (unread, starred, attachments, people, travel), smart views (Packages, Gift cards, Coupons/Deals), account switcher.
- **Weather**: hourly, daily and alerts.
- **Video**.
- Settings: notifications, and customizable navigation and default screen (Plus only). [doc]

**Monetization today.**
- **Ads:** paid native ads in the **inbox** and display ads on article pages (they persist under the "ad-lite" plan because of contract obligations), plus video ads [doc/inf].
- **AOL Mail Plus:** $1.99 a month or $19.99 a year. No paid ads in the inbox, "ad-lite" articles, customizable default screen and navigation. US only, inside the app only [doc].
- **AOL Plus:** weekly $2.99–4.99 or yearly $29.99–49.99, with a trial.
- **Security bundle:** $4.99–99.99. Other ad-free and support plans on aol.com (such as $4.99 a month) [doc].
- Play lists IAP of $1.99–$99.99 [doc].

**Account and login.** Mail needs an AOL account, which uses a Yahoo-style identity with phone verification at signup [inf, verify]. It is unclear whether news works without signing in [verify].

**Content risk: low**, but news content is uncontrolled.

**What makes exploration hard.**
- **Personal data in the inbox.** Use a fresh account. Screenshots of real mail must not be stored or shipped.
- News and ads change every minute. The diffing must ignore content and compare structure only.
- Autoplay video.
- Consent and privacy screens.
- Ads that open the browser.
- Sign-in may go through a web view.

**Mapping to Simula** [inf]. There is no scarce resource. The one existing anchor is "ad-free", which can be sold as a **time-boxed rewarded pass** ("play 15s → ad-free inbox until midnight"), but that cannibalizes the $1.99 Plus plan. Everything else is a **product change**: rewarded premium weather radar or alerts, a rewarded "digest" of top stories, or an AOL Games tie-in. This makes AOL a good test of whether the judge rejects weak or harmful ideas.

---

## 2. Ranking: which app to go deepest on

Criteria and weights: mechanics richness 30%, explorability 20%, relevance to Simula 20%, content safety (higher = safer) 10%, differentiation from Simula's Luzia slides 20%. Scores are 1–5.

| App | Mechanics | Explorability | Simula relevance | Content safety | Differentiation | **Weighted** |
|---|---|---|---|---|---|---|
| **OOC** | 5: currency, mode prices, check-in, challenges, store, expiry, surcharge, branching | 3: Google/Apple sign-in; exploring spends credits; the cap is reachable in one session | 5: AI character entertainment, Simula's own category ("starting with gaming and entertainment"; publishers like Moescape and Komiko) | 3: Teen rating; adult titles behind verification | 5: nothing like it in Simula's slides | **4.4** |
| Luzia | 3: message and image caps, Luzia+, ads (Koah native) | 5: no account needed; but ad overlays and permissions | 5: AI chat; almost certainly a Simula target | 5 | 1: this is Simula's reference deck | **3.6** |
| JanitorAI | 2.5: free and unlimited; only janitor+ entitlements are scarce | 3: sign-in; restricted mode; endless user-generated feed | 4.5: 15M users, tested ads to fund its model | 1.5 | 4 | **3.2** |
| AOL | 2: no scarce resource; already ad-saturated | 2.5: personal data, dynamic content, ad overlays | 2.5: consumer app but not AI chat | 4.5 | 5 | **3.05** |

**Recommendation: go deepest on OOC.** Reasons:

1. **The product model is richest where the assignment grades it.** The assignment asks for "what changes after an action" and existing mechanics such as paywalls, limits, currencies and entitlements. In OOC every message **visibly decreases a numeric credit counter**, which the explorer can discover and attribute on its own ("action X costs 90 credits in mode Superb"). That is a strong demo of state diffing, not a scripted one.
2. **Both proposal cases appear on one app.** The *existing* case is credits, check-in and Challenges. The *product change* case is a Refill Station with a free tab next to the paid packs (shown after the user declines the paywall), rewarded creator sponsorship built on the existing "Sponsorship" credit type and 2% creator share, and diegetic mini-games in which the story's character is the Game Partner.
3. **The judge has a real trade-off to weigh.** OOC makes about $7M a month from IAP, so cannibalization, reward sizing relative to the $1.39 pack, eligibility for payers versus non-payers, and daily caps all matter. A judge that only checks for "is it an ad placement" would fail here, so this app shows judgment.
4. **Customer voice:** the Play review line "maybe adding videos to watch for credits would help" is a perfect opening for the slide deck.
5. **Originality:** it is not Luzia, so any strong ideas are clearly the system's own.

**Backup: Luzia.** Switch triggers, checked at the end of day 1:
- (a) Google sign-in cannot be automated or kept alive on the emulator, or
- (b) OOC's accessibility tree is empty or opaque (for example a canvas or Flutter app without semantics), or
- (c) the credit wall cannot be reached reliably.

**Use Luzia either way as the judge calibration app.** Encode Simula's three hand-made Luzia ideas as positive examples, plus 5–8 deliberately weak ones (for example a banner on the paywall, a rewarded ad forced mid-answer, a reward larger than a week of Luzia+) as negatives. Measure whether the judge ranks them correctly. This directly answers "How do you know the judge is good?"

**Transfer set:** run Luzia at medium depth (no sign-in, and it gives calibration), then JanitorAI and AOL shallow (about 15–25 screens each). AOL shows that the system recognizes "no strong mechanic, so a product change is required". JanitorAI shows that it handles restricted and NSFW content and entitlement anchors.

**Device notes that apply to all apps.**
- **The iOS Simulator cannot install App Store apps.** Use the **Android emulator** on Apple Silicon with an arm64 **Google Play** system image (for example a Pixel with API 34 or 35), so apps can be installed from the Play Store and Google sign-in works.
- Sign in manually once, snapshot the AVD (`-snapshot`), and restore that snapshot before each run to get deterministic starting states.
- On day 1, run `adb shell uiautomator dump` on each app's home screen to check the quality of its accessibility tree.

---

## 3. Simula: what they sell, and their vocabulary

**Company.**
- Simula Inc., San Francisco, founded 2025, 2–10 people. **a16z speedrun cohort SR006.** CEO and founder Yizhen Zhen (ex-Google software engineer, ex-Bain Capital, HBS/Dartmouth).
- Taglines: "Ads that feel alive." / "Fixing advertising for good" / "Ads that Add". LinkedIn: *"The AdTech layer for consumer AI, starting with gaming and entertainment."*
- Website call to action: *"Tell us about your surface."*
- Claimed traction: *"integrating into AI apps covering 5M+ DAUs and 100M+ downloads, representing ~$10M+ in net revenue at full rollout"* (elsewhere "6M+ DAUs"). A marketing line cited in search results claims about 3× the payout of traditional ads, "with experiences, not interruptions" [3p snippet].

**Formats** (speedrun, SOTA2, docs):
- *"Sponsored AI characters with monetization built in (rewarded video, end screens, and intrinsic placements)"*
- *"AI brand ambassadors, games users play with AI companions"*
- *"intrinsic brand moments, and AI-native mini-games"*
- Direct character sponsorship
- *"lightweight SDK… wire up in about 30 minutes"*
- Brands pay by impression.

**Ad units** (docs.simula.ad, publisher dashboard at `publisher.simula.ad`):

| Ad unit | ID prefix | What it is |
|---|---|---|
| **Native Character Ads** | `SIM-NAT-xxxxxxxx` | "Native ads displayed inline within your feed". Recommended every 10 items in character feeds; collapses to zero when there is no fill. |
| **Interstitial Ads** | `SIM-INT-…` | "Full-screen mini-games shown at transition points", where "users play a sponsored mini-game with an AI character". Placed "between sessions, after a conversation ends, or at a message threshold". |
| **Rewarded Ads** | `SIM-RWD-…` | "Users play a mini-game, then claim an in-app reward". **Play-to-earn**, with **Server-Side Verification (SSV)**. |

Rewarded Ads lifecycle:
- Events fire in this order: `EARNED_REWARD` (client), then `REWARD_VERIFIED` with a token. Rewards are granted on `REWARD_VERIFIED`, and an optional SSV callback POST can follow.
- A loaded ad expires after 1 hour. Duplicate requests within 5 minutes are deduplicated. The next ad auto-preloads.
- The character comes along (`charId`, `charName`, `charImage`, `charDesc`): *"the character commentates, competes, and engages with the user during gameplay."*

Other SDK pieces and terms:
- **Frequency cap check** is called before showing an offer.
- **CharacterSelector:** a roster of characters to play with, topped up with Simula's defaults if the app supplies fewer than 4.
- Events: `IMPRESSION` (at least 50% visible for at least 1 second, the MRC standard), `CLICKED`, `PAID` (estimated per-impression revenue), `CLOSED`.
- **Publisher metadata:** up to 10 key/value pairs for reporting.
- The Reporting API has impression-level and aggregate reports. The docs also cover app-ads.txt and SKAN, and privacy via TCF v2.2, CCPA and GPP.

**Web/React SDK (`@simula/ads` 1.4.x)** shows the in-chat vocabulary:
- `InChatAdSlot`: contextual ads computed from `messages`.
- `NativeBanner`: slot, position and context, where `NativeContext` includes an `nsfw` flag.
- `SponsoredSuggestions`.
- `MiniGameMenu`: grid of 3, 6 or 9 games with a banner on top. Its `entryPoint` is `'button' | 'invitation' | 'interstitial'`.
- `MiniGameInviteKit`, with four parts:
  - `Invitation`: a slide-in card.
  - `Button`: can pulse and show a badge dot.
  - `Interstitial`: "Want to play a game?"
  - `RewardInvitation`: the character labeled **"Game Partner"**.
- `RewardedMiniGame`: **`minPlayThreshold` clamped to 10–30 s, default 15 s**, with `onRewardVerified`.
- Viewability through OMID, bot detection, and Aditude header bidding.
- Native SDKs exist in Kotlin/Compose, Swift/SwiftUI and React Native (`@simula/ads-react-native`), and the code references a Flutter SDK. Publishers named in their docs: **Komiko** (AI anime and comic creation) and **Moescape** (anime AI characters, NSFW-heavy), which confirms that AI-character entertainment is their core market.
- **Default reward copy in the SDK:** title *"You've Run Out of Free Messages Today"*, sub-text *"Play a quick game to unlock free messaging for the rest of the day?"*, CTA *"Play Now"*, close *"No Thanks"*.

**Competitors to know:**
- **Koah** runs native sponsored answers inside Luzia.
- ChatAds (affiliate links), Imprezia (sponsored mentions in answers), Aryel, Dappier, Adgentic, AgentVine.
- OpenAI's own ChatGPT ads (after the chat, excluding sensitive topics).
- Simula's difference: **interactive, character-driven, rewarded** units, not text placements.

**How to speak their language in slides and proposals.** Describe each placement as **surface → trigger → ad unit (NAT/INT/RWD) → Game Partner → min play → REWARD_VERIFIED → grant**. Name the entry point (button, invitation or interstitial). Mention frequency caps and SSV. Say "rewarded mini-game with [app character]" rather than "rewarded video" unless video is the better fit. Frame the outcome as "serially monetize non-payers without cannibalizing IAP or subscriptions" (their Luzia slide 2 says "non-paying users become serially monetized"). Every flow should end on "user receives value", as the assignment asks.

---

## 4. Ground-truth checklists (for scoring explorer recall)

Priority levels: **P0** = must discover for a credible product model; **P1** = should; **P2** = nice to have. Types: `screen | modal | mechanic | entitlement | flow | ad | state | external`.

**How to score recall.**
- Map each item to a node in the product model, either by matching the LLM against screen and mechanic names or by a manual check.
- Recall = matched ÷ total, weighted P0 = 3, P1 = 2, P2 = 1.
- Report the P0 recall separately.
- Also report **false mechanics**: things the model claims exist but do not (precision).
- **Items marked [verify] must be confirmed in a 20-minute manual pass before scoring.** Drop or fix any that turn out wrong, and date the checklist.

A machine-readable copy is in `research/ground-truth.json`.

### 4.1 OOC

| ID | P | Type | Item the explorer should find |
|---|---|---|---|
| OOC-01 | P0 | flow | Sign-in: Continue with Google / Apple (goes out to system UI: record it, don't drive it) |
| OOC-02 | P1 | state | Signup bonus credits granted (about 500) |
| OOC-03 | P1 | modal | Age or profile info; adult titles gated behind 18+ verification |
| OOC-04 | P0 | screen | Home: credit balance icon at top; genre tabs (Main, Rankings, genres); Story and Character cards |
| OOC-05 | P0 | screen | Bottom navigation, including My Titles and MY (profile) [verify exact tabs] |
| OOC-06 | P0 | screen | Title detail page (synopsis, creator, start or continue, menu → Report) |
| OOC-07 | P0 | screen | Session (story or chat) screen: message list, input, Suggested Replies, edit or delete message |
| OOC-08 | P0 | mechanic | **Mode selector** with costs: Superb 90, Skillful 60, Extensive 60, Basic 30 (Story); Premium Mode 20 (Character); Basic Character chat free |
| OOC-09 | P0 | state | **Credit balance decreases after each message**, by an amount that depends on the mode (action → resource delta) |
| OOC-10 | P0 | state | **Insufficient-credits state** in a session and whatever upsell or paywall it triggers |
| OOC-11 | P0 | screen | Credit store: "Refill Credits Now!" tab, packs with prices, "Refill Now" |
| OOC-12 | P1 | external | Google Play billing sheet opens (record it, do not confirm) |
| OOC-13 | P0 | mechanic | **Daily Check-in** reward (about 300 credits) as a modal or card |
| OOC-14 | P0 | mechanic | **Challenges** list; completing one grants credits and an Achievement Badge |
| OOC-15 | P1 | screen | Credit History: Purchase and Usage (Usage, Acquisition, Sponsorship) |
| OOC-16 | P2 | mechanic | Free-credit expiry after 30 days; spend order by expiry |
| OOC-17 | P1 | mechanic | Real-time **scene image** button under messages, and an image gallery [verify whether it costs credits] |
| OOC-18 | P1 | mechanic | **Session Branching** (branch icon; branching free, messages cost credits) |
| OOC-19 | P1 | screen | Session Settings: Memories (Long-term, Temporary, Relationships, Goals), User Note, Avatars |
| OOC-20 | P1 | mechanic | **Output Length** setting with a surcharge per 100 tokens over 800 |
| OOC-21 | P1 | screen | MY: Achievement Badges and Featured Badge; Settings (My Information, Notifications) |
| OOC-22 | P2 | screen | Personalization: genre filter, tab order, adult toggle (after verification) |
| OOC-23 | P2 | flow | Create Story, 8 steps (Profile → Basic Settings → Intro → Stat → Media → Keyword Book → Endings → Publish) and Create Character |
| OOC-24 | P2 | screen | Creator program surfaces (Certified Creator, OOC Originals) |
| OOC-25 | P1 | state | **No third-party ads anywhere** (the product model should say so explicitly) |
| OOC-26 | P2 | modal | Push-notification permission prompt |
| OOC-27 | P2 | state | Error states: "Credits are already in use", "A temporary error occurred", model-safety block message |

### 4.2 Luzia

| ID | P | Type | Item |
|---|---|---|---|
| LUZ-01 | P0 | flow | Onboarding **without an account** (straight to chat) [verify the redesigned onboarding] |
| LUZ-02 | P1 | modal | First-run Luzia+ trial or paywall, if shown [verify] |
| LUZ-03 | P0 | screen | Home (new Sep 2026 design): entry to chat, tools, characters or friends [verify layout] |
| LUZ-04 | P0 | screen | Chat screen: text input, send, streaming answer, message actions |
| LUZ-05 | P1 | mechanic | Voice input (mic permission, which is external) and **voice responses** |
| LUZ-06 | P0 | mechanic | **Image generation** ("Create image"/"Imagina") and the image result view |
| LUZ-07 | P1 | mechanic | Upload image or PDF (photo picker or file picker is external: record it, move on); web search toggle |
| LUZ-08 | P1 | screen | Characters or "Friends": Luzia, Professor, Bestie, Chef, Trainer; create character (gated by Luzia+) |
| LUZ-09 | P0 | state | **Daily message limit reached** state and its upsell |
| LUZ-10 | P0 | state | **Daily image limit reached** state and its upsell |
| LUZ-11 | P0 | screen | **Luzia+ paywall**: weekly $1.99, monthly $4.99, annual about $39.99, 3-day trial; entitlements (ad-free, 2× limits, advanced reasoning, HQ images and editing, multiple AI friends) |
| LUZ-12 | P0 | ad | Ads in the free tier: format and placement (interstitial, banner, native) |
| LUZ-13 | P1 | ad | Contextual sponsored recommendation or answer inside the chat (Koah native) [verify frequency] |
| LUZ-14 | P1 | mechanic | Advanced reasoning mode toggle (locked for free users) [verify] |
| LUZ-15 | P2 | screen | Feed or discovery surface [verify it survives the redesign] |
| LUZ-16 | P2 | mechanic | Reminders, weather and news utilities |
| LUZ-17 | P2 | screen | Account and settings, including Delete account and optional sign-in |
| LUZ-18 | P2 | modal | Notification permission prompt |

Calibration note: Simula's three hand-made Luzia ideas are (1) rewarded games in chat after free messages run out, (2) proactive "Refills" on the home screen, and (3) "Daily Tasks" with character games and a sponsor ad. Use them as the **positive golden set for the judge**. The proposer should reproduce them *and* go beyond them.

### 4.3 JanitorAI

| ID | P | Type | Item |
|---|---|---|---|
| JAN-01 | P0 | flow | Login or register (email, Google, Discord); 18+ confirmation |
| JAN-02 | P0 | screen | Home or discover feed of character cards with tags; trending |
| JAN-03 | P1 | screen | Search, and "similar characters" |
| JAN-04 | P0 | screen | Character page: description, tags, creator, comments, Start chat |
| JAN-05 | P0 | screen | Chat: streaming reply, **swipe or regenerate**, edit message |
| JAN-06 | P1 | screen | Chat memory; generation settings (response length, "shorter responses") |
| JAN-07 | P1 | screen | API or model settings: JLLM vs janitor+ vs proxy (Router web-only) |
| JAN-08 | P1 | screen | Personas: create, edit, swap |
| JAN-09 | P0 | screen | **janitor+ paywall**: $12.99/mo; 5× context, priority messages, premium-model swipes, badge |
| JAN-10 | P1 | state | Free-tier queue or "high traffic" wait (the priority entitlement's counterpart) [verify] |
| JAN-11 | P1 | state | **Restricted mode on by default**: filtered content; setting points to the website |
| JAN-12 | P1 | screen | Recent chats list |
| JAN-13 | P2 | flow | Create character; Scripts and lorebooks |
| JAN-14 | P2 | screen | Profile with badges (golden mop, janitor+) |
| JAN-15 | P1 | state | No ads in the app |
| JAN-16 | P2 | modal | Push-notification permission |

### 4.4 AOL

| ID | P | Type | Item |
|---|---|---|---|
| AOL-01 | P1 | modal | Consent or privacy screen on first run |
| AOL-02 | P0 | flow | Sign-in (AOL ID); whether news is usable signed out [verify] |
| AOL-03 | P0 | screen | Home or news stream (default launch tab) with category sections |
| AOL-04 | P0 | ad | **Sponsored or native ad cards in the news stream** |
| AOL-05 | P0 | screen | Article page with display ads; save for later; share |
| AOL-06 | P0 | screen | Mail inbox, including **native ad rows in the inbox** |
| AOL-07 | P1 | screen | Message view and compose |
| AOL-08 | P1 | screen | Smart views: Packages, Gift cards, Coupons/Deals, Attachments; filters |
| AOL-09 | P0 | screen | Weather: current, hourly and daily; alerts (location permission is external) |
| AOL-10 | P1 | screen | Video tab and player (pre-roll or mid-roll ads) [verify] |
| AOL-11 | P0 | screen | **AOL Mail Plus paywall**: $1.99/mo or $19.99/yr; ad-free inbox, ad-lite articles, custom default screen and navigation |
| AOL-12 | P2 | screen | AOL Plus and Security bundle offers |
| AOL-13 | P2 | screen | Settings: notifications, navigation customization (Plus-gated) |
| AOL-14 | P2 | external | Ad tap opens the external browser (record it, move on) |

---

## 5. Implications for the build (short)

1. **Explorer budget and safety rules**, needed because of these apps:
   - never confirm billing (`com.android.vending`)
   - detect and close ad overlays
   - treat camera, photos, mic, OAuth and browser as external leaves
   - wait for streaming to finish before snapshotting
   - store screenshots with personal data blurred or excluded (AOL)
   - hard cap on credit spend per run (OOC)
2. **State identity:** hash of the structural skeleton of the accessibility tree (roles, resource IDs, layout buckets) with text and image content stripped. This handles user-generated feeds (JanitorAI) and news (AOL). Separately, track **numeric resource widgets** (OOC credits, Luzia remaining messages, if any) so that "what changed after an action" becomes a first-class resource delta in the product model.
3. **Product-model schema** should have first-class `resources` (currency or limit, its sources and sinks, reset cadence, expiry), `entitlements` (free vs paid), `paywalls` (trigger, plans, prices), and `ads_present` (format and surface). The ground-truth IDs above map directly onto these.
4. **Judge criteria to include** (OOC exercises all of them): value-exchange strength; how naturally it fits the core loop; IAP or subscription cannibalization, with eligibility rules (non-payers, after the user declines the paywall) and reward sized below the cheapest pack; frequency cap and daily ceiling; brand safety (NSFW-adjacent surfaces excluded); feasibility with Simula units (NAT/INT/RWD, SSV); measurable KPI. Calibrate on the Luzia golden set.

---

## Sources

- OOC:
  - [Google Play](https://play.google.com/store/apps/details?id=com.newai.ooc&hl=en_US)
  - [App Store](https://apps.apple.com/us/app/ooc-the-playable-anime/id6761247061)
  - [App Store reviews](https://apps.apple.com/us/app/ooc-the-playable-anime/id6761247061?see-all=reviews&platform=iphone)
  - [OOC Help Center](https://help.ooc.ai/), including its Badge, Scene Image, Story guide and Media guide pages
  - [ISEKAI ZERO guide](https://www.isekaizero.ai/blog/ooc-the-playable-anime), [free credits](https://www.isekaizero.ai/blog/ooc-free-credits), [review](https://www.isekaizero.ai/blog/ooc-review) (a competitor's blog)
  - [BusinessWire launch release](https://www.businesswire.com/news/home/20260415199414/en/Wrtn-Technologies-Unveils-its-AI-Interactive-Storytelling-Platform-OOC-The-Playable-Anime-in-North-America)
  - [CryptoBriefing on Wrtn's $870M valuation](https://cryptobriefing.com/wrtn-870m-valuation-global-expansion/)
  - [Fortune on Wrtn](https://fortune.com/2026/03/05/korea-startup-wrtn-arr-antler-loneliness-epidemic-ai-entertainment/)
  - [Crack Help Center](https://help.crack.wrtn.ai/)
- JanitorAI:
  - [Google Play](https://play.google.com/store/apps/details?id=com.janitor.ai)
  - [App public beta post](https://janitorai.com/news/announcements/23/)
  - [Mobile content moderation post](https://janitorai.com/news/announcements/20/)
  - [Announcements index](https://janitorai.com/news/announcements)
  - ["testing an ad" post](https://janitorai.com/news/announcements/9)
  - [janitor+ FAQ](https://help.janitorai.com/en/article/faq-subscription-janitorai-1o8ccf2/)
  - [Router announcement](https://janitorai.com/news/announcements/introducing-janitor-router/)
  - [DreamGen on janitor+](https://dreamgen.com/blog/articles/janitor-plus-explained)
  - [UsagePricing](https://www.usagepricing.com/blueprint/janitor-ai)
  - [janitorai.best review](https://janitorai.best/en/)
  - [Similarweb](https://www.similarweb.com/website/janitorai.com/)
- Luzia:
  - [Google Play](https://play.google.com/store/apps/details?id=co.thewordlab.luzia&hl=en_US)
  - [App Store US](https://apps.apple.com/us/app/luzia-your-ai-assistant/id6472703434), [App Store CL](https://apps.apple.com/cl/app/luzia-tu-asistente-virtual-ia/id6472703434)
  - [Terms and conditions](https://www.luzia.com/en/terminos-y-condiciones-app)
  - [Web chat](https://chat.luzia.com/en), [New home page](https://www.luzia.com/en/new/home), [Help](https://www.luzia.com/en/help)
  - [Koah case study](https://www.koahlabs.com/customers/luzia)
  - [Series C post](https://www.luzia.com/en/blog/spanish-ai-company-luzia-closes-a-new-13-5-million-funding-round-led-by-prosus-ventures)
  - [Agent Finder review](https://agent-finder.co/reviews/luzia), [Simone review](https://simone.app/blog/luzia)
- AOL:
  - [Google Play](https://play.google.com/store/apps/details?id=com.aol.mobile.aolapp&hl=en_US)
  - [App Store](https://apps.apple.com/us/app/aol-email-news-weather-video/id646100661)
  - [AOL app page](https://www.aol.com/products/utilities/aol-app), [AOL Mail Plus](https://www.aol.com/products/utilities/aol-mail-plus)
  - [Wikipedia: AOL](https://en.wikipedia.org/wiki/AOL)
- Simula:
  - [simula.ad](https://www.simula.ad/)
  - [a16z speedrun profile](https://speedrun.a16z.com/companies/simula)
  - [Docs: creating an ad unit](https://docs.simula.ad/getting-started/creating-an-ad-unit), [RewardedAd (Kotlin)](https://docs.simula.ad/kotlin-sdk/rewarded-ad), [RN quick start](https://docs.simula.ad/react-native-sdk/quick-start), [RN RewardedAd](https://docs.simula.ad/react-native-sdk/rewarded-ad), [Interstitial](https://docs.simula.ad/react-native-sdk/interstitial-ad), [Native ad](https://docs.simula.ad/react-native-sdk/native-ad-slot), [CharacterSelector](https://docs.simula.ad/react-native-sdk/character-selector)
  - npm packages `@simula/ads@1.4.2` and `@simula/ads-react-native@1.4.1`, including their READMEs and type definitions (inspected locally)
  - [LinkedIn](https://www.linkedin.com/company/simula-ad), [SOTA2](https://www.sota2.com/products/simula-simula-ads)
