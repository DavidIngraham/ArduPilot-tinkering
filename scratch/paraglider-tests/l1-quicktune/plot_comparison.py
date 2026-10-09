import csv
import json
import math
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

root = Path(__file__).parent
runs = {}
for name, suffix in [('Original', 'Original'), ('Steering only', 'QuickTune'), ('Steering + L1', 'L1Tune')]:
    filename = root / ('ParagliderAutoMission-' + suffix + '.csv')
    with open(str(filename) + '.json') as source:
        meta = json.load(source)
    with filename.open() as source:
        rows = list(csv.DictReader(source))
    points, errors, legs = [], [], {}
    for row in rows:
        n = math.radians(float(row['latitude_deg']) - meta['home_lat']) * 6371000
        e = math.radians(float(row['longitude_deg']) - meta['home_lng']) * 6371000 * math.cos(math.radians(meta['home_lat']))
        points.append((e, n))
        seq = int(row['seq'])
        if seq not in (2, 4, 5, 6, 7, 9, 10, 11):
            continue
        _, an, ae, _ = meta['route'][seq - 2]
        _, bn, be, _ = meta['route'][seq - 1]
        dn, de = bn - an, be - ae
        length = math.hypot(dn, de)
        along = ((n - an) * dn + (e - ae) * de) / length
        error = ((n - an) * de - (e - ae) * dn) / length
        if 80 <= along <= length - 80:
            errors.append(error)
            legs.setdefault(seq, []).append((along, error))
    runs[name] = dict(meta=meta, points=points, errors=errors, legs=legs)
colors = {'Original': '#9a4e00', 'Steering only': '#176db4', 'Steering + L1': '#159447'}
fig, axes = plt.subplots(1, 2, figsize=(13, 6), constrained_layout=True)
route = runs['Original']['meta']['route']
axes[0].plot([x[2] for x in route], [x[1] for x in route], '--', color='0.6', lw=1, label='Mission targets')
for name, data in runs.items():
    axes[0].plot(*zip(*data['points']), color=colors[name], alpha=0.8, lw=1, label=name)
    absolute = sorted(abs(x) for x in data['errors'])
    rms = math.sqrt(sum(x*x for x in data['errors']) / len(data['errors']))
    axes[1].plot(absolute, [(i+1)/len(absolute) for i in range(len(absolute))], color=colors[name], lw=2,
                 label=f'{name}: RMS {rms:.2f} m')
axes[0].set(title='Extended AUTO mission', xlabel='East of home (m)', ylabel='North of home (m)', aspect='equal')
axes[1].set(title='Central straight-leg tracking', xlabel='Absolute cross-track error (m)', ylabel='Fraction of samples', ylim=(0, 1.01))
axes[1].axhline(0.95, color='0.6', ls=':', lw=1)
for ax in axes:
    ax.grid(alpha=0.2)
    ax.legend(loc='best')
gains = dict(runs['Steering + L1']['meta']['roll_gains'], **runs['Steering + L1']['meta']['navigation_parameters'])
fig.suptitle(f"Paraglider QuickTune: FF 1.00 → {gains['RLL_RATE_FF']:.2f}, D_FF 0.0500 → {gains['RLL_RATE_D_FF']:.4f}\nL1 damping {gains['NAVL1_DAMPING']:.2f}, period {gains['NAVL1_PERIOD']:.2f} s; physical model unchanged")
fig.savefig(root / 'mission-comparison.png', dpi=160)
plt.close(fig)
fig, axes = plt.subplots(4, 2, figsize=(12, 10), sharex=True, sharey=True, constrained_layout=True)
for ax, seq in zip(axes.flat, (2, 4, 5, 6, 7, 9, 10, 11)):
    for name, data in runs.items():
        ax.plot(*zip(*data['legs'][seq]), color=colors[name], lw=1.5, label=name)
    ax.axhline(0, color='0.5', lw=0.8)
    ax.set_title(f'Straight leg {seq}')
    ax.grid(alpha=0.2)
for ax in axes[-1]: ax.set_xlabel('Distance along leg (m)')
for ax in axes[:, 0]: ax.set_ylabel('Cross-track error (m)')
axes[0, 0].legend()
fig.suptitle('Straight-leg comparison: turn-entry and waypoint-exit regions excluded')
fig.savefig(root / 'straight-leg-comparison.png', dpi=160)
