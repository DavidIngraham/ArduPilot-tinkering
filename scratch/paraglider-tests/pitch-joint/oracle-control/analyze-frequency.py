# AP_FLAKE8_CLEAN
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from pymavlink import mavutil
root=Path(__file__).parent
results=[]
fig,axes=plt.subplots(2,2,figsize=(11,8),constrained_layout=True)
for file in sorted(root.glob('frequency-*-metadata.json')):
 meta=json.loads(file.read_text());name=meta['config']['name']
 if meta.get('error') or 'events' not in meta:continue
 f=max((root/(name+'-logs')).glob('*.BIN'),key=lambda p:p.stat().st_mtime)
 stream=mavutil.mavlink_connection(str(f));messages={k:[] for k in ['TECS','GPS','PGJT','PGAF','PGOR']}
 while True:
  m=stream.recv_match(type=list(messages))
  if m is None:break
  d=m.to_dict()
  if m.get_type()=='GPS' and d['I']!=0:continue
  d['t']=d['TimeUS']*1e-6;messages[m.get_type()].append(d)
 data={typ:{k:np.array([r[k] for r in rows]) for k in rows[0] if isinstance(rows[0][k],(float,int))}
       for typ,rows in messages.items() if rows}
 def fit(typ,key,event):
  d=data[typ];t=d['t']-event['t'];frequency=event['frequency_hz']
  valid=(t>=1/frequency)&(t<event['duration'])
  t=t[valid];y=d[key][valid];omega=2*np.pi*frequency
  design=np.column_stack([np.ones(len(t)),t,np.sin(omega*t),np.cos(omega*t)])
  c=np.linalg.lstsq(design,y,rcond=None)[0]
  residual=float(np.sqrt(np.mean((y-design@c)**2)))
  return c,residual
 bands=[]
 for event in meta['events']:
  frequency=event['frequency_hz'];omega=2*np.pi*frequency
  reference,refres=fit('TECS','hin',event)
  actual,outres=fit('GPS','VZ',event);actual=-actual
  reference_velocity=complex(omega*reference[2],omega*reference[3])
  actual_velocity=complex(actual[3],-actual[2])
  transfer=actual_velocity/reference_velocity
  jt=data['PGJT'];mask=(jt['t']>=event['t']+1/frequency)&(jt['t']<event['t']+event['duration'])
  af=data['PGAF'];am=(af['t']>=event['t']+1/frequency)&(af['t']<event['t']+event['duration'])
  orc=data['PGOR'];om=(orc['t']>=event['t']+1/frequency)&(orc['t']<event['t']+event['duration'])
  bands.append(dict(frequency_hz=frequency,gain=float(abs(transfer)),gain_db=float(20*np.log10(abs(transfer))),
                    phase_deg=float(np.rad2deg(np.angle(transfer))),
                    input_rate_amplitude_mps=float(abs(reference_velocity)),
                    output_rate_amplitude_mps=float(abs(actual_velocity)),
                    input_height_fit_residual_m=refres,output_velocity_fit_residual_mps=outres,
                    payload_q_rms_deg_s=float(np.sqrt(np.mean(jt['QP'][mask]**2))),
                    max_canopy_alpha_deg=float(max(af['Alpha'][am])),
                    correction_saturation_fraction=float(np.mean(abs(orc['Correction'][om])>=.249))))
 label={'frequency-default':'Current defaults','frequency-snappy-current':'Faster TECS + payload damper',
        'frequency-snappy-oracle':'Faster TECS + joint/payload feedback',
        'frequency-snappy-rate-only':'Faster TECS + joint/payload rates only'}.get(name,name)
 freq=np.array([b['frequency_hz'] for b in bands]);gain=np.array([b['gain_db'] for b in bands])
 crossing=None
 for i in range(len(freq)-1):
  if gain[i]>=-3 and gain[i+1]<-3:
   crossing=float(np.exp(np.interp(-3,[gain[i+1],gain[i]],[np.log(freq[i+1]),np.log(freq[i])])));break
 result=dict(name=name,bands=bands,approx_minus_3db_hz=crossing,
             note='Closed-loop requested climb-rate tracking through FBWB altitude commands; not inner-loop crossover.',
             binary_sha256=meta['binary_sha256'])
 results.append(result)
 axes[0,0].semilogx(freq,gain,'o-',label=label)
 axes[0,1].semilogx(freq,[b['phase_deg'] for b in bands],'o-')
 axes[1,0].semilogx(freq,[b['payload_q_rms_deg_s'] for b in bands],'o-')
 axes[1,1].semilogx(freq,[b['max_canopy_alpha_deg'] for b in bands],'o-')
(root/'frequency-results.json').write_text(json.dumps(results,indent=2)+'\n')
axes[0,0].axhline(-3,color='black',alpha=.4,linestyle=':');axes[0,0].set_ylabel('Tracking gain (dB)')
axes[0,1].set_ylabel('Tracking phase (deg)');axes[1,0].set_ylabel('Payload pitch-rate RMS (deg/s)')
axes[1,1].axhline(15,color='red',alpha=.5,linestyle=':',label='Model linear-aero boundary')
axes[1,1].set_ylabel('Maximum canopy AoA (deg)')
for ax in axes.flat:ax.grid(alpha=.25);ax.set_xlabel('Command frequency (Hz)')
axes[0,0].legend(fontsize=8);axes[1,1].legend(fontsize=8)
fig.suptitle('Actual Plane closed-loop frequency response: 0.2 ± 0.1 m/s climb-rate commands\n'
             'Fit uses logged incoming altitude trajectory and simulated GPS vertical velocity; first cycle excluded',fontsize=11)
fig.savefig(root/'frequency-comparison.png',dpi=180);fig.savefig(root/'frequency-comparison.pdf')
for r in results:
 print(r['name'],'-3dB estimate',r['approx_minus_3db_hz'])
 for b in r['bands']:print(' ',b)
