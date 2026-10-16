"""Export the selected configuration; preserve independent C++ parity fixtures."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('firmware', type=Path)
parser.add_argument('destination', type=Path)
args = parser.parse_args()
source = Path(__file__).resolve().parents[2] / 'simulation'

from microagu_sim import parameter_keys

preset = json.loads((source/'data/presets/as-built-trout-lake-sitl.json').read_text())
selected = preset['config']
metadata = json.loads((source/'data/presets/as-built-trout-lake-metadata.json').read_text())
keys = parameter_keys()
config = dict(
    schema='microagu.physics.v1', flight='trout_lake', profile='as_built',
    model='9-DOF two-body modal research model',
    source_revision=subprocess.check_output(['git', '-C', str(source), 'rev-parse', 'HEAD'], text=True).strip(),
    source_repository='https://github.com/DavidIngraham/micro-agu',
    surface_sha256=hashlib.sha256((source / 'crates/sim-core/src/surface.rs').read_bytes()).hexdigest(),
    calibration=metadata['calibration'],
    launch_settings=metadata['launch_settings'],
    kernel_sha256=hashlib.sha256((source / 'crates/sim-core/src/dynamics.rs').read_bytes()).hexdigest(),
    parameters=[selected['parameters'][key] for key in keys],
    parameter_keys=keys,
    mass=selected['mass_kg'], imu=preset['imu_offset_m'],
    state=selected['initial_state'], rpm=selected['initial_rpm'], command=preset['trim_command'],
    voltage=selected['voltage_v'], brake_rate_mm_s=preset['brake_rate_mm_s'],
    brake_offsets_m=preset['brake_offsets_m'],
    trim_residual=metadata['trim_residual'],
    defaults=(source/'sitl.parm').read_text()+'\n'+(source/'mission-controller-candidate.parm').read_text(),
)
args.destination.mkdir(parents=True, exist_ok=True)
(args.destination/'highdof.json').write_text(json.dumps(config, indent=2, allow_nan=False)+'\n')
print(f'Exported {len(config["parameters"])} Rust-compatible parameters; trim residual {config["trim_residual"]:.3g}')
