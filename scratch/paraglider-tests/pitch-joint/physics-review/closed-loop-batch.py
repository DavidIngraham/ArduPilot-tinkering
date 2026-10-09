import json,os,subprocess,sys
from pathlib import Path
root=Path(__file__).parent
configs=[dict(name=f'actual-joint-g{g}',model='joint',gain=g) for g in [0,.1,.2,.5,1]]
configs += [dict(name=f'actual-locked-g{g}',model='locked',gain=g) for g in [0,1]]
configs += [dict(name='actual-rigid-g0.2',model='rigid',gain=.2)]
configs += [dict(name=f'actual-joint-wind3-t{t}',model='joint',gain=0,wind=3,turbulence=t) for t in [0,.5]]
results=[]
for c in configs:
 path=root/(c['name']+'.json');path.write_text(json.dumps(c))
 with (root/(c['name']+'.txt')).open('w') as f:
  r=subprocess.run([sys.executable,str(root/'closed-loop.py'),str(path)],cwd='/workspace/ardupilot',stdout=f,stderr=subprocess.STDOUT)
 results.append(dict(config=c,returncode=r.returncode));print(c['name'],r.returncode,flush=True)
 (root/'closed-loop-batch-results.json').write_text(json.dumps(results,indent=2))
