// C Store Workers — storefront views: home, shop, product, cart, help.
import { esc } from '../lib.js';
import { page, productCard, CAT_ICONS } from './layout.js';

// Icons available for homepage feature cards (admin picks one per card).
export const FEATURE_ICONS = {
  bolt: '<path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  headphones: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>',
  package: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12.01"/>',
  truck: '<path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
  coin: '<circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>',
};

const t = (ctx, k) => String((ctx.settings || {})[k] || '').trim();

export function home(ctx, { categories, featured, newest, stats, cards }) {
  const S = ctx.settings;
  const free = (Number(S.free_shipping_threshold_cents) / 100).toFixed(2);
  const headline = String(S.hero_headline || '').trim() || `${S.store_name} is the perfect destination for all your needs!`;
  const badges = String(S.hero_badges || '').split(ctx, '\n').map((s) => s.trim()).filter(Boolean);
  const aboutText = String(S.about_text || '').trim() || `${S.store_name} keeps it simple: we hold our own stock in the Netherlands, describe every product the way it actually arrives, and answer email ourselves — no scripts, no call center. Prices include VAT, and shipping is free above €${free}.`;
  const icon = (paths, extra = '') => `<span class="feature-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ${extra}>${paths}</svg></span>`;
  const stars = (n) => '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n));
  return page(ctx, `
<section class="hero">
  ${t(ctx, 'hero_overline') ? `<p class="hero-overline">${esc(t(ctx, 'hero_overline'))}</p>` : ''}
  <h1 class="hero-headline">${esc(headline)}</h1>
  ${S.store_tagline ? `<p class="hero-tag">${esc(S.store_tagline)}</p>` : ''}
  ${t(ctx, 'hero_cta') ? `<a href="/shop" class="btn btn-lg btn-pill">${esc(t(ctx, 'hero_cta'))}</a>` : ''}
  ${badges.length ? `
  <div class="hero-badges">
    ${badges.map((b) => `<span>${esc(b)}</span>`).join('')}
  </div>` : ''}
</section>

<section class="section">
  ${t(ctx, 'stats_heading') ? `<h2>${esc(t(ctx, 'stats_heading'))}</h2>` : ''}
  ${t(ctx, 'stats_text') ? `<p class="muted">${esc(t(ctx, 'stats_text'))}</p>` : ''}
  <div class="stats-grid">
    ${t(ctx, 'stat_orders_label') ? `<div class="stat-box"><span class="num">${stats.orders}</span><span class="bar"></span><span class="lbl">${esc(t(ctx, 'stat_orders_label'))}</span></div>` : ''}
    ${t(ctx, 'stat_customers_label') ? `<div class="stat-box"><span class="num">${stats.customers}</span><span class="bar"></span><span class="lbl">${esc(t(ctx, 'stat_customers_label'))}</span></div>` : ''}
    ${t(ctx, 'stat_products_label') ? `<div class="stat-box"><span class="num">${stats.products}</span><span class="bar"></span><span class="lbl">${esc(t(ctx, 'stat_products_label'))}</span></div>` : ''}
  </div>
</section>

${cards.feature.length ? `
<section class="section">
  <div class="card">
    ${t(ctx, 'about_heading') ? `<h2>${esc(t(ctx, 'about_heading'))}</h2>` : ''}
    <p class="muted">${esc(aboutText)}</p>
    <div class="feature-grid">
      ${cards.feature.map((f) => `
      <div class="feature-card">
        ${icon(FEATURE_ICONS[f.icon] || FEATURE_ICONS.bolt)}
        <h3>${esc(f.title)}</h3>
        <p>${esc(f.body)}</p>
      </div>`).join('')}
    </div>
  </div>
</section>` : ''}

<section class="section">
  ${t(ctx, 'categories_heading') ? `<h2>${esc(t(ctx, 'categories_heading'))}</h2>` : ''}
  <div class="category-grid">
    ${categories.map((c) => `
      <a href="/shop?category=${esc(c.slug)}" class="category-card">
        <span class="category-icon">${esc(c.name.charAt(0))}</span>
        <span class="category-name">${esc(c.name)}</span>
      </a>`).join('')}
  </div>
</section>

<section class="section">
  ${t(ctx, 'featured_heading') ? `<h2>${esc(t(ctx, 'featured_heading'))}</h2>` : ''}
  <div class="product-grid">${featured.map((p) => productCard(p)).join('')}</div>
</section>

<section class="section">
  ${t(ctx, 'newest_heading') ? `<h2>${esc(t(ctx, 'newest_heading'))}</h2>` : ''}
  <div class="product-grid">${newest.map((p) => productCard(p)).join('')}</div>
</section>

${cards.review.length ? `
<section class="section">
  ${t(ctx, 'reviews_heading') ? `<h2>${esc(t(ctx, 'reviews_heading'))}</h2>` : ''}
  <div class="review-grid">
    ${cards.review.map((r) => `
    <div class="review-card">
      <div class="review-top"><span class="stars">${stars(r.stars)}</span><span class="review-date">${esc(r.when_label)}</span></div>
      <p>${esc(r.body)}</p>
      <div class="review-user"><span class="review-avatar">${esc(r.title.charAt(0).toUpperCase())}</span><span>${esc(r.title)}</span></div>
    </div>`).join('')}
  </div>
</section>` : ''}

${cards.pay.length ? `
<section class="section">
  ${t(ctx, 'payments_heading') ? `<h2 class="center">${esc(t(ctx, 'payments_heading'))}</h2>` : ''}
  <p class="muted center small">Multiple secure payment methods at checkout</p>
  <div class="pay-strip">
    ${cards.pay.map((p) => `<div class="pay-tile">${esc(p.title)}${p.body ? ` <span class="cur">${esc(p.body)}</span>` : ''}</div>`).join('')}
  </div>
</section>` : ''}`);
}

