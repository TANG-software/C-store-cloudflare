// C Store — light ad engine (customer pages only; layout skips /admin).
// Everything here is gated by the owner's Ads control panel:
//   - native banner popup: invisible until the network delivers an ad,
//     then 10 seconds every 1 minute.
//   - bottom strip (optional, off by default): a tap opens the network
//     smartlink in a background tab (popunder style).
(function () {
  'use strict';

  var SMARTLINK = 'https://celerycribbanish.com/evwhgvh3?key=75a5b83a8b0d52513e959c89c8bb2c33';
  var NATIVE_CONTAINER = 'container-782b52d4fbc0e6542b57e224518e4e1b';

  // ---------- bottom strip (only rendered when the owner turns it on) ----------
  var strip = document.getElementById('adStrip');
  if (strip) {
    var off = false;
    try { off = sessionStorage.getItem('cstore_adstrip') === 'off'; } catch (e) {}
    if (off) {
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

  // ---------- native banner popup ----------
  var side = document.getElementById('adSide');
  if (!side) return;

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
})();
