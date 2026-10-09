# AP_FLAKE8_CLEAN
import csv
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from pymavlink import mavutil

root = Path(__file__).parent
results = []
series = {}
for path in sorted(root.glob('*-metadata.json')):
    metadata = json.loads(path.read_text())
    name = metadata['config']['name']
    rows = list(csv.DictReader((root / (name + '.csv')).open()))
    data = np.array([[float(row[key]) for key in ('t', 'pitch', 'q', 'altitude', 'pwm')] for row in rows])
    data[:, 0] -= metadata['start']
    data[:, 1:3] *= 180 / np.pi
    series[name] = data
    early = data[(data[:, 0] > 2) & (data[:, 0] < 22)]
    late = data[(data[:, 0] > 80) & (data[:, 0] < 100)]
    metrics = dict(metadata['config'], pitch_pp_deg=float(np.ptp(late[:, 1])),
                   pitch_rate_rms_deg_s=float(np.sqrt(np.mean(late[:, 2]**2))),
                   throttle_pp_pct=float(np.ptp(late[:, 4]) / 10),
                   early_rate_std=float(np.std(early[:, 2])),
                   late_rate_std=float(np.std(late[:, 2])),
                   minimum_altitude_m=float(np.min(data[data[:, 0] >= 0, 3])))
    results.append(metrics)
(root / 'results.json').write_text(json.dumps(results, indent=2) + '\n')
for result in results:
    print(result['name'], 'late pitch pp', round(result['pitch_pp_deg'], 2),
          'q RMS', round(result['pitch_rate_rms_deg_s'], 2),
          'throttle pp', round(result['throttle_pp_pct'], 1),
          'minimum altitude', round(result['minimum_altitude_m'], 1))
selected = [name for name in ('rigid-g0', 'rigid-g0.2', 'joint-g0', 'joint-g0.2', 'joint-g1', 'rigid-g1',
                            'joint-z-0.25-g0', 'joint-z-0.25-g0.2', 'joint-z-0.25-g1') if name in series]
fig, axes = plt.subplots(3, 1, figsize=(12, 9), sharex=True)
for name in selected:
    data = series[name]
    mask = data[:, 0] >= -5
    for ax, column in zip(axes, (1, 2, 4)):
        values = data[mask, column]
        if column == 4:
            values = (values - 1000)/10
        ax.plot(data[mask, 0], values, label=name, lw=1)
for ax, label in zip(axes, ('Payload pitch (deg)', 'Payload pitch rate (deg/s)', 'Throttle (%)')):
    ax.set_ylabel(label);ax.grid(alpha=0.25)
axes[0].legend(ncol=2, fontsize=8)
axes[-1].set_xlabel('Time after damper activation (s)')
fig.suptitle('Provisional canopy/payload pitch joint: actual Plane TECS in SITL')
fig.tight_layout();fig.savefig(root / 'damper-comparison.png', dpi=160)
fig.savefig(root / 'damper-comparison.pdf')

if all(name in series for name in ('joint-g0', 'joint-g0.2', 'joint-g1', 'locked-g0', 'locked-g0.2', 'locked-g1')):
    fig, axes = plt.subplots(3, 2, figsize=(12, 8), sharex=True, sharey='row')
    for column, model in enumerate(('locked', 'joint')):
        for gain, color in ((0, '#3366aa'), (0.2, '#228844'), (1, '#cc4433')):
            data = series[model + '-g' + str(gain)]
            mask = (data[:, 0] >= -5) & (data[:, 0] <= 100)
            for row, index in enumerate((1, 2, 4)):
                values = data[mask, index]
                if index == 4:
                    values = (values - 1000) / 10
                axes[row, column].plot(data[mask, 0], values, label='Damper ' + str(gain), color=color, lw=1)
        axes[0, column].set_title('Joint locked' if model == 'locked' else 'Joint free')
        axes[0, column].legend(fontsize=9)
    for ax, label in zip(axes[:, 0], ('Payload pitch (deg)', 'Pitch rate (deg/s)', 'Throttle (%)')):
        ax.set_ylabel(label)
    for ax in axes.flat:
        ax.grid(alpha=0.25)
        ax.axvline(0, color='black', ls=':', alpha=0.4)
    for ax in axes[-1]:
        ax.set_xlabel('Time after damper activation (s)')
    fig.suptitle('Same geometry and inertia: locking the canopy–payload joint removes the high-gain mode')
    fig.tight_layout();fig.savefig(root / 'matched-joint-comparison.png', dpi=160)
    fig.savefig(root / 'matched-joint-comparison.pdf')
