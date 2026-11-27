#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
DEPLOY_JSON="$REPO_ROOT/web/data/deploy.testnet.json"
NETWORK="testnet"
UNIT=10000000
TARGET_AMOUNT=$((500 * UNIT))

usage() {
  printf 'Uso: %s [N]\n' "$0" >&2
  printf 'Crea o completa demo1..demoN con trustline USDC y 500 USDC cada una. N por defecto: 3.\n' >&2
}

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

if (( $# > 1 )); then
  usage
  exit 1
fi
COUNT="${1:-3}"
[[ "$COUNT" =~ ^[0-9]+$ ]] || { usage; exit 1; }
(( COUNT >= 1 )) || { usage; exit 1; }

command -v stellar >/dev/null 2>&1 || die "No encuentro el CLI 'stellar' en PATH."
command -v node >/dev/null 2>&1 || die "No encuentro 'node' en PATH."
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

DEPLOY_NETWORK="$(json_get network)" || die "No pude leer network del deploy."
[[ "$DEPLOY_NETWORK" == "testnet" ]] || die "El deploy no es de testnet (network=$DEPLOY_NETWORK)."
USDC_CODE="$(json_get usdc.code)" || die "No pude leer usdc.code."
USDC_ISSUER="$(json_get usdc.issuer)" || die "No pude leer usdc.issuer."
SAC_ID="$(json_get usdc.sacId)" || die "No pude leer usdc.sacId."
[[ "$USDC_CODE" == "USDC" ]] || die "El asset del deploy no es USDC (code=$USDC_CODE)."
[[ "$USDC_ISSUER" =~ ^G[A-Z2-7]{55}$ ]] || die "usdc.issuer no tiene formato de cuenta: $USDC_ISSUER"
[[ "$SAC_ID" =~ ^C[A-Z2-7]{55}$ ]] || die "usdc.sacId no tiene formato de contrato: $SAC_ID"

if ! stellar keys public-key usdc-distribuidor >/dev/null 2>&1; then
  die "Falta la identidad 'usdc-distribuidor' en stellar keys. Ejecutá primero el deploy/setup de Testnet."
fi
DISTRIBUTOR_ADDR="$(stellar keys public-key usdc-distribuidor)"

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

if ! DISTRIBUTOR_BALANCE=$(token_balance "$SAC_ID" "$DISTRIBUTOR_ADDR" 2>"$TMP_DIR/distributor-balance.err"); then
  cat "$TMP_DIR/distributor-balance.err" >&2
  die "No pude leer el balance USDC de usdc-distribuidor; verificá deploy y trustline."
fi

ensure_identity() {
  local name="$1"
  if stellar keys public-key "$name" >/dev/null 2>&1; then
    return 0
  fi
  if ! stellar keys generate --network "$NETWORK" --fund "$name" >"$TMP_DIR/keys-generate.out" 2>"$TMP_DIR/keys-generate.err"; then
    die "No pude generar la identidad $name. La salida del comando no se muestra por seguridad."
  fi
}

ensure_account() {
  local name="$1"
  local address="$2"
  if token_balance native "$address" >/dev/null 2>&1; then
    return 0
  fi
  if ! stellar keys fund --network "$NETWORK" "$name" >"$TMP_DIR/keys-fund.out" 2>"$TMP_DIR/keys-fund.err"; then
    cat "$TMP_DIR/keys-fund.err" >&2
    die "No pude fondear la cuenta $name con Friendbot."
  fi
  if ! token_balance native "$address" >/dev/null 2>&1; then
    die "La cuenta $name sigue sin existir en Testnet después de Friendbot."
  fi
}

ensure_trustline() {
  local name="$1"
  local address="$2"
  if token_balance "$SAC_ID" "$address" >/dev/null 2>&1; then
    return 0
  fi
  set +e
  stellar tx new change-trust \
    --source-account "$name" \
    --line "${USDC_CODE}:${USDC_ISSUER}" \
    --network "$NETWORK" >"$TMP_DIR/change-trust.out" 2>"$TMP_DIR/change-trust.err"
  local rc=$?
  set -e
  if (( rc != 0 )); then
    cat "$TMP_DIR/change-trust.err" >&2
    die "No pude crear la trustline USDC de $name."
  fi
  if ! token_balance "$SAC_ID" "$address" >/dev/null 2>&1; then
    die "La trustline USDC de $name no quedó disponible después de change-trust."
  fi
}

parse_transfer_hash() {
  node -e '
    const fs = require("fs");
    const raw = fs.readFileSync(0, "utf8").trim();
    let data;
    try {
      data = JSON.parse(raw);
    } catch (error) {
      console.error(`Salida de token transfer no es JSON: ${raw}`);
      process.exit(1);
    }
    if (data && data.error) {
      console.error(data.error.message || "token transfer devolvió un error");
      process.exit(1);
    }
    if (!data || typeof data.tx_hash !== "string" || !/^[0-9a-fA-F]{64}$/.test(data.tx_hash)) {
      console.error(`Salida de token transfer sin tx_hash: ${raw}`);
      process.exit(1);
    }
    process.stdout.write(data.tx_hash);
  '
}

transfer_usdc() {
  local to="$1"
  local amount="$2"
  local out rc
  set +e
  out=$(stellar token transfer \
    --id "$SAC_ID" \
    --from usdc-distribuidor \
    --to "$to" \
    --amount "$amount" \
    --network "$NETWORK" \
    --output json 2>"$TMP_DIR/token-transfer.err")
  rc=$?
  set -e
  if (( rc != 0 )); then
    if [[ -n "$out" ]]; then printf '%s\n' "$out" >&2; fi
    cat "$TMP_DIR/token-transfer.err" >&2
    return "$rc"
  fi
  printf '%s' "$out" | parse_transfer_hash >/dev/null
}

wait_balance_at_least() {
  local address="$1"
  local expected="$2"
  local label="$3"
  local value attempt
  for attempt in {1..10}; do
    if value=$(token_balance "$SAC_ID" "$address" 2>/dev/null); then
      if (( value >= expected )); then
        return 0
      fi
    fi
    sleep 1
  done
  if ! value=$(token_balance "$SAC_ID" "$address"); then
    die "No pude releer el balance USDC de $label después de transferir."
  fi
  (( value >= expected )) || die "$label quedó con $value stroops de USDC, menos que el objetivo $expected."
}

DEMO_LINES=()
for (( i = 1; i <= COUNT; i++ )); do
  name="demo$i"
  ensure_identity "$name"
  address="$(stellar keys public-key "$name")"
  ensure_account "$name" "$address"
  ensure_trustline "$name" "$address"

  if ! current_balance=$(token_balance "$SAC_ID" "$address"); then
    die "No pude leer el balance USDC de $name después de crear la trustline."
  fi
  if (( current_balance < TARGET_AMOUNT )); then
    needed=$((TARGET_AMOUNT - current_balance))
    if ! DISTRIBUTOR_BALANCE=$(token_balance "$SAC_ID" "$DISTRIBUTOR_ADDR"); then
      die "No pude releer el balance USDC de usdc-distribuidor."
    fi
    (( DISTRIBUTOR_BALANCE >= needed )) || die "usdc-distribuidor no tiene suficiente USDC: necesita $needed y tiene $DISTRIBUTOR_BALANCE."
    if ! transfer_usdc "$address" "$needed"; then
      die "No pude transferir $needed stroops de USDC a $name."
    fi
  fi
  wait_balance_at_least "$address" "$TARGET_AMOUNT" "$name"
  DEMO_LINES+=("$name $address")
done

printf 'Wallets de demo (solo direcciones públicas):\n'
for line in "${DEMO_LINES[@]}"; do
  name="${line%% *}"
  address="${line##* }"
  printf '  %s  %s\n' "$name" "$address"
done
printf '\nPara exportar una a Freighter, ejecutá manualmente:\n'
printf '  stellar keys secret <nombre>\n'
printf 'Ejemplo:\n'
printf '  stellar keys secret demo1\n'
printf 'Ese comando sí muestra el secret en tu terminal; pegalo solo en Freighter y no lo compartas ni lo commitees.\n'
