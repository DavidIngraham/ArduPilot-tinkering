#!/usr/bin/env bash
set -euo pipefail
firmware=${1:?Usage: build_highdof_wasm.sh /path/to/ardupilot-browser-9dof}
root=$(cd "$(dirname "$0")/.." && pwd)
sh "$root/../simulation/tools/build_wasm.sh"
"${PYTHON:-python3}" "$root/tools/export_highdof.py" "$firmware" "$root/public/wasm"
python3 "$root/../simulation/tools/build_metadata.py"
