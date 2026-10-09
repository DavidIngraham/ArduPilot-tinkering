import csv,json,math
from pathlib import Path
import numpy as np

ROOT=Path(__file__).parent

def analyze(path):
    path=Path(path);meta=json.loads(Path(str(path)+'.json').read_text());rows=list(csv.DictReader(path.open())); rows=[r for i,r in enumerate(rows) if i==0 or float(r['time_s'])>float(rows[i-1]['time_s'])]
    t=np.array([float(x['time_s']) for x in rows]);seq=np.array([int(x['seq']) for x in rows])
    n=np.array([math.radians(float(x['latitude_deg'])-meta['home_lat'])*6371000 for x in rows]);e=np.array([math.radians(float(x['longitude_deg'])-meta['home_lng'])*6371000*math.cos(math.radians(meta['home_lat'])) for x in rows])
    speed=np.array([float(x['groundspeed_mps']) for x in rows]);yaw=np.array([math.degrees(float(x['yaw_rate_radps'])) for x in rows]);roll=np.array([math.degrees(float(x['roll_rad'])) for x in rows])
    brake=np.array([abs(float(x['left_brake_pwm'])-float(x['right_brake_pwm']))/800 for x in rows])
    course=np.arctan2(np.gradient(e,t),np.gradient(n,t));course_rate=np.gradient(np.unwrap(course),t);route=meta['route'];corners={};errors=[]
    for corner in (4,5,6,9,10):
        _,an,ae,_=route[corner-2];_,bn,be,_=route[corner-1];_,cn,ce,_=route[corner];dn,de=bn-an,be-ae;on,oe=cn-bn,ce-be
        incoming=math.atan2(de,dn);angle=math.atan2(dn*oe-de*on,dn*on+de*oe);direction=1 if angle>0 else -1
        progress=((course-incoming+math.pi)%(2*math.pi)-math.pi)*direction
        along=((n-bn)*on+(e-be)*oe)/math.hypot(on,oe)
        window=(seq==corner+1)&(along>=-150)&(along<=150)
        over=((n-bn)*dn+(e-be)*de)/math.hypot(dn,de)
        indices=np.flatnonzero(seq==corner+1);end=next((i for i in indices if progress[i]>=math.radians(80)),indices[-1])
        arc=(seq==corner+1)&(np.arange(len(seq))<=end)&(progress>=math.radians(15))&(progress<=math.radians(75))
        pause=arc&(np.abs(yaw)<1)
        x=e[arc];y=n[arc];x=x-x.mean();y=y-y.mean()
        c=np.linalg.lstsq(np.column_stack((2*x,2*y,np.ones(len(x)))),x*x+y*y,rcond=None)[0]
        radius=math.sqrt(max(0,c[2]+c[0]**2+c[1]**2));dist=np.hypot(x-c[0],y-c[1]);dt=np.gradient(t)
        active=arc&(np.abs(course_rate)>math.radians(3))
        corners[corner]=dict(active_turn_radius_m=float(np.median(speed[active]/np.abs(course_rate[active]))),duration_to_80deg_s=float(t[end]-t[indices[0]]),overrun_m=max(0,float(over[window].max())),fitted_radius_m=radius,fit_rms_m=float(np.sqrt(np.mean((dist-radius)**2))),pause_seconds=float(dt[pause].sum()),peak_yaw_deg_s=float(abs(yaw[arc]).max()),peak_brake_fraction=float(brake[arc].max()))
    for leg in (2,4,5,6,7,9,10,11):
        _,an,ae,_=route[leg-2];_,bn,be,_=route[leg-1];dn,de=bn-an,be-ae;length=math.hypot(dn,de)
        along=((n-an)*dn+(e-ae)*de)/length;mask=(seq==leg)&(along>=80)&(along<=length-80)
        errors.extend((((n-an)*de-(e-ae)*dn)/length)[mask].tolist())
    abs_errors=sorted(abs(x) for x in errors)
    longest=duration=0.0
    for j in range(1,len(t)):
        if brake[j]>=0.98: duration+=t[j]-t[j-1];longest=max(longest,duration)
        else: duration=0.0
    loiters={}
    for index in (3,8):
        cmd,nc,ec,alt=route[index-1];mask=(seq==index);indices=np.flatnonzero(mask);mask=mask&(t>=t[indices[-1]]-60)
        rr=np.hypot(n[mask]-nc,e[mask]-ec)
        loiters[index]=dict(median_radius_m=float(np.median(rr)),p95_radius_m=float(np.percentile(rr,95)),median_abs_yaw_deg_s=float(np.median(abs(yaw[mask]))))
    return dict(path=str(path),parameters=meta['navigation_parameters'],acceptance_m=meta['waypoint_acceptance_radius_m'],loiter_targets_m=meta['loiter_radius_m'],corners=corners,loiters=loiters,max_corner_overrun_m=max(x['overrun_m'] for x in corners.values()),median_corner_radius_m=float(np.median([x['fitted_radius_m'] for x in corners.values()])),total_turn_pause_s=sum(x['pause_seconds'] for x in corners.values()),straight_rms_m=math.sqrt(sum(x*x for x in errors)/len(errors)),straight_p95_m=abs_errors[int(.95*(len(abs_errors)-1))],altitude_min_m=min(float(x['relative_alt_m']) for x in rows),altitude_max_m=max(float(x['relative_alt_m']) for x in rows),max_bank_deg=float(abs(roll).max()),max_brake_fraction=float(brake.max()),longest_brake_saturation_s=float(longest))

if __name__=='__main__':
    import sys
    p=Path(sys.argv[1]);result=analyze(p);(ROOT/(sys.argv[2]+'.metrics.json')).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
