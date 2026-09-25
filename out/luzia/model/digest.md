# Luzia — product model digest

Captured 2026-09-25, account state: guest. Regime (computed): **consumable-economy**.

## Brief

- One-liner: Luzia is a versatile AI companion providing conversational assistance, image generation, custom photo editing, and animation tools.
- Audience: Creative enthusiasts, students, and casual users seeking an intuitive, free-to-start mobile AI utility.
- Core loop: Ask Luzia questions or choose specialized AI personas → Request image creations, edits, or animations → Create a free account to customize chatbot preferences and save favorite responses
- How it makes money today: Monetizes through upselling advanced capabilities under the 'Luzia+' tier (like Deep Reasoning) which currently drives account creation and likely future subscriptions.
- What is scarce: Access to advanced Deep Reasoning model answers; Personalized response styles and chat favorites persistence without an account
- Ads today: No advertisements were observed during exploration.
- Open questions: What are the pricing models, subscription costs, and trial terms for Luzia+ once an account is successfully linked?; Does the app impose daily usage limits on free image generation or editing?

## Economy (every item has evidence; conf=inferred means not verified on screen)

- RESOURCE r1 Luzia+ Membership [entitlement, unit=tier] shown on ?; observed values ? (observed) — o0018 "To enjoy Luzia+ you need to create an account first."
- RESOURCE r2 User Account [entitlement, unit=profile] shown on ?; observed values ? (observed) — o0028 "Sign up to adjust my response style and make our chats even "
- SINK k1: Use deep reasoning costs 1 r1 when Deep reasoning toggle in chat options (inferred) — o0017 "Deep reasoning"
- SINK k2: Customize response style costs 1 r2 when Adjust profile response style (inferred) — o0028 "Sign up to adjust my response style"
- SINK k3: Save favorite messages costs 1 r2 when Access favorites configuration (inferred) — o0030 "Sign up to start saving your favorite messages. It's quick, "
- SOURCE src1: Sign up for a free account gives 1 r2 [once] on Create Account Sheet (inferred) — o0018 "Create your account"
- WALL w1: blocks "Toggle deep reasoning mode" when r1 runs out; shows Create Account Sheet; offers none; decline edge g0018
- WALL w2: blocks "Customize response style" when r2 runs out; shows Response Style Signup; offers none; decline edge g0026
- WALL w3: blocks "Save favorite messages" when r2 runs out; shows Favorites Sheet; offers none; decline edge g0030
- ENTITLEMENT plan "Luzia+": Smarter, deeper answers; Deep reasoning
- AD TODAY: none observed

## Derived numbers (computed in code from observed prices and cited constants — use these, do not recompute)

- value of one completed rewarded view (after non-game haircut): US $0.009–0.015, EU $0.0038–0.0067, LATAM $0.0015–0.003
- cheapest paid pack: none observed
- note: No priced packs observed: unit prices, action costs and exchange rate are unavailable.
- note: No daily free source observed.

## Moments (where a value exchange could happen)

