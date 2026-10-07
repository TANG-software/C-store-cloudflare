import { q } from './lib.js';
// C Store Workers — self-healing database bootstrap.
// If the database is empty (fresh, or after a factory reset), the first request
// creates all tables and loads the seed data automatically. Generated from
// migrations/ — safe to run repeatedly (IF NOT EXISTS / OR IGNORE).
const SCHEMA_SQL = `-- C Store — schema (Cloudflare D1 / SQLite)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  phone TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  email_verified INTEGER NOT NULL DEFAULT 0,
  phone_verified INTEGER NOT NULL DEFAULT 0,
  force_password_change INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS otp_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  image_url TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  digital INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL,
  payment_ref TEXT,
  subtotal_cents INTEGER NOT NULL,
  shipping_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  ship_name TEXT NOT NULL,
  ship_email TEXT NOT NULL,
  ship_phone TEXT NOT NULL,
  ship_address TEXT NOT NULL,
  ship_city TEXT NOT NULL,
  ship_postal_code TEXT NOT NULL,
  ship_country TEXT NOT NULL DEFAULT 'NL',
  txid TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  delivery_text TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  qty INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  ext_id TEXT,
  raw TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
`;

const SEED_SQL = `-- C Store — seed data (runs once); delete data to reset

INSERT OR IGNORE INTO settings(key, value) VALUES ('store_name', 'C Store');
INSERT OR IGNORE INTO settings(key, value) VALUES ('store_tagline', 'Everything you need, delivered across the Netherlands.');
INSERT OR IGNORE INTO settings(key, value) VALUES ('support_email', 'support@cstore.nl');
INSERT OR IGNORE INTO settings(key, value) VALUES ('support_phone', '');
INSERT OR IGNORE INTO settings(key, value) VALUES ('store_address', '');
INSERT OR IGNORE INTO settings(key, value) VALUES ('public_base_url', '');
INSERT OR IGNORE INTO settings(key, value) VALUES ('shipping_nl_cents', '495');
INSERT OR IGNORE INTO settings(key, value) VALUES ('shipping_eu_cents', '995');
INSERT OR IGNORE INTO settings(key, value) VALUES ('free_shipping_threshold_cents', '7500');
INSERT OR IGNORE INTO settings(key, value) VALUES ('wallet_btc', '');
INSERT OR IGNORE INTO settings(key, value) VALUES ('wallet_eth', '');
INSERT OR IGNORE INTO settings(key, value) VALUES ('wallet_usdt_trc20', '');
INSERT OR IGNORE INTO users(name, email, phone, password_hash, role, email_verified, phone_verified, force_password_change) VALUES ('Store Manager', 'manager@cstore.com', '+31000000002', 'pbkdf2$100000$IAykCt/nXQtfpMoNRUThlg==$EcB4C8cMZ3NFfSsIT+og24fL5z2kwWTUv6ZaYzEH7BY=', 'admin', 1, 1, 1);
INSERT OR IGNORE INTO users(name, email, phone, password_hash, role, email_verified, phone_verified, force_password_change) VALUES ('Site Developer (owner)', 'dev@cstore.com', '+31000000001', 'pbkdf2$100000$QDptZUd7U2ojBvJGgHtgWQ==$97xyVFhL7WMGMlfu/tBjadeXjNVuf8LhbfSMw6TwS4I=', 'developer', 1, 1, 1);

`;

// ---------- homepage cards (admin-editable feature/review/payment cards) ----------
// Kept separate from SCHEMA_SQL so an EXISTING database (settings table already
// present) also gets upgraded automatically on the first request after deploy.
const CARDS_SCHEMA_SQL = `CREATE TABLE IF NOT EXISTS homepage_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  stars INTEGER NOT NULL DEFAULT 5,
  when_label TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'bolt'
)`;

