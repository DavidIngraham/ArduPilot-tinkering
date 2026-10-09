import csv,json,math
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
root=Path(__file__).parent
fig,axes=plt.subplots(3,2,figsize=(14,14),layout='constrained')
for row,wind in enumerate((0,5,10)):
 for prefix,controller,color,label in [
  ('WaypointLineTrajectory','L1','#a7672c','Standard L1'),
  ('WaypointLineTrajectory','planned','#228747','Line-to-line planner')]:
  p=root/f'{prefix}-{controller}-wind{wind}.csv';meta=json.loads(p.with_suffix('.json').read_text())
  with p.open() as f: data=list(csv.DictReader(f))
  n=np.array([math.radians(float(r['latitude_deg'])-meta['home_lat'])*6371000 for r in data]);e=np.array([math.radians(float(r['longitude_deg'])-meta['home_lng'])*6371000*math.cos(math.radians(meta['home_lat'])) for r in data]);seq=np.array([int(r['seq']) for r in data])
  for col in range(2):
   mask=seq<20
   if col: mask &= (seq>=11)&(seq<=15)
   axes[row,col].plot(e[mask],n[mask],lw=1.5,color=color,label=label)
   idx=np.flatnonzero(mask)
   for j in idx[::max(1,len(idx)//(10 if col==0 else 4))]:
    if j+6<len(data) and mask[j+6]:
     axes[row,col].annotate('',xy=(e[j+6],n[j+6]),xytext=(e[j],n[j]),arrowprops=dict(arrowstyle='->',color=color,lw=1.1))
 route=np.array(meta['route'],dtype=float)
 for col in range(2):
  ax=axes[row,col];reference=route if col==0 else route[10:15];ax.plot(reference[:,1],reference[:,0],ls='--',color='.55',lw=.9,zorder=0)
  for i,(north,east) in enumerate(route):
   if col and not 10 <= i <= 14: continue
   protected=str(i+1) in meta['passby_distances'];ax.scatter([east],[north],marker='D' if protected else '+',s=35,c='#b01c43' if protected else '.3',zorder=4)
   ax.text(east+8,north+8,str(i+1),fontsize=8,color='#b01c43' if protected else '.3',clip_on=True)
   if protected:
    direction=route[i]-route[i-1];direction/=np.linalg.norm(direction);finish=route[i]+direction*35;cross=np.array([-direction[1],direction[0]])*18;a,b=finish-cross,finish+cross
    ax.plot([a[1],b[1]],[a[0],b[0]],color='#b01c43',lw=1.5)
  ax.set_aspect('equal');ax.grid(alpha=.2);ax.set_xlabel('East of home (m)');ax.set_ylabel('North of home (m)');ax.legend(loc='best',fontsize=8)
  ax.set_title(('Calm' if wind==0 else f'{wind} m/s wind from 45°')+' — '+('full course' if col==0 else 'ordinary line transitions: WP12–14'))
 axes[row,0].set_xlim(-620,1200);axes[row,0].set_ylim(-680,1250)
 axes[row,1].set_xlim(70,760);axes[row,1].set_ylim(-180,740)
fig.suptitle('Plane AUTO: standard L1 versus line-to-line transitions\nOrdinary waypoints define track intersections; red diamonds retain explicit 35 m overfly • 20 m/s cruise • zero turbulence',fontsize=13)
fig.savefig(root/'line-transition-comparison.png',dpi=165)
fig.savefig(root/'line-transition-comparison.pdf')
