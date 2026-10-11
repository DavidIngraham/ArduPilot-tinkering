#!/usr/bin/env python3
"""Convert native high-dof-trace.npz or simulator replay NPZ to viewer JSONL."""
import argparse
import json
import numpy as np
from scipy.spatial.transform import Rotation


def convert(source, destination, voltage, hz):
    with np.load(source, allow_pickle=False) as data:
        print('Available arrays:', ', '.join(data.files))
        legacy = 'samples' in data
        time = data['samples'][:, 0] if legacy else data['t']
        states = data['samples'][:, 2:] if legacy else data['state']
        released = data['samples'][:, 1].astype(bool) if legacy else np.ones(len(time), bool)
        rpm = np.zeros(len(time)) if legacy else data['rpm']
        commands = np.zeros((len(time), 3)) if legacy else data['commands']
        if states.shape != (len(time), 26) or commands.shape != (len(time), 3):
            raise ValueError('Expected t, state Nx26, rpm N, commands Nx3 (throttle, left mm, right mm)')
        if len(time) < 1 or not np.isfinite(time).all() or np.any(np.diff(time) <= 0):
            raise ValueError('Time must be finite and strictly increasing')
        if not all(np.isfinite(a).all() for a in [states, rpm, commands]):
            raise ValueError('Non-finite simulation data')
        next_time = -np.inf
        with open(destination, 'x') as output:
            for i, t in enumerate(time):
                if t < next_time and i != len(time)-1:
                    continue
                next_time = t + 1/hz
                y = states[i]
                p, c = Rotation.from_quat(y[3:7]), Rotation.from_quat(y[16:20])
                frame = dict(schema='microagu.state.v1', time_s=float(t), state=y.tolist(),
                             rpm=None if legacy else float(rpm[i]), voltage_v=voltage, released=bool(released[i]),
                             throttle=None if legacy else float(commands[i, 0]),
                             brake_mm=None if legacy else commands[i, 1:].tolist(),
                             joint_rotvec_rad=(p.inv()*c).as_rotvec().tolist(),
                             joint_rate_rad_s=p.inv().apply(y[23:26]-y[10:13]).tolist())
                output.write(json.dumps(frame, allow_nan=False)+'\n')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('source')
    p.add_argument('destination')
    p.add_argument('--voltage', type=float, required=True, help='Physical voltage used in this run')
    p.add_argument('--hz', type=float, default=30)
    args = p.parse_args()
    if not 0 < args.hz <= 100 or not np.isfinite(args.voltage) or args.voltage <= 0:
        p.error('Require 0 < hz <= 100 and positive finite voltage')
    convert(args.source, args.destination, args.voltage, args.hz)