- m1 [wall] on s07 (Create Account Sheet), reach=frequent: "Toggle deep reasoning mode" is blocked when Luzia+ Membership run out: Create Account Sheet appears
- m2 [decline] on s07 (Create Account Sheet), reach=frequent: The user dismisses Create Account Sheet without buying and returns to AI Chat Screen
- m3 [wall] on s10 (Response Style Signup), reach=frequent: "Customize response style" is blocked when User Account run out: Response Style Signup appears
- m4 [decline] on s10 (Response Style Signup), reach=frequent: The user dismisses Response Style Signup without buying and returns to Bot Profile Sheet
- m5 [wall] on s11 (Favorites Sheet), reach=frequent: "Save favorite messages" is blocked when User Account run out: Favorites Sheet appears
- m6 [decline] on s11 (Favorites Sheet), reach=frequent: The user dismisses Favorites Sheet ("Close sheet") without buying and returns to Favorites Page
- m7 [desire] on s06 (Chat Bot Screen), reach=frequent: Each "Use deep reasoning" on Chat Bot Screen costs 1 Luzia+ Membership depending on Deep reasoning toggle in chat options
- m8 [desire] on s09 (Bot Profile Sheet), reach=frequent: Each "Customize response style" on Bot Profile Sheet costs 1 User Account depending on Adjust profile response style / Access favorites configuration
- m9 [desire] on s01 (Chats Home), reach=core-loop: Chats Home shows an upsell: "Try Luzia"
- m10 [desire] on s13 (Chat Home), reach=occasional: Chat Home shows an upsell: "Try Luzia"
- m11 [post-reward] on s07 (Create Account Sheet), reach=frequent: Right after Sign up for a free account (+1 User Account), once
- m12 [hub] on s01 (Chats Home), reach=core-loop: Chats Home (tab) is a place users return to (4 visits during exploration)
- m13 [hub] on s13 (Chat Home), reach=occasional: Chat Home (tab) is a place users return to (2 visits during exploration)
- m14 [hub] on s15 (Create Image), reach=frequent: Create Image (tab) is a place users return to (5 visits during exploration)
- m15 [hub] on s16 (Animate Tool Screen), reach=occasional: Animate Tool Screen (tab) is a place users return to (4 visits during exploration)
- m16 [first-value, NO OFFERS ALLOWED] on s01 (Chats Home), reach=core-loop: Chats Home is the first screen with core content after launch: no offer may appear here
- m17 [first-value, NO OFFERS ALLOWED] on s03 (AI Chat Screen), reach=core-loop: Users are presented with immediate suggested commands like 'Generate an image of a cat' right on the chat screen, delivering high initial capability with zero mandatory setup.

## Flows

- f1 [core] General AI Chatting: Chats Home (launch) → New Chat Selection (Open Chat options) → AI Chat Screen (Select Luzia chat) → Photo Edit Mode (Edit a photo) → Photo Edit Sheet (Type photo editing instructions → blocked)
- f2 [monetization] AI Image Generation: Chats Home (launch) → New Chat Selection (Open Chat options) → AI Chat Screen (Select Luzia chat) → Photo Edit Mode (Edit a photo) → Photo Edit Sheet (Type photo editing instructions → blocked)
- f3 [monetization] Hit the wall: Create Account Sheet: Chats Home (launch) → New Chat Selection (Open Chat options) → AI Chat Screen (Select Luzia chat) → Chat Bot Screen (Tap the unlabeled icon) → Create Account Sheet (Toggle deep reasoning mode)
- f4 [monetization] Hit the wall: Response Style Signup: Chats Home (launch) → New Chat Selection (Open Chat options) → AI Chat Screen (Select Luzia chat) → Chat Bot Screen (Tap the unlabeled icon) → AI Chat Home (Close sheet) → Bot Profile Sheet (User avatar) → Response Style Signup (Friendly and Chatty)
- f5 [monetization] Hit the wall: Favorites Sheet: Chats Home (launch) → New Chat Selection (Open Chat options) → AI Chat Screen (Select Luzia chat) → Chat Bot Screen (Tap the unlabeled icon) → AI Chat Home (Close sheet) → Bot Profile Sheet (User avatar) → Favorites Sheet (Favorite messages)
- f6 [secondary] AI Photo Editing: Chats Home (launch) → New Chat Selection (Open Chat options) → AI Chat Screen (Select Luzia chat) → Photo Edit Mode (Edit a photo) → Create Image (Switch to Create mode)
- f7 [secondary] AI Photo Animation: Chats Home (launch) → New Chat Selection (Open Chat options) → AI Chat Screen (Select Luzia chat) → Photo Edit Mode (Edit a photo) → Animate Tool Screen (Switch to Animate mode)

## Screens (id, kind, name — purpose; key texts; actions)

