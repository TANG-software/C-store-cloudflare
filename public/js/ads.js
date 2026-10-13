// C Store — ad engine (customer pages only; the layout skips /admin).
// The network is Monetag (zone 12021683). Its tag is loaded by the layout;
// here we make sure the Monetag service worker is registered, which the
// service-worker formats (in-page push / vignette) require.
(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () { /* ignored */ });
  });
})();
