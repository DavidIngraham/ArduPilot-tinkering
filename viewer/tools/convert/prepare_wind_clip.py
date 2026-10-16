#!/usr/bin/env python3
"""Prepare a video comparison clip; explicitly annotate a known legacy calm run.

Physics states and timestamps are preserved. --calm is an assertion about the
source run, not a conversion of a windy simulation into calm flight.
"""
import argparse
import hashlib
import json
from pathlib import Path
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('run', type=Path)
p.add_argument('output', type=Path)
p.add_argument('--calm', action='store_true')
a = p.parse_args()
source = a.run / 'auto-clip.jsonl'
frames = [json.loads(s) for s in source.read_text().splitlines()]
if a.calm:
    assert not (a.run / 'truth.turbulence.json').exists()
    for f in frames:
        assert not f.get('turbulence') and not any(f.get('wind_ned_m_s', [0,0,0]))
        f['wind_ned_m_s'] = [0., 0., 0.]
assert all('wind_ned_m_s' in f for f in frames)
a.output.mkdir(parents=True, exist_ok=True)
clip = a.output / 'auto-clip.jsonl'
with clip.open('x') as out:
    for f in frames:
        out.write(json.dumps(f, allow_nan=False) + '\n')
meta = json.loads((a.run / 'auto-mission.json').read_text())
meta.update(original_clip_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
            clip_sha256=hashlib.sha256(clip.read_bytes()).hexdigest(),
            altitude_range_m=[min(-f['state'][2] for f in frames), max(-f['state'][2] for f in frames)],
            throttle_range_pct=[100*min(f['throttle'] for f in frames), 100*max(f['throttle'] for f in frames)],
            wind_annotation='Known calm source; zero wind annotated' if a.calm else 'Recorded physics wind preserved')
(a.output / 'auto-mission.json').write_text(json.dumps(meta, indent=2)+'\n')
print(json.dumps({k: meta[k] for k in ['duration_s','altitude_range_m','throttle_range_pct']}, indent=2))
