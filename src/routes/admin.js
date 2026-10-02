import { DEMO_CATALOG_SQL } from '../bootstrap.js';
// C Store Workers — admin panel routes: dashboard, products, categories,
// orders, users, payments credentials, settings.
import { Hono } from 'hono';
import { q, flash, setSetting, slugify } from '../lib.js';
import { availableMethods } from '../payments.js';
import { mailConfigured, smsConfigured } from '../notify.js';
import { FEATURE_ICONS } from '../views/shop.js';
import * as views from '../views/admin.js';

const admin = new Hono();
admin.post('/products/demo', async (c) => {
  const orders = await q.first(c, 'SELECT COUNT(*) AS n FROM orders');
  if (orders.n > 0) {
    await flash(c, 'error', 'There are real orders in the database — demo products were NOT loaded, so no order data gets broken.');
    return c.redirect('/admin/products');
  }
  await c.env.DB.prepare('DELETE FROM products').run();
  await c.env.DB.prepare('DELETE FROM categories').run();
  const { statements } = await import('../bootstrap.js');
  for (const s of statements(DEMO_CATALOG_SQL)) await c.env.DB.prepare(s).run();
  await flash(c, 'success', 'Demo catalog loaded — 12 products in 4 categories.');
  return c.redirect('/admin/products');
});

export default admin;

// Credential sections editable from Admin → Payments (stored in D1 settings).
const PAYMENT_SECTIONS = {
  paypal: ['paypal_client_id', 'paypal_secret', 'paypal_env'],
  coinbase: ['coinbase_api_key', 'coinbase_webhook_secret'],
  nowpayments: ['nowpayments_api_key', 'nowpayments_ipn_secret'],
  bitpay: ['bitpay_token', 'bitpay_private_key', 'bitpay_webhook_secret'],
  email: ['email_api_key', 'email_from'],
  sms: ['twilio_sid', 'twilio_from', 'twilio_token'],
};

admin.use('*', async (c, next) => {
  const sess = c.get('session');
  const user = sess.uid ? await q.first(c, 'SELECT * FROM users WHERE id = ?', sess.uid) : null;
  if (!user || (user.role !== 'admin' && user.role !== 'developer') || user.force_password_change) return c.redirect('/login?next=/admin');
  await next();
});

admin.get('/', async (c) => {
  const stats = {
    orders: await q.first(c, 'SELECT COUNT(*) n FROM orders').then((r) => r.n),
    revenue: await q.first(c, "SELECT COALESCE(SUM(total_cents), 0) n FROM orders WHERE status IN ('paid', 'shipped')").then((r) => r.n),
    products: await q.first(c, 'SELECT COUNT(*) n FROM products WHERE active = 1').then((r) => r.n),
    customers: await q.first(c, "SELECT COUNT(*) n FROM users WHERE role = 'customer'").then((r) => r.n),
    pendingVerification: await q.first(c, "SELECT COUNT(*) n FROM users WHERE role = 'customer' AND email_verified = 0").then((r) => r.n),
  };
  const recentOrders = await q.all(c, `SELECT o.*, u.name AS user_name FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.id DESC LIMIT 10`);
  return c.html(views.dashboard(c.get('ctx'), { stats, recentOrders }));
});

// ---------- products ----------
admin.get('/products', async (c) => {
  const products = await q.all(c, `SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id ORDER BY p.id DESC`);
  return c.html(views.products(c.get('ctx'), { products }));
});

admin.get('/products/new', async (c) => {
  const categories = await q.all(c, 'SELECT * FROM categories ORDER BY id');
  return c.html(views.productForm(c.get('ctx'), { p: null, categories }));
});

admin.get('/products/:id/edit', async (c) => {
  const p = await q.first(c, 'SELECT * FROM products WHERE id = ?', Number(c.req.param('id')));
  if (!p) return c.notFound();
  const categories = await q.all(c, 'SELECT * FROM categories ORDER BY id');
  return c.html(views.productForm(c.get('ctx'), { p, categories }));
});

