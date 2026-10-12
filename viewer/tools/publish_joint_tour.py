"""Copy only the built joint-tour entry and its required assets into the website."""
import argparse,re,shutil
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('destination',type=Path);a=p.parse_args()
src=Path(__file__).resolve().parents[1]/'dist';dest=a.destination;dest.mkdir(parents=True,exist_ok=True)
shutil.copy2(src/'joint-tour.html',dest/'joint-tour.html')
for folder in ['assets','models','joint-tour']:(dest/folder).mkdir(exist_ok=True)
seen=set()
def bundle(name):
 if name in seen:return
 seen.add(name);path=src/'assets'/name;shutil.copy2(path,dest/'assets'/name)
 for dep in re.findall(r"[\"']\./([^\"']+\.js)[\"']",path.read_text()):bundle(dep)
for name in re.findall(r"\./assets/([^\"']+\.js)",(src/'joint-tour.html').read_text()):bundle(name)
for name in ['models/microagu-payload-tl.glb','joint-tour/responses.json']:shutil.copy2(src/name,dest/name)
print('Published joint tour with',len(seen),'JavaScript assets')
