// C Store Workers — checkout & payment views.
import { esc } from '../lib.js';
import { page } from './layout.js';

const EU = ['NL', 'BE', 'DE', 'FR', 'LU', 'AT', 'IT', 'ES', 'PT', 'DK', 'SE', 'FI', 'IE', 'PL', 'CZ', 'SK', 'HU', 'SI', 'HR', 'EE', 'LV', 'LT', 'GR', 'RO', 'BG', 'CY', 'MT'];

export function checkout(ctx, { user, details, methods, restricted, allDigital }) {
  const firstAvailable = (ms) => {
    const i = ms.findIndex((m) => m.available);
    return i === -1 ? -2 : i;
  };
  const option = (m, i) => `
        <label class="payment-option ${m.available ? '' : 'disabled'}">
          <input type="radio" name="payment_method" value="${esc(m.id)}" ${m.available ? '' : 'disabled'} ${m.available && i === firstAvailable(methods) ? 'checked' : ''}>
          <span class="pm-icon">${m.icon}</span>
          <span>
            <strong>${esc(m.name)}</strong><br>
            <span class="muted">${esc(m.desc)}</span>
            ${m.available ? '' : '<br><span class="stock out">Not yet configured</span>'}
          </span>
        </label>`;
  return page(ctx, `
<section class="section">
  <h1>Checkout</h1>
  <form action="/checkout" method="POST" class="checkout-grid">
    <div>
      <div class="card">
        <h2>${allDigital ? 'Your details' : 'Shipping details'}</h2>
        ${allDigital ? '<p class="muted small">Digital delivery — no address needed. Your account details appear on the order page as soon as the payment is confirmed.</p>' : ''}
        <div class="form-grid">
          <label>Full name<input name="ship_name" ${allDigital ? '' : 'required'} value="${esc(user.name)}"></label>
          <label>Email<input type="email" name="ship_email" required value="${esc(user.email)}" readonly class="muted-input"></label>
          <label>Mobile number<input name="ship_phone" ${allDigital ? '' : 'required'} value="${esc(user.phone)}" placeholder="+31 6 12345678"></label>
          ${allDigital ? '' : `
          <label>Address<input name="ship_address" required placeholder="Street and number"></label>
          <label>City<input name="ship_city" required></label>
          <label>Postal code<input name="ship_postal_code" required placeholder="1234 AB"></label>
          <label>Country
            <select name="ship_country">
              <option value="NL" selected>🇳🇱 Netherlands</option>
              ${EU.filter((c) => c !== 'NL').map((c) => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </label>`}
        </div>
      </div>

      <div class="card">
        <h2>Payment method</h2>
        ${restricted ? '<p class="muted small">Some products in your cart only allow certain payment methods — the options below reflect that.</p>' : ''}
        ${methods.map(option).join('')}
      </div>
    </div>

    <aside class="card order-summary">
      <h2>Order summary</h2>
      ${details.items.map((it) => `<div class="row"><span>${it.qty}× ${esc(it.product.name)}</span><span>€${(it.line_total / 100).toFixed(2)}</span></div>`).join('')}
      <div class="row"><span>Subtotal</span><span>€${(details.subtotal / 100).toFixed(2)}</span></div>
      ${allDigital ? `<div class="row muted"><span>Delivery</span><span>Instant — digital</span></div>` : `<div class="row muted"><span>Shipping</span><span>NL €${(Number(ctx.settings.shipping_nl_cents) / 100).toFixed(2)} · EU €${(Number(ctx.settings.shipping_eu_cents) / 100).toFixed(2)} · free over €${(Number(ctx.settings.free_shipping_threshold_cents) / 100).toFixed(2)}</span></div>`}
      <button type="submit" class="btn btn-lg btn-block">Continue to payment</button>
    </aside>
  </form>
</section>`);
}

export function payPaypal(ctx, { order, clientId }) {
  return page(ctx, `
<section class="section narrow">
  <div class="card center">
    <h1>Pay with PayPal</h1>
    <p class="muted">Order <strong>${esc(order.order_number)}</strong> — total <strong>€${(order.total_cents / 100).toFixed(2)}</strong></p>
    <div id="paypal-buttons"></div>
    <div id="paypal-error" class="flash flash-error" style="display:none"></div>
    <p class="muted small">You'll pay securely via PayPal. Card payments through PayPal are also accepted.</p>
  </div>
</section>

<script src="https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=EUR&intent=capture"></script>
<script>
  paypal.Buttons({
    createOrder: function () {
      return fetch('/pay/api/paypal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: ${order.id} })
      }).then(r => r.json()).then(d => {
        if (!d.id) throw new Error(d.error || 'Could not create order');
        return d.id;
      });
    },
    onApprove: function (data) {
      return fetch('/pay/api/paypal/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: ${order.id}, paypalOrderId: data.orderID })
      }).then(r => r.json()).then(d => {
        if (d.redirect) window.location.href = d.redirect;
      });
    },
    onError: function (err) {
      const el = document.getElementById('paypal-error');
      el.style.display = 'block';
      el.textContent = 'Payment failed: ' + (err && err.message ? err.message : 'unknown error');
    }
  }).render('#paypal-buttons');
</script>`);
}

export function payManual(ctx, { order, wallets }) {
  return page(ctx, `
<section class="section narrow">
  <div class="card center">
    <h1>Pay with crypto</h1>
    <p class="muted">Order <strong>${esc(order.order_number)}</strong> — send exactly <strong>€${(order.total_cents / 100).toFixed(2)}</strong> worth of crypto to one of the wallets below.</p>
  </div>

  <div class="wallet-grid">
    ${wallets.map((w) => `
    <div class="card wallet-card center">
      <h3>${esc(w.chain)}</h3>
      <img src="${w.qr}" alt="${esc(w.chain)} QR code" class="qr">
      <code class="wallet-addr">${esc(w.address)}</code>
    </div>`).join('')}
  </div>

  <div class="card">
    <h2>Submit your transaction ID</h2>
    <p class="muted">After sending the payment, paste the transaction hash (txid) below. We'll verify the transfer and confirm your order as soon as possible (usually within a few hours).</p>
    <form action="/pay/manual_crypto/${order.id}" method="POST" class="txid-form">
      <input name="txid" required placeholder="e.g. 4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b">
      <button type="submit" class="btn">I've sent the payment</button>
    </form>
  </div>
</section>`);
}

export function orderStatus(ctx, { order, items }) {
  const title = {
    paid: ['✅', 'Thank you — payment received!'],
    shipped: ['📦', 'Your order is on its way'],
    awaiting_confirmation: ['⏳', 'Awaiting confirmation'],
  }[order.status] || ['🕓', 'Payment pending'];
  const itemRows = items.map((it) => `<tr><td>${it.qty}× ${esc(it.name)}</td><td>€${((it.price_cents * it.qty) / 100).toFixed(2)}</td></tr>`).join('');
  return page(ctx, `
<section class="section narrow">
  <div class="card center">
    <div class="big-icon">${title[0]}</div>
    <h1>${title[1]}</h1>
    <p class="muted">Order <strong>${esc(order.order_number)}</strong> · placed ${esc(order.created_at.slice(0, 16).replace('T', ' '))}</p>
    <span class="badge badge-${esc(order.status)}">${esc(order.status.replace(/_/g, ' '))}</span>
  </div>

  ${order.delivery_text && String(order.delivery_text).trim() ? `
  <div class="card">
    <h2>Your account details</h2>
    <p class="muted small">Keep these safe — this is the account you bought.</p>
    <pre style="white-space:pre-wrap;word-break:break-word;background:#0a0a10;border:1px solid var(--line);border-radius:10px;padding:12px;font-size:0.88rem">${esc(String(order.delivery_text))}</pre>
  </div>` : `
  <div class="card">
    <h2>Your account details</h2>
    <p class="muted">These appear here as soon as your payment is confirmed and the account is handed over. If you have just paid, refresh this page in a moment.</p>
  </div>`}

  <div class="card">
    <h2>Items</h2>
    <table class="table">
      ${itemRows}
      <tr><td>Subtotal</td><td>€${(order.subtotal_cents / 100).toFixed(2)}</td></tr>
      <tr><td>Shipping</td><td>${order.shipping_cents === 0 ? 'Free' : '€' + (order.shipping_cents / 100).toFixed(2)}</td></tr>
      <tr class="total-row"><td><strong>Total</strong></td><td><strong>€${(order.total_cents / 100).toFixed(2)}</strong></td></tr>
    </table>
  </div>

  <div class="card">
    <h2>Payment</h2>
    <p class="muted">
      Method: <strong>${esc(order.payment_method.replace(/_/g, ' '))}</strong>
      ${order.txid ? `<br>Transaction ID: <code>${esc(order.txid)}</code>` : ''}
    </p>
    ${order.status === 'pending' ? `
      ${order.payment_method === 'manual_crypto'
        ? `<a class="btn" href="/pay/manual_crypto/${order.id}">Show wallet addresses</a>`
        : `<a class="btn" href="/pay/${esc(order.payment_method)}/${order.id}">Retry payment</a>`}` : ''}
  </div>

  <div class="card">
    <h2>Shipping to</h2>
    <p class="muted">
      ${esc(order.ship_name)}<br>
      ${esc(order.ship_address)}, ${esc(order.ship_postal_code)} ${esc(order.ship_city)} (${esc(order.ship_country)})<br>
      ${esc(order.ship_email)} · ${esc(order.ship_phone)}
    </p>
  </div>
</section>`);
}
