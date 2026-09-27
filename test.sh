#!/bin/bash
# E2E smoke test for the C Store Workers edition (runs the app on Node with a D1 shim).
set -e
cd "$(dirname "$0")"
pkill -f "serve-local.mjs" 2>/dev/null || true
sleep 0.5
rm -f /tmp/cstore-test.db
PORT=3666 node scripts/serve-local.mjs /tmp/cstore-test.db > /tmp/cstore-w.log 2>&1 &
SRV=$!
trap "kill $SRV 2>/dev/null" EXIT
sleep 2.5
B=http://localhost:3666

echo "=== 1. public pages ==="
for p in / /shop /login /register /cart /help /css/style.css; do
  printf "  %-16s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' $B$p)"
done
printf "  %-16s %s\n" "/nonexistent" "$(curl -s -o /dev/null -w '%{http_code}' $B/nonexistent) (expect 404)"

echo "=== 2. register customer ==="
curl -s -c /tmp/u1 -o /dev/null $B/register
curl -s -b /tmp/u1 -c /tmp/u1 -X POST \
  --data-urlencode "name=Test Koper" --data-urlencode "email=test@example.com" \
  --data-urlencode "phone=0612345678" --data-urlencode "password=Password1" --data-urlencode "confirm=Password1" \
  $B/register -o /dev/null -w "  register: %{http_code} -> %{redirect_url}\n"
sleep 1
CODES=$(grep -oE "Your C Store verification code is [0-9]{6}" /tmp/cstore-w.log | grep -oE "[0-9]{6}" | head -2)
EC=$(echo "$CODES" | head -1)
PC=$(echo "$CODES" | tail -1)
echo "  OTPs issued: email=$EC phone=$PC"

echo "=== 3. checkout blocked before verification ==="
SLUG=$(curl -s $B/shop | grep -o 'product/[a-z0-9-]*' | head -1)
PID=$(curl -s $B/$SLUG | grep -o 'name="product_id" value="[0-9]*"' | head -1 | grep -oE '[0-9]+')
echo "  product: $SLUG (id=$PID)"
curl -s -b /tmp/u1 -c /tmp/u1 -X POST -d "product_id=$PID&qty=2&redirect=/cart" $B/cart/add -o /dev/null
curl -s -b /tmp/u1 -o /dev/null -w "  GET /checkout unverified: %{http_code} -> %{redirect_url}\n" $B/checkout

echo "=== 4. verify email + phone ==="
curl -s -b /tmp/u1 -c /tmp/u1 -X POST -d "code=$EC" $B/verify/email -o /dev/null -w "  verify email: %{http_code} -> %{redirect_url}\n"
curl -s -b /tmp/u1 -c /tmp/u1 -X POST -d "code=$PC" $B/verify/phone -o /dev/null -w "  verify phone: %{http_code} -> %{redirect_url}\n"

echo "=== 5. admin first login + forced password change ==="
curl -s -c /tmp/adm -o /dev/null $B/login
curl -s -b /tmp/adm -c /tmp/adm -X POST -d "email=admin@cstore.com&password=Admin@123" $B/login -o /dev/null -w "  admin login: %{http_code} -> %{redirect_url}\n"
curl -s -b /tmp/adm -c /tmp/adm -o /dev/null -w "  /admin before pw change: %{http_code} -> %{redirect_url}\n" $B/admin
curl -s -b /tmp/adm -c /tmp/adm -X POST --data-urlencode "current=Admin@123" --data-urlencode "password=NewSecurePass1" --data-urlencode "confirm=NewSecurePass1" $B/change-password -o /dev/null -w "  pw change: %{http_code} -> %{redirect_url}\n"
for p in /admin /admin/products /admin/categories /admin/orders /admin/users /admin/payments /admin/settings; do
  printf "  %-20s %s\n" "$p" "$(curl -s -b /tmp/adm -o /dev/null -w '%{http_code}' $B$p)"
done

echo "=== 6. admin configures manual crypto wallets ==="
curl -s -b /tmp/adm -X POST \
  --data-urlencode "wallet_btc=bc1qtestwalletaddress1234567890abcdefghijk" \
  --data-urlencode "wallet_eth=0x1234567890AbCdEf1234567890aBcDeF12345678" \
  --data-urlencode "wallet_usdt_trc20=TTestTrc20WalletAddress12345678" \
  $B/admin/settings -o /dev/null -w "  save wallets: %{http_code} -> %{redirect_url}\n"

echo "=== 7. checkout with manual crypto ==="
curl -s -b /tmp/u1 -o /dev/null -w "  GET /checkout verified: %{http_code}\n" $B/checkout
curl -s -b /tmp/u1 -c /tmp/u1 -X POST \
  --data-urlencode "ship_name=Test Koper" --data-urlencode "ship_email=test@example.com" \
  --data-urlencode "ship_phone=+31612345678" --data-urlencode "ship_address=Keizersgracht 1" \
  --data-urlencode "ship_city=Amsterdam" --data-urlencode "ship_postal_code=1015 CJ" \
  --data-urlencode "ship_country=NL" --data-urlencode "payment_method=manual_crypto" \
  $B/checkout -o /dev/null -w "  place order: %{http_code} -> %{redirect_url}\n"
