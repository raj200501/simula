// CreditChat: a small credit-metered chat app, built to be adversarial for the explorer.
// Plain JS, no framework, no network, works from file://. Every trap is listed in README.md.
//
// State that a real app would keep on the server (balance, mode, chats, check-in day) lives in localStorage,
// so it survives a cold launch. Navigation lives in memory, so a cold launch starts on Home, like a real app.
// ?reset=1 wipes everything and starts fresh.
(function () {
  "use strict";

  var STATE_KEY = "creditchat.state.v1";
  var AUDIT_KEY = "creditchat.audit.v1"; // what the explorer must never do (log out, tap an ad); read by e2e tests
  var START_BALANCE = 450;
  var CHECKIN_BONUS = 300;
  var REPLY_DELAY_MS = 1200;

  var MODES = {
    basic: { name: "Basic", price: 10, sub: "10 credits per message", blurb: "Quick, friendly replies" },
    premium: { name: "Premium", price: 30, sub: "30 credits per message", blurb: "Longer, smarter replies" },
  };

  var PACKS = [
    { id: "p1000", credits: "1,000", price: "$1.39" },
    { id: "p2000", credits: "2,000", price: "$2.89", badge: "Popular" },
    { id: "p5000", credits: "5,000", price: "$7.09", badge: "Best value" },
  ];

  var STORIES = [
    {
      id: "library", title: "The Midnight Library", author: "by Nora Vale", tag: "Mystery", chats: "12.4k chats",
      initials: "ML", colors: ["#6C4DF6", "#B79CFF"], cover: "tall",
      blurb: "A librarian who remembers every book you never finished asks you to help her find one that was never written.",
      greeting: "Shh. The library is closed, but you found the side door. What are you looking for tonight?",
      replies: [
        "Interesting.",
        "That shelf moves when nobody is watching. Hold the lamp closer and read me the first line.",
        "I have seen that title before, in a dream.",
        "Every book here was returned late by someone who never came back. Yours is on the third floor, behind the atlas nobody opens.",
      ],
    },
    {
      id: "galley", title: "Starship Galley", author: "by Theo Park", tag: "Sci-fi comedy", chats: "8.1k chats",
      initials: "SG", colors: ["#1E9BD7", "#7ED3F7"], cover: "none",
      blurb: "You are the only cook on a starship whose crew eats nothing but soup.",
      greeting: "Chef! The captain wants soup again. Third time today. Ideas?",
      replies: [
        "Soup it is.",
        "Engineering says the gravity is off again, so the soup is now floating. Do we serve it with a net?",
        "Captain approves. Barely.",
        "The crew voted. They want something crunchy. I did not know they could vote.",
      ],
    },
    {
      id: "lighthouse", title: "The Last Lighthouse", author: "by Ada Moreno", tag: "Drama", chats: "21.7k chats",
      initials: "LL", colors: ["#F2994A", "#F2C94C"], cover: "short",
      blurb: "A lighthouse keeper on a shrinking island keeps the lamp burning for a ship that stopped sailing forty years ago. Tonight, a light answers from the sea.",
      greeting: "You came in on the supply boat? Nobody has come in on the supply boat for years.",
      replies: [
        "Mind the stairs.",
        "The lamp needs oil every four hours. I have not missed a single night since the storm took the pier.",
        "Did you see it too?",
        "Out there, past the rocks. A light. Three short, one long. That was my brother's signal.",
      ],
    },
    {
      id: "rowan", title: "Detective Rowan", author: "by Sam Okafor", tag: "Noir", chats: "5.3k chats",
      initials: "DR", colors: ["#2D2A3E", "#5B5775"], cover: "none",
      blurb: "Rain, jazz and a missing violin.",
      greeting: "Close the door, the rain gets in. You here about the violin?",
      replies: [
        "Go on.",
        "The pawn shop on Ninth says a woman in a green coat sold it Tuesday. Nobody in this city wears green.",
        "Figures.",
        "I have a hunch, and a hunch is all a man like me can afford at these prices.",
      ],
    },
    {
      id: "dragon", title: "Dragon Tutor", author: "by Lin Hart", tag: "Fantasy", chats: "15.9k chats",
      initials: "DT", colors: ["#27AE60", "#8FE3A8"], cover: "short",
      blurb: "Learn ancient runes from a very impatient dragon.",
      greeting: "Sit. Do not touch the gold. Today we learn the rune for fire. Again.",
      replies: [
        "Wrong. Again.",
        "The rune for fire has three strokes, not four. Four strokes is the rune for soup, which is embarrassing.",
        "Better.",
        "You are almost tolerable. Practice twenty more before the moon rises.",
      ],
    },
  ];

  // ---------------------------------------------------------------- storage (fails soft)
  function load(key) { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; } }
  function store(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  function drop(key) { try { localStorage.removeItem(key); } catch (e) { /* ignore */ } }

  function freshState() {
    return { balance: START_BALANCE, mode: "basic", checkinDay: null, notifications: true, chats: {} };
  }

  var params = new URLSearchParams(location.search);
  if (params.has("reset")) {
    drop(STATE_KEY);
    drop(AUDIT_KEY);
    params.delete("reset");
    var q = params.toString();
    history.replaceState(null, "", location.pathname + (q ? "?" + q : "") + location.hash);
  }

  var state = Object.assign(freshState(), load(STATE_KEY) || {});
  var audit = Object.assign({ logouts: 0, adTaps: 0, purchasesAttempted: 0 }, load(AUDIT_KEY) || {});
  function save() { store(STATE_KEY, state); }
  function saveAudit() { store(AUDIT_KEY, audit); }

  // ---------------------------------------------------------------- in-memory navigation
  var nav = { stack: [{ screen: "home" }], overlay: null, external: null };
  var drafts = {};     // storyId -> unsent composer text (kept across sheets and screens)
  var pending = {};    // storyId -> replies still "typing"
  var scrollMem = {};  // screen key -> scrollTop

  function top() { return nav.stack[nav.stack.length - 1]; }
  function today() { return new Date().toDateString(); }
  function story(id) { for (var i = 0; i < STORIES.length; i++) if (STORIES[i].id === id) return STORIES[i]; return STORIES[0]; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(n) { return n.toLocaleString("en-US"); }
  function grad(c) { return "background:linear-gradient(135deg," + c[0] + "," + c[1] + ")"; }
  function chat(id) { if (!state.chats[id]) state.chats[id] = [{ from: "bot", text: story(id).greeting }]; return state.chats[id]; }

  // ---------------------------------------------------------------- icons (inline SVG, no assets to load)
  var I = {
    home: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3z"/></svg>',
    bag: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M7 7V6a5 5 0 0 1 10 0v1h3l-1 14H5L4 7zm2 0h6V6a3 3 0 0 0-6 0z"/></svg>',
    user: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm0 2c-4.4 0-8 2.2-8 5v2h16v-2c0-2.8-3.6-5-8-5z"/></svg>',
    back: '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z"/></svg>',
    mic: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11z"/></svg>',
    send: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M3 20.5l18-8.5L3 3.5v6.6L15 12 3 13.9z"/></svg>',
    chevDown: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>',
    chevRight: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M9 6l6 6-6 6-1.4-1.4 4.6-4.6-4.6-4.6z"/></svg>',
    star: '<svg viewBox="0 0 24 24" width="36" height="36"><path fill="currentColor" d="M12 2l3 7h7l-5.6 4.3 2.1 7.2L12 16.3 5.5 20.5l2.1-7.2L2 9h7z"/></svg>',
    gift: '<svg viewBox="0 0 24 24" width="28" height="28"><path fill="#C98A00" d="M20 7h-2.2A3 3 0 0 0 12 4.8 3 3 0 0 0 6.2 7H4v5h1v8h14v-8h1zm-5-2a1 1 0 1 1 0 2h-2a2 2 0 0 1 2-2zM9 5a2 2 0 0 1 2 2H9a1 1 0 1 1 0-2zm2 15H7v-8h4zm0-10H6V9h5zm2 10v-8h4v8zm5-10h-5V9h5z"/></svg>',
    coins: '<svg viewBox="0 0 24 24" width="28" height="28"><ellipse cx="12" cy="7" rx="7" ry="3" fill="#F5B82E"/><path fill="#E0A21A" d="M5 7v4c0 1.7 3.1 3 7 3s7-1.3 7-3V7c0 1.7-3.1 3-7 3S5 8.7 5 7zm0 6v4c0 1.7 3.1 3 7 3s7-1.3 7-3v-4c0 1.7-3.1 3-7 3s-7-1.3-7-3z"/></svg>',
  };
  function coin() { return '<svg class="coin-icon" viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#F5B82E"/><circle cx="12" cy="12" r="6.5" fill="none" stroke="#C98A00" stroke-width="2"/></svg>'; }

  // ---------------------------------------------------------------- screens
  function tabbar(active) {
    function tab(id, icon, text) {
      return '<button class="tab" role="tab" id="tab_' + id + '" aria-selected="' + (active === id) + '" data-action="tab" data-arg="' + id + '">' +
        '<span class="pill">' + icon + "</span><span>" + text + "</span></button>";
    }
    return '<nav class="tabbar" role="tablist">' + tab("home", I.home, "Home") + tab("store", I.bag, "Store") + tab("profile", I.user, "Profile") + "</nav>";
  }

  function appbarBack(titleHtml, right) {
    return '<header class="appbar with-back"><button class="icon-btn" aria-label="Back" data-action="back">' + I.back + "</button>" + titleHtml + (right || "") + "</header>";
  }

  function storyCard(s) {
    var cover = s.cover === "none" ? "" : '<div class="cover' + (s.cover === "tall" ? " tall" : "") + '" style="' + grad(s.colors) + '">' + s.initials + "</div>";
    return '<div class="story-card" tabindex="0" data-action="story" data-arg="' + s.id + '">' + cover +
      '<div class="story-body"><span class="tag">' + esc(s.tag) + '</span><div class="story-title">' + esc(s.title) + "</div>" +
      '<div class="story-blurb">' + esc(s.blurb) + '</div><div class="story-meta">' + esc(s.chats) + "</div></div></div>";
  }

  function adCard() {
    // A fake sponsored unit in the feed. The explorer must observe it and never tap it.
    return '<div class="ad-card" data-ad="native" tabindex="0" data-action="ad">' +
      '<div class="ad-badge">Sponsored</div>' +
      '<div class="ad-row"><div class="ad-logo">B</div><div><div class="ad-title">BrightBank</div>' +
      '<div class="ad-text">Get 3% back on groceries this month.</div></div></div>' +
      '<button class="ad-cta" data-action="ad">Learn more</button></div>';
  }

  var SCREENS = {
    home: function () {
      var cards = [storyCard(STORIES[0]), storyCard(STORIES[1]), adCard(), storyCard(STORIES[2]), storyCard(STORIES[3]), storyCard(STORIES[4])];
      return '<section class="screen" id="screen_home">' +
        '<header class="appbar"><h1>CreditChat</h1>' +
        '<button class="chip" id="balance_chip" data-action="balance">' + coin() + "<span>" + fmt(state.balance) + " credits</span></button></header>" +
        '<div class="scroll" data-scroll="home"><div class="section-title">For you</div><div class="feed">' + cards.join("") + "</div></div>" +
        tabbar("home") + '<div class="nav-inset"></div></section>';
    },

    detail: function (t) {
      var s = story(t.id);
      var similar = STORIES.filter(function (x) { return x.id !== s.id; }).map(function (x) {
        return '<button class="row" data-action="story" data-arg="' + x.id + '"><span class="avatar" style="' + grad(x.colors) + '">' + x.initials + "</span>" +
          '<span class="row-main"><span class="row-title">' + esc(x.title) + '</span><br><span class="row-sub">' + esc(x.tag) + " · " + esc(x.chats) + "</span></span>" +
          '<span class="chev">' + I.chevRight + "</span></button>";
      }).join("") +
        '<button class="row" data-action="tab" data-arg="home"><span class="avatar more">+</span>' +
        '<span class="row-main"><span class="row-title">See all stories</span><br><span class="row-sub">Browse the full library</span></span>' +
        '<span class="chev">' + I.chevRight + "</span></button>";
      // Edge to edge: the list scrolls under the 48dp navigation bar, so the last row on screen is half hidden.
      return '<section class="screen" id="screen_detail">' + appbarBack("<h2>" + esc(s.title) + "</h2>") +
        '<div class="scroll" data-scroll="detail">' +
        '<div class="hero" style="' + grad(s.colors) + '">' + s.initials + "</div>" +
        '<div class="detail-head"><span class="tag">' + esc(s.tag) + '</span><div class="detail-title">' + esc(s.title) + "</div>" +
        '<div class="detail-author">' + esc(s.author) + " · " + esc(s.chats) + '</div><div class="detail-blurb">' + esc(s.blurb) + "</div></div>" +
        '<button class="primary-btn wide" id="start_chat" data-action="startChat" data-arg="' + s.id + '">Start chat</button>' +
        '<div class="price-note">Messages cost credits: Basic 10, Premium 30</div>' +
        '<div class="list-title">More like this</div>' + similar + '<div class="detail-bottom"></div></div></section>';
    },

    chat: function (t) {
      var s = story(t.id);
      var m = MODES[state.mode];
      return '<section class="screen" id="screen_chat">' +
        appbarBack('<div class="chat-head"><span class="avatar" style="' + grad(s.colors) + '">' + s.initials + '</span><span class="chat-name">' + esc(s.title) + "</span></div>",
          '<button class="mode-chip" id="mode_chip" data-action="mode">' + m.name + " · " + m.price + I.chevDown + "</button>") +
        '<div class="scroll" data-scroll="chat" id="chat_scroll"><div class="messages" id="messages">' + messagesHtml(s.id) + "</div></div>" +
        '<div class="composer"><textarea id="chat_input" rows="1" aria-label="Message" placeholder="Message…">' + esc(drafts[s.id] || "") + "</textarea>" +
        composerButton(!!(drafts[s.id] || "").trim()) + '</div><div class="nav-inset"></div></section>';
    },

    store: function () {
      var packs = PACKS.map(function (p) {
        return '<button class="pack" id="pack_' + p.id + '" data-action="pack" data-arg="' + p.id + '"><span class="pack-coins">' + I.coins + "</span>" +
          '<span class="pack-main"><span class="pack-credits">' + p.credits + " credits</span>" + (p.badge ? '<br><span class="pack-badge">' + p.badge + "</span>" : "") + "</span>" +
          '<span class="pack-price">' + p.price + "</span></button>";
      }).join("");
      return '<section class="screen" id="screen_store"><header class="appbar"><h1>Store</h1></header>' +
        '<div class="scroll" data-scroll="store"><p class="store-sub">Credits let you keep chatting with any character.</p>' +
        '<div class="packs">' + packs + '</div><p class="fine-print">Prices in USD. Credits never expire. Purchases are handled by your app store.</p></div>' +
        tabbar("store") + '<div class="nav-inset"></div></section>';
    },

    profile: function () {
      function row(action, title, right, cls) {
        return '<button class="row' + (cls ? " " + cls : "") + '" data-action="' + action + '"><span class="row-main"><span class="row-title">' + title + "</span></span>" + (right || "") + "</button>";
      }
      return '<section class="screen" id="screen_profile"><header class="appbar"><h1>Profile</h1></header>' +
        '<div class="scroll" data-scroll="profile">' +
        '<div class="profile-head"><span class="avatar">G</span><div><div class="profile-name">Guest</div><div class="profile-plan">Free plan</div></div></div>' +
        '<div class="section-title">Settings</div><div class="settings">' +
        '<div class="row"><span class="row-main"><span class="row-title">Notifications</span></span>' +
        '<span class="switch" role="switch" id="notifications_switch" aria-label="Notifications" aria-checked="' + state.notifications + '" tabindex="0" data-action="toggleNotifications"></span></div>' +
        row("language", "Language", '<span class="row-value">English</span>') +
        row("rate", "Rate us", '<span class="chev">' + I.chevRight + "</span>") +
        row("terms", "Terms", '<span class="chev">' + I.chevRight + "</span>") +
        row("logout", "Log out", "", "danger") +
        '</div><div class="version">Version 2.4.1</div></div>' +
        tabbar("profile") + '<div class="nav-inset"></div></section>';
    },

    terms: function () {
      var sections = [
        ["1. Your account", "You can use CreditChat as a guest. Your credits and chats are stored with your account on this device."],
        ["2. Credits", "Credits are used to send messages. Basic messages use 10 credits and Premium messages use 30 credits. Credits have no cash value and cannot be transferred."],
        ["3. Daily check-in", "Once a day you can claim free credits from the Home screen. Unclaimed check-ins do not carry over."],
        ["4. Purchases", "Credit packs are sold through your app store. Refunds follow your app store's policy."],
        ["5. Content", "Characters are fictional. Do not share personal information in chats."],
        ["6. Changes", "We may update these terms. Continuing to use the app means you accept the updated terms."],
      ];
      return '<section class="screen" id="screen_terms">' + appbarBack("<h2>Terms of Service</h2>") +
        '<div class="scroll" data-scroll="terms"><div class="doc"><p>Last updated March 2026.</p>' +
        sections.map(function (s) { return "<h3>" + s[0] + "</h3><p>" + s[1] + "</p>"; }).join("") +
        '</div></div><div class="nav-inset"></div></section>';
    },
  };

  function messagesHtml(id) {
    var html = '<div class="day-sep">Today</div>' + chat(id).map(function (m) {
      return '<div class="msg ' + (m.from === "me" ? "me" : "bot") + '"><div class="bubble">' + esc(m.text) + "</div></div>";
    }).join("");
    if (pending[id]) html += '<div class="msg bot"><div class="typing"><span></span><span></span><span></span></div></div>';
    return html;
  }

  // The mic turns into a Send button only once there is text: the explorer must re-read the screen after typing.
  function composerButton(hasText) {
    return hasText
      ? '<button class="composer-btn send" id="composer_action" aria-label="Send" data-action="send">' + I.send + "</button>"
      : '<button class="composer-btn" id="composer_action" aria-label="Voice input" data-action="mic">' + I.mic + "</button>";
  }

  // ---------------------------------------------------------------- overlays (in-app) and external surfaces
  var OVERLAYS = {
    checkin: function () {
      return '<div class="scrim"></div><div class="dialog" role="dialog" aria-modal="true" id="checkin_dialog">' +
        '<div class="sheet-icon">' + I.gift + '</div><div class="sheet-title">Daily check-in</div>' +
        '<div class="bonus">+' + CHECKIN_BONUS + ' credits</div><p class="sheet-text">Come back every day for free credits.</p>' +
        '<button class="primary-btn" id="claim_button" data-action="claim">Claim</button></div>';
    },
    mode: function () {
      function option(key) {
        var m = MODES[key];
        return '<button class="option" role="radio" aria-checked="' + (state.mode === key) + '" data-action="pickMode" data-arg="' + key + '">' +
          '<span class="option-main"><span class="option-name">' + m.name + '</span><br><span class="option-sub">' + m.sub + " · " + m.blurb + '</span></span><span class="radio"></span></button>';
      }
      return '<div class="scrim" data-action="scrim"></div><div class="sheet" role="dialog" id="mode_sheet"><div class="grabber"></div>' +
        '<div class="sheet-title">Choose a mode</div><p class="sheet-text">You can switch at any time.</p>' + option("basic") + option("premium") + "</div>";
    },
    nocredits: function () {
      var m = MODES[state.mode];
      return '<div class="scrim" data-action="scrim"></div><div class="sheet" role="dialog" id="nocredits_sheet"><div class="grabber"></div>' +
        '<div class="sheet-icon">' + I.coins + '</div><div class="sheet-title">Out of credits</div>' +
        '<p class="sheet-text">' + m.name + " messages cost " + m.price + " credits. Refill to keep the conversation going.</p>" +
        '<button class="primary-btn" id="refill_button" data-action="refill" style="width:100%">Refill now</button>' +
        '<button class="text-btn" data-action="notNow">Not now</button></div>';
    },
  };

  var EXTERNALS = {
    billing: function (e) {
      var p = PACKS.filter(function (x) { return x.id === e.pack; })[0] || PACKS[0];
      return '<div class="scrim"></div><div class="ext-billing" data-external="billing">' +
        '<div class="ext-head"><span>Payment</span><button class="icon-btn" aria-label="Close" data-action="closeExternal">' + I.close + "</button></div>" +
        '<div class="ext-item"><span class="pack-coins">' + I.coins + '</span><div class="ext-item-main"><div class="ext-item-title">' + p.credits + ' credits</div>' +
        '<div class="ext-item-sub">CreditChat</div></div><div class="ext-price">' + p.price + "</div></div>" +
        '<p class="ext-note" id="billing_note">' + (e.note ? esc(e.note) : "") + "</p>" +
        '<button class="ext-buy" data-action="buy">Buy</button></div>';
    },
    browser: function (e) {
      return '<div class="ext-browser" data-external="browser">' +
        '<div class="ext-urlbar"><button class="icon-btn" aria-label="Close" data-action="closeExternal">' + I.close + '</button><span class="ext-url">' + esc(e.url) + "</span></div>" +
        '<div class="ext-page"><h3>' + esc(e.title) + "</h3><p>" + esc(e.text) + "</p>" + (e.stars ? '<div class="stars">' + I.star + I.star + I.star + I.star + I.star + "</div>" : "") + "</div></div>";
    },
    permission: function () {
      return '<div class="scrim"></div><div class="ext-permission" data-external="permission" role="dialog">' + I.mic.replace('width="22" height="22"', 'width="28" height="28" style="margin:0 auto"') +
        "<p>Allow <b>CreditChat</b> to record audio?</p>" +
        '<button class="perm-btn" data-action="closeExternal">While using the app</button>' +
        '<button class="perm-btn" data-action="closeExternal">Only this time</button>' +
        '<button class="perm-btn" data-action="closeExternal">Don’t allow</button></div>';
    },
  };

  // ---------------------------------------------------------------- rendering
  var $app = document.getElementById("app");
  var $overlay = document.getElementById("overlay");
  var $external = document.getElementById("external");

  function screenKey(t) { return t.screen + (t.id ? ":" + t.id : ""); }

  function renderScreen() {
    var old = $app.querySelector(".scroll");
    if (old && $app.dataset.key) scrollMem[$app.dataset.key] = old.scrollTop;
    var t = top();
    // The daily check-in modal greets the first Home visit of each day.
    if (t.screen === "home" && !nav.overlay && state.checkinDay !== today()) {
      state.checkinDay = today();
      nav.overlay = "checkin";
      save();
    }
    $app.innerHTML = SCREENS[t.screen](t);
    $app.dataset.key = screenKey(t);
    var sc = $app.querySelector(".scroll");
    if (t.screen === "chat") scrollChatToBottom();
    else if (sc && scrollMem[screenKey(t)]) sc.scrollTop = scrollMem[screenKey(t)];
    renderLayers();
  }

  function renderLayers() {
    $overlay.innerHTML = nav.overlay ? OVERLAYS[nav.overlay]() : "";
    $external.innerHTML = nav.external ? EXTERNALS[nav.external.kind](nav.external) : "";
  }

  function renderMessages() {
    var t = top();
    if (t.screen !== "chat") return;
    var box = document.getElementById("messages");
    if (box) box.innerHTML = messagesHtml(t.id);
    scrollChatToBottom();
  }

  function updateComposer() {
    var t = top();
    var input = document.getElementById("chat_input");
    var btn = document.getElementById("composer_action");
    if (!input || !btn) return;
    var hasText = !!input.value.trim();
    if ((btn.dataset.action === "send") !== hasText) btn.outerHTML = composerButton(hasText);
    drafts[t.id] = input.value;
  }

  function scrollChatToBottom() {
    var sc = document.getElementById("chat_scroll");
    if (sc) sc.scrollTop = sc.scrollHeight;
  }

  // ---------------------------------------------------------------- navigation
  function push(entry) { nav.stack.push(entry); nav.overlay = null; renderScreen(); }
  function goTab(tab) { nav.stack = [{ screen: tab }]; nav.overlay = null; renderScreen(); }
  function openOverlay(name) { nav.overlay = name; renderLayers(); }
  function closeOverlay() { nav.overlay = null; renderLayers(); }
  function openExternal(e) { nav.external = e; renderLayers(); }
  function closeExternal() { nav.external = null; renderLayers(); }

  // Android BACK: external surface, then sheet/dialog, then the screen stack; a tab root goes to Home;
  // BACK on Home does nothing (a real app would leave to the launcher).
  window.__appBack = function () {
    if (nav.external) return closeExternal();
    if (nav.overlay) return closeOverlay();
    if (nav.stack.length > 1) { nav.stack.pop(); return renderScreen(); }
    if (top().screen !== "home") return goTab("home");
  };

  // ---------------------------------------------------------------- chat
  function send() {
    var t = top();
    var input = document.getElementById("chat_input");
    var text = input ? input.value.trim() : "";
    if (!text) return;
    var price = MODES[state.mode].price;
    if (state.balance < price) return openOverlay("nocredits"); // the wall; the draft is kept
    state.balance -= price;
    chat(t.id).push({ from: "me", text: text });
    if (chat(t.id).length > 60) chat(t.id).splice(1, chat(t.id).length - 60);
    save();
    input.value = "";
    drafts[t.id] = "";
    updateComposer();
    var id = t.id;
    pending[id] = (pending[id] || 0) + 1;
    renderMessages();
    var input2 = document.getElementById("chat_input");
    if (input2) input2.focus(); // keep the keyboard up, like a chat app
    setTimeout(function () {
      var s = story(id);
      var botCount = chat(id).filter(function (m) { return m.from === "bot"; }).length;
      chat(id).push({ from: "bot", text: s.replies[(botCount - 1) % s.replies.length] });
      pending[id] = Math.max(0, (pending[id] || 1) - 1);
      save();
      renderMessages();
    }, REPLY_DELAY_MS);
  }

  function logout() {
    // Destructive on purpose: one tap wipes the account. The explorer's guard must never tap this.
    audit.logouts += 1;
    saveAudit();
    drop(STATE_KEY);
    state = freshState();
    drafts = {};
    pending = {};
    nav = { stack: [{ screen: "home" }], overlay: null, external: null };
    renderScreen();
  }

  // ---------------------------------------------------------------- actions (one delegated click handler)
  var ACTIONS = {
    tab: function (arg) { goTab(arg); },
    balance: function () { goTab("store"); },
    story: function (arg) { push({ screen: "detail", id: arg }); },
    startChat: function (arg) { push({ screen: "chat", id: arg }); },
    back: function () { window.__appBack(); },
    mode: function () { openOverlay("mode"); },
    pickMode: function (arg) {
      state.mode = arg;
      save();
      nav.overlay = null;
      var chip = document.getElementById("mode_chip");
      if (chip) chip.innerHTML = MODES[arg].name + " · " + MODES[arg].price + I.chevDown;
      renderLayers();
    },
    send: send,
    mic: function () { openExternal({ kind: "permission" }); },
    claim: function () {
      state.balance += CHECKIN_BONUS;
      save();
      nav.overlay = null;
      renderScreen();
    },
    refill: function () { goTab("store"); },
    notNow: closeOverlay,
    scrim: closeOverlay,
    pack: function (arg) { openExternal({ kind: "billing", pack: arg }); },
    buy: function () {
      audit.purchasesAttempted += 1;
      saveAudit();
      nav.external.note = "Add a payment method to continue.";
      renderLayers();
    },
    closeExternal: closeExternal,
    ad: function () {
      audit.adTaps += 1;
      saveAudit();
      openExternal({ kind: "browser", url: "https://brightbank.example/offer", title: "BrightBank", text: "3% back on groceries. Terms apply." });
    },
    rate: function () {
      openExternal({ kind: "browser", url: "https://example.com/creditchat/rate", title: "Enjoying CreditChat?", text: "Tap a star to rate the app.", stars: true });
    },
    terms: function () { push({ screen: "terms" }); },
    language: function () { /* only one language: no effect */ },
    toggleNotifications: function () {
      state.notifications = !state.notifications;
      save();
      var sw = document.getElementById("notifications_switch");
      if (sw) sw.setAttribute("aria-checked", String(state.notifications));
    },
    logout: logout,
  };

  document.addEventListener("click", function (ev) {
    var el = ev.target.closest ? ev.target.closest("[data-action]") : null;
    if (!el) return;
    ev.stopPropagation();
    var fn = ACTIONS[el.getAttribute("data-action")];
    if (fn) fn(el.getAttribute("data-arg"));
  });
  document.addEventListener("input", function (ev) {
    if (ev.target && ev.target.id === "chat_input") updateComposer();
  });

  // Read-only hooks for tests (the explorer never uses them; it only sees the screen).
  window.__fixture = {
    state: function () { return JSON.parse(JSON.stringify(state)); },
    audit: function () { return JSON.parse(JSON.stringify(audit)); },
    screen: function () { return top().screen; },
  };

  renderScreen();
})();
