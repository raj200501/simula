# Janitor — product model digest

Captured 2026-09-25, account state: logged-in. Regime (computed): **subscription-gated**.

## Brief

- One-liner: An AI character roleplay and exploration platform offering custom chat scenarios, community-created bots, and subscription perks.
- Audience: Fans of AI chatbot roleplay, creative writing, anime, and fictional character interactions.
- Core loop: Browse or search for AI characters and chat scenarios → View character details and reviews → Start a chat and interact with the selected character
- How it makes money today: Through the Janitor Plus subscription tier, which unlocks enhanced memory context, priority routing, monthly model swipes, and a golden username badge.
- What is scarce: Chat context memory; Model reply speed; Frontier model swipes
- Ads today: None observed during exploration.
- Open questions: What are the specific monthly pricing tiers and exact swipe quotas for Janitor Plus?; Are there token-based consumables or is token count purely informational?

## Economy (every item has evidence; conf=inferred means not verified on screen)

- OFFER of1 [subscription] "Janitor Plus" See janitor+ grants   per monthly + 5x context for better memory, Priority routing for faster replies, Generous monthly swipes with our frontier models, Golden checkmark next to your username on More memory for
long chats.
- WALL w1: blocks "Access advanced chat memory and priority"; shows More memory for
long chats.; offers of1; decline edge g0015
- ENTITLEMENT plan "Janitor Plus": 5x context for better memory; Priority routing for faster replies; Generous monthly swipes with our frontier models; Golden checkmark next to your username
- AD TODAY: none observed

## Derived numbers (computed in code from observed prices and cited constants — use these, do not recompute)

- value of one completed rewarded view (after non-game haircut): US $0.009–0.015, EU $0.0038–0.0067, LATAM $0.0015–0.003
- cheapest paid pack: none observed
- note: No priced packs observed: unit prices, action costs and exchange rate are unavailable.
- note: No daily free source observed.

## Moments (where a value exchange could happen)

- m1 [wall] on s03 (More memory for
long chats.), reach=frequent: "Access advanced chat memory and priority" is blocked: More memory for
long chats. appears and points to 1 offer(s)
- m2 [decline] on s03 (More memory for
long chats.), reach=frequent: The user dismisses More memory for
long chats. ("Close paywall") without buying and returns to More memory for
long chats.
- m3 [decline] on s04 (Janitor Plus Paywall), reach=rare: The user leaves Janitor Plus Paywall without buying
- m4 [desire] on s02 (@8iyiyiyiy), reach=core-loop: @8iyiyiyiy shows an upsell: "Upgrade to Janitor Plus"
- m5 [first-value, NO OFFERS ALLOWED] on s01 (Build, Share, Explore), reach=core-loop: Build, Share, Explore is the first screen with core content after launch: no offer may appear here
- m6 [desire] on s09 (Character Details), reach=occasional: User views character details and reviews before initiating a chat.

## Flows

