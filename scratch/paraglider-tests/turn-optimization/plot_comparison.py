import csv,json,math
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT=Path(__file__).parent
runs=[]
for name,path,color in [('Previous',ROOT.parent/'achievable-radius/ParagliderAutoMission.csv','#9a4e00'),('Optimized',ROOT/'ParagliderAutoMission-final.csv','#176db4')]:
    meta=json.loads(Path(str(path)+'.json').read_text());rows=list(csv.DictReader(path.open()))
    n=np.array([math.radians(float(x['latitude_deg'])-meta['home_lat'])*6371000 for x in rows]);e=np.array([math.radians(float(x['longitude_deg'])-meta['home_lng'])*6371000*math.cos(math.radians(meta['home_lat'])) for x in rows]);seq=np.array([int(x['seq']) for x in rows]);t=np.array([float(x['time_s']) for x in rows]);yaw=np.array([math.degrees(float(x['yaw_rate_radps'])) for x in rows]);nav=np.array([float(x['nav_roll_deg']) for x in rows])
    runs.append(dict(name=name,meta=meta,n=n,e=e,seq=seq,t=t,yaw=yaw,nav=nav,color=color))
fig,axes=plt.subplots(1,2,figsize=(13,6),constrained_layout=True)
route=runs[0]['meta']['route'];axes[0].plot([x[2] for x in route],[x[1] for x in route],'--',color='0.65',lw=1,label='Waypoint connections')
for r in runs:
    axes[0].plot(r['e'],r['n'],color=r['color'],lw=1.4,label=r['name'])
    mask=(r['seq']==4)|(r['seq']==5);axes[1].plot(r['e'][mask],r['n'][mask],color=r['color'],lw=2,label=r['name'])
axes[0].set(title='Complete AUTO mission',xlabel='East of home (m)',ylabel='North of home (m)',aspect='equal')
axes[1].plot([400,400,280],[365,250,250],'--',color='0.6',lw=1)
axes[1].scatter([400],[250],marker='x',color='0.3',s=40);axes[1].annotate('WP4',(400,250),xytext=(405,254))
axes[1].set(title='Waypoint 4: continuous tighter turn',xlabel='East of home (m)',ylabel='North of home (m)',xlim=(280,430),ylim=(225,365),aspect='equal')
for ax in axes:ax.grid(alpha=.2);ax.legend(loc='upper left')
fig.suptitle('Paraglider turn optimization: less overshoot, tighter radii\nPrevious: 106 m acceptance / 100 m loiters; optimized: 22 m acceptance / 25 m loiters',fontsize=14)
fig.savefig(ROOT/'mission-comparison.png',dpi=180);plt.close(fig)
fig,axes=plt.subplots(2,1,figsize=(11,6),sharex=True,constrained_layout=True)
for r in runs:
    start=r['t'][np.flatnonzero(r['seq']==5)[0]];dt=r['t']-start;mask=(dt>=-2)&(dt<=45)
    axes[0].plot(dt[mask],r['yaw'][mask],label=r['name'],color=r['color'])
    axes[1].plot(dt[mask],r['nav'][mask],label=r['name'],color=r['color'])
axes[0].set(ylabel='Yaw rate (degrees/s)',title='WP4 → WP5 right turn')
axes[1].set(ylabel='Demanded bank (degrees)',xlabel='Seconds from waypoint transition')
for ax in axes:ax.axhline(0,color='0.7',lw=.8);ax.grid(alpha=.2);ax.legend()
fig.suptitle('Turn response: eliminating the mid-turn pause',fontsize=14)
fig.savefig(ROOT/'turn-response-comparison.png',dpi=180)
