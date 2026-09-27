// C Store Workers — payment provider webhooks (Coinbase, NOWPayments, BitPay).
import { Hono } from 'hono';
import { q } from '../lib.js';
import { coinbaseVerifyWebhook, nowpaymentsVerifyIpn, bitpayVerifyWebhook } from '../payments.js';

const webhooks = new Hono();

async function markPaid(c, orderId, provider, extId, raw) {
  const order = await q.first(c, 'SELECT * FROM orders WHERE id = ?', Number(orderId));
  if (!order || order.status === 'paid' || order.status === 'shipped') return;
  await q.run(c, "UPDATE orders SET status = 'paid' WHERE id = ?", order.id);
  await q.run(c, "INSERT INTO payments(order_id, provider, status, ext_id, raw) VALUES (?, ?, 'completed', ?, ?)", order.id, provider, String(extId || ''), raw ? JSON.stringify(raw).slice(0, 2000) : null);
  await c.get('helpers').sendOrderMail(c, order, 'paid');
}

webhooks.post('/webhooks/coinbase', async (c) => {
  const raw = await c.req.text();
  const signature = c.req.header('X-CC-Webhook-Signature') || '';
  const settings = c.get('ctx').settings;
  if (!(await coinbaseVerifyWebhook(settings, raw, signature))) return c.json({ error: 'bad signature' }, 401);
  try {
    const event = JSON.parse(raw);
    if (event.event?.type === 'charge:confirmed' || event.event?.type === 'charge:resolved') {
      const orderId = event.event?.data?.metadata?.order_id || event.data?.metadata?.order_id;
      if (orderId) await markPaid(c, orderId, 'coinbase', event.event?.data?.id || event.data?.id, event);
    }
  } catch (e) { console.error('coinbase webhook', e && e.message); }
  return c.json({ ok: true });
});

webhooks.post('/webhooks/nowpayments', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: 'bad json' }, 400);
  const settings = c.get('ctx').settings;
  if (!(await nowpaymentsVerifyIpn(settings, body))) return c.json({ error: 'bad signature' }, 401);
  if (body.payment_status === 'finished' || body.payment_status === 'confirmed') {
    if (body.order_id) await markPaid(c, body.order_id, 'nowpayments', body.payment_id, body);
  }
  return c.json({ ok: true });
});

webhooks.post('/webhooks/bitpay', async (c) => {
  const raw = await c.req.text();
  const signature = c.req.header('X-Signature') || '';
  const settings = c.get('ctx').settings;
  if (!(await bitpayVerifyWebhook(settings, raw, signature))) return c.json({ error: 'bad signature' }, 401);
  try {
    const event = JSON.parse(raw);
    if (event.event === 'invoice_completed' || event.data?.status === 'completed') {
      const orderId = event.data?.orderId;
      if (orderId) await markPaid(c, orderId, 'bitpay', event.data?.id, event);
    }
  } catch (e) { console.error('bitpay webhook', e && e.message); }
  return c.json({ ok: true });
});

export default webhooks;
