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

export function home(ctx, { categories, featured, newest, stats, cards }) {
  const S = ctx.settings;
  const free = (Number(S.free_shipping_threshold_cents) / 100).toFixed(2);
  const icon = (paths, extra = '') => `<span class="feature-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ${extra}>${paths}</svg></span>`;
  const stars = (n) => '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n));
  return page(ctx, `
<section class="hero">
  <p class="hero-overline">Netherlands &middot; EU shipping</p>
  <h1 class="hero-brand">${esc(S.store_name)}</h1>
  <p class="hero-tag">${esc(S.store_tagline || 'Curated products, honest prices, fast delivery.')}</p>
  <a href="/shop" class="btn btn-lg">Explore the collection</a>
  <div class="hero-badges">
    <span>Free shipping over €${free}</span>
    <span>1–2 day delivery in NL</span>
    <span>PayPal & 300+ cryptocurrencies</span>
    <span>21% VAT included</span>
  </div>
</section>

<section class="section">
  <h2>${esc(S.store_name)} stats</h2>
  <p class="muted">A quick look at what we've achieved and what keeps our customers coming back — updated live with every order.</p>
  <div class="stats-grid">
    <div class="stat-box"><span class="num">${stats.orders}</span><span class="bar"></span><span class="lbl">Orders completed</span></div>
    <div class="stat-box"><span class="num">${stats.customers}</span><span class="bar"></span><span class="lbl">Happy customers</span></div>
    <div class="stat-box"><span class="num">${stats.products}</span><span class="bar"></span><span class="lbl">Products listed</span></div>
  </div>
</section>

${cards.feature.length ? `
<section class="section">
  <div class="card">
    <h2>About us</h2>
    <p class="muted">${esc(S.store_name)} keeps it simple: we hold our own stock in the Netherlands, describe every product the way it actually arrives, and answer email ourselves — no scripts, no call center. Prices include VAT, and shipping is free above €${free}.</p>
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
  <h2>Shop by category</h2>
  <div class="category-grid">
    ${categories.map((c) => `
      <a href="/shop?category=${esc(c.slug)}" class="category-card">
        <span class="category-icon">${esc(c.name.charAt(0))}</span>
        <span class="category-name">${esc(c.name)}</span>
      </a>`).join('')}
  </div>
</section>

<section class="section">
  <h2>Popular right now</h2>
  <div class="product-grid">${featured.map((p) => productCard(p)).join('')}</div>
</section>

<section class="section">
  <h2>New arrivals</h2>
  <div class="product-grid">${newest.map((p) => productCard(p)).join('')}</div>
</section>

${cards.review.length ? `
<section class="section">
  <h2>What customers say</h2>
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
  <h2 class="center">We support</h2>
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
  <h2>You may also like</h2>
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

  <div class="card">
    <h2>Frequently asked questions</h2>
    <details><summary>Which payment methods do you accept?</summary>
      <p class="muted">PayPal (including card payments through PayPal) and cryptocurrencies — Bitcoin, Ethereum, USDT and 300+ coins, depending on the options available at checkout.</p></details>
    <details><summary>Why do I need to verify my email and mobile number?</summary>
      <p class="muted">For your security and to prevent fraud, we verify every customer's email address and mobile number with a one-time code before the first order. Verification happens once, right after you register.</p></details>
    <details><summary>I paid with crypto — why is my order still “pending”?</summary>
      <p class="muted">Cryptocurrency payments need network confirmations. Hosted checkouts (Coinbase Commerce, NOWPayments, BitPay) confirm automatically within minutes. Direct wallet transfers are verified by our team, usually within a few hours.</p></details>
    <details><summary>Where do you ship?</summary>
      <p class="muted">We ship from the Netherlands across the EU. Dutch delivery takes 1–2 business days; free shipping on orders over €${(free / 100).toFixed(2)}.</p></details>
  </div>
</section>`);
}
