import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
root=Path(__file__).parent;results=[];traces={}
for p in sorted(root.glob('actual-*-metadata.json')):
 m=json.loads(p.read_text());name=p.name.replace('-metadata.json','');csv=root/(name+'.csv')
 if not csv.exists() or 'start' not in m:continue
 d=np.genfromtxt(csv,delimiter=',',names=True)
 event=m.get('perturbation_end',m['start']+2+(30 if m['config'].get('wind') else 0))
 tail=d[(d['t']>event+60)&(d['t']<event+95)]
 if not len(tail):continue
 pp=np.rad2deg(np.ptp(tail['pitch']));frequency=None
 if pp>.5:
  tt=np.arange(tail['t'][0],tail['t'][-1],.04);y=np.interp(tt,tail['t'],tail['pitch']);y=y-y.mean();freq=np.fft.rfftfreq(len(tt),.04);power=abs(np.fft.rfft(y*np.hanning(len(y))));power[freq<.2]=0;frequency=float(freq[np.argmax(power)])
 item=dict(name=name,config=m['config'],error=m['error'],pitch_pp_deg=float(pp),q_rms_deg_s=float(np.rad2deg(np.sqrt(np.mean(tail['q']**2)))),throttle_pp_pct=float(np.ptp(tail['pwm'])/10),altitude_min_m=float(tail['altitude'].min()),altitude_max_m=float(tail['altitude'].max()),frequency_hz=frequency,window_after_perturbation_s=[60,95])
 results.append(item);traces[name]=(d,event)
(root/'controller-results.json').write_text(json.dumps(results,indent=2))
fig,axs=plt.subplots(3,2,figsize=(13,10),sharex='col')
for col,names in enumerate([['actual-joint-g0','actual-joint-g0.2','actual-joint-g0.5','actual-joint-g1','actual-locked-g1'],['actual-joint-g0','actual-joint-wind3-t0','actual-joint-wind3-t0.5']]):
 for name in names:
  if name not in traces:continue
  d,event=traces[name];d=d[(d['t']>=event)&(d['t']<event+98)];t=d['t']-event
  label=name.removeprefix('actual-')
  axs[0,col].plot(t,np.rad2deg(d['pitch']),label=label,linewidth=1)
  axs[1,col].plot(t,(d['pwm']-1000)/10,label=label,linewidth=1)
  axs[2,col].plot(t,d['altitude'],label=label,linewidth=1)
 axs[0,col].set_title('Damper gain and matched locked-joint control' if col==0 else 'Free joint, damper disabled, wind from 45°')
 axs[2,col].set_xlabel('Time since perturbation ended (s)')
for ax in axs[0]:ax.set_ylabel('Payload pitch (°)')
for ax in axs[1]:ax.set_ylabel('Throttle demand (%)')
for ax in axs[2]:ax.set_ylabel('Relative altitude (m)')
for ax in axs.flat:ax.grid(alpha=.3);ax.legend(fontsize=8)
fig.suptitle('Actual Plane TECS, corrected SITL aerodynamics — airborne preparation, then free flight')
fig.tight_layout();fig.savefig(root/'actual-controller.png');fig.savefig(root/'actual-controller.pdf')
print(json.dumps(results,indent=2))
