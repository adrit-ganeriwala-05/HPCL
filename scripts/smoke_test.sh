#!/usr/bin/env bash
# End-to-end API smoke test against an ISOLATED database.
#
#   scripts/smoke_test.sh                 # full run: recreate test DB, start API on :8081, seed, test, stop
#   KEEP_SERVER=1 scripts/smoke_test.sh   # leave the API running afterwards (e.g. for browser tests)
#   OUT_DIR=/some/dir scripts/smoke_test.sh
#
# Never touches .env and never connects to the dev database: every setting
# the API needs is passed as an environment variable. godotenv (used by
# config.Load) does not overwrite variables that already exist, so the
# values below win over .env. APP_ENV and the Gmail/Google variables are
# exported as EMPTY strings rather than left unset — left unset, godotenv
# would fill them from .env; empty, config.getEnv treats them as unset and
# falls back to development mode (http cookies) and the log-only mailer.
#
# Requires: local Postgres (trust auth for hpcl_app), go, curl, jq, psql, uuidgen.

set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT/services/api"
OUT="${OUT_DIR:-${TMPDIR:-/tmp}/hpcl-smoke}"
mkdir -p "$OUT"
TEST_DB=jpganeriwala_hpcl_test
DB_USER=hpcl_app
PORT=8081
BASE="http://localhost:$PORT/api"
LOG="$OUT/server.log"
RESULTS="$OUT/results.tsv"
ADMIN_EMAIL=admin@smoke.test
ADMIN_PASS=AdminPass123
TODAY=$(date +%F)

: > "$RESULTS"
PASS=0
FAIL=0
SERVER_PID=""

# ---------- helpers ---------------------------------------------------------

sql() { psql -h localhost -U "$DB_USER" -d "$TEST_DB" -w -Atc "$1"; }

# record AREA TEST EXPECTED ACTUAL
record() {
  local area=$1 test=$2 expected=$3 actual=$4 verdict
  if [ "$expected" == "$actual" ]; then verdict=PASS; PASS=$((PASS + 1)); else verdict=FAIL; FAIL=$((FAIL + 1)); fi
  printf '%s\t%s\t%s\t%s\t%s\n' "$area" "$test" "$expected" "$actual" "$verdict" >> "$RESULTS"
  printf '%-4s  %-12s %s  (expected: %s | actual: %s)\n' "$verdict" "[$area]" "$test" "$expected" "$actual"
}

