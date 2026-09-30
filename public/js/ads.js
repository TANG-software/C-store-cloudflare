// C Store — light ad engine (customer pages only; layout skips /admin).
// Formats in use:
//   1) Bottom strip (our own, always visible): a click on it acts like a
//      popunder — opens the smartlink in a background tab. Dismissable.
//   2) Small side popup with the network's NATIVE BANNER (lightest format:
//      one async script, self-refreshing, no popunders). It stays invisible
//      until the network actually delivers an ad into it, then shows for
//      10 seconds every 1 minute. Dismissable for the session.
(function () {
  'use strict';

  var SMARTLINK = 'https://celerycribbanish.com/evwhgvh3?key=75a5b83a8b0d52513e959c89c8bb2c33';
  var NATIVE_CONTAINER = 'container-782b52d4fbc0e6542b57e224518e4e1b';

  // ---------- 1) bottom strip: click = popunder ----------
  var strip = document.getElementById('adStrip');
  if (strip) {
    var stripOff = false;
    try { stripOff = sessionStorage.getItem('cstore_adstrip') === 'off'; } catch (e) {}
    if (stripOff) {
      strip.style.display = 'none';
    } else {
      document.body.classList.add('has-adstrip');
    }
    var stripClose = strip.querySelector('.ad-strip-close');
    if (stripClose) stripClose.addEventListener('click', function (e) {
      e.stopPropagation();
      strip.style.display = 'none';
      document.body.classList.remove('has-adstrip');
      try { sessionStorage.setItem('cstore_adstrip', 'off'); } catch (err) {}
    });
    strip.addEventListener('click', function () {
      var w = window.open(SMARTLINK, '_blank');
      if (w) { try { w.blur(); window.focus(); } catch (err) {} }
    });
  }

  // ---------- 2) small popup: native banner, 10 s every 1 min ----------
  var side = document.getElementById('adSide');
  if (side) {
    var cont = document.getElementById(NATIVE_CONTAINER);
    var interval = null;
    var timeout = null;

    var dismissed = false;
    try { dismissed = sessionStorage.getItem('cstore_adside') === 'off'; } catch (e) {}

    var showForTen = function () {
      if (side.classList.contains('hidden')) { clearInterval(interval); interval = null; return; }
      side.classList.remove('ghost');
      clearTimeout(timeout);
      timeout = setTimeout(function () { side.classList.add('ghost'); }, 10000);
    };

    if (dismissed) side.classList.add('hidden');
    else side.classList.add('ghost');

    var startCycle = function () {
      if (interval || side.classList.contains('hidden')) return;
      showForTen();
      interval = setInterval(showForTen, 60000);
    };

    if (cont && cont.childElementCount > 0) startCycle();

    if (cont && 'MutationObserver' in window) {
      new MutationObserver(function () {
        if (cont.childElementCount > 0) startCycle();
      }).observe(cont, { childList: true, subtree: true });
    }

    var closeBtn = side.querySelector('.ad-side-close');
    if (closeBtn) closeBtn.addEventListener('click', function () {
      side.classList.add('ghost');
      side.classList.add('hidden');
      if (interval) { clearInterval(interval); interval = null; }
      clearTimeout(timeout);
      try { sessionStorage.setItem('cstore_adside', 'off'); } catch (e) {}
    });
  }
})();
