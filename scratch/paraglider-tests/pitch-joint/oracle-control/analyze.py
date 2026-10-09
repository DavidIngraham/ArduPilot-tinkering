# AP_FLAKE8_CLEAN
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from scipy.signal import butter,sosfiltfilt
from pymavlink import mavutil
root=Path(__file__).parent
results=[];series={}
for file in sorted(root.glob('*-metadata.json')):
 meta=json.loads(file.read_text());name=meta['config']['name']
 if 'events' not in meta or meta['config'].get('frequencies'):continue
 t0=meta['events'][0]['t'];end=meta.get('end',t0+59)
 f=max((root/(name+'-logs')).glob('*.BIN'),key=lambda p:p.stat().st_mtime)
 stream=mavutil.mavlink_connection(str(f));messages={k:[] for k in ['PGOR','PGAF','PGJT','TECS']}
 while True:
  m=stream.recv_match(type=list(messages))
  if m is None:break
  d=m.to_dict();d['t']=d['TimeUS']*1e-6-t0
  if -10<d['t']<end-t0:messages[m.get_type()].append(d)
 data={typ:{k:np.array([r[k] for r in rows]) for k in rows[0] if isinstance(rows[0][k],(float,int))}
       for typ,rows in messages.items() if rows}
 telemetry=np.genfromtxt(root/(name+'.csv'),delimiter=',',names=True)
 telemetry={k:telemetry[k] for k in telemetry.dtype.names};telemetry['t']-=t0
 data['telemetry']=telemetry;series[name]=dict(data=data,metadata=meta)
 jt=data['PGJT'];a=(jt['t']>=0)&(jt['t']<59);late=(jt['t']>40)&(jt['t']<59)
 qp=jt['QP'];qr=jt['QRel']
 fs=1/np.median(np.diff(jt['t']))
 hf=sosfiltfilt(butter(4,.6,btype='highpass',fs=fs,output='sos'),qp)
 at=(telemetry['t']>=0)&(telemetry['t']<59)
 af=data.get('PGAF',{});aa=(af.get('t',np.array([]))>=0)&(af.get('t',np.array([]))<59)
 orc=data['PGOR'];ao=(orc['t']>=0)&(orc['t']<59)
 responses={}
 for event in meta['events']:
  if event['pwm']==1500:continue
  e=event['t']-t0
  tecs=data['TECS'];rm=(tecs['t']>=e+.5)&(tecs['t']<e+5.8)
  requested=float(np.polyfit(tecs['t'][rm],tecs['hin'][rm],1)[0])
  sign=1 if requested>0 else -1
  mask=(telemetry['t']>=e)&(telemetry['t']<e+6)
  times=telemetry['t'][mask]-e;v=sign*telemetry['climb'][mask]
  above=np.flatnonzero(v>=.9*abs(requested))
  responses['positive' if sign>0 else 'negative']=dict(requested_rate_mps=abs(requested),peak_climb_mps=float(max(v)),
                                                  time_to_90pct_s=float(times[above[0]]) if len(above) else None)
 result=dict(name=name,error=meta['error'],parameters=meta['parameters'],gains=meta['oracle'],
             q_payload_rms_deg_s=float(np.sqrt(np.mean(qp[a]**2))),
             q_relative_rms_deg_s=float(np.sqrt(np.mean(qr[a]**2))),
             q_payload_high_frequency_rms_deg_s=float(np.sqrt(np.mean(hf[a]**2))),
             late_q_rms_deg_s=float(np.sqrt(np.mean(qp[late]**2))),
             payload_pitch_peak_to_peak_deg=float(np.ptp(np.rad2deg(telemetry['pitch'][at]))),
             altitude_range_m=[float(min(telemetry['altitude'][at])),float(max(telemetry['altitude'][at]))],
             max_abs_relative_deg=float(max(abs(jt['Rel'][a]))),
             motor_throttle_peak_to_peak=float(np.ptp(orc['Act'][ao])),
             correction_saturation_fraction=float(np.mean(abs(orc['Correction'][ao])>=.249)),
             alpha_canopy_max_deg=float(max(af['Alpha'][aa])) if af else None,
             alpha_canopy_min_deg=float(min(af['Alpha'][aa])) if af else None,
             fraction_above_model_linear_aero_boundary=float(np.mean(af['Alpha'][aa]>15)) if af else None,
             responses=responses)
 result['usable']=bool(meta['error'] is None and result['late_q_rms_deg_s']<5 and
                       result['payload_pitch_peak_to_peak_deg']<35 and result['altitude_range_m'][0]>20)
 results.append(result)
(root/'metrics.json').write_text(json.dumps(results,indent=2)+'\n')
for r in results:
 print(r['name'],'usable',r['usable'],'qRMS',round(r['q_payload_rms_deg_s'],2),'qHF',round(r['q_payload_high_frequency_rms_deg_s'],2),
       'lateq',round(r['late_q_rms_deg_s'],2),'alpha',None if r['alpha_canopy_max_deg'] is None else round(r['alpha_canopy_max_deg'],2),
       'responses',r['responses'])

pairs=[('current-tecs','default-oracle3','Default TECS'),('mod-current','mod-oracle3','Intermediate TECS'),
       ('snappy-current','snappy-oracle3','Faster TECS')]
fig,axes=plt.subplots(4,3,figsize=(15,10),sharex='col',constrained_layout=True)
for col,(base,oracle,title) in enumerate(pairs):
 axes[0,col].set_title(title)
 for name,color in [(base,'tab:orange'),(oracle,'tab:blue')]:
  if name not in series:continue
  d=series[name]['data'];label='Existing pitch-rate damper' if name==base else 'True-state feedback'
  te=d['telemetry'];jt=d['PGJT'];orc=d['PGOR']
  axes[0,col].plot(te['t'],te['climb'],color=color,label=label)
  axes[1,col].plot(jt['t'],jt['QP'],color=color)
  axes[2,col].plot(jt['t'],jt['Rel'],color=color)
  axes[3,col].plot(orc['t'],100*orc['Act'],color=color)
  for event in series[name]['metadata']['events']:
   e=event['t']-series[name]['metadata']['events'][0]['t']
   for row in range(4):axes[row,col].axvline(e,color=color,alpha=.15,linestyle=':')
 for row in range(4):
  axes[row,col].grid(alpha=.25);axes[row,col].set_xlim(0,59)
 axes[3,col].set_xlabel('Time from first maneuver (s)')
 axes[0,col].legend(fontsize=8)
for row,label in enumerate(['Climb rate (m/s)','Payload pitch rate (deg/s)','Relative pitch (deg)','Motor throttle (%)']):
 axes[row,0].set_ylabel(label)
fig.suptitle('Actual Plane TECS with production flight physics: oracle throttle feedback before motor lag\n'
             'Matched 6 s descent, hold, 6 s climb, hold; airborne preparation; no observer or stall constraint',fontsize=12)
fig.savefig(root/'controller-comparison.png',dpi=170);fig.savefig(root/'controller-comparison.pdf')
