import json,subprocess
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from trim import root
trims=json.loads((root/'trim.json').read_text());results=[]
fig,axes=plt.subplots(2,2,figsize=(12,8),sharex=True)
for col,name in enumerate(['locked','joint']):
 trim=next(t for t in trims if t['model']==name)
 state=[trim['theta'],trim['relative'],0,0,trim['V'],0,trim['throttle']]
 for gain in [0,.1,.2,.5,1]:
  traces={}
  for dt in [1/600,1/1200]:
   path=root/f'{name}-rate-g{gain}-dt{dt:.7f}.csv'
   with path.open('w') as f:subprocess.run([str(root/'simulate'),name,str(gain),str(dt),'60','pitch'],input=' '.join(map(str,state))+'\n',text=True,stdout=f,check=True)
   data=np.genfromtxt(path,delimiter=',',names=True);traces[str(dt)]=data
  data=traces[str(1/1200)];tail=data[data['t']>40]
  item=dict(model=name,gain=gain,pitch_pp_deg=float(np.rad2deg(np.ptp(tail['theta']))),q_rms_deg_s=float(np.rad2deg(np.sqrt(np.mean(tail['qp']**2)))),throttle_pp_pct=float(np.ptp(tail['throttle'])*100))
  other=traces[str(1/600)]
  item['timestep_tail_pitch_pp_difference_deg']=abs(float(np.rad2deg(np.ptp(other['theta'][other['t']>40])))-item['pitch_pp_deg'])
  results.append(item)
  axes[0,col].plot(data['t'],np.rad2deg(data['theta']-trim['theta']),label=f'gain {gain}')
  axes[1,col].plot(data['t'],data['throttle']*100,label=f'gain {gain}')
 axes[0,col].set_title(name+' joint');axes[1,col].set_xlabel('Time (s)')
for ax in axes[0]:ax.set_ylabel('Payload pitch departure (°)')
for ax in axes[1]:ax.set_ylabel('Throttle (%)')
for ax in axes.flat:ax.grid(alpha=.3);ax.legend()
fig.suptitle('Isolated existing pitch-rate feedback, 10 Hz filter — not full TECS')
fig.tight_layout();fig.savefig(root/'rate-feedback.png');fig.savefig(root/'rate-feedback.pdf')
(root/'feedback.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
