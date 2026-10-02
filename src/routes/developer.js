// C Store — owner (developer) routes. Read-only business overview.
import { Hono } from 'hono';
import { q } from '../lib.js';
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

  return c.html(views.dashboard(c.get('ctx'), { totals, thisMonth, months, methods, recentOrders, recentUsers, counts }));
});

export default developer;
