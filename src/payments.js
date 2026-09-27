// C Store Workers — payment providers (all fetch-based).
// Credentials come from the D1 settings table (Admin → Payments) with no .env needed.
import elliptic from 'elliptic';
import qr from 'qrcode-generator';
import { cfg, hmacHex, timingSafeEqual } from './lib.js';

// ---------------- PayPal (Orders v2) ----------------
let ppToken = null, ppTokenExp = 0;

async function paypalToken(s) {
  if (ppToken && Date.now() < ppTokenExp) return ppToken;
  const env = cfg(s, 'paypal_env') === 'live' ? 'live' : 'sandbox';
  const id = cfg(s, 'paypal_client_id'), sec = cfg(s, 'paypal_secret');
  if (!id || !sec) throw new Error('paypal not configured');
  const r = await fetch(`https://api-m${env === 'live' ? '' : '.sandbox'}.paypal.com/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + btoa(`${id}:${sec}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('paypal auth failed');
  ppToken = j.access_token;
  ppTokenExp = Date.now() + (j.expires_in - 60) * 1000;
  return ppToken;
}

export async function paypalCreateOrder(s, order) {
  const env = cfg(s, 'paypal_env') === 'live' ? 'live' : 'sandbox';
  const token = await paypalToken(s);
  const r = await fetch(`https://api-m${env === 'live' ? '' : '.sandbox'}.paypal.com/v2/checkout/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        custom_id: String(order.id),
        reference_id: order.order_number,
        amount: { currency_code: 'EUR', value: (order.total_cents / 100).toFixed(2) },
      }],
    }),
  });
  const j = await r.json();
  if (!j.id) throw new Error(j.message || 'paypal create failed');
  return j.id;
}

export async function paypalCapture(s, paypalOrderId) {
  const env = cfg(s, 'paypal_env') === 'live' ? 'live' : 'sandbox';
  const token = await paypalToken(s);
  const r = await fetch(`https://api-m${env === 'live' ? '' : '.sandbox'}.paypal.com/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const j = await r.json();
  return j.status === 'COMPLETED' ? { ok: true, ref: j.id } : { ok: false, error: j.message };
}

// ---------------- Coinbase Commerce ----------------
export async function coinbaseCreateCharge(s, baseUrl, order) {
  const key = cfg(s, 'coinbase_api_key');
  if (!key) throw new Error('coinbase not configured');
  const r = await fetch('https://api.commerce.coinbase.com/charges', {
    method: 'POST',
    headers: { 'X-CC-Api-Key': key, 'X-CC-Version': '2018-03-22', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `Order ${order.order_number}`,
      description: 'C Store order',
      pricing_type: 'fixed_price',
      local_price: { amount: (order.total_cents / 100).toFixed(2), currency: 'EUR' },
      metadata: { order_id: String(order.id) },
      redirect_url: `${baseUrl}/order/${order.id}`,
      cancel_url: `${baseUrl}/order/${order.id}`,
    }),
  });
  const j = await r.json();
  if (!j.data || !j.data.hosted_url) throw new Error(j.error?.message || 'coinbase create failed');
  return { url: j.data.hosted_url, id: j.data.id };
}

export async function coinbaseVerifyWebhook(s, rawBody, signature) {
  const secret = cfg(s, 'coinbase_webhook_secret');
  if (!secret) return true; // configured providers without webhook secret: accept (logged)
  return timingSafeEqual(await hmacHex('SHA-256', secret, rawBody), signature);
}

// ---------------- NOWPayments ----------------
export async function nowpaymentsCreateInvoice(s, baseUrl, order) {
  const key = cfg(s, 'nowpayments_api_key');
  if (!key) throw new Error('nowpayments not configured');
  const r = await fetch('https://api.nowpayments.io/v1/invoice', {
    method: 'POST',
    headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      price_amount: (order.total_cents / 100).toFixed(2),
      price_currency: 'eur',
      order_id: String(order.id),
      order_description: `Order ${order.order_number}`,
      ipn_callback_url: `${baseUrl}/webhooks/nowpayments`,
      success_url: `${baseUrl}/order/${order.id}`,
      cancel_url: `${baseUrl}/order/${order.id}`,
    }),
  });
  const j = await r.json();
  if (!j.invoice_url) throw new Error(j.message || 'nowpayments create failed');
  return { url: j.invoice_url, id: j.id };
}