### s01 [tab] Chats Home
Main chat and navigation hub for the AI assistant app.
- texts: "Chats", "Try Luzia", "Luzia", "How can I help you today?", "Let's start, what do you need?", "Chat", "Talk to AI personalities", "Ideas", "Get the most out of Luzia", "Apps", "Tools to make your life easier", "Services"
- signals: upsell:"Try Luzia", limit:"Get the most out of Luzia"
- actions: Open subscription/upsell page [no-effect]; tap "Chats" (core loop) [no-effect]; tap "Let's start, what do you need?" (core loop) [no-effect]; Open Chat options; tap "Chat" (core loop) [untried]; Open Ideas [untried]; Open Apps [untried]; tap "Chat Chat" (core loop) [untried]; Switch to Ideas tab [untried]; Switch to Services tab [untried]
- element ids available for callouts: e7="Chats", e8="Try Luzia", e10="Luzia", e11="How can I help you today", e12="Let's start, what do you", e14="Chat", e15="Talk to AI personalities", e17="Ideas", e18="Get the most out of Luzi", e20="Apps", e21="Tools to make your life ", e26="Chat", e27="Ideas", e28="Services", e29="Apps", e30="Chat", e31="Ideas", e32="Services", e33="Apps"

### s02 [page] New Chat Selection
Select a character or bot to start a new chat.
- texts: "New chat", "Luzia", "Teacher", "Friend", "Elias", "Trainer", "Chef", "Languages", "Intimate", "Marketing", "Stylist", "Astrologer", "Kawaii", "Legal", "Adult", "Staff", "Try something else", "Toki", "Custom Bestie"
- actions: tap "New chat" (core loop) [no-effect]; Select Luzia chat; Select Teacher chat [untried]; tap "Try something else" (core loop) [untried]; tap the unlabeled icon at top-left (button Nav Back) [untried]; tap "Friend" [untried]; tap "Languages" [untried]; tap "Intimate" [untried]; tap "Marketing" [untried]; scroll down to reveal more [untried]
- element ids available for callouts: e4="New chat", e6="Luzia", e8="Teacher", e10="Friend", e11="Luzia", e12="Teacher", e13="Friend", e15="Elias", e17="Trainer", e19="Chef", e20="Elias", e21="Trainer", e22="Chef", e24="Languages", e26="Intimate", e28="Marketing", e29="Languages", e30="Intimate", e31="Marketing", e33="Stylist"

### s03 [chat] AI Chat Screen
This screen is a chat interface with an AI assistant named Luzia where users can ask questions and use suggested prompts.
- texts: "User avatar", "Luzia", "New", "Our new chat", "Hey, I'm Luzia. What can I do for you? Just type w", "Hi! What happens next?", "00:30", "Hi! That depends on what you mean 😊 What would yo", "Help me write an email", "Can you explain quantum physics?", "Generate an image of a cat", "Ask Luzia", "Audio Button: Tap twice or hold to record. Slide u", "Luzia is AI and can make mistakes. Verify importan"
- signals: reward:"Audio Button: Tap twice or hold to recor"
- actions: tap "Our new chat" (core loop); tap "Hello, I'm Luzia. Ask me for advice, an…" (core loop) [no-effect]; Tap suggestion to create an image; Send a message to Luzia; tap the unlabeled icon at top-left (button Nav Back) [untried]; tap the unlabeled icon at top-right (button Search) [untried]; tap "User avatar" [untried]; tap "Luzia" [untried]; tap "Edit a photo"; tap "Animate a photo" [untried]
- element ids available for callouts: e7="User avatar", e8="Luzia", e9="New", e11="Our new chat", e14="Hey, I'm Luzia. What can", e16="Hi! What happens next?", e17="00:30", e19="Hi! That depends on what", e26="Help me write an email", e27="Can you explain quantum ", e28="Generate an image of a c", e31="Ask Luzia", e34="Audio Button: Tap twice ", e35="Luzia is AI and can make"

