// C Store — light ad engine (customer pages only; layout skips /admin).
// The only ad unit left: the small side popup with the network's native
// banner. It stays invisible until the network actually delivers an ad,
// then shows for 10 seconds every 1 minute. Dismissable for the session.
// NOTE: the bottom strip / smartlink click was REMOVED — the network's
// smartlink was serving fake "download & install" pages, which is unsafe
// for shop visitors.
(function () {
  'use strict';

  var NATIVE_CONTAINER = 'container-782b52d4fbc0e6542b57e224518e4e1b';

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
