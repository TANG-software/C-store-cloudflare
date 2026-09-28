// C Store Workers — storefront routes: home, shop, product, cart, help.
import { Hono } from 'hono';
import { q, flash, writeSigned } from '../lib.js';
import * as views from '../views/shop.js';

const shop = new Hono();

shop.get('/', async (c) => {
  const categories = await q.all(c, 'SELECT * FROM categories ORDER BY id');
  const featured = await q.all(c, `SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id WHERE p.active = 1 ORDER BY (p.id * 7) % 13 LIMIT 8`);
  const newest = await q.all(c, `SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id WHERE p.active = 1 ORDER BY p.id DESC LIMIT 8`);
  const stats = {
    orders: (await q.first(c, "SELECT COUNT(*) AS n FROM orders WHERE status IN ('paid', 'shipped')")).n,
    customers: (await q.first(c, "SELECT COUNT(*) AS n FROM users WHERE role = 'customer'")).n,
    products: (await q.first(c, 'SELECT COUNT(*) AS n FROM products WHERE active = 1')).n,
  };
  const cardRows = await q.all(c, 'SELECT * FROM homepage_cards ORDER BY section, sort, id');
  const cards = { feature: [], review: [], pay: [] };
  for (const row of cardRows) if (cards[row.section]) cards[row.section].push(row);
  return c.html(views.home(c.get('ctx'), { categories, featured, newest, stats, cards }));
});

shop.get('/shop', async (c) => {
  const qstr = c.req.query('q') || '';
  const catSlug = c.req.query('category') || '';
  const categories = await q.all(c, 'SELECT * FROM categories ORDER BY id');
  const cat = catSlug ? await q.first(c, 'SELECT * FROM categories WHERE slug = ?', catSlug) : null;
  let products;
  if (qstr) {
    products = await q.all(c, `SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id WHERE p.active = 1 AND (p.name LIKE ? OR p.description LIKE ?) ORDER BY p.id DESC`, `%${qstr}%`, `%${qstr}%`);
  } else if (cat) {
    products = await q.all(c, `SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id WHERE p.active = 1 AND p.category_id = ? ORDER BY p.id DESC`, cat.id);
  } else {
    products = await q.all(c, `SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id WHERE p.active = 1 ORDER BY p.id DESC`);
  }
  return c.html(views.shop(c.get('ctx'), { categories, cat, products, q: qstr }));
});

shop.get('/product/:slug', async (c) => {
  const p = await q.first(c, `SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p JOIN categories c ON c.id = p.category_id WHERE p.slug = ? AND p.active = 1`, c.req.param('slug'));
  if (!p) return c.notFound();
  const category = await q.first(c, 'SELECT * FROM categories WHERE id = ?', p.category_id);
  const related = await q.all(c, `SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id WHERE p.active = 1 AND p.category_id = ? AND p.id != ? LIMIT 4`, p.category_id, p.id);
  return c.html(views.product(c.get('ctx'), { p, category, related }));
});

shop.get('/cart', async (c) => {
  const details = await c.get('helpers').cartDetails(c);
  return c.html(views.cart(c.get('ctx'), { details }));
});

shop.post('/cart/add', async (c) => {
  const body = await c.req.parseBody();
  const id = Number(body.product_id);
  const qty = Math.min(Math.max(Number(body.qty) || 1, 1), 10);
  const p = await q.first(c, 'SELECT id, stock FROM products WHERE id = ? AND active = 1', id);
  if (!p || p.stock < 1) { await flash(c, 'error', 'That product is not available.'); return c.redirect(body.redirect || '/cart'); }
  const sess = c.get('session');
  const cur = Number(sess.cart?.[id] || 0);
  sess.cart = { ...sess.cart, [id]: Math.min(cur + qty, Math.min(p.stock, 99)) };
  await writeSigned(c, 'cstore_session', sess);
  await flash(c, 'success', 'Added to cart.');
  return c.redirect(body.redirect || '/cart');
});

shop.post('/cart/update', async (c) => {
  const body = await c.req.parseBody();
  const sess = c.get('session');
  const ids = Object.keys(sess.cart || {});
  for (const id of ids) {
    const raw = body[`qty[${id}]`];
    const newQty = Math.min(Math.max(Number(raw) === 0 || raw ? Number(raw) : sess.cart[id], 0), 99);
    if (newQty <= 0) delete sess.cart[id];
    else sess.cart[id] = newQty;
  }
  await writeSigned(c, 'cstore_session', sess);
  return c.redirect('/cart');
});

shop.get('/cart/remove/:id', async (c) => {
  const sess = c.get('session');
  delete sess.cart?.[c.req.param('id')];
  await writeSigned(c, 'cstore_session', sess);
  return c.redirect('/cart');
});

shop.get('/help', (c) => c.html(views.help(c.get('ctx'))));

export default shop;
