// C Store — light ad engine (customer pages only; layout skips /admin).
// 1) Side popup with the native banner: starts as a "ghost" — invisible and
//    unclickable, but it still occupies its space in the layout so the ad
//    network can measure the container and deliver an ad into it. The moment
//    the network injects an ad, the box fades in. Dismissable; stays hidden
//    for the rest of the browser session.
// 2) Clicking the bottom ad strip (the network's social bar) opens the
//    smartlink behind the page (popunder behaviour). Clicks on the shop's own
//    UI never trigger anything. NO popunder script is loaded.
(function () {
  'use strict';

  var SMARTLINK = 'https://celerycribbanish.com/evwhgvh3?key=75a5b83a8b0d52513e959c89c8bb2c33';
  var NATIVE_CONTAINER = 'container-782b52d4fbc0e6542b57e224518e4e1b';

  // ---------- side popup ----------
  var side = document.getElementById('adSide');
  if (side) {
    var cont = document.getElementById(NATIVE_CONTAINER);
    var dismissed = false;
    try { dismissed = sessionStorage.getItem('cstore_adside') === 'off'; } catch (e) {}

    var hasAd = cont && cont.childElementCount > 0;
    if (!hasAd) {
      if (dismissed) side.classList.add('hidden');
      else side.classList.add('ghost'); // invisible but measurable
      if (cont && 'MutationObserver' in window) {
        new MutationObserver(function () {
          if (cont.childElementCount > 0) {
            side.classList.remove('ghost');
            side.classList.remove('hidden');
          }
        }).observe(cont, { childList: true, subtree: true });
      }
    }
    var closeBtn = side.querySelector('.ad-side-close');
    if (closeBtn) closeBtn.addEventListener('click', function () {
      side.classList.add('hidden');
      try { sessionStorage.setItem('cstore_adside', 'off'); } catch (e) {}
    });
  }

  // ---------- bottom strip -> smartlink (popunder style) ----------
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || (e.button || 0) !== 0) return;
    var t = e.target;
    if (!t || !t.closest) return;
    // Only clicks that did NOT land on the shop's own interface…
    if (t.closest('header.site-header, .top-bar, main, footer.site-footer, nav, #adSide')) return;
    // …and only in the bottom fifth of the screen, where the ad strip lives.
    var h = window.innerHeight || 1;
    if ((e.clientY || 0) < h * 0.8) return;
    var w = window.open(SMARTLINK, '_blank');
    if (w) { try { w.blur(); window.focus(); } catch (err) {} }
  }, true);
})();
