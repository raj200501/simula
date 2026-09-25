/*
 * Simula mock runtime. Plain browser JS, no framework, no network: works from file://.
 *
 * Everything interactive is derived from window.MODEL (data.js), never written by an LLM:
 *   - router: a click on [data-node=<el>] follows the model edge from (screen, el), with push / tab /
 *     modal / sheet / back / replace transitions (~250 ms) and a back stack (window.__appBack);
 *   - simulated backend: counters start at observed values, edges apply their counter effects;
 *     chat Send clones the user bubble template, shows typing dots, then appends the next captured
 *     reply; a consume action that would take a counter below zero shows the observed wall instead;
 *   - external edges open a grey card ([data-external=<kind>]) marking the edge of the mock's scope;
 *   - proposals (?proposal=Pn or __mock.applyPatch) add screens / elements / edges, and edges to
 *     "rwd" open the rewarded flow (rewarded.js), whose effects apply only on REWARD_VERIFIED.
 *
 * Test / slide API: window.__mock = { go, state, get, set, openRewarded, applyPatch, history, select }.
 * URL params: ?screen=sNN  ?proposal=Pn  ?debug=1  ?slide=1  ?frame=0
 */
(function () {
  "use strict";
  var M = window.MODEL;
  if (!M) { document.body.textContent = "data.js is missing (window.MODEL)"; return; }

  var qs = new URLSearchParams(location.search);
  var P = {
    screen: qs.get("screen"),
    proposal: qs.get("proposal"),
    debug: qs.get("debug") === "1",
    slide: qs.get("slide") === "1",
    frame: qs.get("frame") !== "0",
  };
  var html = document.documentElement;
  if (!P.frame) html.classList.add("mock-noframe");
  if (P.debug) html.classList.add("mock-debug");
  if (P.slide) html.classList.add("mock-slide");
  html.style.setProperty("--mock-accent", M.accent || "#3B82F6");
  html.style.setProperty("--mock-on-accent", M.onAccent || "#FFFFFF");

  var OVERLAY = { modal: 1, sheet: 1, dialog: 1 };
  var DUR = { push: 250, back: 250, modal: 200, sheet: 250, tab: 0, replace: 0, none: 0 };
  var screenEl = document.getElementById("mock-screen");
  var layersEl = document.getElementById("mock-layers");

  // ------------------------------------------------------------------ model indexes
  var screens = {};
  M.screens.forEach(function (s) { screens[s.id] = s; });
  var edgeById = {};
  var edgesAt = {}; // "from|el" -> edges
  M.edges.forEach(function (e) {
    edgeById[e.id] = e;
    if (e.el) (edgesAt[e.from + "|" + e.el] = edgesAt[e.from + "|" + e.el] || []).push(e);
  });
  var resourceId = {};
  M.counters.forEach(function (c) { resourceId[c.id] = c.id; resourceId[c.name] = c.id; });
  var groupOf = {}; // label -> group
  M.contextGroups.forEach(function (g) { g.labels.forEach(function (l) { groupOf[l] = g; }); });

  // ------------------------------------------------------------------ state
  var S = {
    stack: [],          // back stack of screen ids (top = current)
    layers: [],         // [{ id, el }] rendered bottom -> top
    counters: {},
    selected: {},       // context label -> true
    turns: {},          // "screen|role" -> index of the next transcript turn
    external: null,
    patchScreens: {},   // proposal screens: id -> { meta, basedOn, change, html, pid }
    patchElements: {},  // screen id -> [newElement + html]
    patchEdges: [],
    proposals: [],
    rewardedFrom: null, // screen saved when the rewarded flow opened
    scale: 1,
  };
  M.counters.forEach(function (c) { S.counters[c.id] = c.initial; });
  (M.initialSelected || []).forEach(function (l) { S.selected[l] = true; });

  function meta(id) { return screens[id] || (S.patchScreens[id] && S.patchScreens[id].meta) || null; }
  function isOverlay(id) { var m = meta(id); return !!(m && OVERLAY[m.kind]); }
  function current() { return S.stack[S.stack.length - 1] || null; }
  function topLayer() { return S.layers[S.layers.length - 1] || null; }
  function cssq(v) { return String(v).replace(/["\\]/g, "\\$&"); }
  function nodeIn(root, id) { return root.querySelector('[data-node="' + cssq(id) + '"]'); }
  function resId(r) { return resourceId[r] || r; }
  function clean(s) { return (s || "").replace(/\s+/g, " ").trim(); }

  /** Text an element shows itself, excluding nested [data-node] elements (their text is theirs). */
  function ownText(el) {
    if (!el) return "";
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return clean(el.value || el.placeholder);
    var out = "";
    (function walk(n) {
      for (var c = n.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) out += c.nodeValue + " ";
        else if (c.nodeType === 1 && !c.hasAttribute("data-node") && c.tagName !== "TEMPLATE" && c.tagName !== "STYLE" && c.getAttribute("aria-hidden") !== "true") walk(c);
      }
    })(el);
    return clean(out) || clean(el.getAttribute("aria-label"));
  }

  // ------------------------------------------------------------------ screens -> layers
  function templateFor(id) {
    return document.querySelector('template[data-screen="' + cssq(id) + '"]');
  }

  function instantiate(id) {
    var t = templateFor(id);
    if (t) return t.content.cloneNode(true);
    var ps = S.patchScreens[id];
    var tmp = document.createElement("template");
    if (ps) {
      if (ps.html) tmp.innerHTML = ps.html;
      else tmp.content.appendChild(defaultNewScreen(id, ps));
      var r0 = tmp.content.querySelector("[data-screen-root]") || tmp.content.firstElementChild;
      if (r0) { r0.setAttribute("data-new", ""); r0.setAttribute("data-screen-root", id); }
      return tmp.content;
    }
    tmp.innerHTML = '<div data-screen-root="' + id + '" class="mock-missing">Screen ' + id + " is not part of this mock</div>";
    return tmp.content;
  }

  // ------------------------------------------------------------------ proposal defaults (no fragment)
  // A proposal entry the model did not render gets a real, native-looking control instead of its
  // spec text: the label is the first quoted string in `change` ("Secondary button "▶ Play 15 s"…"),
  // else a five-word summary; the control kind (button / pill / card) comes from the words around it.
  function quotedIn(s) {
    var out = [], re = /"([^"]{1,80})"|“([^”]{1,80})”|«([^»]{1,80})»/g, m;
    while ((m = re.exec(s || ""))) out.push(clean(m[1] || m[2] || m[3]));
    return out;
  }
  var SPEC_WORDS = /^(?:(?:one-time|dismissible|secondary|primary|inline|small|new|sponsored)\s+)*(?:button|pill|chip|badge|tag|card|row|task row|tile|banner|bubble|invitation bubble|character invitation bubble|link|cta|sheet|modal|screen|variant)\b[:\s]*/i;
  function summaryOf(s, n) {
    var t = clean(String(s || "").replace(/\([^)]*\)/g, "").replace(/["“”«»]/g, ""));
    for (var k = 0; k < 3; k++) t = t.replace(SPEC_WORDS, "");
    t = t.replace(/\s+(?:when|while|after|before|if|once|shown|visible|under|below|above|next to|for)\b.*$/i, "");
    var w = t.split(" ").filter(Boolean).slice(0, n || 5);
    while (w.length > 1 && /^(a|an|the|to|and|or|of|with|for|in|on|at|under|after|before|next|shown|button|pill|chip|badge|card|row|tile|banner|modal|sheet|screen|container|variant)$/i.test(w[w.length - 1])) w.pop();
    var out = w.join(" ").replace(/[,;:.\-–—]+$/, "");
    return out ? out.charAt(0).toUpperCase() + out.slice(1) : "";
  }
  function specOf(change) {
    var c = String(change || ""), q = quotedIn(c), low = c.toLowerCase();
    var kind = /\b(card|row|tile|banner|bubble|invitation|list)\b/.test(low) ? "card"
      : /\b(badge|chip|pill|tag)\b/.test(low) ? "pill" : "button";
    var sub = (/\bwith\s+"([^"]{1,40})"/.exec(c) || /\bwith\s+“([^”]{1,40})”/.exec(c) || [])[1] || "";
    var acts = [];
    var two = /\bwith\s+(?:a\s+|an\s+)?([A-ZÀ-ɏ][\w'’ ]{0,20}?)\s*\/\s*([A-ZÀ-ɏ][\w'’ ]{0,20}?)(?=[,.;]|\s+(?:shown|under|after|before|next|visible|below|above)\b|$)/.exec(c);
    var one = /\bwith\s+(?:a|an)\s+([A-ZÀ-ɏ][\w'’]{0,16}(?: [\w'’]{1,16})?)\s+button\b/.exec(c);
    if (two) acts = [clean(two[1]), clean(two[2])]; else if (one) acts = [clean(one[1])];
    return { kind: kind, label: q[0] || summaryOf(c, 5) || "New", sub: sub && sub !== q[0] ? sub : "", actions: acts };
  }
  function css(el, rules) { for (var k in rules) el.style.setProperty(k, rules[k]); return el; }
  function newControl(ne, wide) {
    var sp = specOf(ne.change), el;
    if (sp.kind === "card") {
      el = document.createElement("div");
      el.className = "mock-new-card";
      var body = document.createElement("div");
      body.className = "mock-new-card-text";
      var b = document.createElement("b"); b.textContent = sp.label; body.appendChild(b);
      if (sp.sub) { var sm = document.createElement("span"); sm.textContent = sp.sub; body.appendChild(sm); }
      el.appendChild(body);
      var acts = sp.actions.length ? sp.actions : [];
      if (acts.length) {
        var row = document.createElement("div"); row.className = "mock-new-card-acts";
        acts.forEach(function (a, i) { var x = document.createElement("span"); x.className = i ? "mock-new-ghost" : "mock-new-cta"; x.textContent = a; row.appendChild(x); });
        el.appendChild(row);
      }
    } else {
      el = document.createElement("button");
      el.type = "button";
      el.className = sp.kind === "pill" ? "mock-new-pill" : "mock-new-button";
      el.textContent = sp.label;
      if (sp.sub) { var s2 = document.createElement("small"); s2.textContent = sp.sub; el.appendChild(s2); }
      if (sp.kind === "button" && wide) el.classList.add("mock-new-wide");
    }
    return el;
  }

  function defaultNewScreen(id, ps) {
    var m = ps.meta || {}, overlay = !!OVERLAY[m.kind];
    var sp = specOf(ps.change), change = String(ps.change || "");
    // No quoted title in the spec: the proposal's own offer copy is what the user would read here.
    var X = ps.pid && window.__PATCHES && window.__PATCHES[ps.pid];
    var offer = X && X.proposal && X.proposal.offer;
    var named = quotedIn(change).length > 0;
    if (!named && offer && offer.title) sp.label = offer.title;
    var root = document.createElement("div");
    root.setAttribute("data-screen-root", id);
    css(root, { position: "relative", width: "100%", height: "100%", overflow: "hidden", background: overlay ? "transparent" : "#FFFFFF" });
    if (overlay) { var scrim = document.createElement("div"); scrim.className = "mock-ns-scrim"; root.appendChild(scrim); }
    var panel = document.createElement("div");
    panel.className = overlay ? (m.kind === "sheet" ? "mock-ns-sheet" : "mock-ns-modal") : "mock-ns-page";
    if (m.kind === "sheet") css(panel, { "padding-bottom": (M.device.navDp + 20) + "px" });
    if (!overlay) css(panel, { "padding-top": (M.device.statusDp + 12) + "px" });
    var head = document.createElement("div"); head.className = "mock-ns-head";
    var h = document.createElement("div"); h.className = "mock-ns-title"; h.textContent = sp.label; head.appendChild(h);
    var x = document.createElement("button"); x.type = "button"; x.className = "mock-ns-close"; x.setAttribute("aria-label", "Close"); x.textContent = overlay ? "✕" : "←";
    x.addEventListener("click", function (ev) { ev.stopPropagation(); back(); });
    if (overlay) head.appendChild(x); else head.insertBefore(x, h);
    panel.appendChild(head);
    // Details: the spec's remaining clauses ("progress 0/3", "resets at midnight"), minus the rows spec.
    var rows = /(\d+)\s+(?:rows?|items?|tasks?|cards?)\s*(?:["“]([^"”]{1,80})["”])?/i.exec(change);
    var rest = change.replace(/["“][^"”]*["”]/g, "\u0000").split(/[,;]|:\s/).map(function (t) { return clean(clean(t.replace(/\u0000/g, "")).replace(SPEC_WORDS, "")); })
      .filter(function (t) { return t && t.length > 2 && !/^\d+\s+(rows?|items?|tasks?|cards?)\b/i.test(t) && t.split(" ").length <= 6; });
    if (!named && offer && offer.body) rest = [String(offer.body).split(/(?<=[.!?])\s/)[0]];
    if (rest.length) { var d = document.createElement("div"); d.className = "mock-ns-sub"; d.textContent = rest.slice(0, 3).join(" · ").replace(/^./, function (c) { return c.toUpperCase(); }); panel.appendChild(d); }
    var body = document.createElement("div"); body.className = "mock-ns-body"; body.setAttribute("data-mock-ns-body", "");
    var mine = (S.patchElements[id] || []).filter(function (ne) { return /\b(row|item|task|card|tile)\b/i.test(ne.change || ""); }).length;
    var n = rows ? Math.max(0, Math.min(6, Number(rows[1])) - mine) : 0;
    for (var i = 0; i < n; i++) {
      var r = document.createElement("div"); r.className = "mock-ns-row";
      var t = document.createElement("span"); t.textContent = rows[2] ? clean(rows[2]) : sp.label + " " + (i + 1); r.appendChild(t);
      var p = document.createElement("span"); p.className = "mock-new-cta"; p.textContent = "Play"; r.appendChild(p);
      body.appendChild(r);
    }
    panel.appendChild(body);
    root.appendChild(panel);
    return root;
  }

  /**
   * Absolute (spec-rendered) layouts have no flow: make room for a new element next to `near` by
   * moving what is below it down (growing its panel), or, when that would push content off a
   * bottom-anchored panel, moving `near` and what is above it up. Returns the element's top.
   */
  function makeRoom(near, el, place) {
    var parent = near.parentElement, gap = 8;
    var need = el.offsetHeight + gap;
    var H = M.device.h - (M.device.navDp || 0);
    var top0 = near.offsetTop, bot0 = near.offsetTop + near.offsetHeight;
    var y0 = place === "before" ? top0 : bot0;
    var kids = [].filter.call(parent.children, function (k) {
      return k !== el && getComputedStyle(k).position === "absolute" && !k.classList.contains("sr-tabbar") && k.getAttribute("role") !== "tab" && !k.hasAttribute("data-new");
    });
    var centerIn = function (k, b) { var cx = k.offsetLeft + k.offsetWidth / 2, cy = k.offsetTop + k.offsetHeight / 2; return cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h; };
    // The panel (sheet / dialog backdrop) holding `near`, if any: only what is drawn on it moves.
    var panel = [].filter.call(parent.querySelectorAll(":scope > .sr-panel"), function (k) {
      return k.offsetTop <= top0 + 2 && k.offsetTop + k.offsetHeight >= bot0 - 2 && k.offsetLeft <= near.offsetLeft + 2 && k.offsetLeft + k.offsetWidth >= near.offsetLeft + near.offsetWidth - 2;
    }).pop() || null;
    var pb = panel ? { x: panel.offsetLeft, y: panel.offsetTop, w: panel.offsetWidth, h: panel.offsetHeight } : null;
    var after = function (k) { return !panel || (panel.compareDocumentPosition(k) & Node.DOCUMENT_POSITION_FOLLOWING); };
    var mine = kids.filter(function (k) { return k !== panel && after(k) && (!pb || centerIn(k, pb)); });
    var fixedBottom = function (k) { return !panel && k.offsetTop >= H - 90 && k.offsetHeight < 100; }; // tab bar, composer
    var below = mine.filter(function (k) { return (k === near ? place === "before" : k.offsetTop >= y0 - 2) && !fixedBottom(k); });
    var move = function (k, dy) { k.style.top = (parseFloat(getComputedStyle(k).top) || k.offsetTop) + dy + "px"; };
    var lowest = below.reduce(function (a, k) { return Math.max(a, k.offsetTop + k.offsetHeight); }, pb ? pb.y + pb.h : y0);
    var bottomAnchored = pb && pb.y + pb.h >= H - 4;
    if (!bottomAnchored && (pb ? pb.y + pb.h + need <= H : true) && (panel || lowest + need <= H + 200)) {
      below.forEach(function (k) { move(k, need); });
      if (panel) panel.style.height = panel.offsetHeight + need + "px";
      return y0 + gap / 2;
    }
    // Grow upwards: `near` and everything above it on the panel (or screen) move up.
    var headerBottom = (M.device.statusDp || 0) + 64;
    var above = mine.filter(function (k) { return k === near ? place !== "before" : k.offsetTop + k.offsetHeight <= y0 + 2 && (panel || k.offsetTop >= headerBottom); });
    above.forEach(function (k) { move(k, -need); if (!panel && k.offsetTop < headerBottom) k.style.visibility = "hidden"; });
    if (panel) { panel.style.top = panel.offsetTop - need + "px"; panel.style.height = panel.offsetHeight + need + "px"; }
    return y0 - need + gap / 2;
  }

  function makeLayer(id) {
    var sec = document.createElement("section");
    sec.className = "mock-layer" + (isOverlay(id) ? " mock-overlay-layer" : "");
    sec.setAttribute("data-screen-layer", id);
    var m = meta(id);
    if (m) sec.setAttribute("data-kind", m.kind);
    sec.appendChild(instantiate(id));
    return sec;
  }

  /** Per-layer wiring after it is in the DOM: counter bindings, mode labels, proposal elements. */
  function decorate(layer, id) {
    M.bindings.forEach(function (b) {
      if (b.screen !== id) return;
      var n = nodeIn(layer, b.el);
      if (!n || n.classList.contains("mock-hotspot") || n.hasAttribute("data-bind") || n.querySelector("[data-bind]")) return;
      n.setAttribute("data-bind", b.resource);
      n.setAttribute("data-bind-auto", "1"); // repaired here, so QA can still report the fragment as unbound
    });
    // Chat: remember which captured messages exist, so they can scroll away once new ones overflow.
    var list = layer.querySelector('[data-role="messages"]');
    if (list) {
      var lr = list.getBoundingClientRect();
      layer.querySelectorAll("[data-node]").forEach(function (n) {
        if (list.contains(n) || n.matches('[data-role="composer"],[data-role="send"]')) return;
        var r = n.getBoundingClientRect();
        if (r.height > 0 && r.top >= lr.top - 1 && r.bottom <= lr.bottom + 1 && r.height < lr.height * 0.5) n.setAttribute("data-mock-captured", "");
      });
    }
    paintCounters(layer);
    paintContext(layer, id);
    patchElementsInto(layer, id);
  }

  /** Layers to show: the current screen, plus whatever an overlay sits on (stack below, else its parent). */
  function wantedLayers() {
    var ids = [];
    var i = S.stack.length - 1, id = S.stack[i];
    while (id) {
      ids.unshift(id);
      if (!isOverlay(id)) break;
      var below = null;
      if (i > 0) { i--; below = S.stack[i]; } else { i = -1; below = meta(id) && meta(id).parent; }
      if (!below || ids.indexOf(below) >= 0) break;
      id = below;
    }
    return ids;
  }

  function anim(el, frames, ms) {
    if (!ms || !el.animate) return Promise.resolve();
    try { return el.animate(frames, { duration: ms, easing: "cubic-bezier(0.2, 0, 0, 1)" }).finished.catch(function () {}); }
    catch (e) { return Promise.resolve(); }
  }

  function sync(transition) {
    var want = wantedLayers();
    var k = 0;
    while (k < S.layers.length && k < want.length && S.layers[k].id === want[k]) k++;
    var removed = S.layers.splice(k);
    var backwards = transition === "back";
    var before = backwards && removed.length ? removed[0].el : null;
    var added = want.slice(k).map(function (id) {
      var el = makeLayer(id);
      layersEl.insertBefore(el, before);
      return { id: id, el: el };
    });
    added.forEach(function (l) { S.layers.push(l); decorate(l.el, l.id); });
    var ms = DUR[transition] || 0;
    var top = added[added.length - 1];
    var done = [];
    if (ms && top && !backwards) {
      if (transition === "push") done.push(anim(top.el, [{ transform: "translateX(100%)" }, { transform: "translateX(0)" }], ms));
      else if (transition === "modal") done.push(anim(top.el, [{ opacity: 0 }, { opacity: 1 }], ms));
      else if (transition === "sheet") done.push(anim(top.el, [{ transform: "translateY(35%)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], ms));
    }
    if (ms && backwards) {
      removed.forEach(function (l) {
        var frames = isOverlay(l.id) ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: "translateX(0)" }, { transform: "translateX(100%)" }];
        done.push(anim(l.el, frames, ms));
      });
    }
    var finish = function () { removed.forEach(function (l) { l.el.remove(); }); };
    if (done.length && removed.length) Promise.all(done).then(finish); else finish();
    html.setAttribute("data-mock-screen", current() || "");
    toneStatusBar();
    paintDebug();
  }

  function navigate(to, transition) {
    if (to && to.indexOf("ext:") === 0) { showExternal(to); return; }
    if (!meta(to)) { toast("Screen " + to + " is not part of this mock"); return; }
    closeExternal();
    var t = transition || "push";
    if (t === "back") {
      var i = S.stack.lastIndexOf(to);
      S.stack = i >= 0 ? S.stack.slice(0, i + 1) : [to];
    } else if (t === "tab") S.stack = [to];
    else if (t === "replace" && S.stack.length) S.stack[S.stack.length - 1] = to;
    else S.stack.push(to);
    sync(t);
  }

  function go(id) {
    if (!meta(id)) throw new Error("Unknown screen " + id);
    closeExternal();
    if (window.__mockRewarded) window.__mockRewarded.close(true);
    S.layers.forEach(function (l) { l.el.remove(); });
    S.layers = [];
    S.stack = [id];
    sync("none");
    return id;
  }

  function back() {
    if (window.__mockRewarded && window.__mockRewarded.phase()) { window.__mockRewarded.close(); return true; }
    if (S.external) { closeExternal(); return true; }
    if (S.stack.length > 1) { S.stack.pop(); sync("back"); return true; }
    var top = current(), m = top && meta(top);
    if (m && OVERLAY[m.kind] && m.parent) { S.stack = [m.parent]; sync("back"); return true; }
    return false;
  }

  // ------------------------------------------------------------------ counters
  var NUM = /-?\d{1,3}(?:[,.\u00a0 ]\d{3})+|-?\d+(?:\.\d+)?/;
  function fmt(v, sample) {
    var sep = /\d,\d{3}/.test(sample) ? "," : /\d\.\d{3}/.test(sample) ? "." : /\d[\u00a0 ]\d{3}/.test(sample) ? "\u00a0" : "";
    var s = String(Math.round(v));
    return sep ? s.replace(/\B(?=(\d{3})+(?!\d))/g, sep) : s;
  }
  function setNumber(n, v) {
    var w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
    for (var t = w.nextNode(); t; t = w.nextNode()) {
      var owner = t.parentElement && t.parentElement.closest("[data-node]");
      if (owner && owner !== n && n.contains(owner)) continue;
      var m = NUM.exec(t.nodeValue);
      if (m) { t.nodeValue = t.nodeValue.slice(0, m.index) + fmt(v, m[0]) + t.nodeValue.slice(m.index + m[0].length); return; }
    }
    if (!n.children.length && n.tagName !== "INPUT" && n.tagName !== "IMG") n.textContent = fmt(v, "");
  }
  function paintCounters(scope) {
    (scope || screenEl).querySelectorAll("[data-bind]").forEach(function (n) {
      if (n.classList.contains("mock-hotspot")) return;
      var v = S.counters[resId(n.getAttribute("data-bind"))];
      if (typeof v === "number") setNumber(n, v);
    });
  }
  function applyDeltas(deltas) {
    var changed = false;
    (deltas || []).forEach(function (d) {
      var r = resId(d.resource);
      if (typeof S.counters[r] !== "number") S.counters[r] = 0;
      S.counters[r] += d.delta; changed = true;
    });
    if (changed) paintCounters();
  }

  // ------------------------------------------------------------------ mode context (e.g. Basic / Premium)
  function select(labels) {
    (labels || []).forEach(function (l) {
      var g = groupOf[l];
      if (g) g.labels.forEach(function (x) { delete S.selected[x]; });
      S.selected[l] = true;
    });
    S.layers.forEach(function (l) { paintContext(l.el, l.id); });
    return Object.keys(S.selected);
  }
  function selectedIn(g) { return g.labels.filter(function (l) { return S.selected[l]; })[0]; }
  /** A chip showing the mode (exactly one element with a label of the group) follows the selection. */
  function paintContext(layer, id) {
    M.contextGroups.forEach(function (g) {
      if (g.screens.indexOf(id) < 0) return;
      var cur = selectedIn(g);
      if (!cur) return;
      var shown = [].filter.call(layer.querySelectorAll("[data-node]"), function (n) { return g.labels.indexOf(ownText(n)) >= 0; });
      if (shown.length !== 1 || ownText(shown[0]) === cur) return;
      var n = shown[0], w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT), old = ownText(n);
      for (var t = w.nextNode(); t; t = w.nextNode()) if (clean(t.nodeValue) === old) { t.nodeValue = cur; return; }
      if (!n.children.length) n.textContent = cur;
    });
  }
  function labelMatch(text) {
    if (!text) return null;
    for (var l in groupOf) if (l === text || (text.length >= 4 && (l.indexOf(text) === 0 || text.indexOf(l) === 0))) return l;
    return null;
  }

  // ------------------------------------------------------------------ edges
  function chooseEdge(screen, el) {
    var all = edgesAt[screen + "|" + el] || [];
    if (!all.length) return null;
    var normal = all.filter(function (e) { return !e.limitHit; });
    var pool = normal.length ? normal : all;
    // Full context match beats a context-free edge, which beats a mismatched context; then most seen.
    var score = function (e) {
      if (!e.context.length) return 0.5;
      return e.context.filter(function (l) { return S.selected[l]; }).length / e.context.length;
    };
    return pool.slice().sort(function (a, b) { return score(b) - score(a) || b.seen - a.seen; })[0];
  }

  /** Where a blocked consume action goes: the wall observed for this element, else any wall on the resource. */
  function wallFor(e, resource) {
    var i, w, le;
    for (i = 0; i < M.walls.length; i++) {
      w = M.walls[i]; le = w.edge && edgeById[w.edge];
      if (le && le.from === e.from && le.el === e.el) return { to: w.shows, transition: le.transition };
    }
    var lim = (edgesAt[e.from + "|" + e.el] || []).filter(function (x) { return x.limitHit && x.to.indexOf("ext:") !== 0; })[0];
    if (lim) return { to: lim.to, transition: lim.transition };
    for (i = 0; i < M.walls.length; i++) {
      w = M.walls[i];
      if (resId(w.resource) === resId(resource) && meta(w.shows)) return { to: w.shows, transition: (w.edge && edgeById[w.edge] && edgeById[w.edge].transition) || "sheet" };
    }
    return null;
  }

  function runEdge(e, layer) {
    if (e.to.indexOf("ext:") === 0) { applyDeltas(e.deltas); showExternal(e.to); return; }
    // Wall guard: spending more than the balance shows the wall instead (the mock reproduces the paywall).
    var blocked = e.deltas.filter(function (d) {
      var v = S.counters[resId(d.resource)];
      return d.delta < 0 && typeof v === "number" && v + d.delta < 0;
    })[0];
    if (blocked) {
      var w = wallFor(e, blocked.resource);
      if (w) navigate(w.to, w.transition || "sheet");
      else toast("Not enough " + (M.counters.filter(function (c) { return c.id === resId(blocked.resource); })[0] || { name: blocked.resource }).name);
      return;
    }
    if (e.limitHit) { navigate(e.to, e.transition); return; }
    applyDeltas(e.deltas);
    var list = layer.querySelector('[data-role="messages"]');
    var sendNode = nodeIn(layer, e.el);
    var isSend = !!list && ((sendNode && sendNode.matches('[data-role="send"]')) || (e.to === e.from && e.deltas.some(function (d) { return d.delta < 0; })));
    if (isSend) chatSend(layer, e.from, e);
    if (e.to !== e.from) navigate(e.to, e.transition);
  }

  // ------------------------------------------------------------------ chat
  function nextTurn(screen, role) {
    var t = M.transcripts.filter(function (x) { return x.screen === screen; })[0];
    var turns = t ? t.turns.filter(function (x) { return x.role === role; }) : [];
    if (!turns.length) return null;
    var k = screen + "|" + role, i = S.turns[k] || 0;
    S.turns[k] = i + 1;
    return turns[i % turns.length].text;
  }

  function bubble(layer, list, role, text) {
    var tpl = list.querySelector('[data-template="' + role + '"]') || layer.querySelector('[data-template="' + role + '"]');
    var node;
    if (tpl && tpl.tagName === "TEMPLATE") node = tpl.content.firstElementChild && tpl.content.firstElementChild.cloneNode(true);
    else if (tpl) { node = tpl.cloneNode(true); node.removeAttribute("data-template"); node.removeAttribute("hidden"); }
    if (!node) { node = document.createElement("div"); node.className = "mock-bubble mock-bubble-" + role; }
    node.removeAttribute("data-node");
    node.setAttribute("data-mock-message", role);
    var slot = node.matches("[data-slot=text]") ? node : node.querySelector("[data-slot=text]");
    if (!slot) { slot = node; while (slot.firstElementChild) slot = slot.firstElementChild; }
    if (text === null) slot.innerHTML = '<span class="mock-typing" aria-label="typing"><i></i><i></i><i></i></span>';
    else slot.textContent = text;
    list.appendChild(node);
    scrollChat(layer, list);
    return node;
  }

  /**
   * Keep the newest message in view. New bubbles live in the list and scroll inside it; the captured
   * ones are drawn outside it, so they move up by the same amount and hide once they leave the list.
   */
  function scrollChat(layer, list) {
    var over = Math.max(0, list.scrollHeight - list.clientHeight);
    list.scrollTop = over;
    var top = list.getBoundingClientRect().top;
    layer.querySelectorAll("[data-mock-captured]").forEach(function (n) {
      n.style.marginTop = -over + "px";
      n.style.visibility = n.getBoundingClientRect().top < top - 1 ? "hidden" : "";
    });
  }

  function chatSend(layer, screen, edge) {
    var list = layer.querySelector('[data-role="messages"]');
    var composer = layer.querySelector('[data-role="composer"]');
    var typed = composer ? clean("value" in composer ? composer.value : composer.textContent) : "";
    var text = typed || nextTurn(screen, "user") || "…";
    if (composer) { if ("value" in composer) composer.value = ""; else composer.textContent = ""; }
    if (!list) return;
    bubble(layer, list, "user", text);
    var dots = bubble(layer, list, "bot", null);
    var reply = nextTurn(screen, "app") || (edge && edge.appeared && edge.appeared[0]) || "…";
    setTimeout(function () {
      dots.remove();
      if (layer.isConnected) bubble(layer, list, "bot", reply);
    }, P.slide ? 0 : 800);
  }

  // ------------------------------------------------------------------ clicks
  function candidates(ev, layer) {
    var out = [];
    for (var n = ev.target.closest && ev.target.closest("[data-node]"); n && layer.contains(n); n = n.parentElement && n.parentElement.closest("[data-node]")) {
      if (out.indexOf(n.getAttribute("data-node")) < 0) out.push(n.getAttribute("data-node"));
    }
    // Overlapping boxes (e.g. hotspots, or a label drawn over its button): anything under the pointer.
    if ((ev.clientX || ev.clientY) && document.elementsFromPoint) {
      document.elementsFromPoint(ev.clientX, ev.clientY).forEach(function (x) {
        var id = x.getAttribute && x.getAttribute("data-node");
        if (id && layer.contains(x) && out.indexOf(id) < 0) out.push(id);
      });
    }
    return out;
  }

  function proposalEdge(screen, el) {
    return S.patchEdges.filter(function (e) {
      if (e.from !== screen || e.el !== el) return false;
      if (!e.guard) return true;
      var v = S.counters[resId(e.guard.resource)];
      return typeof v === "number" && v < e.guard.lt;
    })[0] || null;
  }

  /** Send from the composer: edges on the send control, else on the input itself (type-and-send). */
  function sendFrom(layer, screen) {
    var ids = ['[data-role="send"]', '[data-role="composer"]'].map(function (q) {
      var n = layer.querySelector(q);
      return n && n.getAttribute("data-node");
    }).filter(Boolean);
    for (var i = 0; i < ids.length; i++) {
      var pe = proposalEdge(screen, ids[i]);
      if (pe) { runProposalEdge(pe); return true; }
      var e = chooseEdge(screen, ids[i]);
      if (e) { runEdge(e, layer); return true; }
    }
    if (layer.querySelector('[data-role="messages"]')) { chatSend(layer, screen, null); return true; }
    return false;
  }

  function runProposalEdge(pe) {
    if (pe.to === "rwd") openRewarded("invite", pe.pid, pe);
    else { applyDeltas(pe.effects); navigate(pe.to, transitionFor(pe.to)); }
  }

  /** Returns true when the click was handled; "focus" for text fields (typing, never an action). */
  function activate(screen, el, layer) {
    var node = nodeIn(layer, el);
    if (node && node.matches('[data-role="composer"],input,textarea,[contenteditable="true"]')) return "focus";
    if (node && node.matches('[data-role="send"]')) return sendFrom(layer, screen);
    var label = labelMatch(ownText(node));
    var pe = proposalEdge(screen, el);
    if (pe) { runProposalEdge(pe); return true; }
    var e = chooseEdge(screen, el);
    if (e) {
      if (label) select([label]);
      runEdge(e, layer);
      return true;
    }
    if (label) {
      // A mode chip without an observed edge: tapping it cycles through the observed modes.
      var g = groupOf[label], cur = selectedIn(g);
      select([cur === label ? g.labels[(g.labels.indexOf(label) + 1) % g.labels.length] : label]);
      return true;
    }
    return false;
  }

  function transitionFor(id) {
    var m = meta(id);
    return m && OVERLAY[m.kind] ? (m.kind === "sheet" ? "sheet" : "modal") : "push";
  }

  screenEl.addEventListener("click", function (ev) {
    if (ev.target.closest(".mock-external,.mock-rw,.mock-toast")) return;
    var top = topLayer();
    if (!top || !top.el.contains(ev.target)) return;
    var ids = candidates(ev, top.el);
    for (var i = 0; i < ids.length; i++) {
      var r = activate(top.id, ids[i], top.el);
      if (r === "focus") return;
      if (r) { ev.preventDefault(); ev.stopPropagation(); return; }
    }
  });
  screenEl.addEventListener("keydown", function (ev) {
    if (ev.key !== "Enter" || !ev.target.matches || !ev.target.matches('[data-role="composer"]')) return;
    var top = topLayer();
    if (top && top.el.contains(ev.target)) { ev.preventDefault(); sendFrom(top.el, top.id); }
  });

  // ------------------------------------------------------------------ externals + toast
  var EXT = {
    billing: "Opens the platform billing sheet", browser: "Opens a web page in the browser", signin: "Opens an account sign-in",
    permission: "Shows a system permission prompt", camera: "Opens the camera", picker: "Opens a file or photo picker",
    settings: "Opens system settings", launcher: "Leaves the app", crash: "The app closed unexpectedly", ad: "Opens an ad destination",
    other: "Opens another app",
  };
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; }
  function showExternal(id) {
    closeExternal();
    var x = M.externals.filter(function (e) { return e.id === id; })[0] || { id: id, kind: id.replace(/^ext:/, "") || "other", texts: [] };
    var el = document.createElement("div");
    el.className = "mock-external";
    el.setAttribute("data-external", x.kind);
    var texts = (x.texts || []).slice(0, 4).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
    el.innerHTML = '<div class="mock-external-card" role="dialog" aria-label="Outside the app">'
      + '<div class="mock-external-kind">Outside the app · ' + esc(x.kind) + "</div>"
      + "<h3>" + esc(EXT[x.kind] || EXT.other) + "</h3>"
      + (texts ? '<ul class="mock-external-texts">' + texts + "</ul>" : "")
      + '<p class="mock-external-why">The explorer saw this action leave the app. The mock stops at that boundary instead of imitating another app.</p>'
      + '<button type="button" class="mock-external-close">Back to app</button></div>';
    el.querySelector(".mock-external-close").addEventListener("click", function () { closeExternal(); });
    screenEl.appendChild(el);
    S.external = el;
  }
  function closeExternal() { if (S.external) { S.external.remove(); S.external = null; } }

  var toastTimer = 0;
  function toast(msg) {
    var t = screenEl.querySelector(".mock-toast");
    if (!t) { t = document.createElement("div"); t.className = "mock-toast"; screenEl.appendChild(t); }
    t.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.remove(); }, 1800);
  }

  // ------------------------------------------------------------------ proposals
  function loadScript(src) {
    return new Promise(function (ok, fail) {
      var s = document.createElement("script");
      s.src = src; s.onload = ok; s.onerror = function () { fail(new Error("cannot load " + src)); };
      document.head.appendChild(s);
    });
  }

  function applyPatch(pid) {
    if (window.__PATCHES && window.__PATCHES[pid]) return Promise.resolve(applyLoaded(pid));
    return loadScript("proposals/" + encodeURIComponent(pid) + ".js").then(function () { return applyLoaded(pid); }, function () { toast("Proposal " + pid + " not found"); return false; });
  }

  function applyLoaded(pid) {
    var X = window.__PATCHES && window.__PATCHES[pid];
    if (!X) return false;
    if (S.proposals.indexOf(pid) >= 0) return true;
    S.proposals.push(pid);
    var patch = (X.proposal && X.proposal.patch) || {};
    var frag = X.html || {};
    (patch.newScreens || []).forEach(function (ns) {
      var kind = ns.kind === "screen" ? "page" : ns.kind;
      // An overlay with no basedOn sits on the screen that opens it.
      var opener = (patch.newEdges || []).filter(function (e) { return e.to === ns.id && e.from !== ns.id; })[0];
      var under = ns.basedOn || (opener && opener.from) || undefined;
      S.patchScreens[ns.id] = {
        meta: { id: ns.id, name: ns.id, kind: kind, render: "html", inScope: true, parent: OVERLAY[kind] ? under : undefined, isNew: true },
        basedOn: ns.basedOn, change: ns.change, html: frag[ns.id] || null, pid: pid,
      };
    });
    (patch.newElements || []).forEach(function (ne) {
      (S.patchElements[ne.in] = S.patchElements[ne.in] || []).push({ id: ne.id, near: ne.near, place: ne.place, change: ne.change, html: frag[ne.id] || null, pid: pid });
    });
    (patch.newEdges || []).forEach(function (ed) {
      S.patchEdges.push({ from: ed.from, el: ed.el, to: ed.to, effects: ed.effects || [], guard: ed.guard || null, pid: pid });
    });
    S.layers.forEach(function (l) { patchElementsInto(l.el, l.id); });
    paintDebug();
    return true;
  }

  function patchElementsInto(layer, id) {
    var list = S.patchElements[id];
    if (!list) return;
    var root = layer.querySelector("[data-screen-root]") || layer;
    list.forEach(function (ne) {
      if (nodeIn(layer, ne.id)) return;
      var el;
      if (ne.html) {
        var t = document.createElement("template");
        t.innerHTML = ne.html;
        el = t.content.firstElementChild;
      }
      var near = ne.near && nodeIn(layer, ne.near);
      var fallback = !el;
      if (!el) el = newControl(ne, !!near && near.offsetWidth >= 0.6 * M.device.w);
      if (!el.getAttribute("data-node")) el.setAttribute("data-node", ne.id);
      el.setAttribute("data-new", "");
      if (el.style.position === "absolute" && el.style.left && el.style.top) { root.appendChild(el); return; } // placed by its author
      var nsBody = layer.querySelector("[data-mock-ns-body]");
      if (nsBody && (!near || ne.place === "overlay")) { nsBody.insertBefore(el, nsBody.firstChild); return; } // a default new screen: in its list
      var pos = near ? getComputedStyle(near).position : "";
      if (near && ne.place !== "overlay" && pos !== "absolute" && pos !== "fixed") {
        near.insertAdjacentElement(ne.place === "before" ? "beforebegin" : "afterend", el);
        return;
      }
      if (near && ne.place !== "overlay" && pos === "absolute" && fallback) {
        // In the layout flow: room is made next to `near`, nothing is covered.
        el.style.position = "absolute";
        el.style.visibility = "hidden";
        near.parentElement.appendChild(el);
        var wide = el.classList.contains("mock-new-wide") || el.classList.contains("mock-new-card");
        if (wide) el.style.width = Math.max(near.offsetWidth, Math.min(M.device.w - 32, 280)) + "px";
        var ew = el.offsetWidth;
        var left = wide ? (near.offsetWidth >= 0.6 * M.device.w ? near.offsetLeft : 16)
          : near.offsetLeft + near.offsetWidth / 2 > M.device.w / 2 ? near.offsetLeft + near.offsetWidth - ew : near.offsetLeft;
        var top = makeRoom(near, el, ne.place);
        el.style.left = Math.max(8, Math.min(M.device.w - ew - 8, left)) + "px";
        el.style.top = top + "px";
        el.style.zIndex = "20";
        el.style.visibility = "";
        return;
      }
      // Absolute layouts: place the new element just above / below / over its neighbour.
      el.style.position = "absolute";
      el.style.zIndex = "20";
      el.style.visibility = "hidden";
      root.appendChild(el);
      var L = layer.getBoundingClientRect(), s = S.scale || 1;
      var ew = el.offsetWidth, eh = el.offsetHeight;
      var x, y;
      if (near) {
        var r = near.getBoundingClientRect();
        var nx = (r.left - L.left) / s, ny = (r.top - L.top) / s, nw = r.width / s, nh = r.height / s;
        x = nx + (nw - ew) / 2;
        y = ne.place === "before" ? ny - eh - 8 : ne.place === "after" ? ny + nh + 8 : ny + (nh - eh) / 2;
      } else {
        x = (M.device.w - ew) / 2;
        y = M.device.h - M.device.navDp - eh - 96;
      }
      el.style.left = Math.max(8, Math.min(M.device.w - ew - 8, x)) + "px";
      el.style.top = Math.max(M.device.statusDp + 4, Math.min(M.device.h - eh - 8, y)) + "px";
      el.style.visibility = "";
    });
  }

  // ------------------------------------------------------------------ rewarded flow (UI in rewarded.js)
  function rewardedConfig(pid, edge) {
    var X = pid && window.__PATCHES && window.__PATCHES[pid];
    var p = X && X.proposal;
    var effects = edge && edge.effects && edge.effects.length ? edge.effects : [];
    if (!effects.length && p) {
      (p.patch && p.patch.newEdges || []).forEach(function (e) { if (e.to === "rwd") effects = effects.concat(e.effects || []); });
      if (!effects.length && p.reward && p.reward.resource && p.reward.amount) effects = [{ resource: p.reward.resource, delta: p.reward.amount }];
    }
    return {
      pid: pid || null,
      partner: (p && p.simula && p.simula.gamePartner) || M.app.name,
      avatar: M.avatar || null,
      title: (p && p.offer && p.offer.title) || "Play a quick game for a reward",
      body: (p && p.offer && p.offer.body) || "",
      reward: (p && p.reward && p.reward.what) || "a reward",
      cta: (p && p.offer && p.offer.cta) || "Play now",
      decline: (p && p.offer && p.offer.decline) || "No thanks",
      seconds: (p && p.simula && p.simula.minPlaySec) || 15,
      effects: effects,
      slide: P.slide,
    };
  }

  function openRewarded(phase, pid, edge) {
    var R = window.__mockRewarded;
    if (!R) throw new Error("rewarded.js is not loaded");
    if (phase === "close") { R.close(); return null; }
    if (!R.phase()) S.rewardedFrom = current();
    R.open(phase, rewardedConfig(pid || S.proposals[S.proposals.length - 1], edge), {
      host: screenEl,
      onVerified: function (effects) { applyDeltas(effects); },
      onClose: function () {
        // Back to the saved screen; its layer (and any unsent draft) is still there.
        if (S.rewardedFrom && current() !== S.rewardedFrom && meta(S.rewardedFrom)) navigate(S.rewardedFrom, "back");
        S.rewardedFrom = null;
      },
    });
    return R.phase();
  }

  // ------------------------------------------------------------------ chrome: status bar tone, debug, fit
  function toneStatusBar() {
    var sb = document.querySelector(".mock-statusbar");
    var top = topLayer();
    if (!sb || !top) return;
    var root = top.el.querySelector("[data-screen-root]");
    // An image screen is a device screenshot: it already shows the real status bar.
    sb.style.visibility = root && root.getAttribute("data-render") === "image" ? "hidden" : "";
    var c = root ? getComputedStyle(root).backgroundColor : "";
    var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(c);
    var dark = m && (m[4] === undefined || Number(m[4]) > 0.5) && (0.299 * m[1] + 0.587 * m[2] + 0.114 * m[3]) < 140;
    sb.classList.toggle("mock-statusbar-light", !!dark);
  }

  function paintDebug() {
    if (!P.debug) return;
    screenEl.querySelectorAll(".mock-debug-tag").forEach(function (t) { t.remove(); });
    var top = topLayer();
    if (!top) return;
    var L = top.el.getBoundingClientRect(), s = S.scale || 1;
    top.el.querySelectorAll("[data-node]").forEach(function (n) {
      var r = n.getBoundingClientRect();
      if (!r.width && !r.height) return;
      var t = document.createElement("span");
      t.className = "mock-debug-tag";
      t.textContent = n.getAttribute("data-node");
      t.style.left = (r.left - L.left) / s + "px";
      t.style.top = (r.top - L.top) / s + "px";
      top.el.appendChild(t);
    });
  }

  function fit() {
    var d = document.getElementById("mock-device");
    if (!P.frame || !d) { S.scale = 1; return; }
    d.style.transform = "";
    var s = Math.min(1, (innerWidth - 24) / d.offsetWidth, (innerHeight - 24) / d.offsetHeight);
    S.scale = s > 0 ? s : 1;
    if (S.scale < 1) d.style.transform = "scale(" + S.scale + ")";
  }
  addEventListener("resize", function () { fit(); paintDebug(); });

  // ------------------------------------------------------------------ public API
  var api = {
    go: go,
    state: function () { return current(); },
    get: function (r) { return S.counters[resId(r)]; },
    set: function (r, v) { S.counters[resId(r)] = Number(v); paintCounters(); return S.counters[resId(r)]; },
    openRewarded: openRewarded,
    applyPatch: applyPatch,
    history: function () { return S.stack.slice(); },
    select: select, // extra: choose the mode context (e.g. ["Premium · 30"]) that disambiguates consume edges
  };

  // ------------------------------------------------------------------ boot
  // The API is published only once the first screen is up (and a ?proposal patch applied), so a
  // caller that waits for window.__mock can immediately go() to a screen the patch adds.
  function start() {
    fit();
    var first = P.screen && meta(P.screen) ? P.screen : M.start;
    go(first);
    window.__mock = api;
    window.__appBack = back;
    html.setAttribute("data-mock-ready", "1");
  }
  if (P.proposal) applyPatch(P.proposal).then(start, start);
  else start();
})();
