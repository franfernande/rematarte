#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
DEPLOY_JSON="$REPO_ROOT/web/data/deploy.testnet.json"
NETWORK="testnet"
SMOKE_SEGUNDOS="${SMOKE_SEGUNDOS:-90}"
SMOKE_MARGIN_SEGUNDOS="${SMOKE_MARGIN_SEGUNDOS:-15}"
UNIT=10000000
MIN_PRICE=$((10 * UNIT))
MIN_INCREMENT=$((1 * UNIT))
BID_LOW=105000000
BID2=$((12 * UNIT))
ARTIST_AMOUNT=96000000
VENUE_AMOUNT=24000000

log() {
  printf '==> %s\n' "$*"
}

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

command -v stellar >/dev/null 2>&1 || die "No encuentro el CLI 'stellar' en PATH."
command -v node >/dev/null 2>&1 || die "No encuentro 'node' en PATH."
[[ "$SMOKE_SEGUNDOS" =~ ^[0-9]+$ ]] || die "SMOKE_SEGUNDOS debe ser un entero positivo."
[[ "$SMOKE_MARGIN_SEGUNDOS" =~ ^[0-9]+$ ]] || die "SMOKE_MARGIN_SEGUNDOS debe ser un entero no negativo."
(( SMOKE_SEGUNDOS >= 30 )) || die "SMOKE_SEGUNDOS es demasiado bajo para varias transacciones; usá al menos 30."
(( SMOKE_SEGUNDOS < 300 )) || die "SMOKE_SEGUNDOS debe ser menor que 300 para que la oferta dispare el anti-sniping."
[[ -f "$DEPLOY_JSON" ]] || die "No existe $DEPLOY_JSON. Primero ejecutá el deploy de Testnet."

TMP_DIR="$(mktemp -d)"
trap 'rm -rf -- "$TMP_DIR"' EXIT

json_get() {
  node -e '
    const fs = require("fs");
    const file = process.argv[1];
    const path = process.argv[2];
    let value;
    try {
      value = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
      console.error(`No pude leer JSON de deploy: ${error.message}`);
      process.exit(1);
    }
    for (const part of path.split(".")) {
      if (value === null || typeof value !== "object" || !(part in value)) {
        console.error(`Falta ${path} en el JSON de deploy`);
        process.exit(1);
      }
      value = value[part];
    }
    if (value === null || value === undefined) process.exit(1);
    if (typeof value === "object") console.log(JSON.stringify(value));
    else console.log(String(value));
  ' "$DEPLOY_JSON" "$1"
}

TIME_OFFSET=0

