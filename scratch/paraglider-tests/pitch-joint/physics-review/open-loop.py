import json,subprocess
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from trim import Physics,root
trims=json.loads((root/'trim.json').read_text());matched=json.loads((root/'matched-locked-trim.json').read_text());trims=[matched if t['model']=='locked' else t for t in trims]
results=[];fig,axs=plt.subplots(3,2,figsize=(12,10),sharex=True)
for trim in trims:
 name=trim['model'];p=Physics(name);eq=np.array([trim['theta'],trim['relative'],0,0,trim['V'],0]);active=list(range(6)) if name=='joint' else [0,2,4,5]
 def f(y):
  e=p.evaluate(*y,trim['throttle']);return np.array([y[2],y[3],e[2],e[3],e[0],e[1]])
 ds=.0003;a=np.column_stack([(f(eq+np.eye(6)[i]*ds)-f(eq-np.eye(6)[i]*ds))/(2*ds) for i in range(6)]);eig=np.linalg.eigvals(a[np.ix_(active,active)])
 r=dict(model=name,longitudinal_trim=trim,open_loop_modes=[dict(real=float(e.real),frequency_hz=float(abs(e.imag)/(2*np.pi))) for e in eig],density_kg_m3=1.225)
 for col,perturb in enumerate(['pitch','throttle']):
  path=root/(name+'-'+perturb+'.csv')
  with path.open('w') as out:subprocess.run([str(root/'simulate'),name,'0',str(1/1200),'40',perturb],input=' '.join(map(str,[*eq,trim['throttle']]))+'\n',text=True,stdout=out,check=True)
  d=np.genfromtxt(path,delimiter=',',names=True)
  axs[0,col].plot(d['t'],np.rad2deg(d['theta']-eq[0]),label='matched locked joint' if name=='locked' else name)
  axs[1,col].plot(d['t'],np.rad2deg(d['qp']));axs[2,col].plot(d['t'],-d['vz'])
  r[perturb]=dict(final_pitch_error_deg=float(np.rad2deg(d['theta'][-1]-eq[0])),payload_rate_peak_deg_s=float(np.rad2deg(abs(d['qp']).max())),final_vertical_speed_m_s=float(d['vz'][-1]))
 results.append(r);p.close()
axs[0,0].set_title('3° initial payload pitch perturbation');axs[0,1].set_title('+5 percentage-point throttle pulse (1 s)')
for ax in axs[0]:ax.set_ylabel('Pitch departure (°)');ax.legend()
for ax in axs[1]:ax.set_ylabel('Payload pitch rate (°/s)')
for ax in axs[2]:ax.set_ylabel('Climb rate (m/s)');ax.set_xlabel('Time (s)')
for ax in axs.flat:ax.grid(alpha=.3)
fig.suptitle('Corrected production SITL longitudinal dynamics — autopilot disconnected')
fig.tight_layout();fig.savefig(root/'open-loop-response.png');fig.savefig(root/'open-loop-response.pdf')
(root/'open-loop-results.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results,indent=2))
