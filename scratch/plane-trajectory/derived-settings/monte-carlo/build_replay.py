#!/usr/bin/env python3
# AP_FLAKE8_CLEAN
"""Build local physics-clock weather instrumentation and restore repo source/binary."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parent
REPO = Path('/workspace/ardupilot-plane-trajectory')
source = REPO / 'libraries/AP_HAL/SIMState.cpp'
binary = REPO / 'build/sitl/bin/arduplane'
original = source.read_bytes()
(ROOT / 'SIMState-normal.cpp').write_bytes(original)
normal = ROOT / 'arduplane-normal'
shutil.copy2(binary, normal)
text = original.decode()
text = text.replace('#include <AP_Terrain/AP_Terrain.h>', '#include <AP_Terrain/AP_Terrain.h>\n' +
                    '#include "' + str(ROOT / 'weather_replay.h') + '"')
needle = '        _sitl = AP::sitl();\n    }\n    // give 5 seconds to calibrate'
assert needle in text
text = text.replace(needle, '        _sitl = AP::sitl();\n    }\n' +
                    '    replay_monte_carlo_weather(*_sitl, AP_HAL::millis());\n    // give 5 seconds to calibrate')
(ROOT / 'SIMState-replay.cpp').write_text(text)
try:
    source.write_text(text)
    env = os.environ.copy()
    env['PYTHONPATH'] = '/tmp/paraglider-python-deps:/workspace/ardupilot/modules/DroneCAN/pydronecan'
    with (ROOT / 'replay-build.log').open('w') as log:
        subprocess.run(['./waf', 'plane'], cwd=REPO, env=env, stdout=log, stderr=subprocess.STDOUT, check=True)
    shutil.copy2(binary, ROOT / 'arduplane-replay')
    manifest = dict(normal_binary_sha256=hashlib.sha256(normal.read_bytes()).hexdigest(),
                    replay_binary_sha256=hashlib.sha256((ROOT / 'arduplane-replay').read_bytes()).hexdigest(),
                    original_sim_source_sha256=hashlib.sha256(original).hexdigest(),
                    replay_sim_source_sha256=hashlib.sha256(text.encode()).hexdigest(),
                    weather_replay_header_sha256=hashlib.sha256((ROOT / 'weather_replay.h').read_bytes()).hexdigest())
    (ROOT / 'replay-build.json').write_text(json.dumps(manifest, indent=2))
finally:
    source.write_bytes(original)
    shutil.copy2(normal, binary)
