# Luzia — product model digest

Captured 2026-09-25, account state: guest. Regime (computed): **subscription-gated**.

## Brief

- One-liner: Luzia is an AI assistant providing chat capabilities, creative content generation, and a catalog of AI mini-apps, with premium features unlocked via signup or subscription.
- Audience: Users seeking an AI companion for general chat, creative content generation, and task automation.
- Core loop: Chat with various AI personas (Luzia, Teacher, Friend, Elias). → Generate and edit images using AI prompts and styles. → Explore and use AI mini-apps like Beat Maker and Anima.
- How it makes money today: The app monetizes through a premium subscription model ('Luzia+') that unlocks advanced features, and through a free signup that provides access to core customization options like saving favorite messages, adjusting response styles, and creating custom besties.
- What is scarce: Luzia+ subscription features (e.g., advanced services, deep reasoning mode); Account access (required for several core features); Ability to adjust AI response style; Ability to save favorite messages; Ability to create custom besties; AI usage quota (implied)
- Ads today: No ads were observed during this exploration.
- Open questions: What are the specific benefits included in the 'Luzia+' subscription beyond 'smarter, deeper answers' and account creation?; What is the exact pricing and billing period for 'Luzia+'?; What are the specific 'Usage limits' mentioned in the support section?; What are the limitations of 'Continue with limited access' on the login screen, and how does it relate to the 'free signup'?

## Economy (every item has evidence; conf=inferred means not verified on screen)

- RESOURCE r1 Luzia+ Subscription [entitlement, unit=plan] shown on Create Account Sheet, Settings; observed values ? (observed) — o0061 "To enjoy Luzia+ you need to create an account first."; o0060 "Upgrade to Luzia+"
- RESOURCE r2 Account Access [entitlement, unit=account] shown on Login Screen; observed values ? (observed) — o0084 "Sign up free to unlock features just for you."
- RESOURCE r3 AI Usage Quota [quota, unit=actions] shown on Contact Us Support; observed values ?; resets unknown (observed) — o0183 "Usage limits"
- SOURCE src1: Sign up for account access gives ? r2 [once] on Login Screen (observed) — o0084 "Sign up free to unlock features just for you."
- SOURCE src2: Upgrade to Luzia+ gives ? r1 [purchase] on Create Account Sheet (observed) — o0061 "To enjoy Luzia+ you need to create an account first."
- OFFER of1 [subscription] "Luzia+ Subscription" N/A grants   per unknown + Luzia+ Subscription on Create Account Sheet
- OFFER of2 [trial] "Free Signup" free grants   + Account Access on Login Screen
- WALL w1: blocks "Upgrade to Luzia+" when r1 runs out; shows Create Account Sheet; offers of1; decline edge g0014
- WALL w2: blocks "Adjust response style" when r2 runs out; shows Response Style Signup; offers of2; decline edge g0083
- WALL w3: blocks "View Favorite messages" when r2 runs out; shows Favorite messages; offers of2; decline edge g0065
- WALL w4: blocks "Create Custom Bestie" when r2 runs out; shows Custom Bestie Signup Sheet; offers of2; decline edge g0003
- WALL w5: blocks "Toggle deep reasoning mode" when r1 runs out; shows Create Account Sheet; offers of1; decline edge g0014
- WALL w6: blocks "Start a task" when r1 runs out; shows Create Account Sheet; offers of1; decline edge g0014
- ENTITLEMENT plan "Account Access": Adjust AI response style; Save favorite messages; Create custom besties
- ENTITLEMENT plan "Luzia+ Subscription": Access advanced services (bookings, shopping, alerts, reminders); Deep reasoning mode for smarter answers
- AD TODAY: none observed

## Derived numbers (computed in code from observed prices and cited constants — use these, do not recompute)

- value of one completed rewarded view (after non-game haircut): US $0.009–0.015, EU $0.0038–0.0067, LATAM $0.0015–0.003
- cheapest paid pack: none observed
- note: No priced packs observed: unit prices, action costs and exchange rate are unavailable.
- note: No daily free source observed.

## Moments (where a value exchange could happen)

- m1 [wall] on s07 (Create Account Sheet), reach=frequent: "Upgrade to Luzia+" is blocked when Luzia+ Subscription run out: Create Account Sheet appears and points to 1 offer(s)
- m2 [decline] on s07 (Create Account Sheet), reach=frequent: The user dismisses Create Account Sheet without buying and returns to Services Tab
- m3 [wall] on s24 (Response Style Signup), reach=occasional: "Adjust response style" is blocked when Account Access run out: Response Style Signup appears and points to 1 offer(s)
- m4 [decline] on s24 (Response Style Signup), reach=occasional: The user dismisses Response Style Signup without buying and returns to Luzia
- m5 [wall] on s21 (Favorite messages), reach=frequent: "View Favorite messages" is blocked when Account Access run out: Favorite messages appears and points to 1 offer(s)
- m6 [decline] on s21 (Favorite messages), reach=frequent: The user dismisses Favorite messages ("undefined") without buying and returns to Luzia
- m7 [wall] on s02 (Custom Bestie Signup Sheet), reach=frequent: "Create Custom Bestie" is blocked when Account Access run out: Custom Bestie Signup Sheet appears and points to 1 offer(s)
- m8 [decline] on s02 (Custom Bestie Signup Sheet), reach=frequent: The user dismisses Custom Bestie Signup Sheet ("Close sheet") without buying and returns to Chats Home
- m9 [wall] on s07 (Create Account Sheet), reach=frequent: "Toggle deep reasoning mode" is blocked when Luzia+ Subscription run out: Create Account Sheet appears and points to 1 offer(s)
- m10 [wall] on s07 (Create Account Sheet), reach=frequent: "Start a task" is blocked when Luzia+ Subscription run out: Create Account Sheet appears and points to 1 offer(s)
- m11 [desire] on s01 (Chats Home), reach=core-loop: Chats Home shows an upsell: "Try Luzia"
- m12 [desire] on s19 (Settings), reach=frequent: Settings shows an upsell: "Upgrade to Luzia+"
- m13 [desire] on s23 (Login Screen), reach=occasional: Login Screen shows a locked feature: "Sign up free to unlock features just for you."
- m14 [desire] on s27 (Attachment and Mode Sheet), reach=occasional: Attachment and Mode Sheet shows an upsell: "Deep reasoning"
- m15 [post-reward] on s23 (Login Screen), reach=occasional: Right after Sign up for account access, once
- m16 [hub] on s01 (Chats Home), reach=core-loop: Chats Home (tab) is a place users return to (13 visits during exploration)
- m17 [hub] on s04 (Ideas Feed), reach=rare: Ideas Feed (tab) is a place users return to (1 visits during exploration)
- m18 [hub] on s06 (Services Tab), reach=frequent: Services Tab (tab) is a place users return to (7 visits during exploration)
- m19 [hub] on s08 (Apps Catalog), reach=frequent: Apps Catalog (tab) is a place users return to (8 visits during exploration)
- m20 [hub] on s09 (Animate Tool Screen), reach=frequent: Animate Tool Screen (tab) is a place users return to (6 visits during exploration)
- m21 [hub] on s10 (Image Creation Hub), reach=frequent: Image Creation Hub (tab) is a place users return to (5 visits during exploration)
- m22 [first-value, NO OFFERS ALLOWED] on s01 (Chats Home), reach=core-loop: Chats Home is the first screen with core content after launch: no offer may appear here
- m23 [desire] on s19 (Settings), reach=frequent: User expresses interest in premium features by tapping 'Upgrade to Luzia+'.

