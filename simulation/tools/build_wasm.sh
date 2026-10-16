#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
expected="wasm-bindgen 0.2.114"
if [ "$(wasm-bindgen --version)" != "$expected" ]; then
  echo "Install matching CLI: cargo install wasm-bindgen-cli --version 0.2.114 --locked" >&2
  exit 1
fi
cargo build --locked --release -p sim-wasm --target wasm32-unknown-unknown
wasm-bindgen target/wasm32-unknown-unknown/release/sim_wasm.wasm --target web --out-dir ../viewer/generated/physics
python3 tools/build_metadata.py
