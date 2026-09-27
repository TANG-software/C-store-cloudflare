// C Store Workers — layout: header, footer, page wrapper. Same design as the Node edition.
import { esc } from '../lib.js';

const CAT_ICONS = {
  electronics: '🔌', fashion: '👕', 'home-living': '🏡', beauty: '💄',
  'sports-outdoors': '⚽', 'toys-games': '🎲', groceries: '🛒', books: '📚',
};

export function header(ctx) {
  const { user, settings, path, cartCount, q, flash } = ctx;
  const f = (flash || []).map((x) => `<div class="flash flash-${esc(x.type)}">${esc(x.msg)}</div>`).join('\n  ');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${ctx.title ? esc(ctx.title) + ' · ' : ''}${esc(settings.store_name)}</title>
  <link rel="stylesheet" href="/css/style.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&display=swap" rel="stylesheet">
  <script>document.documentElement.classList.add('js');</script>
</head>
<body>
<header class="site-header">
  <div class="container header-inner">
    <a href="/" class="logo"><span class="logo-mark">C</span><span class="logo-text">${esc(settings.store_name)}</span></a>
    <form class="search-bar" action="/shop" method="get">
      <input type="search" name="q" placeholder="Search products…" value="${esc(q || '')}">
      <button type="submit" aria-label="Search"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4.2-4.2"/></svg></button>
    </form>
    <nav class="main-nav">
      <a href="/shop" class="${path === '/shop' ? 'active' : ''}">Shop</a>
      ${user ? `
        <a href="/account" class="${path.startsWith('/account') ? 'active' : ''}">My account</a>
        ${user.role === 'admin' ? `<a href="/admin" class="admin-link">Admin</a>` : ''}
        <form action="/logout" method="POST" class="inline-form"><button class="link-btn">Log out</button></form>
      ` : `
        <a href="/login" class="${path === '/login' ? 'active' : ''}">Log in</a>
        <a href="/register" class="btn btn-small">Create account</a>
      `}
      <a href="/cart" class="cart-link ${path === '/cart' ? 'active' : ''}" aria-label="Cart"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l-1.2 12.2a1.4 1.4 0 0 1-1.4 1.3H8.6a1.4 1.4 0 0 1-1.4-1.3L6 8z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/></svg> <span class="cart-count">${cartCount}</span></a>
    </nav>
  </div>
</header>
${user && (!user.email_verified || !user.phone_verified) ? `
<div class="banner-warn">
  <div class="container">⚠️ Please <a href="/verify">verify your email address and mobile number</a> to place orders.</div>
</div>` : ''}
<main class="container">
  ${f}
</main>
<main class="container main-content">`;
}

export function footer(ctx) {
  const { settings } = ctx;
  const phone = settings.support_phone || '';
  return `</main>
<footer class="site-footer">
  <div class="container footer-grid">
    <div>
      <div class="logo"><span class="logo-mark">C</span> ${esc(settings.store_name)}</div>
      <p class="muted">${esc(settings.store_tagline || '')}</p>
    </div>
    <div>
      <h4>Shop</h4>
      <a href="/shop">All products</a>
      <a href="/cart">Cart</a>
      <a href="/account">My account</a>
    </div>
    <div>
      <h4>Payments accepted</h4>
      <p class="muted">PayPal · Bitcoin · Ethereum · USDT and 300+ cryptocurrencies</p>
    </div>
    <div>
      <h4>Need help?</h4>
      <p class="muted">
        <a href="/help">Help & contact</a><br>
        Email — <a href="mailto:${esc(settings.support_email)}">${esc(settings.support_email)}</a><br>
        ${phone ? `Phone — <a href="tel:${esc(phone.replace(/\s/g, ''))}">${esc(phone)}</a>` : ''}
      </p>
    </div>
  </div>
  <div class="container footer-bottom">
    <span>© ${new Date().getFullYear()} ${esc(settings.store_name)}. All prices include 21% VAT (btw).</span>
  </div>
</footer>
<script>
(function () {
  var header = document.querySelector('.site-header');
  var onScroll = function () { if (header) header.classList.toggle('scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if (!('IntersectionObserver' in window)) return;
  var els = document.querySelectorAll('.product-card, .category-card, .card, .hero, .section');
  els.forEach(function (el) { el.classList.add('reveal'); });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.06, rootMargin: '0px 0px -30px 0px' });
  els.forEach(function (el) { io.observe(el); });
})();
</script>
</body>
</html>`;
}

export function page(ctx, body) {
  return header(ctx) + '\n' + body + '\n' + footer(ctx);
}

export function productCard(p) {
  return `<a href="/product/${esc(p.slug)}" class="product-card">
  <div class="product-img"><img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy"></div>
  <div class="product-body">
    <span class="product-cat">${esc(p.category_name || '')}</span>
    <h3 class="product-name">${esc(p.name)}</h3>
    <div class="product-foot">
      <span class="price">€${(p.price_cents / 100).toFixed(2)}</span>
      ${p.stock > 0 ? '<span class="stock in">In stock</span>' : '<span class="stock out">Sold out</span>'}
    </div>
  </div>
</a>`;
}

export { CAT_ICONS };
