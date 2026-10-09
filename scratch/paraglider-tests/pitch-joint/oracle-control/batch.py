# AP_FLAKE8_CLEAN
import json,os,shutil,subprocess,sys
from pathlib import Path
root=Path(__file__).parent;repo=Path('/workspace/ardupilot')
cases=json.loads((root/(sys.argv[1] if len(sys.argv)>1 else 'initial-cases.json')).read_text())
results=[]
try:
 shutil.copy2(root/'oracle-arduplane',repo/'build/sitl/bin/arduplane')
 for c in cases:
  path=root/(c['name']+'.json');path.write_text(json.dumps(c,indent=2))
  env=dict(os.environ,PG_ORACLE_KA=str(c['ka']),PG_ORACLE_KR=str(c['kr']),PG_ORACLE_KQ=str(c.get('kq',0)))
  with (root/(c['name']+'.txt')).open('w') as log:
   run=subprocess.run([sys.executable,str(root/'run.py'),str(path)],cwd=repo,env=env,stdout=log,stderr=subprocess.STDOUT)
  results.append(dict(name=c['name'],returncode=run.returncode))
  print(c['name'],run.returncode,flush=True)
  (root/(Path(sys.argv[1]).stem+'-results.json' if len(sys.argv)>1 else 'initial-results.json')).write_text(json.dumps(results,indent=2))
finally:
 shutil.copy2(root/'production-arduplane',repo/'build/sitl/bin/arduplane')
