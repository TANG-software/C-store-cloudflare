// C Store — owner (developer) dashboard.
// Full read-only business overview for the site owner: revenue, the agreed
// 10% monthly profit share, customers, orders, sales per product, stock and
// an activity feed. Also holds the ads on/off switch (owner-only).
import { page } from './layout.js';

const eur = (cents) => '€' + (Number(cents || 0) / 100).toFixed(2);
const SHARE_PCT = 10;
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function dashboard(ctx, d) {
  const { totals, thisMonth, months, methods, recentOrders, recentUsers, counts,
          salesByProduct, allOrders, allUsers, lowStock, pendingValue, avgOrder, adsOn, adFlags, allAccounts } = d;
  const af = adFlags || {};

  const shareThisMonth = Math.round(thisMonth.revenue * SHARE_PCT / 100);
  const shareAll = Math.round(totals.revenue * SHARE_PCT / 100);

  const monthRows = months.map((m) => `<tr><td>${esc(m.month)}</td><td>${m.orders}</td><td>${eur(m.revenue)}</td><td><strong>${eur(Math.round(m.revenue * SHARE_PCT / 100))}</strong></td></tr>`).join('');
  const methodRows = methods.map((m) => `<tr><td>${esc(String(m.payment_method || '—').replace(/_/g, ' '))}</td><td>${m.n}</td><td>${eur(m.revenue)}</td></tr>`).join('');
  const productRows = salesByProduct.map((p) => `<tr><td>${esc(p.name)}</td><td>${p.qty}</td><td>${eur(p.revenue)}</td></tr>`).join('');
  const lowRows = lowStock.map((p) => `<tr><td>${esc(p.name)}</td><td>${p.stock}</td></tr>`).join('');

  const orderRows = (list) => list.map((o) => `<tr>
      <td>${esc(o.order_number)}</td>
      <td>${esc(o.ship_name || o.user_name || '—')}</td>
      <td>${eur(o.total_cents)}</td>
      <td>${esc(String(o.payment_method || '').replace(/_/g, ' '))}</td>
      <td><span class="badge badge-${esc(o.status)}">${esc(String(o.status).replace(/_/g, ' '))}</span></td>
      <td>${esc((o.created_at || '').slice(0, 16))}</td>
    </tr>`).join('');

  const userRows = (list) => list.map((u) => `<tr>
      <td>${esc(u.name)}</td>
      <td>${esc(u.email)}</td>
      <td>${esc(u.phone || '—')}</td>
      <td>${u.email_verified ? 'yes' : 'no'}</td>
      <td>${esc((u.created_at || '').slice(0, 16))}</td>
    </tr>`).join('');

  // activity feed: newest orders + newest signups, merged by time
  const feed = [
    ...allOrders.slice(0, 20).map((o) => ({ t: o.created_at, txt: `Order ${o.order_number} — ${eur(o.total_cents)} (${String(o.status).replace(/_/g, ' ')}) by ${o.ship_name || o.user_name || '—'}` })),
    ...allUsers.slice(0, 20).map((u) => ({ t: u.created_at, txt: `New customer: ${u.name} (${u.email})${u.email_verified ? '' : ' — email not verified'}` })),
  ].sort((a, b) => String(b.t).localeCompare(String(a.t))).slice(0, 25);
  const feedRows = feed.map((f) => `<tr><td style="white-space:nowrap">${esc((f.t || '').slice(0, 16))}</td><td>${esc(f.txt)}</td></tr>`).join('');

  return page(ctx, `
<h1>Owner dashboard</h1>
<p class="muted">Read-only overview of everything happening on ${esc(ctx.settings.store_name || 'the store')} — revenue, your ${SHARE_PCT}% monthly share, customers, orders, sales and stock.</p>

<div class="stat-grid">
  <div class="card stat"><span class="stat-num">${eur(totals.revenue)}</span><span class="muted">Revenue all time</span></div>
  <div class="card stat"><span class="stat-num">${eur(shareAll)}</span><span class="muted">Your ${SHARE_PCT}% share (all time)</span></div>
  <div class="card stat"><span class="stat-num">${eur(thisMonth.revenue)}</span><span class="muted">Revenue this month</span></div>
  <div class="card stat"><span class="stat-num" style="color:#c084fc">${eur(shareThisMonth)}</span><span class="muted">Your share this month</span></div>
</div>

<div class="stat-grid">
  <div class="card stat"><span class="stat-num">${counts.customers}</span><span class="muted">Customers</span></div>
  <div class="card stat"><span class="stat-num">${counts.newThisMonth}</span><span class="muted">New customers this month</span></div>
  <div class="card stat"><span class="stat-num">${counts.orders}</span><span class="muted">Orders (all)</span></div>
  <div class="card stat"><span class="stat-num">${counts.pending}</span><span class="muted">Pending orders (${eur(pendingValue)})</span></div>
  <div class="card stat"><span class="stat-num">${eur(avgOrder)}</span><span class="muted">Average order value</span></div>
</div>

<div class="card">
  <h2>Ads control</h2>
  <p class="muted small">Only you (owner) see this — the client's admin cannot change ads. Master switch turns everything off at once; the switches below pick which formats run.</p>
  <form action="/developer/settings" method="POST" class="form-grid">
    <label class="span2">All ads on the shop
      <select name="ads_enabled">
        <option value="0" ${!adsOn ? 'selected' : ''}>OFF — no ads anywhere (master switch)</option>
        <option value="1" ${adsOn ? 'selected' : ''}>ON — ads run (per format below)</option>
      </select>
    </label>
    <label>Native banner popup (small sponsored box)
      <select name="ad_native">
        <option value="1" ${af.ad_native ? 'selected' : ''}>On</option>
        <option value="0" ${!af.ad_native ? 'selected' : ''}>Off</option>
      </select>
    </label>
    <label>Social bar (network bar at the bottom)
      <select name="ad_socialbar">
        <option value="1" ${af.ad_socialbar ? 'selected' : ''}>On</option>
        <option value="0" ${!af.ad_socialbar ? 'selected' : ''}>Off</option>
      </select>
    </label>
    <label>Popunder script <span class="muted small">(opens ad tabs — risky)</span>
      <select name="ad_popunder">
        <option value="1" ${af.ad_popunder ? 'selected' : ''}>On</option>
        <option value="0" ${!af.ad_popunder ? 'selected' : ''}>Off</option>
      </select>
    </label>
    <label>Bottom strip + smartlink <span class="muted small">(risky)</span>
      <select name="ad_strip">
        <option value="1" ${af.ad_strip ? 'selected' : ''}>On</option>
        <option value="0" ${!af.ad_strip ? 'selected' : ''}>Off</option>
      </select>
    </label>
    <div class="span2"><button class="btn">Save ads settings</button></div>
  </form>
  <p class="muted small" style="margin-top:10px"><strong>Heads up:</strong> the popunder and bottom-strip/smartlink formats are the ones that showed the fake "download &amp; install" page to a visitor. Both are OFF by default — turn them on only if you accept that risk for your customers.</p>
</div>

<div class="card">
  <h2>Monthly revenue &amp; your share</h2>
  <table class="table">
    <tr><th>Month</th><th>Orders</th><th>Revenue</th><th>Your ${SHARE_PCT}%</th></tr>
    ${monthRows || '<tr><td colspan="4" class="muted">No paid orders yet.</td></tr>'}
  </table>
  <p class="muted small">Your share is ${SHARE_PCT}% of revenue from paid/shipped orders in that month.</p>
</div>

<div class="card">
  <h2>Payments by method</h2>
  <table class="table">
    <tr><th>Method</th><th>Orders</th><th>Revenue</th></tr>
    ${methodRows || '<tr><td colspan="3" class="muted">No payments yet.</td></tr>'}
  </table>
</div>

<div class="card">
  <h2>Best-selling products</h2>
  <table class="table">
    <tr><th>Product</th><th>Units sold</th><th>Revenue</th></tr>
    ${productRows || '<tr><td colspan="3" class="muted">No sales yet.</td></tr>'}
  </table>
</div>

<div class="card">
  <h2>All accounts (staff + customers)</h2>
  <p class="muted small">Every login on the site, including staff accounts.</p>
  <table class="table">
    <tr><th>Name</th><th>Email</th><th>Role</th><th>Verified</th><th>Joined</th></tr>
    ${(allAccounts || []).map((a) => `<tr>
      <td>${esc(a.name)}</td>
      <td>${esc(a.email)}</td>
      <td><strong>${esc(a.role)}</strong></td>
      <td>${a.email_verified ? 'yes' : 'no'}</td>
      <td>${esc((a.created_at || '').slice(0, 16))}</td>
    </tr>`).join('') || '<tr><td colspan="5" class="muted">No accounts yet.</td></tr>'}
  </table>
</div>

<div class="card">
  <h2>Activity feed</h2>
  <table class="table">
    <tr><th>When</th><th>What happened</th></tr>
    ${feedRows || '<tr><td colspan="2" class="muted">No activity yet.</td></tr>'}
  </table>
</div>

<div class="card">
  <h2>Latest orders</h2>
  <table class="table">
    <tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th></tr>
    ${orderRows(recentOrders) || '<tr><td colspan="6" class="muted">No orders yet.</td></tr>'}
  </table>
</div>

<div class="card">
  <h2>All orders (last 100)</h2>
  <table class="table">
    <tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th></tr>
    ${orderRows(allOrders) || '<tr><td colspan="6" class="muted">No orders yet.</td></tr>'}
  </table>
</div>

<div class="card">
  <h2>Newest customers</h2>
  <table class="table">
    <tr><th>Name</th><th>Email</th><th>Phone</th><th>Verified</th><th>Joined</th></tr>
    ${userRows(recentUsers) || '<tr><td colspan="5" class="muted">No customers yet.</td></tr>'}
  </table>
</div>

<div class="card">
  <h2>All customers (last 100)</h2>
  <table class="table">
    <tr><th>Name</th><th>Email</th><th>Phone</th><th>Verified</th><th>Joined</th></tr>
    ${userRows(allUsers) || '<tr><td colspan="5" class="muted">No customers yet.</td></tr>'}
  </table>
</div>

<div class="card">
  <h2>Low stock (5 or fewer)</h2>
  <table class="table">
    <tr><th>Product</th><th>Left</th></tr>
    ${lowRows || '<tr><td colspan="2" class="muted">Nothing low on stock.</td></tr>'}
  </table>
</div>
`);
}
