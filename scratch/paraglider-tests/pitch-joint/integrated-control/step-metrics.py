import json
from pathlib import Path
import numpy as np
r=Path(__file__).parent;old=r.parent/'oracle-control';results=[]
for folder,name in [(old,'snappy-current'),(old,'snappy-oracle3')]+[(r,'step-'+n) for n in ['rate-soft','rate-medium','rate-fast']]:
 meta=json.loads((folder/(name+'-metadata.json')).read_text());tele=np.genfromtxt(folder/(name+'.csv'),delimiter=',',names=True)
 start=meta['events'][0]['t'];stop=meta['events'][-1]['t'];mask=(tele['t']>=start)&(tele['t']<start+59)
 late=(tele['t']>=stop+4)&(tele['t']<start+59)
 t=tele['t'];v=tele['climb'];candidates=np.flatnonzero((t>=stop+.4)&(t<start+55));settle=None
 for i in candidates:
  window=(t>=t[i])&(t<t[i]+4)
  if max(abs(v[window]))<.05:settle=float(t[i]-stop);break
 # Common incoming climb-rate trajectory: estimate interior mean slope for commanded legs.
 if folder==r:
  z=np.load(r/(name+'-series.npz'));tt=z['TECS__TimeUS']*1e-6;hin=z['TECS__hin']
 else:
  z=np.load(r/(name+'-baseline-series.npz'));tt=z['tecs'][:,0]+start;hin=z['tecs'][:,1]
 desired=np.zeros_like(t);requests=[]
 for event in meta['events']:
  if event['pwm']==1500:continue
  m=(tt>=event['t']+.5)&(tt<event['t']+5.8);rate=np.polyfit(tt[m],hin[m],1)[0];requests.append(float(rate))
  desired[(t>=event['t'])&(t<event['t']+event['duration'])]=rate
 out=dict(name=name,payload_q_rms_deg_s=float(np.sqrt(np.mean(np.rad2deg(tele['q'][mask])**2))),
          post_command_q_rms_deg_s=float(np.sqrt(np.mean(np.rad2deg(tele['q'][late])**2))),settle_to_005_mps_for_4s_after_climb_stop_s=settle,
          incoming_rate_tracking_rmse_mps=float(np.sqrt(np.mean((v[mask]-desired[mask])**2))),requested_rates_mps=requests)
 results.append(out);print(out)
(r/'step-summary.json').write_text(json.dumps(results,indent=2))
