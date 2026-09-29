// C Store — custom ad engine (customer pages only; the layout skips /admin).
// 1) Video ad popup: appears every 30 s, stays 10 s, has a countdown + close button.
//    Skipped on checkout / order pages so paying is never interrupted.
// 2) Click popup: clicking any button or CTA opens the smartlink in a small
//    popup window at the top (~10% of the screen), auto-closed after 7 s.
//    The original button action is never blocked. Throttled to one popup per
//    60 s — anything more frequent gets blocked by browsers and flagged by
//    the ad network as fraudulent traffic.
(function () {
  'use strict';

  var SMARTLINK = 'https://celerycribbanish.com/evwhgvh3?key=75a5b83a8b0d52513e959c89c8bb2c33';
  var VIDEO_INTERVAL = 30;  // seconds between video ad popups
  var VIDEO_DURATION = 10;  // seconds the video ad stays on screen
  var CLICK_DURATION = 7;   // seconds the click popup stays open
  var CLICK_COOLDOWN = 60;  // minimum seconds between click popups (safe rate)

  var page = window.location.pathname;
  var noVideo = page.indexOf('/checkout') === 0 || page.indexOf('/order/') === 0;

  // ---------- video ad popup ----------
  var modal = null, hideTimer = null, tickTimer = null;

  function closeVideo() {
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    if (modal) { modal.classList.remove('open'); }
  }

  function buildModal() {
    // Built immediately at page load (hidden) so the ad iframe loads in the
    // background during the first 30 s — the popup opens with content ready.
    if (modal || noVideo) return;
    modal = document.createElement('div');
    modal.className = 'ad-modal';
    modal.innerHTML =
      '<div class="ad-modal-card" role="dialog" aria-label="Advertisement">' +
      '<div class="ad-modal-head"><span>Advertisement &middot; closes in <b class="ad-count">10</b>s</span>' +
      '<button type="button" class="ad-close" aria-label="Close ad">✕</button></div>' +
      '<div class="ad-modal-body"><p class="ad-fallback">Advertisement&hellip;</p>' +
      '<iframe class="ad-frame" src="' + SMARTLINK + '" referrerpolicy="no-referrer-when-downgrade" allow="autoplay; fullscreen"></iframe></div></div>';
    document.body.appendChild(modal);
    modal.querySelector('.ad-close').addEventListener('click', closeVideo);
  }

  function showVideo() {
    if (document.hidden || !modal) return;
    var countEl = modal.querySelector('.ad-count');
    var count = VIDEO_DURATION;
    countEl.textContent = count;
    modal.classList.add('open');
    if (tickTimer) clearInterval(tickTimer);
    if (hideTimer) clearTimeout(hideTimer);
    tickTimer = setInterval(function () {
      count = Math.max(1, count - 1);
      countEl.textContent = count;
    }, 1000);
    hideTimer = setTimeout(closeVideo, VIDEO_DURATION * 1000);
  }

  buildModal();
  if (!noVideo) setInterval(showVideo, VIDEO_INTERVAL * 1000);

  // ---------- click popup ----------
  var lastClickPopup = 0;
  var clickWin = null;

  function openClickPopup() {
    // ~10% of the screen area: about 32% width x 31% height, pinned to the top.
    var w = Math.max(240, Math.round((window.screen && window.screen.width || 420) * 0.32));
    var h = Math.max(170, Math.round((window.screen && window.screen.height || 700) * 0.31));
    var left = Math.max(0, Math.round(((window.screen && window.screen.width) || 420) - w) / 2);
    clickWin = window.open(SMARTLINK, 'cstore_ad',
      'width=' + w + ',height=' + h + ',top=0,left=' + left + ',resizable=yes,scrollbars=yes');
    if (!clickWin) return false;
    setTimeout(function () { try { clickWin.close(); } catch (e) {} }, CLICK_DURATION * 1000);
    return true;
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button) return;
    var el = e.target;
    if (!el || !el.closest) return;
    var t = el.closest('button, .btn, .card-go, a.btn, input[type="submit"]');
    if (!t || t.closest('.ad-modal')) return;
    var now = Date.now();
    if (now - lastClickPopup < CLICK_COOLDOWN * 1000) return;
    if (openClickPopup()) lastClickPopup = now;
  }, true);
})();
