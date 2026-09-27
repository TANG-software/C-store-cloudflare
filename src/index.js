// C Store Workers — app entry. Cloudflare Workers + D1, Hono router.
// Serves the storefront, admin panel, payment flows and webhooks.
import { Hono } from 'hono';
import { getSettings, readSigned, takeFlash, q, eur } from './lib.js';
import { ensureDb } from './bootstrap.js';
import { sendMail, sendSms } from './notify.js';
import { issueCode } from './otp.js';
import shop from './routes/shop.js';
import auth from './routes/auth.js';
import checkout from './routes/checkout.js';
import admin from './routes/admin.js';
import webhooks from './routes/webhooks.js';
import { notFound, serverError } from './views/auth.js';

const app = new Hono();

// Per-request context: settings, session (user + cart), user, flash.
app.use('*', async (c, next) => {
  const session = (await readSigned(c, 'cstore_session')) || {};
  if (typeof session.cart !== 'object' || !session.cart) session.cart = {};
  await ensureDb(c);
  const settings = await getSettings(c);
  const user = session.uid ? await q.first(c, 'SELECT * FROM users WHERE id = ?', session.uid) : null;
  const cartCount = Object.values(session.cart).reduce((a, b) => a + Number(b), 0);
  const flash = await takeFlash(c);
  c.set('session', session);
  c.set('ctx', { user, settings, flash, cartCount, path: new URL(c.req.url).pathname, q: c.req.query('q') || '' });
  c.set('helpers', makeHelpers());
  await next();
});

function makeHelpers() {
  return {
    baseUrl: (c) => {
      const s = c.get('ctx').settings;
      return (s && s.public_base_url) || new URL(c.req.url).origin;
    },
    saveSession: async (c, sess) => {
      const { writeSigned } = await import('./lib.js');
      await writeSigned(c, 'cstore_session', sess);
    },
    cartDetails: async (c) => {
      const sess = c.get('session');
      const ids = Object.keys(sess.cart);
      if (!ids.length) return { items: [], subtotal: 0 };
      const products = await q.all(c, `SELECT * FROM products WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids);
      const items = products.map((p) => ({ product: p, qty: Number(sess.cart[p.id]) || 0, line_total: p.price_cents * (Number(sess.cart[p.id]) || 0) })).filter((x) => x.qty > 0);
      return { items, subtotal: items.reduce((a, x) => a + x.line_total, 0) };
    },
    ownOrder: async (c, id) => {
      const sess = c.get('session');
      if (!sess.uid) return null;
      return q.first(c, 'SELECT * FROM orders WHERE id = ? AND user_id = ?', id, sess.uid);
    },
    sendOtps: async (c, userId) => {
      const settings = c.get('ctx').settings;
      const user = await q.first(c, 'SELECT email, phone FROM users WHERE id = ?', userId);
      const msg = (code) => `Your C Store verification code is ${code}. It expires in 10 minutes.`;
      const email = await issueCode(c, userId, 'email');
      if (email.sent) await sendMail(c, settings, user.email, 'Your C Store verification code', msg(email.code));
      const phone = await issueCode(c, userId, 'phone');
      if (phone.sent) await sendSms(c, settings, user.phone, msg(phone.code));
    },
    sendOrderMail: async (c, order, status) => {
      const settings = c.get('ctx').settings;
      const map = {
        paid: [`Payment received — order ${order.order_number}`, `Thank you! We received your payment for order ${order.order_number} (total ${eur(order.total_cents)}). We'll ship it shortly.`],
        awaiting_confirmation: [`Order ${order.order_number} received`, `We received your order ${order.order_number} (total ${eur(order.total_cents)}). It will be confirmed once your payment is verified.`],
      };
      const m = map[status];
      if (m) await sendMail(c, settings, order.ship_email, m[0], m[1]);
    },
  };
}

// Forced password change guard: everything except the change-password flow redirects there.
app.use('*', async (c, next) => {
  const user = c.get('ctx')?.user;
  const path = new URL(c.req.url).pathname;
  if (user && user.force_password_change && !['/change-password', '/logout'].includes(path)) {
    return c.redirect('/change-password?forced=1');
  }
  await next();
});

app.route('/', shop);
app.route('/', auth);
app.route('/', checkout);
app.route('/', webhooks);
app.route('/admin', admin);

app.notFound((c) => c.html(notFound(c.get('ctx') || { user: null, settings: { store_name: 'C Store' }, flash: [], cartCount: 0, path: '/404' }), 404));

app.onError((err, c) => {
  console.error('[error]', err && err.stack || err);
  return c.html(serverError(c.get('ctx') || { user: null, settings: { store_name: 'C Store' }, flash: [], cartCount: 0, path: '/500' }), 500);
});

export default app;
