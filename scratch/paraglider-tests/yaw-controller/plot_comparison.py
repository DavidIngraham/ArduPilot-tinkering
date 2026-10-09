import csv,json,math
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
ROOT=Path(__file__).parent
conditions=[('calm','Calm air'),('w15-t025','1.5 m/s wind; turbulence 0.25'),('w3-t0','3 m/s wind; no turbulence')]
fig,axes=plt.subplots(3,2,figsize=(13,15),constrained_layout=True)
for row,(suffix,title) in enumerate(conditions):
 ax,zoom=axes[row]
 for controller,color in [('baseline','#9a4e00'),('yaw','#176db4')]:
  name=('baseline-' if controller=='baseline' else 'r25-')+suffix;path=ROOT/('ParagliderAutoMission-'+name+'.csv')
  if not path.exists():continue
  meta=json.loads(Path(str(path)+'.json').read_text());rows=list(csv.DictReader(path.open()))
  n=np.array([math.radians(float(x['latitude_deg'])-meta['home_lat'])*6371000 for x in rows]);e=np.array([math.radians(float(x['longitude_deg'])-meta['home_lng'])*6371000*math.cos(math.radians(meta['home_lat'])) for x in rows]);seq=np.array([int(x['seq']) for x in rows])
  if controller=='baseline':
   route=meta['route'];ax.plot([r[2] for r in route],[r[1] for r in route],ls='--',color='.7',lw=.8,label='Waypoint connections')
  label='Baseline bank controller' if controller=='baseline' else 'Tuned yaw + roll-rate damping'
  ax.plot(e,n,color=color,lw=1.2,label=label)
  mask=(seq==4)|(seq==5);zoom.plot(e[mask],n[mask],color=color,lw=1.8,label=label)
  outgoing=np.flatnonzero(seq==5)
  if len(outgoing)>20:
   mid=outgoing[np.argmin(abs(e[outgoing]-380))];before=max(outgoing[0],mid-8);after=min(outgoing[-1],mid+8)
   zoom.annotate('',xy=(e[after],n[after]),xytext=(e[before],n[before]),arrowprops=dict(arrowstyle='-|>',color=color,lw=1.7,mutation_scale=13))
 ax.set(title='AUTO mission — '+title,xlabel='East of home (m)',ylabel='North of home (m)',aspect='equal')
 zoom.plot([400,400,310],[340,250,250],'--',color='.65',lw=.8);zoom.scatter([400],[250],marker='x',color='.3');zoom.annotate('WP4',(400,250),xytext=(403,246))
 zoom.set(title='Waypoint 4 turn — '+title,xlabel='East of home (m)',ylabel='North of home (m)',xlim=(330,420),ylim=(220,310),aspect='equal')
 for panel in (ax,zoom):panel.grid(alpha=.2);panel.legend(loc='upper left',fontsize=8)
fig.suptitle('Paraglider: bank-controller baseline versus manually tuned yaw controller\nSame physics, L1 gains, 22 m acceptance and 25 m loiter targets; wind from 45°',fontsize=14)
fig.savefig(ROOT/'mission-controller-comparison.png',dpi=170);plt.close(fig)
# The steady loiter exposes coupled-mode oscillation that corner error misses.
fig,axes=plt.subplots(2,1,figsize=(11,5),sharex=True,constrained_layout=True)
for name,label,color in [('baseline-calm','Baseline','#9a4e00'),('p08','Yaw alone (rejected)','.55'),('r25-calm','Tuned yaw + roll damping','#176db4')]:
 path=ROOT/('ParagliderAutoMission-'+name+'.csv')
 if not path.exists():continue
 rows=[r for r in csv.DictReader(path.open()) if r['seq']=='3'];end=float(rows[-1]['time_s']);rows=[r for r in rows if float(r['time_s'])>=end-40]
 t=[float(r['time_s'])-(end-40) for r in rows]
 axes[0].plot(t,[math.degrees(float(r['yaw_rate_radps'])) for r in rows],label=label,color=color,lw=1)
 axes[1].plot(t,[(float(r['right_brake_pwm'])-float(r['left_brake_pwm']))/800 for r in rows],label=label,color=color,lw=1)
axes[0].set(title='Steady clockwise loiter: why roll-rate damping is needed',ylabel='Body yaw rate (degrees/s)')
axes[1].set(ylabel='Differential brake fraction',xlabel='Seconds in final 40 seconds of loiter')
for ax in axes:ax.grid(alpha=.2);ax.legend(fontsize=9)
fig.savefig(ROOT/'loiter-controller-comparison.png',dpi=170)