- f1 [core] App Navigation & Character Discovery: Build, Share, Explore (launch) → @8iyiyiyiy (Tap the unlabeled icon) → Explore Characters (Close drawer while "Main navigation" is selected (auto:TextView||#|2 −146))
- f2 [monetization] Hit the wall: More memory for
long chats.: Build, Share, Explore (launch) → @8iyiyiyiy (Tap the unlabeled icon) → More memory for
long chats. (Upgrade to Janitor Plus while "Main navigation" is selected)

## Screens (id, kind, name — purpose; key texts; actions)

### s01 [page] Build, Share, Explore
Content page
- texts: "Close drawer", "Build, Share, Explore", "All", "Limited Only", "Following", "Favorites", "Trending", "Hidden Gems", "24h", "Weekly", "⭐ Trending shows popular characters with the most "
- signals: limit:"Limited Only"
- actions: tap "Limited Only" (monetization) [no-effect]; tap "Limited Only" (monetization) [no-effect]; tap "Hidden Gems" (monetization); tap "Hidden Gems" (monetization) [no-effect]; tap "⭐ Trending shows popular characters wit…" (core loop) [no-effect]; tap the unlabeled icon at top-right; tap "All" [untried]; tap "All" [untried]; tap "Following" [untried]; tap "Favorites" [untried]
- element ids available for callouts: e3="Close drawer", e5="Build, Share, Explore", e6="All", e7="Limited Only", e8="All", e9="Limited Only", e10="Following", e11="Favorites", e12="Trending", e13="Hidden Gems", e14="Following", e15="Favorites", e16="Trending", e17="Hidden Gems", e18="24h", e19="Weekly", e20="24h", e21="Weekly", e22="⭐ Trending shows popular"

### s02 [page] @8iyiyiyiy
Content page
- texts: "Close drawer", "@8iyiyiyiy", "0", "Following", "Followers", "Member Since Sep 24, 2026", "Hidden Gems", "Explore All", "View public profile", "￼Hidden Gems show characters from smaller creators", "Main navigation", "1 / 102", "Blocks", "Snails on the Slope", "154", "Media Library", "Settings", "Billing", "Upgrade to Janitor Plus", "“I don’t expect anything magical. I just want it t", "“I don’t expect anything magical. I just want it t", "Upgrade to", "Get Help", "Feel the air, my favorite reader.", "You, your beloved wife, and a three-day climb toge"
- signals: upsell:"Upgrade to Janitor Plus", upsell:"Upgrade to"
- actions: tap "Hidden Gems" (monetization); tap "Hidden Gems" (monetization); tap "￼Hidden Gems show characters from small…" (monetization); tap "Upgrade to Janitor Plus" (monetization); tap "Upgrade to" (monetization); tap "Close drawer"; tap the unlabeled icon at top-left; tap "@8iyiyiyiy" [untried]; tap "0 Following" [untried]; tap "0" [untried]
- element ids available for callouts: e3="Close drawer", e6="@8iyiyiyiy", e8="0", e9="0", e10="Following", e11="Followers", e12="Member Since Sep 24, 202", e13="Hidden Gems", e14="Explore All", e15="Hidden Gems", e16="Explore All", e18="View public profile", e19="￼Hidden Gems show charac", e20="Main navigation", e21="Main navigation", e22="Following", e23="Following", e25="1 / 102", e26="1 / 102", e27="Blocks"

### s03 [page] More memory for
long chats.
Content page
- texts: "Close paywall", "More memory for
long chats.", "Keep more of the story in context, get faster repl", "Loading products...", "No commitment, cancel anytime.", "Everything in Free, plus:", "5× context for better memory", "Priority routing for faster replies", "Generous monthly swipes with our frontier models", "Golden checkmark next to your username", "More info", "Payment will be charged to your Google Play accoun", "Terms of Service", "Privacy Policy", "Restore Purchases", "•"
- signals: lock:"Keep more of the story in context, get f", upsell:"Everything in Free, plus:", reward:"Everything in Free, plus:"
- actions: tap "Keep more of the story in context, get …" (monetization) [no-effect]; tap "Payment will be charged to your Google …" (monetization) [no-effect]; tap "Restore Purchases" (monetization); tap "More memory for
long chats." (core loop) [no-effect]; tap "Close paywall" [no-effect]; tap "Loading products..." [no-effect]; tap "Loading products..." [no-effect]; tap "No commitment, cancel anytime." [no-effect]; tap "More info" [no-effect]; tap "More info" [no-effect]
- element ids available for callouts: e3="Close paywall", e4="More memory for
long cha", e5="Keep more of the story i", e6="Loading products...", e7="Loading products...", e8="No commitment, cancel an", e9="Everything in Free, plus", e10="5× context for better me", e11="Priority routing for fas", e12="Generous monthly swipes ", e13="Golden checkmark next to", e14="More info", e15="More info", e16="Payment will be charged ", e17="Terms of Service", e18="Privacy Policy", e19="Restore Purchases", e20="•", e21="•"

### s04 [paywall] Janitor Plus Paywall
Promote the Janitor+ subscription offering premium features like longer memory, priority routing, and a golden badge.
- texts: "Close subscription announcement", "JANITOR+ IS HERE", "A better way
to chat.", "Longer memory, priority routing, smarter swipes, a", "5× context for better memory", "Priority routing for faster replies", "Generous monthly swipes with our frontier models", "Golden checkmark next to your username", "See janitor+", "Not now"
- signals: upsell:"A better way to chat.", lock:"Golden checkmark next to your username"
- actions: tap "Close subscription announcement" (monetization); View Janitor+ subscription plans [untried]; tap "A better way
to chat." (core loop) [untried]; tap "JANITOR+ IS HERE" [untried]; tap "Longer memory, priority routing, smarte…" [untried]; tap "5× context for better memory" [untried]; tap "See janitor+" [untried]; Dismiss the subscription modal [untried]; tap "Not now" [untried]; scroll down to reveal more [untried]
- element ids available for callouts: e2="Close subscription annou", e3="JANITOR+ IS HERE", e4="A better way
to chat.", e5="Longer memory, priority ", e6="5× context for better me", e7="Priority routing for fas", e8="Generous monthly swipes ", e9="Golden checkmark next to", e10="See janitor+", e11="See janitor+", e12="Not now", e13="Not now"

### s05 [page] Explore Characters
Discover and select AI characters to chat with.
- texts: "Close drawer", "Build, Share, Explore", "All", "Limited Only", "Following", "Favorites", "Trending", "Hidden Gems", "￼Hidden Gems show characters from smaller creators", ",", "characters", "1 / 102", "8", "3", "4", "5", "Lee Heeseung + ̊⊹♡", "Snails on the Slope", "64", "154", "@captain S", "@Ruby_Enhallitwish", "“I don’t expect anything magical. I just want it t", "“I don’t expect anything magical. I just want it t", "。𖦹°‧ | Your brother is diagnosed with cancer., ──"
- signals: limit:"Limited Only"
- actions: Filter by limited only [no-effect]; tap "Limited Only" (monetization) [no-effect]; View hidden gems [no-effect]; tap "Hidden Gems" (monetization) [no-effect]; tap "￼Hidden Gems show characters from small…" (monetization) [no-effect]; tap "🧑‍🎨 OC" (tab: unexplored navigation); tap "📚 Fictional" (tab: unexplored navigation); Open character chat or details [untried]; Open character chat or details [untried]; tap the unlabeled icon at top-right [untried]
- element ids available for callouts: e3="Close drawer", e5="Build, Share, Explore", e6="All", e7="Limited Only", e8="All", e9="Limited Only", e10="Following", e11="Favorites", e12="Trending", e13="Hidden Gems", e14="Following", e15="Favorites", e16="Trending", e17="Hidden Gems", e18="￼Hidden Gems show charac", e21=",", e22="characters", e23="1 / 102", e24="1 / 102", e25="8"

### s06 [page] Search Page
Search and filter characters with various tags and options.
- texts: "Close drawer", "Search", "All", "Limited Only", "Following", "Favorites"
- signals: limit:"Limited Only"
- actions: tap "Limited Only" (monetization); Type search query [untried]; Filter by All [untried]; Filter by Limited Only [untried]; tap the unlabeled icon at top-right [untried]; tap "Search" [untried]; tap "All" [untried]; tap "All" [untried]; tap "Following" [untried]; tap "Favorites" [untried]
- element ids available for callouts: e3="Close drawer", e5="Search", e9="All", e10="Limited Only", e11="All", e12="Limited Only", e13="All", e14="Following", e15="Favorites", e16="All", e17="Following", e18="Favorites"

### s07 [page] Search Characters
Search and filter AI character profiles.
- texts: "Close drawer", "Search", "🧑‍🎨 OC", "👨 Male", "⛓️ Dominant", "👩‍🦰 Female", "📚 Fictional", "￼", "All", "Limited Only", "Following", "Favorites", ",", "characters", "1 / 295", "8", "1", "0", "Eri", "Willson Wáng", "32.9m", "109", "19m", "24", "@Shxou_Huang"
- actions: tap "1.9k tokens" (monetization) [no-effect]; Search for characters; Select character Eri [untried]; tap "🧑‍🎨 OC" [untried]; tap "👨 Male" [untried]; tap "⛓️ Dominant" [untried]; tap "👩‍🦰 Female" [untried]; tap "📚 Fictional" [untried]; tap "￼" [untried]; tap "￼" [untried]
- element ids available for callouts: e3="Close drawer", e5="Search", e9="🧑‍🎨 OC", e10="👨 Male", e11="⛓️ Dominant", e12="👩‍🦰 Female", e13="📚 Fictional", e14="￼", e15="￼", e16="🧑‍🎨 OC", e17="👨 Male", e18="⛓️ Dominant", e19="👩‍🦰 Female", e20="📚 Fictional", e21="All", e22="Limited Only", e23="All", e24="Limited Only", e25="All", e26="Following"

### s08 [page] Search Characters
Search and filter AI character profiles and chat scenarios.
- texts: "Close drawer", "Search", "friend", "🧑‍🎨 OC", "👨 Male", "⛓️ Dominant", "👩‍🦰 Female", "📚 Fictional", "￼", "All", "Limited Only", "Following", "Favorites", "characters", "1 / 39", "1", ",", "2", "9", "3", "Willson Wáng", "Dominic ", "19m", "24", "5.6m"
- actions: Search for characters [no-effect]; Open character detail; Filter by tag OC [untried]; tap "👨 Male" [untried]; tap "🧑‍🎨 OC" [untried]; tap "👨 Male" [untried]; tap "🧑‍🎨 OC" [untried]; tap "⛓️ Dominant" [untried]; tap "🪢 Scenario" [untried]; tap "👨 Male" [untried]
- element ids available for callouts: e3="Close drawer", e5="Search", e6="friend", e9="🧑‍🎨 OC", e10="👨 Male", e11="⛓️ Dominant", e12="👩‍🦰 Female", e13="📚 Fictional", e14="￼", e15="￼", e16="🧑‍🎨 OC", e17="👨 Male", e18="⛓️ Dominant", e19="👩‍🦰 Female", e20="📚 Fictional", e21="All", e22="Limited Only", e23="All", e24="Limited Only", e25="All"

### s09 [page] Character Details
View detailed information and reviews for a specific AI character before starting a chat.
- texts: "Willson Wáng", "3", ".", "6", "7", "4", "K", "723.2k", "19m", "8", "2", "0", "by: ", "@Shxou_Huang", "Notifications-top", "𓂃 ࣪˖ ִֶָ𐀔 - Your Rich best friend that spoils yo", "★★★", "Willson.. Stop growing a tail please. WHAT IS HAPP", "I think he grew his own consciousness and decided ", "ANYONE WHO USE THIS BOT WILL LIKE MILK BREAD.", "MILK BREAD."
- actions: Start chatting with the character; Go back to the previous screen; tap the unlabeled icon at top-right [untried]; tap "Willson Wáng" [untried]; tap "3" [untried]; tap "3" [untried]; tap "." [untried]; tap "6" [untried]; tap "7" [untried]; tap "6" [untried]
- element ids available for callouts: e6="Willson Wáng", e7="3", e8="3", e9=".", e10="6", e11="7", e12="6", e13="4", e14="4", e15="K", e17="Willson Wáng", e19="723.2k", e20="19m", e22=".", e23="K", e24="8", e25="2", e26="8", e27="2", e28="8"

### s10 [page] Character Detail Page
View character profile, description and start a chat.
- texts: 
- actions: Close profile; scroll down to reveal more [untried]; press BACK [untried]
- element ids available for callouts: 

### s11 [page] Search Characters
Search and filter AI character cards for chat roleplay.
- texts: "Close drawer", "Search", "📚 Fictional", "👨 Male", "⛓️ Dominant", "👩‍🦰 Female", "🧑‍🎨 OC", "￼", "All", "Limited Only", "Following", "Favorites", ",", "characters", "1 / 295", "8", "1", "0", "Medieval Fantasy World RP", "Mafia Boss", "126.3m", "390", "39.1m", "149", "@Mayu0910"
- signals: limit:"Limited Only", limit:"Limitless"
- actions: tap "Limited Only" (monetization); tap "Limited Only" (monetization) [unreachable]; tap "Limitless" (monetization) [unreachable]; tap "Limitless" (monetization) [unreachable]; tap "1.1k tokens" (monetization) [unreachable]; tap "462 tokens" (monetization) [unreachable]; Search for characters [unreachable]; Open character details [unreachable]; tap "A mafia boss who thinks you have inform…" (core loop) [unreachable]; tap "A mafia boss who thinks you have inform…" (core loop) [unreachable]
- element ids available for callouts: e3="Close drawer", e5="Search", e9="📚 Fictional", e10="👨 Male", e11="⛓️ Dominant", e12="👩‍🦰 Female", e13="🧑‍🎨 OC", e14="￼", e15="￼", e16="📚 Fictional", e17="👨 Male", e18="⛓️ Dominant", e19="👩‍🦰 Female", e20="🧑‍🎨 OC", e21="All", e22="Limited Only", e23="All", e24="Limited Only", e25="All", e26="Following"

### s12 [page] Search Characters
Search and filter AI characters by tags and categories.
- texts: "Close drawer", "Search", "📚 Fictional", "👨 Male", "⛓️ Dominant", "👩‍🦰 Female", "🧑‍🎨 OC", "￼", "All", "Limited Only", "Following", "Favorites", ",", "characters", "1 / 295", "8", "1", "0", "Eri", "Neglectful family", "32.9m", "109", "22m", "@hornybite", "@SadistLaughter"
- actions: tap "1.9k tokens" (monetization) [no-effect]; tap "2.8k tokens" (monetization); Type search query [untried]; Filter by Fictional [untried]; Open character detail [untried]; tap "And so, do you ever feel sudden motivat…" [untried]; tap "👩‍🦰 Female" [untried]; tap "🧑‍🎨 OC" [untried]; tap "👩‍🦰 Female" [untried]; tap "🧑‍🎨 OC" [untried]
- element ids available for callouts: e3="Close drawer", e5="Search", e9="📚 Fictional", e10="👨 Male", e11="⛓️ Dominant", e12="👩‍🦰 Female", e13="🧑‍🎨 OC", e14="￼", e15="￼", e16="📚 Fictional", e17="👨 Male", e18="⛓️ Dominant", e19="👩‍🦰 Female", e20="🧑‍🎨 OC", e21="All", e22="Limited Only", e23="All", e24="Limited Only", e25="All", e26="Following"

## Navigation edges (from → to via action; effects)

- g0001: s01 → s01 [replace] via a01_1 (e7)
- g0002: s01 → s01 [replace] via a01_2 (e9)
- g0003: s01 → s01 [replace] via a01_3 (e13); appeared "￼Hidden Gems show characters f", disappeared "24h", disappeared "Weekly", disappeared "⭐ Trending shows popular chara"
- g0004: s01 → s01 [replace] via a01_4 (e17)
- g0005: s01 → s01 [replace] via a01_5 (e22)
- g0006: s01 → s02 [push] via a01_6 (e4)
- g0007: s02 → s01 [push] via a02_1 (e13) while Main navigation selected
- g0008: s02 → s01 [push] via a02_2 (e15) while Main navigation selected
- g0009: s02 → s01 [push] via a02_3 (e19) while Main navigation selected
- g0010: s02 → s03 [push] via a02_4 (e38) while Main navigation selected
- g0011: s03 → s03 [replace] via a03_3 (e19); appeared "Restoring...", disappeared "Restore Purchases"
- g0012: s03 → s03 [replace] via a03_1 (e5)
- g0013: s03 → s03 [replace] via a03_2 (e16)
- g0014: s03 → s03 [replace] via a03_4 (e4)
- g0015: s03 → s03 [replace] via a03_5 (e3)
- g0016: s03 → s03 [replace] via a03_6 (e6)
- g0017: s03 → s03 [replace] via a03_7 (e7)
- g0018: s03 → s03 [replace] via a03_8 (e8)
- g0019: s03 → s03 [replace] via a03_9 (e14)
- g0020: s03 → s03 [replace] via a03_10 (e15)
- g0021: s03 → s03 [replace] via a03_11 (e20)
- g0022: s03 → s03 [replace] via a03_12 (e21)
- g0023: s03 → s03 [replace] via a03_13
- g0024: s03 → s03 [replace] via a03_19 (e19)
- g0025: s03 → s03 [replace] via a03_17 (e9)
- g0026: s03 → s03 [replace] via a03_18 (e10)
- g0027: s03 → s03 [replace] via a03_16
- g0028: s02 → s03 [push] via a02_5 (e41) while Main navigation selected
- g0029: s04 → s02 [push] via a04_1 (e2)
- g0030: s02 → s05 [push] via a02_6 (e3) while Main navigation selected; auto:TextView||#|2 -146, appeared "Build, Share, Explore", appeared "All", appeared "Limited Only", appeared "Favorites", appeared "Trending", disappeared "@8iyiyiyiy", disappeared "0", disappeared "Following", disappeared "Followers", disappeared "Member Since Sep 24, 2026"
- g0031: s05 → s05 [replace] via a05_1 (e7)
- g0032: s05 → s05 [replace] via a05_2 (e9)
- g0033: s05 → s05 [replace] via a05_3 (e13)
- g0034: s05 → s05 [replace] via a05_4 (e17)
- g0035: s05 → s05 [replace] via a05_5 (e18)
- g0036: s05 → s06 [push] via a05_6 (e53)
- g0037: s06 → s07 [push] via a06_1 (e12); appeared "🧑‍🎨 OC", appeared "👨 Male", appeared "⛓️ Dominant", appeared "👩‍🦰 Female", appeared "📚 Fictional"
- g0038: s07 → s07 [replace] via a07_1 (e96)
- g0039: s07 → s08 [push] via a07_2 (e6); auto:TextView||#|0 -7, auto:TextView||#|4 +1, auto:TextView||#|5 +9, auto:TextView||#|6 -5, auto:TextView||#|7 +3, auto:TextView||#m|0 -13.899999999999999, auto:TextView||#m|1 -13.4, auto:TextView||# tokens|0 -275, appeared "friend", appeared "👨 Male", appeared "⛓️ Dominant", appeared "1 / 39", appeared "1", disappeared "👩‍🦰 Female", disappeared "📚 Fictional", disappeared "1 / 295", disappeared "8", disappeared "0"
- g0040: s08 → s08 [replace] via a08_1 (e6)
- g0041: s08 → s09 [push] via a08_2 (e45); auto:TextView||#|0 +2, auto:TextView||#|1 +2, auto:TextView||#|2 +4, auto:TextView||#|3 +5, auto:TextView||#|4 -3, auto:TextView||#|5 -5, auto:TextView||#|6 +1, auto:TextView||#|7 +5, auto:TextView||#|8 -22, auto:TextView||#|9 -3
- g0042: s09 → s10 [push] via a09_1 (e18)
- g0043: s10 → s09 [push] via a10_1 (e3)
- g0044: s09 → s08 [push] via a09_2 (e4); auto:TextView||#|0 -2, auto:TextView||#|1 -2, auto:TextView||#|2 -4, auto:TextView||#|3 -5, auto:TextView||#|4 +3, auto:TextView||#|5 +5, auto:TextView||#|6 -1, auto:TextView||#|7 -5, auto:TextView||#|8 +22, auto:TextView||#|9 +3
- g0045: s05 → s11 [push] via a05_7 (e57); auto:TextView||#|5 -4, auto:TextView||#|7 -5
- g0046: s11 → s12 [push] via a11_1 (e22); auto:TextView||#|10 -281, auto:TextView||#m|1 -17.1, auto:TextView||#|11 -40, auto:TextView||#k tokens|0 +0.7999999999999998, appeared "👩‍🦰 Female", appeared "Neglectful family", appeared "32.9m", appeared "109", appeared "22m", disappeared "⛓️ Dominant", disappeared "Medieval Fantasy World RP", disappeared "Mafia Boss", disappeared "126.3m", disappeared "390"
- g0047: s12 → s12 [replace] via a12_1 (e98)
- g0048: s12 → s13 [push] via a12_2 (e99)
- g0049: s13 → s14 [push] via a13_1 (e4)
- g0050: s14 → s14 [replace] via a14_1 (e6)
- g0051: s14 → s14 [replace] via a14_2 (e9)
- g0052: s14 → s13 [push] via a14_3 (e4)
- g0053: s13 → s02 [push] via a13_2 (e5); appeared "@8iyiyiyiy", appeared "0", appeared "Following", appeared "Followers", appeared "Member Since Sep 24, 2026", disappeared "No notifications"
- g0054: s02 → s13 [push] via a02_7 (e4) while Main navigation selected
- g0055: s02 → s13 [push] via a02_16 (e20) while Main navigation selected
- g0056: s02 → s15 [push] via a02_19 (e27) while Main navigation selected
- g0057: s15 → s15 [replace] via a15_1 (e11); appeared "Hi! What happens next?"
- g0058: s15 → s15 [replace] via a15_2 (e4)
- g0059: s15 → s15 [replace] via a15_3 (e5)
- g0060: s15 → s16 [sheet] via a15_4 (e8); appeared "Bottom sheet backdrop", appeared "Bottom Sheet", appeared "Bottom sheet handle", appeared "Search Tags", appeared "Selected Tags (0)"

## Coverage

16 states, 60 edges, 60 steps, stop: budget_steps. Not explored: 82 actions.
- not explored on Build, Share, Explore: tap "Build, Share, Explore" (guard: out of scope)
- not explored on More memory for
long chats.: tap "Terms of Service" (guard: out of scope)
- not explored on More memory for
long chats.: tap "Privacy Policy" (guard: out of scope)
- not explored on Explore Characters: tap "Build, Share, Explore" (guard: out of scope)
- not explored on Search Characters: tap "Limited Only" (monetization) (travel failed twice)
- not explored on Search Characters: tap "Limitless" (monetization) (travel failed twice)
- not explored on Search Characters: tap "Limitless" (monetization) (travel failed twice)
- not explored on Search Characters: tap "1.1k tokens" (monetization) (travel failed twice)
- not explored on Search Characters: tap "462 tokens" (monetization) (travel failed twice)
- not explored on Search Characters: Search for characters (travel failed twice)
- not explored on Search Characters: Open character details (travel failed twice)
- not explored on Search Characters: tap "A mafia boss who thinks you have inform…" (core loop) (travel failed twice)
- not explored on Search Characters: tap "A mafia boss who thinks you have inform…" (core loop) (travel failed twice)
- not explored on Search Characters: tap the unlabeled icon at top-right (travel failed twice)
- not explored on Search Characters: tap "Search" (travel failed twice)
- ... and 67 more (see viewer.html)