### s04 [dialog] Rename Thread Dialog
Allow the user to rename the current chat thread.
- texts: "Rename thread", "Choose a name for your thread; you can change it l", "Our new chatMy chat
", "Close", "20/30", "Cancel", "Save"
- actions: tap "Rename thread" [no-effect]; Type a new thread name; tap "12/30" [no-effect]; Cancel renaming the thread; Save the new thread name [untried]; press BACK [untried]
- element ids available for callouts: e2="Rename thread", e3="Choose a name for your t", e4="Our new chatMy chat
", e6="Close", e7="20/30", e10="Cancel", e11="Save"

### s05 [chat] Chat Screen
A chat interface with an AI assistant named Luzia where users can converse and generate images.
- texts: "User avatar", "Luzia", "New", "Our new chat", "Hello, I'm Luzia. Ask me for advice, answers, or l", "I want to create an image", "00:30", "Loading...", "Ask Luzia", "Audio Button: Tap twice or hold to record. Slide u", "Luzia is AI and can make mistakes. Verify importan"
- actions: Start a new chat; tap "Hello, I'm Luzia. Ask me for advice, an…" (core loop) [unreachable]; Type a message to the AI [unreachable]; Search chat history [unreachable]; tap "Loading..." [unreachable]; scroll down to reveal more [unreachable]; press BACK [unreachable]
- element ids available for callouts: e7="User avatar", e8="Luzia", e9="New", e11="Our new chat", e14="Hello, I'm Luzia. Ask me", e16="I want to create an imag", e17="00:30", e18="Loading...", e21="Ask Luzia", e24="Audio Button: Tap twice ", e25="Luzia is AI and can make"

### s06 [chat] Chat Bot Screen
Interact with an AI assistant via chat and attachments.
- texts: "Close sheet", "Drag handle", "Take Photo", "Attach Photos", "Attach Files", "Deep reasoning", "Luzia", "Smarter, deeper answers"
- actions: Toggle deep reasoning mode; tap "Close sheet"; tap "Drag handle"; Take a photo; tap "Take Photo" [no-effect]; tap "Deep reasoning"; tap "Luzia"; tap "Deep reasoning"; tap "Smarter, deeper answers" [untried]; scroll down to reveal more [untried]
- element ids available for callouts: e2="Close sheet", e4="Drag handle", e8="Take Photo", e9="Attach Photos", e10="Attach Files", e11="Take Photo", e12="Attach Photos", e13="Attach Files", e15="Deep reasoning", e16="Luzia", e17="Deep reasoning", e18="Smarter, deeper answers"

### s08 [chat] AI Chat Home
The main chat interface of the Luzia AI assistant where users can prompt the AI or use suggested quick actions.
- texts: "User avatar", "Luzia", "Hi! 😊 What happens next depends on what you mean—", "I am starting a new project", "How do I write a story?", "I need help with my schedule", "00:32", "Exciting! 🚀 What kind of project are you starting", "It is a web development project", "I'm writing a new novel", "How can I plan it better?", "Ask Luzia", "Audio Button: Tap twice or hold to record. Slide u", "Luzia is AI and can make mistakes. Verify importan"
- signals: reward:"Audio Button: Tap twice or hold to recor"
- actions: Open side navigation menu; Select prompt suggestion: Create an image; Type a prompt to the AI assistant [no-effect]; tap "User avatar"; tap "Luzia"; tap "What are we doing today?" [failed]; tap "Edit a photo" [failed]; tap "Animate a photo" [failed]; tap "Help with math" [failed]; tap "Talk about life" [failed]
- element ids available for callouts: e6="User avatar", e7="Luzia", e8="Hi! 😊 What happens next", e15="I am starting a new proj", e16="How do I write a story?", e17="I need help with my sche", e18="I am starting a new proj", e19="00:32", e20="Exciting! 🚀 What kind o", e27="It is a web development ", e28="I'm writing a new novel", e29="How can I plan it better", e31="Ask Luzia", e34="Audio Button: Tap twice ", e35="Luzia is AI and can make"

