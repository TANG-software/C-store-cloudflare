// C Store Workers — storefront views: home, shop, product, cart, help.
import { esc } from '../lib.js';
import { page, productCard, CAT_ICONS } from './layout.js';

export function home(ctx, { categories, featured, newest }) {
  return page(ctx, `
<section class="hero">
  <h1>Everything you need,<br><em>delivered with care</em></h1>
  <p>Electronics, fashion, home & living, beauty and more — shipped across the Netherlands, paid with PayPal or crypto.</p>
  <a href="/shop" class="btn btn-lg">Shop here! →</a>
  <div class="hero-badges">
    <span>⚡ Instant delivery</span>
    <span>🛡️ Secure payments</span>
    <span>🎧 24/7 support</span>
    <span>Free shipping over €${(Number(ctx.settings.free_shipping_threshold_cents) / 100).toFixed(2)}</span>
  </div>
</section>

<section class="section">
  <div class="card">
    <h2>About us</h2>
    <p class="muted">${esc(ctx.settings.store_name)} is your modern storefront for the essentials and the extras — curated products, honest prices and a checkout that takes seconds. Every order ships from the Netherlands with care.</p>
    <div class="feature-grid">
      <div class="feature-card">
        <span class="feature-icon">⚡</span>
        <h3>Instant Delivery</h3>
        <p>Fast dispatch across the Netherlands — most orders arrive within 1–2 business days.</p>
      </div>
      <div class="feature-card">
        <span class="feature-icon">🛡️</span>
        <h3>Secure Payments</h3>
        <p>Pay with PayPal or 300+ cryptocurrencies. Your data stays yours, always.</p>
      </div>
      <div class="feature-card">
        <span class="feature-icon">🎧</span>
        <h3>24/7 Support</h3>
        <p>Questions about an order? Our team is around the clock for you.</p>
      </div>
      <div class="feature-card">
        <span class="feature-icon">📦</span>
        <h3>Huge Selection</h3>
        <p>${categories.length} categories and a growing range of hand-picked products.</p>
      </div>
    </div>
  </div>
</section>

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

<section class="section">
  <h2>Reviews</h2>
  <div class="review-grid">
    <div class="review-card">
      <div class="review-top"><span class="stars">★★★★★</span><span class="review-date">2 weeks ago</span></div>
      <p>Super fast delivery and the quality is exactly as described. The crypto checkout worked flawlessly!</p>
      <div class="review-user"><span class="review-avatar">M</span><span>Marco — Rotterdam</span></div>
    </div>
    <div class="review-card">
      <div class="review-top"><span class="stars">★★★★★</span><span class="review-date">1 month ago</span></div>
      <p>Finally a shop that just works. Ordered in the evening, package arrived two days later. Top service.</p>
      <div class="review-user"><span class="review-avatar">S</span><span>Sanne — Utrecht</span></div>
    </div>
    <div class="review-card">
      <div class="review-top"><span class="stars">★★★★★</span><span class="review-date">2 months ago</span></div>
      <p>Great selection and fair prices. Paid with PayPal, everything smooth. Will definitely order again.</p>
      <div class="review-user"><span class="review-avatar">D</span><span>Daan — Amsterdam</span></div>
    </div>
  </div>
</section>

<section class="section">
  <h2 class="center">We support</h2>
  <p class="muted center small">Multiple secure payment methods at checkout</p>
  <div class="pay-strip">
    <div class="pay-tile"><span class="pm-icon">🅿️</span>PayPal</div>
    <div class="pay-tile"><span class="pm-icon">₿</span>Bitcoin</div>
    <div class="pay-tile"><span class="pm-icon">Ξ</span>Ethereum</div>
    <div class="pay-tile"><span class="pm-icon">₮</span>USDT</div>
    <div class="pay-tile"><span class="pm-icon">✦</span>+300 coins</div>
  </div>
</section>`);
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
