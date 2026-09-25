# AOL — product model digest

Captured 2026-09-25, account state: logged-in. Regime (computed): **no-scarcity**.

## Brief

- One-liner: AOL mobile app for browsing curated news feeds, reading articles, viewing comments, and managing personal account feeds.
- Audience: General news readers and AOL account holders looking for categorized news, entertainment, and local updates.
- Core loop: Browse news headlines and categories on the home feed → Tap an article to view details and full content → Read or interact with article comments and discussions → Save or share articles of interest
- How it makes money today: Monetizes primarily through native and display advertisements (such as Taboola advertising units) embedded within news feeds and article pages.
- What is scarce: User attention; Account sign-in / verified user status
- Ads today: Banner and native sponsored recommendations (Taboola) appear frequently throughout the news feed and article view pages.
- Open questions: Are there paid subscription tiers for ad-free news reading hidden behind account sign-in walls?; What additional features unlock upon signing into an AOL account?

## Economy (every item has evidence; conf=inferred means not verified on screen)

- AD TODAY native on Home News Feed (e42)
- AD TODAY native on Article Details (e15)
- AD TODAY native on Home News Feed (e47)
- AD TODAY native on Home News Feed (e42)
- AD TODAY native on News Feed Home (e41)
- AD TODAY native on Home Feed (e37)
- AD TODAY banner on Article Detail Page (e22)
- AD TODAY banner on Article Ad View (e17)

## Derived numbers (computed in code from observed prices and cited constants — use these, do not recompute)

- value of one completed rewarded view (after non-game haircut): US $0.009–0.015, EU $0.0038–0.0067, LATAM $0.0015–0.003
- cheapest paid pack: none observed
- note: No priced packs observed: unit prices, action costs and exchange rate are unavailable.
- note: No daily free source observed.

## Moments (where a value exchange could happen)

- m1 [desire] on s02 (Home News Feed), reach=core-loop: Home News Feed shows a price: "Brandi Glanville hopes to ‘pay everyone back’ after GoFundMe raises $22K for her facial disfigurement"
- m2 [desire] on s11 (Account Menu Sidebar), reach=occasional: Account Menu Sidebar shows an upsell: "Unsubscribe"
- m3 [hub] on s01 (Home News Feed), reach=core-loop: Home News Feed (tab) is a place users return to (5 visits during exploration)
- m4 [hub] on s02 (Home News Feed), reach=core-loop: Home News Feed (tab) is a place users return to (4 visits during exploration)
- m5 [hub] on s07 (Home News Feed), reach=rare: Home News Feed (tab) is a place users return to (1 visits during exploration)
- m6 [hub] on s13 (News Feed Home), reach=frequent: News Feed Home (tab) is a place users return to (8 visits during exploration)
- m7 [hub] on s14 (Home Feed), reach=occasional: Home Feed (tab) is a place users return to (3 visits during exploration)
- m8 [first-value, NO OFFERS ALLOWED] on s01 (Home News Feed), reach=core-loop: Home News Feed is the first screen with core content after launch: no offer may appear here
- m9 [desire] on s05 (Add Comment Page), reach=core-loop: User attempts to post a comment on an article and hits the sign-up wall.
- m10 [hub] on s11 (Account Menu Sidebar), reach=occasional: User opens the sidebar menu to access account settings, saved articles, contacts, and support.

## Flows

- f1 [core] Read Article and Comment Flow: Home News Feed (launch) → Home News Feed (Switch to Entertainment category) → Article Details (Read news article) → Conversation Screen (View comments) → Add Comment Page (Type a comment)
- f2 [secondary] Entertainment Category Exploration: Home News Feed (launch) → Home News Feed (Switch to Entertainment category)
- f3 [secondary] Local News Exploration: Home News Feed (launch) → Home News Feed (Switch to Local category)
- f4 [secondary] Sports and General News Feed Navigation: Home News Feed (launch) → Home News Feed (Switch to Sports category) → News Feed Home (News)

## Screens (id, kind, name — purpose; key texts; actions)

