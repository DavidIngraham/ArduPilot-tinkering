"""Compare recorded flights; previous planner flights remain archived separately."""
import csv
import json
import math
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

ROOT = Path(__file__).resolve().parent
OLD_RASTER = ROOT.parent / 'raster-soft-turn-cost'
CASES = [(40,10,90),(40,5,0),(160,10,0)]
COLORS = ['#a7672c','#939393','#228747']
LABELS = ['L1','Previous sampled exits','Flexible line join']
all_results = []
validation=json.loads((ROOT/'validation.json').read_text())
if validation['native_returncode'] or validation['raster_returncode']:
    raise RuntimeError('Final flight validation did not pass')
FINAL_SHA=validation['binary_sha256']

def read(path):
    meta=json.loads(path.with_suffix('.json').read_text())
    with path.open() as src: rows=list(csv.DictReader(src))
    n=np.array([math.radians(float(r['latitude_deg'])-meta['home_lat'])*6371000 for r in rows])
    e=np.array([math.radians(float(r['longitude_deg'])-meta['home_lng'])*6371000*math.cos(math.radians(meta['home_lat'])) for r in rows])
    seq=np.array([int(r['seq']) for r in rows])
    if path.parent in (ROOT/'raster', ROOT/'torture'):
        sha=meta.get('binary_sha256',meta.get('configuration',{}).get('binary_sha256'))
        if sha!=FINAL_SHA:raise RuntimeError('Flight does not match final binary: '+str(path))
    return meta,rows,n,e,seq