admin.post('/products/save', async (c) => {
  const b = await c.req.parseBody();
  const price = Math.round(Number(String(b.price_eur || '0').replace(',', '.')) * 100);
  const slug = slugify(b.name);
  const paymentMethods = [].concat(b.payment_methods || []).join(',');
  if (b.id) {
    await q.run(c, `UPDATE products SET category_id = ?, name = ?, slug = ?, description = ?, price_cents = ?, stock = ?, image_url = ?, active = ?, payment_methods = ? WHERE id = ?`,
      Number(b.category_id), String(b.name), slug, String(b.description || ''), price, Number(b.stock) || 0, String(b.image_url || ''), b.active === '1' ? 1 : 0, paymentMethods, Number(b.id));
    await flash(c, 'success', 'Product updated.');
  } else {
    await q.run(c, `INSERT INTO products(category_id, name, slug, description, price_cents, stock, image_url, active, payment_methods) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      Number(b.category_id), String(b.name), slug + '-' + Date.now().toString(36).slice(-4), String(b.description || ''), price, Number(b.stock) || 0, String(b.image_url || ''), b.active === '1' ? 1 : 0, paymentMethods);
    await flash(c, 'success', 'Product created.');
  }
  return c.redirect('/admin/products');
});

admin.post('/products/:id/delete', async (c) => {
  await q.run(c, 'DELETE FROM products WHERE id = ?', Number(c.req.param('id')));
  await flash(c, 'success', 'Product deleted.');
  return c.redirect('/admin/products');
});

// ---------- categories ----------
admin.get('/categories', async (c) => {
  const categories = await q.all(c, 'SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count FROM categories c ORDER BY c.id');
  return c.html(views.categories(c.get('ctx'), { categories }));
});

admin.post('/categories/save', async (c) => {
  const b = await c.req.parseBody();
  if (String(b.name || '').trim()) {
    await q.run(c, 'INSERT INTO categories(name, slug) VALUES (?, ?)', String(b.name).trim(), slugify(b.name) + '-' + Date.now().toString(36).slice(-3));
    await flash(c, 'success', 'Category added.');
  }
  return c.redirect('/admin/categories');
});

admin.post('/categories/:id/delete', async (c) => {
  await q.run(c, 'DELETE FROM categories WHERE id = ?', Number(c.req.param('id')));
  await flash(c, 'success', 'Category deleted.');
  return c.redirect('/admin/categories');
});

// ---------- orders ----------
admin.get('/orders', async (c) => {
  const orders = await q.all(c, `SELECT o.*, u.name AS user_name FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.id DESC`);
  return c.html(views.orders(c.get('ctx'), { orders }));
});

admin.get('/orders/:id', async (c) => {
  const order = await q.first(c, `SELECT o.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?`, Number(c.req.param('id')));
  if (!order) return c.notFound();
  const items = await q.all(c, 'SELECT * FROM order_items WHERE order_id = ?', order.id);
  const payments = await q.all(c, 'SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC', order.id);
  return c.html(views.orderDetail(c.get('ctx'), { order, items, payments }));
});

admin.post('/orders/:id/status', async (c) => {
  const b = await c.req.parseBody();
  const allowed = ['pending', 'awaiting_confirmation', 'paid', 'shipped', 'cancelled'];
  if (allowed.includes(String(b.status))) {
    await q.run(c, 'UPDATE orders SET status = ? WHERE id = ?', String(b.status), Number(c.req.param('id')));
    await flash(c, 'success', 'Order status updated.');
  }
  return c.redirect(`/admin/orders/${c.req.param('id')}`);
});

// ---------- users ----------
admin.get('/users', async (c) => {
  const users = await q.all(c, 'SELECT u.*, (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count FROM users u ORDER BY u.id');
  return c.html(views.users(c.get('ctx'), { users, me: c.get('ctx').user }));
});

admin.post('/users/:id/verify', async (c) => {
  const b = await c.req.parseBody();
  const ch = b.channel === 'phone' ? 'phone' : 'email';
  await q.run(c, ch === 'email' ? 'UPDATE users SET email_verified = 1 WHERE id = ?' : 'UPDATE users SET phone_verified = 1 WHERE id = ?', Number(c.req.param('id')));
  await flash(c, 'success', 'User marked as verified.');
  return c.redirect('/admin/users');
});

admin.post('/users/:id/role', async (c) => {
  const b = await c.req.parseBody();
  if (['admin', 'customer'].includes(String(b.role))) {
    await q.run(c, 'UPDATE users SET role = ? WHERE id = ?', String(b.role), Number(c.req.param('id')));
    await flash(c, 'success', 'Role updated.');
  }
  return c.redirect('/admin/users');
});

// ---------- payments credentials ----------
admin.get('/payments', async (c) => {
  const settings = c.get('ctx').settings;
  const avail = availableMethods(settings);
  const status = {
    paypal: avail.paypal, coinbase: avail.coinbase, nowpayments: avail.nowpayments, bitpay: avail.bitpay,
    email: mailConfigured(settings), sms: smsConfigured(settings),
  };
  return c.html(views.payments(c.get('ctx'), { settings, status, baseUrl: c.get('helpers').baseUrl(c) }));
});

admin.post('/payments', async (c) => {
  const b = await c.req.parseBody();
  const section = PAYMENT_SECTIONS[b.section];
  if (!section) return c.redirect('/admin/payments');
  for (const key of section) {
    if (key in b) await setSetting(c, key, String(b[key] ?? '').trim());
  }
  await flash(c, 'success', 'Saved — the new settings are active immediately.');
  return c.redirect('/admin/payments');
});

// ---------- homepage cards (features / reviews / payment tiles) ----------
admin.get('/homepage', async (c) => {
  const cards = await q.all(c, 'SELECT * FROM homepage_cards ORDER BY section, sort, id');
  return c.html(views.homepage(c.get('ctx'), { cards }));
});

admin.post('/homepage/save', async (c) => {
  const b = await c.req.parseBody();
  const section = ['feature', 'review', 'pay'].includes(String(b.section)) ? String(b.section) : null;
  if (!section) return c.redirect('/admin/homepage');
  const id = b.id ? Number(b.id) : null;
  const title = String(b.title || '').trim();
  const body = String(b.body || '').trim();
  if (!title) {
    await flash(c, 'error', 'A card needs at least a title.');
    return c.redirect('/admin/homepage');
  }
  let stars = 5;
  let when = '';
  let icon = '';
  if (section === 'review') {
    stars = Math.min(Math.max(Number(b.stars) || 5, 1), 5);
    when = String(b.when_label || '').trim();
  } else if (section === 'feature') {
    icon = Object.keys(FEATURE_ICONS).includes(String(b.icon)) ? String(b.icon) : 'bolt';
  }
  if (id) {
    const existing = await q.first(c, 'SELECT section FROM homepage_cards WHERE id = ?', id);
    if (existing && existing.section === section) {
      await q.run(c, 'UPDATE homepage_cards SET title = ?, body = ?, stars = ?, when_label = ?, icon = ? WHERE id = ?',
        title, body, stars, when, icon, id);
      await flash(c, 'success', 'Card updated.');
    }
  } else {
    const next = await q.first(c, 'SELECT COALESCE(MAX(sort), 0) + 1 AS n FROM homepage_cards WHERE section = ?', section);
    await q.run(c, 'INSERT INTO homepage_cards(section, sort, title, body, stars, when_label, icon) VALUES (?, ?, ?, ?, ?, ?, ?)',
      section, next.n, title, body, stars, when, icon);
    await flash(c, 'success', 'Card added.');
  }
  return c.redirect('/admin/homepage');
});

admin.post('/homepage/:id/delete', async (c) => {
  await q.run(c, 'DELETE FROM homepage_cards WHERE id = ?', Number(c.req.param('id')));
  await flash(c, 'success', 'Card removed from the homepage.');
  return c.redirect('/admin/homepage');
});

// ---------- settings ----------
admin.get('/settings', async (c) => {
  const s = c.get('ctx').settings;
  return c.html(views.settings(c.get('ctx'), { s, baseUrl: c.get('helpers').baseUrl(c) }));
});

admin.post('/settings', async (c) => {
  const b = await c.req.parseBody();
  const euros = { shipping_nl_eur: 'shipping_nl_cents', shipping_eu_eur: 'shipping_eu_cents', free_shipping_eur: 'free_shipping_threshold_cents' };
  for (const [form, key] of Object.entries(euros)) {
    if (form in b) await setSetting(c, key, String(Math.round(Number(String(b[form] || '0').replace(',', '.')) * 100)));
  }
  for (const key of ['store_name', 'store_tagline', 'support_email', 'support_phone', 'store_address', 'public_base_url', 'wallet_btc', 'wallet_eth', 'wallet_usdt_trc20', 'hero_headline', 'hero_badges', 'about_text', 'discord_url', 'telegram_url', 'top_bar_text', 'hero_overline', 'hero_cta', 'stats_heading', 'stats_text', 'stat_orders_label', 'stat_customers_label', 'stat_products_label', 'about_heading', 'categories_heading', 'featured_heading', 'newest_heading', 'reviews_heading', 'payments_heading', 'related_heading', 'faq_heading', 'faqs', 'ads_enabled']) {
    if (key in b) await setSetting(c, key, String(b[key] ?? '').trim());
  }
  await flash(c, 'success', 'Settings saved.');
  return c.redirect('/admin/settings');
});