export function shop(ctx, { categories, cat, products, q }) {
  return page(ctx, `
<section class="section">
  <div class="section-head">
    <h1>${esc(cat ? cat.name : 'Shop')}</h1>
    ${q ? `<span class="muted">results for “${esc(q)}”</span>` : ''}
  </div>
  <div class="shop-layout">
    <aside class="filters">
      <h3>Categories</h3>
      <a href="/shop" class="${!cat ? 'active' : ''}">All products</a>
      ${categories.map((c) => `
        <a href="/shop?category=${esc(c.slug)}" class="${cat && cat.id === c.id ? 'active' : ''}">${esc(c.name)}</a>`).join('')}
    </aside>
    <div>
      ${products.length === 0
        ? '<p class="muted empty-note">No products found. Try another search or category.</p>'
        : `<div class="product-grid">${products.map((p) => productCard(p)).join('')}</div>`}
    </div>
  </div>
</section>`);
}

export function product(ctx, { p, category, related }) {
  const maxQty = Math.min(p.stock, 10);
  return page(ctx, `
<section class="product-detail">
  <div class="pd-img">
    <img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy" decoding="async">
  </div>
  <div class="pd-info">
    <a href="/shop?category=${esc(category.slug)}" class="product-cat">${esc(category.name)}</a>
    <h1>${esc(p.name)}</h1>
    <div class="price price-lg">€${(p.price_cents / 100).toFixed(2)} <span class="muted">incl. VAT</span></div>
    <p class="pd-desc">${esc(p.description)}</p>
    <p class="muted">${p.stock > 0 ? `✓ In stock (${p.stock} available) — ships in 1–2 business days` : 'Currently sold out'}</p>
    ${p.stock > 0 ? `
    <form action="/cart/add" method="POST" class="pd-form">
      <input type="hidden" name="product_id" value="${p.id}">
      <input type="hidden" name="redirect" value="/product/${esc(p.slug)}">
      <label>Qty
        <select name="qty">${Array.from({ length: Math.max(maxQty, 1) }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}</select>
      </label>
      <button type="submit" class="btn btn-lg">Add to cart</button>
    </form>` : ''}
  </div>
</section>

${related.length ? `
<section class="section">
  ${t(ctx, 'related_heading') ? `<h2>${esc(t(ctx, 'related_heading'))}</h2>` : ''}
  <div class="product-grid">${related.map((r) => productCard(r)).join('')}</div>
</section>` : ''}`);
}

export function cart(ctx, { details }) {
  const rows = details.items.map((it) => `
        <tr>
          <td class="cart-prod">
            <img src="${esc(it.product.image_url)}" alt="" loading="lazy" decoding="async">
            <div><a href="/product/${esc(it.product.slug)}">${esc(it.product.name)}</a></div>
          </td>
          <td>€${(it.product.price_cents / 100).toFixed(2)}</td>
          <td><input class="qty-input" type="number" name="qty[${it.product.id}]" value="${it.qty}" min="0" max="99"></td>
          <td>€${(it.line_total / 100).toFixed(2)}</td>
          <td><a class="link-btn danger" href="/cart/remove/${it.product.id}">remove</a></td>
        </tr>`).join('');

  const free = Number(ctx.settings.free_shipping_threshold_cents || 0);
  return page(ctx, `
<section class="section">
  <h1>Your cart</h1>
  ${details.items.length === 0
    ? '<p class="muted empty-note">Your cart is empty. <a href="/shop">Continue shopping</a>.</p>'
    : `
  <form action="/cart/update" method="POST">
    <table class="table cart-table">
      <thead><tr><th>Product</th><th>Price</th><th>Qty</th><th>Total</th><th></th></tr></thead>
      <tbody>${rows}
      </tbody>
    </table>
    <div class="cart-actions">
      <a href="/shop" class="link-btn">← Continue shopping</a>
      <button type="submit" class="btn">Update quantities</button>
    </div>
  </form>

  <div class="cart-summary card">
    <div class="row"><span>Subtotal</span><span>€${(details.subtotal / 100).toFixed(2)}</span></div>
    <div class="row muted"><span>Shipping</span><span>calculated at checkout</span></div>
    <a class="btn btn-lg btn-block" href="/checkout">Proceed to checkout</a>
    <p class="muted small center">Free shipping on orders over €${(free / 100).toFixed(2)} · Pay with PayPal or crypto</p>
  </div>`}
</section>`);
}

export function help(ctx) {
  const faqItems = String((ctx.settings || {}).faqs || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const i = l.indexOf('||');
    return i === -1 ? [l, ''] : [l.slice(0, i).trim(), l.slice(i + 2).trim()];
  });
  const { settings } = ctx;
  const free = Number(settings.free_shipping_threshold_cents || 0);
  return page(ctx, `
<section class="section narrow">
  <div class="card center">
    <div class="big-icon">✦</div>
    <h1>Help & contact</h1>
    <p class="muted">Need a hand with your order, payment or account? We're here to help.</p>
  </div>

  <div class="verify-grid">
    <div class="card center contact-card">
      <div class="big-icon">✦</div>
      <h2>Email us</h2>
      <p><a href="mailto:${esc(settings.support_email)}">${esc(settings.support_email)}</a></p>
      <p class="muted small">We usually reply within one business day.</p>
    </div>

    <div class="card center contact-card">
      <div class="big-icon">✦</div>
      <h2>Call us</h2>
      ${settings.support_phone
        ? `<p><a href="tel:${esc(settings.support_phone.replace(/\s/g, ''))}">${esc(settings.support_phone)}</a></p>
           <p class="muted small">Mon–Fri, 09:00–17:00 CET.</p>`
        : '<p class="muted">Phone number coming soon — please email us for now.</p>'}
    </div>
  </div>

  ${settings.store_address ? `
  <div class="card">
    <h2>Visit us</h2>
    <p class="muted">${esc(settings.store_address)}</p>
  </div>` : ''}

  ${faqItems.length ? `
  <div class="card">
    ${t(ctx, 'faq_heading') ? `<h2>${esc(t(ctx, 'faq_heading'))}</h2>` : ''}
    ${faqItems.map(([q, a]) => `<details><summary>${esc(q)}</summary><p class="muted">${esc(a)}</p></details>`).join('\n    ')}
  </div>` : ''}
</section>`);
}
