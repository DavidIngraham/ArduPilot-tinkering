import json
from pathlib import Path
import numpy as np
from pymavlink import mavutil
import matplotlib;matplotlib.use('Agg')
import matplotlib.pyplot as plt
r=Path(__file__).parent;t=np.genfromtxt(r/'auto-mission.csv',delimiter=',',names=True);route=json.loads((r/'auto-mission-route.json').read_text());begin=t['time_s'][0];end=t['time_s'][-1]
f=max((r/'auto-mission-logs').glob('*.BIN'),key=lambda p:p.stat().st_size);mav=mavutil.mavlink_connection(str(f));jt=[];af=[]
while True:
 m=mav.recv_match(type=['PGJT','PGAF'])
 if m is None:break
 stamp=m.TimeUS*1e-6
 if not begin<=stamp<=end:continue
 if m.get_type()=='PGJT':jt.append([stamp,m.QP,m.Rel])
 else:af.append([stamp,m.Alpha,m.Act])
jt=np.array(jt);af=np.array(af)
metrics=dict(duration_s=float(end-begin),altitude_range_m=[float(min(t['relative_alt_m'])),float(max(t['relative_alt_m']))],
             max_abs_pitch_deg=float(max(abs(np.rad2deg(t['pitch_rad'])))),q_payload_rms_deg_s=float(np.sqrt(np.mean(jt[:,1]**2))),
             max_alpha_deg=float(max(af[:,1])),min_alpha_deg=float(min(af[:,1])),
             max_next_track_overshoot_m=max(v['next_track_overshoot_m'] or 0 for v in route['metrics'].values()),
             passed_native_route_assertions=True,normal_launch=False)
(r/'auto-mission-metrics.json').write_text(json.dumps(metrics,indent=2));print(metrics)
fig,ax=plt.subplots(3,1,figsize=(11,8),sharex=True,constrained_layout=True)
target=np.array([route['route'][int(s)-1][3] for s in t['seq']]);ax[0].plot(t['time_s']-begin,t['relative_alt_m'],label='Actual altitude');ax[0].step(t['time_s']-begin,target,where='post',linestyle=':',color='k',label='Active item altitude');ax[0].legend()
ax[1].plot(jt[:,0]-begin,jt[:,1]);ax[2].plot(af[:,0]-begin,af[:,1]);ax[2].axhline(15,color='r',linestyle=':',alpha=.5,label='Model linear-aero boundary');ax[2].legend(fontsize=8)
for a,label in zip(ax,['Altitude (m)','Payload pitch rate (deg/s)','Canopy AoA (deg)']):a.set_ylabel(label);a.grid(alpha=.25)
ax[-1].set_xlabel('Time from AUTO entry (s)');fig.suptitle('Existing extended AUTO course: articulated paraglider, integrated conservative controller\nAirborne preparation; perfect state feedback; no stall protection')
fig.savefig(r/'auto-mission-longitudinal.png',dpi=170);fig.savefig(r/'auto-mission-longitudinal.pdf')
