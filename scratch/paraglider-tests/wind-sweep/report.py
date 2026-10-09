import csv,importlib.util,json,math,re
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT=Path(__file__).parent
spec=importlib.util.spec_from_file_location('turn_analysis',ROOT.parent/'turn-optimization/analyze.py')
a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)
records=json.loads((ROOT/'results.json').read_text())
runs=[]
for record in records:
 name=record['name'];path=ROOT/('ParagliderAutoMission-'+name+'.csv')
 log=(ROOT/(name+'.log')).read_text()
 failures=re.findall(r'(?:Exception caught:|NotAchievedException:|AutoTestTimeoutException:|FAILED:)([^\n]+)',log)
 record['failure_details']=list(dict.fromkeys(x.strip() for x in failures))
 if not path.exists():continue
 meta=json.loads(Path(str(path)+'.json').read_text());rows=list(csv.DictReader(path.open()))
 if not rows:continue
 n=np.array([math.radians(float(x['latitude_deg'])-meta['home_lat'])*6371000 for x in rows])
 e=np.array([math.radians(float(x['longitude_deg'])-meta['home_lng'])*6371000*math.cos(math.radians(meta['home_lat'])) for x in rows])
 seq=np.array([int(x['seq']) for x in rows]);roll=np.degrees([float(x['roll_rad']) for x in rows])
 corners={str(k):v['next_track_overshoot_m'] for k,v in meta['metrics'].items() if int(k) in (4,5,6,9,10)}
 record['corner_overshoot_m']=corners
 measured=[x for x in corners.values() if x is not None]
 record['max_corner_overshoot_m']=max(measured) if measured else None
 record['max_mission_item_recorded']=int(max(seq))
 record['route_completed']=int(max(seq))>=12
 record['max_bank_deg']=float(np.max(np.abs(roll)))
 record['altitude_range_m']=[min(float(x['relative_alt_m']) for x in rows),max(float(x['relative_alt_m']) for x in rows)]
 try:
  metrics=a.analyze(path)
  record['straight_rms_m']=metrics['straight_rms_m']
  record['loiters']=metrics['loiters']
  record['longest_brake_saturation_s']=metrics['longest_brake_saturation_s']
 except (ValueError,IndexError,ZeroDivisionError) as exc:
  record['analysis_note']=str(exc)
 runs.append(dict(record=record,meta=meta,n=n,e=e,seq=seq))
(ROOT/'summary.json').write_text(json.dumps({'conditions':records,'wind_direction_from_deg':45,'wind_applied_after_takeoff':True,'waypoint_acceptance_m':22,'loiter_target_radius_m':25,'single_flight_per_condition':True},indent=2)+'\n')
colors={0:'#176db4',1.5:'#d88200',3:'#963fb0'}
fig,axes=plt.subplots(3,2,figsize=(13,16),constrained_layout=True)
reference=next((r for r in runs if r['record']['name']=='w0-t0'),None)
for row,turb in enumerate([0,.25,.5]):
 ax,zoom=axes[row]
 if reference:
  route=reference['meta']['route']
  ax.plot([x[2] for x in route],[x[1] for x in route],'--',color='.7',lw=.9,label='Waypoint connections')
  if turb>0:
   for panel in (ax,zoom):panel.plot(reference['e'],reference['n'],color='.55',lw=1,ls='--',label='Calm reference')
 for r in runs:
  record=r['record'];wind=record['wind_parameters']
  if wind['SIM_WIND_TURB']!=turb:continue
  speed=wind['SIM_WIND_SPD'];label=f'{speed:g} m/s wind'
  if not record['route_completed']:label+=' (early abort)'
  elif record['result']!='PASS':label+=' (overshoot limit exceeded)'
  ax.plot(r['e'],r['n'],color=colors[speed],lw=1.2,label=label,alpha=.9)
  mask=(r['seq']==4)|(r['seq']==5)
  if mask.any():zoom.plot(r['e'][mask],r['n'][mask],color=colors[speed],lw=1.8,label=label,alpha=.9)
  else:zoom.plot([],[],color=colors[speed],label=f'{speed:g} m/s: aborted before WP4')
 ax.set(title=f'AUTO mission track — turbulence setting {turb:g} m/s',xlabel='East of home (m)',ylabel='North of home (m)',aspect='equal')
 zoom.plot([400,400,280],[365,250,250],'--',color='.65',lw=1)
 zoom.scatter([400],[250],marker='x',color='.3',s=35);zoom.annotate('WP4',(400,250),xytext=(403,246))
 zoom.set(title=f'Waypoint 4 turn — turbulence setting {turb:g} m/s',xlabel='East of home (m)',ylabel='North of home (m)',xlim=(330,420),ylim=(220,310),aspect='equal')
 if turb==.5:zoom.text(335,278,'No measured WP4 turns:\nall runs aborted on altitude',fontsize=10,color='.3')
 for panel in (ax,zoom):panel.grid(alpha=.2);panel.legend(loc='upper left',fontsize=9)
fig.suptitle('Paraglider AUTO mission: wind and turbulence sweep\nSame optimized gains; 22 m waypoint acceptance / 25 m loiter targets; wind from 45°',fontsize=15)
fig.savefig(ROOT/'mission-wind-comparison.png',dpi=170);plt.close(fig)
# Compact quantitative comparison, including strict normal-test failures.
fig,axes=plt.subplots(1,2,figsize=(11,4),constrained_layout=True)
for turb,style in zip([0,.25,.5],['o-','s--','^:']):
 selected=[r['record'] for r in runs if r['record']['wind_parameters']['SIM_WIND_TURB']==turb]
 for ax,key in zip(axes,['max_corner_overshoot_m','straight_rms_m']):
  measured=[r for r in selected if r.get(key) is not None]
  ax.plot([r['wind_parameters']['SIM_WIND_SPD'] for r in measured],[r[key] for r in measured],style,label=f'Turbulence {turb:g} m/s')
axes[0].axhline(4,color='firebrick',ls='--',label='Normal test limit: 4 m')
axes[0].set(ylabel='Maximum corner overshoot (m)',title='Five clean waypoint turns')
axes[1].set(ylabel='Straight-leg cross-track RMS (m)',title='Central portions of mission legs')
for ax in axes:ax.set(xlabel='Mean wind speed (m/s)',xticks=[0,1.5,3]);ax.grid(alpha=.2);ax.legend(fontsize=8)
fig.suptitle('Tracking sensitivity — one flight per condition',fontsize=14)
fig.savefig(ROOT/'wind-tracking-metrics.png',dpi=170)
print(json.dumps([{k:r.get(k) for k in ['name','result','max_corner_overshoot_m','straight_rms_m','max_mission_item_recorded','failure_details']} for r in records],indent=2))
