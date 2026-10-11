#!/usr/bin/env python3
"""Extract a continuous AUTO loiter-entry clip, verified against the native BIN.

Requires the full truth.jsonl, flight.BIN and unchanged ParagliderAutoMission.csv
produced by record_auto.py. Original simulation timestamps are retained.
"""
import argparse
import bisect
import hashlib
import json
from pathlib import Path

import numpy as np
from pymavlink import mavutil
from scipy.spatial.transform import Rotation

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('run', type=Path)
parser.add_argument('--duration', type=float, default=55)
args = parser.parse_args()
run = args.run
table = np.genfromtxt(run / 'ParagliderAutoMission.csv', delimiter=',', names=True)
entry = table[(table['seq'] == 3) & (table['target_distance_m'] < 60)][0]
start, end = float(entry['time_s']), float(entry['time_s'] + args.duration)
assert end < table[table['seq'] == 3]['time_s'][-1], 'Clip must stay in item 3'
frames = [json.loads(line) for line in (run / 'truth.jsonl').read_text().splitlines()]
clip = [f for f in frames if start <= f['time_s'] <= end]
assert clip and all(f['released'] for f in clip)

log = mavutil.mavlink_connection(str(run / 'flight.BIN'))
modes, parameters, sim_attitude = [], {}, []
while True:
    msg = log.recv_match(type=['MODE', 'PARM', 'SIM'])
    if msg is None:
        break
    if msg.get_type() == 'MODE':
        modes.append((msg.TimeUS * 1e-6, int(msg.ModeNum)))
    elif msg.get_type() == 'PARM':
        parameters[msg.Name] = float(msg.Value)
    elif start <= msg.TimeUS * 1e-6 <= end:
        sim_attitude.append((msg.TimeUS * 1e-6, msg.Roll, msg.Pitch))
log.close()
times = [m[0] for m in modes]
for f in clip:
    i = bisect.bisect_right(times, f['time_s']) - 1
    assert i >= 0 and modes[i][1] == 10, 'Native log must show AUTO throughout'
    f.update(mode='AUTO', mission_item=3)
angles = Rotation.from_quat(np.array([f['state'][3:7] for f in clip])).as_euler('xyz', degrees=True)
assert sim_attitude, 'Need native SIM attitude to check clock alignment'
native = np.array(sim_attitude)
frame_times = [f['time_s'] for f in clip]
errors = native[:, 1:3] - np.column_stack([
    np.interp(native[:, 0], frame_times, angles[:, i]) for i in range(2)
])
alignment_rms = np.sqrt(np.mean(errors**2, axis=0))
assert max(alignment_rms) < .2, 'Truth/native attitude timestamps disagree'
mission = json.loads((run / 'ParagliderAutoMission.csv.json').read_text())
out = run / 'auto-clip.jsonl'
with out.open('x') as stream:
    for frame in clip:
        stream.write(json.dumps(frame, allow_nan=False) + '\n')
meta = dict(
    kind='Native ArduPlane SITL AUTO; continuous first-loiter entry excerpt',
    simulation_start_s=clip[0]['time_s'], simulation_end_s=clip[-1]['time_s'],
    duration_s=clip[-1]['time_s']-clip[0]['time_s'], frames=len(clip),
    mission_item=3, commanded_loiter_radius_m=mission['loiter_radius_m']['3'],
    target_altitude_m=mission['route'][2][3],
    mode_evidence=modes, mass_kg=1.758, voltage_v=22.2,
    max_abs_payload_bank_deg=float(np.abs(angles[:, 0]).max()),
    joint_peak_abs_deg=(np.max(np.abs([f['joint_rotvec_rad'] for f in clip]), axis=0)*180/np.pi).tolist(),
    native_truth_roll_pitch_alignment_rms_deg=alignment_rms.tolist(),
    source_sha256=hashlib.sha256((run/'truth.jsonl').read_bytes()).hexdigest(),
    clip_sha256=hashlib.sha256(out.read_bytes()).hexdigest(),
    parameters={k: v for k, v in parameters.items() if k.startswith(('PG_TURN_', 'PG_PITCH_', 'FWD_BAT_', 'TECS_'))},
    turn_parameters_during_mission=mission['turn_controller_parameters'],
)
if (run / 'truth.turbulence.json').exists():
    meta['turbulence'] = json.loads((run / 'truth.turbulence.json').read_text())
    wind = np.array([f['wind_ned_m_s'] for f in clip])
    meta['clip_wind_rms_ned_m_s'] = np.sqrt(np.mean(wind**2, axis=0)).tolist()
(run / 'auto-mission.json').write_text(json.dumps(meta, indent=2) + '\n')
print(json.dumps(meta, indent=2))
