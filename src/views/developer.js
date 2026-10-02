// C Store — owner (developer) dashboard.
// Read-only business overview for the site owner: revenue, the agreed
// 10% monthly profit share, customers, orders and payment mix.
import { q } from '../lib.js';
import { page } from './layout.js';

const eur = (cents) => '€' + (Number(cents || 0) / 100).toFixed(2);
const SHARE_PCT = 10;

function monthKey(d) {
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
}

function devNav(ctx) {
  return `<div class="admin-nav">
    <a href="/developer" class="active">Owner dashboard</a>
    <a href="/admin">Store admin</a>
    <a href="/">View shop</a>
  </div>`;
}

export function dashboard(ctx, data) {
  const { totals, thisMonth, months, methods, recentOrders, recentUsers, counts } = data;
  const shareThisMonth = Math.round(thisMonth.revenue * SHARE_PCT / 100);
  const shareAll = Math.round(totals.revenue * SHARE_PCT / 100);

  const monthRows = months.map((m) => `
      <tr>
        <td>${m.month}</td>
        <td>${m.orders}</td>
        <td>${eur(m.revenue)}</td>
        <td><strong>${eur(Math.round(m.revenue * SHARE_PCT / 100))}</strong></td>
      </tr>`).join('');

  const methodRows = methods.map((m) => `
      <tr>
        <td>${String(m.payment_method || '—').replace(/_/g, ' ')}</td>
        <td>${m.n}</td>
        <td>${eur(m.revenue)}</td>
      </tr>`).join('');

  const orderRows = recentOrders.map((o) => `
      <tr>
        <td>${o.order_number}</td>
        <td>${o.ship_name || o.user_name || '—'}</td>
        <td>${eur(o.total_cents)}</td>
        <td>${String(o.payment_method || '').replace(/_/g, ' ')}</td>
        <td><span class="badge badge-${o.status}">${String(o.status).replace(/_/g, ' ')}</span></td>
      </tr>`).join('');

  const userRows = recentUsers.map((u) => `
      <tr>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${u.email_verified ? 'yes' : 'no'}</td>
        <td>${u.created_at}</td>
      </tr>`).join('');

  return page(ctx, `
<h1>Owner dashboard</h1>
<p class="muted">Read-only overview of everything happening on ${ctx.settings.store_name || 'the store'} — revenue, your ${SHARE_PCT}% monthly share, customers and orders.</p>

<div class="stat-grid">
  <div class="card stat"><span class="stat-num">${eur(totals.revenue)}</span><span class="muted">Revenue all time</span></div>
  <div class="card stat"><span class="stat-num">${eur(shareAll)}</span><span class="muted">Your ${SHARE_PCT}% share (all time)</span></div>
  <div class="card stat"><span class="stat-num">${eur(thisMonth.revenue)}</span><span class="muted">Revenue this month</span></div>
  <div class="card stat"><span class="stat-num" style="color:#c084fc">${eur(shareThisMonth)}</span><span class="muted">Your share this month</span></div>
</div>

<div class="stat-grid">
  <div class="card stat"><span class="stat-num">${counts.customers}</span><span class="muted">Customers</span></div>
  <div class="card stat"><span class="stat-num">${counts.newThisMonth}</span><span class="muted">New customers this month</span></div>
  <div class="card stat"><span class="stat-num">${counts.orders}</span><span class="muted">Orders</span></div>
  <div class="card stat"><span class="stat-num">${counts.pending}</span><span class="muted">Pending orders</span></div>
</div>

<div class="card">
  <h2>Monthly revenue &amp; your share</h2>
  <table class="table">
    <tr><th>Month</th><th>Orders</th><th>Revenue</th><th>Your ${SHARE_PCT}%</th></tr>
    ${monthRows || '<tr><td colspan="4" class="muted">No paid orders yet.</td></tr>'}
  </table>
  <p class="muted small">Your share is calculated as ${SHARE_PCT}% of revenue from paid/shipped orders in that month.</p>
</div>

<div class="card">
  <h2>Payments by method</h2>
  <table class="table">
    <tr><th>Method</th><th>Orders</th><th>Revenue</th></tr>
    ${methodRows || '<tr><td colspan="3" class="muted">No payments yet.</td></tr>'}
  </table>
</div>

<div class="card">
  <h2>Latest orders</h2>
  <table class="table">
    <tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th></tr>
    ${orderRows || '<tr><td colspan="5" class="muted">No orders yet.</td></tr>'}
  </table>
</div>

<div class="card">
  <h2>Newest customers</h2>
  <table class="table">
    <tr><th>Name</th><th>Email</th><th>Verified</th><th>Joined</th></tr>
    ${userRows || '<tr><td colspan="4" class="muted">No customers yet.</td></tr>'}
  </table>
</div>
`);
}
