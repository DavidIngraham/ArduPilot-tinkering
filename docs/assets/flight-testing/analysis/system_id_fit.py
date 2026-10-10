from pathlib import Path
import numpy as np,json,csv
from scipy.stats import linregress
R=Path('/mnt/c/Users/davin/OneDrive/Documentos/Mission Planner/analysis/longitudinal-2026-10-09');O=R/'system-identification'
for name,start,end in [('2026-01-03 15-41-42',300,1050),('2026-02-15 15-38-50',210,570)]:
 a=dict(np.load(R/name/'aligned.npz'));rows=[]
 for t in range(start,end-9,10):
  m=(a['t']>=t)&(a['t']<t+10)
  if np.all(np.isfinite(a['thr'][m]+a['climb'][m])) and np.std(a['thr'][m])<1.5 and np.all(np.isin(a['mode'][m],[0,5])):
   rows.append([t,float(np.mean(a['thr'][m])),float(np.mean(a['climb'][m])),float(np.polyfit(a['t'][m],a['h'][m],1)[0])])
 ar=np.array(rows);fit=linregress(ar[:,1],ar[:,2]);print(name,'fit',dict(n=len(rows),slope=fit.slope,intercept=fit.intercept,r2=fit.rvalue**2,level=-fit.intercept/fit.slope),'windows',rows)
 (O/(name[:10]+'-steady-fit.json')).write_text(json.dumps({'windows':rows,'slope':fit.slope,'intercept':fit.intercept,'r2':fit.rvalue**2,'level_throttle':-fit.intercept/fit.slope},indent=2))
a=dict(np.load(R/'2026-02-15 15-38-50/aligned.npz'))
for lo,hi in [(0,5),(60,101)]:
 mask=(a['thr']>=lo)&(a['thr']<hi)&a['airborne'];edges=np.flatnonzero(np.diff(np.r_[False,mask,False]));print('Trout range',lo,hi)
 for st,en in zip(edges[::2],edges[1::2]):
  if en-st>=125: print(round(a['t'][st],2),round(a['t'][en-1],2),'climb',round(float(np.mean(a['climb'][st:en])),3),'thr',round(float(np.mean(a['thr'][st:en])),2))
# Show distinct within-source telemetry values for performance limits.
keys={'TECS_CLMB_MAX','TECS_SINK_MIN','TECS_SINK_MAX'};h={}
with (R/'parameter-history.csv').open() as f:
 for x in csv.DictReader(f):
  if x['parameter'] not in keys:continue
  k=(x['source'],x['parameter']);v=round(float(x['value']),4)
  if k not in h or h[k][-1][1]!=v:h.setdefault(k,[]).append((x['time'],v))
for (src,k),v in h.items():
 if len(v)>1:print('LIMIT CHANGES',src,k,v)
(O/'limit-history.json').write_text(json.dumps([{'source':src,'parameter':k,'values':v} for (src,k),v in h.items()],indent=2))
