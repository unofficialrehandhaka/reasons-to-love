(function () {
  "use strict";

  var ballGroup = document.getElementById("ballGroup");
  var threadPath = document.getElementById("threadPath");
  var thumbKnot = document.getElementById("thumbKnot");
  var thumbKnotBack = document.getElementById("thumbKnotBack");
  var pullTarget = document.getElementById("pullTarget");
  var noteOverlay = document.getElementById("noteOverlay");
  var noteText = document.getElementById("noteText");
  var noteClose = document.getElementById("noteClose");
  var counterEl = document.getElementById("counter");

  var ATTACH = { x: 219, y: 233 };
  var IDLE = { ctrl: { x: 235, y: 275 }, tab: { x: 245, y: 320 } };
  var PULLED = { ctrl: { x: 255, y: 325 }, tab: { x: 270, y: 400 } };

  var isAnimating = false;
  var reasonBag = [];
  var lastReason = null;

  var STORAGE_KEY = "reasonsForMahak_pullCount";
  var pullCount = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
  updateCounter();

  function updateCounter() {
    if (!pullCount) {
      counterEl.textContent = "";
      return;
    }
    counterEl.textContent = pullCount === 1
      ? "1 thread pulled so far"
      : pullCount + " threads pulled so far";
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function easeOutBack(t) {
    var c1 = 1.70158;
    var c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function setThreadPosition(ctrl, tab) {
    threadPath.setAttribute(
      "d",
      "M" + ATTACH.x + "," + ATTACH.y +
      " Q" + ctrl.x + "," + ctrl.y +
      " " + tab.x + "," + tab.y
    );
    thumbKnot.setAttribute("cx", tab.x);
    thumbKnot.setAttribute("cy", tab.y);
    thumbKnotBack.setAttribute("cx", tab.x);
    thumbKnotBack.setAttribute("cy", tab.y);
  }

  function animateThread(from, to, duration, easing, onDone) {
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min(1, (ts - start) / duration);
      var e = easing(t);
      setThreadPosition(
        { x: lerp(from.ctrl.x, to.ctrl.x, e), y: lerp(from.ctrl.y, to.ctrl.y, e) },
        { x: lerp(from.tab.x, to.tab.x, e), y: lerp(from.tab.y, to.tab.y, e) }
      );
      if (t < 1) {
        requestAnimationFrame(step);
      } else if (onDone) {
        onDone();
      }
    }
    requestAnimationFrame(step);
  }

  function nextReason() {
    if (!window.REASONS || window.REASONS.length === 0) {
      return "Add your reasons in reasons.js";
    }
    if (reasonBag.length === 0) {
      reasonBag = window.REASONS.slice();
      // shuffle
      for (var i = reasonBag.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = reasonBag[i];
        reasonBag[i] = reasonBag[j];
        reasonBag[j] = tmp;
      }
      // avoid immediate repeat across a reshuffle boundary
      if (reasonBag.length > 1 && reasonBag[0] === lastReason) {
        reasonBag.push(reasonBag.shift());
      }
    }
    var reason = reasonBag.pop();
    lastReason = reason;
    return reason;
  }

  function showNote(text) {
    noteText.textContent = text;
    noteOverlay.classList.add("visible");
  }

  function hideNote() {
    noteOverlay.classList.remove("visible");
  }

  function pull() {
    if (isAnimating) return;
    isAnimating = true;
    hideNote();

    ballGroup.classList.add("squish");
    setTimeout(function () {
      ballGroup.classList.remove("squish");
    }, 200);

    animateThread(IDLE, PULLED, 260, easeOutCubic, function () {
      pullCount += 1;
      localStorage.setItem(STORAGE_KEY, String(pullCount));
      updateCounter();
      showNote(nextReason());

      setTimeout(function () {
        animateThread(PULLED, IDLE, 500, easeOutBack, function () {
          isAnimating = false;
        });
      }, 250);
    });
  }

  pullTarget.addEventListener("click", pull);

  noteClose.addEventListener("click", hideNote);
  noteOverlay.addEventListener("click", function (e) {
    if (e.target === noteOverlay) hideNote();
  });
})();
