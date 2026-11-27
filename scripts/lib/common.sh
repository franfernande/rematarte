#!/usr/bin/env bash

NETWORK="${NETWORK:-testnet}"
RPC_URL="${RPC_URL:-https://soroban-testnet.stellar.org}"
HORIZON_URL="${HORIZON_URL:-https://horizon-testnet.stellar.org}"
NETWORK_PASSPHRASE="${NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"
USDC_CODE="USDC"
USDC_SCALE=10000000

log() {
  printf '%s\n' "$*" >&2
}

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

red() {
  printf '%s\n' "$NETWORK"
}

print_cmd() {
  printf '+'
  printf ' %q' "$@"
  printf '\n'
}

addr() {
  stellar -q keys address "$1" 2>/dev/null
}

horizon_account_json() {
  local address="$1"
  local tmp status curl_rc
  tmp=$(mktemp) || return 2
  status=$(curl -sS --max-time 20 -o "$tmp" -w '%{http_code}' "$HORIZON_URL/accounts/$address" 2>/dev/null)
  curl_rc=$?
  if [[ $curl_rc -ne 0 ]]; then
    rm -f "$tmp"
    return 2
  fi
  if [[ "$status" == "404" ]]; then
    rm -f "$tmp"
    return 4
  fi
  if [[ "$status" != "200" ]]; then
    cat "$tmp" >&2
    rm -f "$tmp"
    return 3
  fi
  cat "$tmp"
  rm -f "$tmp"
}

horizon_account_state() {
  local rc=0
  horizon_account_json "$1" >/dev/null || rc=$?
  case "$rc" in
    0) printf 'present\n' ;;
    4) printf 'missing\n' ;;
    *) printf 'error\n' ;;
  esac
}

wait_for_account() {
  local attempt state
  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    state=$(horizon_account_state "$1")
    if [[ "$state" == "present" ]]; then
      return 0
    fi
    sleep 1
  done
  return 1
}

ensure_identity() {
  local name="$1"
  local public_key state

  if addr "$name" >/dev/null 2>&1; then
    log "La identidad '$name' ya existe."
  else
    log "Creando y fondeando la identidad '$name'..."
    if ! stellar keys generate "$name" --network "$NETWORK" --fund >/dev/null; then
      if ! addr "$name" >/dev/null 2>&1; then
        die "No se pudo crear la identidad '$name'."
      fi
    fi
  fi

  public_key=$(addr "$name") || die "No se pudo leer la dirección pública de '$name'."
  state=$(horizon_account_state "$public_key")
  case "$state" in
    present)
      return 0
      ;;
    missing)
      if wait_for_account "$public_key"; then
        return 0
      fi
      log "La cuenta '$name' no está creada en Testnet; fondeándola con Friendbot..."
      if ! stellar keys fund "$name" --network "$NETWORK" >/dev/null; then
        die "Friendbot no pudo fondear '$name'."
      fi
      if ! wait_for_account "$public_key"; then
        die "La cuenta '$name' sigue sin aparecer en Horizon después del fondeo."
      fi
      ;;
    *)
      die "No se pudo consultar Horizon para la cuenta '$name' ($public_key)."
      ;;
  esac
}

usdc_to_stroops() {
  node -e '
const s = String(process.argv[1]);
if (!/^\d+(\.\d{1,7})?$/.test(s)) {
  console.error(`Monto USDC inválido (máximo 7 decimales): ${s}`);
  process.exit(1);
}
const [whole, frac = ""] = s.split(".");
const stroops = BigInt(whole) * 10000000n + BigInt((frac + "0000000").slice(0, 7));
process.stdout.write(stroops.toString() + "\n");
' "$1"
}

format_usdc() {
  node -e '
const v = BigInt(String(process.argv[1]));
const whole = v / 10000000n;
const frac = (v % 10000000n).toString().padStart(7, "0").replace(/0+$/, "");
process.stdout.write(whole.toString() + (frac ? "." + frac : "") + "\n");
' "$1"
}