## Flows

- f1 [core] Generate Image from Idea: Chats Home (launch) → Ideas Feed (Switch to Ideas tab) → Photo Idea Sheet (View Vogue fashion editorial idea details) → Photo Idea Sheet (Generate the image with the selected)
- f2 [monetization] Hit the wall: Create Account Sheet: Chats Home (launch) → Services Tab (Switch to Services tab) → Create Account Sheet (Start a task)
- f3 [monetization] Hit the wall: Custom Bestie Signup Sheet: Chats Home (launch) → Custom Bestie Signup Sheet (Open Custom Bestie creator)
- f4 [secondary] Explore Image Ideas by Style: Chats Home (launch) → Ideas Feed (Switch to Ideas tab) → Ideas Feed (Filter by Style)
- f5 [secondary] Access Luzia Services: Chats Home (launch) → Services Tab (Switch to Services tab)
- f6 [secondary] Browse AI Mini-Apps: Chats Home (launch) → Apps Catalog (Switch to Apps tab)
- f7 [secondary] Animate Image with AI: Chats Home (launch) → Apps Catalog (Switch to Apps tab) → Animate Tool Screen (Open Anima app)
- f8 [secondary] Create/Edit Image with AI: Chats Home (launch) → Apps Catalog (Switch to Apps tab) → Animate Tool Screen (Open Anima app) → Image Creation Hub (Switch to Create tab)

## Screens (id, kind, name — purpose; key texts; actions)

### s01 [tab] Chats Home
View and start chats with AI assistants or custom besties.
- texts: "Chats", "Try Luzia", "Luzia", "How can I help you today?", "New chat", "SEE MORE", "Teacher", "Friend", "Elias", "Custom Bestie", "Make an AI expert tailored to you", "Keep chatting", "Next steps discussion", "Today", "Our new chat", "Solve math problem", "Chat", "Ideas", "Services", "Apps"
- signals: upsell:"Try Luzia"
- actions: Open Luzia Plus upsell [no-effect]; Open Custom Bestie creator; Switch to Ideas tab; Switch to Services tab; Switch to Apps tab; tap "Chats" (core loop) [no-effect]; tap "New chat" (core loop) [no-effect]; Start chat with Teacher; tap "Keep chatting" (core loop) [no-effect]; Open existing chat
- element ids available for callouts: e7="Chats", e8="Try Luzia", e10="Luzia", e11="How can I help you today", e13="New chat", e14="SEE MORE", e16="Teacher", e18="Friend", e20="Elias", e21="Teacher", e22="Friend", e23="Elias", e26="Custom Bestie", e27="Make an AI expert tailor", e31="Keep chatting", e33="Next steps discussion", e34="Next steps discussion", e35="Today", e37="Next steps discussion", e38="Next steps discussion"

### s03 [page] Ideas Feed
Displays a grid of creative prompts and ideas for generating images and media.
- texts: "Ideas", "All", "Style", "Fun", "Video Effects", "World Cup 2026", "Vogue fashion editorial", "Kawaii Portrait", "Sunset Halo portrait", "How will you look as an old person?", "Turn me into a Pixar character", "Clapping hands", "Turn Your Pet Into a Superhero!", "Fruits", "Walking forward", "Chat", "Services", "Apps"
- actions: Filter by Style; View Vogue fashion editorial idea details; Switch to Chat tab; Switch to Services tab; Switch to Apps tab; tap "Ideas" [untried]; tap "All" [untried]; tap "Fun" [untried]; tap "Video Effects" [untried]; tap "World Cup 2026" [untried]
- element ids available for callouts: e4="Ideas", e11="All", e12="Style", e13="Fun", e14="Video Effects", e15="World Cup 2026", e17="Vogue fashion editorial", e19="Kawaii Portrait", e21="Sunset Halo portrait", e22="Vogue fashion editorial", e23="Kawaii Portrait", e24="Sunset Halo portrait", e31="How will you look as an ", e33="Turn me into a Pixar cha", e34="Clapping hands", e35="How will you look as an ", e36="Turn me into a Pixar cha", e38="Turn Your Pet Into a Sup", e45="Fruits", e46="Turn Your Pet Into a Sup"

### s04 [tab] Ideas Feed
Explore creative ideas and prompts for AI generation.
- texts: "Ideas", "All", "Style", "Fun", "Video Effects", "World Cup 2026", "Vogue fashion editorial", "Sunset Halo portrait", "Your Dream Wedding Look", "KPOP", "Tokio Y2K", "Multi", "Cinematic Film portrait", "Discover your perfect hairstyle", "Papparazzi swarming you", "Chat", "Services", "Apps"
- actions: Switch to Style filter; Switch to Fun filter [unreachable]; Switch to Video Effects filter [unreachable]; Switch to World Cup 2026 filter [unreachable]; Navigate to Services tab [unreachable]; Navigate to Apps tab [unreachable]; Open Vogue fashion editorial idea [unreachable]; Navigate to Chat tab [unreachable]; tap "Ideas" [unreachable]; tap "All" [unreachable]
- element ids available for callouts: e4="Ideas", e11="All", e12="Style", e13="Fun", e14="Video Effects", e15="World Cup 2026", e17="Vogue fashion editorial", e19="Sunset Halo portrait", e21="Your Dream Wedding Look", e22="Vogue fashion editorial", e23="Sunset Halo portrait", e24="Your Dream Wedding Look", e26="KPOP", e28="Tokio Y2K", e30="Multi", e31="KPOP", e32="Tokio Y2K", e33="Multi", e35="Cinematic Film portrait", e37="Discover your perfect ha"

