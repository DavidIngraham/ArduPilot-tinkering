import csv,json, pathlib
import numpy as np
from scipy.optimize import least_squares
from scipy.signal import find_peaks
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
root=pathlib.Path('/workspace/scratch/paraglider-tests')
files=sorted(pathlib.Path('/workspace/buildlogs').glob('ParagliderYaw-*.csv'))
results={}; fig,axes=plt.subplots(4,1,figsize=(11,13),sharex=True)
for f in files:
    rows=list(csv.DictReader(f.open())); release=[r for r in rows if r['phase']=='release']
    if len(release)<40:continue
    t=np.array([float(r['time_s']) for r in release]);t-=t[0]
    y=np.degrees([float(r['truth_r_radps']) for r in release]);roll=np.degrees([float(r['truth_roll_rad']) for r in release])
    est=np.degrees([float(r['estimated_r_radps']) for r in release]); name=f.stem.replace('ParagliderYaw-','')
    mask=(t>=1)&(t<=20);x=t[mask]-1;v=y[mask]
    def model(p):
        a,b,s,w,c,d=p
        return np.exp(-s*x)*(a*np.cos(w*x)+b*np.sin(w*x))+c+d*x
    best=None
    for w in [2,3,4,5,6,8,10]:
        fit=least_squares(lambda p:model(p)-v,[max(np.std(v),.001),0,.1,w,np.mean(v),0],bounds=([-200,-200,-.3,.3,-100,-10],[200,200,5,20,100,10]),max_nfev=1500)
        if best is None or fit.cost<best.cost:best=fit
    a,b,s,w,c,d=best.x
    r2=1-np.sum((model(best.x)-v)**2)/max(np.sum((v-v.mean())**2),1e-20)
    tail=t>=20
    item=dict(samples=len(rows),median_sample_dt_s=float(np.median(np.diff(t))),period_s=float(2*np.pi/w),decay_rate_per_s=float(s),tau_s=float(1/s) if s>0 else None,fit_r2=float(r2),fit_amplitude_at_1s_degps=float(np.hypot(a,b)),early_rms_degps=float(np.std(y[(t>=1)&(t<6)])),late_rms_degps=float(np.std(y[tail])),truth_estimate_rmse_degps=float(np.sqrt(np.mean((est-y)**2))),altitude_range_m=[min(float(r['relative_alt_m']) for r in rows),max(float(r['relative_alt_m']) for r in rows)],release_brakes=sorted(set((int(r['left_brake_pwm']),int(r['right_brake_pwm'])) for r in release if float(r['time_s'])-float(release[0]['time_s'])>1)),groundspeed_mean_mps=float(np.mean([np.hypot(float(r['vx_mps']),float(r['vy_mps'])) for r in release])))
    design=np.column_stack((np.exp(-s*x)*np.cos(w*x),np.exp(-s*x)*np.sin(w*x),np.ones_like(x),x))
    phases={}; amplitudes={}
    for key in ('truth_roll_rad','truth_p_radps','truth_q_radps','truth_r_radps'):
        signal=np.degrees([float(r[key]) for r in release])[mask]
        coeff=np.linalg.lstsq(design,signal,rcond=None)[0]
        amplitudes[key]=float(np.hypot(coeff[0],coeff[1]))
        phases[key]=float(np.degrees(np.arctan2(-coeff[1],coeff[0])))
    item['modal_amplitudes_deg_or_degps']=amplitudes
    item['roll_rate_phase_minus_yaw_rate_deg']=float((phases['truth_p_radps']-phases['truth_r_radps']+180)%360-180)
    item['small_signal_fit_usable'] = bool(item['fit_r2'] > .9 and item['fit_amplitude_at_1s_degps'] < 20 and item['decay_rate_per_s']*item['period_s'] < 2)
    item['release_peak_abs_degps'] = float(np.max(np.abs(y)))
    results[name]=item
    dest=root/'yaw';dest.mkdir(exist_ok=True);(dest/f.name).write_bytes(f.read_bytes());(dest/(f.name+'.json')).write_bytes(pathlib.Path(str(f)+'.json').read_bytes())
    group=0 if name in ('baseline','repeat','no_pulse','mirror') else 3 if name in ('rate_600','rate_2400','instant_servo') else 2 if name=='no_roll_damping' else 1
    axes[group].plot(t,y,label=name,linewidth=1)
    if name=='baseline':axes[3].plot(t,y,label=name,linewidth=1)
for ax,title in zip(axes,['Pulse, repeat, no pulse and mirror controls','One-factor physical-model interventions','No added roll damping: large nonlinear response','Physics timestep and servo controls']):
    ax.set_ylabel('True body yaw rate (deg/s)');ax.set_title(title);ax.grid(alpha=.3);ax.legend(ncol=2,fontsize=8)
axes[-1].set_xlabel('Time after brake release (s)');fig.tight_layout();fig.savefig(root/'yaw-experiments.png',dpi=160)
(root/'yaw-results.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results,indent=2))
