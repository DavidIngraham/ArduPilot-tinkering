"""Copy the simulator and its local dependencies into the existing Pages site."""
import argparse, json, re, shutil
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('destination',type=Path);a=p.parse_args()
source=Path(__file__).resolve().parents[1]/'dist'
copied=set()
def copy(name):
    if name in copied:return
    src=source/name
    if not src.is_file():raise FileNotFoundError(src)
    dst=a.destination/name;dst.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(src,dst);copied.add(name)
    if name.endswith('.html'):
        for ref in re.findall(r'\./(assets/[^"\s]+)',src.read_text()):copy(ref)
    if name.endswith('.js') and name.startswith('assets/'):
        for ref in re.findall(r'["\']\./([^"\']+\.js)["\']',src.read_text()):copy('assets/'+ref)
for name in ['simulator.html','simulator-sw.js','models/microagu-payload-tl.glb','wasm/arduplane.js','wasm/arduplane.wasm','wasm/build.json','wasm/COPYING.txt']:
    copy(name)
print(f'Published {len(copied)} simulator files to {a.destination}')