### s05 [sheet] Photo Idea Sheet
Displays options to attach or take a photo for a selected AI photo generation idea.
- texts: "Close sheet", "Drag handle", "Vogue fashion editorial", "Attach Photos", "Take Photo", "Slay the cover"
- actions: Generate the image with the selected idea [no-effect]; tap "Close sheet"; tap "Drag handle" [untried]; tap "Vogue fashion editorial" [untried]; tap "Take Photo" [untried]; tap "Slay the cover" [untried]; press BACK [untried]
- element ids available for callouts: e2="Close sheet", e4="Drag handle", e6="Vogue fashion editorial", e9="Attach Photos", e10="Take Photo", e11="Attach Photos", e12="Take Photo", e14="Slay the cover"

### s06 [tab] Services Tab
This tab introduces assistant services like bookings and shopping handled by Luzia.
- texts: "Services", "Let Luzia handle it!", "Bookings, shopping, alerts and reminders, all done", "Start new task", "Chat", "Ideas", "Apps"
- actions: tap "Bookings, shopping, alerts and reminder…" (monetization) [no-effect]; Start a new task; tap "Start new task" (monetization); tap the unlabeled icon at top-left (button Nav Back); tap "Services" [untried]; tap "Let Luzia handle it!" [untried]; Switch to Chat tab [untried]; Switch to Ideas tab [untried]; tap "Services Services" [untried]; Switch to Apps tab [untried]
- element ids available for callouts: e5="Services", e6="Let Luzia handle it!", e7="Bookings, shopping, aler", e9="Start new task", e14="Chat", e15="Ideas", e16="Services", e17="Apps", e18="Chat", e19="Ideas", e20="Services", e21="Apps"

### s08 [tab] Apps Catalog
Browse available AI tools and mini-apps.
- texts: "Apps", "Elias", "Beat maker", "Luzia", "Doodle", "Tap squares, make music", "Turn your sketch into a picture", "Anima", "Photoedit", "Make your image a video with AI", "Edit your images with AI", "Mathematics", "Images", "Solve and explain any problem", "Generate unique images in seconds", "Summarize", "Games", "Extract key topics from a text", "Have fun, train your brain", "Transcribe", "Career", "Chat", "Ideas", "Services"
- actions: Open Anima app; Open Photoedit app; tap "Apps" [no-effect]; tap "Elias"; tap "Beat maker"; tap "Luzia"; tap "Beat maker"; tap "Doodle"; tap "Tap squares, make music" [untried]; tap "Anima" [untried]
- element ids available for callouts: e4="Apps", e7="Elias", e8="Beat maker", e9="Luzia", e10="Beat maker", e11="Doodle", e12="Tap squares, make music", e13="Turn your sketch into a ", e16="Anima", e17="Photoedit", e18="Anima", e19="Photoedit", e20="Make your image a video ", e21="Edit your images with AI", e24="Mathematics", e25="Images", e26="Mathematics", e27="Images", e28="Solve and explain any pr", e29="Generate unique images i"

### s09 [tab] Animate Tool Screen
This screen allows users to upload a picture and animate it using AI tools.
- texts: "Create", "Edit", "Animate", "Upload the pic you want to animate", "Popular", "Waving", "Clapping", "Walking", "Jumping", "Winking", "Luzia is AI and can make mistakes. Verify importan"
- actions: Switch to Animate tab [no-effect]; Switch to Create tab; Switch to Edit tab; Select Clapping animation style; Type idea description; tap the unlabeled icon at top-left [untried]; tap the unlabeled icon at top-right [untried]; tap the unlabeled icon at top-right [untried]; tap "Animate" [untried]; tap "Popular" [untried]
- element ids available for callouts: e10="Create", e11="Edit", e12="Animate", e13="Animate", e14="Upload the pic you want ", e17="Popular", e23="Waving", e24="Clapping", e25="Walking", e26="Jumping", e27="Winking", e28="Waving", e30="Clapping", e34="Luzia is AI and can make"

### s10 [tab] Image Creation Hub
Users can generate or edit AI images by typing a prompt or selecting popular styles.
- texts: "Create", "Edit", "Animate", "Create image", "Mix or swap elements from photos", "Popular", "9:16", "Painting", "Character", "Invitation", "Outfit", "Fashion", "Luzia is AI and can make mistakes. Verify importan"
- signals: timer:"9:16"
- actions: Switch to Edit tab; Switch to Animate tab; tap "Create image" (core loop); Select Painting popular style; Type prompt to create image; tap "Mix or swap elements from photos" [untried]; tap "9:16" [untried]; scroll down to reveal more [untried]; press BACK [untried]
- element ids available for callouts: e10="Create", e11="Edit", e12="Animate", e14="Create image", e15="Mix or swap elements fro", e17="Popular", e18="9:16", e20="Painting", e22="Character", e24="Invitation", e26="Outfit", e28="Fashion", e29="Painting", e30="Character", e31="Invitation", e32="Outfit", e33="Fashion", e36="Luzia is AI and can make"

### s11 [page] Photoedit Screen
Users can upload photos and use AI prompts to edit them.
- texts: "Create", "Edit", "Animate", "Photoedit", "Upload a photo and describe your changes", "Popular", "9:16", "Vogue", "Kawaii", "Halo", "Old-me", "Pixar", "Luzia is AI and can make mistakes. Verify importan"
- signals: timer:"9:16"
- actions: Switch to Create mode; Switch to Edit mode [no-effect]; Switch to Animate mode; Type photo editing prompt; tap the unlabeled icon at top-left; tap the unlabeled icon at top-right [untried]; tap the unlabeled icon at top-right [untried]; tap "Photoedit" [untried]; tap "9:16" [untried]; tap "Popular" [untried]
- element ids available for callouts: e10="Create", e11="Edit", e12="Animate", e13="Photoedit", e14="Upload a photo and descr", e18="Popular", e19="9:16", e21="Vogue", e23="Kawaii", e25="Halo", e27="Old-me", e29="Pixar", e30="Vogue", e31="Kawaii", e32="Halo", e33="Old-me", e34="Pixar", e38="Luzia is AI and can make"

### s12 [page] Attach Photos
Content page
- texts: "Close sheet", "Drag handle", "Attach Photos", "Take Photo"
- actions: tap "Close sheet"; tap "Drag handle" [untried]; tap "Take Photo" [untried]; press BACK [untried]
- element ids available for callouts: e2="Close sheet", e4="Drag handle", e7="Attach Photos", e8="Take Photo", e9="Attach Photos", e10="Take Photo"

### s13 [chat] Painting
Conversation screen with a message composer
- texts: "Close sheet", "Drag handle", "Painting", "Describe the artwork", "Oil painting of a village at sunset", "0/240", "Create it!"
- actions: type a short message and send it (may spend) [no-effect]; tap "Create it!" (core loop) [no-effect]; tap "Close sheet"; tap "Drag handle" [untried]; tap "Painting" [untried]; tap "Describe the artwork" [untried]; tap "0/240" [untried]; press BACK [untried]
- element ids available for callouts: e2="Close sheet", e4="Drag handle", e6="Painting", e7="Describe the artwork", e9="Oil painting of a villag", e10="0/240", e12="Create it!"