### s01 [tab] Home News Feed
This screen displays the latest news and top stories categorized by topics.
- texts: "Sidebar button. Double tap or slide two fingers fr", "Home", "Access your saved articles", "Search", "See the latest news", "Top Stories", "Entertainment", "Local", "Sports", "Business", "Inbox"
- actions: Switch to Entertainment category; Switch to Local category; Switch to Sports category; tap "Sidebar button. Double tap or slide two…" [untried]; tap "Home" [untried]; Access saved articles [untried]; Open search [untried]; tap "See the latest news" [untried]; tap "Top Stories" [untried]; tap "Business" [untried]
- element ids available for callouts: e9="Sidebar button. Double t", e12="Home", e13="Access your saved articl", e14="Search", e15="See the latest news", e22="Top Stories", e23="Entertainment", e24="Local", e25="Sports", e26="Business", e37="Inbox", e38="Home"

### s02 [tab] Home News Feed
Provides the latest news articles and updates across various categories with integrated advertisements.
- texts: "Sidebar button. Double tap or slide two fingers fr", "Home", "Access your saved articles", "Search", "See the latest news", "Entertainment", "Local", "Sports", "Business", "Lighter Side", "People", "Tiffani Thiessen says a former resident still live", "Save this article", "Share this news article", "1h ago", "TEMU in Taboola advertising section · Sponsored: l", "TEMU in Taboola advertising section", "Image for Taboola Advertising Unit", "More options", "TEMU", "·", "Ad", "Sponsored: learn about this recommendation (opens ", "Temu: Your next electric bike", "USA TODAY"
- signals: ad:"TEMU: Your next electric bike", price:"Brandi Glanville hopes to ‘pay everyone ", ad:"Ad"
- actions: Read news article; Switch to inbox tab; tap "People" [untried]; tap "Save this article" [untried]; tap "1h ago" [untried]; tap "USA TODAY" [untried]; tap "Mark Consuelos to undergo 'major surger…" [untried]; tap "Save this article" [untried]; tap "Home" [untried]; tap "People" [untried]
- element ids available for callouts: e9="Sidebar button. Double t", e12="Home", e13="Access your saved articl", e14="Search", e15="See the latest news", e23="Entertainment", e24="Local", e25="Sports", e26="Business", e27="Lighter Side", e37="People", e38="Tiffani Thiessen says a ", e39="Save this article", e40="Share this news article", e41="1h ago", e47="TEMU in Taboola advertis", e48="TEMU in Taboola advertis", e49="Image for Taboola Advert", e50="Image for Taboola Advert", e51="More options"

### s03 [page] Article Details
Displays a news article with images, text, and engagement options.
- texts: "Back", "The Independent US", "Salmonella outbreak tied to broccoli sprouts grows", "Julia Musto", "Sep. 25, 2026 10:46 AM PT", "Image for Taboola Advertising Unit", "Smart tool storage for less TEMU in Taboola advert", "Smart tool storage for less", "More options", "Ad", "·", "TEMU in Taboola advertising section", "TEMU", "Sponsored: learn about this recommendation (opens ", "Dozens have fallen ill across the western U.S. aft", "More people have been sickened in an ", "outbreak of Salmonella", " linked to ", "broccoli sprouts", " , new federal ", "data", " has revealed.", "Ten more cases were reported in a Thursday update ", " , bringing the total illness count up to 32.", "Centers for Disease Control and Prevention"
- signals: ad:"Discover a powerful electric bicycle on ", timer:"Sep. 25, 2026 10:44 AM PT", ad:"Ad"
- actions: tap "Credit: TheStewartofNY/WireImage; Silve…" (monetization) [no-effect]; View comments; Go back to previous screen; tap "People"; tap "Tiffani Thiessen Says a Former Resident…"; tap "Sep. 25, 2026 10:44 AM PT" [no-effect]; tap "•"; tap "Tiffani Thiessen believes her 103-year-…" [no-effect]; tap "The" [untried]; tap "actress says her home was once occupied…" [untried]
- element ids available for callouts: e8="Back", e11="The Independent US", e12="Salmonella outbreak tied", e13="Julia Musto", e14="Sep. 25, 2026 10:46 AM P", e19="Image for Taboola Advert", e20="Smart tool storage for l", e21="Smart tool storage for l", e22="Image for Taboola Advert", e23="Smart tool storage for l", e25="More options", e26="Ad", e27="·", e28="TEMU in Taboola advertis", e29="TEMU", e30="Sponsored: learn about t", e31="Dozens have fallen ill a", e32="More people have been si", e33="outbreak of Salmonella", e34="outbreak of Salmonella"

