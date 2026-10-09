import json,subprocess,sys
from pathlib import Path
root=Path(__file__).parent
configs=[dict(name='mission-joint-calm-g0',model='joint',gain=0,wind=0,turbulence=0),dict(name='mission-rigid-calm-g0.2',model='rigid',gain=.2,wind=0,turbulence=0),dict(name='mission-joint-wind3-t0-g0',model='joint',gain=0,wind=3,turbulence=0,wind_ramp_s=30),dict(name='mission-joint-wind3-t0.5-g0',model='joint',gain=0,wind=3,turbulence=.5,wind_ramp_s=30)]
results=[]
for c in configs:
 path=root/(c['name']+'.json');path.write_text(json.dumps(c))
 with (root/(c['name']+'.txt')).open('w') as f:r=subprocess.run([sys.executable,str(root/'mission.py'),str(path)],cwd='/workspace/ardupilot',stdout=f,stderr=subprocess.STDOUT)
 results.append(dict(config=c,returncode=r.returncode));print(c['name'],r.returncode,flush=True)
 (root/'mission-batch-results.json').write_text(json.dumps(results,indent=2))