### s14 [chat] 99%
Conversation screen with a message composer
- texts: "99%", "Getting everything ready", "Luzia is AI and can make mistakes. Verify importan"
- actions: type a short message and send it (may spend) [failed]; tap the unlabeled icon at top-left [untried]; tap "99%" [untried]; tap "Getting everything ready" [untried]; tap the unlabeled icon at bottom-right (button Continue) [untried]; tap "Luzia is AI and can make mistakes. Veri…" [untried]; press BACK [untried]
- element ids available for callouts: e7="99%", e8="Getting everything ready", e11="Luzia is AI and can make"

### s15 [page] Beat maker
Content page
- texts: "Add to Home screen", "User avatar", "Beat maker"
- actions: tap the unlabeled icon at top-left (button Nav Back); tap "Add to Home screen" [failed]; tap "User avatar"; tap "Beat maker" [untried]; press BACK [untried]
- element ids available for callouts: e5="Add to Home screen", e6="User avatar", e7="Beat maker"

### s16 [chat] Luzia
Conversation screen with a message composer
- texts: "User avatar", "Luzia", "Explain quantum physics simply.", "Hi! What happens next?", "10:04", "Hi! 😊 You decide what happens next—ask me anythin", "Help me plan my week", "Explain quantum physics to me", "Give me a creative writing prompt", "Hnext?i", "Confirm button", "Luzia is AI and can make mistakes. Verify importan"
- signals: reward:"Audio Button: Tap twice or hold to recor"
- actions: type a short message and send it (may spend) [untried]; tap the unlabeled icon at top-left; tap "User avatar"; tap "Luzia"; tap "What are we doing today?" [failed]; tap the unlabeled icon at bottom-left (button Add Composer); tap "Luzia is AI and can make mistakes. Veri…" [no-effect]; press BACK [untried]; type a short message and send it (may spend) [untried]
- element ids available for callouts: e6="User avatar", e7="Luzia", e8="Explain quantum physics ", e9="Hi! What happens next?", e10="10:04", e11="Hi! 😊 You decide what h", e18="Help me plan my week", e19="Explain quantum physics ", e20="Give me a creative writi", e21="Hnext?i", e24="Confirm button", e25="Luzia is AI and can make"

### s17 [dialog] Creativity
Dialog shown over the previous screen
- texts: "User avatar", "Explain quantum physics simply.", "Creativity", "Our new chat", "Hi! 😊 You decide what happens next—ask me anythin", "Next steps discussion", "Help me plan my week", "Explain quantum physics to me", "Give me a creative writing prompt", "Solve math problem", "Luzia", "Your everything AI", "Teacher", "The nerd who explains", "Friend", "Always on your side", "Hnext?iHi! What hext?
appens", "Elias", "The bro who listens", "New chat", "Luzia is AI and can make mistakes. Verify importan"
- actions: tap "Next steps discussion" (core loop); type a short message and send it (may spend); tap "New chat" (core loop); tap "User avatar"; tap the unlabeled icon at top-right; tap the unlabeled icon at bottom-right (button Add Composer); tap the unlabeled icon at bottom-left; press BACK [untried]
- element ids available for callouts: e6="User avatar", e8="Explain quantum physics ", e9="Creativity", e11="Our new chat", e13="Hi! 😊 You decide what h", e14="Next steps discussion", e16="Next steps discussion", e20="Our new chat", e21="Help me plan my week", e23="Our new chat", e24="Explain quantum physics ", e26="Give me a creative writi", e27="Solve math problem", e29="Our new chat", e31="Our new chat", e33="Our new chat", e35="Luzia", e36="Your everything AI", e38="Teacher", e39="The nerd who explains"

### s18 [chat] Luzia
Conversation screen with a message composer
- texts: "User avatar", "Luzia", "Explain quantum physics simply.", "Hi! What happens next?", "10:04", "Hi! 😊 You decide what happens next—ask me anythin", "Help me plan my week", "Explain quantum physics to me", "Give me a creative writing prompt", "Ask Luzia", "Audio Button: Tap twice or hold to record. Slide u", "Luzia is AI and can make mistakes. Verify importan"
- signals: timer:"10:04"
- actions: tap "Hi! What happens next?" (core loop); type a short message and send it (may spend); tap the unlabeled icon at top-left; tap the unlabeled icon at top-right [untried]; tap "User avatar" [untried]; tap "Luzia" [untried]; tap "Explain quantum physics simply." [untried]; tap "10:04" [untried]; tap the unlabeled icon at bottom-left (button Add Composer); tap "Confirm button" [untried]
- element ids available for callouts: e6="User avatar", e7="Luzia", e8="Explain quantum physics ", e9="Hi! What happens next?", e10="10:04", e11="Hi! 😊 You decide what h", e18="Help me plan my week", e19="Explain quantum physics ", e20="Give me a creative writi", e22="Ask Luzia", e25="Audio Button: Tap twice ", e26="Luzia is AI and can make"

### s19 [page] Settings
Content page
- texts: "Settings", "Search chats", "Upgrade to Luzia+", "Preferences", "Theme", "Dark Mode", "Toki", "Haptic Feedback", "Enable Floating Widget", "Support", "Contact us", "Rate us", "Account", "Account & Data", "Version: 5.44.0"
- signals: upsell:"Upgrade to Luzia+"
- actions: tap "Upgrade to Luzia+" (monetization); tap "Upgrade to Luzia+" (monetization); tap "Upgrade to Luzia+" (monetization); tap the unlabeled icon at top-left; tap the unlabeled icon at top-right; tap "Settings" [no-effect]; tap "Preferences" [no-effect]; tap "Theme"; tap "Theme"; tap "Theme"
- element ids available for callouts: e6="Settings", e7="Search chats", e10="Upgrade to Luzia+", e11="Upgrade to Luzia+", e12="Upgrade to Luzia+", e13="Preferences", e15="Theme", e16="Theme", e17="Theme", e18="Dark Mode", e21="Toki", e22="Toki", e25="Haptic Feedback", e26="Haptic Feedback", e29="Enable Floating Widget", e30="Enable Floating Widget", e31="Support", e33="Contact us", e34="Contact us", e35="Contact us"

