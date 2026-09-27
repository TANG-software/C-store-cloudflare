// C Store Workers — auth + account routes: register, login, OTP verify,
// change password, profile, order history, order status page.
import { Hono } from 'hono';
import { q, flash, hashPassword, verifyPassword, normalizePhone, validEmail, writeSigned, clearSigned, readSigned } from '../lib.js';
import { issueCode, verifyCode } from '../otp.js';
import { sendMail, sendSms, mailConfigured, smsConfigured } from '../notify.js';
import * as views from '../views/auth.js';

const auth = new Hono();

const OTP_MSG = (code) => `Your C Store verification code is ${code}. It expires in 10 minutes.`;

auth.get('/register', (c) => c.html(views.register(c.get('ctx'))));
auth.post('/register', async (c) => {
  const b = await c.req.parseBody();
  const name = String(b.name || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const phone = normalizePhone(b.phone);
  const password = String(b.password || '');

  if (!name || !validEmail(email) || !phone || password.length < 8) {
    return c.html(views.register(c.get('ctx'), b), 400);
  }
  if (password !== b.confirm) { await flash(c, 'error', 'Passwords do not match.'); return c.redirect('/register'); }
  if (await q.first(c, 'SELECT id FROM users WHERE email = ?', email)) { await flash(c, 'error', 'An account with this email already exists.'); return c.redirect('/register'); }
  if (await q.first(c, 'SELECT id FROM users WHERE phone = ?', phone)) { await flash(c, 'error', 'An account with this mobile number already exists.'); return c.redirect('/register'); }

  const r = await q.run(c, 'INSERT INTO users(name, email, phone, password_hash) VALUES (?, ?, ?, ?)', name, email, phone, await hashPassword(password));
  const sess = { uid: r.meta?.last_row_id, cart: {} };
  await writeSigned(c, 'cstore_session', sess);
  await c.get('helpers').sendOtps(c, sess.uid);
  return c.redirect('/verify');
});

auth.get('/login', (c) => c.html(views.login(c.get('ctx'), c.req.query('next'))));
auth.post('/login', async (c) => {
  const b = await c.req.parseBody();
  const email = String(b.email || '').trim().toLowerCase();
  const user = await q.first(c, 'SELECT * FROM users WHERE email = ?', email);
  if (!user || !(await verifyPassword(String(b.password || ''), user.password_hash))) {
    return c.html(views.login(c.get('ctx'), b.next, email, 'Invalid email or password — please check both and try again.'), 401);
  }
  const sess = await readSigned(c, 'cstore_session');
  await writeSigned(c, 'cstore_session', { uid: user.id, cart: sess?.cart || {} });
  if (user.force_password_change) return c.redirect('/change-password?forced=1');
  return c.redirect(b.next || '/account');
});

auth.post('/logout', async (c) => {
  const sess = await readSigned(c, 'cstore_session');
  await writeSigned(c, 'cstore_session', { cart: sess?.cart || {} });
  return c.redirect('/');
});

auth.get('/verify', async (c) => {
  const user = await q.first(c, 'SELECT * FROM users WHERE id = ?', c.get('session').uid);
  if (!user) return c.redirect('/login');
  const settings = c.get('ctx').settings;
  return c.html(views.verify(c.get('ctx'), {
    user,
    required: !user.email_verified || !user.phone_verified,
    showOtpDev: !mailConfigured(settings) || !smsConfigured(settings),
  }));
});

auth.post('/verify/:channel/resend', async (c) => {
  const sess = c.get('session');
  if (!sess.uid) return c.redirect('/login');
  const r = await issueCode(c, sess.uid, c.req.param('channel'));
  if (r.sent) {
    const settings = c.get('ctx').settings);
    const user = await q.first(c, 'SELECT email, phone FROM users WHERE id = ?', sess.uid);
    if (c.req.param('channel') === 'email') await sendMail(c, settings, user.email, 'Your C Store verification code', OTP_MSG(r.code));
    else await sendSms(c, settings, user.phone, OTP_MSG(r.code));
    await flash(c, 'success', 'A new code has been sent.');
  } else {
    await flash(c, 'error', r.reason);
  }
  return c.redirect('/verify');
});

auth.post('/verify/:channel', async (c) => {
  const sess = c.get('session');
  if (!sess.uid) return c.redirect('/login');
  const channel = c.req.param('channel');
  const b = await c.req.parseBody();
  const r = await verifyCode(c, sess.uid, channel, b.code);
  if (!r.ok) { await flash(c, 'error', r.reason); return c.redirect('/verify'); }
  await q.run(c, channel === 'email' ? 'UPDATE users SET email_verified = 1 WHERE id = ?' : 'UPDATE users SET phone_verified = 1 WHERE id = ?', sess.uid);
  await flash(c, 'success', channel === 'email' ? 'Your email address is now verified.' : 'Your mobile number is now verified.');
  return c.redirect('/verify');
});

auth.get('/change-password', (c) => c.html(views.changePassword(c.get('ctx'), c.req.query('forced') === '1')));
auth.post('/change-password', async (c) => {
  const sess = c.get('session');
  if (!sess.uid) return c.redirect('/login');
  const b = await c.req.parseBody();
  const user = await q.first(c, 'SELECT * FROM users WHERE id = ?', sess.uid);
  if (!user || !(await verifyPassword(String(b.current || ''), user.password_hash)) || String(b.password || '').length < 8 || b.password !== b.confirm) {
    await flash(c, 'error', 'Password change failed — check your current password and make sure the new one matches.');
    return c.redirect('/change-password');
  }
  await q.run(c, 'UPDATE users SET password_hash = ?, force_password_change = 0 WHERE id = ?', await hashPassword(String(b.password)), sess.uid);
  await flash(c, 'success', 'Password changed.');
  return c.redirect(user.role === 'admin' ? '/admin' : '/account');
});

auth.get('/account', async (c) => {
  const user = await q.first(c, 'SELECT * FROM users WHERE id = ?', c.get('session').uid);
  if (!user) return c.redirect('/login');
  const orders = await q.all(c, 'SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC', user.id);
  return c.html(views.account(c.get('ctx'), { user, orders }));
});

auth.post('/account/profile', async (c) => {
  const sess = c.get('session');
  const b = await c.req.parseBody();
  const name = String(b.name || '').trim();
  const phone = normalizePhone(b.phone);
  if (!name || !phone) { await flash(c, 'error', 'Invalid name or phone number.'); return c.redirect('/account'); }
  await q.run(c, 'UPDATE users SET name = ?, phone = ?, phone_verified = 0 WHERE id = ?', name, phone, sess.uid);
  await flash(c, 'success', 'Profile updated — please re-verify your mobile number.');
  return c.redirect('/verify');
});

auth.get('/order/:id', async (c) => {
  const sess = c.get('session');
  if (!sess.uid) return c.redirect('/login');
  const order = await q.first(c, 'SELECT * FROM orders WHERE id = ? AND user_id = ?', Number(c.req.param('id')), sess.uid);
  if (!order) return c.notFound();
  const items = await q.all(c, 'SELECT * FROM order_items WHERE order_id = ?', order.id);
  const { orderStatus } = await import('../views/checkout.js');
  return c.html(orderStatus(c.get('ctx'), { order, items }));
});

export default auth;
