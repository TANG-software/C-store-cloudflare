// C Store — small UI behaviours shared by all pages.
// Tapping a product card: the card expands/zooms to fill the screen
// (Zynox-style transition), the rest of the page dims, and the product
// page opens right after. Plain click behaviour (middle-click, ctrl-click,
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
    card.classList.add('zooming');
    var dim = document.createElement('div');
    dim.className = 'zoom-dim';
    document.body.appendChild(dim);
    setTimeout(function () { window.location.href = card.href; }, 260);
  });
})();