### s20 [page] Luzia
Content page
- texts: "Luzia", "She / Her", "We’re in this together 🫶", "Responses", "Friendly and Chatty", "Favorite messages", "Sign up to adjust my response style and make our c", "Sign up"
- signals: reward:"Sign up to adjust my response style and "
- actions: tap "Sign up to adjust my response style and…" (monetization) [no-effect]; tap "Favorite messages" (core loop); tap "Favorite messages" (core loop); tap "Favorite messages" (core loop); tap "Luzia" [no-effect]; tap the unlabeled icon at top-left; tap "Luzia" [no-effect]; tap "Luzia" [no-effect]; tap "She / Her" [no-effect]; tap "Responses"
- element ids available for callouts: e3="Luzia", e5="Luzia", e6="Luzia", e7="She / Her", e8="We’re in this together �", e10="Responses", e11="Responses", e12="Responses", e13="Friendly and Chatty", e15="Favorite messages", e16="Favorite messages", e17="Favorite messages", e18="Sign up to adjust my res", e20="Sign up"

### s21 [page] Favorite messages
Content page
- texts: "Close sheet", "Favorite messages", "Add button", "Organize your thoughts", "Sign up to start saving your favorite messages. It", "2 mins", "Sign up"
- signals: reward:"Sign up to start saving your favorite me"
- actions: tap "Sign up to start saving your favorite m…" (monetization) [no-effect]; tap "Favorite messages" (core loop) [no-effect]; tap "Close sheet"; tap "Add button" [no-effect]; tap "Organize your thoughts" [no-effect]; tap "Add button" [no-effect]; tap "2 mins" [no-effect]; tap "Sign up"; press BACK [untried]
- element ids available for callouts: e2="Close sheet", e3="Favorite messages", e4="Add button", e5="Organize your thoughts", e6="Sign up to start saving ", e7="Add button", e8="2 mins", e10="Sign up"

### s22 [page] Favorites Page
Displays the user's saved favorite messages.
- texts: "Favorites", "No favorite messages yet", "Your favorite messages will appear here. Long pres"
- actions: tap "No favorite messages yet" (core loop) [no-effect]; tap "Your favorite messages will appear here…" (core loop) [no-effect]; Go back to previous screen; tap "Favorites" [no-effect]; tap "Favorites" [no-effect]; press BACK [untried]
- element ids available for callouts: e4="Favorites", e5="Favorites", e6="No favorite messages yet", e7="Your favorite messages w"

### s23 [login] Login Screen
The app asks the user to sign in or continue with limited access.
- texts: "Hi! I'm Luzia", "Sign up free to unlock features just for you.", "Continue with Google", "Continue with limited access", "By continuing, you automatically accept our Terms "
- signals: reward:"Sign up free to unlock features just for", lock:"Sign up free to unlock features just for", limit:"Continue with limited access"
- actions: press BACK [no-effect]
- element ids available for callouts: e4="Hi! I'm Luzia", e5="Sign up free to unlock f", e7="Continue with Google", e9="Continue with limited ac", e10="By continuing, you autom"

### s26 [modal] Chat History
View and search past chat history and start a new chat.
- texts: "User avatar", "Search chats", "Hi! 😊 You decide what happens next—ask me anythin", "Our new chat", "Next steps discussion", "Help me plan my week", "Explain quantum physics to me", "Give me a creative writing prompt", "Solve math problem", "Hnext?iHi! What hext?
appens", "New chat", "Luzia is AI and can make mistakes. Verify importan"
- actions: tap "Help me plan my week" (monetization); type a short message and send it (may spend); Open past chat [unreachable]; tap "Next steps discussion" (core loop) [unreachable]; type a short message and send it (may spend) [unreachable]; Start new chat [unreachable]; tap "User avatar" [unreachable]; tap the unlabeled icon at top-right [unreachable]; Clear search [unreachable]; tap the unlabeled icon at bottom-right (button Add Composer) [unreachable]
- element ids available for callouts: e7="User avatar", e8="Search chats", e9="Hi! 😊 You decide what h", e11="Our new chat", e13="Next steps discussion", e17="Next steps discussion", e18="Help me plan my week", e20="Explain quantum physics ", e21="Our new chat", e23="Give me a creative writi", e24="Our new chat", e26="Solve math problem", e28="Our new chat", e30="Our new chat", e32="Our new chat", e33="Hnext?iHi! What hext?
ap", e37="New chat", e38="Luzia is AI and can make"

### s27 [sheet] Attachment and Mode Sheet
Allows users to attach photos or files and toggle deep reasoning mode.
- texts: "Close sheet", "Drag handle", "Take Photo", "Attach Photos", "Attach Files", "Deep reasoning", "Luzia", "Smarter, deeper answers"
- signals: upsell:"Deep reasoning"
- actions: Toggle deep reasoning mode; tap "Close sheet"; tap "Drag handle" [untried]; tap "Take Photo" [untried]; tap "Deep reasoning"; tap "Luzia" [untried]; tap "Deep reasoning" [untried]; tap "Smarter, deeper answers" [untried]; press BACK [untried]
- element ids available for callouts: e2="Close sheet", e4="Drag handle", e8="Take Photo", e9="Attach Photos", e10="Attach Files", e11="Take Photo", e12="Attach Photos", e13="Attach Files", e15="Deep reasoning", e16="Luzia", e17="Deep reasoning", e18="Smarter, deeper answers"

### s28 [page] Doodle Page
Displays a doodle app or feature page.
- texts: "Add to Home screen", "User avatar", "Doodle"
- actions: Go back; Add to Home screen [failed]; tap "User avatar" [untried]; tap "Doodle" [untried]; press BACK [untried]
- element ids available for callouts: e5="Add to Home screen", e6="User avatar", e7="Doodle"

### s29 [page] Beat Maker
Create and edit custom musical loops and beats using a step sequencer interface.
- texts: "Add to Home screen", "User avatar", "Beat maker", "Beat Painter", "Tap to paint a looping beat", "Pause", "110", "Clear grid", "My beats", "Tempo", "Save", "BPM", "Bar timeline", "Remove last bar", "Add a bar", "2 bars", "Beat grid", "Row 1, step 15", "Row 1, step 16", "Row 1, step 17", "Row 1, step 18", "Row 1, step 19", "Row 1, step 20", "Row 1, step 21", "Row 1, step 22"
- actions: Play or pause the beat loop; Add a bar to the sequence length; Paint a beat step on the grid; tap the unlabeled icon at top-left (button Nav Back); tap "Add to Home screen" [untried]; tap "User avatar" [untried]; tap "Beat maker" [untried]; tap "Beat Painter" [untried]; tap "Tap to paint a looping beat" [untried]; tap "110" [untried]
- element ids available for callouts: e5="Add to Home screen", e6="User avatar", e7="Beat maker", e8="Beat Painter", e9="Tap to paint a looping b", e10="Pause", e11="110", e12="Clear grid", e13="My beats", e14="Tempo", e15="Save", e16="BPM", e17="Tempo", e18="Bar timeline", e19="Remove last bar", e20="Add a bar", e21="2 bars", e22="Beat grid", e23="Row 1, step 15", e24="Row 1, step 16"