### s09 [sheet] Bot Profile Sheet
Displays bot profile details and prompts the user to sign up to customize responses.
- texts: "Luzia", "She / Her", "We’re in this together 🫶", "Responses", "Friendly and Chatty", "Favorite messages", "Sign up to adjust my response style and make our c", "Sign up"
- signals: reward:"Sign up to adjust my response style and "
- actions: tap "Sign up to adjust my response style and…" (monetization) [no-effect]; tap "Friendly and Chatty" (core loop); tap "Favorite messages" (core loop); tap "Favorite messages" (core loop); tap "Favorite messages" (core loop); tap "Luzia" [no-effect]; tap the unlabeled icon at top-left; tap "Luzia" [no-effect]; tap "Luzia" [no-effect]; tap "She / Her" [no-effect]
- element ids available for callouts: e3="Luzia", e5="Luzia", e6="Luzia", e7="She / Her", e8="We’re in this together �", e10="Responses", e11="Responses", e12="Responses", e13="Friendly and Chatty", e15="Favorite messages", e16="Favorite messages", e17="Favorite messages", e18="Sign up to adjust my res", e20="Sign up"

### s12 [page] Favorites Page
Displays the user's saved favorite messages.
- texts: "Favorites", "No favorite messages yet", "Your favorite messages will appear here. Long pres"
- actions: tap "No favorite messages yet" (core loop) [no-effect]; tap "Your favorite messages will appear here…" (core loop) [no-effect]; Go back to previous screen; tap "Favorites" [no-effect]; tap "Favorites" [no-effect]; press BACK [untried]
- element ids available for callouts: e4="Favorites", e5="Favorites", e6="No favorite messages yet", e7="Your favorite messages w"

### s13 [tab] Chat Home
The main chat hub where users can start new chats with different AI personas or continue existing conversations.
- texts: "Chats", "Try Luzia", "Luzia", "How can I help you today?", "New chat", "SEE MORE", "Teacher", "Friend", "Elias", "Custom Bestie", "Make an AI expert tailored to you", "Meet Toki, your virtual pet!", "Create and take care of your own pet", "Keep chatting", "Our new chat", "Today", "Chat", "Ideas", "Services", "Apps"
- signals: upsell:"Try Luzia"
- actions: Open Luzia Plus subscription page [no-effect]; Open chat with Luzia; tap "Chats" (core loop) [untried]; tap "New chat" (core loop) [untried]; Open chat with Teacher persona [untried]; Open chat with Friend persona [untried]; Open chat with Elias persona [untried]; tap "Keep chatting" (core loop) [untried]; tap "Our new chat" (core loop) [untried]; tap "Our new chat" (core loop) [untried]
- element ids available for callouts: e7="Chats", e8="Try Luzia", e10="Luzia", e11="How can I help you today", e13="New chat", e14="SEE MORE", e16="Teacher", e18="Friend", e20="Elias", e21="Teacher", e22="Friend", e23="Elias", e26="Custom Bestie", e27="Make an AI expert tailor", e30="Meet Toki, your virtual ", e31="Create and take care of ", e34="Keep chatting", e36="Our new chat", e37="Our new chat", e38="Today"

### s14 [page] Photo Edit Mode
The user can upload a photo and describe changes to edit it using AI, or choose popular styles.
- texts: "Create", "Edit", "Animate", "Photoedit", "Upload a photo and describe your changes", "Popular", "9:16", "Vogue", "Kawaii", "Halo", "Old-me", "Pixar", "Luzia is AI and can make mistakes. Verify importan"
- signals: timer:"9:16"
- actions: Switch to Create mode; Switch to Edit mode [no-effect]; Switch to Animate mode; Select popular Vogue style; Type photo editing instructions; tap the unlabeled icon at top-left [untried]; tap the unlabeled icon at top-right [untried]; tap the unlabeled icon at top-right [untried]; tap "Photoedit" [untried]; tap "9:16" [untried]
- element ids available for callouts: e10="Create", e11="Edit", e12="Animate", e13="Photoedit", e14="Upload a photo and descr", e18="Popular", e19="9:16", e21="Vogue", e23="Kawaii", e25="Halo", e27="Old-me", e29="Pixar", e30="Vogue", e31="Kawaii", e32="Halo", e33="Old-me", e34="Pixar", e36="Vogue", e40="Luzia is AI and can make"

