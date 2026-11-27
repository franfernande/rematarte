#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

run_tx() {
  local output rc=0
  output=$("$@" 2>&1) || rc=$?
  if [[ $rc -ne 0 ]]; then
    printf '%s\n' "$output" >&2
    return "$rc"
  fi
}

ensure_usdc_trustline() {
  local name="$1"
  local issuer="$2"
  local asset="$3"
  local public_key
  public_key=$(addr "$name") || die "No se pudo leer la dirección de '$name'."

  if has_usdc_trustline "$public_key" "$issuer"; then
    echo "Trustline USDC ya existe para $name."
    return 0
  fi

  echo "Creando trustline USDC para $name..."
  if ! run_tx stellar tx new change-trust \
    --source-account "$name" \
    --line "$asset" \
    --network "$NETWORK"; then
    sleep 2
    if has_usdc_trustline "$public_key" "$issuer"; then
      echo "La trustline de $name apareció al reconsultar; continúo."
      return 0
    fi
    die "No se pudo crear la trustline USDC para '$name'."
  fi
}

wait_for_usdc_balance_at_least() {
  local address="$1"
  local issuer="$2"
  local expected="$3"
  local attempt balance
  for attempt in 1 2 3 4 5 6 7 8 9 10 11 12; do
    if balance=$(usdc_balance_stroops "$address" "$issuer"); then
      if (( balance >= expected )); then
        return 0
      fi
    fi
    sleep 1
  done
  return 1
}

pay_usdc_up_to() {
  local source_name="$1"
  local destination_name="$2"
  local destination_address="$3"
  local target_stroops="$4"
  local issuer="$5"
  local asset="$6"
  local balance missing human

  balance=$(usdc_balance_stroops "$destination_address" "$issuer") || \
    die "No se pudo consultar el balance USDC de '$destination_name'."
  if (( balance >= target_stroops )); then
    human=$(format_usdc "$balance")
    echo "$destination_name ya tiene $human USDC; no se emite/transfiere más."
    return 0
  fi

  missing=$((target_stroops - balance))
  human=$(format_usdc "$missing")
  echo "Transfiriendo $human USDC a $destination_name desde $source_name..."
  if ! run_tx stellar tx new payment \
    --source-account "$source_name" \
    --destination "$destination_address" \
    --asset "$asset" \
    --amount "$missing" \
    --network "$NETWORK"; then
    die "No se pudo transferir USDC a '$destination_name'."
  fi

  if ! wait_for_usdc_balance_at_least "$destination_address" "$issuer" "$target_stroops"; then
    die "Horizon no reflejó el balance esperado de '$destination_name'."
  fi
}

sac_deployed() {
  local sac_id="$1"
  stellar -q contract invoke \
    --contract-id "$sac_id" \
    --source-account admin \
    --network "$NETWORK" \
    --send=no \
    -- name >/dev/null 2>&1
}

print_usdc_balance() {
  local name="$1"
  local issuer="$2"
  local public_key balance human
  public_key=$(addr "$name") || die "No se pudo leer la dirección de '$name'."
  balance=$(usdc_balance_stroops "$public_key" "$issuer") || \
    die "No se pudo consultar el balance USDC de '$name'."
  human=$(format_usdc "$balance")
  printf '  %-18s %s  %s USDC\n' "$name" "$public_key" "$human"
}

main() {
  local identities name issuer distributor asset sac_id target_distributor target_postor
  local postor postor_address

  identities=(admin artista espacio postor1 postor2 usdc-issuer usdc-distribuidor)

  echo "== Setup USDC de prueba en Stellar Testnet =="
  for name in "${identities[@]}"; do
    ensure_identity "$name"
  done

  issuer=$(addr usdc-issuer) || die "No se pudo leer la dirección de usdc-issuer."
  distributor=$(addr usdc-distribuidor) || die "No se pudo leer la dirección de usdc-distribuidor."
  asset="$USDC_CODE:$issuer"

  echo
  echo "== Trustlines =="
  for name in usdc-distribuidor artista espacio postor1 postor2; do
    ensure_usdc_trustline "$name" "$issuer" "$asset"
  done

  target_distributor=$(usdc_to_stroops 1000000)
  target_postor=$(usdc_to_stroops 1000)

  echo
  echo "== Emisión y distribución =="
  pay_usdc_up_to usdc-issuer usdc-distribuidor "$distributor" "$target_distributor" "$issuer" "$asset"
  for postor in postor1 postor2; do
    postor_address=$(addr "$postor") || die "No se pudo leer la dirección de '$postor'."
    pay_usdc_up_to usdc-distribuidor "$postor" "$postor_address" "$target_postor" "$issuer" "$asset"
  done

  echo
  echo "== Stellar Asset Contract (SAC) =="
  sac_id=$(stellar -q contract id asset --asset "$asset" --network "$NETWORK" | tr -d '\r\n ')
  if [[ ! "$sac_id" =~ ^C[A-Z2-7]{55}$ ]]; then
    die "No se pudo derivar el SAC id para $asset."
  fi

  if sac_deployed "$sac_id"; then
    echo "El SAC ya está desplegado."
  else
    echo "Desplegando el SAC de $asset..."
    if ! run_tx stellar contract asset deploy \
      --asset "$asset" \
      --source-account admin \
      --network "$NETWORK"; then
      if sac_deployed "$sac_id"; then
        echo "El SAC ya existía al reconsultar; continúo."
      else
        die "No se pudo desplegar el SAC."
      fi
    fi
  fi

  echo
  echo "== Resumen =="
  echo "Red: $NETWORK"
  echo "Issuer público: $issuer"
  echo "SAC id: $sac_id"
  echo
  echo "Balances USDC:"
  for name in usdc-distribuidor artista espacio postor1 postor2; do
    print_usdc_balance "$name" "$issuer"
  done
  echo
  echo "No se imprimió ninguna secret key."
}

main "$@"
