import csv,json,math
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
root=Path(__file__).parent
fig,axes=plt.subplots(2,3,figsize=(16,10),layout='constrained')
for row,wind in enumerate((0,5)):
 for label,color in [('L1','#a7672c'),('planned','#087db8')]:
  p=root/f'WaypointTrajectoryOverfly-{label}-wind{wind}.csv'
  meta=json.loads(p.with_suffix('.json').read_text())
  with p.open() as f: samples=list(csv.DictReader(f))
  n=np.array([math.radians(float(r['latitude_deg'])-meta['home_lat'])*6371000 for r in samples])
  e=np.array([math.radians(float(r['longitude_deg'])-meta['home_lng'])*6371000*math.cos(math.radians(meta['home_lat'])) for r in samples])
  seq=np.array([int(r['seq']) for r in samples]);mask=seq<len(meta['route'])+1
  for col in range(3):
   ax=axes[row,col]
   ax.plot(e[mask],n[mask],color=color,lw=1.6,label='Standard L1' if label=='L1' else 'Trajectory planner')
   bounds=[(1,19),(1,4),(13,16)][col]
   idx=np.flatnonzero(mask & (seq>=bounds[0]) & (seq<=bounds[1]))
   for j in idx[::max(1,len(idx)//(12 if col==0 else 5))]:
    if j+8<len(samples) and mask[j+8]:
     ax.annotate('',xy=(e[j+8],n[j+8]),xytext=(e[j],n[j]),arrowprops=dict(arrowstyle='->',color=color,lw=1.3))
 route=np.array(meta['route'],dtype=float)
 for col in range(3):
  ax=axes[row,col];ax.plot(route[:,1],route[:,0],'--',color='.65',lw=.9,zorder=0)
  for i,(north,east) in enumerate(route):
   protected=str(i+1) in meta['passby_distances']
   ax.scatter([east],[north],s=45 if protected else 18,c='#b01c43' if protected else '.4',marker='D' if protected else 'o',zorder=4)
   ax.text(east+8,north+8,str(i+1),fontsize=8,color='#b01c43' if protected else '.3',clip_on=True)
   if protected:
    incoming=(route[i]-route[i-1]);incoming/=np.linalg.norm(incoming)
    finish=route[i]+incoming*meta['passby_distances'][str(i+1)]
    perpendicular=np.array([-incoming[1],incoming[0]])*20
    a,b=finish-perpendicular,finish+perpendicular
    ax.plot([a[1],b[1]],[a[0],b[0]],color='#b01c43',lw=2)
    ax.plot([east,finish[1]],[north,finish[0]],color='#b01c43',ls=':',lw=1)
   elif col:
    ax.add_patch(plt.Circle((east,north),50,fill=False,color='.7',ls=':',lw=.8))
  ax.set_aspect('equal');ax.grid(alpha=.2);ax.set_xlabel('East of home (m)');ax.set_ylabel('North of home (m)')
  ax.set_title(('Calm' if wind==0 else '5 m/s wind from 45°')+' — '+['full course','short leg: protected WP3','planned approach: protected WP15'][col])
  handles,labels=ax.get_legend_handles_labels()
  handles += [Line2D([],[],color='#b01c43',marker='D',ls='None',label='Protected waypoint'),Line2D([],[],color='#b01c43',lw=2,label='35 m beyond: finish line')]
  ax.legend(handles=handles,loc='best',fontsize=8)
 axes[row,1].set_xlim(-100,220);axes[row,1].set_ylim(540,950)
 axes[row,2].set_xlim(-240,430);axes[row,2].set_ylim(-230,180)
fig.suptitle('Plane AUTO mixed fly-by / overfly torture course: recorded SITL tracks\nProtected WP3, 6, 9, 15: cross 35 m beyond before advancing • 20 m/s cruise • 45° bank limit • zero turbulence',fontsize=13)
fig.savefig(root/'overfly-mission-comparison.png',dpi=170)
fig.savefig(root/'overfly-mission-comparison.pdf')
