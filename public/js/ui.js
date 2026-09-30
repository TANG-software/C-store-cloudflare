// C Store — small UI behaviours shared by all pages.
// Swing animation when tapping a product card: the card wobbles briefly,
// then the product page opens. Plain click behaviour (middle-click, ctrl-click,
// modified clicks) is left untouched.
(function () {
  'use strict';
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || (e.button || 0) !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var t = e.target;
    if (!t || !t.closest) return;
    var card = t.closest('a.product-card');
    if (!card) return;
    e.preventDefault();
    card.classList.add('swing');
    setTimeout(function () { window.location.href = card.href; }, 230);
  });
})();