### s15 [tab] Create Image
Create and edit AI images based on user prompts and popular templates.
- texts: "Create", "Edit", "Animate", "Create image", "Mix or swap elements from photos", "Popular", "9:16", "Painting", "Character", "Invitation", "Outfit", "Fashion", "Luzia is AI and can make mistakes. Verify importan"
- actions: Switch to Create tab [no-effect]; Switch to Edit tab; Switch to Animate tab; tap "Create image" (core loop) [no-effect]; Select Painting popular template; Type idea for image generation [untried]; tap "Mix or swap elements from photos" [untried]; scroll down to reveal more [untried]; press BACK [untried]
- element ids available for callouts: e10="Create", e11="Edit", e12="Animate", e14="Create image", e15="Mix or swap elements fro", e17="Popular", e18="9:16", e20="Painting", e22="Character", e24="Invitation", e26="Outfit", e28="Fashion", e29="Painting", e30="Character", e31="Invitation", e32="Outfit", e33="Fashion", e36="Luzia is AI and can make"

### s16 [tab] Animate Tool Screen
Users can upload or select pictures to animate using AI tools.
- texts: "Create", "Edit", "Animate", "Upload the pic you want to animate", "Popular", "Waving", "Clapping", "Walking", "Jumping", "Winking", "Luzia is AI and can make mistakes. Verify importan"
- actions: Switch to Create tab; Switch to Edit tab; Describe animation idea; tap the unlabeled icon at top-left [untried]; tap "Animate" [untried]; tap the unlabeled icon at top-right [untried]; tap the unlabeled icon at top-right [untried]; tap "Animate" [untried]; tap "Popular" [untried]; tap "Clapping" [untried]
- element ids available for callouts: e10="Create", e11="Edit", e12="Animate", e13="Animate", e14="Upload the pic you want ", e17="Popular", e23="Waving", e24="Clapping", e25="Walking", e26="Jumping", e27="Winking", e28="Waving", e32="Luzia is AI and can make"

### s17 [sheet] Photo Edit Sheet
Select photo source for editing.
- texts: "Close sheet", "Drag handle", "Attach Photos", "Take Photo"
- actions: tap "Close sheet"; tap "Drag handle" [untried]; tap "Take Photo" [untried]; press BACK [untried]
- element ids available for callouts: e2="Close sheet", e4="Drag handle", e7="Attach Photos", e8="Take Photo", e9="Attach Photos", e10="Take Photo"

### s18 [sheet] Create Image Sheet
Users can type a prompt to create an AI painting.
- texts: "Close sheet", "Drag handle", "Painting", "Describe the artwork", "Oil painting of a village at sunset", "0/240", "Create it!"
- actions: Generate the image [failed]; Type prompt for image creation [no-effect]; tap "Create it!" (core loop) [no-effect]; tap "Close sheet" [untried]; tap "Drag handle" [untried]; tap "Painting" [untried]; tap "Describe the artwork" [untried]; tap "0/240" [untried]; press BACK [untried]
- element ids available for callouts: e2="Close sheet", e4="Drag handle", e6="Painting", e7="Describe the artwork", e9="Oil painting of a villag", e10="0/240", e12="Create it!"

## Navigation edges (from → to via action; effects)

