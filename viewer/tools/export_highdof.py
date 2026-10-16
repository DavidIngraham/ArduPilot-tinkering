"""Export the canonical Python model configuration and independent parity trace."""
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
source = args.firmware.resolve() / 'Tools/simulation/paraglider'
sys.path.insert(0, str(source))
from json_backend import Backend
import dynamics

backend = Backend(flight='trout_lake', profile='mission', altitude=100, voltage=22.2)
config = dict(
    schema='microagu.physics.v1', flight='trout_lake', profile='mission',
    model='9-DOF two-body modal research model',
    source_revision=subprocess.check_output(['git', '-C', str(args.firmware), 'rev-parse', 'HEAD'], text=True).strip(),
    kernel_sha256=hashlib.sha256((source / 'dynamics.cpp').read_bytes()).hexdigest(),
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
# Exercise trim hold, release, asymmetric reversed servos and both throttle steps.
samples = []
for i in range(1200):
    pwm = [1500, 1500, 800, 2400] + [1500]*12
    if 200 <= i < 700:
        pwm[0], pwm[2], pwm[3] = 1550, 960, 1900
    if i >= 700:
        pwm[0], pwm[2], pwm[3] = 1430, 1450, 2250
    backend.released = i >= 20
    sensors = json.loads(backend.respond(struct.pack('<HHI16H', 18458, 400, i, *pwm)))
    if i % 25 == 0 or i == 1199:
        samples.append(dict(frame=i, truth=backend.viewer_state(), sensors=sensors))
fixture = Path(__file__).resolve().parent/'fixtures/highdof-parity.json'
fixture.parent.mkdir(parents=True, exist_ok=True)
fixture.write_text(json.dumps(dict(rate=400, steps=1200, samples=samples), allow_nan=False)+'\n')
print(f'Exported {len(config["parameters"])} parameters; trim residual {config["trim_residual"]:.3g}; {len(samples)} parity checkpoints')
