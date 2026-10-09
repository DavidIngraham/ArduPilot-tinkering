# AP_FLAKE8_CLEAN
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
root=Path(__file__).parent
rows={r['name']:r for r in json.loads((root/'frequency-results.json').read_text())}
cases=[('default','Current defaults','tab:gray'),('snappy-current','Faster PI + payload damper','tab:orange'),
       ('snappy-oracle','Faster PI + true-state feedback','tab:blue')]
selected=[]
fig,axes=plt.subplots(2,2,figsize=(11.5,8),constrained_layout=True)
for name,label,color in cases:
 low=rows['frequency-'+name];high=rows['frequency-low-speed-'+name]
 meta=json.loads((root/('frequency-low-speed-'+name+'-metadata.json')).read_text())
 assert meta['actual_frequency_speedup']==2
 bands=[dict(b,source=low['name'],speedup=10) for b in low['bands'] if b['frequency_hz']<.16]
 bands += [dict(b,source=high['name'],speedup=2) for b in high['bands']]
 f=np.array([b['frequency_hz'] for b in bands]);gain=np.array([b['gain_db'] for b in bands])
 phase=np.array([b['phase_deg'] if b['phase_deg']<=0 else b['phase_deg']-360 for b in bands])
 crossing=None
 for i in range(len(f)-1):
  if gain[i]>=-3 and gain[i+1]<-3:
   crossing=float(np.exp(np.interp(-3,[gain[i+1],gain[i]],[np.log(f[i+1]),np.log(f[i])])));break
 result=dict(name=name,bands=bands,coarse_minus3db_hz=crossing,
             caution='Large resonant peaks precede the -3 dB crossing; this is not a usable/safe tracking bandwidth.',
             phase_display='Principal positive phases shown on the negative-lag branch; frequency sampling is sparse.')
 selected.append(result)
 axes[0,0].semilogx(f,gain,'o-',label=label,color=color)
 axes[0,1].semilogx(f,phase,'o-',color=color)
 axes[1,0].semilogx(f,[b['payload_q_rms_deg_s'] for b in bands],'o-',color=color)
 axes[1,1].semilogx(f,[b['max_canopy_alpha_deg'] for b in bands],'o-',color=color)
(root/'frequency-selected.json').write_text(json.dumps(selected,indent=2)+'\n')
axes[0,0].axhline(-3,color='black',alpha=.4,linestyle=':');axes[0,0].set_ylabel('Climb-rate tracking gain (dB)')
axes[0,1].axhline(-45,color='black',alpha=.4,linestyle=':');axes[0,1].set_ylabel('Tracking phase (deg)')
axes[1,0].set_ylabel('Payload pitch-rate RMS (deg/s)')
axes[1,1].axhline(15,color='red',linestyle=':',alpha=.5,label='Model linear-aero boundary')
axes[1,1].set_ylabel('Maximum canopy AoA (deg)')
for ax in axes.flat:ax.grid(alpha=.25);ax.set_xlabel('Requested climb-rate frequency (Hz)')
axes[0,0].legend(fontsize=8);axes[1,1].legend(fontsize=8)
fig.suptitle('Actual Plane/SITL frequency response: reduced resonance, no large bandwidth gain\n'
             '0.2 ± 0.1 m/s climb commands; fit uses logged incoming altitude and simulated GPS vertical velocity\n'
             'Points ≥0.16 Hz repeated at verified 2× simulation speed; no observer or stall protection',fontsize=11)
fig.savefig(root/'frequency-final.png',dpi=180);fig.savefig(root/'frequency-final.pdf')
for row in selected:print(row['name'],row['coarse_minus3db_hz'])
