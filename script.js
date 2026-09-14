(function () {
  "use strict";

  // ---------- elements ----------
  var stageSvg = document.getElementById("stageSvg");
  var ballArt = document.getElementById("ballArt");
  var threadPath = document.getElementById("threadPath");
  var thumbKnot = document.getElementById("thumbKnot");
  var thumbKnotBack = document.getElementById("thumbKnotBack");
  var tabHit = document.getElementById("tabHit");
  var ballHit = document.getElementById("ballHit");
  var notesLayer = document.getElementById("notesLayer");
  var cleanupBtn = document.getElementById("cleanupBtn");
  var counterEl = document.getElementById("counter");

  // ---------- geometry state ----------
  var W = 0, H = 0;
  var cx = 0, cy = 0;
  var HOME = { x: 0, y: 0 };
  var hasPositioned = false;
  var NOMINAL_R = 108;
  var currentR = NOMINAL_R;
  var ATTACH_ANGLE = 50 * Math.PI / 180;
  var REDUCED_MOTION = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function clamp(min, val, max) {
    return Math.max(min, Math.min(max, val));
  }

  function computeGeometry() {
    W = window.innerWidth;
    H = window.innerHeight;
    stageSvg.setAttribute("viewBox", "0 0 " + W + " " + H);
    stageSvg.setAttribute("width", W);
    stageSvg.setAttribute("height", H);
    currentR = clamp(58, Math.min(W, H) * 0.15, 108);
    HOME.x = W / 2;
    HOME.y = H * 0.58;
    if (!hasPositioned) {
      cx = HOME.x;
      cy = HOME.y;
      hasPositioned = true;
    } else {
      cx = clamp(currentR, cx, W - currentR);
      cy = clamp(currentR + 90, cy, H - currentR - 10);
    }
  }
  computeGeometry();
  window.addEventListener("resize", computeGeometry);

  function ballScale() {
    return currentR / NOMINAL_R;
  }

  function attachPoint() {
    return {
      x: cx + Math.cos(ATTACH_ANGLE) * currentR,
      y: cy + Math.sin(ATTACH_ANGLE) * currentR
    };
  }

  function idleTabPos() {
    var a = attachPoint();
    var s = ballScale();
    return { x: a.x + 26 * s, y: a.y + 87 * s };
  }

  // ---------- easing / lerp ----------
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeOutBack(t) {
    var c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  // ---------- squish (bounce feel on the ball) ----------
  var squish = { x: 1, y: 1 };
  function bumpSquish(sx, sy) {
    squish.x = sx;
    squish.y = sy;
  }

  // ---------- thread rendering ----------
  var lastRenderedTab = idleTabPos();

  function renderThread(tabPos) {
    lastRenderedTab = tabPos;
    var a = attachPoint();
    var dist = Math.hypot(tabPos.x - a.x, tabPos.y - a.y);
    var sag = Math.min(dist * 0.22, 55);
    var ctrl = {
      x: (a.x + tabPos.x) / 2,
      y: (a.y + tabPos.y) / 2 + sag
    };
    threadPath.setAttribute(
      "d",
      "M" + a.x + "," + a.y + " Q" + ctrl.x + "," + ctrl.y + " " + tabPos.x + "," + tabPos.y
    );
    thumbKnot.setAttribute("cx", tabPos.x);
    thumbKnot.setAttribute("cy", tabPos.y);
    thumbKnotBack.setAttribute("cx", tabPos.x);
    thumbKnotBack.setAttribute("cy", tabPos.y);
    tabHit.setAttribute("cx", tabPos.x);
    tabHit.setAttribute("cy", tabPos.y);
  }

  // ---------- continuous render loop: idle sway + squish decay ----------
  var swayPhase = Math.random() * 10;
  var isDragging = false;
  var isSpringingBack = false;

  function tick(now) {
    swayPhase += REDUCED_MOTION ? 0 : 0.014;
    var swayDeg = Math.sin(swayPhase) * 1.3;

    squish.x += (1 - squish.x) * 0.16;
    squish.y += (1 - squish.y) * 0.16;

    ballHit.setAttribute("cx", cx);
    ballHit.setAttribute("cy", cy);
    ballHit.setAttribute("r", currentR * 0.92);

    var s = ballScale();
    ballArt.setAttribute(
      "transform",
      "translate(" + cx + " " + cy + ") rotate(" + swayDeg.toFixed(2) + ") " +
      "scale(" + (s * squish.x).toFixed(4) + " " + (s * squish.y).toFixed(4) + ") " +
      "translate(-150 -150)"
    );

    if (!isDragging && !isSpringingBack) {
      var idle = idleTabPos();
      idle.x += REDUCED_MOTION ? 0 : Math.sin(swayPhase * 0.8) * 2;
      renderThread(idle);
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // ---------- spring back to rest ----------
  function springBackThread() {
    isSpringingBack = true;
    var start = { x: lastRenderedTab.x, y: lastRenderedTab.y };
    var duration = 480;
    var t0 = performance.now();
    function step(now) {
      var t = Math.min(1, (now - t0) / duration);
      var e = easeOutBack(t);
      var target = idleTabPos();
      renderThread({ x: lerp(start.x, target.x, e), y: lerp(start.y, target.y, e) });
      if (t < 1 && isSpringingBack) {
        requestAnimationFrame(step);
      } else {
        isSpringingBack = false;
      }
    }
    requestAnimationFrame(step);
  }

  // ---------- reasons bag (no immediate repeats) ----------
  var reasonBag = [];
  var lastReason = null;

  function nextReason() {
    if (!window.REASONS || window.REASONS.length === 0) {
      return "Add your reasons in reasons.js";
    }
    if (reasonBag.length === 0) {
      reasonBag = window.REASONS.slice();
      for (var i = reasonBag.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = reasonBag[i]; reasonBag[i] = reasonBag[j]; reasonBag[j] = tmp;
      }
      if (reasonBag.length > 1 && reasonBag[0] === lastReason) {
        reasonBag.push(reasonBag.shift());
      }
    }
    var reason = reasonBag.pop();
    lastReason = reason;
    return reason;
  }

  // ---------- counter ----------
  var STORAGE_KEY = "reasonsForMahak_pullCount";
  var pullCount = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
  function updateCounter() {
    if (!pullCount) { counterEl.textContent = ""; return; }
    counterEl.textContent = pullCount === 1
      ? "1 thread pulled so far"
      : pullCount + " threads pulled so far";
  }
  updateCounter();

  // ---------- quote cards ----------
  var activeCards = [];
  var topZ = 21;

  function spawnNote(pos, scattered) {
    var text = nextReason();
    pullCount += 1;
    localStorage.setItem(STORAGE_KEY, String(pullCount));
    updateCounter();

    var card = document.createElement("div");
    card.className = "quote-card spawning";
    var rot = (Math.random() * 10 - 5).toFixed(1);
    card.style.setProperty("--rot", rot + "deg");

    var jitterX = scattered ? (Math.random() * 60 - 30) : 0;
    var jitterY = scattered ? 30 + Math.random() * 24 : 0;
    var left = clamp(10, pos.x - 100 + jitterX, window.innerWidth - 210);
    var top = clamp(70, pos.y - 30 + jitterY, window.innerHeight - 130);
    card.style.left = left + "px";
    card.style.top = top + "px";
    card.style.zIndex = String(++topZ);

    var closeBtn = document.createElement("button");
    closeBtn.className = "quote-close";
    closeBtn.setAttribute("aria-label", "Remove");
    closeBtn.innerHTML = "&times;";

    var textEl = document.createElement("p");
    textEl.className = "quote-text";
    textEl.textContent = text;

    card.appendChild(closeBtn);
    card.appendChild(textEl);
    notesLayer.appendChild(card);
    activeCards.push(card);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        card.classList.remove("spawning");
      });
    });

    closeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      removeCardImmediate(card);
    });

    makeCardDraggable(card);
  }

  function removeCardImmediate(card) {
    var idx = activeCards.indexOf(card);
    if (idx !== -1) activeCards.splice(idx, 1);
    card.classList.add("removing");
    setTimeout(function () {
      if (card.parentNode) card.parentNode.removeChild(card);
    }, 300);
  }

  function makeCardDraggable(card) {
    var dragging = false, offsetX = 0, offsetY = 0;

    card.addEventListener("pointerdown", function (e) {
      if (e.target.closest(".quote-close")) return;
      dragging = true;
      card.setPointerCapture(e.pointerId);
      var rect = card.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      card.style.zIndex = String(++topZ);
      card.classList.add("dragging");
    });

    card.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      card.style.left = (e.clientX - offsetX) + "px";
      card.style.top = (e.clientY - offsetY) + "px";
    });

    function stopDrag() {
      dragging = false;
      card.classList.remove("dragging");
    }
    card.addEventListener("pointerup", stopDrag);
    card.addEventListener("pointercancel", stopDrag);
  }

  // ---------- quick tap fallback (reveals exactly 1) ----------
  function quickPull() {
    bumpSquish(0.95, 1.06);
    var idle = idleTabPos();
    var s = ballScale();
    var pulled = { x: idle.x + 18 * s, y: idle.y + 55 * s };
    var t0 = performance.now();
    function out(now) {
      var t = Math.min(1, (now - t0) / 220);
      renderThread({
        x: lerp(idle.x, pulled.x, easeOutCubic(t)),
        y: lerp(idle.y, pulled.y, easeOutCubic(t))
      });
      if (t < 1) {
        requestAnimationFrame(out);
      } else {
        spawnNote(pulled, false);
        bumpSquish(1.03, 0.97);
        setTimeout(springBackThread, 140);
      }
    }
    requestAnimationFrame(out);
  }

  // ---------- drag-to-pull interaction ----------
  var dragStartClient = { x: 0, y: 0 };
  var dragStartTime = 0;
  var lastPointerPos = { x: 0, y: 0 };
  var dragSession = { revealed: 0, holdTimer: null };
  var REVEAL_THRESHOLD = 70;
  var HOLD_MS = 650;

  function checkReveal(pos) {
    var idle = idleTabPos();
    var threshold = REVEAL_THRESHOLD * ballScale();
    var dist = Math.hypot(pos.x - idle.x, pos.y - idle.y);

    if (dist > threshold && dragSession.revealed === 0) {
      dragSession.revealed = 1;
      spawnNote(pos, false);
      dragSession.holdTimer = setTimeout(function () {
        if (!isDragging || dragSession.revealed !== 1) return;
        var idle2 = idleTabPos();
        var d2 = Math.hypot(lastPointerPos.x - idle2.x, lastPointerPos.y - idle2.y);
        if (d2 > threshold) {
          dragSession.revealed = 2;
          spawnNote(lastPointerPos, true);
        }
      }, HOLD_MS);
    }
  }

  tabHit.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    isDragging = true;
    isSpringingBack = false;
    tabHit.setPointerCapture(e.pointerId);
    bumpSquish(0.95, 1.05);
    dragSession = { revealed: 0, holdTimer: null };
    dragStartClient = { x: e.clientX, y: e.clientY };
    dragStartTime = performance.now();
    lastPointerPos = { x: e.clientX, y: e.clientY };
    renderThread(lastPointerPos);
  });

  tabHit.addEventListener("pointermove", function (e) {
    if (!isDragging) return;
    lastPointerPos = { x: e.clientX, y: e.clientY };
    renderThread(lastPointerPos);
    checkReveal(lastPointerPos);
  });

  function endDrag(e) {
    if (!isDragging) return;
    isDragging = false;
    if (dragSession.holdTimer) clearTimeout(dragSession.holdTimer);

    var totalMove = Math.hypot(
      lastPointerPos.x - dragStartClient.x,
      lastPointerPos.y - dragStartClient.y
    );
    var heldMs = performance.now() - dragStartTime;

    if (dragSession.revealed === 0 && totalMove < 14 && heldMs < 350) {
      quickPull();
      return;
    }

    bumpSquish(1.04, 0.95);
    springBackThread();
  }
  tabHit.addEventListener("pointerup", endDrag);
  tabHit.addEventListener("pointercancel", endDrag);

  // ---------- drag the ball itself around the screen ----------
  var isBallDragging = false;
  var ballDragOffset = { x: 0, y: 0 };

  ballHit.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    isBallDragging = true;
    ballHit.setPointerCapture(e.pointerId);
    ballDragOffset = { x: e.clientX - cx, y: e.clientY - cy };
    bumpSquish(0.94, 1.08);
  });

  ballHit.addEventListener("pointermove", function (e) {
    if (!isBallDragging) return;
    cx = clamp(currentR, e.clientX - ballDragOffset.x, W - currentR);
    cy = clamp(currentR + 90, e.clientY - ballDragOffset.y, H - currentR - 10);
  });

  function endBallDrag() {
    if (!isBallDragging) return;
    isBallDragging = false;
    bumpSquish(1.03, 0.96);
  }
  ballHit.addEventListener("pointerup", endBallDrag);
  ballHit.addEventListener("pointercancel", endBallDrag);

  // ---------- cleanup: bounce the ball, clear cards one by one ----------
  var isCleaning = false;

  function removeCardsStaggered() {
    var cards = activeCards.slice();
    activeCards = [];
    var i = 0;
    function next() {
      if (i >= cards.length) return;
      removeCardImmediate(cards[i]);
      i += 1;
      setTimeout(next, 500);
    }
    next();
  }

  function bounceBallSequence() {
    var margin = currentR + 30;
    var topBound = Math.max(120, margin);
    var bottomBound = Math.max(topBound + 40, H * 0.62);
    var points = [];
    for (var i = 0; i < 5; i++) {
      points.push({
        x: margin + Math.random() * Math.max(40, W - margin * 2),
        y: topBound + Math.random() * Math.max(40, bottomBound - topBound)
      });
    }
    points.push({ x: HOME.x, y: HOME.y });

    var idx = 0;
    function hop() {
      if (idx >= points.length) { isCleaning = false; return; }
      var from = { x: cx, y: cy };
      var to = points[idx];
      var isLast = idx === points.length - 1;
      var duration = isLast ? 520 : 360;
      bumpSquish(1.1, 0.88);
      var t0 = performance.now();
      function step(now) {
        var t = Math.min(1, (now - t0) / duration);
        var e = isLast ? easeOutBack(t) : easeOutCubic(t);
        cx = lerp(from.x, to.x, e);
        cy = lerp(from.y, to.y, e);
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          idx += 1;
          hop();
        }
      }
      requestAnimationFrame(step);
    }
    hop();
  }

  cleanupBtn.addEventListener("click", function () {
    if (isCleaning) return;
    isCleaning = true;
    cleanupBtn.disabled = true;
    pullCount = 0;
    localStorage.setItem(STORAGE_KEY, "0");
    updateCounter();
    bounceBallSequence();
    removeCardsStaggered();
    setTimeout(function () {
      cleanupBtn.disabled = false;
    }, 2600);
  });
})();
