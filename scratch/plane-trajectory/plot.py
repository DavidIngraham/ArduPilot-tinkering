import csv,json,math
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
root=Path(__file__).parent
fig,axes=plt.subplots(2,3,figsize=(15,10),layout='constrained')
for row,wind in enumerate((0,5)):
 for label,color in [('L1','#a7672c'),('planned','#087db8')]:
  p=root/f'WaypointTrajectory-{label}-wind{wind}.csv';meta=json.loads(p.with_suffix('.json').read_text());rows=list(csv.DictReader(p.open()));n=np.array([math.radians(float(r['latitude_deg'])-meta['home_lat'])*6371000 for r in rows]);e=np.array([math.radians(float(r['longitude_deg'])-meta['home_lng'])*6371000*math.cos(math.radians(meta['home_lat'])) for r in rows]);seq=np.array([int(r['seq']) for r in rows]);mask=seq<len(meta['route'])+1
  for col in range(3):
   ax=axes[row,col];ax.plot(e[mask],n[mask],color=color,lw=1.5,label='Standard L1' if label=='L1' else 'Grouped trajectory')
   if col:
    window=(seq>= (1 if col==1 else 6))&(seq<=(4 if col==1 else 10));idx=np.flatnonzero(window)
    for j in idx[::max(1,len(idx)//5)]:
     if j+8<len(rows):ax.annotate('',xy=(e[j+8],n[j+8]),xytext=(e[j],n[j]),arrowprops=dict(arrowstyle='->',color=color,lw=1.4))
 route=np.array(meta['route']);
 for col in range(3):
  ax=axes[row,col];ax.plot(route[:,1],route[:,0],'--',color='.6',lw=.9,zorder=0);ax.scatter(route[:,1],route[:,0],s=20,c='.3',zorder=3)
  for i,(north,east) in enumerate(route):
   ax.text(east+8,north+8,str(i+1),fontsize=8,color='.3',clip_on=True)
   if col:ax.add_patch(plt.Circle((east,north),meta['acceptance_radius'],fill=False,color='.7',ls=':',lw=.8))
  ax.set_aspect('equal');ax.grid(alpha=.2);ax.set_xlabel('East of home (m)');ax.set_ylabel('North of home (m)');ax.set_title(f'{"Calm" if wind==0 else "5 m/s wind from 45°"} — '+['full mission','short S-turn, WP 2–3','short hairpin, WP 8–9'][col]);ax.legend(loc='best',fontsize=8)
 axes[row,1].set_xlim(-90,180);axes[row,1].set_ylim(560,900)
 axes[row,2].set_xlim(780,1130);axes[row,2].set_ylim(450,850)
fig.suptitle('Plane AUTO waypoint torture test: L1 versus wind-aware grouped trajectory guidance\nSame airframe, 20 m/s cruise, 45° bank limit, 50 m waypoint acceptance; arrows show travel direction',fontsize=13)
fig.savefig(root/'mission-comparison.png',dpi=160)