### s30 [page] Beat Maker Interface
The user can create and customize looping beats using an interactive sequencer grid.
- texts: "Add to Home screen", "User avatar", "Beat maker", "Beat Painter", "Tap to paint a looping beat", "Pause", "110", "Clear grid", "My beats", "Tempo", "Save", "BPM", "Bar timeline", "Remove last bar", "Add a bar", "2 bars", "Beat grid", "Row 1, step 1", "Row 1, step 2", "Row 1, step 3", "Row 1, step 4", "Row 1, step 5", "Row 1, step 6", "Row 1, step 7", "Row 1, step 8"
- actions: Toggle play/pause of the beat [no-effect]; Add a bar to the timeline; Tap beat grid cell to paint beat [no-effect]; tap the unlabeled icon at top-left (button Nav Back) [untried]; tap "Add to Home screen" [untried]; tap "User avatar" [untried]; tap "Beat maker" [untried]; tap "Beat Painter" [untried]; tap "Tap to paint a looping beat" [untried]; tap "110" [untried]
- element ids available for callouts: e5="Add to Home screen", e6="User avatar", e7="Beat maker", e8="Beat Painter", e9="Tap to paint a looping b", e10="Pause", e11="110", e12="Clear grid", e13="My beats", e14="Tempo", e15="Save", e16="BPM", e17="Tempo", e18="Bar timeline", e19="Remove last bar", e20="Add a bar", e21="2 bars", e22="Beat grid", e23="Row 1, step 1", e24="Row 1, step 2"

### s31 [dialog] Beat Maker Chat
Users can chat with Elias to generate beat loops on their grid.
- texts: "Add to Home screen", "User avatar", "Beat maker", "Beat Painter", "Tap to paint a looping beat", "Play", "110", "Clear grid", "My beats", "Tempo", "Save", "BPM", "Close", "Bar timeline", "Remove last bar", "Add a bar", "Elias", "2 bars", "Beat grid", "Row 1, step 16", "Row 1, step 17", "Row 1, step 18", "Row 1, step 19", "Row 1, step 20", "Row 1, step 21"
- actions: Select prompt to make a trap beat; Select prompt for lo-fi loop [unreachable]; Select prompt for a surprise beat [unreachable]; type a short text and submit it [unreachable]; Close chat dialog [unreachable]; tap "Elias" [unreachable]; tap "Yo, I'm Elias 🎧" [unreachable]; tap "Tell me a vibe and I'll paint a beat st…" [unreachable]; tap the unlabeled icon at bottom-right [unreachable]; press BACK [unreachable]
- element ids available for callouts: e5="Add to Home screen", e6="User avatar", e7="Beat maker", e8="Beat Painter", e9="Tap to paint a looping b", e10="Play", e11="110", e12="Clear grid", e13="My beats", e14="Tempo", e15="Save", e16="BPM", e17="Tempo", e18="Close", e19="Bar timeline", e20="Remove last bar", e21="Add a bar", e22="Elias", e23="2 bars", e24="Beat grid"

### s32 [page] Beat Maker Interface
Create and customize looping beats with AI chat assistance.
- texts: "Add to Home screen", "User avatar", "Beat maker", "Beat Painter", "Tap to paint a looping beat", "Play", "110", "Clear grid", "My beats", "Tempo", "Save", "BPM", "Close", "Bar timeline", "Remove last bar", "Add a bar", "Elias", "2 bars", "Make me a trap beat", "Beat grid", "Row 1, step 16", "Row 1, step 17", "Row 1, step 18", "Row 1, step 19", "Row 1, step 20"
- actions: Play or pause the beat; View saved beats [untried]; tap "Make me a trap beat" [untried]; tap "Thinking…" [untried]; scroll down to reveal more [untried]; press BACK [untried]
- element ids available for callouts: e5="Add to Home screen", e6="User avatar", e7="Beat maker", e8="Beat Painter", e9="Tap to paint a looping b", e10="Play", e11="110", e12="Clear grid", e13="My beats", e14="Tempo", e15="Save", e16="BPM", e17="Tempo", e18="Close", e19="Bar timeline", e20="Remove last bar", e21="Add a bar", e22="Elias", e23="2 bars", e24="Make me a trap beat"

### s36 [chat] Teacher Chat
A chat interface with an AI Teacher persona where users can ask questions and receive answers.
- texts: "User avatar", "Luzia", "New", "Next steps discussion", "Explain quantum physics simply.", "Hi! What happens next?", "10:04", "Hi! 😊 You decide what happens next—ask me anythin", "Help me plan my week", "Explain quantum physics to me", "Give me a creative writing prompt", "Ask Luzia", "Audio Button: Tap twice or hold to record. Slide u", "Luzia is AI and can make mistakes. Verify importan"
- signals: reward:"Audio Button: Tap twice or hold to recor"
- actions: tap "Our new chat" (core loop); tap "Hello, I'm Teacher. Ask me for advice, …" (core loop) [no-effect]; Send a message to the AI teacher; tap the unlabeled icon at top-left (button Nav Back); tap the unlabeled icon at top-right (button Search) [untried]; tap "User avatar" [untried]; tap "Teacher" [untried]; tap the unlabeled icon at bottom-left (button Add Composer); tap "Luzia is AI and can make mistakes. Veri…" [untried]; scroll down to reveal more [untried]
- element ids available for callouts: e7="User avatar", e8="Luzia", e9="New", e11="Next steps discussion", e14="Explain quantum physics ", e16="Hi! What happens next?", e17="10:04", e19="Hi! 😊 You decide what h", e26="Help me plan my week", e27="Explain quantum physics ", e28="Give me a creative writi", e31="Ask Luzia", e34="Audio Button: Tap twice ", e35="Luzia is AI and can make"

### s37 [dialog] Rename Thread Dialog
Allows the user to rename the current chat thread.
- texts: "Rename thread", "Choose a name for your thread; you can change it l", "Our new chatMy Chat
", "Close", "20/30", "Cancel", "Save"
- actions: tap "Rename thread" [no-effect]; Type new thread name; tap "12/30" [no-effect]; Cancel renaming the thread; Save the new thread name [untried]; press BACK [untried]
- element ids available for callouts: e2="Rename thread", e3="Choose a name for your t", e4="Our new chatMy Chat
", e6="Close", e7="20/30", e10="Cancel", e11="Save"

## Navigation edges (from → to via action; effects)

