#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

DRY_RUN="${DRY_RUN:-0}"
WASM_PATH="contracts/target/wasm32v1-none/release/rematarte_auction.wasm"
DEPLOY_JSON="web/data/deploy.testnet.json"

addr_or_placeholder() {
  local name="$1"
  local value
  if value=$(addr "$name"); then
    printf '%s\n' "$value"
  elif [[ "$DRY_RUN" == "1" ]]; then
    printf 'G_%s\n' "$name" | tr '[:lower:]-' '[:upper:]_'
  else
    die "No existe la identidad '$name'; ejecutá scripts/setup-usdc.sh."
  fi
}

write_deploy_json() {
  local outfile="$1"
  local contract_id="$2"
  local issuer="$3"
  local sac_id="$4"
  shift 4

  printf '%s\n' "$@" | node -e '
const fs = require("fs");
const path = require("path");
const [outfile, contractId, issuer, sacId, rpcUrl, networkPassphrase] = process.argv.slice(1);
let input = "";
process.stdin.on("data", (chunk) => { input += chunk; });
process.stdin.on("end", () => {
  const subastas = {};
  for (const line of input.split(/\r?\n/).filter(Boolean)) {
    const [slug, id] = line.split("\t");
    if (!slug || !/^\d+$/.test(id || "")) {
      console.error(`Línea de subasta inválida: ${line}`);
      process.exit(1);
    }
    subastas[slug] = Number(id);
  }
  const output = {
    network: "testnet",
    rpcUrl,
    networkPassphrase,
    auctionContractId: contractId,
    usdc: { code: "USDC", issuer, sacId },
    subastas,
  };
  fs.mkdirSync(path.dirname(outfile), { recursive: true });
  fs.writeFileSync(outfile, JSON.stringify(output, null, 2) + "\n");
});
' "$outfile" "$contract_id" "$issuer" "$sac_id" "$RPC_URL" "$NETWORK_PASSPHRASE"
}

select_obras_file() {
  if [[ -n "${OBRAS_FILE:-}" ]]; then
    [[ -f "$OBRAS_FILE" ]] || die "OBRAS_FILE no existe: $OBRAS_FILE"
    printf '%s\n' "$OBRAS_FILE"
  elif [[ -f "web/data/obras.json" ]]; then
    printf 'web/data/obras.json\n'
  else
    printf 'scripts/obras.sample.json\n'
  fi
}