# req JAR METHOD PATH [JSON] — sets STATUS and BODY. JAR "-" = no cookies.
# Extra curl args can be put in the EXTRA array for one call.
EXTRA=()
req() {
  local jar=$1 method=$2 path=$3 data=${4:-}
  local args=(-s -o "$OUT/body" -w '%{http_code}' -X "$method" -H 'Content-Type: application/json')
  if [ "$jar" != "-" ]; then args+=(-b "$jar" -c "$jar"); fi
  if [ -n "$data" ]; then args+=(--data "$data"); fi
  if [ ${#EXTRA[@]} -gt 0 ]; then args+=("${EXTRA[@]}"); fi
  STATUS=$(curl "${args[@]}" "$BASE$path")
  BODY=$(cat "$OUT/body")
  EXTRA=()
}
j() { printf '%s' "$BODY" | jq -r "$1" 2>/dev/null; }
uuid() { uuidgen | tr 'A-Z' 'a-z'; }

# Login is rate-limited to ~1 request / 2 s per IP — space logins out.
login() {
  local jar=$1 email=$2 pass=$3
  sleep 2.1
  req "$jar" POST /auth/login "{\"email\":\"$email\",\"password\":\"$pass\"}"
}

# Last OTP code the log-only mailer wrote for an address.
otp_code() {
  grep "\"to\":\"$1\"" "$LOG" | tail -1 | grep -oE 'verification code is [0-9]{6}' | grep -oE '[0-9]{6}'
}

stock_of() { sql "select coalesce((select quantity_units from inventory_stocks where product_id=$1 and size_in_liters=$2),0)"; }

cleanup() {
  if [ -n "$SERVER_PID" ] && [ -z "${KEEP_SERVER:-}" ]; then
    kill "$SERVER_PID" 2>/dev/null
    wait "$SERVER_PID" 2>/dev/null
    echo "API server stopped."
  fi
}
trap cleanup EXIT

# ---------- setup -----------------------------------------------------------

echo "== setup: recreate $TEST_DB, build, start API on :$PORT =="
if lsof -ti tcp:$PORT >/dev/null 2>&1; then
  echo "port $PORT already in use — stop whatever is on it first" >&2
  exit 1
fi
psql -h localhost -d postgres -w -v ON_ERROR_STOP=1 -q \
  -c "DROP DATABASE IF EXISTS $TEST_DB WITH (FORCE)" \
  -c "CREATE DATABASE $TEST_DB OWNER $DB_USER" || exit 1

(cd "$API_DIR" && go build -o "$OUT/api-server" ./cmd/server && go build -o "$OUT/api-seed" ./cmd/seed) || exit 1

export DATABASE_URL="host=localhost user=$DB_USER dbname=$TEST_DB port=5432 sslmode=disable"
export PORT CLIENT_ORIGIN="${CLIENT_ORIGIN:-http://localhost:$PORT}"
export JWT_SECRET=test-secret OTP_PEPPER=test-pepper
export APP_ENV="" GMAIL_SMTP_USER="" GMAIL_SMTP_APP_PASSWORD="" GOOGLE_CLIENT_ID=""
export GIN_MODE=release

(cd "$API_DIR" && exec "$OUT/api-server") > "$LOG" 2>&1 &
SERVER_PID=$!
for _ in $(seq 1 50); do
  curl -s "$BASE/health" >/dev/null 2>&1 && break
  sleep 0.2
done

(cd "$API_DIR" && "$OUT/api-seed" -name "Smoke Admin" -email "$ADMIN_EMAIL" -password "$ADMIN_PASS") >> "$OUT/seed.log" 2>&1
record setup "seed admin lands in the TEST database" "1" "$(sql "select count(*) from users where email='$ADMIN_EMAIL' and role='admin'")"

A_JAR=$OUT/clientA.jar; A2_JAR=$OUT/clientA_login.jar; B_JAR=$OUT/clientB.jar
ADMIN=$OUT/admin.jar; E1=$OUT/emp1.jar; E2=$OUT/emp2.jar; OTP_JAR=$OUT/otp.jar
rm -f "$OUT"/*.jar

# ---------- health ----------------------------------------------------------

req - GET /health
record health "GET /api/health" "200 ok" "$STATUS $(j .status)"

# ---------- auth ------------------------------------------------------------

req "$A_JAR" POST /auth/register '{"name":"Client A","email":"a@smoke.test","password":"ClientPass1","companyName":"A Steel","phone":"+91 98765 43210"}'
record auth "register client A" "201 client" "$STATUS $(j .user.role)"
A_ID=$(j .user.id)
record auth "register stores client row + phone in DB" "client|+91 98765 43210" "$(sql "select role||'|'||coalesce(phone,'') from users where id=$A_ID")"

req "$B_JAR" POST /auth/register '{"name":"Client B","email":"b@smoke.test","password":"ClientPass1"}'
record auth "register client B" "201" "$STATUS"
B_ID=$(j .user.id)

login "$ADMIN" "$ADMIN_EMAIL" "$ADMIN_PASS"
record auth "admin login" "200 admin" "$STATUS $(j .user.role)"

req "$ADMIN" POST /employees '{"name":"Emp Full","email":"e1@smoke.test","password":"EmpPass123","canCreateOrders":true,"canManageOrderStatus":true,"canManageProducts":true,"canViewLeads":true,"canManageInventory":true}'
record auth "admin creates employee with all permissions" "201" "$STATUS"
E1_ID=$(j .id)
req "$ADMIN" POST /employees '{"name":"Emp None","email":"e2@smoke.test","password":"EmpPass123"}'
record auth "admin creates employee with no permissions" "201" "$STATUS"
E2_ID=$(j .id)

login "$E1" e1@smoke.test EmpPass123
record auth "employee login" "200 employee" "$STATUS $(j .user.role)"
login "$E2" e2@smoke.test EmpPass123

login "$A2_JAR" a@smoke.test ClientPass1
record auth "client login (password)" "200 client" "$STATUS $(j .user.role)"

req "$A2_JAR" GET /auth/me
record auth "GET /auth/me returns the caller" "200 a@smoke.test" "$STATUS $(j .email // .user.email)"

TOKEN_BEFORE_LOGOUT=$(awk '$6=="token"{print $7}' "$A2_JAR")
req "$A2_JAR" POST /auth/logout
req "$A2_JAR" GET /auth/me
record auth "logout clears the session (cookie jar)" "401" "$STATUS"
EXTRA=(-H "Cookie: token=$TOKEN_BEFORE_LOGOUT")
req - GET /auth/me
record auth "old token replayed after logout" "401" "$STATUS"
login "$A2_JAR" a@smoke.test ClientPass1
req "$A2_JAR" GET /auth/me
record auth "logging in again after logout works" "200" "$STATUS"
# Logout ends every session for that user, so client A's original session
# (from registration, a different "device") is dead too. Carry on as A with
# the fresh login.
req "$A_JAR" GET /auth/me
record auth "logout also ends the user's other sessions" "401" "$STATUS"
cp "$A2_JAR" "$A_JAR"

login - a@smoke.test WrongPassword
record auth "wrong password" "401" "$STATUS"

# ---------- security --------------------------------------------------------

LEADS_BEFORE=$(sql "select count(*) from leads")
EXTRA=(-H "Origin: http://evil.example")
req - POST /leads '{"name":"Evil","phone":"9876543210"}'
record security "POST with Origin: http://evil.example" "403" "$STATUS"
record security "cross-site POST created nothing" "$LEADS_BEFORE" "$(sql "select count(*) from leads")"

for p in "GET /orders" "GET /inventory" "GET /profile/addresses" "POST /products" "GET /clients"; do
  req - ${p% *} "${p#* }" '{}'
  record security "logged out: $p" "401" "$STATUS"
done

for p in "GET /leads" "GET /employees" "GET /clients" "GET /inventory" "GET /inventory/transactions"; do
  req "$A_JAR" ${p% *} "${p#* }"
  record security "client calls staff route: $p" "403" "$STATUS"
done
req "$A_JAR" POST /products '{"name":"X","category":"Grease"}'
record security "client calls staff route: POST /products" "403" "$STATUS"

for p in "GET /leads" "GET /clients" "GET /inventory" "GET /employees"; do
  req "$E2" ${p% *} "${p#* }"
  record security "employee without permission: $p" "403" "$STATUS"
done

req "$E1" GET /leads
record security "employee with canViewLeads: GET /leads" "200" "$STATUS"
req "$ADMIN" PATCH "/employees/$E1_ID/permissions" '{"canCreateOrders":true,"canManageOrderStatus":true,"canManageProducts":true,"canViewLeads":false,"canManageInventory":true}'
req "$E1" GET /leads
record security "revoked canViewLeads applies on the very next request" "403" "$STATUS"
req "$ADMIN" PATCH "/employees/$E1_ID/permissions" '{"canCreateOrders":true,"canManageOrderStatus":true,"canManageProducts":true,"canViewLeads":true,"canManageInventory":true}'
req "$E1" GET /leads
record security "restored permission applies on the next request" "200" "$STATUS"

# ---------- products --------------------------------------------------------

req - GET /products
record products "public product list" "200 array" "$STATUS $(j 'type')"

req "$E1" POST /products '{"name":"Smoke Temp Grade","category":"Grease"}'
record products "staff with canManageProducts creates" "201" "$STATUS"
TMP_PID=$(j .id)
req "$E1" PUT "/products/$TMP_PID" '{"name":"Smoke Temp Grade v2","category":"Grease"}'
record products "staff with canManageProducts updates" "200 Smoke Temp Grade v2" "$STATUS $(j .name)"
req "$E2" PUT "/products/$TMP_PID" '{"name":"hijack","category":"Grease"}'
record products "employee without permission can't update" "403" "$STATUS"
req "$E2" DELETE "/products/$TMP_PID"
record products "employee without permission can't delete" "403" "$STATUS"
req "$E1" DELETE "/products/$TMP_PID"
record products "staff with canManageProducts deletes" "204" "$STATUS"
record products "delete = soft delete + inactive in DB" "f|t" "$(sql "select is_active::text::char||'|'||(deleted_at is not null)::text::char from products where id=$TMP_PID")"
req - GET "/products/$TMP_PID"
record products "deleted product no longer served" "404" "$STATUS"

req "$ADMIN" POST /products '{"name":"Smoke Hydraulic 68","category":"Hydraulic / Industrial Oil"}'
P1=$(j .id)
req "$ADMIN" POST /products '{"name":"Smoke Gear 90","category":"Gear Oil"}'
P2=$(j .id)

# ---------- orders ----------------------------------------------------------

req "$E1" POST /orders "{\"clientId\":$A_ID,\"items\":[{\"productId\":$P1,\"sizeInLiters\":20,\"quantity\":2,\"rate\":150}]}"
record orders "employee creates order for client" "201 Pending Approval" "$STATUS $(j .status)"
O1=$(j .id)
record orders "employee order keeps staff rate (2 x 150)" "300.00" "$(sql "select total_amount from orders where id=$O1")"

req "$E1" PATCH "/orders/$O1/status" '{"status":"Quote Sent"}'
record orders "status change before approval" "409" "$STATUS"
record orders "...status unchanged in DB" "Pending Approval" "$(sql "select status from orders where id=$O1")"
req "$E1" POST "/orders/$O1/approve"
record orders "employee can't approve (admin only)" "403" "$STATUS"
req "$ADMIN" POST "/orders/$O1/approve"
record orders "admin approve -> New" "200 New" "$STATUS $(j .status)"
record orders "...approved_by recorded" "1" "$(sql "select count(*) from orders where id=$O1 and approved_by_id is not null")"

req "$A_JAR" POST /orders "{\"items\":[{\"productId\":$P1,\"sizeInLiters\":20,\"quantity\":3,\"rate\":999},{\"productId\":$P2,\"sizeInLiters\":210,\"quantity\":1,\"rate\":5000}]}"
record orders "client creates own order" "201 New" "$STATUS $(j .status)"
OA=$(j .id)
record orders "client-submitted rates forced to 0 (every line)" "0" "$(sql "select count(*) from order_items where order_id=$OA and rate<>0")"
record orders "...and total_amount is 0" "0.00" "$(sql "select total_amount from orders where id=$OA")"

req "$B_JAR" POST /orders "{\"items\":[{\"productId\":$P2,\"sizeInLiters\":210,\"quantity\":1,\"rate\":0}]}"
OB=$(j .id)
req "$A_JAR" GET /orders
record orders "client list shows only own orders" "true" "$(j "all(.[]; .clientId == $A_ID)")"
record orders "...and all of them" "$(sql "select count(*) from orders where client_id=$A_ID")" "$(j 'length')"
req "$A_JAR" GET "/orders/$OB"
record orders "client can't open another client's order" "404" "$STATUS"

req "$E1" POST "/orders/$O1/notes" '{"text":"client negotiating hard, do not drop below 140"}'
record orders "staff adds internal note" "200" "$STATUS"
req "$ADMIN" GET "/orders/$O1"
record orders "staff sees internal note" "true" "$(j '.internalNotes | length > 0')"
req "$A_JAR" GET "/orders/$O1"
record orders "client GET /orders/:id hides internal notes" "" "$(j .internalNotes)"
req "$A_JAR" GET /orders
record orders "client GET /orders hides internal notes" "true" "$(j 'all(.[]; .internalNotes == "")')"

# ---------- inventory + dispatch -------------------------------------------

T1=$(uuid)
req "$E1" POST /inventory/inward/sync "{\"entries\":[{\"clientTxnId\":\"$T1\",\"productId\":$P1,\"sizeInLiters\":20,\"quantityUnits\":10,\"entryDate\":\"$TODAY\"}]}"
record inventory "inward sync" "200 ok" "$STATUS $(j '.results[0].status')"
record inventory "...stock = 10" "10" "$(stock_of "$P1" 20)"
req "$E1" POST /inventory/inward/sync "{\"entries\":[{\"clientTxnId\":\"$T1\",\"productId\":$P1,\"sizeInLiters\":20,\"quantityUnits\":10,\"entryDate\":\"$TODAY\"}]}"
record inventory "same clientTxnId replayed" "200 ok" "$STATUS $(j '.results[0].status')"
record inventory "...stock rises only once" "10" "$(stock_of "$P1" 20)"
record inventory "...one ledger row for that txn" "1" "$(sql "select count(*) from inventory_transactions where client_txn_id='$T1'")"

req "$ADMIN" PATCH "/orders/$O1/status" '{"status":"Dispatched"}'
record dispatch "dispatch order (2 x 20 L)" "200 Dispatched" "$STATUS $(j .status)"
record dispatch "...stock 10 -> 8" "8" "$(stock_of "$P1" 20)"
record dispatch "...outward ledger row for the order" "outward|2" "$(sql "select txn_type||'|'||quantity_units from inventory_transactions where order_id=$O1")"

req "$ADMIN" POST /orders "{\"clientId\":$A_ID,\"items\":[{\"productId\":$P1,\"sizeInLiters\":20,\"quantity\":50,\"rate\":100}]}"
OBIG=$(j .id)
req "$ADMIN" PATCH "/orders/$OBIG/status" '{"status":"Dispatched"}'
record dispatch "dispatch with insufficient stock" "409" "$STATUS"
record dispatch "...order status unchanged" "New" "$(sql "select status from orders where id=$OBIG")"
record dispatch "...stock unchanged" "8" "$(stock_of "$P1" 20)"
record dispatch "...no outward row written" "0" "$(sql "select count(*) from inventory_transactions where order_id=$OBIG")"

req "$ADMIN" PATCH "/orders/$O1/status" '{"status":"New"}'
record transitions "Dispatched -> New rejected" "409" "$STATUS"
req "$ADMIN" PATCH "/orders/$O1/status" '{"status":"Delivered"}'
record transitions "Dispatched -> Delivered allowed" "200" "$STATUS"
req "$ADMIN" PATCH "/orders/$O1/status" '{"status":"Dispatched"}'
record transitions "Delivered -> Dispatched rejected" "409" "$STATUS"
record transitions "...no second deduction" "8" "$(stock_of "$P1" 20)"
req "$ADMIN" PATCH "/orders/$OBIG/status" '{"status":"Delivered"}'
record transitions "skipped step New -> Delivered rejected" "409" "$STATUS"
BEFORE_TS=$(sql "select updated_at from orders where id=$OBIG")
req "$ADMIN" PATCH "/orders/$OBIG/status" '{"status":"New"}'
record transitions "same status is a 200 no-op" "200" "$STATUS"
record transitions "...row not rewritten (updated_at same)" "$BEFORE_TS" "$(sql "select updated_at from orders where id=$OBIG")"

req "$ADMIN" POST /orders "{\"clientId\":$A_ID,\"items\":[{\"productId\":$P1,\"sizeInLiters\":20,\"quantity\":2,\"rate\":100}]}"
OD=$(j .id)
req "$A_JAR" POST "/orders/$OD/confirm-delivery"
record delivery "client confirms a New (not Dispatched) order" "409" "$STATUS"
req "$ADMIN" PATCH "/orders/$OD/status" '{"status":"Dispatched"}'
req "$B_JAR" POST "/orders/$OD/confirm-delivery"
record delivery "other client confirms someone else's order" "404" "$STATUS"
req "$ADMIN" POST "/orders/$OD/confirm-delivery"
record delivery "staff can't use client confirm-delivery" "403" "$STATUS"
req "$A_JAR" POST "/orders/$OD/confirm-delivery"
record delivery "client confirms own Dispatched order" "200 Delivered" "$STATUS $(j .status)"
req "$A_JAR" POST "/orders/$OD/confirm-delivery"
record delivery "confirming twice" "409" "$STATUS"

STOCK_NOW=$(stock_of "$P1" 20)   # 8 - 2 = 6
TXN1=$(sql "select id from inventory_transactions where client_txn_id='$T1'")
req "$ADMIN" PATCH "/inventory/transactions/$TXN1" "{\"quantityUnits\":12,\"entryDate\":\"$TODAY\"}"
record ledger "admin corrects inward 10 -> 12" "200" "$STATUS"
record ledger "...balance moves by the difference (+2)" "$((STOCK_NOW + 2))" "$(stock_of "$P1" 20)"
req "$ADMIN" PATCH "/inventory/transactions/$TXN1" "{\"quantityUnits\":1,\"entryDate\":\"$TODAY\"}"
record ledger "correction that would go negative" "409" "$STATUS"
record ledger "...balance unchanged" "$((STOCK_NOW + 2))" "$(stock_of "$P1" 20)"
record ledger "...ledger row unchanged" "12" "$(sql "select quantity_units from inventory_transactions where id=$TXN1")"
req "$E1" PATCH "/inventory/transactions/$TXN1" "{\"quantityUnits\":11,\"entryDate\":\"$TODAY\"}"
record ledger "employee can't correct the ledger" "403" "$STATUS"

# ---------- concurrency -----------------------------------------------------

CONC_OK=0
for i in $(seq 1 10); do
  have=$(stock_of "$P2" 50)
  if [ "$have" -lt 10 ]; then
    req "$E1" POST /inventory/inward/sync "{\"entries\":[{\"clientTxnId\":\"$(uuid)\",\"productId\":$P2,\"sizeInLiters\":50,\"quantityUnits\":$((10 - have)),\"entryDate\":\"$TODAY\"}]}"
  fi
  start=$(stock_of "$P2" 50)
  req "$E1" POST /orders "{\"clientId\":$A_ID,\"items\":[{\"productId\":$P2,\"sizeInLiters\":50,\"quantity\":6,\"rate\":10}]}"; X=$(j .id)
  req "$ADMIN" POST "/orders/$X/approve"
  req "$E1" POST /orders "{\"clientId\":$B_ID,\"items\":[{\"productId\":$P2,\"sizeInLiters\":50,\"quantity\":6,\"rate\":10}]}"; Y=$(j .id)
  req "$ADMIN" POST "/orders/$Y/approve"

  # Wait on these two curls only — a bare `wait` would also wait for the
  # API server, which is a background child of this script too.
  pids=()
  for o in "$X" "$Y"; do
    curl -s -o /dev/null -w '%{http_code}' -b "$ADMIN" -X PATCH -H 'Content-Type: application/json' \
      --data '{"status":"Dispatched"}' "$BASE/orders/$o/status" > "$OUT/conc_$o" &
    pids+=($!)
  done
  wait "${pids[@]}"
  codes=$(cat "$OUT/conc_$X" "$OUT/conc_$Y" | fold -w3 | sort | paste -sd' ' -)
  end=$(stock_of "$P2" 50)
  outward=$(sql "select count(*) from inventory_transactions where order_id in ($X,$Y)")
  dispatched=$(sql "select count(*) from orders where id in ($X,$Y) and status='Dispatched'")
  actual="codes=[$codes] stock $start->$end outward=$outward dispatched=$dispatched"
  record concurrency "run $i: 2 parallel dispatches of 6 against stock $start" "codes=[200 409] stock 10->4 outward=1 dispatched=1" "$actual"
  [ "$actual" == "codes=[200 409] stock 10->4 outward=1 dispatched=1" ] && CONC_OK=$((CONC_OK + 1))
done
record concurrency "stock never negative across all runs" "0" "$(sql "select count(*) from inventory_stocks where quantity_units < 0")"

# ---------- reorder ---------------------------------------------------------

req "$A_JAR" POST "/orders/$OA/reorder"
record reorder "client reorders an order with a 20 L line" "201" "$STATUS"
NEW=$(j .id)
record reorder "...new order's lines keep their sizes (20, 210)" "20.00,210.00" "$(sql "select string_agg(size_in_liters::text, ',' order by size_in_liters) from order_items where order_id=$NEW")"
record reorder "...rates still zeroed for client" "0" "$(sql "select count(*) from order_items where order_id=$NEW and rate<>0")"

# ---------- addresses -------------------------------------------------------

req "$A_JAR" POST /profile/addresses '{"label":"Main Warehouse","line1":"Plot 14","city":"Durgapur","state":"West Bengal","pincode":"713212","isDefault":true}'
record addresses "create address 1 (default)" "201" "$STATUS"
AD1=$(j .id)
req "$A_JAR" POST /profile/addresses '{"label":"Site Office","line1":"Gate 2","city":"Andal","state":"West Bengal","pincode":"713321"}'
record addresses "create address 2" "201" "$STATUS"
AD2=$(j .id)
req "$A_JAR" GET /profile/addresses
record addresses "list shows both, default first" "2 $AD1" "$(j 'length') $(j '.[0].id')"
req "$A_JAR" PUT "/profile/addresses/$AD2" '{"label":"Site Office (Andal)","line1":"Gate 2","city":"Andal","state":"West Bengal","pincode":"713321","isDefault":false}'
record addresses "update address" "200 Site Office (Andal)" "$STATUS $(j .label)"
req "$A_JAR" PUT "/profile/addresses/$AD2" '{"label":"Site Office (Andal)","line1":"Gate 2","city":"Andal","state":"West Bengal","pincode":"713321","isDefault":true}'
record addresses "make address 2 default" "200" "$STATUS"
record addresses "...exactly one default and it's address 2" "1 $AD2" "$(sql "select count(*)||' '||max(id) from addresses where user_id=$A_ID and is_default and deleted_at is null")"

req "$B_JAR" GET /profile/addresses
record addresses "client B's list doesn't include A's addresses" "0" "$(j 'length')"
req "$B_JAR" PUT "/profile/addresses/$AD1" '{"label":"stolen","line1":"x","city":"x","state":"x","pincode":"000000"}'
record addresses "client B can't update A's address" "404" "$STATUS"
req "$B_JAR" DELETE "/profile/addresses/$AD1"
record addresses "client B can't delete A's address" "404" "$STATUS"
record addresses "...A's address untouched" "Main Warehouse" "$(sql "select label from addresses where id=$AD1 and deleted_at is null")"

req "$A_JAR" DELETE "/profile/addresses/$AD1"
record addresses "client deletes own address" "204" "$STATUS"
req "$A_JAR" GET /profile/addresses
record addresses "...list now has 1" "1" "$(j 'length')"

# ---------- leads -----------------------------------------------------------

req - POST /leads '{"name":"Walk-in Buyer","phone":"9876543210","company":"Durgapur Mills","details":"Need 10 drums"}'
record leads "public lead POST" "201" "$STATUS"
LEAD_ID=$(j .lead.id)
req "$E1" GET /leads
record leads "staff with canViewLeads sees it" "true" "$(j "any(.[]; .id == $LEAD_ID)")"
req - POST /leads '{"name":"Bad","phone":"abc"}'
record leads "lead with invalid phone rejected" "400" "$STATUS"

# ---------- deactivation (last, so E2 is not needed afterwards) ------------

req "$ADMIN" PATCH "/employees/$E2_ID/status" '{"isActive":false}'
record auth "admin deactivates employee" "200" "$STATUS"
req "$E2" GET /auth/me
record auth "deactivated employee rejected on next request" "401" "$STATUS"
login - e2@smoke.test EmpPass123
record auth "deactivated employee can't log in again" "403|401" "$( [ "$STATUS" = 403 ] || [ "$STATUS" = 401 ] && echo '403|401' || echo "$STATUS")"

# ---------- OTP (per-IP limit is 3 requests/hour, so exactly 3 then a 4th) --

req - POST /auth/otp/request '{"email":"otp1@smoke.test"}'
record otp "request code #1" "200" "$STATUS"
sleep 0.5
CODE=$(otp_code otp1@smoke.test)
record otp "code appears in server log (log-only mailer)" "6 digits" "$( [[ "$CODE" =~ ^[0-9]{6}$ ]] && echo '6 digits' || echo "'$CODE'")"
sleep 2.1
req "$OTP_JAR" POST /auth/otp/verify "{\"email\":\"otp1@smoke.test\",\"code\":\"$CODE\"}"
record otp "verify logs in (new client)" "200 client" "$STATUS $(j .user.role)"
req "$OTP_JAR" GET /auth/me
record otp "...session works" "200" "$STATUS"

sleep 2.1
req - POST /auth/otp/request '{"email":"otp2@smoke.test"}'
record otp "request code #2" "200" "$STATUS"
sleep 0.5
GOOD=$(otp_code otp2@smoke.test)
WRONG=$(printf '%06d' $(( (10#$GOOD + 1) % 1000000 )))
codes=""
for k in 1 2 3 4 5; do
  sleep 2.1
  req - POST /auth/otp/verify "{\"email\":\"otp2@smoke.test\",\"code\":\"$WRONG\"}"
  codes="$codes $STATUS"
done
record otp "5 wrong codes: 4x401 then locked" " 401 401 401 401 423" "$codes"
sleep 2.1
req - POST /auth/otp/verify "{\"email\":\"otp2@smoke.test\",\"code\":\"$GOOD\"}"
record otp "correct code after lock is still refused" "423" "$STATUS"

sleep 2.1
req - POST /auth/otp/request '{"email":"otp2@smoke.test"}'
record otp "request code #3" "200" "$STATUS"
sleep 2.1
req - POST /auth/otp/request '{"email":"otp3@smoke.test"}'
record otp "4th request in the hour" "429" "$STATUS"

# ---------- server log hygiene ---------------------------------------------

# Every refusal above (409s, 401s, 403s, 423s, 429s) is an expected outcome;
# none of them should show up as an error-level log line.
record logs "no error-level lines in the server log" "0" "$(grep -c '"level":"error"' "$LOG")"
record logs "insufficient-stock refusals logged at info (1 + 10 concurrency losers)" "11" "$(grep -c 'dispatch refused: insufficient stock' "$LOG")"

# ---------- summary ---------------------------------------------------------

echo
echo "== $PASS passed, $FAIL failed (concurrency: $CONC_OK/10 clean runs) =="
echo "results: $RESULTS"
echo "server log: $LOG"
[ "$FAIL" -eq 0 ]
