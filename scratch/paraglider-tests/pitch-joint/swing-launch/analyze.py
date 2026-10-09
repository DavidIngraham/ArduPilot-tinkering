# AP_FLAKE8_CLEAN
import csv
import hashlib
import json
import subprocess
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

root = Path(__file__).parent
repo = Path('/workspace/ardupilot')
results = []
series = {}
for duration in [.8, 1, 1.2]:
    for initial in [0, 2.5]:
        name = f'swing-{duration}-initial-{initial}'
        output = subprocess.run([str(root / 'swing'), str(duration), str(initial), '4.8'],
                                capture_output=True, text=True, check=True).stdout
        (root / (name + '.csv')).write_text(output)
        rows = [{k: float(v) for k, v in row.items()} for row in csv.DictReader(output.splitlines())]
        release_time = duration + 1.4
        held = [r for r in rows if r['t'] < release_time]
        release = min(rows, key=lambda r: abs(r['t'] - release_time))
        # A reduced-order model has no canopy-ground collision handling. Do not
        # report continuation through the ground as a simulated flight outcome.
        contact = next((r for r in rows if r['t'] >= release_time and
                        min(r['canopy_height'], r['payload_height']) <= 0), None)
        result = dict(name=name, swing_duration_s=duration, initial_relative_rad=initial,
                      release=release, first_predicted_contact=contact,
                      compression_fraction=sum(r['tension_N'] < 0 for r in held) / len(held),
                      maximum_hand_force_N=max(r['hand_force_N'] for r in held))
        results.append(result)
        series[name] = {k: np.array([r[k] for r in rows]) for k in rows[0]}

# Check integration convergence before predicted contact, not after invalid ground penetration.
output = subprocess.run([str(root / 'swing'), '1', '0', '4.8', '4800'],
                        capture_output=True, text=True, check=True).stdout
(root / 'convergence-4800.csv').write_text(output)
fine = np.genfromtxt(root / 'convergence-4800.csv', delimiter=',', names=True)
coarse = series['swing-1-initial-0']
valid = coarse['t'] < results[2]['first_predicted_contact']['t'] - .02
convergence = {}
for key in ['canopy_pitch_deg', 'payload_pitch_deg', 'cg_height']:
    aligned = np.interp(coarse['t'][valid], fine['t'], fine[key])
    convergence[key] = float(np.max(np.abs(coarse[key][valid] - aligned)))
assert convergence['canopy_pitch_deg'] < .05
assert convergence['payload_pitch_deg'] < .05
assert convergence['cg_height'] < .001

fig, axes = plt.subplots(3, 1, figsize=(10, 9), constrained_layout=True)
for initial, label, color in [(0, 'Initially inflated above payload', 'tab:blue'),
                              (2.5, 'Canopy below hinge (rigid laid-out proxy)', 'tab:orange')]:
    d = series[f'swing-1-initial-{initial}']
    contact = next(r['first_predicted_contact']['t'] for r in results if r['name'] == f'swing-1-initial-{initial}')
    valid = d['t'] <= contact
    held = d['t'] < 2.4
    axes[0].plot(d['t'][valid], d['canopy_height'][valid], label=label + ': canopy', color=color)
    axes[0].plot(d['t'][valid], d['payload_height'][valid], color=color, linestyle=':', label=label + ': payload')
    axes[1].plot(d['t'][valid], d['canopy_pitch_deg'][valid], label=label, color=color)
    axes[2].plot(d['t'][held], d['tension_N'][held], color=color, label=label)
for ax in axes:
    for start, end, label in [(0, 1, 'Swing'), (1, 2.2, 'Two steps'), (2.2, 2.4, 'Toss'), (2.4, 3.4, 'Glide')]:
        ax.axvspan(start, end, color='gray', alpha=.06 if label in ['Swing', 'Toss'] else .13)
    ax.axvline(2.4, color='black', linestyle='--', alpha=.6)
    ax.grid(alpha=.25)
    ax.set_xlim(0, 3.4)
axes[0].axhline(0, color='black', alpha=.5)
axes[0].set_ylabel('Height (m)')
axes[0].legend(fontsize=8, loc='upper right')
axes[1].set_ylabel('Physical canopy pitch (deg)')
axes[2].axhline(0, color='red', linestyle=':', label='Below zero requires line compression')
axes[2].set_ylabel('Line tension proxy (N)')
axes[2].set_xlabel('Time since swing start (s); dashed line = release')
axes[2].legend(fontsize=8)
fig.suptitle('Launch feasibility experiment: inflated rigid-wing physics cannot represent inflation\n'
             'One-second overhead swing, two steps, light toss; throttle remains off for one second after release', fontsize=11)
fig.savefig(root / 'launch-feasibility.png', dpi=180)
fig.savefig(root / 'launch-feasibility.pdf')
metadata = dict(
    scope='Local reduced-order longitudinal experiment; not Plane/SITL autopilot or an inflation model',
    user_provided=dict(grip='bottom of payload', preparation='canopy laid out in crescent',
                       swing_duration_s='about one', steps_before_release=2,
                       release='light toss', glide_before_throttle_s='about one'),
    provisional=dict(swing_radius_m=.6, swing_pivot_height_m=1.2, grip_below_payload_CG_m=.1,
                     steps_distance_m=1.8, steps_duration_s=1.2, toss_duration_s=.2,
                     release_payload_velocity_mps=[4.8, 0, -.6], wind_mps=0, throttle_after_glide=.47),
    results=results, convergence_2400_vs_4800_hz=convergence,
    analytic_checks=subprocess.run([str(root / 'swing'), '--check'], capture_output=True,
                                  text=True, check=True).stdout.strip(),
    limitations=['Wing is inflated at all times: no fabric inflation, slack lines, or independent canopy attitude.',
                 'Initial relative angle 2.5 rad is a geometric proxy, not a valid folded-wing aerodynamic state.',
                 'Negative line tension is physically invalid for suspension lines.',
                 'Stop interpreting a run at its first predicted ground contact.',
                 'Ground is not integrated as a collision/contact surface in this local experiment.',
                 'No flight-data calibration, controller tuning, or new normal AUTO mission claims.'],
    source_sha256={name: hashlib.sha256((repo / 'libraries/SITL' / name).read_bytes()).hexdigest()
                   for name in ['SIM_Paraglider.cpp', 'SIM_Paraglider.h']})
(root / 'results.json').write_text(json.dumps(metadata, indent=2) + '\n')
print(metadata['analytic_checks'])
print('Convergence:', convergence)
for r in results:
    print(r['name'], 'release canopy pitch', round(r['release']['canopy_pitch_deg'], 1),
          'first predicted contact after release (s)', round(r['first_predicted_contact']['t'] -
                                                           r['swing_duration_s'] - 1.4, 2))
