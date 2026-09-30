// C Store — small UI behaviours shared by all pages.
// Tapping a product card: the card rotates slightly, then the product page
// opens almost instantly. No dim overlay is used (it used to stick around
// when coming back via browser history). A pageshow guard cleans up any
// leftover state restored from the back-forward cache.
(function () {
  'use strict';

  function cleanup() {
    var dim = document.querySelector('.zoom-dim');
    if (dim && dim.parentNode) dim.parentNode.removeChild(dim);
    var cards = document.querySelectorAll('.product-card.rotating');
    for (var i = 0; i < cards.length; i++) cards[i].classList.remove('rotating');
  }

  window.addEventListener('pageshow', cleanup);
  window.addEventListener('popstate', cleanup);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) cleanup();
  });

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || (e.button || 0) !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var t = e.target;
    if (!t || !t.closest) return;
    var card = t.closest('a.product-card');
    if (!card) return;
    e.preventDefault();
    card.classList.add('rotating');
    setTimeout(function () { window.location.href = card.href; }, 170);
  });
})();
