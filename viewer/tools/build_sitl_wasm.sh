#!/usr/bin/env bash
# Compile the actual MicroAGU firmware; no downloaded or substitute aircraft.
set -euo pipefail
firmware=${1:?Usage: build_sitl_wasm.sh /path/to/ardupilot-high-dof}
root=$(cd "$(dirname "$0")/.." && pwd)
source "${EMSDK_ROOT:-$HOME/emsdk}/emsdk_env.sh"
cd "$firmware"
./waf configure --board wasm
./waf plane -j"${BUILD_JOBS:-4}"
mkdir -p "$root/public/wasm"
cp build/wasm/bin/arduplane.{js,wasm} "$root/public/wasm/"
python3 - "$root/public/wasm/build.json" <<'PY'
import hashlib, json, pathlib, subprocess, sys
out=pathlib.Path(sys.argv[1])
revision=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
data={'repository':'https://github.com/DavidIngraham/ardupilot','revision':revision,
      'source':f'https://github.com/DavidIngraham/ardupilot/tree/{revision}',
      'license':'GPL-3.0-or-later','board':'wasm','vehicle':'ArduPlane',
      'model':'paraglider-throw','emscripten':'6.0.8',
      'sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in out.parent.glob('arduplane.*')}}
out.write_text(json.dumps(data,indent=2)+'\n')
PY