ledger_close_time() {
  local latest_json seq rc
  set +e
  latest_json=$(stellar ledger latest --network "$NETWORK" --output json 2>"$TMP_DIR/ledger-latest.err")
  rc=$?
  set -e
  (( rc == 0 )) || return 1
  seq=$(printf '%s' "$latest_json" | node -e '
    const fs = require("fs");
    const raw = fs.readFileSync(0, "utf8").trim();
    const data = JSON.parse(raw);
    if (!Number.isSafeInteger(data.sequence)) process.exit(1);
    console.log(String(data.sequence));
  ') || return 1
  stellar ledger fetch "$seq" --network "$NETWORK" --output json 2>"$TMP_DIR/ledger-fetch.err" | node -e '
    const fs = require("fs");
    const raw = fs.readFileSync(0, "utf8").trim();
    const data = JSON.parse(raw);
    const value = data.latestLedgerCloseTime ?? data.ledgers?.[0]?.ledgerCloseTime;
    if (typeof value === "number" && Number.isSafeInteger(value)) {
      console.log(String(value));
    } else if (typeof value === "string" && /^\d+$/.test(value)) {
      console.log(value);
    } else {
      process.exit(1);
    }
  '
}

update_time_offset() {
  local ledger_ts system_ts
  if ledger_ts=$(ledger_close_time 2>/dev/null); then
    system_ts="$(date +%s)"
    TIME_OFFSET=$((ledger_ts - system_ts))
  else
    TIME_OFFSET=0
    log "Aviso: no pude leer el timestamp del ledger; uso el reloj local con margen."
  fi
}

network_now() {
  printf '%s' $(( $(date +%s) + TIME_OFFSET ))
}

DEPLOY_NETWORK="$(json_get network)" || die "No pude leer network del deploy."
[[ "$DEPLOY_NETWORK" == "testnet" ]] || die "El deploy no es de testnet (network=$DEPLOY_NETWORK)."
CONTRACT_ID="$(json_get auctionContractId)" || die "No pude leer auctionContractId."
SAC_ID="$(json_get usdc.sacId)" || die "No pude leer usdc.sacId."
USDC_ISSUER="$(json_get usdc.issuer)" || die "No pude leer usdc.issuer."
[[ "$CONTRACT_ID" =~ ^C[A-Z2-7]{55}$ ]] || die "auctionContractId no tiene formato de contrato: $CONTRACT_ID"
[[ "$SAC_ID" =~ ^C[A-Z2-7]{55}$ ]] || die "usdc.sacId no tiene formato de contrato: $SAC_ID"
[[ "$USDC_ISSUER" =~ ^G[A-Z2-7]{55}$ ]] || die "usdc.issuer no tiene formato de cuenta: $USDC_ISSUER"

require_identity() {
  if ! stellar keys public-key "$1" >/dev/null 2>&1; then
    die "Falta la identidad '$1' en stellar keys. Ejecutá primero el deploy/setup de Testnet."
  fi
}

for identity in admin artista espacio postor1 postor2; do
  require_identity "$identity"
done

ARTIST_ADDR="$(stellar keys public-key artista)"
VENUE_ADDR="$(stellar keys public-key espacio)"
POSTOR1_ADDR="$(stellar keys public-key postor1)"
POSTOR2_ADDR="$(stellar keys public-key postor2)"

token_balance() {
  local token_id="$1"
  local account="$2"
  local out rc
  set +e
  out=$(stellar token balance --id "$token_id" --account "$account" --network "$NETWORK" --output json 2>"$TMP_DIR/token-balance.err")
  rc=$?
  set -e
  if (( rc != 0 )); then
    if [[ -n "$out" ]]; then printf '%s\n' "$out" >&2; fi
    cat "$TMP_DIR/token-balance.err" >&2
    return "$rc"
  fi
  printf '%s' "$out" | node -e '
    const fs = require("fs");
    const raw = fs.readFileSync(0, "utf8").trim();
    let data;
    try {
      data = JSON.parse(raw);
    } catch (error) {
      console.error(`Salida de token balance no es JSON: ${raw}`);
      process.exit(1);
    }
    if (data && data.error) {
      console.error(data.error.message || "token balance devolvió un error");
      process.exit(1);
    }
    if (!data || typeof data.balance !== "string" || !/^-?\d+$/.test(data.balance)) {
      console.error(`Salida de token balance sin balance entero: ${raw}`);
      process.exit(1);
    }
    process.stdout.write(data.balance);
  '
}

must_balance() {
  local token_id="$1"
  local account="$2"
  local label="$3"
  local value
  if ! value=$(token_balance "$token_id" "$account"); then
    printf 'No pude leer el balance de %s. Verificá que la cuenta exista y tenga trustline USDC.\n' "$label" >&2
    return 1
  fi
  printf '%s' "$value"
}

INVOKE_RC=0
INVOKE_STDOUT=""
INVOKE_STDERR=""
INVOKE_TX_HASH=""
TX_RECORDS=()

run_contract_invoke() {
  local source="$1"
  shift
  : >"$TMP_DIR/invoke.out"
  : >"$TMP_DIR/invoke.err"
  set +e
  stellar contract invoke \
    --contract-id "$CONTRACT_ID" \
    --source-account "$source" \
    --network "$NETWORK" \
    --auto-sign \
    -- "$@" >"$TMP_DIR/invoke.out" 2>"$TMP_DIR/invoke.err"
  INVOKE_RC=$?
  set -e
  INVOKE_STDOUT="$(cat "$TMP_DIR/invoke.out")"
  INVOKE_STDERR="$(cat "$TMP_DIR/invoke.err")"
  INVOKE_TX_HASH="$(sed -nE 's/.*[Ss]igning transaction: ([0-9a-fA-F]{64}).*/\1/p' "$TMP_DIR/invoke.err" | tail -n 1)"
}

require_invoke_success() {
  local label="$1"
  if (( INVOKE_RC != 0 )); then
    printf '%s\n' "$INVOKE_STDERR" >&2
    die "$label falló."
  fi
}

expect_contract_error() {
  local code="$1"
  local name="$2"
  local label="$3"
  if (( INVOKE_RC == 0 )); then
    die "$label debería fallar con $name (#$code), pero terminó exitosamente."
  fi
  if ! grep -Eq "Error\(Contract, #${code}\)" <<<"$INVOKE_STDERR"; then
    printf '%s\n' "$INVOKE_STDERR" >&2
    die "$label falló, pero no con $name (#$code)."
  fi
  log "OK: $label fue rechazado con $name (#$code)."
}

record_tx() {
  local label="$1"
  if [[ -n "$INVOKE_TX_HASH" ]]; then
    TX_RECORDS+=("$label|$INVOKE_TX_HASH")
  fi
}

parse_json_integer() {
  node -e '
    const fs = require("fs");
    const raw = fs.readFileSync(0, "utf8").trim();
    let value;
    try {
      value = JSON.parse(raw);
    } catch (error) {
      process.exit(1);
    }
    if (typeof value === "number" && Number.isSafeInteger(value)) {
      console.log(String(value));
    } else if (typeof value === "string" && /^-?\d+$/.test(value)) {
      console.log(value);
    } else {
      process.exit(1);
    }
  '
}

parse_end_time() {
  node -e '
    const fs = require("fs");
    const raw = fs.readFileSync(0, "utf8").trim();
    let data;
    try {
      data = JSON.parse(raw);
    } catch (error) {
      process.exit(1);
    }
    const value = data && data.end_time;
    if (typeof value === "number" && Number.isSafeInteger(value)) {
      console.log(String(value));
    } else if (typeof value === "string" && /^\d+$/.test(value)) {
      console.log(value);
    } else {
      process.exit(1);
    }
  '
}

assert_eq() {
  local got="$1"
  local expected="$2"
  local label="$3"
  if [[ "$got" != "$expected" ]]; then
    die "$label: esperado $expected, obtenido $got."
  fi
}

wait_assert_balance() {
  local token_id="$1"
  local account="$2"
  local expected="$3"
  local label="$4"
  local value attempt
  for attempt in {1..10}; do
    if value=$(token_balance "$token_id" "$account" 2>/dev/null); then
      if [[ "$value" == "$expected" ]]; then
        return 0
      fi
    fi
    sleep 1
  done
  if ! value=$(must_balance "$token_id" "$account" "$label"); then
    exit 1
  fi
  assert_eq "$value" "$expected" "$label"
}

log "Creando una subasta de humo (duración inicial ${SMOKE_SEGUNDOS}s)."
update_time_offset
NOW_BEFORE_CREATE="$(network_now)"
END_TIME=$((NOW_BEFORE_CREATE + SMOKE_SEGUNDOS))
run_contract_invoke admin create_auction \
  --artist "$ARTIST_ADDR" \
  --venue "$VENUE_ADDR" \
  --artist_bps 8000 \
  --min_price "$MIN_PRICE" \
  --min_increment "$MIN_INCREMENT" \
  --end_time "$END_TIME"
require_invoke_success "create_auction"
AUCTION_ID="$(printf '%s' "$INVOKE_STDOUT" | parse_json_integer)" || die "No pude parsear el id devuelto por create_auction: $INVOKE_STDOUT"
record_tx "create_auction#$AUCTION_ID"
log "Subasta creada con id $AUCTION_ID; cierre previsto en ledger Unix $END_TIME."

log "Leyendo balances iniciales USDC del SAC."
if ! P1_0=$(must_balance "$SAC_ID" "$POSTOR1_ADDR" "postor1"); then exit 1; fi
if ! P2_0=$(must_balance "$SAC_ID" "$POSTOR2_ADDR" "postor2"); then exit 1; fi
if ! ARTIST_0=$(must_balance "$SAC_ID" "$ARTIST_ADDR" "artista"); then exit 1; fi
if ! VENUE_0=$(must_balance "$SAC_ID" "$VENUE_ADDR" "espacio"); then exit 1; fi
if ! CONTRACT_0=$(must_balance "$SAC_ID" "$CONTRACT_ID" "contrato"); then exit 1; fi
printf '    postor1=%s postor2=%s artista=%s espacio=%s contrato=%s\n' "$P1_0" "$P2_0" "$ARTIST_0" "$VENUE_0" "$CONTRACT_0"
(( P1_0 >= MIN_PRICE )) || die "postor1 no tiene 10 USDC para la primera oferta (balance $P1_0)."
(( P2_0 >= BID2 )) || die "postor2 no tiene 12 USDC para la segunda oferta (balance $P2_0)."

log "postor1 ofrece 10 USDC."
run_contract_invoke postor1 bid \
  --auction_id "$AUCTION_ID" \
  --bidder "$POSTOR1_ADDR" \
  --amount "$MIN_PRICE"
require_invoke_success "bid inicial de postor1"
record_tx "bid10-postor1-auction#$AUCTION_ID"
wait_assert_balance "$SAC_ID" "$POSTOR1_ADDR" "$((P1_0 - MIN_PRICE))" "Balance de postor1 tras ofertar 10 USDC"
wait_assert_balance "$SAC_ID" "$CONTRACT_ID" "$((CONTRACT_0 + MIN_PRICE))" "Balance del contrato tras la primera oferta"
log "OK: el contrato retuvo exactamente 10 USDC de postor1."

log "postor1 intenta una oferta baja de 10.5 USDC."
run_contract_invoke postor1 bid \
  --auction_id "$AUCTION_ID" \
  --bidder "$POSTOR1_ADDR" \
  --amount "$BID_LOW"
expect_contract_error 4 "BidTooLow" "la oferta de 10.5 USDC"

log "postor2 ofrece 12 USDC."
run_contract_invoke postor2 bid \
  --auction_id "$AUCTION_ID" \
  --bidder "$POSTOR2_ADDR" \
  --amount "$BID2"
require_invoke_success "bid de 12 USDC de postor2"
record_tx "bid12-postor2-auction#$AUCTION_ID"
wait_assert_balance "$SAC_ID" "$POSTOR1_ADDR" "$P1_0" "Balance de postor1 tras ser superado"
wait_assert_balance "$SAC_ID" "$POSTOR2_ADDR" "$((P2_0 - BID2))" "Balance de postor2 tras ofertar 12 USDC"
wait_assert_balance "$SAC_ID" "$CONTRACT_ID" "$((CONTRACT_0 + BID2))" "Balance del contrato tras reembolsar a postor1"
log "OK: postor1 recuperó exactamente sus 10 USDC y el contrato retiene 12 USDC de esta subasta."

log "Leyendo end_time actualizado con get_auction (simulación, sin firmar)."
run_contract_invoke admin get_auction --auction_id "$AUCTION_ID"
require_invoke_success "get_auction después de la oferta de postor2"
CURRENT_END_TIME="$(printf '%s' "$INVOKE_STDOUT" | parse_end_time)" || die "No pude parsear end_time de get_auction: $INVOKE_STDOUT"
if (( CURRENT_END_TIME <= END_TIME )); then
  die "Anti-sniping no verificado: end_time leído ($CURRENT_END_TIME) no es mayor que el original ($END_TIME)."
fi
log "OK: anti-sniping extendió end_time de $END_TIME a $CURRENT_END_TIME."

NOW_BEFORE_EARLY_SETTLE="$(network_now)"
if (( NOW_BEFORE_EARLY_SETTLE >= CURRENT_END_TIME - 10 )); then
  die "La subasta está demasiado cerca del cierre extendido para probar settle temprano."
fi
log "settle antes del cierre extendido debe fallar."
run_contract_invoke admin settle --auction_id "$AUCTION_ID"
expect_contract_error 3 "AuctionNotEnded" "settle antes del cierre"

NOW_BEFORE_WAIT="$(network_now)"
SLEEP_SECONDS=$((CURRENT_END_TIME - NOW_BEFORE_WAIT + SMOKE_MARGIN_SEGUNDOS))
if (( SLEEP_SECONDS > 0 )); then
  log "Esperando ${SLEEP_SECONDS}s al cierre (incluye margen de ${SMOKE_MARGIN_SEGUNDOS}s)."
  sleep "$SLEEP_SECONDS"
fi

SETTLE_DONE=0
for attempt in {1..12}; do
  run_contract_invoke admin settle --auction_id "$AUCTION_ID"
  if (( INVOKE_RC == 0 )); then
    SETTLE_DONE=1
    record_tx "settle-auction#$AUCTION_ID"
    break
  fi
  if grep -Eq 'Error\(Contract, #3\)' <<<"$INVOKE_STDERR"; then
    log "El ledger todavía no alcanzó end_time; reintento $attempt/12 en 5s."
    sleep 5
    continue
  fi
  printf '%s\n' "$INVOKE_STDERR" >&2
  die "settle después del cierre falló con un error distinto de AuctionNotEnded."
done
(( SETTLE_DONE == 1 )) || die "settle siguió devolviendo AuctionNotEnded después de los reintentos."

wait_assert_balance "$SAC_ID" "$ARTIST_ADDR" "$((ARTIST_0 + ARTIST_AMOUNT))" "Balance de artista tras settle"
wait_assert_balance "$SAC_ID" "$VENUE_ADDR" "$((VENUE_0 + VENUE_AMOUNT))" "Balance de espacio tras settle"
wait_assert_balance "$SAC_ID" "$CONTRACT_ID" "$CONTRACT_0" "Balance del contrato tras settle"
log "OK: settle repartió 9.6 USDC a artista y 2.4 USDC a espacio."

log "Un segundo settle debe fallar."
run_contract_invoke admin settle --auction_id "$AUCTION_ID"
expect_contract_error 5 "AlreadySettled" "el segundo settle"

if (( ${#TX_RECORDS[@]} > 0 )); then
  log "Transacciones relevantes:"
  for record in "${TX_RECORDS[@]}"; do
    label="${record%%|*}"
    hash="${record##*|}"
    printf '    %s: %s\n' "$label" "$hash"
    printf '      https://stellar.expert/explorer/testnet/tx/%s\n' "$hash"
  done
else
  log "El CLI no expuso hashes de transacción en stderr."
fi

log "SMOKE TEST OK: flujo completo de oferta, reembolso y liquidación verificado en Testnet."
