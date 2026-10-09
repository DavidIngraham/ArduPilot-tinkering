import os,shutil,subprocess,sys
from pathlib import Path
root=Path(__file__).parent;repo=Path('/workspace/ardupilot')
try:
 shutil.copy2(root/'experimental-arduplane',repo/'build/sitl/bin/arduplane')
 env=dict(os.environ,PG_LQI_GAINS=str(root/'rate-soft-gains.txt'))
 with (root/'auto-mission.txt').open('w') as log:
  ret=subprocess.run([sys.executable,str(root/'mission.py')],cwd=repo,env=env,stdout=log,stderr=subprocess.STDOUT)
 print('AUTO course',ret.returncode,flush=True)
finally:shutil.copy2(root/'production-arduplane',repo/'build/sitl/bin/arduplane')
