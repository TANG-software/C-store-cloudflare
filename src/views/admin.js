// C Store Workers — admin panel views.
import { esc } from '../lib.js';
import { page } from './layout.js';

function adminNav(ctx) {
  const { path } = ctx;
  const link = (href, label, match) => `<a href="${href}" class="${match ? 'active' : ''}">${label}</a>`;
  return `
<nav class="admin-nav">
  ${link('/admin', 'Dashboard', path === '/admin')}
  ${link('/admin/products', 'Products', path.startsWith('/admin/products'))}
  ${link('/admin/categories', 'Categories', path.startsWith('/admin/categories'))}
  ${link('/admin/orders', 'Orders', path.startsWith('/admin/orders'))}
  ${link('/admin/users', 'Users', path.startsWith('/admin/users'))}
  ${link('/admin/payments', 'Payments', path.startsWith('/admin/payments'))}
  ${link('/admin/settings', 'Settings', path.startsWith('/admin/settings'))}
</nav>`;
}

function adminPage(ctx, body) {
  return page(ctx, adminNav(ctx) + '\n' + body);
}

export function dashboard(ctx, { stats, recentOrders }) {
  const rows = recentOrders.map((o) => `
      <tr>
        <td><a href="/admin/orders/${o.id}">${esc(o.order_number)}</a></td>
        <td>${esc(o.user_name)}</td>
        <td>€${(o.total_cents / 100).toFixed(2)}</td>
        <td>${esc(o.payment_method.replace(/_/g, ' '))}</td>
        <td><span class="badge badge-${esc(o.status)}">${esc(o.status.replace(/_/g, ' '))}</span></td>
      </tr>`).join('');
  return adminPage(ctx, `
<h1>Dashboard</h1>
<div class="stat-grid">
  <div class="card stat"><span class="stat-num">${stats.orders}</span><span class="muted">Orders</span></div>
  <div class="card stat"><span class="stat-num">€${(stats.revenue / 100).toFixed(2)}</span><span class="muted">Revenue (paid)</span></div>
  <div class="card stat"><span class="stat-num">${stats.products}</span><span class="muted">Products</span></div>
  <div class="card stat"><span class="stat-num">${stats.customers}</span><span class="muted">Customers</span></div>
</div>
${stats.pendingVerification > 0 ? `<div class="flash flash-warn">${stats.pendingVerification} user(s) still need email/phone verification — you can manually verify them under <a href="/admin/users">Users</a>.</div>` : ''}

<div class="card">
  <h2>Recent orders</h2>
  <table class="table">
    <tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th></tr>
    ${rows || '<tr><td colspan="5" class="muted">No orders yet.</td></tr>'}
  </table>
</div>`);
}

export function products(ctx, { products }) {
  const rows = products.map((p) => `
      <tr>
        <td>${p.id}</td>
        <td><img class="thumb" src="${esc(p.image_url)}" alt=""> <a href="/product/${esc(p.slug)}">${esc(p.name)}</a></td>
        <td>${esc(p.category_name)}</td>
        <td>€${(p.price_cents / 100).toFixed(2)}</td>
        <td>${p.stock}</td>
        <td>${p.active ? '✅' : '—'}</td>
        <td class="actions">
          <a class="btn btn-small" href="/admin/products/${p.id}/edit">Edit</a>
          <form class="inline-form" action="/admin/products/${p.id}/delete" method="POST" onsubmit="return confirm('Delete this product?')">
            <button class="btn btn-small btn-danger">Delete</button>
          </form>
        </td>
      </tr>`).join('');
  return adminPage(ctx, `
<div class="section-head">
  <h1>Products</h1>
  <a class="btn" href="/admin/products/new">+ New product</a>
</div>
<div class="card">
  <table class="table">
    <tr><th>ID</th><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Active</th><th></th></tr>
    ${rows}
  </table>
</div>`);
}

export function productForm(ctx, { p, categories }) {
  const opt = (c) => `<option value="${c.id}" ${p && p.category_id == c.id ? 'selected' : ''}>${esc(c.name)}</option>`;
  return adminPage(ctx, `
<h1>${p ? 'Edit product' : 'New product'}</h1>
<div class="card">
  <form action="/admin/products/save" method="POST" class="form-grid wide">
    <input type="hidden" name="id" value="${p ? p.id : ''}">
    <label class="span2">Name<input name="name" required value="${p ? esc(p.name) : ''}"></label>
    <label>Category
      <select name="category_id" required>${categories.map(opt).join('')}</select>
    </label>
    <label>Price (€, incl. VAT)<input name="price_eur" required value="${p ? (p.price_cents / 100).toFixed(2) : ''}" placeholder="49.95"></label>
    <label>Stock<input name="stock" type="number" min="0" value="${p ? p.stock : 0}"></label>
    <label>Active
      <select name="active">
        <option value="1" ${!p || p.active ? 'selected' : ''}>Visible in shop</option>
        <option value="0" ${p && !p.active ? 'selected' : ''}>Hidden</option>
      </select>
    </label>
    <label class="span2">Image URL<input name="image_url" value="${p ? esc(p.image_url) : ''}" placeholder="https://…"></label>
    <label class="span2">Description<textarea name="description" rows="4">${p ? esc(p.description) : ''}</textarea></label>
    <div class="span2">
      <button class="btn btn-lg" type="submit">Save product</button>
      <a class="link-btn" href="/admin/products">Cancel</a>
    </div>
  </form>
</div>`);
}