- g0001: s01 → s01 [replace] via a01_1 (e4)
- g0002: s01 → s01 [replace] via a01_2 (e7)
- g0003: s01 → s01 [replace] via a01_3 (e12)
- g0004: s01 → s02 [push] via a01_4 (e13)
- g0005: s02 → s02 [replace] via a02_1 (e4)
- g0006: s02 → s03 [push] via a02_2 (e5)
- g0007: s03 → s04 [modal] via a03_1 (e11)
- g0008: s04 → s04 [replace] via a04_1 (e2)
- g0009: s04 → s04 [replace] via a04_2 (e4); appeared "Our new chatMy chat", appeared "Close", appeared "20/30", disappeared "Our new chat", disappeared "12/30"
- g0010: s04 → s04 [replace] via a04_3 (e7)
- g0011: s04 → s03 [back] via a04_4 (e8)
- g0012: s03 → s03 [replace] via a03_2
- g0013: s03 → s05 [back] via a03_3 (e28); appeared "New", appeared "I want to create an image", appeared "00:30", appeared "Loading...", disappeared "Create an image", disappeared "Edit a photo", disappeared "Animate a photo", disappeared "Help with math", disappeared "Talk about life"
- g0014: s05 → s03 [modal] via a05_1 (e5); appeared "Hey, I'm Luzia. What can I do ", appeared "Create an image", appeared "Edit a photo", appeared "Animate a photo", appeared "Help with math", disappeared "New", disappeared "Hello, I'm Luzia. Ask me for a", disappeared "I want to create an image", disappeared "00:30", disappeared "Loading..."
- g0015: s03 → s03 [replace] via a03_4 (e30); appeared "New", appeared "Hi! What happens next?", appeared "00:30", appeared "Hi! That depends on what you m", appeared "Help me write an email", disappeared "Create an image", disappeared "Edit a photo", disappeared "Animate a photo", disappeared "Help with math", disappeared "Talk about life"
- g0016: s03 → s06 [push] via a03_13 (e32)
- g0017: s06 → s07 [sheet] via a06_1 (e14)
- g0018: s07 → s03 [back] via a07_9
- g0019: s08 → s08 [replace] via a08_1 (e4); appeared "Creativity", appeared "Our new chat", appeared "New chat", disappeared "Luzia", disappeared "Audio Button: Tap twice or hol"
- g0020: s08 → s08 [replace] via a08_2; appeared "Luzia", appeared "Audio Button: Tap twice or hol", disappeared "Creativity", disappeared "Our new chat", disappeared "New chat"
- g0021: s08 → s08 [replace] via a08_3 (e30)
- g0022: s08 → s06 [push] via a08_11 (e32)
- g0023: s08 → s09 [sheet] via a08_4 (e6)
- g0024: s09 → s09 [replace] via a09_1 (e18)
- g0025: s09 → s10 [sheet] via a09_2 (e13)
- g0026: s10 → s09 [back] via a10_10
- g0027: s09 → s11 [sheet] via a09_3 (e15)
- g0028: s11 → s11 [replace] via a11_1 (e6)
- g0029: s11 → s11 [replace] via a11_2 (e3)
- g0030: s11 → s12 [push] via a11_3 (e2)
- g0031: s12 → s12 [replace] via a12_1 (e6)
- g0032: s12 → s12 [replace] via a12_2 (e7)
- g0033: s12 → s09 [sheet] via a12_3 (e3)
- g0034: s09 → s11 [sheet] via a09_4 (e16)
- g0035: s09 → s11 [sheet] via a09_5 (e17)
- g0036: s11 → s11 [replace] via a11_4 (e4)
- g0037: s11 → s11 [replace] via a11_5 (e5)
- g0038: s11 → s11 [replace] via a11_6 (e7)
- g0039: s11 → s11 [replace] via a11_7 (e8)
- g0040: s12 → s12 [replace] via a12_4 (e4)
- g0041: s12 → s12 [replace] via a12_5 (e5)
- g0042: s09 → s09 [replace] via a09_6 (e3)
- g0043: s09 → s08 [back] via a09_7 (e4)
- g0044: s08 → s09 [sheet] via a08_5 (e7)
- g0045: s09 → s09 [replace] via a09_8 (e5)
- g0046: s09 → s09 [replace] via a09_9 (e6)
- g0047: s09 → s09 [replace] via a09_10 (e7)
- g0048: s09 → s10 [sheet] via a09_11 (e9)
- g0049: s06 → s08 [push] via a06_2 (e2)
- g0050: s08 → s08 [replace] via a08_12 (e35)
- g0051: s08 → s08 [replace] via a08_13
- g0052: s08 → s08 [replace] via a08_16 (e8)
- g0053: s08 → s08 [replace] via a08_17 (e15); appeared "I am starting a new project", appeared "00:32", appeared "Loading..."
- g0054: s08 → s08 [replace] via a08_18 (e31); appeared "Exciting! 🚀 What kind of proj", appeared "It is a web development projec", appeared "I'm writing a new novel", appeared "How can I plan it better?", disappeared "Loading..."
- g0055: s06 → s08 [push] via a06_3 (e3)
- g0056: s06 → ext:permission [external] via a06_4 (e5)
- g0057: s06 → s06 [replace] via a06_5 (e11)
- g0058: s06 → s07 [sheet] via a06_6 (e15)
- g0059: s06 → s07 [sheet] via a06_7 (e16)
- g0060: s06 → s07 [sheet] via a06_8 (e17)
- g0061: s13 → s13 [replace] via a13_1 (e4)
- g0062: s13 → s03 [push] via a13_2 (e9)
- g0063: s03 → s14 [push] via a03_9
- g0064: s14 → s15 [push] via a14_1 (e5)
- g0065: s15 → s15 [replace] via a15_1 (e5)
- g0066: s15 → s14 [push] via a15_2 (e6)
- g0067: s14 → s14 [replace] via a14_2 (e6)
- g0068: s14 → s16 [back] via a14_3 (e7)
- g0069: s16 → s15 [modal] via a16_1 (e5)
- g0070: s15 → s16 [back] via a15_3 (e7)
- g0071: s16 → s14 [modal] via a16_2 (e6)
- g0072: s14 → s14 [replace] via a14_4 (e20); appeared "Vogue"
- g0073: s14 → s17 [sheet] via a14_5 (e38); LIMIT HIT
- g0074: s17 → s14 [back] via a17_1 (e2)
- g0075: s16 → s17 [sheet] via a16_3 (e30); LIMIT HIT
- g0076: s15 → s15 [replace] via a15_4 (e14)
- g0077: s15 → s18 [sheet] via a15_5 (e19)
- g0078: s18 → s18 [replace] via a18_2 (e8)
- g0079: s18 → s18 [replace] via a18_3 (e12)

