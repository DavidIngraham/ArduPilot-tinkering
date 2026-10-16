#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
cargo run --locked -p sim-python --bin generate-stubs
mkdir -p schemas
cargo run --locked -p sim-cli -- schema > schemas/simulation-config.schema.json
cargo run --locked -p sim-cli -- typescript > ../viewer/public/wasm/config.d.ts
sh tools/build_wasm.sh