### s04 [page] Conversation Screen
Displays comments and conversation threads for an article.
- texts: "Conversation", "Best", "5 Comments", "Sort by", "4", "S", "Sparky5229", "Options menu", "33m ago", "I do not believe in sprits or ghosts", "Up vote button", "Down vote button", "Reply", "3", "Share", "J", "JAMES", "13m ago", "That's so cool, I have witnessed many spirits in m", "G", "Gene", "8m ago", "spirits sometimes hang around don`t want to leave ", "C", "CHARLES"
- actions: Type a comment; Go back [untried]; tap "Conversation" [untried]; tap "2" [untried]; tap "Best"; tap "5 Comments" [untried]; tap "Sort by" [untried]; tap "S" [untried]; tap "Sparky5229" [untried]; tap "Options menu" [untried]
- element ids available for callouts: e9="Conversation", e17="Best", e18="5 Comments", e19="Sort by", e21="4", e33="S", e35="Sparky5229", e36="Options menu", e37="33m ago", e38="I do not believe in spri", e41="Up vote button", e44="Down vote button", e47="Reply", e48="3", e50="Share", e57="J", e59="JAMES", e60="Options menu", e61="13m ago", e62="That's so cool, I have w"

### s07 [tab] Home News Feed
Displays top local headlines and news articles with integrated advertisements.
- texts: "Sidebar button. Double tap or slide two fingers fr", "Home", "Access your saved articles", "Search", "See the latest news", "Local", "Sports", "Business", "Lighter Side", "Politics", "Edit locations", "Error getting weather", "Your local headlines", "Raceplace", "Oktoberfest Run 5K/10K/13.1 NYC Central", "Save this article", "Share this news article", "4d ago", "TEMU in Taboola advertising section · Sponsored: l", "TEMU in Taboola advertising section", "Image for Taboola Advertising Unit", "More options", "TEMU", "·", "Ad"
- signals: ad:"TEMU · Ad", timer:"Ordinary Days | 09/25/2026 7:30 PM | Cre", ad:"Ad"
- actions: Switch to Sports tab; Read news article [unreachable]; tap "Edit locations Error getting weather" [unreachable]; tap "Your local headlines" [unreachable]; tap "Raceplace" [unreachable]; tap "Save this article" [unreachable]; tap "Creative Loafing Atlanta" [unreachable]; tap "Ordinary Days | 09/25/2026 7:30 PM | Cr…" [unreachable]; tap "Save this article" [unreachable]; tap "YU Commentator" [unreachable]
- element ids available for callouts: e9="Sidebar button. Double t", e12="Home", e13="Access your saved articl", e14="Search", e15="See the latest news", e23="Local", e24="Sports", e25="Business", e26="Lighter Side", e27="Politics", e35="Edit locations", e36="Error getting weather", e38="Your local headlines", e42="Raceplace", e43="Oktoberfest Run 5K/10K/1", e44="Save this article", e45="Share this news article", e46="4d ago", e52="TEMU in Taboola advertis", e53="TEMU in Taboola advertis"

### s09 [page] Saved Articles
Displays a list of saved articles with an empty state.
- texts: "Back", "Saved articles", "No Saved Articles"
- actions: Go back to the previous screen; tap "Saved articles" [no-effect]; tap "No Saved Articles" [no-effect]; scroll down to reveal more [no-effect]; press BACK [untried]
- element ids available for callouts: e8="Back", e12="Saved articles", e19="No Saved Articles"

