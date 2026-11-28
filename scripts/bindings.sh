#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
WASM_PATH="$REPO_ROOT/contracts/target/wasm32v1-none/release/artemi_auction.wasm"
DEPLOY_JSON="$REPO_ROOT/web/data/deploy.testnet.json"
BINDINGS_ROOT="$REPO_ROOT/contracts/bindings"
OUTPUT_DIR="$BINDINGS_ROOT/auction"
NETWORK="testnet"

log() {
  printf '==> %s\n' "$*"
}

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

command -v stellar >/dev/null 2>&1 || die "No encuentro el CLI 'stellar' en PATH."
command -v node >/dev/null 2>&1 || die "No encuentro 'node' en PATH."
command -v npm >/dev/null 2>&1 || die "No encuentro 'npm' en PATH."

mkdir -p "$BINDINGS_ROOT"
BINDING_ARGS=(--output-dir "$OUTPUT_DIR" --overwrite)

if [[ -f "$WASM_PATH" ]]; then
  BINDING_ARGS+=(--wasm "$WASM_PATH")
  log "Generando bindings TypeScript desde $WASM_PATH."
elif [[ -f "$DEPLOY_JSON" ]]; then
  CONTRACT_ID="$(node -e '
    const fs = require("fs");
    const file = process.argv[1];
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!data.auctionContractId) process.exit(1);
    console.log(data.auctionContractId);
  ' "$DEPLOY_JSON")" || die "No pude leer auctionContractId de $DEPLOY_JSON."
  BINDING_ARGS+=(--contract-id "$CONTRACT_ID" --network "$NETWORK")
  log "Generando bindings TypeScript desde el contrato $CONTRACT_ID en Testnet."
else
  die "No existe el WASM ni $DEPLOY_JSON; primero compilá o desplegá el contrato."
fi

stellar contract bindings typescript "${BINDING_ARGS[@]}"

[[ -f "$OUTPUT_DIR/package.json" ]] || die "La generación terminó pero no existe $OUTPUT_DIR/package.json."

log "Instalando dependencias de los bindings."
(
  cd "$OUTPUT_DIR"
  npm install
)

log "Compilando los bindings TypeScript."
(
  cd "$OUTPUT_DIR"
  npm run build
)

log "Bindings TypeScript generados y compilados en $OUTPUT_DIR."
