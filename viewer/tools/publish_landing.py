"""Publish the bounded landing viewer bundle, excluding raw research recordings."""
import argparse
import re
import shutil
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('destination', type=Path)
args = parser.parse_args()
source = Path(__file__).resolve().parents[1] / 'dist'
destination = args.destination
for folder in ['', 'assets', 'models', 'landing']:
    (destination / folder).mkdir(parents=True, exist_ok=True)
shutil.copy2(source / 'landing.html', destination / 'landing.html')
seen = set()
def bundle(name):
    if name in seen:
        return
    seen.add(name)
    path = source / 'assets' / name
    shutil.copy2(path, destination / 'assets' / name)
    for dependency in re.findall(r'[\"\']\./([^\"\']+\.js)[\"\']', path.read_text()):
        bundle(dependency)
for name in re.findall(r'\./assets/([^\"\']+\.js)', (source / 'landing.html').read_text()):
    bundle(name)
for name in ['models/microagu-payload-tl.glb', 'landing/replay.json', 'landing/replay-before.json', 'landing/replay-calm.json', 'landing/swoop-soft.json', 'landing/swoop-dramatic.json']:
    shutil.copy2(source / name, destination / name)
print('Published landing replay with', len(seen), 'JavaScript assets')