### s10 [page] Search Suggestions
Provides search suggestions as the user types a query.
- texts: "Close", "SUGGESTED SEARCHES", "Suggested searches", "WNBA Playoff Schedule", "Donald Trump", "Matt LaFleur", "Starbucks Closing Stores", "Presidents Cup", "Elijah Hemingway", "Kratom Drug", "Nick Bosa"
- actions: Type search query; Select suggested search WNBA Playoff Schedule [failed]; Close search view; tap "SUGGESTED SEARCHES" [untried]; tap "Suggested searches" [untried]; tap "Suggested searches" [untried]; tap "Donald Trump" [untried]; scroll down to reveal more [untried]; press BACK [untried]
- element ids available for callouts: e8="Close", e19="SUGGESTED SEARCHES", e21="Suggested searches", e22="WNBA Playoff Schedule", e24="Suggested searches", e25="Donald Trump", e27="Suggested searches", e28="Matt LaFleur", e30="Suggested searches", e31="Starbucks Closing Stores", e33="Suggested searches", e34="Presidents Cup", e36="Suggested searches", e37="Elijah Hemingway", e39="Suggested searches", e40="Kratom Drug", e42="Suggested searches", e43="Nick Bosa"

### s12 [page] No Contacts
Displays empty contact list state.
- texts: "No contacts found"
- actions: tap "No contacts found" [no-effect]; scroll down to reveal more [no-effect]; press BACK
- element ids available for callouts: e8="No contacts found"

### s13 [tab] News Feed Home
Display latest news articles and updates categorized by topics.
- texts: "Sidebar button. Double tap or slide two fingers fr", "Access your saved articles", "Search", "Home", "See the latest news", "Sports", "Business", "Lighter Side", "Politics", "News", "Associated Press", "Takeaways from Trump-Xi summit: Lots of pomp and e", "Save this article", "Share this news article", "1h ago", "TEMU in Taboola advertising section · Sponsored: l", "TEMU in Taboola advertising section", "Image for Taboola Advertising Unit", "More options", "TEMU", "·", "Ad", "Sponsored: learn about this recommendation (opens ", "Build Your Own Go-Kart Adventure", "The Independent US"
- signals: ad:"TEMU · Ad", ad:"Ad"
- actions: Scroll feed; Read news article; Switch to inbox tab; Search articles; tap "Save this article"; tap "1h ago"; tap "The Independent US"; tap "Save this article" [untried]; tap "1h ago" [untried]; tap "Associated Press" [untried]
- element ids available for callouts: e9="Sidebar button. Double t", e11="Access your saved articl", e12="Search", e14="Home", e15="See the latest news", e22="Sports", e23="Business", e24="Lighter Side", e25="Politics", e26="News", e36="Associated Press", e37="Takeaways from Trump-Xi ", e38="Save this article", e39="Share this news article", e40="1h ago", e46="TEMU in Taboola advertis", e47="TEMU in Taboola advertis", e48="Image for Taboola Advert", e49="Image for Taboola Advert", e50="More options"

### s14 [tab] Home Feed
Displays top news stories, weather, and articles for the user.
- texts: "Sidebar button. Double tap or slide two fingers fr", "Home", "Access your saved articles", "Search", "See the latest news", "Local", "Sports", "Business", "Lighter Side", "Politics", "Edit locations", "Error getting weather", "Your local headlines", "Raceplace", "Oktoberfest Run 5K/10K/13.1 NYC Central", "Save this article", "Share this news article", "4d ago", "TEMU in Taboola advertising section · Sponsored: l", "TEMU in Taboola advertising section", "Image for Taboola Advertising Unit", "More options", "TEMU", "·", "Ad"
- signals: ad:"TEMU · Ad", ad:"Ad"
- actions: Switch to Entertainment tab; Switch to Local tab; Switch to Sports tab; Check weather details [untried]; Read the news article [untried]; Scroll down the feed [untried]; tap "Sidebar button. Double tap or slide two…" [untried]; tap "Home" [untried]; tap "Access your saved articles" [untried]; tap "Search" [untried]
- element ids available for callouts: e9="Sidebar button. Double t", e12="Home", e13="Access your saved articl", e14="Search", e15="See the latest news", e23="Local", e24="Sports", e25="Business", e26="Lighter Side", e27="Politics", e35="Edit locations", e36="Error getting weather", e38="Your local headlines", e42="Raceplace", e43="Oktoberfest Run 5K/10K/1", e44="Save this article", e45="Share this news article", e46="4d ago", e52="TEMU in Taboola advertis", e53="TEMU in Taboola advertis"