fig,axes=plt.subplots(1,3,figsize=(14,8),layout='constrained')
for ax,(spacing,wind,direction) in zip(axes,CASES):
    name=f'raster-{spacing:03d}-w{wind:02d}-d{direction:03d}'
    paths=[ROOT/'raster'/(name+'-L1.csv'),OLD_RASTER/(name+'-line.csv'),ROOT/'raster'/(name+'-line.csv')]
    ax.add_patch(Rectangle((0,300),320,600,facecolor='#eeeeee',edgecolor='.5',zorder=0))
    for lane in range(320//spacing+1):ax.plot([lane*spacing]*2,[300,900],'--',color='.6',lw=.7)
    text=[]
    for path,color,label in zip(paths,COLORS,LABELS):
        meta,rows,n,e,seq=read(path);mask=(seq>=3)&(seq<=len(meta['route']))
        ax.plot(e[mask],n[mask],color=color,lw=1.4,label=label)
        metrics=meta['metrics'];text.append(f"{label}: {metrics['course_duration_s']:.0f}s / {metrics['coverage_percent']:.1f}%")
        all_results.append(dict(course='raster',case=name,controller=label,time_s=metrics['course_duration_s'],coverage_percent=metrics['coverage_percent'],mean_overrun_m=None,failure=meta['failure'],source=str(path)))
    ax.text(.02,.02,'\n'.join(text),transform=ax.transAxes,fontsize=8,bbox=dict(facecolor='white',alpha=.9,edgecolor='none'))
    ax.set_title(f"{spacing}m spacing; {wind}m/s from {'E' if direction==90 else 'N'}")
    ax.set_xlim(-350,650);ax.set_ylim(-100,1400);ax.set_aspect('equal');ax.grid(alpha=.15);ax.set_xlabel('East of home (m)')
axes[0].set_ylabel('North of home (m)');axes[0].legend(loc='upper left',fontsize=8)
fig.suptitle('Problematic raster cases: measured tracks and requested-line coverage\n20m/s cruise; 45° bank limit; 200m turn extension; zero turbulence')
fig.savefig(ROOT/'raster-comparison.png',dpi=170);fig.savefig(ROOT/'raster-comparison.pdf');plt.close(fig)

fig,axes=plt.subplots(2,3,figsize=(15,10),layout='constrained')
for col,wind in enumerate((0,5,10)):
    paths=[ROOT/'torture'/f'WaypointLineTrajectory-L1-wind{wind}.csv',ROOT/'baseline'/f'WaypointLineTrajectory-planned-wind{wind}.csv',ROOT/'torture'/f'WaypointLineTrajectory-planned-wind{wind}.csv']
    flights=[read(p) for p in paths]
    excluded=set()
    for meta,*_ in flights:
        for group in meta['planned_groups']:
            words=group.split();first,count=int(words[2]),int(words[4]);excluded.update(range(first,first+count-1))
    route=np.array(flights[0][0]['route'],dtype=float)
    text=[]
    for (meta,rows,n,e,seq),path,color,label in zip(flights,paths,COLORS,LABELS):
        overruns=[]
        for i in range(1,len(route)-1):
            if i+1 in excluded:continue
            incoming=route[i]-route[i-1];out=route[i+1]-route[i];length=np.linalg.norm(out);sign=1 if incoming[0]*out[1]-incoming[1]*out[0]>0 else -1
            dn=n-route[i,0];de=e-route[i,1];along=(dn*out[0]+de*out[1])/length
            mask=((seq==i+1)|(seq==i+2))&(along>=-150)&(along<=min(150,length*.8))
            if not mask.any():raise RuntimeError(f'Missing common corner {i+1} in {path}')
            error=-sign*(out[0]*de-out[1]*dn)/length;overruns.append(max(0,float(error[mask].max())))
        mean=float(np.mean(overruns));time=meta['metrics']['course_duration_s'];text.append(f'{label}: {time:.0f}s; overrun {mean:.1f}m')
        all_results.append(dict(course='torture',case=f'wind-{wind}',controller=label,time_s=time,coverage_percent=None,mean_overrun_m=mean,failure=None,source=str(path)))
        for row in range(2):
            mask=(seq<len(route)+1)&((seq>=11)&(seq<=15) if row else True)
            axes[row,col].plot(e[mask],n[mask],lw=1.3,color=color,label=label)
    for row in range(2):
        ax=axes[row,col];ref=route[10:15] if row else route;ax.plot(ref[:,1],ref[:,0],'--',color='.6',lw=.8)
        for i,(north,east) in enumerate(route):
            if row and not 10<=i<=14:continue
            protected=str(i+1) in meta['passby_distances'];ax.scatter(east,north,s=25,c='#b01c43' if protected else '.4',marker='D' if protected else '+');ax.text(east+8,north+8,str(i+1),fontsize=7,clip_on=True)
            if protected:
                direction=route[i]-route[i-1];direction/=np.linalg.norm(direction);finish=route[i]+direction*meta['passby_distances'][str(i+1)];cross=np.array([-direction[1],direction[0]])*15;a,b=finish-cross,finish+cross
                ax.plot([a[1],b[1]],[a[0],b[0]],color='#b01c43',lw=1)
        ax.set_aspect('equal');ax.grid(alpha=.15);ax.set_xlabel('East of home (m)');ax.set_title(('Calm' if wind==0 else f'{wind}m/s from NE')+(' — WP12–14' if row else ' — full course'))
        if row:ax.set_xlim(70,760);ax.set_ylim(-180,740)
        else:ax.set_xlim(-650,1250);ax.set_ylim(-700,1350);ax.text(.02,.02,'\n'.join(text),transform=ax.transAxes,fontsize=8,bbox=dict(facecolor='white',alpha=.9,edgecolor='none'))
axes[0,0].legend(fontsize=8,loc='upper left');axes[0,0].set_ylabel('North of home (m)');axes[1,0].set_ylabel('North of home (m)')
fig.suptitle('Plane torture course: L1 versus previous planner versus flexible line join\nRed diamonds retain explicit overfly distance; overrun uses identical common corners and both mission stages')
fig.savefig(ROOT/'torture-comparison.png',dpi=170);fig.savefig(ROOT/'torture-comparison.pdf');plt.close(fig)
with (ROOT/'comparison.csv').open('w') as target:
    writer=csv.DictWriter(target,fieldnames=list(all_results[0]));writer.writeheader();writer.writerows(all_results)
(ROOT/'comparison.json').write_text(json.dumps(dict(results=all_results,replicates=1,turbulence=0,torture_excluded_internal_legs='Union of grouped internal legs across controllers, per wind.',overrun_definition='Mean of signed maximum outgoing-track overshoot on common corners, considering current and next mission stages; outgoing projection -150m to min(150m, 80% of leg).'),indent=2))
for result in all_results:print(json.dumps(result))
