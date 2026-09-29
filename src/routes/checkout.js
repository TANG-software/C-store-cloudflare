// C Store Workers — checkout + payment routes (all five methods).
import { Hono } from 'hono';
import { q, flash, makeOrderNumber } from '../lib.js';
import { availableMethods, METHOD_META, paypalCreateOrder, paypalCapture, coinbaseCreateCharge, nowpaymentsCreateInvoice, bitpayCreateInvoice, manualWallets } from '../payments.js';
import * as views from '../views/checkout.js';

const checkout = new Hono();

checkout.get('/checkout', async (c) => {
  const sess = c.get('session');
  if (!sess.uid) return c.redirect('/login?next=/checkout');
  const user = await q.first(c, 'SELECT * FROM users WHERE id = ?', sess.uid);
  if (!user) return c.redirect('/login');
  if (!user.email_verified) { await flash(c, 'error', 'Please verify your email address before placing an order — it only takes a minute.'); return c.redirect('/verify'); }
  const details = await c.get('helpers').cartDetails(c);
  if (!details.items.length) return c.redirect('/cart');

  const settings = c.get('ctx').settings;
  const avail = availableMethods(settings);
  const allMethods = Object.entries(METHOD_META).map(([id, m]) => ({ id, ...m, available: !!avail[id] }));
  // Per-product payment methods: every item in the cart must allow the method.
  let allowed = new Set(Object.keys(METHOD_META));
  for (const it of details.items) {
    const pm = String(it.product.payment_methods || '').trim();
    if (!pm) continue; // empty = all methods allowed for this product
    const set = new Set(pm.split(',').map((s) => s.trim()).filter(Boolean));
    allowed = new Set([...allowed].filter((m) => set.has(m)));
  }
  const methods = allMethods.filter((m) => m.available && allowed.has(m.id));
  const restricted = allowed.size < Object.keys(METHOD_META).length;
  if (!methods.some((m) => m.available)) {
    await flash(c, 'error', restricted ? 'No available payment method is allowed for the products in your cart — please remove them or contact us.' : 'No payment method is configured yet — please check back soon.');
    return c.redirect('/cart');
  }
  return c.html(views.checkout(c.get('ctx'), { user, details, methods, restricted }));
});

