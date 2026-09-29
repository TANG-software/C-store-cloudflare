// C Store — light ad engine (customer pages only; layout skips /admin).
// 1) Small side popup with the native banner — dismissable, stays hidden for
//    the rest of the browser session. Nothing ever blocks the page.
// 2) Clicking the bottom ad strip (the network's social bar) opens the
//    smartlink behind the page (popunder behaviour). Clicks on the shop's own
//    UI never trigger anything.
(function () {
  'use strict';

  var SMARTLINK = 'https://celerycribbanish.com/evwhgvh3?key=75a5b83a8b0d52513e959c89c8bb2c33';

  // ---------- side popup ----------
  var side = document.getElementById('adSide');
  if (side) {
    var closeBtn = side.querySelector('.ad-side-close');
    if (closeBtn) closeBtn.addEventListener('click', function () {
      side.classList.add('hidden');
      try { sessionStorage.setItem('cstore_adside', 'off'); } catch (e) {}
    });
    try { if (sessionStorage.getItem('cstore_adside') === 'off') side.classList.add('hidden'); } catch (e) {}
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
