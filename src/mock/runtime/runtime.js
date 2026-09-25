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
      else {
        var base = ps.basedOn && templateFor(ps.basedOn);
        tmp.innerHTML = base ? base.innerHTML : '<div data-screen-root="' + id + '" style="position:relative;width:100%;height:100%;background:#fff"></div>';
        var root = tmp.content.querySelector("[data-screen-root]") || tmp.content.firstElementChild;
        if (root) {
          var call = document.createElement("div");
          call.className = "mock-callout";
          call.setAttribute("data-new", "");
          call.innerHTML = "<b>New</b>";
          call.appendChild(document.createTextNode(" " + ps.change));
          root.appendChild(call);
        }
      }
      var r0 = tmp.content.querySelector("[data-screen-root]") || tmp.content.firstElementChild;
      if (r0) { r0.setAttribute("data-new", ""); r0.setAttribute("data-screen-root", id); }
      return tmp.content;
    }
    tmp.innerHTML = '<div data-screen-root="' + id + '" class="mock-missing">Screen ' + id + " is not part of this mock</div>";
    return tmp.content;
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
    if (list.scrollHeight > list.clientHeight + 1 && !layer.classList.contains("mock-chat-scrolled")) {
      // New messages overflow: the captured ones scroll away, the list starts from its top.
      layer.classList.add("mock-chat-scrolled");
      list.style.paddingTop = "8px";
    }
    list.scrollTop = list.scrollHeight;
    return node;
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

  function activate(screen, el, layer) {
    var node = nodeIn(layer, el);
    var label = labelMatch(ownText(node));
    var pe = proposalEdge(screen, el);
    if (pe) {
      if (pe.to === "rwd") openRewarded("invite", pe.pid, pe);
      else { applyDeltas(pe.effects); navigate(pe.to, transitionFor(pe.to)); }
      return true;
    }
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
    if (node && node.matches('[data-role="send"]') && layer.querySelector('[data-role="messages"]')) { chatSend(layer, screen, null); return true; }
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
      if (activate(top.id, ids[i], top.el)) { ev.preventDefault(); ev.stopPropagation(); return; }
    }
  });
  screenEl.addEventListener("keydown", function (ev) {
    if (ev.key !== "Enter" || !ev.target.matches || !ev.target.matches('[data-role="composer"]')) return;
    var top = topLayer();
    var send = top && top.el.querySelector('[data-role="send"]');
    if (send && send.getAttribute("data-node")) { ev.preventDefault(); activate(top.id, send.getAttribute("data-node"), top.el); }
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
      S.patchScreens[ns.id] = {
        meta: { id: ns.id, name: ns.id, kind: kind, render: "html", inScope: true, parent: OVERLAY[kind] ? ns.basedOn : undefined, isNew: true },
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
      if (!el) {
        el = document.createElement("button");
        el.type = "button";
        el.className = "mock-new-pill";
        el.textContent = ne.change.length > 80 ? ne.change.slice(0, 77) + "…" : ne.change;
      }
      if (!el.getAttribute("data-node")) el.setAttribute("data-node", ne.id);
      el.setAttribute("data-new", "");
      var near = ne.near && nodeIn(layer, ne.near);
      var pos = near ? getComputedStyle(near).position : "";
      if (near && ne.place !== "overlay" && pos !== "absolute" && pos !== "fixed") {
        near.insertAdjacentElement(ne.place === "before" ? "beforebegin" : "afterend", el);
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
  window.__mock = {
    go: go,
    state: function () { return current(); },
    get: function (r) { return S.counters[resId(r)]; },
    set: function (r, v) { S.counters[resId(r)] = Number(v); paintCounters(); return S.counters[resId(r)]; },
    openRewarded: openRewarded,
    applyPatch: applyPatch,
    history: function () { return S.stack.slice(); },
    select: select, // extra: choose the mode context (e.g. ["Premium · 30"]) that disambiguates consume edges
  };
  window.__appBack = back;

  // ------------------------------------------------------------------ boot
  function start() {
    fit();
    var first = P.screen && meta(P.screen) ? P.screen : M.start;
    go(first);
    html.setAttribute("data-mock-ready", "1");
  }
  if (P.proposal) applyPatch(P.proposal).then(start, start);
  else start();
})();
