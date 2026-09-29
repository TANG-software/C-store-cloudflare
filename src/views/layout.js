// C Store Workers — layout: header, footer, page wrapper. Neon purple edition.
import { esc } from '../lib.js';

const CAT_ICONS = {
  electronics: '🔌', fashion: '👕', 'home-living': '🏡', beauty: '💄',
  'sports-outdoors': '⚽', 'toys-games': '🎲', groceries: '🛒', books: '📚',
};

function navLinks(ctx, mobile) {
  const { user, path } = ctx;
  const cls = (href, starts) => `class="${starts ? 'active' : ''}"`;
  return `
  <nav>
    <a href="/shop" ${cls(path, path === '/shop')}>Shop</a>
    ${user ? `
      <a href="/account" ${cls(path, path.startsWith('/account'))}>My account</a>
      <a href="/cart" ${cls(path, path === '/cart')}>Cart</a>
      ${user.role === 'admin' ? `<a href="/admin" class="admin-link">Admin</a>` : ''}
      <form action="/logout" method="POST" class="inline-form"><button class="link-btn">Log out</button></form>
    ` : `
      <a href="/cart" ${cls(path, path === '/cart')}>Cart</a>
      <a href="/login" ${cls(path, path === '/login')}>Log in</a>
      <a href="/register" class="btn btn-small ${mobile ? 'mobile-cta' : ''}">Create account</a>
    `}
  </nav>`;
}

export function header(ctx) {
  const { user, settings, path, cartCount, q, flash } = ctx;
  const f = (flash || []).map((x) => `<div class="flash flash-${esc(x.type)}">${esc(x.msg)}</div>`).join('\n  ');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${ctx.title ? esc(ctx.title) + ' · ' : ''}${esc(settings.store_name)}</title>
  <link rel="stylesheet" href="/css/style.css?v=7">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800&display=swap" rel="stylesheet">
  <script>document.documentElement.classList.add('js');</script>
</head>
<body>
<div class="top-bar"><div class="container">Free EU shipping over €${(Number(settings.free_shipping_threshold_cents) / 100).toFixed(2)} &middot; PayPal & 300+ cryptocurrencies &middot; 21% VAT included</div></div>
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
    </nav>
    <div class="header-actions">
      <a href="/cart" class="cart-link" aria-label="Cart"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l-1.2 12.2a1.4 1.4 0 0 1-1.4 1.3H8.6a1.4 1.4 0 0 1-1.4-1.3L6 8z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/></svg> <span class="cart-count">${cartCount}</span></a>
      <button class="menu-btn" aria-label="Menu" onclick="document.getElementById('mobileMenu').classList.toggle('open')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></svg>
      </button>
    </div>
  </div>
  <div class="mobile-menu" id="mobileMenu">
    <form class="search-bar" action="/shop" method="get">
      <input type="search" name="q" placeholder="Search products…" value="${esc(q || '')}">
      <button type="submit" aria-label="Search"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4.2-4.2"/></svg></button>
    </form>
    ${navLinks(ctx, true)}
  </div>
</header>
${user && !user.phone_verified ? `
<div class="banner-warn">
  <div class="container">Please <a href="/verify">verify your mobile number</a> to place orders.</div>
</div>` : ''}
<main class="container">
  ${f}
</main>
<main class="container main-content">`;
}

export function footer(ctx) {
  const { settings, path } = ctx;
  const phone = settings.support_phone || '';
  // Ad tags run on customer pages only — never inside the admin panel.
  const ads = path && path.startsWith('/admin') ? '' : `
<script src="https://celerycribbanish.com/27/76/59/277659c13722b7153357ba1f31d046c2.js"></script>
<script src="https://celerycribbanish.com/20/ee/eb/20eeebd3d50174b012ffbaacd570281b.js"></script>
<script src="/js/ads.js?v=1" defer></script>`;
  return `</main>
<footer class="site-footer">
  <div class="container footer-grid">
    <div>
      <div class="logo"><span class="logo-mark">C</span> ${esc(settings.store_name)}</div>
      <p class="muted">${esc(settings.store_tagline || '')}</p>
    </div>
    <div>
      <h4>Navigation</h4>
      <a href="/shop">All products</a>
      <a href="/cart">Cart</a>
      <a href="/help">Help & contact</a>
    </div>
    <div>
      <h4>My account</h4>
      <a href="/account">My account</a>
      <a href="/login">Log in</a>
      <a href="/register">Create account</a>
    </div>
    <div>
      <h4>Payments accepted</h4>
      <div class="footer-pay">
        <span>PayPal</span><span>BTC</span><span>ETH</span><span>USDT</span><span>+300 coins</span>
      </div>
      <p class="muted small" style="margin-bottom:0">
        <a href="mailto:${esc(settings.support_email)}">${esc(settings.support_email)}</a>
        ${phone ? `<br>Phone — <a href="tel:${esc(phone.replace(/\s/g, ''))}">${esc(phone)}</a>` : ''}
      </p>
    </div>
  </div>
  <div class="container footer-bottom">
    <span>© ${new Date().getFullYear()} ${esc(settings.store_name)}. All prices include 21% VAT (btw).</span>
  </div>
</footer>
${ads}
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
  setTimeout(function () { els.forEach(function (el) { el.classList.add('in'); }); }, 1600);
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
    ${p.stock > 0 ? `<span class="stock in">${p.stock} In Stock</span>` : '<span class="stock out">Out of Stock</span>'}
    <div class="product-foot">
      <span class="price">€${(p.price_cents / 100).toFixed(2)}</span>
      <span class="card-go" aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg></span>
    </div>
  </div>
</a>`;
}

export { CAT_ICONS };
