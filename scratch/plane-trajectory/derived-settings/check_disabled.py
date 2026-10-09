"""Syntax-check affected Plane translation units with the planner disabled."""
import json
from pathlib import Path
import subprocess

repo = Path('/workspace/ardupilot-plane-trajectory')
root = Path(__file__).resolve().parent
commands = json.loads((repo / 'build/sitl/compile_commands.json').read_text())
results = []
for name in ('PlaneTrajectory.cpp', 'navigation.cpp', 'Parameters.cpp', 'Attitude.cpp', 'commands.cpp',
             'commands_logic.cpp', 'mode_auto.cpp', 'GCS_MAVLink_Plane.cpp', 'Log.cpp', 'Plane.cpp'):
    original = next(command for command in commands if command['file'].endswith('/ArduPlane/' + name))
    args = [arg for arg in original['arguments'] if arg != '-c' and arg != '-MMD' and not arg.startswith('-o')]
    args += ['-DAP_PLANE_TRAJECTORY_ENABLED=0', '-fsyntax-only']
    with (root / ('disabled-' + name + '.log')).open('w') as log:
        result = subprocess.run(args, cwd=original['directory'], stdout=log, stderr=subprocess.STDOUT)
    results.append(dict(file=name, returncode=result.returncode))
(root / 'disabled-compilation.json').write_text(json.dumps(results, indent=2))
print(json.dumps(results))
raise SystemExit(any(result['returncode'] for result in results))
