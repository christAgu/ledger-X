#!/usr/bin/env bash
set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHAIN_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CHAIN_HOME="${LEDGERX_CHAIN_HOME:-$CHAIN_DIR/data/devnet}"
BINARY="$CHAIN_DIR/ledgerxd"

export PATH="$HOME/sdk/go/bin:$HOME/go/bin:$HOME/bin:$PATH"

go -C "$CHAIN_DIR" build -o "$BINARY" ./cmd/ledgerxd

if [[ ! -f "$CHAIN_HOME/config/genesis.json" ]]; then
  ignite chain init \
    --yes \
    --skip-proto \
    --path "$CHAIN_DIR" \
    --config "$CHAIN_DIR/config.yml" \
    --home "$CHAIN_HOME"
fi

treasury_address="$("$BINARY" keys show treasury -a --keyring-backend test --home "$CHAIN_HOME")"
amina_address="$("$BINARY" keys show amina -a --keyring-backend test --home "$CHAIN_HOME")"
koffi_address="$("$BINARY" keys show koffi -a --keyring-backend test --home "$CHAIN_HOME")"

printf 'Treasury address: %s\n' "$treasury_address"
printf 'Amina address: %s\n' "$amina_address"
printf 'Koffi address: %s\n' "$koffi_address"
printf 'RPC: http://localhost:26657\nAPI: http://localhost:1317\n'

exec "$BINARY" start --home "$CHAIN_HOME"
