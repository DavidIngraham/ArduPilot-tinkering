# AP_FLAKE8_CLEAN
import hashlib
import json
import subprocess
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

root = Path(__file__).parent
results = []
series = {}
for direction in [1, -1]:
    for duration in [.8, 1, 1.2]:
        name = f'inverted-{direction}-{duration}'
        output = subprocess.run([str(root / 'swing'), str(duration), str(direction), '4.8'],
                                capture_output=True, text=True, check=True).stdout
        (root / (name + '.csv')).write_text(output)
        data = np.genfromtxt(root / (name + '.csv'), delimiter=',', names=True)
        series[name] = data
        release = duration + 1.4
        def sample(t):
            row = data[np.argmin(abs(data['t'] - t))]
            return {k: float(row[k]) for k in data.dtype.names}
        assert min(data['canopy_height'][0], data['payload_height'][0]) > 0
        held = data['t'] < release
        contact = data[(data['t'] >= release) & ((data['canopy_height'] <= 0) | (data['payload_height'] <= 0))]
        results.append(dict(name=name, duration_s=duration, rotation_direction=direction,
                            release=sample(release), glide_end=sample(release + 1) if not len(contact) or contact[0]['t'] > release + 1 else None,
                            contact_after_release_s=float(contact[0]['t'] - release) if len(contact) else None,
                            compression_fraction=float(np.mean(data['tension_N'][held] < 0)),
                            max_hand_force_N=float(np.max(data['hand_force_N'][held]))))

output = subprocess.run([str(root / 'swing'), '1', '1', '4.8', '4800'],
                        capture_output=True, text=True, check=True).stdout
(root / 'inverted-convergence-4800.csv').write_text(output)
fine = np.genfromtxt(root / 'inverted-convergence-4800.csv', delimiter=',', names=True)
coarse = series['inverted-1-1']
valid = coarse['t'] < 3.4
errors = {}
for key in ['payload_pitch_deg', 'canopy_pitch_deg', 'cg_height']:
    errors[key] = float(np.max(abs(coarse[key][valid] - np.interp(coarse['t'][valid], fine['t'], fine[key]))))
assert errors['payload_pitch_deg'] < .1
assert errors['canopy_pitch_deg'] < .1
assert errors['cg_height'] < .002

fig, axes = plt.subplots(3, 1, figsize=(10, 9), constrained_layout=True)
for duration, color in [(.8, 'tab:orange'), (1, 'tab:blue'), (1.2, 'tab:green')]:
    data = series[f'inverted-1-{duration}']
    release = duration + 1.4
    result = next(r for r in results if r['name'] == f'inverted-1-{duration}')
    # Align release across timing variations and stop at first predicted contact.
    t = data['t'] - release
    valid = t <= min(1, result['contact_after_release_s'])
    axes[0].plot(t[valid], data['payload_pitch_deg'][valid], color=color, linestyle=':',
                 label=f'{duration:g} s swing: payload')
    axes[0].plot(t[valid], data['canopy_pitch_deg'][valid], color=color,
                 label=f'{duration:g} s swing: canopy')
    axes[1].plot(t[valid], data['payload_height'][valid], color=color, linestyle=':')
    axes[1].plot(t[valid], data['canopy_height'][valid], color=color)
    held = t < 0
    axes[2].plot(t[held], data['tension_N'][held], color=color, label=f'{duration:g} s swing')
for ax in axes:
    ax.axvline(0, color='black', linestyle='--', label='Release')
    ax.axvspan(0, 1, color='gray', alpha=.1)
    ax.grid(alpha=.25)
    ax.set_xlim(-2.65, 1)
axes[0].axhline(0, color='black', alpha=.3)
axes[0].set_ylabel('Physical pitch (deg)')
axes[0].legend(fontsize=8, ncol=2)
axes[1].axhline(0, color='black', alpha=.5)
axes[1].set_ylabel('Height (m)\nsolid: canopy; dotted: payload')
axes[2].axhline(0, color='red', linestyle=':', label='Negative tension requires compression')
axes[2].set_ylabel('Line tension proxy (N)')
axes[2].set_xlabel('Time relative to release (s); shaded: unpowered glide')
axes[2].legend(fontsize=8)
fig.suptitle('Corrected launch experiment: both bodies initially inverted\n'
             'Bottom grip rotates payload from +180° to upright; canopy remains free; fully inflated-wing approximation',
             fontsize=11)
fig.savefig(root / 'inverted-launch.png', dpi=180)
fig.savefig(root / 'inverted-launch.pdf')
metadata = dict(
    initial_condition='Both payload and canopy inverted; zero initial rates; relative pitch zero (rigging incidence retained).',
    supported_motion='Prescribed bottom-grip path and payload pitch; canopy responds about the moving hinge.',
    user_provided=dict(grip='payload bottom', start='both upside down', canopy_layout='crescent',
                       swing_duration_s='about one', walk_steps=2, release='light toss', throttle_delay_s=1),
    provisional=dict(rotation='+180 degrees to 0; opposite direction also evaluated', swing_radius_m=.6,
                     pivot_height_m=1.35, grip_below_payload_CG_m=.1, walk_distance_m=1.8,
                     walk_duration_s=1.2, toss_duration_s=.2, release_payload_velocity_mps=[4.8, 0, -.6],
                     wind_mps=0, post_glide_throttle=.47),
    results=results, convergence_2400_vs_4800_hz=errors,
    checks=subprocess.run([str(root / 'swing'), '--check'], capture_output=True, text=True, check=True).stdout.strip(),
    limitations=['Local physics integration, not a full Plane/autotest launch.',
                 'Aerodynamics still assume an inflated rigid canopy, with no fabric inflation or slack-line handling.',
                 'Canopy pitch remains coupled to its hinge-to-CG geometry.',
                 'Ground contact is detected from CG heights only, not actual body extent or collision dynamics.',
                 'Results are not calibrated to flight data and cannot validate launch reliability.',
                 'Glide samples after first predicted ground contact are invalid.',
                 'Post-glide throttle is a fixed open-loop value, not Plane TECS.'],
    harness_sha256=hashlib.sha256((root / 'swing.cpp').read_bytes()).hexdigest())
(root / 'inverted-results.json').write_text(json.dumps(metadata, indent=2) + '\n')
print(metadata['checks'])
print('Convergence:', errors)
for r in results:
    print(r['name'], 'release canopy pitch', round(r['release']['canopy_pitch_deg'], 2),
          'glide end payload height', round(r['glide_end']['payload_height'], 2) if r['glide_end'] else 'invalid after contact',
          'predicted contact after release', round(r['contact_after_release_s'], 2),
          'compression fraction', round(r['compression_fraction'], 3))
