import csv
import json
import math
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

root = Path(__file__).parent
paths = [('Previous: WP_RADIUS 40 m', root.parent / 'l1-quicktune/ParagliderAutoMission-L1Tune.csv', '#176db4'),
         ('Explicit acceptance 60 m', root / 'ParagliderAutoMission.csv', '#159447')]
runs = []
for label, path, color in paths:
    meta = json.loads(Path(str(path) + '.json').read_text())
    points = []
    for row in csv.DictReader(path.open()):
        north = math.radians(float(row['latitude_deg']) - meta['home_lat']) * 6371000
        east = math.radians(float(row['longitude_deg']) - meta['home_lng']) * 6371000 * math.cos(math.radians(meta['home_lat']))
        points.append((east, north, int(row['seq'])))
    runs.append((label, meta, points, color))

fig, (full, turn) = plt.subplots(1, 2, figsize=(13, 6), constrained_layout=True)
route = runs[0][1]['route']
full.plot([r[2] for r in route], [r[1] for r in route], '--', color='0.65', lw=1, label='Waypoint connections')
full.scatter([r[2] for r in route[:-1]], [r[1] for r in route[:-1]], color='0.35', s=15, zorder=4)
for label, meta, points, color in runs:
    full.plot([p[0] for p in points], [p[1] for p in points], color=color, lw=1.4, label=label)
    close = [p for p in points if p[2] in (4, 5)]
    turn.plot([p[0] for p in close], [p[1] for p in close], color=color, lw=2, label=label)
full.set(title='Complete AUTO mission', xlabel='East of home (m)', ylabel='North of home (m)', aspect='equal')
# WP4 is approached from the north, then departed towards the west.
turn.plot([400, 400, 260], [360, 250, 250], '--', color='0.6', lw=1.2)
turn.scatter([400], [250], s=45, marker='x', color='0.25', zorder=5)
turn.annotate('WP4', (400, 250), xytext=(407, 255))
turn.set(title='Waypoint 4: turn overshoot', xlabel='East of home (m)', ylabel='North of home (m)',
         xlim=(290, 455), ylim=(215, 350), aspect='equal')
metrics = json.loads((root / 'comparison.json').read_text())
turn.text(.03, .03, 'Beyond waypoint along approach:\nPrevious: 17.6 m\n60 m acceptance: 9.9 m',
          transform=turn.transAxes, fontsize=10, bbox=dict(facecolor='white', alpha=.9, edgecolor='0.8'))
for ax in (full, turn):
    ax.grid(alpha=.2)
    ax.legend(loc='upper left', fontsize=9)
fig.suptitle('Paraglider mission: increased waypoint acceptance radius\nIdentical gains: FF 1.32, D_FF 0.0875, L1 damping 0.95, period 14.45 s', fontsize=14)
fig.savefig(root / 'mission-radius-comparison.png', dpi=180)
