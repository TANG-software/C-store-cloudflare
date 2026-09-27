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
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
INSERT OR IGNORE INTO categories(name, slug) VALUES ('Electronics', 'electronics');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'electronics'), 'Wireless Noise-Cancelling Headphones', 'wireless-noise-cancelling-headphones', 'Premium over-ear headphones with active noise cancellation and 30-hour battery life.', 12900, 24, 'https://picsum.photos/seed/wireless-noise-cancelling-headphones/600/450');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'electronics'), 'Smart Fitness Watch', 'smart-fitness-watch', 'Track your workouts, heart rate and sleep with this water-resistant smartwatch.', 8950, 40, 'https://picsum.photos/seed/smart-fitness-watch/600/450');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'electronics'), 'Bluetooth Speaker (Waterproof)', 'bluetooth-speaker-waterproof', 'Compact 360° sound speaker, IPX7 waterproof — perfect for the beach or kitchen.', 4995, 60, 'https://picsum.photos/seed/bluetooth-speaker-waterproof/600/450');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'electronics'), 'USB-C Fast Charging Power Bank 20,000 mAh', 'usb-c-fast-charging-power-bank-20-000-mah', 'Charge your phone up to 5 times. Dual USB-C ports with 22.5W output.', 3595, 80, 'https://picsum.photos/seed/usb-c-fast-charging-power-bank-20-000-mah/600/450');
INSERT OR IGNORE INTO categories(name, slug) VALUES ('Fashion', 'fashion');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'fashion'), 'Classic Denim Jacket', 'classic-denim-jacket', 'Timeless unisex denim jacket made from 100% organic cotton.', 6995, 30, 'https://picsum.photos/seed/classic-denim-jacket/600/450');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'fashion'), 'Merino Wool Scarf', 'merino-wool-scarf', 'Soft, warm and itch-free merino wool scarf woven in the EU.', 2995, 50, 'https://picsum.photos/seed/merino-wool-scarf/600/450');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'fashion'), 'Leather Crossbody Bag', 'leather-crossbody-bag', 'Handmade full-grain leather bag with adjustable strap.', 8500, 18, 'https://picsum.photos/seed/leather-crossbody-bag/600/450');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'fashion'), 'Everyday Canvas Sneakers', 'everyday-canvas-sneakers', 'Minimalist low-top sneakers with cushioned insoles.', 5495, 45, 'https://picsum.photos/seed/everyday-canvas-sneakers/600/450');
INSERT OR IGNORE INTO categories(name, slug) VALUES ('Home & Living', 'home-living');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'home-living'), 'Aroma Diffuser with LED', 'aroma-diffuser-with-led', 'Ultrasonic 300ml essential oil diffuser with 7 colour ambient light.', 3295, 35, 'https://picsum.photos/seed/aroma-diffuser-with-led/600/450');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'home-living'), 'Scandinavian Table Lamp', 'scandinavian-table-lamp', 'Oak and linen table lamp for warm, cozy interior lighting.', 4595, 22, 'https://picsum.photos/seed/scandinavian-table-lamp/600/450');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'home-living'), 'Ceramic Pour-Over Coffee Set', 'ceramic-pour-over-coffee-set', 'Handcrafted ceramic dripper and carafe for slow-brew mornings.', 4200, 28, 'https://picsum.photos/seed/ceramic-pour-over-coffee-set/600/450');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'home-living'), 'Organic Cotton Bedding Set (Queen)', 'organic-cotton-bedding-set-queen', 'Breathable 300-thread-count bedding in soft neutral tones.', 7995, 15, 'https://picsum.photos/seed/organic-cotton-bedding-set-queen/600/450');
INSERT OR IGNORE INTO categories(name, slug) VALUES ('Beauty', 'beauty');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'beauty'), 'Vitamin C Brightening Serum', 'vitamin-c-brightening-serum', '10% vitamin C serum with hyaluronic acid for glowing skin.', 2495, 70, 'https://picsum.photos/seed/vitamin-c-brightening-serum/600/450');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'beauty'), 'Bamboo Charcoal Face Mask', 'bamboo-charcoal-face-mask', 'Deep-cleansing peel-off mask for all skin types.', 1495, 90, 'https://picsum.photos/seed/bamboo-charcoal-face-mask/600/450');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'beauty'), 'Rosemary Hair Growth Oil', 'rosemary-hair-growth-oil', 'Natural oil blend for stronger, healthier hair.', 1895, 65, 'https://picsum.photos/seed/rosemary-hair-growth-oil/600/450');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'beauty'), 'SPF50 Sunscreen (Reef Safe)', 'spf50-sunscreen-reef-safe', 'Broad-spectrum mineral sunscreen, no white cast.', 1695, 85, 'https://picsum.photos/seed/spf50-sunscreen-reef-safe/600/450');
INSERT OR IGNORE INTO categories(name, slug) VALUES ('Sports & Outdoors', 'sports-outdoors');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'sports-outdoors'), 'Yoga Mat (Non-Slip, 6mm)', 'yoga-mat-non-slip-6mm', 'Eco-friendly TPE yoga mat with alignment lines.', 3295, 50, 'https://picsum.photos/seed/yoga-mat-non-slip-6mm/600/450');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'sports-outdoors'), 'Adjustable Dumbbell 20 kg', 'adjustable-dumbbell-20-kg', 'Space-saving adjustable dumbbell, 2–20 kg in seconds.', 8995, 20, 'https://picsum.photos/seed/adjustable-dumbbell-20-kg/600/450');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'sports-outdoors'), 'Cycling Repair Kit', 'cycling-repair-kit', 'Everything you need for roadside bike repairs in a compact pouch.', 2795, 40, 'https://picsum.photos/seed/cycling-repair-kit/600/450');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'sports-outdoors'), 'Insulated Hiking Bottle 750ml', 'insulated-hiking-bottle-750ml', 'Keeps drinks cold 24h / hot 12h. Leak-proof stainless steel.', 2295, 75, 'https://picsum.photos/seed/insulated-hiking-bottle-750ml/600/450');
INSERT OR IGNORE INTO categories(name, slug) VALUES ('Toys & Games', 'toys-games');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'toys-games'), 'Strategy Board Game: Expedition', 'strategy-board-game-expedition', 'Award-winning family board game for 2–5 players, ages 10+.', 3995, 32, 'https://picsum.photos/seed/strategy-board-game-expedition/600/450');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'toys-games'), '1,000-Piece Puzzle: Dutch Landscapes', '1-000-piece-puzzle-dutch-landscapes', 'Beautiful aerial photography of tulip fields and windmills.', 1895, 55, 'https://picsum.photos/seed/1-000-piece-puzzle-dutch-landscapes/600/450');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'toys-games'), 'Wooden Building Blocks (100 pcs)', 'wooden-building-blocks-100-pcs', 'FSC-certified beech blocks for creative play.', 2595, 38, 'https://picsum.photos/seed/wooden-building-blocks-100-pcs/600/450');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'toys-games'), 'Card Game: Quick Wit Party Pack', 'card-game-quick-wit-party-pack', 'Fast-paced party game for 3+ players.', 1595, 100, 'https://picsum.photos/seed/card-game-quick-wit-party-pack/600/450');
INSERT OR IGNORE INTO categories(name, slug) VALUES ('Groceries', 'groceries');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'groceries'), 'Organic Coffee Beans 1kg (Dark Roast)', 'organic-coffee-beans-1kg-dark-roast', 'Fairtrade arabica beans, roasted in Rotterdam.', 2495, 120, 'https://picsum.photos/seed/organic-coffee-beans-1kg-dark-roast/600/450');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'groceries'), 'Manuka Honey 250g', 'manuka-honey-250g', 'UMF10+ certified New Zealand manuka honey.', 3995, 40, 'https://picsum.photos/seed/manuka-honey-250g/600/450');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'groceries'), 'Extra Virgin Olive Oil 750ml', 'extra-virgin-olive-oil-750ml', 'Cold-pressed single-estate olive oil from Greece.', 1895, 90, 'https://picsum.photos/seed/extra-virgin-olive-oil-750ml/600/450');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'groceries'), 'Artisan Chocolate Box (16 pc)', 'artisan-chocolate-box-16-pc', 'Handmade Belgian chocolates in a gift box.', 2250, 60, 'https://picsum.photos/seed/artisan-chocolate-box-16-pc/600/450');
INSERT OR IGNORE INTO categories(name, slug) VALUES ('Books', 'books');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'books'), 'The Art of Slow Living (Hardcover)', 'the-art-of-slow-living-hardcover', 'A beautifully illustrated guide to a calmer life.', 2295, 45, 'https://picsum.photos/seed/the-art-of-slow-living-hardcover/600/450');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'books'), 'Netherlands Cycling Routes: 50 Maps', 'netherlands-cycling-routes-50-maps', 'Detailed cycling maps covering all twelve provinces.', 2795, 30, 'https://picsum.photos/seed/netherlands-cycling-routes-50-maps/600/450');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'books'), 'Modern Cooking for One', 'modern-cooking-for-one', '60 quick, no-waste recipes for solo cooks.', 2695, 35, 'https://picsum.photos/seed/modern-cooking-for-one/600/450');
INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = 'books'), 'Kids'' Adventure Atlas', 'kids-adventure-atlas', 'Colourful world atlas with fun facts for ages 6–11.', 1995, 50, 'https://picsum.photos/seed/kids-adventure-atlas/600/450');
INSERT OR IGNORE INTO users(name, email, phone, password_hash, role, email_verified, phone_verified, force_password_change) VALUES ('Store Administrator', 'admin@cstore.com', '+31000000000', 'pbkdf2$100000$lWOMXg3ZRvboFUaS/6ixPA==$Kz6EdGReSkyrEKmIFzNkqFLgFrT6JoOut0F0vMnQAnI=', 'admin', 1, 1, 1);

`;

let ready = false;

function statements(sql) {
  return sql
    .split(';')
    .map((s) => s.replace(/^--[^\n]*\n/gm, '').trim())
    .filter((s) => s.length > 0);
}

export async function ensureDb(c) {
  if (ready) return;
  const check = await c.env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'").first();
  if (check) { ready = true; return; }
  for (const s of statements(SCHEMA_SQL)) {
    await c.env.DB.prepare(s).run();
  }
  for (const s of statements(SEED_SQL)) {
    await c.env.DB.prepare(s).run();
  }
  ready = true;
}