export function categories(ctx, { categories }) {
  const rows = categories.map((c) => `
      <tr>
        <td>${esc(c.name)}</td>
        <td>${esc(c.slug)}</td>
        <td>${c.product_count}</td>
        <td>
          ${c.product_count === 0 ? `
          <form class="inline-form" action="/admin/categories/${c.id}/delete" method="POST" onsubmit="return confirm('Delete this category?')">
            <button class="btn btn-small btn-danger">Delete</button>
          </form>` : ''}
        </td>
      </tr>`).join('');
  return adminPage(ctx, `
<h1>Categories</h1>
<div class="card">
  <form action="/admin/categories/save" method="POST" class="inline-add">
    <input name="name" placeholder="New category name" required>
    <button class="btn">Add category</button>
  </form>
  <table class="table">
    <tr><th>Name</th><th>Slug</th><th>Products</th><th></th></tr>
    ${rows}
  </table>
</div>`);
}

export function orders(ctx, { orders }) {
  const rows = orders.map((o) => `
      <tr>
        <td><a href="/admin/orders/${o.id}">${esc(o.order_number)}</a></td>
        <td>${esc(o.user_name)}</td>
        <td>€${(o.total_cents / 100).toFixed(2)}</td>
        <td>${esc(o.payment_method.replace(/_/g, ' '))}</td>
        <td><span class="badge badge-${esc(o.status)}">${esc(o.status.replace(/_/g, ' '))}</span></td>
        <td>${esc(o.created_at.slice(0, 16).replace('T', ' '))}</td>
      </tr>`).join('');
  return adminPage(ctx, `
<h1>Orders</h1>
<div class="card">
  <table class="table">
    <tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Placed</th></tr>
    ${rows || '<tr><td colspan="6" class="muted">No orders yet.</td></tr>'}
  </table>
</div>`);
}

export function orderDetail(ctx, { order, items, payments }) {
  const payRows = payments.map((pm) => `
        <tr><td>${esc(pm.provider)}</td><td>${esc(pm.status)}</td><td><code>${esc(String(pm.ext_id || '').slice(0, 24))}</code></td><td>${esc(pm.updated_at.slice(0, 16).replace('T', ' '))}</td></tr>`).join('');
  return adminPage(ctx, `
<h1>Order ${esc(order.order_number)} <span class="badge badge-${esc(order.status)}">${esc(order.status.replace(/_/g, ' '))}</span></h1>

<div class="verify-grid">
  <div class="card">
    <h2>Items</h2>
    <table class="table">
      ${items.map((it) => `<tr><td>${it.qty}× ${esc(it.name)}</td><td>€${((it.price_cents * it.qty) / 100).toFixed(2)}</td></tr>`).join('')}
      <tr><td>Shipping</td><td>${order.shipping_cents === 0 ? 'Free' : '€' + (order.shipping_cents / 100).toFixed(2)}</td></tr>
      <tr class="total-row"><td><strong>Total</strong></td><td><strong>€${(order.total_cents / 100).toFixed(2)}</strong></td></tr>
    </table>
  </div>

  <div class="card">
    <h2>Customer & shipping</h2>
    <table class="table">
      <tr><td>Customer</td><td>${esc(order.user_name)}</td></tr>
      <tr><td>Email</td><td>${esc(order.user_email)}</td></tr>
      <tr><td>Phone</td><td>${esc(order.user_phone)}</td></tr>
      <tr><td>Address</td><td>${esc(order.ship_address)}, ${esc(order.ship_postal_code)} ${esc(order.ship_city)} (${esc(order.ship_country)})</td></tr>
    </table>
  </div>

  <div class="card">
    <h2>Payment</h2>
    <p class="muted">Method: <strong>${esc(order.payment_method.replace(/_/g, ' '))}</strong></p>
    ${order.txid ? `<p>Transaction ID: <code>${esc(order.txid)}</code></p>` : ''}
    <table class="table">
      <tr><th>Provider</th><th>Status</th><th>Reference</th><th>Updated</th></tr>
      ${payRows || '<tr><td colspan="4" class="muted">No payment attempts.</td></tr>'}
    </table>
    ${order.payment_method === 'manual_crypto' && order.status === 'awaiting_confirmation' ? '<div class="flash flash-warn">This is a manual crypto transfer — verify the transaction on the blockchain before marking the order as paid.</div>' : ''}
    <form action="/admin/orders/${order.id}/status" method="POST" class="status-form">
      <label>Set status
        <select name="status">
          ${['pending', 'awaiting_confirmation', 'paid', 'shipped', 'cancelled'].map((st) => `<option value="${st}" ${order.status === st ? 'selected' : ''}>${st.replace(/_/g, ' ')}</option>`).join('')}
        </select>
      </label>
      <button class="btn">Update</button>
    </form>
  </div>
</div>`);
}