## Leaves the app (recorded, not explored)

- ext:permission (com.google.android.permissioncontroller) from Chat Bot Screen: Allow Luzia to take pictures and record video? | While using the app | Only this time | Don’t allow

## Coverage

18 states, 79 edges, 85 steps, stop: saturated. Not explored: 46 actions.
- not explored on Chats Home: Open settings (annotator: destructive or out of scope)
- not explored on AI Chat Screen: tap "Audio Button: Tap twice or hold to reco…" (monetization) (guard: out of scope)
- not explored on Chat Screen: tap "Hello, I'm Luzia. Ask me for advice, an…" (core loop) (travel failed twice)
- not explored on Chat Screen: Type a message to the AI (travel failed twice)
- not explored on Chat Screen: Search chat history (travel failed twice)
- not explored on Chat Screen: tap "Loading..." (travel failed twice)
- not explored on Chat Screen: scroll down to reveal more (travel failed twice)
- not explored on Chat Screen: press BACK (travel failed twice)
- not explored on Chat Bot Screen: Attach photos (guard: out of scope)
- not explored on Chat Bot Screen: Attach files (guard: out of scope)
- not explored on Chat Bot Screen: tap "Attach Photos" (guard: out of scope)
- not explored on Chat Bot Screen: tap "Attach Files" (guard: out of scope)
- not explored on Create Account Sheet: tap "Create your account" (core loop) (login wall: no human available)
- not explored on Create Account Sheet: tap "To enjoy Luzia+ you need to create an a…" (core loop) (login wall: no human available)
- not explored on Create Account Sheet: tap "Continue with Google" (core loop) (login wall: no human available)
- ... and 31 more (see viewer.html)
