// C Store Workers — shared helpers: escaping, settings, signed-cookie sessions,
// flash messages, PBKDF2 password hashing, DB query wrappers.
// Cookies implemented directly (avoids hono/cookie module quirks on Node test harness).
function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}
function setCookieHeader(c, str) {
  c.header('Set-Cookie', str, { append: true });
}

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&' + 'amp;', '<': '&' + 'lt;', '>': '&' + 'gt;', '"': '&' + 'quot;', "'": '&' + '#39;' }[c]));
export const eur = (cents) => '€' + (cents / 100).toFixed(2);
export const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
export const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || ''));

export function normalizePhone(input, defaultCc = '+31') {
  let p = String(input || '').replace(/[\s\-()]/g, '');
  if (!p) return null;
  if (p.startsWith('00')) p = '+' + p.slice(2);
  if (p.startsWith('0')) p = defaultCc + p.slice(1);
  if (!p.startsWith('+')) p = defaultCc + p;
  return /^\+[1-9]\d{7,14}$/.test(p) ? p : null;
}

// ---------------- DB helpers (D1) ----------------
export const q = {
  first: (c, sql, ...args) => c.env.DB.prepare(sql).bind(...args).first(),
  all: async (c, sql, ...args) => (await c.env.DB.prepare(sql).bind(...args).all()).results || [],
  run: (c, sql, ...args) => c.env.DB.prepare(sql).bind(...args).run(),
};

// ---------------- settings (admin-editable) ----------------
export async function getSettings(c) {
  const rows = await q.all(c, 'SELECT key, value FROM settings');
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
export async function setSetting(c, key, value) {
  await q.run(c, 'INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, String(value));
}
export const cfg = (settings, key) => {
  const v = settings[key];
  return v !== undefined && v !== null && v !== '' ? String(v) : '';
};
export function baseUrl(c, settings) {
  return (settings && settings.public_base_url) || new URL(c.req.url).origin;
}

// ---------------- signed cookies ----------------
const te = new TextEncoder();

async function hmacSign(secret, data) {
  const key = await crypto.subtle.importKey('raw', te.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, te.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

// UTF-8-safe base64 (btoa alone fails on non-Latin1 characters like — or €)
const b64encode = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const b64decode = (s) => new TextDecoder().decode(Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0)));

async function packCookie(obj, secret) {
  const data = b64encode(JSON.stringify(obj));
  return data + '.' + (await hmacSign(secret, data));
}

export async function readSigned(c, name) {
  const raw = parseCookies(c.req.header('Cookie'))[name];
  if (!raw) return null;
  const i = raw.lastIndexOf('.');
  if (i < 0) return null;
  const data = raw.slice(0, i), sig = raw.slice(i + 1);
  const secret = c.env.SESSION_SECRET || 'dev-secret-change-me';
  if (!timingSafeEqual(sig, await hmacSign(secret, data))) return null;
  try { return JSON.parse(b64decode(data)); } catch { return null; }
}
export async function writeSigned(c, name, obj, maxAge = 60 * 60 * 24 * 7) {
  const secret = c.env.SESSION_SECRET || 'dev-secret-change-me';
  const val = await packCookie(obj, secret);
  setCookieHeader(c, `${name}=${val}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax; Secure`);
}
export function clearSigned(c, name) {
  setCookieHeader(c, `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
}

// ---------------- flash ----------------
export async function flash(c, type, msg) {
  const cur = (await readSigned(c, 'cstore_flash')) || [];
  cur.push({ type, msg });
  await writeSigned(c, 'cstore_flash', cur, 300);
}
export async function takeFlash(c) {
  const cur = (await readSigned(c, 'cstore_flash')) || [];
  if (cur.length) clearSigned(c, 'cstore_flash');
  return cur;
}

// ---------------- PBKDF2 password hashing ----------------
const PBKDF2_ITER = 100000;

async function pbkdf2(password, saltB64, iterations) {
  const salt = Uint8Array.from(atob(saltB64), (ch) => ch.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', te.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltB64 = btoa(String.fromCharCode(...salt));
  return `pbkdf2$${PBKDF2_ITER}$${saltB64}$${await pbkdf2(password, saltB64, PBKDF2_ITER)}`;
}

export async function verifyPassword(password, stored) {
  try {
    const [scheme, iter, saltB64, keyB64] = String(stored || '').split('$');
    if (scheme !== 'pbkdf2' || !iter || !saltB64 || !keyB64) return false;
    return timingSafeEqual(await pbkdf2(password, saltB64, Number(iter)), keyB64);
  } catch { return false; }
}

// ---------------- misc ----------------
export function makeOrderNumber() {
  return 'CS-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(Math.random() * 9000 + 1000);
}

export async function sha256Hex(data) {
  const d = await crypto.subtle.digest('SHA-256', te.encode(data));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hmacHex(algo, secret, data) {
  const key = await crypto.subtle.importKey('raw', te.encode(secret), { name: 'HMAC', hash: algo }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, te.encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
