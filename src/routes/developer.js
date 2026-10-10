// C Store — owner (developer) routes. Read-only business overview.
import { Hono } from 'hono';
import { q, setSetting } from '../lib.js';
import * as views from '../views/developer.js';

const developer = new Hono();

// Only the owner account (role 'developer') can open this.
developer.use('*', async (c, next) => {
  const sess = c.get('session');
  const user = sess.uid ? await q.first(c, 'SELECT * FROM users WHERE id = ?', sess.uid) : null;
  if (!user || user.role !== 'developer') return c.redirect('/login?next=/developer');
  c.set('devUser', user);
  await next();
});

// Owner-only switch for showing ads on the shop (kept off the client's admin).
developer.post('/settings', async (c) => {
  const body = await c.req.parseBody();
  for (const k of ['ads_enabled', 'ad_native', 'ad_socialbar', 'ad_popunder', 'ad_strip', 'require_email_verification']) {
    await setSetting(c, k, String(body[k] || '').trim() === '1' ? '1' : '0');
  }
  return c.redirect('/developer');
});

developer.get('/', async (c) => {
  const monthStart = new Date().toISOString().slice(0, 7) + '-01';

  const paidStatuses = "status IN ('paid', 'shipped')";

  const totals = {
    revenue: (await q.first(c, `SELECT COALESCE(SUM(total_cents), 0) n FROM orders WHERE ${paidStatuses}`)).n,
  };
  const thisMonth = {
    revenue: (await q.first(c, `SELECT COALESCE(SUM(total_cents), 0) n FROM orders WHERE ${paidStatuses} AND created_at >= ?`, monthStart)).n,
  };

  const months = await q.all(c, `
    SELECT substr(created_at, 1, 7) AS month,
           COUNT(*) AS orders,
           COALESCE(SUM(total_cents), 0) AS revenue
    FROM orders
    WHERE ${paidStatuses}
    GROUP BY month
    ORDER BY month DESC
    LIMIT 6`);

  const methods = await q.all(c, `
    SELECT payment_method, COUNT(*) AS n, COALESCE(SUM(total_cents), 0) AS revenue
    FROM orders
    WHERE ${paidStatuses}
    GROUP BY payment_method
    ORDER BY revenue DESC`);

  const recentOrders = await q.all(c, `
    SELECT o.*, u.name AS user_name FROM orders o LEFT JOIN users u ON u.id = o.user_id
    ORDER BY o.id DESC LIMIT 12`);

  const recentUsers = await q.all(c, `
    SELECT * FROM users WHERE role = 'customer' ORDER BY id DESC LIMIT 12`);

  const counts = {
    customers: (await q.first(c, "SELECT COUNT(*) n FROM users WHERE role = 'customer'")).n,
    newThisMonth: (await q.first(c, "SELECT COUNT(*) n FROM users WHERE role = 'customer' AND created_at >= ?", monthStart)).n,
    orders: (await q.first(c, 'SELECT COUNT(*) n FROM orders')).n,
    pending: (await q.first(c, "SELECT COUNT(*) n FROM orders WHERE status = 'pending'")).n,
  };

  const salesByProduct = await q.all(c, `
    SELECT oi.name, SUM(oi.qty) AS qty, COALESCE(SUM(oi.qty * oi.price_cents), 0) AS revenue
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE o.status IN ('paid', 'shipped')
    GROUP BY oi.name ORDER BY revenue DESC LIMIT 20`);

  const allOrders = await q.all(c, `
    SELECT o.*, u.name AS user_name FROM orders o LEFT JOIN users u ON u.id = o.user_id
    ORDER BY o.id DESC LIMIT 100`);

  const allUsers = await q.all(c, `
    SELECT * FROM users WHERE role = 'customer' ORDER BY id DESC LIMIT 100`);

  const allAccounts = await q.all(c, `
    SELECT id, name, email, phone, role, email_verified, created_at FROM users
    ORDER BY (CASE role WHEN 'developer' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END), id`);

  const lowStock = await q.all(c, `
    SELECT name, stock FROM products WHERE active = 1 AND stock <= 5 ORDER BY stock ASC LIMIT 20`);

  const pendingValue = (await q.first(c, "SELECT COALESCE(SUM(total_cents), 0) n FROM orders WHERE status = 'pending'")).n;
  const avgOrder = (await q.first(c, `SELECT COALESCE(AVG(total_cents), 0) n FROM orders WHERE ${paidStatuses}`)).n;

  const adsOn = String((await q.first(c, "SELECT value FROM settings WHERE key = 'ads_enabled'"))?.value || '').trim() === '1';
  const getVal = async (k) => { const r = await q.first(c, 'SELECT value FROM settings WHERE key = ?', k); return String((r && r.value) || '').trim(); };
  const setup = {
    verifyOn: (await getVal('require_email_verification')) !== '0',
    emailKey: !!(await getVal('email_api_key')),
    wallets: !!(await getVal('wallet_btc')) || !!(await getVal('wallet_eth')) || !!(await getVal('wallet_usdt_trc20')),
    paypal: !!(await getVal('paypal_client_id')) && !!(await getVal('paypal_secret')),
    products: (await q.first(c, 'SELECT COUNT(*) n FROM products WHERE active = 1')).n,
  };
  const adFlags = {};
  for (const k of ['ad_native', 'ad_socialbar', 'ad_popunder', 'ad_strip']) {
    const row = await q.first(c, 'SELECT value FROM settings WHERE key = ?', k);
    adFlags[k] = String((row && row.value) == null ? '' : row.value).trim() !== '0';
  }

  return c.html(views.dashboard(c.get('ctx'), { totals, thisMonth, months, methods, recentOrders, recentUsers, counts,
    salesByProduct, allOrders, allUsers, lowStock, pendingValue, avgOrder, adsOn, adFlags, allAccounts, setup }));
});

export default developer;
