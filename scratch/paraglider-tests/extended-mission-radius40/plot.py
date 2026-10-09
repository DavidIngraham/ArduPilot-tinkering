import csv, json, pathlib, shutil
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
root=pathlib.Path('/workspace/scratch/paraglider-tests/extended-mission-radius40')
f=pathlib.Path('/workspace/buildlogs/ParagliderAutoMission.csv')
rows=list(csv.DictReader(f.open())); meta=json.load(open(str(f)+'.json'))
seq=np.array([int(r['seq']) for r in rows]);t=np.array([float(r['time_s']) for r in rows]);t-=t[0]
lat=np.array([float(r['latitude_deg']) for r in rows]);lon=np.array([float(r['longitude_deg']) for r in rows])
north=np.radians(lat-meta['home_lat'])*6371000;east=np.radians(lon-meta['home_lng'])*6371000*np.cos(np.radians(meta['home_lat']))
alt=np.array([float(r['relative_alt_m']) for r in rows]);demands=np.array([meta['route'][i-1][3] for i in seq])
fig=plt.figure(figsize=(12,9));grid=fig.add_gridspec(3,2)
ax=fig.add_subplot(grid[:,0]);ax.plot(east,north,label='Flown GPS track',lw=1)
route=np.array(meta['route']);ax.plot(route[:,2],route[:,1],'k--',alpha=.4,label='Commanded route')
labels={}
for i,(cmd,n,e,a) in enumerate(meta['route'],1):
 labels.setdefault((e,n),[]).append(str(i))
 if cmd in (17,18):ax.add_patch(plt.Circle((e,n),60,fill=False,color='tab:orange',lw=1.5))
for (e,n),items in labels.items():
 ax.plot(e,n,'o',ms=4,color='black');ax.annotate(' / '.join(items),(e,n),xytext=(6,6),textcoords='offset points',fontsize=9)
ax.plot(0,0,'*',ms=10,label='Home');ax.set_aspect('equal');ax.set_xlabel('East of home (m)');ax.set_ylabel('North of home (m)');ax.legend(fontsize=8);ax.grid(alpha=.3)
ax=fig.add_subplot(grid[0,1]);ax.plot(t,alt,label='Actual relative altitude');ax.step(t,demands,where='post',label='Mission target',ls='--');ax.set_ylabel('Altitude (m)');ax.legend(fontsize=8);ax.grid(alpha=.3)
ax=fig.add_subplot(grid[1,1]);ax.plot(t,[float(r['groundspeed_mps']) for r in rows]);ax.set_ylabel('Groundspeed (m/s)');ax.grid(alpha=.3)
ax=fig.add_subplot(grid[2,1]);ax.plot(t,seq);ax.set_ylabel('Mission item');ax.set_xlabel('Elapsed mission time (s)');ax.set_yticks(range(1,13));ax.grid(alpha=.3)
fig.suptitle('Extended paraglider AUTO mission — waypoint radius 40 m, normal acceptance');fig.tight_layout();fig.savefig(root/'mission.png',dpi=160)
travel=float(np.sum(np.hypot(np.diff(north),np.diff(east))))
summary=dict(samples=len(rows),duration_sim_s=float(t[-1]),distance_flown_m=travel,altitude_range_m=[float(alt.min()),float(alt.max())],visited_sequences=sorted(set(seq.tolist())),waypoints={k:v for k,v in meta['metrics'].items() if int(k) not in(3,8,12)},loiter_turns={k:v['circle_angle_rad']/(2*np.pi) for k,v in meta['metrics'].items() if int(k) in(3,8)})
(root/'summary.json').write_text(json.dumps(summary,indent=2));shutil.copyfile(f,root/f.name);shutil.copyfile(str(f)+'.json',root/(f.name+'.json'));print(json.dumps(summary,indent=2))
