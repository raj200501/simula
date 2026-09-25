/*
 * Rewarded flow overlay for the mock (fixed code, configured per proposal by runtime.js).
 *
 *   invite   -> Game Partner avatar (an app asset, else an initial-letter circle), the reward, "~15 s",
 *               and equally sized Play now / No thanks buttons
 *   game     -> 15 s tap-the-target mini game with a countdown and a "Sponsored" label
 *               (in slide mode it is frozen mid-game so a screenshot is deterministic)
 *   verified -> "Reward verified": the grant effects are applied once, then the saved screen returns
 *               (the overlay never navigates, so an unsent draft stays in the composer)
 *   nofill   -> "No game available right now"
 *
 * API used by runtime.js: window.__mockRewarded = { open(phase, cfg, hooks), close(silent?), phase() }.
 */
(function () {
  "use strict";
  var R = { el: null, phase: null, cfg: null, hooks: null, verified: false, timers: [] };

  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; }
  function stopTimers() { R.timers.forEach(function (t) { clearTimeout(t); clearInterval(t); }); R.timers = []; }
  // Deterministic target positions (same game every run).
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }

  function avatar(cfg) {
    if (cfg.avatar) return '<img class="mock-rw-avatar" src="' + esc(cfg.avatar) + '" alt="">';
    var letter = (cfg.partner || "?").trim().charAt(0).toUpperCase() || "?";
    return '<div class="mock-rw-avatar mock-rw-initial" aria-hidden="true">' + esc(letter) + "</div>";
  }

  var views = {
    invite: function (cfg) {
      return '<div class="mock-rw-scrim"></div>'
        + '<div class="mock-rw-card mock-rw-invite" role="dialog" aria-label="Rewarded game offer">'
        + '<div class="mock-rw-head">' + avatar(cfg)
        + '<div><div class="mock-rw-partner">' + esc(cfg.partner) + '</div><div class="mock-rw-meta">Game Partner · ~' + esc(cfg.seconds) + " s</div></div></div>"
        + '<h3 class="mock-rw-title">' + esc(cfg.title) + "</h3>"
        + (cfg.body ? '<p class="mock-rw-body">' + esc(cfg.body) + "</p>" : "")
        + '<div class="mock-rw-reward"><span>Reward</span> ' + esc(cfg.reward) + "</div>"
        + '<div class="mock-rw-actions">'
        + '<button type="button" class="mock-rw-btn mock-rw-secondary" data-rw="decline">' + esc(cfg.decline) + "</button>"
        + '<button type="button" class="mock-rw-btn mock-rw-primary" data-rw="play">' + esc(cfg.cta) + "</button>"
        + "</div></div>";
    },
    game: function (cfg) {
      return '<div class="mock-rw-scrim mock-rw-dark"></div>'
        + '<div class="mock-rw-game" role="dialog" aria-label="Sponsored mini game">'
        + '<div class="mock-rw-gamebar"><span class="mock-rw-sponsored">Sponsored</span><span class="mock-rw-gname">' + esc(cfg.partner) + '</span><span class="mock-rw-count" data-rw-count>' + esc(cfg.seconds) + "</span></div>"
        + '<div class="mock-rw-arena" data-rw-arena><button type="button" class="mock-rw-target" data-rw="target" aria-label="Target"></button></div>'
        + '<div class="mock-rw-score">Score <b data-rw-score>0</b> · tap the targets</div>'
        + '<div class="mock-rw-progress"><i data-rw-progress></i></div>'
        + "</div>";
    },
    verified: function (cfg) {
      return '<div class="mock-rw-scrim"></div>'
        + '<div class="mock-rw-card mock-rw-verified" role="dialog" aria-label="Reward verified">'
        + '<div class="mock-rw-check" aria-hidden="true">✓</div>'
        + '<h3 class="mock-rw-title">Reward verified</h3>'
        + '<p class="mock-rw-body">' + esc(cfg.reward) + "</p>"
        + '<div class="mock-rw-actions"><button type="button" class="mock-rw-btn mock-rw-primary" data-rw="continue">Continue</button></div>'
        + "</div>";
    },
    nofill: function () {
      return '<div class="mock-rw-scrim"></div>'
        + '<div class="mock-rw-card mock-rw-nofill" role="dialog" aria-label="No game available">'
        + '<h3 class="mock-rw-title">No game available right now</h3>'
        + '<p class="mock-rw-body">Try again later.</p>'
        + '<div class="mock-rw-actions"><button type="button" class="mock-rw-btn mock-rw-secondary" data-rw="ok">OK</button></div>'
        + "</div>";
    },
  };

  function moveTarget(frozen) {
    var arena = R.el && R.el.querySelector("[data-rw-arena]");
    var t = arena && arena.querySelector(".mock-rw-target");
    if (!t) return;
    var x = frozen ? 0.62 : rnd(), y = frozen ? 0.38 : rnd();
    t.style.left = "calc(" + (x * 100).toFixed(1) + "% - " + (x * 56).toFixed(1) + "px)";
    t.style.top = "calc(" + (y * 100).toFixed(1) + "% - " + (y * 56).toFixed(1) + "px)";
  }

  function startGame(cfg) {
    var total = cfg.seconds * 1000, t0 = Date.now(), score = 0;
    var count = R.el.querySelector("[data-rw-count]"), bar = R.el.querySelector("[data-rw-progress]"), sc = R.el.querySelector("[data-rw-score]");
    if (cfg.slide) {
      // Frozen mid-game: fixed countdown, score and target position (no timers).
      var left = Math.ceil(cfg.seconds * 0.6);
      count.textContent = left;
      sc.textContent = "4";
      bar.style.width = ((1 - left / cfg.seconds) * 100).toFixed(0) + "%";
      moveTarget(true);
      return;
    }
    moveTarget(false);
    R.el.querySelector("[data-rw-arena]").addEventListener("click", function (ev) {
      if (!ev.target.closest(".mock-rw-target")) return;
      score++; sc.textContent = String(score); moveTarget(false);
    });
    R.timers.push(setInterval(function () { moveTarget(false); }, 900));
    R.timers.push(setInterval(function () {
      var el = Date.now() - t0;
      count.textContent = String(Math.max(0, Math.ceil((total - el) / 1000)));
      bar.style.width = Math.min(100, (el / total) * 100).toFixed(1) + "%";
      if (el >= total) open("verified");
    }, 100));
  }

  function open(phase, cfg, hooks) {
    if (phase === "close") { close(); return; }
    if (!views[phase]) throw new Error("Unknown rewarded phase " + phase);
    if (!R.el) {
      R.el = document.createElement("div");
      R.el.className = "mock-rw";
      R.el.setAttribute("data-rewarded", "");
      R.el.addEventListener("click", onClick);
      R.verified = false;
      R.cfg = cfg || R.cfg;
      R.hooks = hooks || R.hooks;
      ((R.hooks && R.hooks.host) || document.getElementById("mock-screen") || document.body).appendChild(R.el);
    } else {
      if (cfg) R.cfg = cfg;
      if (hooks) R.hooks = hooks;
    }
    stopTimers();
    R.phase = phase;
    R.el.setAttribute("data-phase", phase);
    R.el.innerHTML = views[phase](R.cfg);
    if (phase === "game") startGame(R.cfg);
    if (phase === "verified") {
      // REWARD_VERIFIED: grant exactly once per rewarded session.
      if (!R.verified) { R.verified = true; if (R.hooks && R.hooks.onVerified) R.hooks.onVerified(R.cfg.effects || []); }
      if (!R.cfg.slide) R.timers.push(setTimeout(function () { close(); }, 1600));
    }
  }

  function close(silent) {
    stopTimers();
    if (!R.el) return;
    R.el.remove();
    R.el = null; R.phase = null;
    var h = R.hooks;
    R.hooks = null;
    if (!silent && h && h.onClose) h.onClose();
  }

  function onClick(ev) {
    var b = ev.target.closest("[data-rw]");
    ev.stopPropagation();
    if (!b) return;
    var a = b.getAttribute("data-rw");
    if (a === "play") open("game");
    else if (a === "decline" || a === "ok" || a === "continue") close();
  }

  window.__mockRewarded = { open: open, close: close, phase: function () { return R.phase; } };
})();
