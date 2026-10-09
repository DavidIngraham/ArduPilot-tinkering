from pathlib import Path
from pymavlink import mavutil
root=Path(__file__).parent
base=root.parent/'auto-regression/aero-sign-candidate'
for name in ['rigid-calm-g0.2','joint-calm-g0']:
 print(name)
 for f in sorted((base/(name+'-logs')).glob('*.BIN')):
  log=mavutil.mavlink_connection(str(f));latest={};last=-10
  while True:
   m=log.recv_match(type=['SIM','ATT','CTUN','RCOU','PGJT'])
   if m is None:break
   latest[m.get_type()]=m.to_dict()
   t=getattr(m,'TimeUS',0)/1e6
   if m.get_type()=='SIM' and t-last>=2:
    last=t
    print(round(t,1), {k:v for k,v in latest['SIM'].items() if k in ['Pitch','Alt']}, {k:v for k,v in latest.get('CTUN',{}).items() if k in ['ThrOut','Aspd','Alt']},latest.get('PGJT',{}).get('Rel'))
