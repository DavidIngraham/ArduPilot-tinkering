import csv,json,pathlib,shutil
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
root=pathlib.Path('/workspace/scratch/paraglider-tests/l1-default085')
sources={'0.75':pathlib.Path('/workspace/scratch/paraglider-tests/extended-mission-radius40/ParagliderAutoMission.csv'),'0.85':pathlib.Path('/workspace/buildlogs/ParagliderAutoMission.csv')}
results={};tracks={};fig,axes=plt.subplots(2,1,figsize=(11,9))
for label,f in sources.items():
 rows=list(csv.DictReader(f.open()));meta=json.load(open(str(f)+'.json'))
 seq=np.array([int(r['seq']) for r in rows]);t=np.array([float(r['time_s']) for r in rows]);t-=t[0]
 n=np.radians(np.array([float(r['latitude_deg']) for r in rows])-meta['home_lat'])*6371000
 e=np.radians(np.array([float(r['longitude_deg']) for r in rows])-meta['home_lng'])*6371000*np.cos(np.radians(meta['home_lat']))
 pos=np.column_stack((n,e));route=np.array(meta['route']);errors=[];per_leg={};tracks[label]=dict(t=t,n=n,e=e,seq=seq)
 for i in (2,4,5,6,7,9,10,11):
  start=route[i-2,1:3];end=route[i-1,1:3];delta=end-start;length=np.linalg.norm(delta);direction=delta/length
  rel=pos-start;along=rel@direction;xtrack=rel[:,0]*direction[1]-rel[:,1]*direction[0]
  mask=(seq==i)&(along>=80)&(along<=length-80)
  err=xtrack[mask];errors.extend(err.tolist())
  per_leg[i]=dict(samples=len(err),rms_m=float(np.sqrt(np.mean(err**2))),peak_abs_m=float(np.max(np.abs(err))))
  if i==2:axes[1].plot(along[mask],err,label='L1 damping '+label)
 errors=np.array(errors);duration=float(t[-1]);travel=float(np.sum(np.linalg.norm(np.diff(pos,axis=0),axis=1)))
 results[label]=dict(duration_sim_s=duration,distance_flown_m=travel,straight_segment_cross_track_rms_m=float(np.sqrt(np.mean(errors**2))),straight_segment_cross_track_p95_m=float(np.percentile(np.abs(errors),95)),straight_segment_cross_track_peak_m=float(np.max(np.abs(errors))),per_leg=per_leg,navigation_parameters=meta.get('navigation_parameters',{'NAVL1_DAMPING':0.75,'NAVL1_PERIOD':17}),loiter_turns={k:v['circle_angle_rad']/(2*np.pi) for k,v in meta['metrics'].items() if int(k) in(3,8)})
 axes[0].plot(e,n,label='L1 damping '+label,lw=1)
 if label=='0.85':
  shutil.copyfile(f,root/f.name);shutil.copyfile(str(f)+'.json',root/(f.name+'.json'))
axes[0].plot(route[:,2],route[:,1],'k--',alpha=.3,label='Commanded route');axes[0].set_aspect('equal');axes[0].set_xlabel('East of home (m)');axes[0].set_ylabel('North of home (m)');axes[0].legend();axes[0].grid(alpha=.3)
axes[1].set_title('First long straight leg: central section, excluding turn acquisition');axes[1].set_xlabel('Distance along leg (m)');axes[1].set_ylabel('Signed cross-track error (m)');axes[1].legend();axes[1].grid(alpha=.3)
fig.suptitle('L1 damping comparison: 17 s period, 40 m waypoint radius, unchanged physical model');fig.tight_layout();fig.savefig(root/'comparison.png',dpi=160)
(root/'comparison.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
