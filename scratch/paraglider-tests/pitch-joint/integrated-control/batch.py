import json,os,shutil,subprocess,sys
from pathlib import Path
root=Path(__file__).parent;repo=Path('/workspace/ardupilot')
cases=json.loads((root/sys.argv[1]).read_text());results=[]
try:
 shutil.copy2(root/'experimental-arduplane',repo/'build/sitl/bin/arduplane')
 for c in cases:
  path=root/(c['name']+'.json');path.write_text(json.dumps(c,indent=2))
  env=dict(os.environ)
  if c.get('controller'):env['PG_LQI_GAINS']=str(root/(c['controller']+'-gains.txt'))
  else:env.pop('PG_LQI_GAINS',None)
  with (root/(c['name']+'.txt')).open('w') as log:
   run=subprocess.run([sys.executable,str(root/'run.py'),str(path)],cwd=repo,env=env,stdout=log,stderr=subprocess.STDOUT)
  results.append(dict(name=c['name'],returncode=run.returncode));print(c['name'],run.returncode,flush=True)
  (root/(Path(sys.argv[1]).stem+'-results.json')).write_text(json.dumps(results,indent=2))
finally:shutil.copy2(root/'production-arduplane',repo/'build/sitl/bin/arduplane')