export function users(ctx, { users, me }) {
  const rows = users.map((u) => `
      <tr>
        <td>${u.id}</td>
        <td>${esc(u.name)}${u.id === me.id ? ' (you)' : ''}</td>
        <td>${esc(u.email)}</td>
        <td>${esc(u.phone)}</td>
        <td>
          📧 ${u.email_verified ? '✅' : '❌'}
          📱 ${u.phone_verified ? '✅' : '❌'}
          ${!u.email_verified || !u.phone_verified ? `
          <form class="inline-form" action="/admin/users/${u.id}/verify" method="POST">
            <input type="hidden" name="channel" value="${u.email_verified ? 'phone' : 'email'}">
            <button class="btn btn-small">Mark verified</button>
          </form>` : ''}
        </td>
        <td>${u.order_count}</td>
        <td>
          <form class="inline-form" action="/admin/users/${u.id}/role" method="POST">
            <select name="role">
              <option value="customer" ${u.role === 'customer' ? 'selected' : ''}>customer</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>
            </select>
            <button class="btn btn-small">Set</button>
          </form>
        </td>
        <td></td>
      </tr>`).join('');
  return adminPage(ctx, `
<h1>Users</h1>
<div class="card">
  <table class="table">
    <tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Verified</th><th>Orders</th><th>Role</th><th></th></tr>
    ${rows}
  </table>
</div>`);
}

// -------- Payments (admin-editable credentials) --------
export function payments(ctx, { settings, status, baseUrl }) {
  const v = (k) => esc(settings[k] || '');
  const field = (name, label, val, type = 'text', ph = '') =>
    `<label>${label}<input name="${name}" type="${type}" value="${val}" placeholder="${ph}"></label>`;
  const card = (id, icon, name, desc, body, note) => `
  <div class="card payments-card">
    <div class="pay-head">
      <span class="pm-icon">${icon}</span>
      <h2 style="margin:0">${name}</h2>
      <span class="badge ${status[id] ? 'badge-paid' : 'badge-pending'}">${status[id] ? 'configured' : 'not configured'}</span>
    </div>
    <p class="muted small">${desc}</p>
    <form action="/admin/payments" method="POST" class="form-grid">
      <input type="hidden" name="section" value="${id}">
      ${body}
      <div class="span2"><button class="btn">Save ${name} settings</button>${note ? `<p class="muted small">${note}</p>` : ''}</div>
    </form>
  </div>`;
  return adminPage(ctx, `
<h1>Payments & verification</h1>
<div class="flash flash-warn">🔐 These credentials are stored in the store database and take effect immediately — no redeploy needed. Empty all fields of a section to disable that provider.</div>

<div class="verify-grid">
  ${card('paypal', '🅿️', 'PayPal', 'Card and PayPal-account payments. Create a REST app at developer.paypal.com.',
    field('paypal_client_id', 'Client ID', v('paypal_client_id'), 'text', 'PayPal REST app client ID') +
    field('paypal_secret', 'Secret', v('paypal_secret'), 'password', 'PayPal REST app secret') +
    `<label>Mode
      <select name="paypal_env">
        <option value="sandbox" ${settings.paypal_env !== 'live' ? 'selected' : ''}>Sandbox (testing)</option>
        <option value="live" ${settings.paypal_env === 'live' ? 'selected' : ''}>Live (real payments)</option>
      </select>
    </label>`)}

  ${card('coinbase', '🪙', 'Coinbase Commerce', 'Crypto hosted checkout (BTC, ETH, USDC, DAI and 100+ coins).',
    field('coinbase_api_key', 'API Key', v('coinbase_api_key'), 'text', 'Coinbase Commerce API key') +
    field('coinbase_webhook_secret', 'Webhook secret', v('coinbase_webhook_secret'), 'password', 'Shared webhook secret'),
    `Webhook URL to register at commerce.coinbase.com:<br><code>${esc(baseUrl)}/webhooks/coinbase</code>`)}

  ${card('nowpayments', '🔄', 'NOWPayments', 'Crypto hosted checkout with 300+ coins.',
    field('nowpayments_api_key', 'API Key', v('nowpayments_api_key'), 'text', 'NOWPayments API key') +
    field('nowpayments_ipn_secret', 'IPN secret', v('nowpayments_ipn_secret'), 'password', 'IPN callback secret'),
    `IPN callback URL to register at nowpayments.io:<br><code>${esc(baseUrl)}/webhooks/nowpayments</code>`)}

  ${card('bitpay', '🟠', 'BitPay', 'Bitcoin and other coins via BitPay invoices. Generate a secp256k1 private key — see README.',
    field('bitpay_token', 'Merchant token', v('bitpay_token'), 'text', 'BitPay merchant facade token') +
    field('bitpay_private_key', 'Private key (secp256k1 hex)', v('bitpay_private_key'), 'password', '64-char hex private key') +
    field('bitpay_webhook_secret', 'Webhook secret (optional)', v('bitpay_webhook_secret'), 'password', 'HMAC webhook secret'),
    `Notification URL:<br><code>${esc(baseUrl)}/webhooks/bitpay</code>`)}

  ${card('email', '📧', 'Email (Resend API)', 'Sends verification codes and order emails. Resend\'s free plan covers 3,000 emails/month — sign up at resend.com, add your domain, and paste the API key here. (Direct SMTP is not possible on Cloudflare Workers.)',
    field('email_api_key', 'Resend API key', v('email_api_key'), 'password', 're_…') +
    field('email_from', 'From address', v('email_from'), 'text', 'C Store <orders@your-domain.com>'))}

  ${card('sms', '📱', 'SMS (Twilio)', 'Sends verification codes by text message.',
    field('twilio_sid', 'Account SID', v('twilio_sid'), 'text', 'AC…') +
    field('twilio_from', 'From number', v('twilio_from'), 'text', '+15000000000') +
    field('twilio_token', 'Auth token', v('twilio_token'), 'password', 'Twilio auth token'))}
</div>`);
}

