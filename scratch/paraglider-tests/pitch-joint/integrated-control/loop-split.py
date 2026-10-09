import json
from pathlib import Path
import numpy as np
r=Path(__file__).parent;results=[]
for name in ['frequency-rate-soft','frequency-rate-medium']:
 meta=json.loads((r/(name+'-metadata.json')).read_text());z=np.load(r/(name+'-series.npz'));bands=[]
 for e in meta['events']:
  f=e['frequency_hz'];w=2*np.pi*f
  def fit(typ,key):
   t=z[typ+'__TimeUS']*1e-6-e['t'];m=(t>=1/f)&(t<e['duration'])
   if typ=='GPS':m&=z['GPS__I']==0
   t=t[m];y=z[typ+'__'+key][m];D=np.column_stack([np.ones(len(t)),t,np.sin(w*t),np.cos(w*t)])
   return np.linalg.lstsq(D,y,rcond=None)[0]
  h=fit('TECS','hin');v=-fit('GPS','VZ');d=fit('PGLQ','Target')
  incoming=complex(w*h[2],w*h[3]);target=complex(d[3],-d[2]);actual=complex(v[3],-v[2])
  inner=actual/target;outer=target/incoming
  bands.append(dict(frequency_hz=f,inner_gain=float(abs(inner)),inner_phase_deg=float(np.angle(inner)*180/np.pi),
                    outer_target_gain=float(abs(outer)),outer_target_phase_deg=float(np.angle(outer)*180/np.pi)))
 results.append(dict(name=name,bands=bands));print(name,bands)
(r/'loop-split.json').write_text(json.dumps(results,indent=2))
