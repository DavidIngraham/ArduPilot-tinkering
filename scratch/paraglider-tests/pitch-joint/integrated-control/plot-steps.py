import json
from pathlib import Path
import numpy as np
import matplotlib;matplotlib.use('Agg')
import matplotlib.pyplot as plt
root=Path(__file__).parent;old=root.parent/'oracle-control'
fig,ax=plt.subplots(4,1,figsize=(11,10),sharex=True,constrained_layout=True);summary=[]
for folder,name,label,color in [(old,'snappy-current','Existing TECS','tab:orange'),(old,'snappy-oracle3','Previous joint feedback','tab:purple')]+[(root,'step-'+n,'Integrated '+n,c) for n,c in [('rate-soft','tab:green'),('rate-medium','tab:blue')]]:
 p=folder/(name+'-metadata.json')
 if not p.exists():continue
 meta=json.loads(p.read_text())
 if not meta.get('events'):continue
 t0=meta['events'][0]['t'];tele=np.genfromtxt(folder/(name+'.csv'),delimiter=',',names=True);tt=tele['t']-t0
 if folder==root:
  if not (root/(name+'-series.npz')).exists():continue
  z=np.load(root/(name+'-series.npz'));dt=z['PGJT__TimeUS']*1e-6-t0;rel=z['PGJT__Rel'];mt=z['PGAF__TimeUS']*1e-6-t0;motor=z['PGAF__Act']
 else:
  from pymavlink import mavutil
  mav=mavutil.mavlink_connection(str(max((folder/(name+'-logs')).glob('*.BIN'),key=lambda p:p.stat().st_mtime)));j=[];o=[];te=[]
  while True:
   m=mav.recv_match(type=['PGJT','PGOR','TECS'])
   if m is None:break
   if m.get_type()=='PGJT':j.append([m.TimeUS*1e-6-t0,m.Rel])
   elif m.get_type()=='PGOR':o.append([m.TimeUS*1e-6-t0,m.Act])
   else:te.append([m.TimeUS*1e-6-t0,m.hin])
  j=np.array(j);o=np.array(o);dt=j[:,0];rel=j[:,1];mt=o[:,0];motor=o[:,1]
  np.savez(root/(name+'-baseline-series.npz'),jt=j,orc=o,tecs=np.array(te))
 ax[0].plot(tt,tele['climb'],label=label,color=color);ax[1].plot(tt,np.rad2deg(tele['q']),color=color)
 ax[2].plot(dt,rel,color=color);ax[3].plot(mt,motor*100,color=color)
 mask=(tt>=0)&(tt<59);summary.append(dict(name=name,q_rms=float(np.sqrt(np.mean(np.rad2deg(tele['q'][mask])**2)))))
for a,label in zip(ax,['Climb rate (m/s)','Payload pitch rate (deg/s)','Relative pitch (deg)','Motor throttle (%)']):
 a.set_ylabel(label);a.grid(alpha=.25);a.set_xlim(0,59)
 for t in [0,6,18,24]:a.axvline(t,color='k',alpha=.15,linestyle=':')
ax[0].legend(ncol=2,fontsize=8);ax[-1].set_xlabel('Time from first maneuver (s)')
fig.suptitle('Integrated longitudinal control in actual Plane/SITL\nSame descent / hold / climb / hold; truth-state benchmark, no observer or stall protection')
fig.savefig(root/'step-comparison.png',dpi=170);fig.savefig(root/'step-comparison.pdf')
print(summary)
