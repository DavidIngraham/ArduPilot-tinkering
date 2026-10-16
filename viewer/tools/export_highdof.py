"""Export the selected configuration; preserve independent C++ parity fixtures."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import subprocess
import sys

parser = argparse.ArgumentParser()
parser.add_argument('firmware', type=Path)
parser.add_argument('destination', type=Path)
args = parser.parse_args()
source = Path(__file__).resolve().parents[2] / 'simulation'

from microagu_sim.compat.json_backend import Backend
from microagu_sim.compat import dynamics

backend = Backend(flight='trout_lake', profile='as_built', altitude=100, voltage=22.2)
config = dict(
    schema='microagu.physics.v1', flight='trout_lake', profile='as_built',
    model='9-DOF two-body modal research model',
    source_revision=subprocess.check_output(['git', '-C', str(source), 'rev-parse', 'HEAD'], text=True).strip(),
    source_repository='https://github.com/DavidIngraham/micro-agu',
    surface_sha256=hashlib.sha256((source / 'crates/sim-core/src/surface.rs').read_bytes()).hexdigest(),
    calibration=json.loads((Path(dynamics.__file__).parent/'as-built-calibration.json').read_text()),
    launch_settings=dynamics.LAUNCH_SETTINGS.tolist(),
    kernel_sha256=hashlib.sha256((source / 'crates/sim-core/src/dynamics.rs').read_bytes()).hexdigest(),
    parameters=dynamics.params(backend.sim.parameters).tolist(),
    parameter_keys=dynamics.KEYS,
    mass=backend.sim.geometry['mass'], imu=backend.sim.geometry['imu'].tolist(),
    state=backend.state.tolist(), rpm=backend.rpm, command=backend.command.tolist(),
    voltage=backend.voltage, brake_rate_mm_s=backend.actuator.rate,
    brake_offsets_m=[backend.sim.parameters['left_offset'], backend.sim.parameters['right_offset']],
    trim_residual=backend.trim['equilibrium_residual_max'],
    defaults=(source/'sitl.parm').read_text()+'\n'+(source/'mission-controller-candidate.parm').read_text(),
)
args.destination.mkdir(parents=True, exist_ok=True)
(args.destination/'highdof.json').write_text(json.dumps(config, indent=2, allow_nan=False)+'\n')
print(f'Exported {len(config["parameters"])} Rust-compatible parameters; trim residual {config["trim_residual"]:.3g}')