main() {
  local obras_file admin_addr artista_addr espacio_addr issuer asset sac_id
  local obras_tsv override_end_time now contract_id deploy_out build_log wasm_hash
  local slug precio incremento porcentaje cierre end_time artist_bps min_price min_increment
  local invoke_out auction_id
  local mapping_lines=()

  echo "== Deploy RematArte en Stellar Testnet =="
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "Modo DRY_RUN: se imprimen los comandos, sin ejecutar transacciones ni escribir archivos."
    print_cmd bash scripts/setup-usdc.sh
  else
    bash scripts/setup-usdc.sh
  fi

  admin_addr=$(addr_or_placeholder admin)
  artista_addr=$(addr_or_placeholder artista)
  espacio_addr=$(addr_or_placeholder espacio)
  issuer=$(addr_or_placeholder usdc-issuer)
  asset="$USDC_CODE:$issuer"

  if [[ "$issuer" =~ ^G[A-Z2-7]{55}$ ]]; then
    sac_id=$(stellar -q contract id asset --asset "$asset" --network "$NETWORK" | tr -d '\r\n ')
    if [[ ! "$sac_id" =~ ^C[A-Z2-7]{55}$ ]]; then
      die "No se pudo derivar un SAC id válido para $asset."
    fi
  elif [[ "$DRY_RUN" == "1" ]]; then
    sac_id="C_SAC_USDC"
  else
    die "Dirección de issuer inválida."
  fi

  echo
  echo "== Build del contrato =="
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "+ (cd contracts && stellar contract build)"
  else
    [[ -d contracts ]] || die "No existe contracts/; no se puede compilar el contrato."
    echo "Compilando el contrato..."
    build_log=$(mktemp)
    if (cd contracts && stellar contract build) 2>&1 | tee "$build_log"; then
      :
    else
      rm -f "$build_log"
      die "Falló stellar contract build."
    fi
    wasm_hash=$(sed -nE 's/.*Wasm Hash: ([0-9a-fA-F]{64}).*/\1/p' "$build_log" | tail -n 1)
    rm -f "$build_log"
    if [[ ! "$wasm_hash" =~ ^[0-9a-fA-F]{64}$ ]]; then
      die "No se encontró un Wasm Hash válido en la salida de stellar contract build."
    fi
    echo "Wasm Hash: $wasm_hash"
  fi
  if [[ "$DRY_RUN" != "1" && ! -f "$WASM_PATH" ]]; then
    die "Sigue sin existir el WASM requerido después del build: $WASM_PATH"
  fi

  echo
  echo "== Deploy del contrato =="
  if [[ "$DRY_RUN" == "1" ]]; then
    print_cmd stellar -q contract deploy \
      --wasm "$WASM_PATH" \
      --source-account admin \
      --network "$NETWORK" \
      -- \
      --admin "$admin_addr" \
      --token "$sac_id"
    contract_id="C_AUCTION_CONTRACT"
  else
    deploy_out=$(stellar -q contract deploy \
      --wasm "$WASM_PATH" \
      --source-account admin \
      --network "$NETWORK" \
      -- \
      --admin "$admin_addr" \
      --token "$sac_id") || die "Falló el deploy del contrato."
    contract_id=$(printf '%s' "$deploy_out" | tr -d '\r\n ')
    if [[ ! "$contract_id" =~ ^C[A-Z2-7]{55}$ ]]; then
      die "Salida de deploy inesperada; no se encontró un contract id válido: $deploy_out"
    fi
    echo "Contrato desplegado: $contract_id"
  fi

  obras_file=$(select_obras_file)
  echo
  echo "== Creación de subastas =="
  echo "Archivo de obras: $obras_file"
  obras_tsv=$(read_obras_tsv "$obras_file") || die "No se pudo leer $obras_file"

  override_end_time=""
  now=$(date +%s)
  if [[ -n "${CIERRE_MINUTOS:-}" ]]; then
    if [[ ! "$CIERRE_MINUTOS" =~ ^[0-9]+$ ]] || (( CIERRE_MINUTOS < 1 )); then
      die "CIERRE_MINUTOS debe ser un entero positivo."
    fi
    override_end_time=$((now + CIERRE_MINUTOS * 60))
    echo "Usando CIERRE_MINUTOS=$CIERRE_MINUTOS; end_time común: $override_end_time"
  fi

  while IFS=$'\t' read -r slug precio incremento porcentaje cierre; do
    [[ -n "$slug" ]] || continue

    if [[ ! "$porcentaje" =~ ^[0-9]+$ ]] || (( porcentaje > 100 )); then
      die "Obra $slug: porcentajeArtista debe ser un entero entre 0 y 100."
    fi
    artist_bps=$((porcentaje * 100))

    if ! min_price=$(usdc_to_stroops "$precio"); then
      die "Obra $slug: precioMinimoUsdc inválido ($precio)."
    fi
    if ! min_increment=$(usdc_to_stroops "$incremento"); then
      die "Obra $slug: incrementoMinimoUsdc inválido ($incremento)."
    fi
    if (( min_price <= 0 || min_increment <= 0 )); then
      die "Obra $slug: precio mínimo e incremento deben ser mayores que cero."
    fi

    if [[ -n "$override_end_time" ]]; then
      end_time="$override_end_time"
    else
      if ! end_time=$(iso_to_unix "$cierre"); then
        die "Obra $slug: cierre inválido ($cierre)."
      fi
    fi
    if (( end_time <= now )); then
      die "Obra $slug: cierre debe estar en el futuro ($cierre)."
    fi

    if [[ "$DRY_RUN" == "1" ]]; then
      print_cmd stellar -q contract invoke \
        --contract-id "$contract_id" \
        --source-account admin \
        --network "$NETWORK" \
        --send yes \
        -- \
        create_auction \
        --artist "$artista_addr" \
        --venue "$espacio_addr" \
        --artist_bps "$artist_bps" \
        --min_price "$min_price" \
        --min_increment "$min_increment" \
        --end_time "$end_time"
      echo "  # stdout: id u32 de la subasta para '$slug'"
    else
      echo "Creando subasta para '$slug'..."
      if ! invoke_out=$(stellar -q contract invoke \
        --contract-id "$contract_id" \
        --source-account admin \
        --network "$NETWORK" \
        --send yes \
        -- \
        create_auction \
        --artist "$artista_addr" \
        --venue "$espacio_addr" \
        --artist_bps "$artist_bps" \
        --min_price "$min_price" \
        --min_increment "$min_increment" \
        --end_time "$end_time"); then
        die "Falló create_auction para '$slug'."
      fi
      if ! auction_id=$(printf '%s' "$invoke_out" | parse_json_u32); then
        die "Salida inesperada de create_auction para '$slug': $invoke_out"
      fi
      echo "  '$slug' -> auction id $auction_id"
      mapping_lines+=("$(printf '%s\t%s' "$slug" "$auction_id")")
    fi
  done <<< "$obras_tsv"

  echo
  echo "== Resultado =="
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "+ <escribir $DEPLOY_JSON con la forma I3 usando los ids reales devueltos por create_auction>"
    echo "DRY_RUN: no se escribió $DEPLOY_JSON."
  else
    if (( ${#mapping_lines[@]} == 0 )); then
      die "No hay subastas para escribir en $DEPLOY_JSON."
    fi
    write_deploy_json "$DEPLOY_JSON" "$contract_id" "$issuer" "$sac_id" "${mapping_lines[@]}"
    echo "Archivo escrito: $DEPLOY_JSON"
  fi

  echo
  echo "Para obtener el secret del distribuidor y pasarlo a G2 por privado, ejecutá manualmente:"
  echo "  stellar keys secret usdc-distribuidor"
  echo "No lo pegues en el repo ni en canales públicos."
}

main "$@"