- g0001: s01 → s01 [replace] via a01_1 (e4)
- g0002: s01 → s02 [sheet] via a01_2 (e25)
- g0003: s02 → s01 [back] via a02_1 (e2)
- g0004: s01 → s03 [push] via a01_3 (e53)
- g0005: s03 → s04 [back] via a03_1 (e7); appeared "Your Dream Wedding Look", appeared "KPOP", appeared "Tokio Y2K", appeared "Multi", appeared "Cinematic Film portrait", disappeared "Kawaii Portrait", disappeared "How will you look as an old pe", disappeared "Turn me into a Pixar character", disappeared "Clapping hands", disappeared "Turn Your Pet Into a Superhero"
- g0006: s04 → s03 [modal] via a04_1 (e7); appeared "Kawaii Portrait", appeared "How will you look as an old pe", appeared "Turn me into a Pixar character", appeared "Clapping hands", appeared "Turn Your Pet Into a Superhero", disappeared "Your Dream Wedding Look", disappeared "KPOP", disappeared "Tokio Y2K", disappeared "Multi", disappeared "Cinematic Film portrait"
- g0007: s03 → s05 [sheet] via a03_2 (e16)
- g0008: s05 → s05 [replace] via a05_1 (e13)
- g0009: s05 → s03 [back] via a05_2 (e2)
- g0010: s03 → s01 [push] via a03_3 (e49)
- g0011: s01 → s06 [push] via a01_4 (e54)
- g0012: s06 → s06 [replace] via a06_1 (e7)
- g0013: s06 → s07 [sheet] via a06_2 (e8)
- g0014: s07 → s06 [back] via a07_9
- g0015: s06 → s07 [sheet] via a06_3 (e9)
- g0016: s06 → s01 [push] via a06_4 (e4); appeared "Chats", appeared "Try Luzia", appeared "Luzia", appeared "How can I help you today?", appeared "New chat", disappeared "Services", disappeared "Let Luzia handle it!", disappeared "Bookings, shopping, alerts and", disappeared "Start new task"
- g0017: s01 → s08 [push] via a01_5 (e55)
- g0018: s08 → s09 [push] via a08_1 (e14)
- g0019: s09 → s09 [replace] via a09_1 (e7)
- g0020: s09 → s10 [modal] via a09_2 (e5)
- g0021: s10 → s11 [push] via a10_1 (e6)
- g0022: s11 → s10 [push] via a11_1 (e5)
- g0023: s10 → s09 [back] via a10_2 (e7)
- g0024: s09 → s11 [modal] via a09_3 (e6)
- g0025: s11 → s11 [replace] via a11_2 (e6)
- g0026: s11 → s09 [back] via a11_3 (e7)
- g0027: s09 → s09 [replace] via a09_4 (e18); appeared "Clapping"
- g0028: s09 → s12 [push] via a09_5 (e32)
- g0029: s12 → s09 [push] via a12_1 (e2)
- g0030: s10 → s10 [replace] via a10_3 (e14); appeared "You can add up to 2 photos to ", disappeared "Mix or swap elements from phot"
- g0031: s10 → s13 [push] via a10_4 (e19)
- g0032: s13 → s13 [replace] via a13_1 (e8)
- g0033: s13 → s13 [replace] via a13_2 (e12)
- g0034: s13 → s10 [push] via a13_3 (e2)
- g0035: s10 → s14 [push] via a10_5 (e34)
- g0036: s08 → s11 [push] via a08_2 (e15)
- g0037: s11 → s11 [replace] via a11_4 (e36); appeared "Mix or swap elements from phot", appeared "Mait cyberpunk", disappeared "Upload a photo and describe yo"
- g0038: s11 → s08 [push] via a11_5 (e4)
- g0039: s08 → s08 [replace] via a08_3 (e4)
- g0040: s08 → s15 [tab] via a08_4 (e7)
- g0041: s15 → s08 [push] via a15_1 (e4)
- g0042: s08 → s15 [tab] via a08_5 (e8)
- g0043: s15 → ext:launcher [external] via a15_2 (e5)
- g0044: s16 → s16 [replace] via a16_1 (e21); appeared "Today", appeared "Hi! Whappens next?ha", appeared "10:15", appeared "Loading...", disappeared "What are we doing today?"
- g0045: s16 → s16 [replace] via a16_6 (e22); appeared "Vibing...", disappeared "Loading..."
- g0046: s16 → s17 [modal] via a16_2 (e4)
- g0047: s17 → s16 [back] via a17_1 (e12)
- g0048: s17 → s18 [push] via a17_2; appeared "Luzia", appeared "Hi! What happens next?", appeared "10:04", appeared "Hnext?iHi! What hext?
appens", appeared "Confirm button", disappeared "Creativity", disappeared "Our new chat", disappeared "Next steps discussion", disappeared "Solve math problem", disappeared "Hnext?i"
- g0049: s18 → s16 [push] via a18_1 (e9)
- g0050: s17 → s17 [replace] via a17_3 (e49); appeared "Luzia", appeared "Your everything AI", appeared "Teacher", appeared "The nerd who explains", appeared "Friend"
- g0051: s17 → s16 [back] via a17_9 (e47)
- g0052: s17 → s19 [push] via a17_10 (e48)
- g0053: s19 → s07 [sheet] via a19_1 (e10)
- g0054: s19 → s07 [sheet] via a19_2 (e11)
- g0055: s19 → s07 [sheet] via a19_3 (e12)
- g0056: s19 → s16 [push] via a19_4 (e3)
- g0057: s16 → s20 [push] via a16_3 (e6)
- g0058: s20 → s20 [replace] via a20_1 (e18)
- g0059: s20 → s21 [push] via a20_2 (e15)
- g0060: s21 → s21 [replace] via a21_1 (e6)
- g0061: s21 → s21 [replace] via a21_2 (e3)
- g0062: s21 → s22 [push] via a21_3 (e2)
- g0063: s22 → s22 [replace] via a22_1 (e6)
- g0064: s22 → s22 [replace] via a22_2 (e7)
- g0065: s22 → s20 [push] via a22_3 (e3)
- g0066: s20 → s21 [push] via a20_3 (e16)
- g0067: s20 → s21 [push] via a20_4 (e17)
- g0068: s21 → s21 [replace] via a21_4 (e4)
- g0069: s21 → s21 [replace] via a21_5 (e5)
- g0070: s21 → s21 [replace] via a21_6 (e7)
- g0071: s21 → s21 [replace] via a21_7 (e8)
- g0072: s21 → s23 [push] via a21_8 (e10)
- g0073: s23 → s23 [replace] via a23_8
- g0074: s22 → s22 [replace] via a22_4 (e4)
- g0075: s22 → s22 [replace] via a22_5 (e5)
- g0076: s20 → s20 [replace] via a20_5 (e3)
- g0077: s20 → s16 [push] via a20_6 (e4)
- g0078: s16 → s20 [push] via a16_4 (e7)
- g0079: s20 → s20 [replace] via a20_7 (e5)
- g0080: s20 → s20 [replace] via a20_8 (e6)
- g0081: s20 → s20 [replace] via a20_9 (e7)
- g0082: s20 → s24 [sheet] via a20_10 (e10)
- g0083: s24 → s20 [back] via a24_10
- g0084: s20 → s24 [sheet] via a20_11 (e11)
- g0085: s19 → s19 [replace] via a19_5 (e9); appeared "Search chats"
- g0086: s19 → s19 [replace] via a19_6 (e6)
- g0087: s19 → s19 [replace] via a19_7 (e13)
- g0088: s19 → s25 [push] via a19_8 (e15)
- g0089: s25 → s25 [replace] via a25_1 (e13)
- g0090: s25 → s25 [replace] via a25_2 (e16)
- g0091: s25 → s25 [replace] via a25_3 (e4); appeared "Hi! What happens next?", disappeared "Search chats"
- g0092: s25 → s25 [replace] via a25_4 (e5); disappeared "Hi! What happens next?"
- g0093: s25 → s25 [replace] via a25_5 (e10)
- g0094: s25 → s25 [replace] via a25_6 (e15)
- g0095: s25 → s19 [back] via a25_11
- g0096: s19 → s25 [push] via a19_9 (e16)
- g0097: s17 → s16 [back] via a17_4 (e3); appeared "Luzia", appeared "Hi! What happens next?", appeared "10:04", appeared "Confirm button", disappeared "Creativity", disappeared "Our new chat", disappeared "Next steps discussion", disappeared "Solve math problem", disappeared "New chat"
- g0098: s16 → s16 [replace] via a16_7 (e25)
- g0099: s17 → s26 [modal] via a17_5 (e4); appeared "Search chats", disappeared "Creativity"
- g0100: s26 → s16 [push] via a26_1 (e18); appeared "Luzia", appeared "Confirm button", disappeared "Search chats", disappeared "Our new chat", disappeared "Next steps discussion", disappeared "Solve math problem", disappeared "New chat"
- g0101: s26 → s18 [push] via a26_2 (e4); appeared "Hi! What happens next?", appeared "No results found", appeared "Nothing matches that yet. Try ", disappeared "Search chats", disappeared "Our new chat", disappeared "Next steps discussion", disappeared "Solve math problem"
- g0102: s18 → s18 [replace] via a18_2; appeared "Luzia", appeared "Hnext?iHi! What hext?
appensHi", appeared "Confirm button", disappeared "Hi! What happens next?", disappeared "No results found", disappeared "Nothing matches that yet. Try ", disappeared "Hnext?iHi! What hext?
appens", disappeared "New chat"
- g0103: s18 → s27 [sheet] via a18_9 (e23)
- g0104: s27 → s07 [sheet] via a27_1 (e14)
- g0105: s03 → s06 [push] via a03_4 (e51)
- g0106: s03 → s08 [push] via a03_5 (e52)
- g0107: s08 → s28 [tab] via a08_6 (e9)
- g0108: s28 → s08 [push] via a28_1 (e4)
- g0109: s08 → s15 [push] via a08_7 (e10)
- g0110: s15 → s29 [push] via a15_3 (e6); appeared "Beat Painter", appeared "Tap to paint a looping beat", appeared "Play", appeared "110", appeared "Clear grid"
- g0111: s29 → s29 [replace] via a29_1 (e10); appeared "Pause", disappeared "Play"
- g0112: s29 → s29 [replace] via a29_2 (e20); auto:TextView||# bars|0 +1, appeared "Remove last bar", appeared "2 bars", appeared "Row 1, step 17", appeared "Row 2, step 17", appeared "Row 3, step 17", disappeared "Already at minimum length", disappeared "1 bars"
- g0113: s29 → s29 [replace] via a29_3 (e23); appeared "Row 1, step 1, kick", disappeared "Row 1, step 1"
- g0114: s29 → s29 [replace] via a29_11 (e12)
- g0115: s29 → s29 [replace] via a29_12 (e13); appeared "My beats", appeared "Close", appeared "No saved beats yet. Paint one ", disappeared "Row 1, step 15", disappeared "Row 2, step 15", disappeared "Row 3, step 15", disappeared "Row 4, step 15", disappeared "Row 5, step 15"
- g0116: s29 → s30 [push] via a29_14 (e15)
- g0117: s30 → s30 [replace] via a30_1 (e10)
- g0118: s30 → s30 [replace] via a30_2 (e20); auto:TextView||# bars|0 +1
- g0119: s30 → s30 [replace] via a30_3 (e23)
- g0120: s30 → s30 [replace] via a30_11 (e12); appeared "Grid cleared", disappeared "Bar added"

