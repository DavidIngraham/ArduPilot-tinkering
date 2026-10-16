#!/usr/bin/env bash
set -euo pipefail
firmware=${1:?Usage: build_highdof_wasm.sh /path/to/ardupilot-browser-9dof}
root=$(cd "$(dirname "$0")/.." && pwd)
source "${EMSDK_ROOT:-$HOME/emsdk}/emsdk_env.sh"
source_dir="$firmware/Tools/simulation/paraglider"
mkdir -p "$root/public/wasm"
# The exact research kernel, including its propeller maps and RK4 integrator.
em++ "$source_dir/dynamics.cpp" -O3 -std=c++17 -I"${EIGEN_INCLUDE:-/usr/include/eigen3}" \
  -sMODULARIZE=1 -sEXPORT_ES6=1 -sALLOW_MEMORY_GROWTH=1 \
  -sEXPORTED_FUNCTIONS='["_causal_replay","_malloc","_free"]' \
  -sEXPORTED_RUNTIME_METHODS='["HEAPF64"]' \
  -o "$root/public/wasm/highdof.js"
"${PYTHON:-python3}" "$root/tools/export_highdof.py" "$firmware" "$root/public/wasm"