### s15 [page] Article Detail Page
Displays news articles with embedded advertisements.
- texts: "Ten more cases were reported in a Thursday update ", " , bringing the total illness count up to 32.", "Centers for Disease Control and Prevention", "Back", "Salmonella infections", " can lead to a fever higher than 102 degrees Fahre", "dehydration", " . In rare instances, cases can be fatal.", "ADVERTISEMENT", "page", "ea9236c119f66b7c025bfb729c924b75", "Test Ad", "Sponsored: learn about this recommendation (opens ", "AdChoices information (opens dialog)", " "
- signals: ad:"ADVERTISEMENT", ad:"Test Ad", ad:"Sponsored: learn about this recommendati"
- actions: tap "Ten more cases were reported in a Thurs…"; tap "Centers for Disease Control and Prevent…" [untried]; tap "Centers for Disease Control and Prevent…" [untried]; Go back to the previous screen [untried]; tap "Salmonella infections" [untried]; tap "Salmonella infections" [untried]; tap "dehydration" [untried]; tap "dehydration" [untried]; tap ". In rare instances, cases can be fatal." [untried]; tap "page" [untried]
- element ids available for callouts: e4="Ten more cases were repo", e5=" , bringing the total il", e6="Centers for Disease Cont", e7="Centers for Disease Cont", e13="Back", e14="Salmonella infections", e15="Salmonella infections", e16=" can lead to a fever hig", e17="dehydration", e18="dehydration", e19=" . In rare instances, ca", e22="ADVERTISEMENT", e25="page", e26="ea9236c119f66b7c025bfb72", e27="ea9236c119f66b7c025bfb72", e28="Test Ad", e29="Sponsored: learn about t", e30="Sponsored: learn about t", e31="AdChoices information (o", e32=" "

### s17 [sheet] Font Size Sheet
Adjust font size for reading articles.
- texts: "Done"
- signals: ad:"Test Ad"
- actions: Adjust font size slider [no-effect]; Confirm font size changes; press BACK [untried]
- element ids available for callouts: e13="Done"

## Navigation edges (from → to via action; effects)

