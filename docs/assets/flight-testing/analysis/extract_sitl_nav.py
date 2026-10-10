from pathlib import Path
import json,datetime
from pymavlink import mavutil
R=Path('/mnt/c/Users/davin/OneDrive/Documentos/Mission Planner');O=R/'analysis/longitudinal-2026-10-09/system-identification'
p=R/'logs/SITL/FIXED_WING/1/2026-02-14 13-43-43.tlog'
d=mavutil.mavlink_connection(str(p)); rows=[];count=0
lo=datetime.datetime.fromisoformat('2026-02-15T11:20:00-08:00').timestamp();hi=lo+30*60
while True:
 m=d.recv_match(type=['NAV_CONTROLLER_OUTPUT','PID_TUNING'])
 if m is None:break
 t=m._timestamp
 if lo<=t<=hi and m.get_srcSystem()==1 and m.get_srcComponent()==1:
  x=m.to_dict();x['t']=t;rows.append(x)
 count+=1
 if count%100000==0: print('scanned',count,flush=True)
(O/'sitl-selected-navigation.json').write_text(json.dumps(rows))
print('saved',len(rows),flush=True)
