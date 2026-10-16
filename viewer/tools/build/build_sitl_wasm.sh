#!/usr/bin/env bash
# Compile the actual MicroAGU firmware; no downloaded or substitute aircraft.
set -euo pipefail
firmware=${1:?Usage: build_sitl_wasm.sh /path/to/ardupilot-high-dof}
root=$(cd "$(dirname "$0")/../.." && pwd)
source "${EMSDK_ROOT:-$HOME/emsdk}/emsdk_env.sh"
# Export the existing Emscripten socket runtime for the in-browser JSON peer.
# This is a deployment linker setting; ArduPilot needs no custom physics ABI.
export EMCC_CFLAGS="${EMCC_CFLAGS:-} -sEXPORTED_RUNTIME_METHODS=cwrap,HEAPU8,FS,SOCKFS,PThread"
cd "$firmware"
./waf configure --board wasm
./waf plane -j"${BUILD_JOBS:-4}"
mkdir -p "$root/generated/ardupilot" "$root/assets/runtime"
cp build/wasm/bin/arduplane.{js,wasm} "$root/generated/ardupilot/"
python3 - "$root/assets/runtime/build.json" <<'PY'
import hashlib, json, pathlib, subprocess, sys
out=pathlib.Path(sys.argv[1])
revision=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
data={'repository':'https://github.com/DavidIngraham/ardupilot','revision':revision,
      'source':f'https://github.com/DavidIngraham/ardupilot/tree/{revision}',
      'license':'GPL-3.0-or-later','board':'wasm','vehicle':'ArduPlane',
      'model':'JSON:127.0.0.1 + full 9-DOF research kernel','transport':'Emscripten SOCKFS local UDP peer','emscripten':'6.0.8',
      'sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in out.parent.iterdir() if p.name.startswith(('arduplane.','highdof.'))}}
physics=json.loads((out.parent/'highdof.json').read_text())
data['physics_source']={'repository':physics['source_repository'],'revision':physics['source_revision'],
                        'kernel_sha256':physics['kernel_sha256'],'surface_sha256':physics['surface_sha256']}
out.write_text(json.dumps(data,indent=2)+'\n')
PY
python3 "$root/../simulation/tools/build_metadata.py"