- g0001: s01 → s02 [push] via a01_1 (e18); appeared "Lighter Side", appeared "People", appeared "Tiffani Thiessen says a former", appeared "Save this article", appeared "Share this news article", disappeared "Top Stories"
- g0002: s02 → s03 [push] via a02_1 (e38)
- g0003: s03 → s03 [replace] via a03_1
- g0004: s03 → s04 [tab] via a03_2 (e49)
- g0005: s04 → s05 [push] via a04_1 (e140)
- g0006: s05 → s05 [replace] via a05_9
- g0007: s02 → s06 [push] via a02_2 (e73)
- g0008: s06 → s02 [back] via a06_15
- g0009: s04 → s01 [push] via a04_5 (e16)
- g0010: s01 → s07 [push] via a01_2 (e19); appeared "Lighter Side", appeared "Politics", appeared "Edit locations", appeared "Error getting weather", appeared "Your local headlines", disappeared "Top Stories", disappeared "Entertainment"
- g0011: s07 → s08 [push] via a07_1 (e19); appeared "News", appeared "USA TODAY", appeared "NFLPA sounds alarm on Brazil f", appeared "1h ago", appeared "For the Win", disappeared "Local", disappeared "Edit locations", disappeared "Error getting weather", disappeared "Your local headlines", disappeared "Raceplace"
- g0012: s08 → s05 [tab] via a08_1 (e78)
- g0013: s01 → s08 [push] via a01_3 (e20); appeared "Lighter Side", appeared "Politics", appeared "News", appeared "USA TODAY", appeared "NFLPA sounds alarm on Brazil f", disappeared "Top Stories", disappeared "Entertainment", disappeared "Local"
- g0014: s08 → s09 [push] via a08_4 (e13)
- g0015: s09 → s08 [push] via a09_1 (e8)
- g0016: s08 → s10 [push] via a08_5 (e14)
- g0017: s10 → ext:browser [external] via a10_1 (e12)
- g0018: s10 → s08 [push] via a10_3 (e8)
- g0019: s08 → s11 [sheet] via a08_2 (e9); appeared "Close side bar", appeared "Accounts", appeared "Manage Accounts", appeared "Contacts", appeared "Receipts"
- g0020: s11 → s08 [back] via a11_1 (e13); disappeared "Close side bar", disappeared "Accounts", disappeared "Manage Accounts", disappeared "Contacts", disappeared "Receipts"
- g0021: s08 → s11 [sheet] via a08_3 (e11); appeared "Close side bar", appeared "Accounts", appeared "Manage Accounts", appeared "Contacts", appeared "Receipts"
- g0022: s11 → s08 [back] via a11_2 (e14); disappeared "Close side bar", disappeared "Accounts", disappeared "Manage Accounts", disappeared "Contacts", disappeared "Receipts"
- g0023: s08 → s11 [sheet] via a08_6 (e15); appeared "Close side bar", appeared "Accounts", appeared "Manage Accounts", appeared "Contacts", appeared "Receipts"
- g0024: s11 → s12 [push] via a11_3 (e44)
- g0025: s12 → s12 [replace] via a12_1 (e8)
- g0026: s12 → s12 [replace] via a12_2
- g0027: s12 → s08 [back] via a12_3
- g0028: s08 → s08 [replace] via a08_7 (e18)
- g0029: s08 → s08 [replace] via a08_8 (e19); appeared "The Independent US", appeared "CEO loses job over viral photo", appeared "21m ago", appeared "LA Times", appeared "California's oldest family-own", disappeared "USA TODAY", disappeared "NFLPA sounds alarm on Brazil f", disappeared "1h ago", disappeared "For the Win", disappeared "Cooper Flagg rookie card sets "
- g0030: s08 → s08 [replace] via a08_9 (e20); auto:TextView|com.aol.mobile.aolapp:id/tv_articleTimestamp|#h ago|1 -10, appeared "Bored Panda", appeared "Man claims Jesus gave him a 4-", appeared "6h ago", appeared "Business Insider", appeared "See the luxurious, heavily for", disappeared "The Independent US", disappeared "CEO loses job over viral photo", disappeared "21m ago", disappeared "LA Times", disappeared "California's oldest family-own"
- g0031: s08 → s08 [replace] via a08_10 (e21); appeared "NBC Universal", appeared "Supreme Court allows Trump adm", appeared "3h ago", appeared "Associated Press", appeared "New Jersey governor’s showdown", disappeared "Bored Panda", disappeared "Man claims Jesus gave him a 4-", disappeared "Business Insider", disappeared "See the luxurious, heavily for", disappeared "12/28/25"
- g0032: s08 → s13 [push] via a08_11 (e22); appeared "Associated Press", appeared "Takeaways from Trump-Xi summit", appeared "1h ago", appeared "The Independent US", appeared "Salmonella outbreak tied to br", disappeared "NBC Universal", disappeared "Supreme Court allows Trump adm", disappeared "Save this article", disappeared "Share this news article", disappeared "3h ago"
- g0033: s13 → s13 [replace] via a13_1 (e31); appeared "Save this article", appeared "Share this news article", appeared "5h ago", appeared "Time", appeared "The data center debate taking ", disappeared "Home", disappeared "Associated Press", disappeared "Takeaways from Trump-Xi summit", disappeared "Inbox"
- g0034: s13 → s03 [push] via a13_2 (e37)
- g0035: s14 → s14 [replace] via a14_1 (e20); appeared "Lighter Side", appeared "People", appeared "Tiffani Thiessen says a former", appeared "1h ago", appeared "Mark Consuelos to undergo 'maj", disappeared "Top Stories", disappeared "Tap here for weather", disappeared "Jenna Bush Hager recalls cryin", disappeared "Guessing Headlights", disappeared "Florida teen called her dad af"
- g0036: s14 → s14 [replace] via a14_2 (e18); appeared "Politics", appeared "Edit locations", appeared "Error getting weather", appeared "Your local headlines", appeared "Raceplace", disappeared "Entertainment", disappeared "People", disappeared "Tiffani Thiessen says a former", disappeared "1h ago", disappeared "USA TODAY"
- g0037: s14 → s08 [push] via a14_3 (e19); appeared "News", appeared "USA TODAY", appeared "NFLPA sounds alarm on Brazil f", appeared "1h ago", appeared "For the Win", disappeared "Local", disappeared "Edit locations", disappeared "Error getting weather", disappeared "Your local headlines", disappeared "Raceplace"
- g0038: s13 → s05 [push] via a13_3 (e72)
- g0039: s13 → s10 [push] via a13_4 (e12)
- g0040: s13 → s09 [push] via a13_16 (e11)
- g0041: s09 → s09 [replace] via a09_2 (e11)
- g0042: s09 → s09 [replace] via a09_3 (e19)
- g0043: s09 → s09 [replace] via a09_4
- g0044: s13 → s13 [replace] via a13_5 (e38); appeared "Remove this article from your ", disappeared "Save this article", disappeared "Share this news article", disappeared "5h ago"
- g0045: s13 → s03 [push] via a13_6 (e40)
- g0046: s03 → s13 [push] via a03_3 (e8)
- g0047: s13 → s03 [push] via a13_7 (e60)
- g0048: s03 → s15 [push] via a03_4
- g0049: s15 → ext:browser [external] via a15_1 (e4)
- g0050: s03 → ext:browser [external] via a03_5
- g0051: s03 → s03 [replace] via a03_6 (e14)
- g0052: s03 → ext:browser [external] via a03_7
- g0053: s16 → s17 [sheet] via a16_1 (e37)
- g0054: s17 → s17 [replace] via a17_1 (e9)
- g0055: s17 → s16 [back] via a17_2 (e13)
- g0056: s16 → s16 [replace] via a16_2 (e39)
- g0057: s16 → s03 [push] via a16_3 (e30); appeared "Associated Press", appeared "Sponsored: learn about this re", appeared "CARA ANNA and AAMER MADHANI", appeared "Updated Sep. 25, 2026 10:39 AM", appeared "Image for Taboola Advertising ", disappeared "can lead to a fever higher tha", disappeared "dehydration", disappeared ". In rare instances, cases can", disappeared "ADVERTISEMENT", disappeared "ea9236c119f66b7c025bfb729c924b"
- g0058: s03 → s03 [replace] via a03_8

