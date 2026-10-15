"""Publish native article applets and their exact replay data (no video files)."""
import argparse, hashlib, json, re, shutil
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('destination',type=Path);args=parser.parse_args()
src=Path(__file__).resolve().parents[1]/'dist';dst=args.destination;copied=set()
def copy(name):
    if name in copied:return
    source=src/name
    if not source.is_file():raise FileNotFoundError(source)
    target=dst/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target);copied.add(name)
    if name.endswith('.html'):
        for asset in re.findall(r"\./(assets/[^\"']+\.(?:js|css))",source.read_text()):copy(asset)
    elif name.endswith('.js'):
        for asset in re.findall(r"[\"']\./([^\"']+\.js)[\"']",source.read_text()):copy('assets/'+asset)
for name in ['joint-tour','trim-launch','landing','controller-comparison','rigging-comparison','pitch-comparison','altitude-comparison','pitch-fbd','simulation-replay','flight-replay']:
    copy(name+'.html')
for folder in ['joint-tour','landing','controller-comparison','rigging-comparison','pitch-sign','altitude-comparison','flight-replays']:
    for file in (src/folder).rglob('*'):
        if file.suffix in ['.json','.jsonl']:copy(file.relative_to(src).as_posix())
for name in ['gust-showcase.jsonl','compare-calm.jsonl','compare-gust.jsonl','compare-crosswind.jsonl','models/microagu-payload-tl.glb']:copy(name)
manifest={name:hashlib.sha256((src/name).read_bytes()).hexdigest() for name in sorted(copied)}
(dst/'applet-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'Published {len(copied)} files; SHA-256 replay and bundle inventory: applet-manifest.json')