ORDER_URL=$(curl -s -b /tmp/u1 $B/account | grep -o '/order/[0-9]*' | head -1)
echo "  order in account: $ORDER_URL"
curl -s -b /tmp/u1 -o /dev/null -w "  order status page: %{http_code}\n" $B$ORDER_URL
MPAGE=${ORDER_URL#/order/}
curl -s -b /tmp/u1 -o /dev/null -w "  GET manual payment page: %{http_code}\n" $B/pay/manual_crypto/$MPAGE
curl -s -b /tmp/u1 -X POST -d "txid=4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b" $B/pay/manual_crypto/$MPAGE -o /dev/null -w "  txid submit: %{http_code} -> %{redirect_url}\n"
QR=$(curl -s -b /tmp/u1 $B/pay/manual_crypto/$MPAGE | grep -c "data:image/gif")
echo "  QR codes on pay page: $QR"

echo "=== 8. admin confirms the crypto payment ==="
AORDER=$(curl -s -b /tmp/adm $B/admin/orders | grep -o '/admin/orders/[0-9]*' | head -1)
curl -s -b /tmp/adm -o /dev/null -w "  admin order detail: %{http_code} ($AORDER)\n" $B$AORDER
curl -s -b /tmp/adm -X POST -d "status=paid" $B$AORDER/status -o /dev/null -w "  mark paid: %{http_code} -> %{redirect_url}\n"
curl -s -b /tmp/u1 $B$ORDER_URL | grep -o "Thank you — payment received" | sed 's/^/  customer sees: /'

echo "=== 9. admin payments page + PayPal keys via admin panel ==="
curl -s -b /tmp/adm -X POST --data-urlencode "section=paypal" --data-urlencode "paypal_client_id=TEST-CLIENT-ID-123" --data-urlencode "paypal_secret=TEST-SECRET-456" --data-urlencode "paypal_env=sandbox" $B/admin/payments -o /dev/null -w "  save paypal keys: %{http_code} -> %{redirect_url}\n"
curl -s -b /tmp/adm $B/admin/payments | grep -o 'badge-paid">configured<' | head -1 | sed 's/^/  status now: /'
curl -s -b /tmp/u1 -c /tmp/u1 -X POST -d "product_id=$PID&qty=1&redirect=/cart" $B/cart/add -o /dev/null
echo -n "  paypal option at checkout: " && curl -s -b /tmp/u1 $B/checkout | grep -c 'value="paypal"'
echo -n "  paypal keys pre-filled in admin: " && curl -s -b /tmp/adm $B/admin/payments | grep -c "TEST-CLIENT-ID-123"

echo "=== 9b. contact details + help page ==="
curl -s -b /tmp/adm -X POST --data-urlencode "support_email=help@cstore.nl" --data-urlencode "support_phone=+31 20 123 4567" --data-urlencode "store_address=Keizersgracht 1, 1015 CJ Amsterdam, Netherlands" $B/admin/settings -o /dev/null -w "  save contact: %{http_code} -> %{redirect_url}\n"
curl -s $B/help | grep -o "+31 20 123 4567" | head -1 | sed 's/^/  phone on \/help: /'
curl -s $B/ | grep -o "help@cstore.nl" | head -1 | sed 's/^/  footer email: /'

echo "=== 10. old admin password rejected ==="
curl -s -c /tmp/adm2 -o /dev/null $B/login
curl -s -b /tmp/adm2 -c /tmp/adm2 -X POST -d "email=admin@cstore.com&password=Admin@123" $B/login -o /dev/null -w "  old pw login: %{http_code} (expect 401)\n"

echo "=== 11. admin product create ==="
CID=$(curl -s -b /tmp/adm $B/admin/products/new | grep -o '<option value="[0-9]*"' | head -1 | grep -oE '[0-9]+')
curl -s -b /tmp/adm -X POST --data-urlencode "category_id=$CID" --data-urlencode "name=Test Product XYZ" --data-urlencode "price_eur=10.00" --data-urlencode "stock=5" --data-urlencode "active=1" --data-urlencode "image_url=https://picsum.photos/seed/test/600/450" --data-urlencode "description=Test" $B/admin/products/save -o /dev/null -w "  create product: %{http_code} -> %{redirect_url}\n"
curl -s $B/shop | grep -o "Test Product XYZ" | head -1 | sed 's/^/  visible in shop: /'

echo "=== done — server errors? ==="
if grep -q "\[error\]" /tmp/cstore-w.log; then grep -c "\[error\]" /tmp/cstore-w.log | sed 's/^/  ERRORS: /'; grep "\[error\]" /tmp/cstore-w.log | head -3; else echo "  clean (0 errors)"; fi