export async function nowpaymentsVerifyIpn(s, body) {
  const secret = cfg(s, 'nowpayments_ipn_secret');
  if (!secret) return true;
  const sorted = {};
  Object.keys(body).sort().forEach((k) => (sorted[k] = body[k]));
  return timingSafeEqual(await hmacHex('SHA-512', secret, JSON.stringify(sorted)), body.signature || '');
}

// ---------------- BitPay ----------------
const ec = new elliptic.ec('secp256k1');

export function bitpayPublicKey(privHex) {
  return ec.keyFromPrivate(privHex.replace(/^0x/, ''), 'hex').getPublic('hex');
}

export async function bitpaySignPayload(payloadStr, privHex) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payloadStr));
  const hashHex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return ec.sign(hashHex, privHex.replace(/^0x/, ''), 'hex').toDER('hex');
}

export async function bitpayCreateInvoice(s, baseUrl, order) {
  const token = cfg(s, 'bitpay_token'), priv = cfg(s, 'bitpay_private_key');
  if (!token || !priv) throw new Error('bitpay not configured');
  const payload = JSON.stringify({
    price: (order.total_cents / 100).toFixed(2),
    currency: 'EUR',
    token,
    fullNotifications: true,
    notificationURL: `${baseUrl}/webhooks/bitpay`,
    redirectURL: `${baseUrl}/order/${order.id}`,
    orderId: String(order.id),
    itemDesc: `Order ${order.order_number}`,
  });
  const signature = await bitpaySignPayload(payload, priv);
  const r = await fetch('https://bitpay.com/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-signature': signature, 'x-identity': bitpayPublicKey(priv) },
    body: payload,
  });
  const j = await r.json();
  if (!j.url) throw new Error(j.error || 'bitpay create failed');
  return { url: j.url, id: j.id };
}

export async function bitpayVerifyWebhook(s, rawBody, signature) {
  const priv = cfg(s, 'bitpay_private_key');
  if (!priv || !signature) return true;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawBody));
  const hashHex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  try { return ec.verify(hashHex, signature, bitpayPublicKey(priv), 'hex'); } catch { return false; }
}

// ---------------- Manual wallets (QR codes) ----------------
export function manualWallets(s) {
  const chains = [
    ['Bitcoin (BTC)', cfg(s, 'wallet_btc')],
    ['Ethereum (ETH)', cfg(s, 'wallet_eth')],
    ['USDT (TRC-20)', cfg(s, 'wallet_usdt_trc20')],
  ];
  return chains
    .filter(([, addr]) => addr)
    .map(([chain, addr]) => {
      const g = qr(0, 'M');
      g.addData(addr);
      g.make();
      return { chain, address: addr, qr: g.createDataURL(4, 2) };
    });
}

export const availableMethods = (s) => ({
  paypal: !!(cfg(s, 'paypal_client_id') && cfg(s, 'paypal_secret')),
  coinbase: !!cfg(s, 'coinbase_api_key'),
  nowpayments: !!cfg(s, 'nowpayments_api_key'),
  bitpay: !!(cfg(s, 'bitpay_token') && cfg(s, 'bitpay_private_key')),
  manual_crypto: !!(cfg(s, 'wallet_btc') || cfg(s, 'wallet_eth') || cfg(s, 'wallet_usdt_trc20')),
});

export const METHOD_META = {
  paypal: { icon: '🅿️', name: 'PayPal', desc: 'Pay with your PayPal account or card via PayPal.' },
  coinbase: { icon: '🪙', name: 'Coinbase Commerce', desc: 'Pay with Bitcoin, Ethereum, USDC, DAI and 100+ coins on a hosted checkout.' },
  nowpayments: { icon: '🔄', name: 'NOWPayments', desc: 'Choose from 300+ cryptocurrencies on a hosted invoice.' },
  bitpay: { icon: '🟠', name: 'BitPay', desc: 'Pay with Bitcoin and other coins via a BitPay invoice.' },
  manual_crypto: { icon: '📤', name: 'Direct wallet transfer', desc: 'Send crypto straight to our wallet addresses and submit your transaction ID.' },
};
