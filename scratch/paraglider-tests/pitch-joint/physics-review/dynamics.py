import csv,json
from pathlib import Path
import numpy as np
from scipy.optimize import least_squares
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from trim import Physics,root
trims=json.loads((root/'trim.json').read_text())
results=[]
fig,axs=plt.subplots(3,2,figsize=(12,10),sharex=True)
for trim in trims:
 name=trim['model'];p=Physics(name)
 equilibrium=np.array([trim['theta'],trim['relative'],0.,0.,trim['V'],0.])
 def derivative(y,throttle):
  e=p.evaluate(*y,throttle)
  return np.array([y[2],y[3],e[2],e[3],e[0],e[1]])
 def jacobian(fun,y):
  d=.0003
  return np.column_stack([(fun(y+np.eye(len(y))[i]*d)-fun(y-np.eye(len(y))[i]*d))/(2*d) for i in range(len(y))])
 a=jacobian(lambda y:derivative(y,trim['throttle']),equilibrium)
 active=[0,1,2,3,4,5] if name=='joint' else [0,2,4,5]
 eigen=np.linalg.eigvals(a[np.ix_(active,active)])
 modes=[dict(real=float(v.real),imag=float(v.imag),frequency_hz=float(abs(v.imag)/(2*np.pi)),damping_ratio=float(-v.real/max(abs(v),1e-9))) for v in eigen]
 gain_eigs={}
 # Isolate the pitch-rate-to-throttle feedback at fixed nominal throttle.
 # Includes the 10 Hz pitch-rate filter; this is not the full TECS controller.
 for gain in [0,.2,.5,1]:
  def closed(z):
   throttle=np.clip(trim['throttle']-np.clip(gain*z[6],-.25,.25),0,1)
   return np.r_[derivative(z[:6],throttle),2*np.pi*10*(z[2]-z[6])]
  ac=jacobian(closed,np.r_[equilibrium,0.]);ids=active+[6]
  gain_eigs[str(gain)]=[dict(real=float(e.real),imag=float(e.imag)) for e in np.linalg.eigvals(ac[np.ix_(ids,ids)])]
 item=dict(model=name,open_loop_modes=modes,rate_feedback_modes=gain_eigs)
 # Steady climb equilibrium at full throttle, solves gamma as well.
 def climbfun(x):
  v,theta,rel,gamma=x if name=='joint' else [x[0],x[1],0,x[2]]
  e=p.evaluate(theta,rel,0,0,v*np.cos(gamma),-v*np.sin(gamma),1.)
  return e[:4 if name=='joint' else 3]
 x0=[trim['V'],trim['theta']+.3,trim['relative'],.3] if name=='joint' else [trim['V'],trim['theta']+.3,.3]
 bounds=([1,-1.5,-1.5,-.8],[20,1.5,1.5,.8]) if name=='joint' else ([1,-1.5,-.8],[20,1.5,.8])
 sol=least_squares(climbfun,x0,bounds=bounds,diff_step=.001,max_nfev=200)
 item['full_throttle_climb']=dict(state=sol.x.tolist(),residual=sol.fun.tolist())
 for col,perturb in enumerate(['pitch','throttle']):
  y=equilibrium.copy()
  if perturb=='pitch':y[0]+=np.deg2rad(3)
  records=[];dt=1/600
  for k in range(int(40/dt)):
   t=k*dt;throttle=trim['throttle']+(.05 if perturb=='throttle' and 1<=t<2 else 0)
   # RK4 integration of the production forces/torques.
   f1=derivative(y,throttle);f2=derivative(y+dt*f1/2,throttle);f3=derivative(y+dt*f2/2,throttle);f4=derivative(y+dt*f3,throttle)
   y+=dt*(f1+2*f2+2*f3+f4)/6
   if k%12==0:records.append([t,*y,throttle])
  records=np.array(records)
  np.savetxt(root/(name+'-'+perturb+'.csv'),records,delimiter=',',header='t,theta,relative,qp,qr,vx,vz,throttle',comments='')
  axs[0,col].plot(records[:,0],np.rad2deg(records[:,1]-equilibrium[0]),label=name)
  axs[1,col].plot(records[:,0],np.rad2deg(records[:,3]),label=name)
  axs[2,col].plot(records[:,0],-records[:,6],label=name)
  item[perturb]=dict(pitch_final_error_deg=float(np.rad2deg(records[-1,1]-equilibrium[0])),q_peak_deg_s=float(np.rad2deg(abs(records[:,3]).max())),vz_final=float(records[-1,6]))
 p.close();results.append(item)
axs[0,0].set_title('3° initial payload pitch perturbation');axs[0,1].set_title('+5 percentage-point throttle pulse (1 s)')
for ax in axs[0]:ax.set_ylabel('Pitch departure (°)')
for ax in axs[1]:ax.set_ylabel('Payload pitch rate (°/s)')
for ax in axs[2]:ax.set_ylabel('Climb rate (m/s)');ax.set_xlabel('Time (s)')
for ax in axs.flat:ax.grid(alpha=.3);ax.legend()
fig.suptitle('Corrected production SITL model — open-loop airborne disturbances')
fig.tight_layout();fig.savefig(root/'open-loop-response.png');fig.savefig(root/'open-loop-response.pdf')
(root/'dynamics.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results,indent=2))
