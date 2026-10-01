// Local test harness ONLY (not deployed): runs the Hono app on Node with a
// better-sqlite3 shim exposing the exact D1 API the app uses.
// Uses a hand-rolled node:http adapter because @hono/node-server needs
// undici's WASM parser, unavailable in the sandbox.
import http from 'node:http';
// The sandbox cannot allocate WASM memory; Node's undici lazily initializes its
// llhttp WASM after serving a Response and crashes the process. Nothing in this
// test needs Node's fetch (the app's outbound fetch is only used for hosted
// payment providers, which the e2e test does not exercise), so swallow it.
process.on('uncaughtException', (e) => console.error('[swallowed]', e && e.message));
process.on('unhandledRejection', (e) => console.error('[swallowed-rejection]', e && (e.message || e)));
import Database from 'better-sqlite3';
import fs from 'node:fs';
import app from '../src/index.js';

export function createLocalDb(file) {
  const db = new Database(file);
  const make = (sql, args) => ({
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => {
      const info = db.prepare(sql).run(...args);
      return { meta: { last_row_id: Number(info.lastInsertRowid) } };
    },
  });
  return {
    prepare(sql) {
      const direct = make(sql, []);
      return { bind: (...args) => make(sql, args), first: direct.first, all: direct.all, run: direct.run };
    },
    exec: (sql) => db.exec(sql),
  };
}

const db = createLocalDb(process.argv[2] || '/tmp/cstore-test.db');
console.log('starting with EMPTY database (app self-bootstraps)');

const env = { DB: db, SESSION_SECRET: 'test-secret' };
const PORT = Number(process.env.PORT || 3666);
const css = fs.readFileSync(new URL('../public/css/style.css', import.meta.url));

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/css/')) {
      res.writeHead(200, { 'Content-Type': 'text/css' });
      return res.end(css);
    }
    if (req.url.startsWith('/js/')) {
      try {
        const js = fs.readFileSync(new URL('../public' + req.url.split('?')[0], import.meta.url));
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        return res.end(js);
      } catch (e) {
        res.writeHead(404);
        return res.end('not found');
      }
    }
    // serve everything else under public/ (images, icons, etc.) like the
    // production assets binding does
    const staticMatch = /^\/(img\/|favicon\.png|apple-touch-icon\.png|og-logo\.png)/.test(req.url);
    if (staticMatch) {
      try {
        const p = new URL('../public' + req.url.split('?')[0], import.meta.url);
        const buf = fs.readFileSync(p);
        const ext = p.pathname.split('.').pop().toLowerCase();
        const types = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', webp: 'image/webp', ico: 'image/x-icon' };
        res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'public, max-age=3600' });
        return res.end(buf);
      } catch (e) {
        res.writeHead(404);
        return res.end('not found');
      }
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const request = new Request(`http://localhost:${PORT}${req.url}`, {
      method: req.method,
      headers: req.headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : body,
      duplex: body ? 'half' : undefined,
    });
    const response = await app.fetch(request, env, {});
    const headers = {};
    response.headers.forEach((v, k) => { if (k !== 'set-cookie') headers[k] = v; });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) res.setHeader('set-cookie', cookies);
    res.writeHead(response.status, headers);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) {
    console.error('[adapter]', e && e.stack || e);
    res.writeHead(500);
    res.end('adapter error');
  }
});

server.listen(PORT, () => console.log(`listening on http://localhost:${PORT}`));
