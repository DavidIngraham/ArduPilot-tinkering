import json
import numpy as np
from scipy.optimize import least_squares
from trim import Physics,root
base=next(x for x in json.loads((root/'trim.json').read_text()) if x['model']=='joint')
results=[]
for z in [-.3,-.25,-.1,0,.1]:
 for damping in [0,.015,.03]:
  p=Physics(f'joint_z{z}_d{damping}')
  def balance(x):
   v,theta,rel,thr=x;return p.evaluate(theta,rel,0,0,v,0,thr)[:4]
  sol=least_squares(balance,[base['V'],base['theta'],base['relative'],base['throttle']],bounds=([1,-1,-1.5,0],[20,1,1.5,1]),diff_step=.001,max_nfev=200)
  v,theta,rel,thr=sol.x;eq=np.array([theta,rel,0,0,v,0,0])
  def deriv(y,g):
   e=p.evaluate(*y[:6],np.clip(thr-np.clip(g*y[6],-.25,.25),0,1))
   return np.array([y[2],y[3],e[2],e[3],e[0],e[1],2*np.pi*10*(y[2]-y[6])])
  gains={}
  for g in [0,.05,.1,.15,.2,.5,1]:
   ds=.0003
   a=np.column_stack([(deriv(eq+np.eye(7)[i]*ds,g)-deriv(eq-np.eye(7)[i]*ds,g))/(2*ds) for i in range(7)])
   gains[str(g)]=float(max(np.linalg.eigvals(a).real))
  # Initial payload acceleration derivative against throttle at fixed trim state.
  b=(p.evaluate(theta,rel,0,0,v,0,thr+.001)[2]-p.evaluate(theta,rel,0,0,v,0,thr-.001)[2])/.002
  results.append(dict(thrust_height_m=z,joint_damping=damping,trim=sol.x.tolist(),residual_norm=float(np.linalg.norm(sol.fun)),payload_pitch_accel_per_throttle=float(b),max_eigen_real=gains))
  p.close()
(root/'sensitivity.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results,indent=2))
