// C Store — ad engine (customer pages only; the layout skips /admin).
// Formats:
//   - Monetag MultiTag (zone 295196)  — loaded by the layout
//   - Monetag top banner (zone 12023625) — loaded by the layout, near the top
//   - Monetag vignette (zone 12023087) — injected from here, at most once
//     every 10 minutes per browser (localStorage), so it cannot nag.
// Also registers the Monetag service worker at /sw.js.
(function () {
  'use strict';

  var VIGNETTE_ZONE = '12023087';
  var VIGNETTE_SRC = 'https://n6wxm.com/vignette.min.js';
  var EVERY = 10 * 60 * 1000; // 10 minutes

  // ---------- vignette, throttled ----------
  var me = document.currentScript || document.querySelector('script[data-vignette]');
  if (me && me.getAttribute('data-vignette') === '1') {
    var last = 0;
    try { last = Number(localStorage.getItem('cstore_vignette_ts') || 0) || 0; } catch (e) {}
    if (Date.now() - last > EVERY) {
      var s = document.createElement('script');
      s.dataset.zone = VIGNETTE_ZONE;
      s.src = VIGNETTE_SRC;
      ([document.documentElement, document.body].filter(Boolean).pop()).appendChild(s);
      try { localStorage.setItem('cstore_vignette_ts', String(Date.now())); } catch (e) {}
    }
  }

  // ---------- service worker (needed by the service-worker formats) ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () { /* ignored */ });
    });
  }
})();