checkout.post('/checkout', async (c) => {
  const sess = c.get('session');
  if (!sess.uid) return c.redirect('/login?next=/checkout');
  const user = await q.first(c, 'SELECT * FROM users WHERE id = ?', sess.uid);
  if (!user || !user.email_verified) return c.redirect('/verify');
  const b = await c.req.parseBody();
  const method = String(b.payment_method || '');
  const settings = c.get('ctx').settings;
  const avail = availableMethods(settings);
  const details2 = await c.get('helpers').cartDetails(c);
  let allowed2 = new Set(Object.keys(METHOD_META));
  for (const it of details2.items) {
    const pm = String(it.product.payment_methods || '').trim();
    if (!pm) continue;
    const set = new Set(pm.split(',').map((s) => s.trim()).filter(Boolean));
    allowed2 = new Set([...allowed2].filter((m) => set.has(m)));
  }
  if (!avail[method] || !allowed2.has(method)) { await flash(c, 'error', 'That payment method is not available for the products in your cart.'); return c.redirect('/checkout'); }

  const details = details2;
  if (!details.items.length) return c.redirect('/cart');

  // stock check
  for (const it of details.items) {
    if (it.qty > it.product.stock) { await flash(c, 'error', `Only ${it.product.stock} × ${it.product.name} left in stock.`); return c.redirect('/cart'); }
  }
  const shipping = b.ship_country === 'NL'
    ? Number(settings.shipping_nl_cents)
    : Number(settings.shipping_eu_cents);
  const free = Number(settings.free_shipping_threshold_cents);
  const shippingCents = details.subtotal >= free ? 0 : shipping;

  const orderNumber = makeOrderNumber();
  const r = await q.run(c,
    `INSERT INTO orders(order_number, user_id, payment_method, subtotal_cents, shipping_cents, total_cents, ship_name, ship_email, ship_phone, ship_address, ship_city, ship_postal_code, ship_country)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    orderNumber, user.id, method, details.subtotal, shippingCents, details.subtotal + shippingCents,
    String(b.ship_name || ''), String(b.ship_email || user.email), String(b.ship_phone || user.phone),
    String(b.ship_address || ''), String(b.ship_city || ''), String(b.ship_postal_code || ''), String(b.ship_country || 'NL'));
  const orderId = r.meta?.last_row_id;
  for (const it of details.items) {
    await q.run(c, 'INSERT INTO order_items(order_id, product_id, name, price_cents, qty) VALUES (?, ?, ?, ?, ?)', orderId, it.product.id, it.product.name, it.product.price_cents, it.qty);
    await q.run(c, 'UPDATE products SET stock = stock - ? WHERE id = ?', it.qty, it.product.id);
  }
  const order = await q.first(c, 'SELECT * FROM orders WHERE id = ?', orderId);
  const baseUrl = c.get('helpers').baseUrl(c);

  try {
    if (method === 'paypal') {
      const pid = await paypalCreateOrder(settings, order);
      await q.run(c, 'UPDATE orders SET payment_ref = ? WHERE id = ?', pid, orderId);
      sess.cart = {}; await c.get('helpers').saveSession(c, sess);
      return c.redirect(`/pay/paypal/${orderId}`);
    }
    if (method === 'coinbase') {
      const ch = await coinbaseCreateCharge(settings, baseUrl, order);
      await q.run(c, 'UPDATE orders SET payment_ref = ? WHERE id = ?', ch.id, orderId);
      sess.cart = {}; await c.get('helpers').saveSession(c, sess);
      return c.redirect(ch.url);
    }
    if (method === 'nowpayments') {
      const inv = await nowpaymentsCreateInvoice(settings, baseUrl, order);
      await q.run(c, 'UPDATE orders SET payment_ref = ? WHERE id = ?', String(inv.id), orderId);
      sess.cart = {}; await c.get('helpers').saveSession(c, sess);
      return c.redirect(inv.url);
    }
    if (method === 'bitpay') {
      const inv = await bitpayCreateInvoice(settings, baseUrl, order);
      await q.run(c, 'UPDATE orders SET payment_ref = ? WHERE id = ?', String(inv.id), orderId);
      sess.cart = {}; await c.get('helpers').saveSession(c, sess);
      return c.redirect(inv.url);
    }
    if (method === 'manual_crypto') {
      await q.run(c, "UPDATE orders SET status = 'awaiting_confirmation' WHERE id = ?", orderId);
      sess.cart = {}; await c.get('helpers').saveSession(c, sess);
      await flash(c, 'success', 'Order placed — send the crypto payment to complete it.');
      return c.redirect(`/pay/manual_crypto/${orderId}`);
    }
  } catch (e) {
    console.error('payment create failed', e && e.message);
    await flash(c, 'error', 'Could not start the payment — please try again.');
    return c.redirect('/checkout');
  }
});

checkout.get('/pay/paypal/:id', async (c) => {
  const order = await c.get('helpers').ownOrder(c, Number(c.req.param('id')));
  if (!order) return c.notFound();
  const settings = c.get('ctx').settings;
  return c.html(views.payPaypal(c.get('ctx'), { order, clientId: settings.paypal_client_id }));
});

checkout.post('/pay/api/paypal/create', async (c) => {
  const body = await c.req.json();
  const order = await c.get('helpers').ownOrder(c, Number(body.orderId));
  if (!order) return c.json({ error: 'order not found' }, 404);
  try {
    const id = await paypalCreateOrder(c.get('ctx').settings, order);
    return c.json({ id });
  } catch (e) { return c.json({ error: e.message }, 400); }
});

checkout.post('/pay/api/paypal/capture', async (c) => {
  const body = await c.req.json();
  const order = await c.get('helpers').ownOrder(c, Number(body.orderId));
  if (!order) return c.json({ error: 'order not found' }, 404);
  const r = await paypalCapture(c.get('ctx').settings, body.paypalOrderId);
  if (r.ok) {
    await q.run(c, "UPDATE orders SET status = 'paid', payment_ref = ? WHERE id = ?", r.ref, order.id);
    await q.run(c, "INSERT INTO payments(order_id, provider, status, ext_id) VALUES (?, 'paypal', 'completed', ?)", order.id, r.ref);
    await c.get('helpers').sendOrderMail(c, order, 'paid');
    return c.json({ redirect: `/order/${order.id}` });
  }
  return c.json({ error: r.error || 'capture failed' }, 400);
});

checkout.get('/pay/manual_crypto/:id', async (c) => {
  const order = await c.get('helpers').ownOrder(c, Number(c.req.param('id')));
  if (!order) return c.notFound();
  const wallets = manualWallets(c.get('ctx').settings);
  return c.html(views.payManual(c.get('ctx'), { order, wallets }));
});

checkout.post('/pay/manual_crypto/:id', async (c) => {
  const order = await c.get('helpers').ownOrder(c, Number(c.req.param('id')));
  if (!order) return c.notFound();
  const b = await c.req.parseBody();
  const txid = String(b.txid || '').trim();
  if (txid.length < 10) { await flash(c, 'error', 'That transaction ID looks too short.'); return c.redirect(`/pay/manual_crypto/${order.id}`); }
  await q.run(c, "UPDATE orders SET txid = ?, status = 'awaiting_confirmation' WHERE id = ?", txid, order.id);
  await flash(c, 'success', 'Thanks! We will verify your transaction and confirm your order shortly.');
  return c.redirect(`/order/${order.id}`);
});

export default checkout;
