# C Store — Cloudflare Workers Edition 🛍️⚡

The same C Store (Netherlands e-commerce, EUR incl. 21% VAT, PayPal + 4 crypto options,
mandatory email + phone verification, admin-first login) — rebuilt to run natively on
**Cloudflare Workers with a D1 database**.

Why this edition exists:

- **Never sleeps** — Workers run per-request; there is no idle spin-down.
- **Free tier allows commercial use** — 100,000 requests/day free (unlike Vercel's Hobby plan).
- **Custom subdomain free** — any domain on your Cloudflare account, e.g. `shop.yourdomain.com`.
- **No server to manage** — no VPS, no PM2, no Node process.

## Stack

- **Runtime:** Cloudflare Workers (Hono router)
- **Database:** Cloudflare D1 (SQLite at the edge) with migrations
- **Sessions:** signed cookies (HttpOnly, SameSite=Lax) — no server memory needed
- **Password hashing:** PBKDF2-SHA256 via WebCrypto (100k iterations)
- **Email:** Resend HTTP API (SMTP is impossible on serverless)
- **SMS:** Twilio REST API

## Quick deploy (one-time, ~10 minutes)

Requires Node 22+ locally.

```bash
npm install
npx wrangler login
npx wrangler d1 create c-store
#  ^ copy the printed database_id into wrangler.jsonc (replace REPLACE_WITH_YOUR_DATABASE_ID)

npm run db:migrate        # creates tables + seeds admin, categories, 32 demo products
npx wrangler secret put SESSION_SECRET   # paste any long random string
npm run deploy             # → live at https://c-store.<your-subdomain>.workers.dev
```

First login: **admin@cstore.com / Admin@123** — you are forced to change it immediately.
That is the only seeded account; storefront sign-ups are always customers.

### Custom subdomain

In the Cloudflare dashboard: **Workers & Pages → c-store → Settings → Domains & Routes →
Add → Custom domain**, e.g. `shop.yourdomain.com` (the domain must be a zone in the same
Cloudflare account — free plan is fine). Then paste that URL into **Admin → Settings →
Site URL** so payment redirects and webhooks use it. No DNS knowledge needed.

### Deploy updates

Connect the repo under **Settings → Build** (Workers Builds) for automatic deploys on
every push, or run `npm run deploy` manually.

## Configuring payments — no code changes

**Admin → Payments** has a separate card per provider with its own save button; values
are stored in D1 and take effect immediately:

| Provider | Fields | Where to get them |
|---|---|---|
| PayPal | Client ID, Secret, Sandbox/Live | developer.paypal.com → My Apps |
| Coinbase Commerce | API key, webhook secret | commerce.coinbase.com → Settings → API |
| NOWPayments | API key, IPN secret | nowpayments.io → Account → API keys |
| BitPay | Merchant token, secp256k1 private key, webhook secret | BitPay dashboard → API Tokens |
| Email (Resend) | API key, from address | resend.com (free: 3,000 emails/month) |
| SMS (Twilio) | Account SID, from number, auth token | twilio.com |

Webhook URLs (shown on the same page once the Site URL is set):

- Coinbase: `https://YOUR-DOMAIN/webhooks/coinbase`
- NOWPayments: `https://YOUR-DOMAIN/webhooks/nowpayments`
- BitPay: `https://YOUR-DOMAIN/webhooks/bitpay`

### BitPay private key

Generate once and paste into Admin → Payments:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then pair it in the BitPay dashboard (Developer tab) — see BitPay's docs; BitPay also
requires business verification for live invoices.

### Direct wallet transfer (no third party)

Enter your BTC / ETH / USDT-TRC20 addresses in **Admin → Settings**; customers see QR
codes, send the payment, and submit their transaction ID. You verify it and mark the
order paid in **Admin → Orders**.

## Customer help & contact

**Admin → Settings → Contact details** (support email, phone, address) feeds the
customer-facing **/help** page and the footer of every page.

## Local development

```bash
npm run db:migrate:local   # local D1 (stored in .wrangler/state)
npm run dev                # http://localhost:8787
```

Until email/SMS keys are set, verification codes are printed to the server console —
watch them with `npx wrangler tail` (remote) or the `npm run dev` terminal (local).

An additional Node-based e2e harness (no Cloudflare account needed) is included:

```bash
bash test.sh
```

It runs the app on Node with a D1-compatible SQLite shim and verifies the whole flow
end-to-end (register → OTP → checkout → crypto payment → admin confirm → admin panel).

## Differences from the Node/Express edition (`TANG-software/C-store`)

Same features and design; these are the platform-forced changes:

- Express → Hono; SQLite → D1 (schema and seed are identical).
- Sessions: signed cookies instead of in-memory store (they even survive restarts now).
- bcrypt → PBKDF2 (WebCrypto) — bcrypt exceeds the free plan's CPU budget per request.
- Email: Resend API instead of SMTP — SMTP sockets cannot exist on Workers.
- Static CSS served via Workers Assets.

## Project structure

```
src/index.js            Hono app, middleware, request context
src/lib.js              escaping, D1 helpers, signed cookies, flash, PBKDF2, settings
src/notify.js           Resend email + Twilio SMS (dev fallback: console)
src/otp.js              6-digit codes: hash, expiry, attempts, cooldown
src/payments.js         PayPal / Coinbase / NOWPayments / BitPay / manual wallets+QR
src/routes/             shop, auth, checkout, admin, webhooks
src/views/              server-rendered HTML (template functions, same CSS)
migrations/             0001 schema · 0002 seed (admin, categories, products)
public/css/style.css    full styling (Workers Assets)
scripts/serve-local.mjs Node test harness (D1 shim) — not deployed
scripts/gen-seed.cjs    regenerates the seed migration
wrangler.jsonc          Workers config (D1 binding, assets)
```
