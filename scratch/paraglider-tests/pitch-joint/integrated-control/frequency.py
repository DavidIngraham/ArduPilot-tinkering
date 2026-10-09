import json
from pathlib import Path
import numpy as np
import matplotlib;matplotlib.use('Agg')
import matplotlib.pyplot as plt
root=Path(__file__).parent
results=[]
for p in root.glob('frequency*-metadata.json'):
 meta=json.loads(p.read_text());name=meta['config']['name']
 if not meta.get('events'):continue
 z=np.load(root/(name+'-series.npz'));bands=[]
 for event in meta['events']:
  f=event['frequency_hz'];w=2*np.pi*f
  def fit(typ,key):
   t=z[typ+'__TimeUS']*1e-6-event['t'];y=z[typ+'__'+key];mask=(t>=1/f)&(t<event['duration'])
   if typ=='GPS':mask&=z['GPS__I']==0
   t=t[mask];y=y[mask];D=np.column_stack([np.ones(len(t)),t,np.sin(w*t),np.cos(w*t)])
   coeff=np.linalg.lstsq(D,y,rcond=None)[0];return coeff,float(np.sqrt(np.mean((y-D@coeff)**2)))
  ref,rr=fit('TECS','hin');v,vr=fit('GPS','VZ');v=-v
  h=complex(v[3],-v[2])/complex(w*ref[2],w*ref[3])
  t=z['PGJT__TimeUS']*1e-6-event['t'];mask=(t>=1/f)&(t<event['duration'])
  at=z['PGAF__TimeUS']*1e-6-event['t'];am=(at>=1/f)&(at<event['duration'])
  bands.append(dict(frequency_hz=f,gain=float(abs(h)),gain_db=float(20*np.log10(abs(h))),phase_deg=float(np.angle(h)*180/np.pi),
                    payload_q_rms_deg_s=float(np.sqrt(np.mean(z['PGJT__QP'][mask]**2))),max_canopy_alpha_deg=float(max(z['PGAF__Alpha'][am])),
                    input_rate_amplitude_mps=float(abs(complex(w*ref[2],w*ref[3]))),input_height_fit_residual_m=rr,output_velocity_fit_residual_mps=vr))
 results.append(dict(name=name,bands=bands))
(root/'frequency-results.json').write_text(json.dumps(results,indent=2))
fig,ax=plt.subplots(2,2,figsize=(11,8),constrained_layout=True)
old=json.loads((root.parent/'oracle-control/frequency-selected.json').read_text())
allresults=old+results
for res in allresults:
 if res['name'].startswith('frequency50-'):continue
 b=res['bands'];f=[x['frequency_hz'] for x in b];label={'default':'Existing defaults','snappy-current':'Existing faster TECS','snappy-oracle':'Previous joint feedback','frequency-rate-soft':'Integrated conservative','frequency-rate-medium':'Integrated faster'}.get(res['name'],res['name'])
 color={'default':'tab:gray','snappy-current':'tab:orange','snappy-oracle':'tab:purple','frequency-rate-soft':'tab:green','frequency-rate-medium':'tab:blue'}[res['name']]
 ax[0,0].semilogx(f,[x['gain_db'] for x in b],'o-',label=label,color=color)
 ax[0,1].semilogx(f,[x['phase_deg']-360 if x['phase_deg']>0 else x['phase_deg'] for x in b],'o-',color=color)
 ax[1,0].semilogx(f,[x['payload_q_rms_deg_s'] for x in b],'o-',color=color);ax[1,1].semilogx(f,[x['max_canopy_alpha_deg'] for x in b],'o-',color=color)
for a,label in zip(ax.flat,['Tracking gain (dB)','Phase (deg)','Payload pitch rate RMS (deg/s)','Canopy AoA maximum (deg)']):a.set_ylabel(label);a.set_xlabel('Frequency (Hz)');a.grid(alpha=.25)
ax[0,0].axhline(-3,color='k',linestyle=':',alpha=.3);ax[0,0].legend(fontsize=8)
ax[1,1].axhline(15,color='r',linestyle=':',alpha=.3)
fig.suptitle('Actual Plane/SITL requested climb-rate tracking\nTrue-state controller benchmark; AoA line is model boundary, not validated stall limit')
fig.savefig(root/'frequency-comparison.png',dpi=170);fig.savefig(root/'frequency-comparison.pdf')
for res in results:
 if not res['name'].startswith('frequency50-'):print(res,flush=True)