const CARDS_SEED_SQL = `INSERT INTO homepage_cards(section, sort, title, body, stars, when_label, icon) VALUES ('feature', 1, 'Ships same day', 'Order before 15:00 on a weekday and it leaves the same afternoon. Most of the Netherlands receives within 48 hours.', 5, '', 'bolt');
INSERT INTO homepage_cards(section, sort, title, body, stars, when_label, icon) VALUES ('feature', 2, 'You pay, we never look', 'Payments run through PayPal or established crypto processors. Card details never touch our servers.', 5, '', 'shield');
INSERT INTO homepage_cards(section, sort, title, body, stars, when_label, icon) VALUES ('feature', 3, 'Real answers', 'Questions about an order or a payment? Email us and a person replies — usually within one working day.', 5, '', 'headphones');
INSERT INTO homepage_cards(section, sort, title, body, stars, when_label, icon) VALUES ('feature', 4, 'Chosen, not endless', 'We stock a deliberate range — what we would use ourselves, nothing padded.', 5, '', 'package');
INSERT INTO homepage_cards(section, sort, title, body, stars, when_label, icon) VALUES ('review', 1, 'Femke — Den Haag', 'Ordered Friday evening and the package was in my hands Monday morning. The packaging was sturdier than I expected — nothing rattled.', 5, '2 weeks ago', '');
INSERT INTO homepage_cards(section, sort, title, body, stars, when_label, icon) VALUES ('review', 2, 'Joep — Eindhoven', 'Good shop. Paid with crypto and the confirmation took a bit longer than I thought it would, but support replied within the hour and the delivery arrived right on time.', 4, '1 month ago', '');
INSERT INTO homepage_cards(section, sort, title, body, stars, when_label, icon) VALUES ('review', 3, 'Amber — Groningen', 'Paid with USDT, got the payment confirmation the same evening and the parcel two days later. Exactly what was promised, including the invoice with VAT.', 5, '2 months ago', '');
INSERT INTO homepage_cards(section, sort, title, body, stars, when_label, icon) VALUES ('pay', 1, 'PayPal', '', 5, '', '');
INSERT INTO homepage_cards(section, sort, title, body, stars, when_label, icon) VALUES ('pay', 2, 'Bitcoin', '₿', 5, '', '');
INSERT INTO homepage_cards(section, sort, title, body, stars, when_label, icon) VALUES ('pay', 3, 'Ethereum', 'Ξ', 5, '', '');
INSERT INTO homepage_cards(section, sort, title, body, stars, when_label, icon) VALUES ('pay', 4, 'USDT', '₮', 5, '', '');
INSERT INTO homepage_cards(section, sort, title, body, stars, when_label, icon) VALUES ('pay', 5, '300+ coins', '', 5, '', '');`;

let ready = false;

