import csv,json,math
from pathlib import Path
import numpy as np

def analyze(path):
 p=Path(path);meta=json.loads(p.with_suffix('.json').read_text());rows=list(csv.DictReader(p.open()));route=np.array(meta['route'],dtype=float)
 n=np.array([math.radians(float(r['latitude_deg'])-meta['home_lat'])*6371000 for r in rows]);e=np.array([math.radians(float(r['longitude_deg'])-meta['home_lng'])*6371000*math.cos(math.radians(meta['home_lat'])) for r in rows]);pos=np.column_stack((n,e));seq=np.array([int(r['seq']) for r in rows]);t=np.array([float(r['time_s']) for r in rows]);v=np.array([[float(r['vn_mps']),float(r['ve_mps'])] for r in rows]);corners=[];straight=[]
 for i in range(1,len(route)-1):
  incoming=route[i]-route[i-1];incoming/=np.linalg.norm(incoming);out=route[i+1]-route[i];length=np.linalg.norm(out);out/=length;sign=np.sign(np.cross(incoming,out));offset=pos-route[i];along=offset@out;cross=out[0]*offset[:,1]-out[1]*offset[:,0];mask=(seq==i+2)&(along>=-150)&(along<=min(150,length*.8));over=max(0,float((-cross[mask]*sign).max())) if mask.any() and sign else None
  active=(seq>=i)&(seq<=i+2);capture=float(np.linalg.norm(offset[active],axis=1).min()) if active.any() else None
  exitmask=(seq==i+2)&(along>=130)&(along<=170);course=np.arctan2(v[:,1],v[:,0]);target=math.atan2(out[1],out[0]);error=(course-target+math.pi)%(2*math.pi)-math.pi
  corners.append(dict(index=i+1,overrun_m=over,closest_approach_m=capture,exit_course_error_deg=float(np.degrees(abs(error[exitmask])).max()) if exitmask.any() and length>250 else None))
 for i in range(1,len(route)):
  direction=route[i]-route[i-1];length=np.linalg.norm(direction);direction/=length;offset=pos-route[i-1];along=offset@direction;mask=(seq==i+1)&(along>=150)&(along<=length-150);straight.extend((direction[0]*offset[mask,1]-direction[1]*offset[mask,0]).tolist())
 return dict(corners=corners,max_overrun_m=max(c['overrun_m'] for c in corners if c['overrun_m'] is not None),mean_overrun_m=float(np.mean([c['overrun_m'] for c in corners if c['overrun_m'] is not None])),max_capture_distance_m=max(c['closest_approach_m'] for c in corners if c['closest_approach_m'] is not None),straight_rms_m=float(np.sqrt(np.mean(np.square(straight)))) if straight else None,duration_s=float(t[-1]-t[0]),max_bank_deg=max(abs(float(r['roll_deg'])) for r in rows),planned_groups=meta['planned_groups'],fallbacks=meta['fallbacks'])
if __name__=='__main__':
 import sys
 for p in sys.argv[1:]:
  m=analyze(p);Path(p).with_suffix('.metrics.json').write_text(json.dumps(m,indent=2)+'\n');print(Path(p).name,json.dumps({k:v for k,v in m.items() if k!='corners'}))
