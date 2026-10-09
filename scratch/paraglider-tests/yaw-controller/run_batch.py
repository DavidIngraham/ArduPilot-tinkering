import hashlib,json,os,subprocess,sys,time
from pathlib import Path
root=Path(__file__).parent;repo=Path('/workspace/ardupilot')
env=dict(os.environ,PYTHONUNBUFFERED='1',PYTHONPATH='/tmp/paraglider-python-deps',PATH='/tmp/paraglider-python-deps/bin:'+os.environ['PATH'])
binary_sha=hashlib.sha256((repo/'build/sitl/bin/arduplane').read_bytes()).hexdigest()
results=[]
for config in json.loads(Path(sys.argv[1]).read_text()):
 name=config['name'];path=root/(name+'.json');path.write_text(json.dumps(config,indent=2)+'\n')
 print('START',name,flush=True);t=time.monotonic()
 with (root/(name+'.log')).open('w') as log:
  process=subprocess.run(['python3',str(root/'run_trial.py'),str(path)],cwd=repo,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=600)
 result={**config,'binary_sha256':binary_sha,'result':'PASS' if process.returncode==0 else 'FAIL','wall_seconds':time.monotonic()-t}
 results.append(result);Path(str(sys.argv[1])+'.results.json').write_text(json.dumps(results,indent=2)+'\n')
 print('FINISH',name,result['result'],round(result['wall_seconds'],1),flush=True)
