import itertools,json,os,shutil,subprocess,time
from pathlib import Path
root=Path(__file__).parent
repo=Path('/workspace/ardupilot')
env=dict(os.environ,PYTHONUNBUFFERED='1',PYTHONPATH='/tmp/paraglider-python-deps',PATH='/tmp/paraglider-python-deps/bin:'+os.environ['PATH'])
results=[]
for speed,turb in itertools.product([0,1.5,3],[0,.25,.5]):
 name=f'w{speed:g}-t{turb:g}'
 config={'name':name,'wind_parameters':{'SIM_WIND_SPD':speed,'SIM_WIND_TURB':turb,'SIM_WIND_DIR':45}}
 path=root/(name+'.json');path.write_text(json.dumps(config,indent=2)+'\n')
 print('START',name,flush=True);start=time.monotonic()
 with (root/(name+'.log')).open('w') as log:
  try:
   process=subprocess.run(['python3',str(root/'run_wind.py'),str(path)],cwd=repo,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=600)
   code=process.returncode
  except subprocess.TimeoutExpired:
   code='TIMEOUT'
 for extension in ['.csv','.csv.json']:
  src=Path('/workspace/buildlogs')/('ParagliderAutoMission-'+name+extension)
  if src.exists():shutil.copy2(src,root/src.name)
 record={**config,'returncode':code,'result':'PASS' if code==0 else 'FAIL','wall_seconds':time.monotonic()-start}
 results.append(record);(root/'results.json').write_text(json.dumps(results,indent=2)+'\n')
 print('FINISH',name,record['result'],round(record['wall_seconds'],1),flush=True)
 if code=='TIMEOUT':break
