import json,sys
from pathlib import Path
import numpy as np
from pymavlink import mavutil
root=Path(__file__).parent
for p in root.glob('*-metadata.json'):
 meta=json.loads(p.read_text())
 if 'config' not in meta:continue
 name=meta['config']['name']
 if not meta.get('events') or (root/(name+'-series.npz')).exists():continue
 f=max((root/(name+'-logs')).glob('*.BIN'),key=lambda p:p.stat().st_mtime)
 mav=mavutil.mavlink_connection(str(f));rows={t:[] for t in ['PGJT','PGAF','PGLQ','TECS','GPS']}
 while True:
  m=mav.recv_match(type=list(rows))
  if m is None:break
  rows[m.get_type()].append(m.to_dict())
 data={typ:{k:np.array([r[k] for r in rs]) for k in rs[0] if isinstance(rs[0][k],(float,int))} for typ,rs in rows.items() if rs}
 np.savez(root/(name+'-series.npz'),**{typ+'__'+k:v for typ,d in data.items() for k,v in d.items()})
 t0=meta['events'][0]['t'];j=data['PGJT'];mask=(j['TimeUS']*1e-6>=t0)&(j['TimeUS']*1e-6<t0+59)
 late=(j['TimeUS']*1e-6>=t0+40)&(j['TimeUS']*1e-6<t0+59)
 a=data['PGAF'];am=(a['TimeUS']*1e-6>=t0)&(a['TimeUS']*1e-6<t0+59)
 l=data.get('PGLQ');tele=np.genfromtxt(root/(name+'.csv'),delimiter=',',names=True);tm=(tele['t']>=t0)&(tele['t']<t0+59)
 r=dict(name=name,error=meta['error'],q_rms=float(np.sqrt(np.mean(j['QP'][mask]**2))),late_q=float(np.sqrt(np.mean(j['QP'][late]**2))),
        pitch_pp=float(np.ptp(np.rad2deg(tele['pitch'][tm]))),alpha_max=float(max(a['Alpha'][am])),altitude_min=float(min(tele['altitude'][tm])))
 if l:r['dt_median']=float(np.median(l['DT']));r['saturation']=float(np.mean(abs(l['Raw']-l['Demand'])>.001)) if 'Raw' in l else float(np.mean(abs(l['Rate'])>1.001))
 (root/(name+'-metrics.json')).write_text(json.dumps(r,indent=2));print(r,flush=True)
