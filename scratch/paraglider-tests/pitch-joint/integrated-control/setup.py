import json
from pathlib import Path
root=Path(__file__).parent;old=root.parent/'oracle-control'
for f in ['joint.json','joint-d0.json','joint-thrust-high.json','joint-thrust-low.json','airborne-fixture.py','run.py']:
 s=(old/f).read_text().replace('pitch-joint/oracle-control/','pitch-joint/integrated-control/')
 if f=='run.py':
  s=s.replace("oracle={k:os.environ.get(k,'0')", "lqi_gains=os.environ.get('PG_LQI_GAINS'),oracle={k:os.environ.get(k,'0')")
 (root/f).write_text(s)
cases=[]
for gains in ['gentle','balanced','fast']:
 cases.append(dict(name='step-'+gains,controller=gains,parameters={'TECS_TIME_CONST':2,'TECS_HDEM_TCONST':2,'TECS_VERT_ACC':2}))
(root/'initial-cases.json').write_text(json.dumps(cases,indent=2))
