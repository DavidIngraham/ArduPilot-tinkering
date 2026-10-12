"""Convert real ArduPlane logs to a measured-payload replay (no invented wing truth).
Input: decoded analysis directory, or original BIN via --bin. Output remains raw data.
"""
import argparse,json,hashlib
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation,Slerp
MODES={0:'MANUAL',1:'CIRCLE',2:'STABILIZE',5:'FBWA',6:'FBWB',7:'CRUISE',10:'AUTO',11:'RTL',12:'LOITER',15:'GUIDED'}
def convert(source,start,end,title,output,summary_path,bin_input=False):
 types=['ATT','XKF1','RCOU','MODE','PARM'];raw={}
 if bin_input:
  from pymavlink import mavutil
  log=mavutil.mavlink_connection(str(source));raw={k:[] for k in types}
  while True:
   m=log.recv_match(type=types)
   if m is None:break
   raw[m.get_type()].append(m.to_dict())
 else:
  raw={k:json.loads((source/(k+'.json')).read_text()) for k in types}
 for k in types:raw[k]=sorted(raw[k],key=lambda x:x['TimeUS'])
 raw['XKF1']=[x for x in raw['XKF1'] if x.get('C',0)==0]
 tt={k:np.array([x['TimeUS']/1e6 for x in v]) for k,v in raw.items()}
 for k in ['ATT','XKF1','RCOU']:assert tt[k][0]<=start and tt[k][-1]>=end,(k,'insufficient coverage')
 hist={}
 for x in raw['PARM']:
  k=x['Name'];v=x['Value'];h=hist.setdefault(k,[])
  if not h or h[-1][1]!=v:h.append([x['TimeUS']/1e6,v])
 def param(k,t):
  h=hist[k];return h[max(0,np.searchsorted([r[0] for r in h],t,side='right')-1)][1]
 channels={}
 for fn,label in [(70,'throttle'),(190,'left'),(191,'right')]:
  matches=[i for i in range(1,17) if hist.get(f'SERVO{i}_FUNCTION',[[0,0]])[0][1]==fn]
  assert len(matches)==1,(fn,matches);channels[label]=matches[0]
  assert all(v==fn for _,v in hist[f'SERVO{matches[0]}_FUNCTION']), 'Mapping changed; split recording'
 t=np.arange(start,end,.04);att=raw['ATT'];unique=np.r_[True,np.diff(tt['ATT'])>0];q=Slerp(tt['ATT'][unique],Rotation.from_euler('xyz',[[x['Roll'],x['Pitch'],x['Yaw']] for x,u in zip(att,unique) if u],degrees=True))(t).as_quat()
 pos=np.array([np.interp(t,tt['XKF1'],[x[k] for x in raw['XKF1']]) for k in ['PN','PE','PD']]).T
 origin=pos[0,:2].copy();pos[:,:2]-=origin
 frames=[];mode_counts={};max_age={k:0. for k in ['ATT','XKF1','RCOU']}
 for i,ts in enumerate(t):
  indices={k:max(0,np.searchsorted(tt[k],ts,side='right')-1) for k in ['ATT','XKF1','RCOU','MODE']}
  ages={k:float(ts-tt[k][indices[k]]) for k in max_age}
  for k,v in ages.items():max_age[k]=max(max_age[k],v)
  mode=int(raw['MODE'][indices['MODE']]['Mode']);mode_counts[MODES.get(mode,str(mode))]=mode_counts.get(MODES.get(mode,str(mode)),0)+.04
  pwm=[];fraction=[];limits=[]
  for label in ['throttle','left','right']:
   ch=channels[label];lo=param(f'SERVO{ch}_MIN',ts);hi=param(f'SERVO{ch}_MAX',ts);rev=param(f'SERVO{ch}_REVERSED',ts);v=raw['RCOU'][indices['RCOU']][f'C{ch}'];pwm.append(v);u=(v-lo)/(hi-lo);fraction.append(float(np.clip(1-u if rev else u,0,1)));limits.append([lo,hi,int(rev)])
  frames.append(dict(t=round(float(ts),6),p=pos[i].round(5).tolist(),q=q[i].round(8).tolist(),mode=MODES.get(mode,str(mode)),pwm=pwm,command=fraction,limits=limits,valid=max(ages.values())<=.25))
 segments=[]
 for f in frames:
  if not segments or segments[-1]['mode']!=f['mode']:segments.append(dict(start=f['t'],end=f['t'],mode=f['mode']))
  segments[-1]['end']=f['t']+.04
 payload=dict(schema='microagu.flight.v1',title=title,source=source.name,position_source='XKF1 core 0 local NED; horizontal origin shifted to selected flight start',attitude_source='ATT estimator payload attitude',altitude_datum='EKF origin, not terrain',control_source='RCOU; fractions use time-varying SERVO MIN/MAX/REVERSED',wing_attitude=None,propeller_rpm=None,channels=channels,frames=frames)
 output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(payload,separators=(',',':')))
 meta={k:v for k,v in payload.items() if k!='frames'};meta.update(start_boot_s=start,end_boot_s=end,duration_s=end-start,mode_seconds=mode_counts,mode_segments=segments,max_sample_age_s=max_age,invalid_frames=sum(not f['valid'] for f in frames),parameter_history={k:v for k,v in hist.items() if any(k.startswith(f'SERVO{ch}_') for ch in channels.values())},input_sha256={k:hashlib.sha256((source/(k+'.json')).read_bytes()).hexdigest() for k in types} if not bin_input else {'BIN':hashlib.sha256(source.read_bytes()).hexdigest()})
 summary_path.parent.mkdir(parents=True,exist_ok=True);summary_path.write_text(json.dumps(meta,indent=2));print(json.dumps({k:meta[k] for k in ['title','duration_s','mode_seconds','max_sample_age_s','invalid_frames']}),flush=True)
 return payload
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('output',type=Path);p.add_argument('--summary',type=Path,required=True);p.add_argument('--start',type=float,required=True);p.add_argument('--end',type=float,required=True);p.add_argument('--title',required=True);p.add_argument('--bin',action='store_true');a=p.parse_args();convert(a.source,a.start,a.end,a.title,a.output,a.summary,a.bin)