export function settings(ctx, { s, baseUrl }) {
  const v = (k) => esc(s[k] || '');
  return adminPage(ctx, `
<h1>Settings</h1>
<div class="verify-grid">

  <div class="card">
    <h2>Store</h2>
    <form action="/admin/settings" method="POST" class="form-grid">
      <label>Store name<input name="store_name" value="${v('store_name')}"></label>
      <label>Support email<input name="support_email" value="${v('support_email')}"></label>
      <label class="span2">Tagline<input name="store_tagline" value="${v('store_tagline')}"></label>
      <label>Shipping NL (€)<input name="shipping_nl_eur" value="${(Number(s.shipping_nl_cents) / 100).toFixed(2)}"></label>
      <label>Shipping EU (€)<input name="shipping_eu_eur" value="${(Number(s.shipping_eu_cents) / 100).toFixed(2)}"></label>
      <label>Free shipping from (€)<input name="free_shipping_eur" value="${(Number(s.free_shipping_threshold_cents) / 100).toFixed(2)}"></label>
      <label>Site URL (used for payment redirects & webhooks)<input name="public_base_url" value="${v('public_base_url')}" placeholder="${esc(baseUrl)}"></label>
      <div class="span2"><button class="btn">Save settings</button></div>
    </form>
  </div>

  <div class="card">
    <h2>Contact details (shown to customers)</h2>
    <p class="muted small">These appear on the Help page and in the footer, so customers know how to reach you.</p>
    <form action="/admin/settings" method="POST" class="form-grid">
      <label>Support email<input name="support_email" value="${v('support_email')}" placeholder="support@cstore.nl"></label>
      <label>Support phone<input name="support_phone" value="${v('support_phone')}" placeholder="+31 20 123 4567"></label>
      <label class="span2">Store address (optional)<textarea name="store_address" rows="2" placeholder="Keizersgracht 1, 1015 CJ Amsterdam, Netherlands">${v('store_address')}</textarea></label>
      <div class="span2"><button class="btn">Save contact details</button></div>
    </form>
  </div>

  <div class="card">
    <h2>Manual crypto wallets</h2>
    <p class="muted">Used by the “Direct transfer” payment option. Customers send crypto to these addresses and submit their transaction ID; you confirm in the order view.</p>
    <form action="/admin/settings" method="POST" class="form-grid">
      <label class="span2">Bitcoin (BTC) address<input name="wallet_btc" value="${v('wallet_btc')}" placeholder="bc1…"></label>
      <label class="span2">Ethereum (ETH) address<input name="wallet_eth" value="${v('wallet_eth')}" placeholder="0x…"></label>
      <label class="span2">USDT (TRC-20) address<input name="wallet_usdt_trc20" value="${v('wallet_usdt_trc20')}" placeholder="T…"></label>
      <div class="span2"><button class="btn">Save wallets</button></div>
    </form>
  </div>
</div>`);
}
