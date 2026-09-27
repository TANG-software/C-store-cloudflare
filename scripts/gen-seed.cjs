// Generates migrations/0002_seed.sql (settings, categories, products, admin user).
// The admin password uses PBKDF2-SHA256 (WebCrypto), the same format the app verifies.
const crypto = require('crypto');

async function pbkdf2Hash(password, saltB64, iterations = 100000) {
  const salt = Buffer.from(saltB64, 'base64');
  const key = await crypto.subtle.importKey('raw', Buffer.from(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256
  );
  return `pbkdf2$${iterations}$${saltB64}$${Buffer.from(bits).toString('base64')}`;
}

const SETTINGS = {
  store_name: 'C Store',
  store_tagline: 'Everything you need, delivered across the Netherlands.',
  support_email: 'support@cstore.nl',
  support_phone: '',
  store_address: '',
  public_base_url: '',
  shipping_nl_cents: '495',
  shipping_eu_cents: '995',
  free_shipping_threshold_cents: '7500',
  wallet_btc: '',
  wallet_eth: '',
  wallet_usdt_trc20: ''
};

const PRODUCTS = {
  'Electronics': [
    ['Wireless Noise-Cancelling Headphones', 12900, 24, 'Premium over-ear headphones with active noise cancellation and 30-hour battery life.'],
    ['Smart Fitness Watch', 8950, 40, 'Track your workouts, heart rate and sleep with this water-resistant smartwatch.'],
    ['Bluetooth Speaker (Waterproof)', 4995, 60, 'Compact 360° sound speaker, IPX7 waterproof — perfect for the beach or kitchen.'],
    ['USB-C Fast Charging Power Bank 20,000 mAh', 3595, 80, 'Charge your phone up to 5 times. Dual USB-C ports with 22.5W output.'],
  ],
  'Fashion': [
    ['Classic Denim Jacket', 6995, 30, 'Timeless unisex denim jacket made from 100% organic cotton.'],
    ['Merino Wool Scarf', 2995, 50, 'Soft, warm and itch-free merino wool scarf woven in the EU.'],
    ['Leather Crossbody Bag', 8500, 18, 'Handmade full-grain leather bag with adjustable strap.'],
    ['Everyday Canvas Sneakers', 5495, 45, 'Minimalist low-top sneakers with cushioned insoles.'],
  ],
  'Home & Living': [
    ['Aroma Diffuser with LED', 3295, 35, 'Ultrasonic 300ml essential oil diffuser with 7 colour ambient light.'],
    ['Scandinavian Table Lamp', 4595, 22, 'Oak and linen table lamp for warm, cozy interior lighting.'],
    ['Ceramic Pour-Over Coffee Set', 4200, 28, 'Handcrafted ceramic dripper and carafe for slow-brew mornings.'],
    ['Organic Cotton Bedding Set (Queen)', 7995, 15, 'Breathable 300-thread-count bedding in soft neutral tones.'],
  ],
  'Beauty': [
    ['Vitamin C Brightening Serum', 2495, 70, '10% vitamin C serum with hyaluronic acid for glowing skin.'],
    ['Bamboo Charcoal Face Mask', 1495, 90, 'Deep-cleansing peel-off mask for all skin types.'],
    ['Rosemary Hair Growth Oil', 1895, 65, 'Natural oil blend for stronger, healthier hair.'],
    ['SPF50 Sunscreen (Reef Safe)', 1695, 85, 'Broad-spectrum mineral sunscreen, no white cast.'],
  ],
  'Sports & Outdoors': [
    ['Yoga Mat (Non-Slip, 6mm)', 3295, 50, 'Eco-friendly TPE yoga mat with alignment lines.'],
    ['Adjustable Dumbbell 20 kg', 8995, 20, 'Space-saving adjustable dumbbell, 2–20 kg in seconds.'],
    ['Cycling Repair Kit', 2795, 40, 'Everything you need for roadside bike repairs in a compact pouch.'],
    ['Insulated Hiking Bottle 750ml', 2295, 75, 'Keeps drinks cold 24h / hot 12h. Leak-proof stainless steel.'],
  ],
  'Toys & Games': [
    ['Strategy Board Game: Expedition', 3995, 32, 'Award-winning family board game for 2–5 players, ages 10+.'],
    ['1,000-Piece Puzzle: Dutch Landscapes', 1895, 55, 'Beautiful aerial photography of tulip fields and windmills.'],
    ['Wooden Building Blocks (100 pcs)', 2595, 38, 'FSC-certified beech blocks for creative play.'],
    ['Card Game: Quick Wit Party Pack', 1595, 100, 'Fast-paced party game for 3+ players.'],
  ],
  'Groceries': [
    ['Organic Coffee Beans 1kg (Dark Roast)', 2495, 120, 'Fairtrade arabica beans, roasted in Rotterdam.'],
    ['Manuka Honey 250g', 3995, 40, 'UMF10+ certified New Zealand manuka honey.'],
    ['Extra Virgin Olive Oil 750ml', 1895, 90, 'Cold-pressed single-estate olive oil from Greece.'],
    ['Artisan Chocolate Box (16 pc)', 2250, 60, 'Handmade Belgian chocolates in a gift box.'],
  ],
  'Books': [
    ['The Art of Slow Living (Hardcover)', 2295, 45, 'A beautifully illustrated guide to a calmer life.'],
    ['Netherlands Cycling Routes: 50 Maps', 2795, 30, 'Detailed cycling maps covering all twelve provinces.'],
    ['Modern Cooking for One', 2695, 35, '60 quick, no-waste recipes for solo cooks.'],
    ["Kids' Adventure Atlas", 1995, 50, 'Colourful world atlas with fun facts for ages 6–11.'],
  ],
};

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const sq = (s) => "'" + String(s).replace(/'/g, "''") + "'";

(async () => {
  const salt = crypto.randomBytes(16).toString('base64');
  const hash = await pbkdf2Hash('Admin@123', salt);
  const out = ['-- C Store — seed data (runs once); delete data to reset\nBEGIN TRANSACTION;'];
  for (const [k, v] of Object.entries(SETTINGS)) {
    out.push(`INSERT OR IGNORE INTO settings(key, value) VALUES (${sq(k)}, ${sq(v)});`);
  }
  for (const [cat, items] of Object.entries(PRODUCTS)) {
    out.push(`INSERT OR IGNORE INTO categories(name, slug) VALUES (${sq(cat)}, ${sq(slugify(cat))});`);
    for (const [name, price, stock, desc] of items) {
      const slug = slugify(name);
      out.push(`INSERT OR IGNORE INTO products(category_id, name, slug, description, price_cents, stock, image_url) VALUES ((SELECT id FROM categories WHERE slug = ${sq(slugify(cat))}), ${sq(name)}, ${sq(slug)}, ${sq(desc)}, ${price}, ${stock}, ${sq('https://picsum.photos/seed/' + slug + '/600/450')});`);
    }
  }
  out.push(`INSERT OR IGNORE INTO users(name, email, phone, password_hash, role, email_verified, phone_verified, force_password_change) VALUES ('Store Administrator', 'admin@cstore.com', '+31000000000', ${sq(hash)}, 'admin', 1, 1, 1);`);
  out.push('COMMIT;');
  require('fs').writeFileSync(__dirname + '/../migrations/0002_seed.sql', out.join('\n') + '\n');
  console.log('seed written:', out.length, 'statements');
})();