export function statements(sql) {
  return sql
    .replace(/--[^\n]*/g, '')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function ensureHomepageCards(c) {
  const has = await c.env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='homepage_cards'").first();
  if (has) return;
  for (const s of statements(CARDS_SCHEMA_SQL)) {
    await c.env.DB.prepare(s).run();
  }
  for (const s of statements(CARDS_SEED_SQL)) {
    await c.env.DB.prepare(s).run();
  }
}

// ---------- upgrades for databases created before these features existed ----------
// Runs on every boot; each statement is idempotent (INSERT OR IGNORE / column check).
const UPGRADE_SETTINGS_SQL = `INSERT OR IGNORE INTO settings(key, value) VALUES ('hero_headline', 'C Store is the perfect destination for all your needs!');
INSERT OR IGNORE INTO settings(key, value) VALUES ('hero_badges', 'Free shipping over €75\n1–2 day delivery in NL\nPayPal & 300+ cryptocurrencies\n21% VAT included');
INSERT OR IGNORE INTO settings(key, value) VALUES ('about_text', 'C Store keeps it simple: we hold our own stock in the Netherlands, describe every product the way it actually arrives, and answer email ourselves — no scripts, no call center. Prices include VAT, and shipping is free above €75.');
INSERT OR IGNORE INTO settings(key, value) VALUES ('discord_url', '');
INSERT OR IGNORE INTO settings(key, value) VALUES ('telegram_url', '');
INSERT OR IGNORE INTO settings(key, value) VALUES ('top_bar_text', 'Free EU shipping over €75 · PayPal & 300+ cryptocurrencies · 21% VAT included');
INSERT OR IGNORE INTO settings(key, value) VALUES ('hero_overline', 'Netherlands · EU shipping');
INSERT OR IGNORE INTO settings(key, value) VALUES ('hero_cta', 'Shop here!');
INSERT OR IGNORE INTO settings(key, value) VALUES ('stats_heading', 'C Store stats');
INSERT OR IGNORE INTO settings(key, value) VALUES ('stats_text', 'A quick look at what we''ve achieved and what keeps our customers coming back — updated live with every order.');
INSERT OR IGNORE INTO settings(key, value) VALUES ('stat_orders_label', 'Orders completed');
INSERT OR IGNORE INTO settings(key, value) VALUES ('stat_customers_label', 'Happy customers');
INSERT OR IGNORE INTO settings(key, value) VALUES ('stat_products_label', 'Products listed');
INSERT OR IGNORE INTO settings(key, value) VALUES ('about_heading', 'About us');
INSERT OR IGNORE INTO settings(key, value) VALUES ('categories_heading', 'Shop by category');
INSERT OR IGNORE INTO settings(key, value) VALUES ('featured_heading', 'Popular right now');
INSERT OR IGNORE INTO settings(key, value) VALUES ('newest_heading', 'New arrivals');
INSERT OR IGNORE INTO settings(key, value) VALUES ('reviews_heading', 'What customers say');
INSERT OR IGNORE INTO settings(key, value) VALUES ('payments_heading', 'We support different payment methods');
INSERT OR IGNORE INTO settings(key, value) VALUES ('related_heading', 'You may also like');
INSERT OR IGNORE INTO settings(key, value) VALUES ('faq_heading', 'Frequently asked questions');
INSERT OR IGNORE INTO settings(key, value) VALUES ('ads_enabled', '0');
INSERT OR IGNORE INTO settings(key, value) VALUES ('ad_native', '1');
INSERT OR IGNORE INTO settings(key, value) VALUES ('ad_socialbar', '1');
INSERT OR IGNORE INTO settings(key, value) VALUES ('ad_popunder', '0');
INSERT OR IGNORE INTO settings(key, value) VALUES ('ad_strip', '0');
INSERT OR IGNORE INTO settings(key, value) VALUES ('faqs', 'Which payment methods do you accept? || PayPal (including card payments through PayPal) and cryptocurrencies — Bitcoin, Ethereum, USDT and 300+ coins, depending on the options available at checkout.\nWhy do I need to verify my email address? || For your security and to prevent fraud, we verify every customer''s email address with a one-time code before the first order — that''s all that is required. Verifying your mobile number as well is optional, and makes it easier for us to reach you about your delivery.\nI paid with crypto — why is my order still pending? || Cryptocurrency payments need network confirmations. Hosted checkouts (Coinbase Commerce, NOWPayments, BitPay) confirm automatically within minutes. Direct wallet transfers are verified by our team, usually within a few hours.\nWhere do you ship? || We ship from the Netherlands across the EU. Dutch delivery takes 1–2 business days, and shipping is free on orders over €75.');`;

async function ensureUpgrades(c) {
  for (const s of statements(UPGRADE_SETTINGS_SQL)) {
    await c.env.DB.prepare(s).run();
  }
  // Ensure the current admin account exists (idempotent), and terminate the
  // legacy admin@cstore.com login if it is still around. Wrapped so a
  // failure here can never break the site.
  try {
    const fresh = await q.first(c, 'SELECT id FROM users WHERE email = ?', 'manager@cstore.com');
    if (!fresh) {
      const phones = ['+31000000002', '+31000000003', '+31000000009', '+31000000019'];
      for (const ph of phones) {
        try {
          await q.run(c, "INSERT INTO users(name, email, phone, password_hash, role, email_verified, phone_verified, force_password_change) VALUES ('Store Manager', ?, ?, ?, 'admin', 1, 1, 1)", 'manager@cstore.com', ph, 'pbkdf2$100000$IAykCt/nXQtfpMoNRUThlg==$EcB4C8cMZ3NFfSsIT+og24fL5z2kwWTUv6ZaYzEH7BY=');
          break;
        } catch (e) { /* phone already taken — try the next one */ }
      }
    }
  } catch (e) { /* never break the site */ }
  try {
    const legacy = await q.first(c, "SELECT id FROM users WHERE email = 'admin@cstore.com' AND role = 'admin'");
    if (legacy) {
      await q.run(c, "UPDATE users SET role = 'customer', password_hash = 'disabled', email = 'admin@cstore.com#terminated' WHERE id = ?", legacy.id);
    }
  } catch (e) { /* never break the site */ }

  // Owner (developer) account — added once, idempotent.
  await c.env.DB.prepare("INSERT OR IGNORE INTO users(name, email, phone, password_hash, role, email_verified, phone_verified, force_password_change) VALUES ('Site Developer (owner)', 'dev@cstore.com', '+31000000001', 'pbkdf2$100000$QDptZUd7U2ojBvJGgHtgWQ==$97xyVFhL7WMGMlfu/tBjadeXjNVuf8LhbfSMw6TwS4I=', 'developer', 1, 1, 1);").run();
  // One-time: swap the very first demo catalog (physical goods) for the
  // current digital-product demo catalog. Only runs while the store still
  // holds the original seeded demo items and no real orders exist, so a
  // store with its own products or orders is never touched.
  const legacy = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM products WHERE slug IN ('smart-fitness-watch','wireless-noise-cancelling-headphones','vitamin-c-brightening-serum')").first();
  if (legacy && legacy.n > 0) {
    const orders = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM orders').first();
    if (!orders || orders.n === 0) {
      await c.env.DB.prepare('DELETE FROM products').run();
      await c.env.DB.prepare('DELETE FROM categories').run();
      for (const s of statements(DEMO_CATALOG_SQL)) await c.env.DB.prepare(s).run();
    }
  }
  // products.payment_methods (admin can restrict which payment methods a product allows)
  const row = await c.env.DB.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='products'").first();
  if (row && row.sql && !/payment_methods/i.test(row.sql)) {
    await c.env.DB.prepare("ALTER TABLE products ADD COLUMN payment_methods TEXT NOT NULL DEFAULT ''").run();
  }
  // products.digital — digital goods (accounts) skip shipping at checkout
  if (row && row.sql && !/\bdigital\b/i.test(row.sql)) {
    await c.env.DB.prepare("ALTER TABLE products ADD COLUMN digital INTEGER NOT NULL DEFAULT 1").run();
  }
  // orders.delivery_text — the account details handed to the buyer
  const orow = await c.env.DB.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='orders'").first();
  if (orow && orow.sql && !/delivery_text/i.test(orow.sql)) {
    await c.env.DB.prepare("ALTER TABLE orders ADD COLUMN delivery_text TEXT NOT NULL DEFAULT ''").run();
  }
}


// Demo catalog — zynox-style digital goods. Used to seed a fresh database
// and by the admin "load demo products" button (replaces all products).
export const DEMO_CATALOG_SQL = `
INSERT OR IGNORE INTO categories(name, slug) VALUES ('Discord', 'discord');
INSERT OR IGNORE INTO categories(name, slug) VALUES ('Game Accounts', 'game-accounts');
INSERT OR IGNORE INTO categories(name, slug) VALUES ('Streaming', 'streaming');
INSERT OR IGNORE INTO categories(name, slug) VALUES ('Social Media', 'social-media');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'discord'), 'Nitro Boost', 'nitro-boost', 'One month of full Nitro on a fresh account — instant delivery, full access included.', 450, 3, '/img/products/nitro.png');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'discord'), 'Nitro Basic', 'nitro-basic', 'Nitro Basic on your own account — instant delivery.', 100, 0, '/img/products/nitro-basic.png');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'discord'), 'Discord Nitro 3 Months', 'discord-nitro-3-months', 'Three months of full Nitro — best value for a new account.', 450, 120, '/img/products/nitro-3m.png');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'discord'), '14x Server Boosts 1m', '14x-server-boosts-1m', 'Fourteen boosts for one month — enough for level 3 on your server.', 200, 0, '/img/products/boosts.png');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'discord'), 'Discord Aged Accounts', 'discord-aged-accounts', 'Aged Discord accounts from 2016–2020 — full access, never used for spam.', 80, 864, '/img/products/aged.png');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'discord'), 'Discord Real Members', 'discord-real-members', 'Real members for your server — fast, safe delivery.', 200, 161, '/img/products/members.png');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'discord'), 'Random Discord Decoration', 'random-discord-decoration', 'A random avatar decoration for your profile — surprise pick.', 175, 91, '/img/products/decoration.png');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'game-accounts'), 'Brawl Stars Accounts', 'brawl-stars-accounts', 'Fresh account with starter gear — full access, instant delivery.', 175, 30, '/img/products/brawl.png');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'game-accounts'), 'Fortnite Full Access Accounts', 'fortnite-full-access-accounts', 'Full access account with lifetime warranty and email change.', 200, 3, '/img/products/fortnite.png');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'game-accounts'), 'Roblox Full Access Accounts', 'roblox-full-access-accounts', 'Full access, instant delivery — great for a fresh start.', 249, 60, '/img/products/roblox.png');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'streaming'), 'Twitch Account', 'twitch-account', 'Aged Twitch account, ready to stream.', 1500, 0, '/img/products/twitch.png');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'streaming'), 'YouTube Account', 'youtube-account', 'Aged account, ready to use — full access included.', 699, 25, '/img/products/youtube.png');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'streaming'), 'Spotify Upgrade 1 Year', 'spotify-upgrade-1-year', 'Your own account upgraded for a full year — no password needed.', 1499, 40, '/img/products/spotify.png');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'social-media'), 'Telegram Premium 3 Months', 'telegram-premium-3-months', 'Premium badge, faster transfers and bigger uploads for three months.', 399, 80, '/img/products/telegram.png');
`;

export async function ensureDb(c) {
  if (ready) return;
  const check = await c.env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'").first();
  if (check) {
    // Existing database: still upgrade it (new settings + columns) if missing.
    await ensureHomepageCards(c);
    await ensureUpgrades(c);
    ready = true;
    return;
  }
  for (const s of statements(SCHEMA_SQL)) {
    await c.env.DB.prepare(s).run();
  }
  for (const s of statements(DEMO_CATALOG_SQL)) {
    await c.env.DB.prepare(s).run();
  }
  for (const s of statements(SEED_SQL)) {
    await c.env.DB.prepare(s).run();
  }
  await ensureHomepageCards(c);
  await ensureUpgrades(c);
  ready = true;
}
