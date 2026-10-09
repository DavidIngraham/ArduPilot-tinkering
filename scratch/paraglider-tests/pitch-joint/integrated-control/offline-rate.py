import json,sys
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).parent.parent/'physics-review'))
from trim import Physics
r=Path(__file__).parent
for name in ['rate-soft','rate-medium','rate-fast']:
 g=json.loads((r/(name+'-gains.json')).read_text());k=np.array(g['K']);ref=np.array(g['ref']);tr=np.array(g['trim']);p=Physics('joint');x=tr.copy();integ=0;dt=.005;u=tr[7];record=[]
 for j in range(18000):
  t=j*dt;target=0 if t<10 or 16<=t<28 or t>=34 else (-.2 if t<16 else .2)
  if j%4==0:
   raw=-k[:8]@(x-tr-ref[:8]*target)-k[8]*integ;rate=np.clip(raw,-1,1);u=np.clip(x[7]+.02*rate,0,1)
   error=-x[5]-target
   if abs(raw-rate)<1e-6 or (raw-rate)*k[8]*error>0:integ=np.clip(integ+.02*error,-2,2)
  def f(z):
   e=p.evaluate(*z[:6],z[6]);return np.r_[z[2],z[3],e[2],e[3],e[0],e[1],(z[7]-z[6])/.14,0]
  x[7]=u;a=f(x);b=f(x+dt*a/2);c=f(x+dt*b/2);d=f(x+dt*c);x+=dt*(a+2*b+2*c+d)/6
  if j%4==0:record.append([t,*x,integ,target])
 p.close();record=np.array(record);mask=(record[:,0]>=10)&(record[:,0]<69)
 out=dict(name=name,q_rms_deg_s=float(np.rad2deg(np.sqrt(np.mean(record[mask,3]**2)))),late_q_deg_s=float(np.rad2deg(np.sqrt(np.mean(record[-1000:,3]**2)))),pitch_pp_deg=float(np.rad2deg(np.ptp(record[mask,1]))))
 np.save(r/(name+'-offline.npy'),record);print(out,flush=True)