## Leaves the app (recorded, not explored)

- ext:launcher (com.google.android.apps.nexuslauncher) from Beat maker, Doodle Page: Luzia | Touch & hold the widget to move it around the home screen | Beat maker widget, 1 wide by 1 high | Beat maker | 1 × 1 | Cancel

## Coverage

38 states, 171 edges, 175 steps, stop: budget_steps. Not explored: 107 actions.
- not explored on Custom Bestie Signup Sheet: Open sign up flow (annotator: destructive or out of scope)
- not explored on Ideas Feed: Switch to Fun filter (travel failed twice)
- not explored on Ideas Feed: Switch to Video Effects filter (travel failed twice)
- not explored on Ideas Feed: Switch to World Cup 2026 filter (travel failed twice)
- not explored on Ideas Feed: Navigate to Services tab (travel failed twice)
- not explored on Ideas Feed: Navigate to Apps tab (travel failed twice)
- not explored on Ideas Feed: Open Vogue fashion editorial idea (travel failed twice)
- not explored on Ideas Feed: Navigate to Chat tab (travel failed twice)
- not explored on Ideas Feed: tap "Ideas" (travel failed twice)
- not explored on Ideas Feed: tap "All" (travel failed twice)
- not explored on Ideas Feed: tap "Sunset Halo portrait" (travel failed twice)
- not explored on Ideas Feed: tap "Your Dream Wedding Look" (travel failed twice)
- not explored on Ideas Feed: tap "KPOP" (travel failed twice)
- not explored on Ideas Feed: tap "Discover your perfect hairstyle" (travel failed twice)
- not explored on Ideas Feed: tap "Papparazzi swarming you" (travel failed twice)
- ... and 92 more (see viewer.html)