iso_to_unix() {
  node -e '
const value = String(process.argv[1]);
const ms = Date.parse(value);
if (Number.isNaN(ms)) {
  console.error(`Fecha ISO inválida: ${value}`);
  process.exit(1);
}
process.stdout.write(Math.floor(ms / 1000).toString() + "\n");
' "$1"
}

has_usdc_trustline() {
  local address="$1"
  local issuer="$2"
  local json rc=0 result
  json=$(horizon_account_json "$address") || rc=$?
  if [[ $rc -ne 0 ]]; then
    return 1
  fi
  result=$(printf '%s' "$json" | node -e '
let input = "";
process.stdin.on("data", (chunk) => { input += chunk; });
process.stdin.on("end", () => {
  const issuer = process.argv[1];
  const account = JSON.parse(input);
  const found = (account.balances || []).some((b) =>
    b.asset_code === "USDC" && b.asset_issuer === issuer
  );
  process.stdout.write(found ? "yes\n" : "no\n");
});
' "$issuer") || return 1
  [[ "$result" == "yes" ]]
}

usdc_balance_stroops() {
  local address="$1"
  local issuer="$2"
  local json rc=0
  json=$(horizon_account_json "$address") || rc=$?
  if [[ $rc -eq 4 ]]; then
    printf '0\n'
    return 0
  fi
  if [[ $rc -ne 0 ]]; then
    return "$rc"
  fi
  printf '%s' "$json" | node -e '
let input = "";
process.stdin.on("data", (chunk) => { input += chunk; });
process.stdin.on("end", () => {
  const issuer = process.argv[1];
  const account = JSON.parse(input);
  const balance = (account.balances || []).find((b) =>
    b.asset_code === "USDC" && b.asset_issuer === issuer
  );
  if (!balance) {
    process.stdout.write("0\n");
    return;
  }
  const [whole, frac = ""] = String(balance.balance).split(".");
  const stroops = BigInt(whole) * 10000000n + BigInt((frac + "0000000").slice(0, 7));
  process.stdout.write(stroops.toString() + "\n");
});
' "$issuer"
}

parse_json_u32() {
  node -e '
let input = "";
process.stdin.on("data", (chunk) => { input += chunk; });
process.stdin.on("end", () => {
  let value;
  try {
    value = JSON.parse(input.trim());
  } catch (error) {
    console.error(`Salida JSON inválida: ${input.trim()}`);
    process.exit(1);
  }
  const n = typeof value === "number" ? value :
    (typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN);
  if (!Number.isInteger(n) || n < 0 || n > 4294967295) {
    console.error(`Se esperaba un u32 JSON y llegó: ${input.trim()}`);
    process.exit(1);
  }
  process.stdout.write(String(n) + "\n");
});
'
}

read_obras_tsv() {
  node -e '
const fs = require("fs");
const file = process.argv[1];
function fail(message) {
  console.error(`${file}: ${message}`);
  process.exit(1);
}
let obras;
try {
  obras = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (error) {
  fail(`no se pudo leer o parsear JSON (${error.message})`);
}
if (!Array.isArray(obras) || obras.length === 0) {
  fail("se esperaba un array no vacío de obras");
}
const required = [
  "slug",
  "titulo",
  "artista",
  "tecnica",
  "medidas",
  "anio",
  "descripcion",
  "imagen",
  "precioMinimoUsdc",
  "incrementoMinimoUsdc",
  "porcentajeArtista",
  "cierre",
];
for (const [index, obra] of obras.entries()) {
  for (const key of required) {
    if (!(key in obra)) fail(`obra ${index + 1}: falta ${key}`);
  }
  const slug = String(obra.slug);
  if (!/^[A-Za-z0-9-]+$/.test(slug)) fail(`obra ${index + 1}: slug inválido`);
  if (Number.isNaN(Date.parse(String(obra.cierre)))) fail(`obra ${slug}: cierre inválido`);
  process.stdout.write([
    slug,
    String(obra.precioMinimoUsdc),
    String(obra.incrementoMinimoUsdc),
    String(obra.porcentajeArtista),
    String(obra.cierre),
  ].join("\t") + "\n");
}
' "$1"
}