## Leaves the app (recorded, not explored)

- ext:browser (com.android.chrome) from Search Suggestions, Article Detail Page, Article Details: Welcome to Chrome | Sign in to browse easier across devices | [name], [email] currently selected. Choose an account. | [name] | [email] | Continue as [name]

## Coverage

17 states, 58 edges, 60 steps, stop: budget_steps. Not explored: 72 actions.
- not explored on Home News Feed: tap "Share this news article" (guard: out of scope)
- not explored on Home News Feed: View ad (guard: ad (observe ads, never click them))
- not explored on Home News Feed: tap "Share this news article" (guard: out of scope)
- not explored on Article Details: tap "•" (only 0% visible after scrolling (not safely tappable))
- not explored on Article Details: View advertisement (guard: ad (observe ads, never click them))
- not explored on Article Details: Share link on Facebook (guard: out of scope)
- not explored on Article Details: Share article (guard: out of scope)
- not explored on Conversation Screen: tap "Share" (guard: out of scope)
- not explored on Conversation Screen: tap "Share" (guard: out of scope)
- not explored on Conversation Screen: tap "Share" (guard: out of scope)
- not explored on Add Comment Page: Close comment screen (login wall: no human available)
- not explored on Add Comment Page: tap "Commenting on" (login wall: no human available)
- not explored on Add Comment Page: tap "Tiffani Thiessen Says a Former Resident…" (login wall: no human available)
- not explored on Add Comment Page: tap "AOL" (login wall: no human available)
- not explored on Add Comment Page: tap "P" (login wall: no human available)
- ... and 57 more (see viewer.html)
